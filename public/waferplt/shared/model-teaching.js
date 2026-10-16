/* global window, document, location, innerWidth, innerHeight, URLSearchParams, CustomEvent, Option, URL */
/* A small teaching adapter around the preserved, prebuilt model viewers. */
(async () => {
  'use strict';

  const model = window.__teachingModel;
  if (!model || !model.lab) return;
  const lab = model.lab;
  const cameraModuleUrl = new URL('./smooth-camera.js', document.currentScript.src);
  const { installSmoothCamera } = await import(cameraModuleUrl.href);
  installSmoothCamera(lab, { duration: 900 });
  const embedded = new URLSearchParams(location.search).get('teaching') === '1';
  document.documentElement.classList.toggle('teaching-embedded', embedded);

  const style = document.createElement('style');
  style.textContent = `
    .teaching-local-controls{position:absolute;left:3.8vw;bottom:17vh;width:63vw;z-index:45;pointer-events:auto;font:11px/1.6 var(--sans,'Microsoft YaHei',sans-serif);color:#29463b;background:#f3f2eef2;border:1px solid #cdd4cb;border-radius:6px;padding:10px 12px;box-sizing:border-box}
    .teaching-local-controls .teaching-row{display:flex;align-items:center;gap:8px}.teaching-local-controls select{min-width:0;flex:1}.teaching-local-controls button,.teaching-local-controls select{font:inherit;color:#29463b;border:1px solid #c4cec0;border-radius:4px;background:#f7f6f0;padding:6px 9px}.teaching-local-controls button{cursor:pointer}.teaching-local-controls input{width:100%;accent-color:#29463b;margin:8px 0 0}.teaching-local-controls output{white-space:nowrap;font-variant-numeric:tabular-nums}.teaching-local-controls p{margin:4px 0 0;color:#677465;font-size:10px}.module-timeline{display:none!important}
    .teaching-embedded .lab-side,.teaching-embedded .lab-prompt,.teaching-embedded .module-toolbar,.teaching-embedded .module-note,.teaching-embedded .module-links,.teaching-embedded .lab-how,.teaching-embedded .scene-info,.teaching-embedded .stage-strip,.teaching-embedded .demo-links,.teaching-embedded .demo-note,.teaching-embedded .teaching-local-controls{display:none!important}
    .teaching-embedded .lab-modes{left:14px;bottom:12px;max-width:calc(100vw - 28px);gap:6px;z-index:45}.teaching-embedded .lab-modes button{font-size:11px;padding:7px 10px}.teaching-embedded .lab-modes [data-k=run],.teaching-embedded .lab-modes [data-k=slow],.teaching-embedded .lab-modes [data-k=break]{display:none!important}
    .teaching-embedded .demo-toolbar,.teaching-embedded .view-switch{display:none!important}
    .teaching-embedded .feature-host{left:2%;width:96%;top:12px;bottom:64px;max-height:none}.teaching-embedded .feature-host:before,.teaching-embedded .feature-host:after{display:none}.teaching-embedded .feature-host .pv-svg{max-height:44vh;height:350px}.teaching-embedded .lab-lab{max-width:145px}.teaching-embedded .lab-lab small{font-size:9px}
    .teaching-module-overview .lab-labels{display:block!important}.lab-lab[data-module-locator]{max-width:min(180px,calc(100vw - 32px));white-space:normal;box-sizing:border-box;padding:6px 8px;background:#f8f8f1f2;border:1px solid #cdd7c8;border-radius:4px;color:#29463b;text-shadow:none}
    @media(max-width:700px){.teaching-local-controls{left:4vw;width:92vw;bottom:16vh;padding:8px}.teaching-local-controls .teaching-row{gap:4px}.teaching-local-controls button,.teaching-local-controls select{font-size:9px;padding:5px}.teaching-local-controls p{font-size:9px}.teaching-embedded .feature-host{top:12px;bottom:64px}.teaching-embedded .feature-host .pv-svg{max-height:none;height:240px}.teaching-embedded .lab-modes{bottom:10px;left:10px}}
  `;
  document.head.appendChild(style);

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
  const stages = model.stages.map((stage) => ({
    ...stage,
    title: stage.title || stage.label,
    detail: stage.detail || stage.text || '',
  }));
  let stepIndex = 0;
  let progress = 0;
  const originalToggle = lab.toggle.bind(lab);
  const originalSetView = lab.setView.bind(lab);
  const originalTicker = lab.tickers[lab.tickers.length - 1];

  let syncModuleLabels = () => {};
  let moduleLabelsManuallyHidden = false;
  if (model.kind === 'module' && lab.labels.length) {
    const internalLabels = [...lab.labels];
    let moduleGroup = internalLabels[0].obj;
    while (moduleGroup.parent && moduleGroup.parent !== lab.machine) moduleGroup = moduleGroup.parent;
    const anchor = internalLabels[0].at.clone().set(...(model.viewPresets?.overview?.target || lab.o.view.target || [0, 0.7, 0]));
    lab.machine.updateWorldMatrix(true, true);
    moduleGroup.worldToLocal(lab.machine.localToWorld(anchor));
    const locator = lab.label(moduleGroup, lab.o.title, { at: anchor.toArray(), side: 'right' });
    locator.el.dataset.moduleLocator = model.module;
    locator.el.hidden = true;
    lab.labels = internalLabels;
    const originalUpdateLabels = lab._updateLabels.bind(lab);
    let labelView;
    syncModuleLabels = (force = false) => {
      if (force) moduleLabelsManuallyHidden = false;
      const current = model.currentView?.() || 'overview';
      if (!force && current === labelView) return;
      labelView = current;
      const overview = current === 'overview';
      document.documentElement.classList.toggle('teaching-module-overview', overview);
      internalLabels.forEach(label => { label.el.hidden = overview; label.el.style.opacity = '0'; });
      locator.el.hidden = !overview;
      locator.el.style.opacity = '0';
      lab.labels = overview ? [locator] : internalLabels;
      lab.$('.lab-labels svg').innerHTML = '';
      if (overview || current === 'section') lab.target.labels = 1;
      lab._syncButtons();
    };
    // The preserved module renderer closes over its internal labels. Keep it for
    // section views, and draw the overview locator within the current viewport.
    lab._updateLabels = () => {
      syncModuleLabels();
      if (labelView !== 'overview') return originalUpdateLabels();
      const svg = lab.$('.lab-labels svg');
      const opacity = lab.state.labels;
      locator.obj.updateWorldMatrix(true, false);
      const projected = locator.at.clone().applyMatrix4(locator.obj.matrixWorld).project(lab.camera);
      if (opacity < 0.01 || projected.z < -1 || projected.z > 1 || !locator.obj.visible) {
        locator.el.style.opacity = '0';
        svg.innerHTML = '';
        return;
      }
      const x = (projected.x * 0.5 + 0.5) * innerWidth;
      const y = (-projected.y * 0.5 + 0.5) * innerHeight;
      locator.el.className = 'lab-lab';
      const bounds = locator.el.getBoundingClientRect();
      const left = clamp(x + 36, 16, Math.max(16, innerWidth - bounds.width - 16));
      const top = clamp(y - 32, 16 + bounds.height / 2, Math.max(16 + bounds.height / 2, innerHeight - 64 - bounds.height / 2));
      locator.el.style.left = `${left}px`;
      locator.el.style.top = `${top}px`;
      locator.el.style.opacity = String(opacity);
      svg.innerHTML = `<path d="M${x},${y} L${left - 12},${top} L${left - 4},${top}" stroke="rgba(36,61,44,${opacity * 0.5})" fill="none"/><circle cx="${x}" cy="${y}" r="3" fill="#29463b" stroke="#fff"/>`;
    };
  }

  // Old camera presets reserved space for a second sidebar. The parent now owns it.
  lab.setView = (view) => {
    if (!embedded) return originalSetView(view);
    // Respect explicit nearby / joint presets from controllers sharing this Lab.
    const preset = {
      az: 35, el: 14, dist: 2.2, target: [0, 0, 0], fov: 30,
      ...lab.o.view,
      ...(view || model.viewPresets?.[model.currentView?.()]),
    };
    const portraitSpace = Math.max(1, 0.75 / (innerWidth / innerHeight));
    return originalSetView({ ...preset, dist: preset.dist * portraitSpace, frameX: 0 });
  };
  const originalRender = lab.render.bind(lab);
  lab.render = (delta) => {
    lab._assembly = 0;
    return originalRender(delta);
  };

  function pause() {
    originalToggle('run', true);
    return state();
  }

  function moduleWaferStatus() {
    if (model.kind !== 'module' || !['apt', 'plt', 'srd'].includes(model.module)) return null;
    const metrics = model.metrics();
    const rendered = window.__qa?.model?.state?.() || {};
    const moduleId = model.module;
    const phase = metrics.stageId;
    const stageCompleted = (stageId) => {
      const index = stages.findIndex(stage => stage.id === stageId);
      // draw() deliberately samples just before a stage end. Use exact manual
      // completion only when the model actually reached that unblocked stage.
      return index >= 0 && (metrics.stageIndex > index || (
        metrics.stageIndex === index && stepIndex === index && progress >= 1 && !metrics.blocked
      ));
    };
    const wet = moduleId === 'plt' || (moduleId === 'apt' ? stageCompleted('wet') : !stageCompleted('dry'));
    let conditionLabel = wet ? '湿片' : '干片';
    if (moduleId === 'apt' && phase === 'wet' && !wet && !metrics.blocked) conditionLabel = '预湿中（尚未完成）';
    if (moduleId === 'srd' && phase === 'dry' && wet && !metrics.blocked) conditionLabel = '湿片（甩干中）';

    // These are the independent module's own visible handoff fixtures. They
    // are not the complete platform's A/B forks or an inferred remote station.
    const fork = { id: `${moduleId}-transfer-fork`, label: `${moduleId.toUpperCase()} 交接托叉` };
    const holder = moduleId === 'plt'
      ? { id: 'plt-head', label: 'PLT 杯／锥夹持头' }
      : { id: `${moduleId}-support`, label: `${moduleId.toUpperCase()} 旋转承托台` };
    const handoff = phase === 'load' || phase === 'unload';
    const lifted = moduleId === 'plt'
      ? Number(rendered.waferExtraLiftM) > 1e-8
      : Number(rendered.lift ?? metrics.waferLiftM) > 1e-8;
    const transferred = Number(rendered.waferTransferZM ?? rendered.transferZ) > 1e-8;
    const support = handoff && (lifted || transferred) ? fork : holder;
    const source = !handoff ? null : phase === 'load' ? fork : holder;
    const target = !handoff ? null : phase === 'load' ? holder : fork;
    return {
      condition: wet ? 'wet' : 'dry',
      conditionLabel,
      supportId: support.id,
      supportLabel: support.label,
      sourceId: source?.id || null,
      sourceLabel: source?.label || null,
      targetId: target?.id || null,
      targetLabel: target?.label || null,
      phase: metrics.blocked ? '教学互锁阻止推进，保持当前承托' : `${stages[metrics.stageIndex]?.title || '工艺处理'}${stepIndex === metrics.stageIndex && progress >= 1 ? ' · 已完成' : ''}`,
    };
  }

  function state() {
    const step = stages[stepIndex];
    return {
      title: step.title,
      detail: step.detail,
      stepIndex,
      stepCount: stages.length,
      progress,
      playing: !lab.paused,
      completed: progress >= 1,
      time: step.start + (step.end - step.start) * progress,
      waferStatus: moduleWaferStatus(),
    };
  }

  let controls;
  function syncControls() {
    if (!controls) return;
    const value = state();
    controls.querySelector('select').value = String(stepIndex);
    controls.querySelector('input').value = String(Math.round(progress * 1000));
    controls.querySelector('output').textContent = `${stepIndex + 1} / ${stages.length} · ${Math.round(progress * 100)}%`;
    controls.querySelector('p').textContent = value.detail;
    controls.querySelector('[data-teach=play]').textContent = value.playing ? '暂停' : value.completed ? '重播本步' : '执行本步';
    controls.querySelector('[data-teach=prev]').disabled = stepIndex === 0;
    controls.querySelector('[data-teach=next]').disabled = stepIndex === stages.length - 1;
  }

  function draw() {
    const step = stages[stepIndex];
    // Keep the model on this side of the boundary, including when the slider is 100%.
    // The teaching state records exact completion; the old model's stage lookup uses < end.
    const time = step.start + (step.end - step.start) * progress;
    const sampleTime = Math.min(time, step.end - 1e-7);
    if (model.kind === 'machine') {
      model.applyStep(stepIndex, progress);
      originalTicker(0, lab, 0);
    } else {
      model.seek(sampleTime);
      if (model.metrics?.().blocked) pause();
    }
    syncControls();
  }

  function selectStep(index) {
    pause();
    stepIndex = Math.trunc(clamp(index, 0, stages.length - 1));
    progress = 0;
    model.configureStep?.(stepIndex);
    draw();
    return state();
  }

  function playStep() {
    if (progress >= 1) progress = 0;
    originalToggle('run', false);
    draw();
    return state();
  }

  function seekProgress(value) {
    pause();
    progress = clamp(value);
    draw();
    return state();
  }

  function seekTime(time) {
    const target = clamp(time, stages[0].start, stages[stages.length - 1].end);
    const index = stages.findIndex((stage) => target < stage.end);
    selectStep(index < 0 ? stages.length - 1 : index);
    return seekProgress((target - stages[stepIndex].start) / (stages[stepIndex].end - stages[stepIndex].start));
  }

  function setStructure(viewId) {
    pause();
    model.setView(viewId === 'platform' ? 'overview' : viewId);
    syncModuleLabels(true);
    draw();
    return state();
  }

  function reset() {
    pause();
    model.reset();
    return selectStep(0);
  }

  const viewer = {
    steps: stages.map(({ id, title, detail }) => ({ id, title, detail })),
    state,
    selectStep,
    playStep,
    pause,
    seekProgress,
    setStructure,
    reset,
    seekTime,
  };
  window.teachingViewer = viewer;

  // Let Lab's existing run button and keyboard share the same one-step boundary.
  lab.toggle = (key, value) => {
    if (key === 'run') return (value ?? !lab.paused) ? pause() : playStep();
    if (key === 'labels' && model.kind === 'module' && ['overview', 'section'].includes(model.currentView?.())) {
      // Buttons/keys omit value; legacy view/resize passes its boolean default.
      // Keep the user's choice until another module view is explicitly selected.
      if (value === undefined) moduleLabelsManuallyHidden = lab.target.labels >= 0.5;
      else value = !moduleLabelsManuallyHidden;
    }
    pause();
    return originalToggle(key, value);
  };
  lab.tickers[lab.tickers.length - 1] = (delta) => {
    if (!lab.paused && !document.hidden) {
      const step = stages[stepIndex];
      progress = clamp(progress + Math.max(0, delta) / (step.end - step.start));
      if (progress >= 1) pause();
    }
    draw();
  };

  // Direct links remain useful for inspection, with all navigation and scrubbing paused.
  window.__qa.seek = seekTime;
  window.__qa.reset = reset;
  window.__qa.setView = setStructure;
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.view) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const viewId = button.dataset.view;
      if (viewId !== 'tour') setStructure(viewId);
    } else if (button.hasAttribute('data-reset')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      reset();
    } else if (embedded && model.kind === 'machine' && button.dataset.pattern) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const targetId = button.dataset.pattern === 'rdl' ? 'wlp-rdl' : 'wlp-pillar';
      const targetIndex = stages.findIndex(stage => stage.id === targetId);
      if (targetIndex >= 0) {
        const previousProgress = progress;
        selectStep(targetIndex);
        seekProgress(previousProgress);
      }
    } else if (button.dataset.process || button.dataset.pattern) {
      pause();
    }
  }, true);
  document.querySelector('[data-view=tour]')?.remove();
  document.addEventListener('keydown', (event) => {
    if (!embedded && /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
    if (![' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (embedded) {
      // The parent owns structure/process mode and any filtered step sequence.
      window.parent.postMessage({ type: 'teaching-key', key: event.key }, location.origin);
      return;
    }
    if (event.key === ' ') {
      if (lab.paused) playStep();
      else pause();
    }
    else if (event.key === 'ArrowLeft') selectStep(stepIndex - 1);
    else if (event.key === 'ArrowRight') selectStep(stepIndex + 1);
    else if (event.key === 'Home') selectStep(0);
    else if (event.key === 'End') selectStep(stages.length - 1);
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  if (!embedded) {
    controls = document.createElement('section');
    controls.className = 'teaching-local-controls';
    controls.setAttribute('aria-label', '手动教学控制');
    controls.innerHTML = `<div class="teaching-row"><button type="button" data-teach="prev">上一步</button><select aria-label="选择教学步骤"></select><button type="button" data-teach="play">执行本步</button><button type="button" data-teach="next">下一步</button><output></output></div><input type="range" min="0" max="1000" value="0" aria-label="当前步骤进度"><p></p>`;
    stages.forEach((stage, index) => controls.querySelector('select').add(new Option(`${String(index + 1).padStart(2, '0')} ${stage.title}`, String(index))));
    controls.querySelector('select').addEventListener('change', (event) => selectStep(Number(event.target.value)));
    controls.querySelector('input').addEventListener('input', (event) => seekProgress(Number(event.target.value) / 1000));
    controls.addEventListener('click', (event) => {
      const action = event.target.closest('[data-teach]')?.dataset.teach;
      if (action === 'prev') selectStep(stepIndex - 1);
      else if (action === 'next') selectStep(stepIndex + 1);
      else if (action === 'play') {
        if (lab.paused) playStep();
        else pause();
      }
    });
    lab.ui.appendChild(controls);
  }

  pause();
  model.setView('overview');
  syncModuleLabels(true);
  selectStep(0);
  window.dispatchEvent(new CustomEvent('teaching-viewer-ready'));
  if (window.parent !== window) window.parent.postMessage({ type: 'teaching-viewer-ready', kind: model.kind }, location.origin);
})();
