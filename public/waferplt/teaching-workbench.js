/* global window, document, URL, performance, setTimeout, setInterval, requestAnimationFrame, getComputedStyle */
const byId = id => document.getElementById(id);
const sources = {
  machine: 'machine/electroplating-machine.html?teaching=1',
  apt: 'modules/apt.html?teaching=1',
  plt: 'modules/plt.html?teaching=1',
  srd: 'modules/srd.html?teaching=1',
};
const structures = [
  { id: 'overview', title: '整机总览', source: 'machine', lesson: 'handling', view: 'all' },
  { id: 'foup', title: 'FOUP 与定向台', source: 'machine', lesson: 'handling', view: 'FOUP' },
  { id: 'front', title: '前手臂 · 干片', source: 'machine', lesson: 'handling', view: 'front' },
  { id: 'rear', title: '后手臂 · 干湿片', source: 'machine', lesson: 'handling', view: 'rear' },
  { id: 'apt', title: 'APT 预湿模块', source: 'apt', view: 'overview' },
  { id: 'plt', title: 'PLT 电镀腔体', source: 'plt', view: 'overview' },
  { id: 'srd', title: 'SRD 清洗甩干', source: 'srd', view: 'overview' },
  { id: 'micro', title: 'TSV / WLP 微结构', source: 'machine', view: 'micro' },
];
const processes = [
  { id: 'transport', title: '完整搬运流程', source: 'machine', lesson: 'handling', view: 'all' },
  { id: 'load', title: '装片与定向', source: 'machine', lesson: 'handling', view: 'front', filter: id => id === 'ready' || id === 'align' || id.startsWith('front-load-') },
  { id: 'handoff', title: '前端干片交接', source: 'machine', lesson: 'handling', view: 'front', filter: id => id.startsWith('front-handoff-') },
  { id: 'receive', title: '后端接片入 APT', source: 'machine', lesson: 'handling', view: 'rear', filter: id => id.startsWith('rear-load-') },
  { id: 'apt', title: 'APT 预湿与排气', source: 'apt', view: 'section' },
  { id: 'to-plt', title: '湿片转移至 PLT', source: 'machine', lesson: 'handling', view: 'rear', filter: id => id.startsWith('rear-wet-apt-plt-') },
  { id: 'plt', title: 'PLT 电镀沉积', source: 'plt', view: 'section' },
  { id: 'to-srd', title: '湿片转移至 SRD', source: 'machine', lesson: 'handling', view: 'rear', filter: id => id.startsWith('rear-wet-plt-srd-') },
  { id: 'srd', title: 'SRD 清洗与甩干', source: 'srd', view: 'section' },
  { id: 'return', title: '干片交接与回盒', source: 'machine', lesson: 'handling', view: 'all', filter: id => id.startsWith('rear-unload-') || id.startsWith('front-return-') || id === 'complete' },
  { id: 'growth', title: 'TSV / WLP 生长', source: 'machine', view: 'micro', filter: id => ['tsv-fill', 'wlp-pillar', 'wlp-rdl'].includes(id) },
];
let frame = byId('viewer');
frame.className = 'viewer-frame';
const viewerCache = new Map();
let activeRecord = null;
let viewer = null;
let source = '';
let mode = 'structure';
let selected = structures[0];
let stepIndexes = [];
let readyToken = 0;
let lastStep = -1;
let growthFamily = new URL(window.location.href).searchParams.get('pattern') === 'wlp' ? 'wlp' : 'tsv';
const progressStorageKey = 'waferplt.lesson-progress.v1';
const lessonProgress = new Map();
let activeProcess = null;
let lastStoredProgress = '';
try {
  const saved = JSON.parse(window.sessionStorage.getItem(progressStorageKey) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    for (const [key, value] of Object.entries(saved).slice(0, 64)) {
      if (value && typeof value.stepId === 'string' && value.stepId.length < 160 && Number.isFinite(value.progress) && value.progress >= 0 && value.progress <= 1) lessonProgress.set(key, value);
    }
  }
} catch { /* Progress remains available in memory when browser storage is unavailable. */ }
function processKey(item, family = growthFamily) {
  return `${item.source}:${item.id}${item.id === 'growth' ? `:${family}` : ''}`;
}
function saveProcessProgress() {
  if (!activeProcess) return;
  const { api, item } = activeProcess;
  const state = api.state();
  const step = api.steps[state.stepIndex];
  if (!step || !Number.isFinite(state.progress)) return;
  const family = step.id.startsWith('wlp-') ? 'wlp' : 'tsv';
  lessonProgress.set(processKey(item, family), { stepId: step.id, progress: Math.max(0, Math.min(1, state.progress)) });
  const serialized = JSON.stringify(Object.fromEntries(lessonProgress));
  if (serialized === lastStoredProgress) return;
  try { window.sessionStorage.setItem(progressStorageKey, serialized); lastStoredProgress = serialized; } catch { /* Keep the in-memory snapshot. */ }
}
function setStatusText(id, value) {
  const text = value || '—';
  if (byId(id).textContent !== text) byId(id).textContent = text;
}
function syncWaferStatus(state) {
  const status = state.waferStatus;
  const panel = byId('wafer-status');
  panel.hidden = !status;
  if (!status) return;
  panel.dataset.condition = status.condition;
  setStatusText('wafer-condition', status.conditionLabel);
  setStatusText('wafer-support', status.supportLabel);
  setStatusText('wafer-target', status.targetLabel);
  byId('wafer-target-field').hidden = !status.targetLabel;
  setStatusText('wafer-phase', status.phase);
  byId('wafer-phase').hidden = !status.phase;
}

