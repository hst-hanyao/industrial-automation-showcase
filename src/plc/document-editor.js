/* Offline, dependency-free document sections and rich text editor. */
const legacyFields = [['summary','概述'],['responsibility','负责什么'],['inputs','接收什么'],['outputs','返回什么'],['sequence','处理顺序'],['conditions','前置条件与许可'],['exceptions','异常与恢复'],['example','交互示例']];
const allowed = new Set('P DIV BR H1 H2 H3 STRONG B EM I U S UL OL LI TABLE THEAD TBODY TR TH TD BLOCKQUOTE PRE CODE HR'.split(' '));
const blocked = new Set('SCRIPT STYLE IFRAME SVG MATH IMG PICTURE OBJECT EMBED TEMPLATE NOSCRIPT LINK META BASE FORM INPUT BUTTON SELECT OPTION TEXTAREA VIDEO AUDIO SOURCE TRACK CANVAS FRAME FRAMESET APPLET'.split(' '));
const copy = value => JSON.parse(JSON.stringify(value));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => 'section-' + (window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));

function sanitize(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const output = document.createElement('div');
  function appendClean(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) { parent.append(document.createTextNode(node.nodeValue)); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toUpperCase();
    if (blocked.has(tag) || node.namespaceURI !== 'http://www.w3.org/1999/xhtml') return;
    if (allowed.has(tag)) {
      const clean = document.createElement(tag.toLowerCase());
      parent.append(clean);
      for (const child of [...node.childNodes]) appendClean(child, clean);
    } else {
      for (const child of [...node.childNodes]) appendClean(child, parent);
    }
  }
  for (const node of [...template.content.childNodes]) appendClean(node, output);
  return output.innerHTML;
}

function normalize(doc) {
  if (!doc || !Array.isArray(doc.sections)) throw new Error('文档必须包含章节列表 sections。');
  if (doc.sections.length > 100) throw new Error('每个节点最多支持 100 个章节。');
  let total = 0;
  const ids = new Set();
  const sections = doc.sections.map(section => {
    if (!section || typeof section.id !== 'string' || !section.id.trim() || section.id.length > 100 || ids.has(section.id)) throw new Error('章节编号缺失、重复或过长。');
    if (typeof section.title !== 'string' || section.title.length > 160) throw new Error('章节标题最多支持 160 个字符。');
    if (typeof section.html !== 'string' || section.html.length > 100000) throw new Error('每个章节正文最多支持 100,000 个字符。');
    ids.add(section.id);
    const html = sanitize(section.html);
    if (html.length > 100000) throw new Error('章节正文转换后过长，请拆分章节。');
    total += section.id.length + section.title.length + html.length;
    if (total > 500000) throw new Error('单个节点说明过长，请精简内容。');
    return {id: section.id, title: section.title, html};
  });
  return {sections};
}

function fromLegacy(node) {
  return normalize({sections: legacyFields.filter(([field]) => typeof node[field] === 'string' && node[field].length > 0).map(([field, title]) => ({id:'legacy-' + field, title, html:'<p>' + escape(node[field]).replace(/\r\n?|\n/g,'<br>') + '</p>'}))});
}

function render(doc) {
  const clean = normalize(doc);
  if (!clean.sections.length) return '<p class="document-empty">此节点当前无本机说明，可恢复发布版或编辑</p>';
  return clean.sections.map(s => `<section class="free-section" data-section-id="${escape(s.id)}">${s.title ? `<h3 class="free-section-title">${escape(s.title)}</h3>` : ''}<div class="rich-content">${s.html}</div></section>`).join('');
}

function text(doc) {
  const clean = normalize(doc);
  return clean.sections.map(section => {
    const holder = document.createElement('div'); holder.innerHTML = section.html;
    for (const br of [...holder.querySelectorAll('br')]) br.replaceWith(document.createTextNode('\n'));
    for (const block of [...holder.querySelectorAll('p,div,h1,h2,h3,li,tr,blockquote,pre')]) block.append(document.createTextNode('\n'));
    for (const cell of [...holder.querySelectorAll('td,th')]) cell.append(document.createTextNode('\t'));
    return [section.title, holder.textContent].filter(Boolean).join('\n');
  }).join('\n\n');
}

