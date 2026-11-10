import architectureData from './architecture-data.json';
import * as Documents from './document-editor.js';
import { createDraftStorage } from './draft-storage.js';

let pendingDraft;

function warnPendingDraft(event) {
  event.preventDefault();
  event.returnValue = '';
}

export function mountArchitecture(root, { maintenance = false } = {}) {
  const events = new AbortController();
  const { signal } = events;
  const $ = id => root.querySelector('#' + id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const source = architectureData;
  // `source` is the imported, read-only snapshot and is never mutated, so it can
  // serve as the pristine v1 baseline directly instead of a third full deep clone.
  const rawInitial=source;
  const initial=clone(source);initial.version=2;
  for(const n of initial.nodes){n.document=Documents.normalize(n.document || Documents.fromLegacy(n));n.referenceDocument=Documents.normalize(n.referenceDocument || clone(n.document));}
  const fields = [['title','流程标题'],['subtitle','简短说明'],['summary','概述'],['responsibility','负责什么'],['inputs','接收什么'],['outputs','返回什么'],['sequence','处理顺序'],['conditions','前置条件与许可'],['exceptions','异常与恢复'],['example','交互示例'],['status','设计标注']];
  const groupNames={hmi:'上位机',task:'Task · 周期执行',unit:'Unit · 整机协调',interface:'Unit ↔ Module',module:'Module · 腔室',robot:'Robot · 搬运',recovery:'异常与恢复'};
  // Keep the established browser keys when the published wording changes.
  const oldStorageKey = 'wafer-plc-architecture-v1-f86e3114';
  const storageKey = 'wafer-plc-architecture-doc-v2-f86e3114';
  const drafts = createDraftStorage(() => localStorage, maintenance);
  let data=clone(initial), selected='state-publish', view='architecture', editing=false, dirty=false, migratedDraft=false, activeStep=-1, zoom=1, autoFit=true, toastTimer, documentEditor=null;
  const undoByNode = (maintenance && pendingDraft?.undo) || new Map();
  let activeExchangeId='unit-task',activeOperationId='manual-single',activeOperationBranch='normal',activeOperationStep=-1, activeFrameworkTopic='module';
  function isLegacy(candidate){const old=initial.legacy?.defaults;if(!old || !candidate || candidate.version!==1 || !Array.isArray(candidate.nodes) || candidate.nodes.length!==old.nodes.length)return false;const expected=new Set(old.nodes.map(n=>n.id));return candidate.nodes.every(n=>n && expected.delete(n.id)) && expected.size===0;}
  function checkFields(n){for(const [field] of fields){const limit=field==='title'?100:['subtitle','status'].includes(field)?240:24000;if(typeof n[field]!=='string' || n[field].length>limit)throw new Error('说明字段格式不正确或过长：'+n.id+' / '+field);}if(!n.title.trim())throw new Error('流程标题不能为空：'+n.id);}
  function migrateLegacy(candidate){
    if(!isLegacy(candidate))return candidate;
    const old=initial.legacy.defaults, next=clone(rawInitial), oldIds=new Set(old.nodes.map(n=>n.id));next.version=1;
    for(const edited of candidate.nodes){checkFields(edited);const baseline=old.nodes.find(n=>n.id===edited.id), target=next.nodes.find(n=>n.id===edited.id);
      if(target){for(const [field] of fields)if(edited[field]!==baseline[field])target[field]=edited[field];}
      else{if(initial.legacy?.topologyUpgrade?.removedNodeIds?.includes(edited.id))continue;const destination=next.nodes.find(n=>n.id===initial.legacy.remap[edited.id]);if(!destination)throw new Error('旧版节点没有迁移目标：'+edited.id);for(const [field,label] of fields){if(edited[field]===baseline[field])continue;const key=['title','subtitle','status'].includes(field)?'example':field;destination[key]+=`\n\n[原「${baseline.title}」的${label}]\n${edited[field] || '（旧版此项已留空）'}`;}}
    }
    if(candidate.walkthrough!==undefined){if(!Array.isArray(candidate.walkthrough) || candidate.walkthrough.length!==old.walkthrough.length)throw new Error('旧版单片流程步骤数量不正确。');candidate.walkthrough.forEach((step,i)=>{if(!step || !oldIds.has(step.node) || typeof step.title!=='string' || !step.title.trim() || typeof step.text!=='string' || step.title.length>24000 || step.text.length>24000)throw new Error('旧版单片流程格式不正确。');const baseline=old.walkthrough[i];for(const field of ['title','text'])if(step[field]!==baseline[field])next.walkthrough[i][field]=step[field];if(step.node!==baseline.node)next.walkthrough[i].node=initial.legacy.remap[step.node] || step.node;});}
    return next;
  }
  function migrateTopology(candidate){
    const upgrade=initial.legacy?.topologyUpgrade;
    if(!upgrade)return candidate;
    const known=upgrade.previousNodeIdSets.some(ids=>{
      if(candidate.nodes.length!==ids.length)return false;
      const remaining=new Set(ids);
      return candidate.nodes.every(n=>n && remaining.delete(n.id)) && remaining.size===0;
    });
    if(!known)return candidate;
    const next=clone(candidate);
    next.nodes=next.nodes.filter(n=>!upgrade.removedNodeIds.includes(n.id));
    for(const id of upgrade.addedNodeIds){
      if(next.nodes.some(n=>n.id===id))continue;
      const source=(candidate.version===1?rawInitial:initial).nodes.find(n=>n.id===id);
      if(!source)throw new Error('新增节点初稿缺失：'+id);
      const index=next.nodes.findIndex(n=>n.id==='controls');
      next.nodes.splice(index<0?next.nodes.length:index+1,0,clone(source));
    }
    if(Array.isArray(next.walkthrough))next.walkthrough=next.walkthrough.map(step=>
      step && typeof step.node==='string'?{...step,node:upgrade.removedNodeTargets[step.node]||step.node}:step);
    return next;
  }
  function validateOperationFlows(flows){
    const expected=new Set(initial.operationFlows.map(f=>f.id)),seen=new Set();
    if(!Array.isArray(flows)||flows.length!==expected.size)throw new Error('操作流程数量不正确。');
    for(const f of flows){
      if(!f||!expected.has(f.id)||seen.has(f.id))throw new Error('操作流程身份不正确。');seen.add(f.id);
      for(const name of ['title','subtitle','intro'])if(typeof f[name]!=='string'||f[name].length>24000)throw new Error('操作流程文字不正确。');
      for(const branch of ['normal','alarm']){
        if(!Array.isArray(f[branch])||!f[branch].length||f[branch].length>30)throw new Error('操作流程步骤数量不正确。');
        for(const step of f[branch])if(!step||!initial.nodes.some(n=>n.id===step.node)||typeof step.title!=='string'||!step.title.trim()||step.title.length>240||typeof step.text!=='string'||step.text.length>24000)throw new Error('操作流程步骤格式不正确。');
      }
    }
    return clone(flows);
  }
  function upgradeWalkthrough(steps){
    const versions=initial.legacy?.sourceUpdate?.walkthroughUpgrade?.previousDefaults||[];
    const remap=id=>initial.legacy?.remap?.[id]||id;
    return steps.map((step,i)=>{
      const next=clone(step),fresh=initial.walkthrough[i];
      for(const field of ['node','title','text'])if(versions.some(old=>old[i] && (field==='node'?remap(old[i][field])===remap(step[field]):old[i][field]===step[field])))next[field]=fresh[field];
      return next;
    });
  }
  function validate(candidate) {
    if (!candidate || ![1,2].includes(candidate.version) || !Array.isArray(candidate.nodes)) throw new Error('请选择本页面导出的说明 JSON。');
    const needsTeachingUpgrade=candidate.walkthroughFocus!=='core-ideas';
    candidate=migrateTopology(migrateLegacy(candidate));
    const expected=new Set(initial.nodes.map(n=>n.id));
    if(candidate.nodes.length!==expected.size) throw new Error('节点数量与本版架构不一致。');
    const seen=new Set();
    for(const n of candidate.nodes) {
      if(!n || !expected.has(n.id) || seen.has(n.id)) throw new Error('节点编号缺失、重复或不属于本版架构。'); seen.add(n.id);
      if(candidate.version===1)checkFields(n);else{for(const [field,limit] of [['title',100],['subtitle',240],['status',240]])if(typeof n[field]!=='string' || n[field].length>limit)throw new Error('节点资料格式不正确：'+n.id);if(!n.title.trim())throw new Error('节点名称不能为空。');if(!n.document || typeof n.document!=='object')throw new Error('节点文档缺失：'+n.id);Documents.normalize(n.document);if(n.referenceDocument!==undefined)Documents.normalize(n.referenceDocument);}
    }
    const merged=clone(initial);
    const previousEdition = candidate.version === 2 && candidate.revision === '讨论稿 02';
    for (const n of merged.nodes) {
      const changed = candidate.nodes.find(item => item.id === n.id);
      for (const field of ['title', 'subtitle', 'status']) n[field] = changed[field];
      n.document = Documents.normalize(candidate.version === 1 ? Documents.fromLegacy(changed) : changed.document);
      if (!changed.referenceDocument || candidate.version !== 2) continue;

      const previousReference = Documents.normalize(changed.referenceDocument);
      if (previousEdition) {
        n.document.sections = n.document.sections.map(section => {
          const previous = previousReference.sections.find(item => item.id === section.id);
          const published = n.referenceDocument.sections.find(item => item.id === section.id);
          return published && previous?.title === section.title && previous.html === section.html
            ? clone(published)
            : section;
        });
      } else {
        n.referenceDocument = previousReference;
      }
    }
    if(candidate.walkthrough!==undefined) {
      if(!Array.isArray(candidate.walkthrough) || candidate.walkthrough.length!==initial.walkthrough.length) throw new Error('单片流程步骤数量与本版不一致。');
      candidate.walkthrough.forEach((s,i)=>{if(!s || !expected.has(s.node) || typeof s.title!=='string' || !s.title.trim() || typeof s.text!=='string' || s.title.length>24000 || s.text.length>24000) throw new Error('单片流程格式不正确。'); merged.walkthrough[i]={node:s.node,title:s.title,text:s.text};});
    }
    if(candidate.operationFlows!==undefined)merged.operationFlows=validateOperationFlows(candidate.operationFlows);
    if(needsTeachingUpgrade)merged.walkthrough=upgradeWalkthrough(merged.walkthrough);
    return merged;
  }
  function replaceSourceSections(currentDocument, sourceDocument, sectionIds){
    const next=clone(currentDocument);
    for(const id of sectionIds){
      const replacement=sourceDocument.sections.find(section=>section.id===id);if(!replacement)continue;
      let index=next.sections.findIndex(section=>section.id===id);
      if(index<0 && id.endsWith('code-example'))index=next.sections.findIndex(section=>section.id==='legacy-example');
      if(index<0)next.sections.push(clone(replacement));
      else next.sections[index]={...next.sections[index],html:replacement.html};
    }
    return Documents.normalize(next);
  }
  if (maintenance) try{
    const draft=drafts.read(storageKey);
    if(draft){data=validate(JSON.parse(draft));}
    else{
      const update=initial.legacy?.sourceUpdate;
      const keys=[
        {key:update?.previousDocumentStorageKey,updatedNodeIds:update?.updatedNodeIds,updatedSectionIdsByNode:update?.updatedSectionIdsByNode},
        {key:update?.previousLegacyStorageKey,updatedNodeIds:update?.updatedNodeIds,updatedSectionIdsByNode:update?.updatedSectionIdsByNode},
        ...(update?.previousDraftSources || []),
        {key:oldStorageKey,updatedNodeIds:update?.fallbackUpdatedNodeIds || update?.updatedNodeIds,updatedSectionIdsByNode:update?.fallbackUpdatedSectionIdsByNode || update?.updatedSectionIdsByNode},
        {key:initial.legacy?.storageKey,updatedNodeIds:update?.fallbackUpdatedNodeIds || update?.updatedNodeIds,updatedSectionIdsByNode:update?.fallbackUpdatedSectionIdsByNode || update?.updatedSectionIdsByNode}
      ].filter(source=>source.key);
      for(const {key,updatedNodeIds,updatedSectionIdsByNode} of keys){
        const saved=drafts.read(key);if(!saved)continue;
        data=validate(JSON.parse(saved));
        // 迁入已有草稿时仅更新本次确认的节点，保留其他节点和单片流程的改文。
        for(const id of updatedNodeIds || []){
          const index=data.nodes.findIndex(n=>n.id===id),replacement=initial.nodes.find(n=>n.id===id);
          if(index>=0 && replacement)data.nodes[index]=clone(replacement);
        }
        for(const [id,sectionIds] of Object.entries(updatedSectionIdsByNode || {})){
          if((updatedNodeIds || []).includes(id))continue;
          const target=data.nodes.find(node=>node.id===id),replacement=initial.nodes.find(node=>node.id===id);
          if(!target || !replacement)continue;
          target.document=replaceSourceSections(target.document,replacement.document,sectionIds);
          target.referenceDocument=replaceSourceSections(target.referenceDocument,replacement.referenceDocument,sectionIds);
        }
        dirty=true;migratedDraft=true;break;
      }
    }
  }catch(error){console.info('浏览器草稿未载入：'+error.message);}
  $('editToggle').hidden = !maintenance;
  $('restoreNode').hidden = !maintenance;
  const node=id=>data.nodes.find(n=>n.id===id);
  function button(id,index='',extra='') {const n=node(id); if(!n)return '';return `<button class="node ${extra}" data-node="${escape(id)}" aria-pressed="${id===selected}" aria-label="查看说明：${escape(n.title)}">${index?`<span class="node-index">${index}</span>`:''}<span class="node-title">${escape(n.title)}</span><span class="node-subtitle">${escape(n.subtitle)}</span></button>`;}
  const interfaces=[['unit-task','→','任务与身份','Unit → Module','携带 JobId、WaferId、工序与动作请求。'],['unit-recipe','→','配方与确认','Unit → Module','按晶圆及工序绑定配方版本，确认后锁定执行。'],['unit-permits','←','能力与占用','Module → Unit','发布装片、开工、卸片能力及片位占用。'],['unit-io','↔','输入与输出','Unit ↔ Module','输入先映射；组件逻辑输出由 Unit 落到通道。'],['unit-result','←','任务与结果','Module → Unit','受理、执行、完成或失败都对应当前任务身份。'],['unit-handoff','↔','预约与交接','Unit ↔ Module','预约资源、确认交接、更新晶圆位置并释放。']];
  function buildLayout(){
    $('board').innerHTML=`<div class="graph-title">点击节点查看说明 · 整机调配统一组织批次与搬运</div><div class="hmi-row">${button('hmi')}<span class="hmi-note">配方下发 / 参数设置 / 按钮操作<br>经接口变量与 PLC 交互</span><span class="flow-line"></span></div>
      <section class="layer task-layer"><div class="layer-head"><span class="layer-label">Task <span>周期执行安排</span></span><span class="layer-hint">Logic 调用 Unit；Motion / Com 执行运动与通信任务</span></div><div class="node-row three">${button('motion-task')}${button('logic-task')}${button('com-task')}</div><span class="flow-line"></span></section>
      <section class="layer unit-layer"><div class="layer-head"><button class="layer-label" data-node="unit-overview" aria-pressed="false"><span class="node-title">${escape(node('unit-overview').title)}</span><span>公共处理与任务调配 ↗</span></button><span class="layer-hint">唯一的现场实时调配者</span></div><div class="node-row" id="unitCore">${button('hmi-comm','01')}${button('input-mapping','02')}${button('module-invocation','03')}${button('machine-dispatch','04')}${button('output-mapping','05')}<svg id="unitWires" class="wires" aria-hidden="true"></svg></div><p class="unit-coordination-note">ModuleInvocation 负责腔室调用、Online/Offline 管理与自动程序控制；整机调配程序负责腔室间调度、机器人搬运及工艺衔接；Com_Task 承担机器人及其他 TCP/IP、RS485 设备的通信。</p><span class="flow-line"></span></section>
      <section class="layer module-layer"><div class="layer-head"><button class="layer-label" data-node="module-overview" aria-pressed="false"><span class="node-title">${escape(node('module-overview').title)}</span><span>单腔室逻辑 ↗</span></button><span class="layer-hint">PLT × 3 / SRD × 3</span></div><div class="module-graph" id="moduleGraph">${button('command')}${button('alarm')}${button('interlock')}${button('manual')}${button('auto')}${button('controls')}${button('state-publish')}<svg id="moduleWires" class="wires" aria-hidden="true"></svg></div><p class="state-publish-note">Control → StatePublish → ADS 状态结构体 → 上位机读取；操作仍写入请求接口。</p></section>
      <div class="execution-targets"><span>任务执行落点</span><span>组件直控轴 → <button data-node="motion-task" aria-pressed="false"><span class="node-title">Motion_Task</span></button></span><span>整机调配的报文交接 → <button data-node="com-task" aria-pressed="false"><span class="node-title">Com_Task</span></button></span></div><div class="diagram-footer"><div class="legend"><span><i></i>调用 / 交接</span><span><i class="permission"></i>许可约束</span></div><span>这是职责关系图，实际调用周期需在实现时明确。</span></div>`;
    renderWalkthrough();renderExchanges();renderOperations();syncSelected();requestAnimationFrame(resizeGraph);
  }
  function wire(svg,container,links){
    const area=container.getBoundingClientRect(); const scale=area.width/container.offsetWidth || 1;
    svg.setAttribute('viewBox',`0 0 ${container.offsetWidth} ${container.offsetHeight}`);
    const marker=svg.id+'-arrow';let paths='';
    for(const [from,to,kind='call',side=false] of links){const a=container.querySelector(`[data-node="${from}"]`),b=container.querySelector(`[data-node="${to}"]`);if(!a||!b)continue;const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();const ax=(ra.left+ra.width/2-area.left)/scale,ay=(ra.bottom-area.top)/scale,bx=(rb.left+rb.width/2-area.left)/scale,by=(rb.top-area.top)/scale;let d;
      if(side){const x=4; const sy=(ra.top+ra.height/2-area.top)/scale,ty=(rb.top+rb.height/2-area.top)/scale;d=`M ${(ra.left-area.left)/scale} ${sy} H ${x} V ${ty} H ${(rb.left-area.left)/scale}`;}
      else if(Math.abs((rb.top-ra.top)/scale)<5){d=`M ${(ra.right-area.left)/scale} ${(ra.top+ra.height/2-area.top)/scale} H ${(rb.left-area.left)/scale-3}`;}
      else if(Math.abs(bx-ax)<1)d=`M ${ax} ${ay} V ${by-3}`;else{const mid=ay+(by-ay)/2;d=`M ${ax} ${ay} V ${mid} H ${bx} V ${by-3}`;}
      paths+=`<path class="${kind==='permit'?'permission':''}" d="${d}" marker-end="url(#${marker})"/>`;
    }
    svg.innerHTML=`<defs><marker id="${marker}" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M 0 0 L 5 3 L 0 6" style="fill:#8294af;stroke:none"/></marker></defs>${paths}`;
  }
  function drawWires(){if(signal.aborted || root.hidden || view!=='architecture')return;wire($('unitWires'),$('unitCore'),[['hmi-comm','input-mapping'],['input-mapping','module-invocation'],['module-invocation','machine-dispatch'],['machine-dispatch','output-mapping']]);wire($('moduleWires'),$('moduleGraph'),[['command','interlock'],['alarm','interlock'],['interlock','manual','permit'],['interlock','auto','permit'],['manual','controls'],['auto','controls'],['controls','state-publish'],['interlock','controls','permit',true]]);}
  function setZoom(value,fit=false){autoFit=fit;zoom=Math.max(.28,Math.min(1.5,value));$('board').style.transform=`scale(${zoom})`;$('boardHolder').style.width=980*zoom+'px';$('boardHolder').style.height=$('board').offsetHeight*zoom+'px';$('zoomValue').textContent=Math.round(zoom*100)+'%';requestAnimationFrame(drawWires);}
  function resizeGraph(){if(!signal.aborted && !root.hidden && view==='architecture'){if(autoFit)setZoom(innerWidth<=820?.95:Math.min(1,($('canvasScroll').clientWidth-24)/980),true);else setZoom(zoom);}}
  function syncSelected(){root.querySelectorAll('[data-node]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.node===selected)));root.querySelectorAll('[data-step]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.step)===activeStep)));const index=data.nodes.findIndex(n=>n.id===selected);$('selectionCount').textContent=`${String(index+1).padStart(2,'0')} / ${data.nodes.length}`;$('detailId').textContent=selected;}
  function pushUndo(){const stack=undoByNode.get(selected)||[];stack.push(clone(node(selected)));if(stack.length>30)stack.shift();undoByNode.set(selected,stack);}
  function syncUndo(){const b=$('undoDocument');if(b)b.disabled=!(undoByNode.get(selected)||[]).length;}
  function fieldHTML(n,f,label){return `<div class="edit-field"><label for="field-${f}">${label}</label><input id="field-${f}" data-field="${f}" value="${escape(n[f])}" maxlength="${f==='title'?100:240}" autocomplete="off"></div>`;}
  function renderInspector(){
    if(documentEditor){documentEditor.destroy();documentEditor=null;}
    const n=node(selected);if(!n)return;let html=`<div class="detail-kicker">${escape(groupNames[n.group]||n.group)}</div><h2 class="detail-title">${escape(n.title)}</h2>`;
    if(!editing && n.subtitle)html+=`<div class="detail-subtitle">${escape(n.subtitle)}</div>`;
    html+='<div class="document-actions"><button class="btn small" id="referenceButton" data-document-command="reference">查看参考说明</button>'+(editing?'<button class="btn small" id="blankDocument" data-document-command="blank">从空白开始</button><button class="btn small" id="undoDocument" data-document-command="undo">撤销操作</button>':'')+'</div>';
    if(editing){html+='<p class="edit-hint">章节名称、正文和顺序都由你决定。按 Ctrl+S 将修改保存到当前浏览器。</p><details class="node-meta-fields"><summary>节点名称、图中简述与标注</summary>'+[['title','节点名称'],['subtitle','图中简述'],['status','设计标注（可留空）']].map(([f,label])=>fieldHTML(n,f,label)).join('')+'</details>';if(activeStep>=0){const step=data.walkthrough[activeStep];html+=`<div class="section-rule">当前流程步骤</div><div class="edit-field"><label for="step-title">步骤标题</label><input id="step-title" data-step-field="title" value="${escape(step.title)}"></div><div class="edit-field"><label for="step-text">步骤说明</label><textarea id="step-text" data-step-field="text">${escape(step.text)}</textarea></div>`;}if(view==='operations'&&currentOperationStep()){const step=currentOperationStep();html+=`<div class="section-rule">当前操作流程环节</div><div class="edit-field"><label for="operation-step-title">环节标题</label><input id="operation-step-title" data-operation-field="title" value="${escape(step.title)}"></div><div class="edit-field"><label for="operation-step-text">环节说明</label><textarea id="operation-step-text" data-operation-field="text">${escape(step.text)}</textarea></div>`;}html+='<div id="documentEditor"></div>';}
    else{if(activeStep>=0){const step=data.walkthrough[activeStep];html+=`<div class="step-note"><b>第 ${activeStep+1} 步 · ${escape(step.title)}</b>${escape(step.text)}</div>`;}if(view==='operations'&&currentOperationStep()){const step=currentOperationStep();html+=`<div class="step-note"><b>${escape(step.title)}</b>${escape(step.text)}</div>`;}html+=Documents.render(n.document);}
    $('inspectorContent').innerHTML=html;$('editToggle').textContent=editing?'预览说明':'编辑本项说明';$('editToggle').setAttribute('aria-pressed',String(editing));root.classList.toggle('edit-mode',editing);syncSelected();syncUndo();
    if(editing){const id=selected;documentEditor=Documents.mount($('documentEditor'),{modalRoot:root,document:clone(n.document),onChange:next=>{if(selected!==id)return;pushUndo();node(id).document=Documents.normalize(next);markDirty();syncUndo();refreshSearch();if(view==='exchanges')renderExchanges();}});}
  }
  function commitEditor(){if(!documentEditor || documentEditor.flush())return true;toast('请按编辑区提示调整后再保存。',true);return false;}
  function selectNode(id,step=-1,scroll=true){if(!node(id) || !commitEditor())return;selected=id;activeStep=step;renderInspector();$('inspectorContent').scrollTop=0;if(scroll&&matchMedia('(max-width:820px)').matches)$('inspector').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});}
  function renderWalkthrough(){
    $('walkthroughContent').innerHTML=`<div class="view-intro"><div class="kicker">ONE WAFER / COMPLETE CYCLE</div><h2>一片晶圆，只看这一条闭环</h2><p>以W01为例：先到一个可用PLT，再到一个可用SRD，最后返回原盒原槽。PLT2、SRD3仅用于说明，实际由Unit从各自三个候选中选择。</p></div>
      <div class="core-route" role="img" aria-label="W01从晶圆盒经PLT电镀、SRD清洗干燥，返回原盒原槽"><div><small>搬运前</small><b>晶圆盒原槽</b><span>Unit保留W01的身份、原槽和配方。</span></div><div><small>第一次搬运后</small><b>PLT电镀</b><span>示例PLT2；放片确认、机器人退出后开工。</span></div><div><small>第二次搬运后</small><b>SRD清洗干燥</b><span>示例SRD3；使用W01的SRD配方。</span></div><div><small>第三次搬运后</small><b>回到原盒原槽</b><span>返还与退出确认后，W01流程结束。</span></div></div>
      <div class="single-principles"><section><small>01 / 选择目标</small><h3>谁决定放到哪？</h3><p>Unit同时比较<b>PLT1、PLT2、PLT3</b>，或<b>SRD1、SRD2、SRD3</b>，选出Online、反馈有效、空腔、无Busy或预约占用且CanLoad成立的目标。</p><p>没有可接收SRD时，W01留在PLT等待，不能先取到机器人上。</p></section><section><small>02 / 配方交接</small><h3>什么时候给配方？</h3><p>整批计划先交Unit锁定；选定PLT后，只交W01的PLT配方；选定SRD后，只交W01的SRD配方。</p><p><b>目标配方先确认，再允许取片；目标启动Auto时锁定运行快照。</b></p></section><section><small>03 / 搬运确认</small><h3>凭什么认定搬完？</h3><p>取片：源端无片与机器人持片相互确认。放片：目标有片与机器人无片相互确认。</p><p><b>机器人退出、双方完成同身份、同阶段交接后，才释放搬运预约并允许后续动作。</b></p></section></div>
      <div class="single-completion"><div><b>工艺完成 ≠ 腔室已空</b><p>PLT或SRD的ProcessDone只表示这一工序完成。晶圆仍占用腔室，实际卸片确认后才释放。</p></div><div><b>回到原槽，才结束这片</b><p>W01的PLT、SRD均正常完成，且确认返回原盒原槽，才记本片结束。其他片重复相同规则。</p></div></div>
      <aside class="single-exception"><b>报警或结果不明时</b><p>自动加工报警：按Stopping执行wafer purge，完成后Stopped，不当作正常工艺通过。搬运结果不明：保留任务、预约和最后确认片位，查询核对后处理，不自动重发。</p></aside>
      <details class="single-step-details" ${activeStep>=0?'open':''}><summary>按需展开：W01经过的程序和逐步交接说明</summary><p class="scenario-muted">点击环节可在右侧查看对应程序；原有步骤文字和编辑能力保留。</p><ol class="walk-steps">${data.walkthrough.map((s,i)=>`<li><button class="walk-button" data-step="${i}" aria-pressed="${i===activeStep}"><span class="step-number">${String(i+1).padStart(2,'0')}</span><span class="walk-copy"><b>${escape(s.title)}</b><p>${escape(s.text)}</p></span></button></li>`).join('')}</ol></details>`;
  }

  function renderExchanges(){
    if(!interfaces.some(x=>x[0]===activeExchangeId))activeExchangeId='unit-task';const n=node(activeExchangeId);
    const intro=n.document.sections.find(s=>s.id===n.id+'-introduction')||n.document.sections.find(s=>s.title==='介绍');
    const details=n.document.sections.filter(s=>s!==intro);
    $('exchangeContent').innerHTML=`<div class="view-intro"><div class="kicker">UNIT / MODULE / CORE IDEAS</div><h2>先看核心思路，再按需查看变量</h2><p>Unit负责“哪片、去哪、何时做”；Module负责“本腔能否做、如何执行、结果是什么”。双方按任务身份和阶段确认，确认后再推进下一步。</p></div><div class="contract-nav" role="group" aria-label="接口分组">${interfaces.map(([id])=>`<button class="btn ${id===activeExchangeId?'is-active':''}" data-node="${id}" aria-pressed="${id===activeExchangeId}">${escape(node(id).title)}</button>`).join('')}</div><article class="contract-reading rich-content"><h2>${escape(n.title)}</h2>${intro?Documents.render({sections:[intro]}):'<p>本项核心说明请查看右侧文档。</p>'}</article><details class="core-contract-details"><summary>按需展开：双向变量与结构示例</summary><div class="contract-direction">Unit → Module：Unit写、Module读 ｜ Module → Unit：Module写、Unit读</div><div class="contract-reading rich-content">${Documents.render({sections:details})}</div></details><p class="scenario-muted">以下变量与结构为 Unit 与 Module 的接口设计。命令接收计数属于独立的诊断接口。</p>`;
  }

  function currentOperation(){return data.operationFlows.find(f=>f.id===activeOperationId)||data.operationFlows[0];}
  function currentOperationStep(){const f=currentOperation();return activeOperationStep>=0?f[activeOperationBranch][activeOperationStep]||null:null;}
  function renderOperations(){
    const f=currentOperation(),steps=f[activeOperationBranch];if(activeOperationStep>=steps.length)activeOperationStep=-1;
    $('operationContent').innerHTML=`<div class="view-intro"><div class="kicker">OPERATIONS / HMI TO DEVICE</div><h2>从上位机请求到实际设备</h2><p>分别查看单点手动、手动短流程和自动工艺经过的程序，以及报警如何改变许可、动作和后续恢复。这里只展示处理流程，不向设备发送请求。</p></div><div class="operation-cases" role="group" aria-label="操作类型">${data.operationFlows.map(item=>`<button class="operation-case ${item.id===f.id?'is-active':''}" data-operation="${escape(item.id)}" aria-pressed="${item.id===f.id}"><b>${escape(item.title)}</b><span>${escape(item.subtitle)}</span></button>`).join('')}</div><div class="operation-intro"><h3>${escape(f.title)}</h3><p>${escape(f.intro)}</p></div><div class="operation-switch" role="group" aria-label="流程分支"><button class="btn ${activeOperationBranch==='normal'?'is-active':''}" data-operation-branch="normal" aria-pressed="${activeOperationBranch==='normal'}">正常执行</button><button class="btn ${activeOperationBranch==='alarm'?'is-active':''}" data-operation-branch="alarm" aria-pressed="${activeOperationBranch==='alarm'}">报警处理</button><button class="btn" data-operation-move="-1" ${activeOperationStep<=0?'disabled':''}>上一环节</button><button class="btn" data-operation-move="1" ${activeOperationStep>=steps.length-1?'disabled':''}>下一环节</button></div><ol class="operation-steps">${steps.map((s,i)=>`<li><button class="operation-step ${activeOperationBranch==='alarm'?'alarm-path':''}" data-operation-step="${i}" aria-pressed="${i===activeOperationStep}"><span class="operation-number">${String(i+1).padStart(2,'0')}</span><span><small>${escape(node(s.node).title)}</small><b>${escape(s.title)}</b><p>${escape(s.text)}</p></span></button></li>`).join('')}</ol><p class="scenario-muted">点击环节在右侧查看对应程序说明。普通按钮请求复位不表示设备已执行，当前版仍以输出、反馈与Interlock状态排查。</p>`;
  }
  function chooseOperationStep(index){
    const steps=currentOperation()[activeOperationBranch];if(!Number.isInteger(index)||index<0||index>=steps.length)return;
    if(!commitEditor())return;activeOperationStep=index;selectNode(steps[index].node,-1,false);renderOperations();
  }

  const frameworkTopics=[
    {id:'module',title:'Module 总入口',node:'module-overview'},
    {id:'scan',title:'Unit 扫描时序',node:'module-invocation'},
    {id:'owners',title:'数据归属',node:'unit-overview'},
    {id:'lifecycle',title:'任务与搬运状态',node:'unit-task'},
    {id:'tasks',title:'跨任务交接',node:'logic-task'}
  ];
  const frameworkPanels={
    module:`<div class="framework-heading"><h3>一腔的周期调用主线</h3><small>MODULE / ENTRY</small></div><p>以 PLT1 为阅读起点，先看职责之间如何衔接。点击下方程序，可在右侧查看节点说明。</p><div class="framework-flow"><button data-node="command"><b>Command / Alarm</b><span>接收命令、检测和记录报警</span></button><button data-node="interlock"><b>Interlock</b><span>计算命令许可与运行约束</span></button><button data-node="manual"><b>Manual / Auto</b><span>共享所有权，提出动作请求</span></button><button data-node="controls"><b>Control</b><span>设备唯一执行入口，周期处理</span></button><button data-node="state-publish"><b>StatePublish</b><span>复制模块状态供上位机读取</span></button></div><div class="framework-note">图中按职责展示调用主线。Command 与 Alarm 的先后及仲裁位置由接口和扫描依赖决定。</div><h4>总入口的职责顺序</h4><p>总入口管理实例、输入与输出及周期调用，Manual 与 Auto 按所有权交接。模块状态在 Control 后发布；最终物理通道状态在 OutputMapping 后另行补充。</p>`,
    scan:`<div class="framework-heading"><h3>请求跨扫描如何流动</h3><small>UNIT / SCAN</small></div><p>设计调用链为 HMI_Communication → InputMapping → ModuleInvocation → 整机调配 → OutputMapping。</p><div class="framework-scan"><section><small>SCAN N</small><b>先读模块，再提出请求</b><p>ModuleInvocation 调用模块并汇总状态；随后整机调配根据状态产生本次任务或启动请求。</p></section><section><small>SCAN N + 1</small><b>模块消费并回答</b><p>ModuleInvocation 将保持的请求交给模块；模块检查后发布匹配的受理或拒绝。调配随后读取回答并推进。</p></section></div><div class="framework-note">请求在交接期间保持，受理或拒绝通过独立状态反馈，收到确认后按接口规则清除。</div><h4>请求与状态的写入归属</h4><p>明确 ModuleInvocation 与 Module 的模式请求和确认状态归属；HMI_Communication 与单腔 Command 分别处理哪些请求、参数快照与接口复位。</p>`,
    owners:`<div class="framework-heading"><h3>数据从哪里来，由谁发布</h3><small>DATA / OWNERSHIP</small></div><p>以下职责表按数据来源和发布方向划分写入归属。</p><div class="framework-table-wrap"><table class="framework-table"><thead><tr><th>数据 / 事实</th><th>职责归属</th></tr></thead><tbody><tr><td>批次、晶圆位置账本、调度与预约</td><td>Unit 整机调配管理；片位依据已确认交接更新。</td></tr><tr><td>本腔任务、能力、Busy、HasWafer 与结果</td><td>对应 Module 形成并发布；空闲、工艺完成和有片分别表达。</td></tr><tr><td>模块调用、模式请求及反馈交接</td><td>ModuleInvocation 组织；确认状态的来源需与 Module 明确约定。</td></tr><tr><td>机器人报文与连接反馈</td><td>Com_Task 负责通信；Unit 持有搬运业务任务及上下文。</td></tr><tr><td>设备逻辑输出 / 最终通道输出</td><td>Control 统一形成设备逻辑输出；OutputMapping 负责物理通道映射。</td></tr></tbody></table></div><div class="framework-note">同一变量只安排一个写入者；其他程序通过自己的接口提出请求或确认。信号无效和“真实无片”应分别表达。</div>`,
    lifecycle:`<div class="framework-heading"><h3>任务与搬运的生命周期</h3><small>STATE / HANDOFF</small></div><p>状态模型按任务身份、晶圆身份和交接阶段匹配请求与结果。</p><h4>腔室任务</h4><div class="framework-flow"><div class="framework-stage"><b>待下发</b><span>准备任务与配方</span></div><div class="framework-stage"><b>等待受理</b><span>保持请求及身份</span></div><div class="framework-stage"><b>执行中</b><span>受理后维持占用</span></div><div class="framework-stage"><b>结果待确认</b><span>结果按身份保持</span></div><div class="framework-stage"><b>结果已确认</b><span>按约定结束交接</span></div></div><p>任务受理不等于工艺已经开始；目标配方确认、放片交接完成、机器人退出且 CanStartProcess 成立后，才能启动对应工艺。拒绝、异常或结果待核实时进入对应处理，不把 Stopped、正常完成、清理完成和有片混作一个状态。</p><h4>一次搬运</h4><div class="framework-flow"><div class="framework-stage"><b>准备 / 预约</b><span>源、目标及机器人</span></div><div class="framework-stage"><b>取片确认</b><span>机器人与源端核对</span></div><div class="framework-stage"><b>放片确认</b><span>机器人与目标核对</span></div><div class="framework-stage"><b>机器人退出</b><span>退出后才能结束交接</span></div><div class="framework-stage"><b>两端释放</b><span>匹配身份后释放预约</span></div></div><div class="framework-note amber">结果不明、反馈无效或互相矛盾时，保留任务身份、位置上下文及相关预约，先核实再决定恢复；不盲目重发。</div>`,
    tasks:`<div class="framework-heading"><h3>Logic / Motion / Com 如何交接</h3><small>TASK / HANDSHAKE</small></div><p>任务按动作请求、通信报文和状态反馈分工。</p><div class="framework-table-wrap"><table class="framework-table"><thead><tr><th>方向</th><th>接口与职责</th></tr></thead><tbody><tr><td>Logic → Motion</td><td>Logic 发布动作请求、参数快照与持续运行许可，Motion 周期执行并发布轴状态。</td></tr><tr><td>Logic → Com</td><td>Unit 提出机器人业务任务，Com 负责报文收发、解析及连接有效性。</td></tr><tr><td>Motion / Com → Logic</td><td>反馈的来源、有效期和对应请求身份；未知或失效状态不能伪装成正常完成。</td></tr></tbody></table></div><div class="framework-note">跨任务请求应持续到接收方确认，或使用等效的可靠交接机制；不要依赖短脉冲恰好被另一任务采到。结构体按一致快照交接。</div><p>工程配置的任务周期为 Logic 2 ms、Motion 1 ms、Com 1 ms。</p>`
  };
  const frameworkLinks={module:[['module-overview','Module 总览'],['alarm','Alarm'],['manual','Manual'],['auto','Auto'],['controls','Control']],scan:[['logic-task','Logic_Task'],['module-invocation','ModuleInvocation'],['machine-dispatch','整机调配'],['output-mapping','OutputMapping']],owners:[['unit-overview','Unit 总览'],['unit-io','输入输出'],['unit-permits','能力与占用'],['com-task','Com_Task']],lifecycle:[['unit-task','任务与控制'],['unit-recipe','配方'],['unit-result','任务结果'],['unit-handoff','搬运交接']],tasks:[['logic-task','Logic_Task'],['motion-task','Motion_Task'],['com-task','Com_Task'],['machine-dispatch','整机调配']]};
  function renderFramework(){const topic=frameworkTopics.find(item=>item.id===activeFrameworkTopic)||frameworkTopics[0];$('frameworkContent').innerHTML=`<div class="framework-hero"><div><div class="kicker">FRAMEWORK / IMPLEMENTATION NOTES</div><h2>从职责划分到程序入口</h2><p>以一个腔室为例，查看调用顺序、数据归属和交接时序。点击关联程序，可在右侧查看并编辑该节点的说明。</p></div></div><div class="framework-nav" role="group" aria-label="框架细化主题">${frameworkTopics.map((item,i)=>`<button data-framework-topic="${item.id}" aria-pressed="${item.id===topic.id}"><small>${String(i+1).padStart(2,'0')}</small>${item.title}</button>`).join('')}</div><article class="framework-panel">${frameworkPanels[topic.id]}<div class="framework-links" aria-label="相关程序">${frameworkLinks[topic.id].map(([id,label])=>`<button data-node="${id}" aria-pressed="${id===selected}">${label} ↗</button>`).join('')}</div><p class="framework-edit-hint">点击关联程序，在右侧查看具体节点说明。</p></article>`;syncSelected();}

  function setView(next){view=next;for(const id of ['architecture','walkthrough','exchanges','operations','framework'])$('view-'+id).hidden=id!==view;const captions={architecture:['01','程序架构与职责'],walkthrough:['02','单片任务的完整交接'],exchanges:['03','Unit 与 Module 的接口语义'],operations:['04','上位机到设备的操作与报警流程'],framework:['05','框架入口、时序与交接']};$('viewNumber').textContent=captions[view][0];$('viewCaption').textContent=captions[view][1];$('zoomTools').hidden=view!=='architecture';if(view==='architecture')requestAnimationFrame(resizeGraph);if(view==='framework'){const topic=frameworkTopics.find(item=>item.id===activeFrameworkTopic);if(topic)selectNode(topic.node,-1,false);renderFramework();}if(view==='exchanges'){selectNode(activeExchangeId,-1,false);renderExchanges();}if(view==='operations'){if(activeOperationStep<0)activeOperationStep=0;const step=currentOperationStep();if(step)selectNode(step.node,-1,false);renderOperations();}}
  function updateNodeLabels(){root.querySelectorAll('[data-node]').forEach(el=>{const n=node(el.dataset.node);if(!n)return;const title=el.querySelector('.node-title,.interface-title,.capability-title');if(title)title.textContent=n.title;const subtitle=el.querySelector('.node-subtitle');if(subtitle)subtitle.textContent=n.subtitle;if(el.classList.contains('node'))el.setAttribute('aria-label','查看说明：'+n.title);});renderExchanges();renderOperations();requestAnimationFrame(resizeGraph);}
  function markDirty(){dirty=true;}
  function toast(message,error=false){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4800);}
  $('board').addEventListener('click',event=>{const b=event.target.closest('[data-node]');if(b)selectNode(b.dataset.node);});
  $('exchangeContent').addEventListener('click',event=>{const b=event.target.closest('[data-node]');if(b){const id=b.dataset.node;selectNode(id);if(selected===id){activeExchangeId=id;renderExchanges();}}});
  $('frameworkContent').addEventListener('click',event=>{const topic=event.target.closest('[data-framework-topic]');if(topic){if(!commitEditor())return;activeFrameworkTopic=topic.dataset.frameworkTopic;const item=frameworkTopics.find(t=>t.id===activeFrameworkTopic);if(item)selectNode(item.node,-1,false);renderFramework();return;}const b=event.target.closest('[data-node]');if(b)selectNode(b.dataset.node);});
  $('walkthroughContent').addEventListener('click',event=>{const b=event.target.closest('[data-step]');if(b){const i=Number(b.dataset.step);selectNode(data.walkthrough[i].node,i);}});
  $('operationContent').addEventListener('click',event=>{
    const b=event.target.closest('[data-operation],[data-operation-branch],[data-operation-step],[data-operation-move]');if(!b||!commitEditor())return;
    if(b.dataset.operation){activeOperationId=b.dataset.operation;activeOperationStep=0;chooseOperationStep(0);}
    else if(b.dataset.operationBranch){activeOperationBranch=b.dataset.operationBranch;activeOperationStep=0;chooseOperationStep(0);}
    else if(b.dataset.operationStep!==undefined)chooseOperationStep(Number(b.dataset.operationStep));
    else if(b.dataset.operationMove!==undefined)chooseOperationStep(Math.max(0,activeOperationStep+Number(b.dataset.operationMove)));
  });
  $('inspectorContent').addEventListener('input',event=>{const f=event.target.dataset.field,s=event.target.dataset.stepField,op=event.target.dataset.operationField;if(f){node(selected)[f]=event.target.value;updateNodeLabels();markDirty();refreshSearch();}else if(s&&activeStep>=0){data.walkthrough[activeStep][s]=event.target.value;renderWalkthrough();markDirty();}else if(op&&currentOperationStep()){currentOperationStep()[op]=event.target.value;renderOperations();markDirty();}});
  $('editToggle').addEventListener('click',()=>{if(!commitEditor())return;editing=!editing;renderInspector();});
  $('inspectorContent').addEventListener('click',event=>{const command=event.target.closest('[data-document-command]')?.dataset.documentCommand;if(!command)return;
    if(command==='reference'){$('referenceTitle').textContent='参考说明 · '+node(selected).title;$('referenceContent').innerHTML=Documents.render(node(selected).referenceDocument);$('referenceDialog').showModal();}
    if(command==='blank'){if(!confirm('清空当前节点的说明正文，从空白开始？参考说明和其他节点不受影响，此操作可以撤销。'))return;pushUndo();node(selected).document={sections:[]};editing=true;renderInspector();markDirty();refreshSearch();toast('本节点已从空白开始，参考说明仍保留。');}
    if(command==='undo'){const stack=undoByNode.get(selected)||[];if(!stack.length)return;const index=data.nodes.findIndex(n=>n.id===selected);data.nodes[index]=stack.pop();updateNodeLabels();renderInspector();markDirty();refreshSearch();}
  });
  $('restoreNode').addEventListener('click',()=>{if(!confirm('用参考说明替换当前节点的说明正文？节点名称和其他节点不受影响，此操作可以撤销。'))return;pushUndo();node(selected).document=clone(node(selected).referenceDocument);renderInspector();markDirty();refreshSearch();toast('已恢复本节点的参考说明。可以撤销，也可继续修改。');});
  function saveDraft(){if(!commitEditor())return;try{const safe=validate(data);drafts.write(storageKey,JSON.stringify(safe));data=safe;dirty=false;toast('说明已保存到当前浏览器。');}catch(error){toast('保存说明失败：'+error.message,true);}}
  function refreshSearch(){const q=$('searchInput').value.trim().toLocaleLowerCase();const results=$('searchResults');results.hidden=!q;if(!q){results.replaceChildren();return;}const matches=data.nodes.filter(n=>[n.title,n.subtitle,n.status,Documents.text(n.document)].some(text=>(text||'').toLocaleLowerCase().includes(q)));results.innerHTML=matches.length?matches.map(n=>`<button class="search-result" data-node="${escape(n.id)}">${escape(n.title)}</button>`).join(''):'<span class="muted">没有找到相关流程，请尝试“配方”“机器人”或“装片”。</span>';}
  $('searchInput').addEventListener('input',refreshSearch);$('closeReference').addEventListener('click',()=>$('referenceDialog').close());
  $('searchResults').addEventListener('click',event=>{const b=event.target.closest('[data-node]');if(b)selectNode(b.dataset.node);});
  $('zoomIn').addEventListener('click',()=>setZoom(zoom+.1));$('zoomOut').addEventListener('click',()=>setZoom(zoom-.1));$('fitWidth').addEventListener('click',()=>setZoom(Math.min(1,($('canvasScroll').clientWidth-24)/980),innerWidth>820));
  window.addEventListener('resize', resizeGraph, { signal });
  window.addEventListener('beforeunload', event => {
    if (documentEditor && !documentEditor.flush()) dirty = true;
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  }, { signal });
  window.addEventListener('keydown', event => {
    if (maintenance && !root.hidden && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveDraft();
    }
  }, { signal });
  const observer = new ResizeObserver(resizeGraph);
  observer.observe($('canvasScroll'));
  if (maintenance && pendingDraft) {
    ({ data, selected, editing, dirty } = pendingDraft);
    pendingDraft = undefined;
    window.removeEventListener('beforeunload', warnPendingDraft);
  }
  buildLayout();
  renderInspector();
  if (migratedDraft) toast('已读取旧版说明。按 Ctrl+S 可保存为当前格式。');

  return {
    setView,
    destroy() {
      if (documentEditor) {
        documentEditor.flush();
        documentEditor.destroy();
      }
      if (dirty) {
        pendingDraft = { data, selected, editing, dirty, undo: undoByNode };
        window.addEventListener('beforeunload', warnPendingDraft);
      }
      events.abort();
      observer.disconnect();
      clearTimeout(toastTimer);
    },
  };
}