function addButtons(items, container, group) {
  for (const item of items) {
    if (group === 'process' && item.id === 'growth') {
      const selector = document.createElement('div');
      selector.className = 'growth-selector';
      const heading = document.createElement('span');
      heading.id = 'growth-heading';
      heading.className = 'growth-heading';
      heading.textContent = item.title;
      const choices = document.createElement('div');
      choices.className = 'growth-choices';
      choices.setAttribute('role', 'group');
      choices.setAttribute('aria-labelledby', heading.id);
      for (const [family, title] of [['tsv', 'TSV 深孔填充'], ['wlp', 'WLP 铜柱 / RDL']]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.lesson = item.id;
        button.dataset.group = group;
        button.dataset.family = family;
        button.setAttribute('aria-pressed', 'false');
        button.textContent = title;
        button.addEventListener('click', () => { growthFamily = family; openLesson(group, item); });
        choices.append(button);
      }
      selector.append(heading, choices);
      byId(container).append(selector);
      continue;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.lesson = item.id;
    button.dataset.group = group;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = item.title;
    button.addEventListener('click', () => openLesson(group, item));
    byId(container).append(button);
  }
}
addButtons(structures, 'structure-buttons', 'structure');
addButtons(processes, 'process-buttons', 'process');

function disableControls() {
  for (const id of ['previous', 'execute', 'pause', 'next', 'reset', 'step-select', 'step-progress']) byId(id).disabled = true;
}
function createViewer(sourceKey, forceReload) {
  if (!forceReload && viewerCache.has(sourceKey)) return viewerCache.get(sourceKey);
  const node = viewerCache.size === 0 && !frame.hasAttribute('src') ? frame : document.createElement('iframe');
  node.className = 'viewer-frame';
  node.dataset.source = sourceKey;
  node.setAttribute('allow', 'fullscreen');
  node.setAttribute('aria-hidden', 'true');
  if (!node.parentNode) byId('viewport').insertBefore(node, byId('viewer-loading'));
  const record = { frame: node, source: sourceKey, resolved: false };
  record.ready = new Promise((resolve, reject) => {
    const started = performance.now();
    node.addEventListener('load', () => {
      function connect() {
        const host = node.contentWindow;
        if (host?.teachingViewer && (sourceKey !== 'machine' || host.platformHandling)) {
          record.resolved = true;
          resolve(record);
        } else if (performance.now() - started > 45000) reject(new Error('viewer readiness timeout'));
        else setTimeout(connect, 80);
      }
      connect();
    }, { once: true });
    node.addEventListener('error', () => reject(new Error('viewer load failed')), { once: true });
    node.src = sources[sourceKey];
  });
  viewerCache.set(sourceKey, record);
  return record;
}
function pauseRecord(record) {
  if (!record?.resolved) return;
  record.frame.contentWindow.teachingViewer.pause();
  record.frame.contentWindow.platformHandling?.pause();
}
function setControllerMode(nextMode) {
  const panel = document.querySelector('.lesson-controller');
  const previousHeight = panel.getBoundingClientRect().height;
  panel.getAnimations().forEach(animation => animation.cancel());
  panel.dataset.mode = nextMode;
  const nextHeight = panel.getBoundingClientRect().height;
  if (Math.abs(previousHeight - nextHeight) > 1) {
    panel.animate([{ height: `${previousHeight}px` }, { height: `${nextHeight}px` }], {
      duration: 650,
      easing: 'cubic-bezier(.22,.61,.36,1)',
    });
  }
}
async function openLesson(nextMode, item, forceReload = false) {
  viewer?.pause();
  saveProcessProgress();
  activeProcess = null;
  byId('wafer-status').hidden = true;
  if (activeRecord?.swapAnimation) {
    const opacity = getComputedStyle(activeRecord.frame).opacity;
    activeRecord.swapAnimation.cancel();
    activeRecord.swapAnimation = activeRecord.frame.animate([{ opacity }, { opacity: 1 }], { duration: 300 });
  }
  mode = nextMode;
  selected = item;
  setControllerMode(mode);
  lastStep = -1;
  byId('view-kind').textContent = mode === 'structure' ? '模块结构' : '工艺流程';
  byId('view-title').textContent = item.title;
  document.querySelectorAll('[data-lesson]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.group === mode && button.dataset.lesson === item.id && (!button.dataset.family || button.dataset.family === growthFamily))));
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set(mode, item.id);
  if (mode === 'process' && item.id === 'growth') url.searchParams.set('pattern', growthFamily);
  window.history.replaceState(null, '', url);
  const token = ++readyToken;
  pauseRecord(activeRecord);
  viewer = null;
  disableControls();
  source = item.source;
  byId('viewport').setAttribute('aria-busy', 'true');
  byId('viewer-loading').hidden = Boolean(activeRecord);
  byId('loading-text').textContent = '正在准备三维模型…';
  byId('retry').hidden = true;
  byId('run-state').textContent = '准备中';
  byId('step-title').textContent = item.title;
  byId('step-detail').textContent = '三维模型就绪后，可观察结构或手动执行当前动作。';
  try {
    const incoming = await createViewer(source, forceReload).ready;
    if (token !== readyToken) return;
    const previous = activeRecord;
    const presentation = item.lesson === 'handling' ? 'platform' : item.view === 'micro' ? 'micro' : 'module';
    const changingPresentation = previous === incoming && incoming.presentation && incoming.presentation !== presentation;
    if (changingPresentation) {
      const opacity = getComputedStyle(incoming.frame).opacity;
      incoming.swapAnimation?.cancel();
      const fadeOut = incoming.frame.animate([{ opacity }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
      incoming.swapAnimation = fadeOut;
      await fadeOut.finished.catch(() => {});
      if (token !== readyToken) { if (incoming.swapAnimation === fadeOut) fadeOut.cancel(); return; }
    }
    incoming.frame.hidden = false;
    pauseRecord(incoming);
    if (previous && previous !== incoming) previous.frame.removeAttribute('id');
    frame = incoming.frame;
    frame.id = 'viewer';
    frame.title = `${item.title}三维教学`;
    const host = frame.contentWindow;
    if (item.lesson === 'handling') {
      host.teachingViewer.pause();
      host.platformHandling.activate();
      viewer = host.platformHandling;
    } else {
      host.platformHandling?.deactivate();
      viewer = host.teachingViewer;
    }
    activeRecord = incoming;
    incoming.presentation = presentation;
    configureLesson();
    if (changingPresentation) {
      incoming.swapAnimation.cancel();
      incoming.swapAnimation = frame.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' });
    }
    frame.setAttribute('aria-hidden', 'false');
    if (previous !== incoming || !incoming.frame.classList.contains('is-active')) {
      // Keep the previous scene visible until the incoming scene has rendered.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (token !== readyToken) return;
        incoming.frame.classList.add('is-active');
        if (previous && previous !== incoming) {
          previous.frame.classList.remove('is-active');
          previous.frame.setAttribute('aria-hidden', 'true');
        }
        byId('viewport').classList.add('is-transitioning');
        setTimeout(() => {
          if (activeRecord !== previous && previous) {
            previous.frame.hidden = true;
            if (viewerCache.get(previous.source) !== previous) previous.frame.remove();
          }
          if (token === readyToken) byId('viewport').classList.remove('is-transitioning');
        }, 720);
      }));
    }
    byId('viewport').setAttribute('aria-busy', 'false');
    byId('viewer-loading').hidden = true;
  } catch {
    if (token !== readyToken) return;
    byId('viewer-loading').hidden = false;
    byId('loading-text').textContent = '三维模型未能就绪，请重试或检查浏览器的硬件加速。';
    byId('retry').hidden = false;
    byId('run-state').textContent = '加载未完成';
  }
}
function initialStep() {
  if (selected.id === 'growth' && source === 'machine') {
    const id = growthFamily === 'wlp' ? 'wlp-pillar' : 'tsv-fill';
    return stepIndexes.find(index => viewer.steps[index].id === id) ?? stepIndexes[0];
  }
  return stepIndexes[0];
}
function configureLesson() {
  viewer.pause();
  viewer.setTeachingMode?.(mode);
  viewer.setStructure(selected.view);
  stepIndexes = viewer.steps.map((step, index) => ({ step, index })).filter(({ step }) => !selected.filter || selected.filter(step.id)).map(({ index }) => index);
  const select = byId('step-select');
  select.replaceChildren();
  for (const [local, global] of stepIndexes.entries()) {
    const option = document.createElement('option');
    option.value = String(global);
    option.textContent = `${String(local + 1).padStart(2, '0')} · ${viewer.steps[global].title}`;
    select.append(option);
  }
  if (mode === 'process' && stepIndexes.length) {
    const saved = lessonProgress.get(processKey(selected));
    const savedIndex = saved && stepIndexes.find(index => viewer.steps[index].id === saved.stepId && (selected.id !== 'growth' || (growthFamily === 'wlp' ? saved.stepId.startsWith('wlp-') : saved.stepId === 'tsv-fill')));
    viewer.selectStep(savedIndex ?? initialStep());
    if (savedIndex !== undefined) viewer.seekProgress(saved.progress);
    viewer.pause();
    activeProcess = { api: viewer, item: selected };
  }
  if (mode === 'structure') {
    byId('wafer-status').hidden = true;
    const option = document.createElement('option');
    option.textContent = '结构观察 · 模型保持静止';
    select.replaceChildren(option);
    byId('step-counter').textContent = '结构观察';
    byId('step-title').textContent = selected.title;
    byId('step-detail').textContent = '拖动模型旋转观察，可使用画面内的剖切、分解与部件标签。选择右列流程开始逐步教学。';
    byId('run-state').textContent = '静态观察';
    byId('run-state').dataset.state = 'paused';
    byId('step-progress').value = '0';
    byId('progress-value').textContent = '0%';
    disableControls();
  } else sync();
}
function sync() {
  if (!viewer || mode !== 'process') return;
  const state = viewer.state();
  const local = stepIndexes.indexOf(state.stepIndex);
  if (local < 0) { disableControls(); return; }
  syncWaferStatus(state);
  byId('step-counter').textContent = `动作 ${String(local + 1).padStart(2, '0')} / ${String(stepIndexes.length).padStart(2, '0')}`;
  byId('run-state').textContent = state.playing ? '正在执行本步' : state.completed ? '本步已完成 · 等待下一步' : '等待手动执行';
  byId('run-state').dataset.state = state.playing ? 'playing' : state.completed ? 'complete' : 'paused';
  if (lastStep !== state.stepIndex) {
    byId('step-title').textContent = state.title;
    byId('step-detail').textContent = state.detail || viewer.steps[state.stepIndex].detail || '观察当前动作，完成后手动进入下一步。';
    byId('step-select').value = String(state.stepIndex);
    lastStep = state.stepIndex;
  }
  if (selected.id === 'growth') {
    growthFamily = viewer.steps[state.stepIndex].id.startsWith('wlp-') ? 'wlp' : 'tsv';
    document.querySelectorAll('[data-family]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.family === growthFamily)));
    const url = new URL(window.location.href);
    if (url.searchParams.get('pattern') !== growthFamily) {
      url.searchParams.set('pattern', growthFamily);
      window.history.replaceState(null, '', url);
    }
  }
  byId('step-progress').value = String(state.progress);
  byId('progress-value').textContent = `${Math.round(state.progress * 100)}%`;
  byId('previous').disabled = local === 0;
  byId('next').disabled = local === stepIndexes.length - 1;
  byId('execute').disabled = state.playing;
  byId('execute').textContent = state.completed ? '重演本步' : state.progress > 0 ? '继续本步' : '执行本步';
  byId('pause').disabled = !state.playing;
  for (const id of ['reset', 'step-select', 'step-progress']) byId(id).disabled = false;
  saveProcessProgress();
}
function changeStep(direction) {
  if (!viewer || mode !== 'process') return;
  const index = stepIndexes.indexOf(viewer.state().stepIndex) + direction;
  if (index < 0 || index >= stepIndexes.length) return;
  saveProcessProgress();
  viewer.selectStep(stepIndexes[index]);
  sync();
}
byId('previous').addEventListener('click', () => changeStep(-1));
byId('next').addEventListener('click', () => changeStep(1));
byId('execute').addEventListener('click', () => { viewer?.playStep(); sync(); });
byId('pause').addEventListener('click', () => { viewer?.pause(); sync(); });
byId('reset').addEventListener('click', () => { if (!viewer || !stepIndexes.length) return; viewer.reset(); viewer.setStructure(selected.view); viewer.selectStep(initialStep()); sync(); });
byId('step-select').addEventListener('change', event => { saveProcessProgress(); viewer?.selectStep(Number(event.target.value)); sync(); });
byId('step-progress').addEventListener('input', event => { viewer?.seekProgress(Number(event.target.value)); sync(); });
byId('retry').addEventListener('click', () => openLesson(mode, selected, true));
document.addEventListener('visibilitychange', () => { if (document.hidden) { viewerCache.forEach(pauseRecord); saveProcessProgress(); } });
window.addEventListener('pagehide', () => { viewerCache.forEach(pauseRecord); saveProcessProgress(); });
function handleTeachingKey(key) {
  if (!viewer || mode !== 'process') return;
  if (key === ' ') { if (viewer.state().playing) viewer.pause(); else viewer.playStep(); }
  else if (key === 'ArrowRight' || key === 'ArrowLeft') changeStep(key === 'ArrowRight' ? 1 : -1);
  else if (key === 'Home' && stepIndexes.length) { saveProcessProgress(); viewer.selectStep(stepIndexes[0]); }
  else if (key === 'End' && stepIndexes.length) { saveProcessProgress(); viewer.selectStep(stepIndexes[stepIndexes.length - 1]); }
  sync();
}
document.addEventListener('keydown', event => {
  if (event.target.matches('button,input,select,textarea,a') || ![' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  handleTeachingKey(event.key);
});
window.addEventListener('message', event => {
  if (event.origin !== window.location.origin || event.source !== frame.contentWindow || event.data?.type !== 'teaching-key') return;
  handleTeachingKey(event.data.key);
});
setInterval(sync, 100);
const initial = new URL(window.location.href).searchParams;
const initialProcess = processes.find(item => item.id === initial.get('process'));
const initialStructure = structures.find(item => item.id === initial.get('structure'));
openLesson(initialProcess ? 'process' : 'structure', initialProcess || initialStructure || structures[0]);