function mount(container, options) {
  if (!container || typeof container.addEventListener !== 'function') throw new Error('缺少文档编辑容器。');
  let current = normalize(options.document), destroyed = false, ownDialog = null;
  let lastEmitted = JSON.stringify(current);
  const ranges = new Map();
  const formats = [['bold','B','加粗'],['italic','I','斜体'],['underline','U','下划线'],['p','正文','普通段落'],['h2','标题 2','二级标题'],['h3','标题 3','三级标题'],['ul','• 列表','项目符号列表'],['ol','1. 列表','编号列表'],['table','表格','插入表格']];
  container.innerHTML = '<div class="editor-error" role="alert" hidden></div><div class="document-sections"></div><div class="editor-empty" hidden>这里是一张空白文档。添加章节后开始写作，标题可以留空。</div><div class="document-editor-actions"><button type="button" class="btn small" data-document-action="add">＋ 添加章节</button><span class="document-editor-tip">章节标题可自定，正文支持段落、列表和表格。</span></div>';
  const sectionsHost = container.querySelector('.document-sections');
  const errorBox = container.querySelector('.editor-error');

  function editorFor(id) { return [...sectionsHost.children].find(el => el.dataset.sectionId === id)?.querySelector('.rich-editor'); }
  function sectionFor(id) { return [...sectionsHost.children].find(el => el.dataset.sectionId === id); }
  function showError(message) { errorBox.textContent = message; errorBox.hidden = !message; }
  function notify(next, kind='input', previousDocument) {
    current = normalize(next);
    const serialized = JSON.stringify(current);
    showError('');
    if (serialized !== lastEmitted) {
      lastEmitted = serialized;
      options.onChange?.(copy(current), {kind, ...(previousDocument ? {previousDocument:copy(previousDocument)} : {})});
    }
  }
  function sync(kind='input') {
    if (destroyed) return false;
    try {
      const next = {sections:[...sectionsHost.children].map(el => ({id:el.dataset.sectionId,title:el.querySelector('[data-section-title]').value,html:el.querySelector('.rich-editor').innerHTML}))};
      notify(next, kind);
      updateEmptyMarkers();
      return true;
    } catch (error) { showError('保存失败：' + error.message); return false; }
  }
  function updateEmptyMarkers() {
    for (const editor of sectionsHost.querySelectorAll('.rich-editor')) editor.dataset.empty = String(!editor.textContent.trim() && !editor.querySelector('table,hr'));
  }
  function updateOrder() {
    const all=[...sectionsHost.children];
    all.forEach((el,i) => { el.querySelector('.section-order').textContent='章节 ' + (i+1); el.querySelector('[data-section-action="up"]').disabled=i===0;el.querySelector('[data-section-action="down"]').disabled=i===all.length-1; });
    container.querySelector('.editor-empty').hidden = all.length > 0;
    container.querySelector('[data-document-action="add"]').disabled=all.length>=100;
    updateEmptyMarkers();
  }
  function makeSection(section) {
    const el=document.createElement('section');el.className='section-editor';el.dataset.sectionId=section.id;
    el.innerHTML=`<div class="section-editor-head"><span class="section-order"></span><div class="section-actions"><button type="button" class="btn small" data-section-action="up" aria-label="上移章节">↑</button><button type="button" class="btn small" data-section-action="down" aria-label="下移章节">↓</button><button type="button" class="btn small" data-section-action="delete">删除章节</button></div></div><input class="section-title-input" data-section-title aria-label="章节标题" maxlength="160" placeholder="自定义章节标题（可留空）" value="${escape(section.title)}"><div class="format-toolbar" role="toolbar" aria-label="章节正文格式">${formats.map(([format,label,title])=>`<button type="button" class="format-button" data-format="${format}" aria-label="${title}" title="${title}">${label}</button>`).join('')}</div><div class="rich-editor" contenteditable="true" role="textbox" aria-label="章节正文" aria-multiline="true" data-placeholder="在这里编写正文…" spellcheck="false"></div>`;
    el.querySelector('.rich-editor').innerHTML=section.html;
    return el;
  }
  current.sections.forEach(section => sectionsHost.append(makeSection(section)));
  updateOrder();

  function captureSelection() {
    if (destroyed) return;
    const selection=window.getSelection();if(!selection || !selection.rangeCount)return;
    const range=selection.getRangeAt(0);
    let ancestor=range.commonAncestorContainer;
    if(ancestor.nodeType!==Node.ELEMENT_NODE)ancestor=ancestor.parentElement;
    const editor=ancestor?.closest?.('.rich-editor');
    if(!editor || !container.contains(editor) || !editor.contains(range.startContainer) || !editor.contains(range.endContainer))return;
    const id=editor.closest('[data-section-id]').dataset.sectionId;
    ranges.set(id,range.cloneRange());
  }
  function restoreSelection(id) {
    const editor=editorFor(id);if(!editor)return null;
    editor.focus({preventScroll:true});
    let range=ranges.get(id);
    if(!range || !editor.contains(range.startContainer) || !editor.contains(range.endContainer)){range=document.createRange();range.selectNodeContents(editor);range.collapse(false);}
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    return {editor,range};
  }
  function command(name, value) {
    try { return typeof document.execCommand==='function' && document.execCommand(name,false,value ?? null); } catch { return false; }
  }
  function fallbackInsertHTML(id, html) {
    const info=restoreSelection(id);if(!info)return;
    const template=document.createElement('template');template.innerHTML=sanitize(html);
    const fragment=template.content;const last=fragment.lastChild;
    info.range.deleteContents();info.range.insertNode(fragment);
    if(last){const range=document.createRange();range.setStartAfter(last);range.collapse(true);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}
  }
  function insertHTML(id, html, kind) {
    if(!restoreSelection(id))return;
    const clean=sanitize(html);
    if(!command('insertHTML',clean))fallbackInsertHTML(id,clean);
    captureSelection();sync(kind);
  }
  function fallbackFormat(id, format) {
    const info=restoreSelection(id);if(!info)return;
    const {range}=info;
    if(['bold','italic','underline'].includes(format)){
      const wrapper=document.createElement({bold:'strong',italic:'em',underline:'u'}[format]);
      if(range.collapsed){wrapper.append(document.createTextNode('\u200b'));range.insertNode(wrapper);range.selectNodeContents(wrapper);range.collapse(false);}
      else {wrapper.append(range.extractContents());range.insertNode(wrapper);range.selectNodeContents(wrapper);}
      const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    }else if(['p','h2','h3'].includes(format)){
      let block=range.startContainer.nodeType===Node.ELEMENT_NODE?range.startContainer:range.startContainer.parentElement;
      while(block && block!==info.editor && !['P','DIV','H1','H2','H3','LI'].includes(block.tagName))block=block.parentElement;
      const replacement=document.createElement(format);
      if(block && block!==info.editor && block.tagName!=='LI'){while(block.firstChild)replacement.append(block.firstChild);block.replaceWith(replacement);}
      else{replacement.append(range.extractContents());if(!replacement.childNodes.length)replacement.append(document.createElement('br'));range.insertNode(replacement);}
      range.selectNodeContents(replacement);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    }else if(format==='ul' || format==='ol'){
      const list=document.createElement(format);const words=range.toString().split(/\r?\n/);
      for(const word of words){const li=document.createElement('li');li.textContent=word;if(!word)li.append(document.createElement('br'));list.append(li);}
      range.deleteContents();range.insertNode(list);range.selectNodeContents(list.lastElementChild);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    }
  }
  function openTableDialog(id) {
    ownDialog?.remove();
    const dialog=document.createElement('dialog');ownDialog=dialog;dialog.className='table-dialog';
    dialog.innerHTML='<form><h2>插入表格</h2><p>填写行列数，插入后可直接修改每个单元格。</p><label>行数（含表头）<input name="rows" aria-label="表格行数" type="number" min="2" max="10" step="1" value="3" required></label><label>列数<input name="columns" aria-label="表格列数" type="number" min="2" max="10" step="1" value="3" required></label><div class="table-dialog-actions"><button type="button" class="btn" data-table-cancel>取消</button><button type="submit" class="btn primary" data-table-insert>插入表格</button></div></form>';
    const remove=()=>{if(dialog.open)dialog.close();dialog.remove();if(ownDialog===dialog)ownDialog=null;};
    dialog.querySelector('[data-table-cancel]').addEventListener('click',()=>{remove();restoreSelection(id);});
    dialog.addEventListener('cancel',event=>{event.preventDefault();remove();restoreSelection(id);});
    dialog.querySelector('form').addEventListener('submit',event=>{
      event.preventDefault();const rows=Number(dialog.querySelector('[name=rows]').value),columns=Number(dialog.querySelector('[name=columns]').value);
      if(!Number.isInteger(rows)||!Number.isInteger(columns)||rows<2||rows>10||columns<2||columns>10)return;
      let html='<table><tbody>';
      for(let r=0;r<rows;r++){html+='<tr>';for(let c=0;c<columns;c++)html+=r===0?'<th>列 '+(c+1)+'</th>':'<td><br></td>';html+='</tr>';}
      html+='</tbody></table><p><br></p>';remove();insertHTML(id,html,'format');
    });
    options.modalRoot.append(dialog);dialog.showModal();dialog.querySelector('[name=rows]').focus();
  }
  function applyFormat(id, format) {
    if(format==='table'){captureSelection();openTableDialog(id);return;}
    if(!restoreSelection(id))return;
    const commands={bold:['bold'],italic:['italic'],underline:['underline'],p:['formatBlock','P'],h2:['formatBlock','H2'],h3:['formatBlock','H3'],ul:['insertUnorderedList'],ol:['insertOrderedList']};
    const selected=commands[format];if(!selected)return;
    if(!command(selected[0],selected[1]))fallbackFormat(id,format);
    captureSelection();sync('format');
  }

  function onInput(event) {if(event.target.matches('[data-section-title]') || event.target.closest('.rich-editor'))sync('input');}
  function onMouseDown(event) {if(event.target.closest('[data-format]')){captureSelection();event.preventDefault();}}
  function onClick(event) {
    const add=event.target.closest('[data-document-action="add"]');
    if(add && container.contains(add)){
      if(!sync() || current.sections.length>=100)return;const previous=copy(current),next=copy(current);const section={id:uid(),title:'',html:'<p><br></p>'};next.sections.push(section);sectionsHost.append(makeSection(section));notify(next,'add',previous);updateOrder();sectionFor(section.id).querySelector('[data-section-title]').focus();return;
    }
    const section=event.target.closest('[data-section-id]');if(!section || !sectionsHost.contains(section))return;
    const id=section.dataset.sectionId;
    const formatButton=event.target.closest('[data-format]');if(formatButton){applyFormat(id,formatButton.dataset.format);return;}
    const action=event.target.closest('[data-section-action]')?.dataset.sectionAction;if(!action)return;
    if(!sync())return;
    const index=current.sections.findIndex(s=>s.id===id);if(index<0)return;
    if(action==='delete'){
      if(!window.confirm('删除这个章节？其他章节和节点不会改变。'))return;
      const previous=copy(current),next=copy(current);next.sections.splice(index,1);section.remove();ranges.delete(id);notify(next,'delete',previous);updateOrder();const remaining=sectionsHost.children[Math.min(index,sectionsHost.children.length-1)];(remaining?.querySelector('[data-section-title]') || container.querySelector('[data-document-action="add"]')).focus();return;
    }
    const target=action==='up'?index-1:index+1;if(target<0 || target>=current.sections.length)return;
    const previous=copy(current),next=copy(current);[next.sections[index],next.sections[target]]=[next.sections[target],next.sections[index]];
    const byId=new Map([...sectionsHost.children].map(el=>[el.dataset.sectionId,el]));for(const s of next.sections)sectionsHost.append(byId.get(s.id));notify(next,'move',previous);updateOrder();section.querySelector('[data-section-title]').focus();
  }
  function insertTransfer(event, transfer) {
    const editor=event.target.closest('.rich-editor');if(!editor || !container.contains(editor))return;
    event.preventDefault();captureSelection();
    const id=editor.closest('[data-section-id]').dataset.sectionId;
    const html=transfer?.getData('text/html'),plain=transfer?.getData('text/plain');
    if(html)insertHTML(id,sanitize(html),'paste');else if(plain)insertHTML(id,escape(plain).replace(/\r\n?|\n/g,'<br>'),'paste');
  }
  const onPaste=event=>insertTransfer(event,event.clipboardData);
  const onDrop=event=>insertTransfer(event,event.dataTransfer);
  container.addEventListener('input',onInput);container.addEventListener('mousedown',onMouseDown);container.addEventListener('click',onClick);container.addEventListener('paste',onPaste);container.addEventListener('drop',onDrop);document.addEventListener('selectionchange',captureSelection);
  return {
    flush:()=>sync(),
    getDocument:()=>copy(current),
    destroy(){if(destroyed)return;destroyed=true;container.removeEventListener('input',onInput);container.removeEventListener('mousedown',onMouseDown);container.removeEventListener('click',onClick);container.removeEventListener('paste',onPaste);container.removeEventListener('drop',onDrop);document.removeEventListener('selectionchange',captureSelection);ownDialog?.remove();ownDialog=null;ranges.clear();}
  };
}
export { fromLegacy, normalize, render, text, mount, sanitize };
