/* global window, document, performance, CustomEvent */
/* Drive the overview's actual rigs and unique wafer; this file builds no geometry. */
(() => {
  'use strict';
  function initialize() {
    if (window.platformHandling) return;
    const model = window.__teachingModel;
    if (!model?.platform?.handling || !window.teachingViewer) return;
    const { lab, THREE, platform } = model;
    const { stations, robots, wafer, cells, route } = platform.handling;
    const group = platform.group;
    const namedParts = new Map(lab.parts.map(part => [part.obj, part.name]));
    group.traverse(object => { if (!object.name && namedParts.has(object)) object.name = namedParts.get(object); });
    const copy = value => JSON.parse(JSON.stringify(value));
    const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
    const ease = value => value * value * value * (value * (value * 6 - 15) + 10);
    const mix = (a, b, p) => a.map((value, i) => value + (b[i] - value) * p);
    const plus = (a, b) => a.map((value, i) => value + b[i]);
    const minus = (a, b) => a.map((value, i) => value - b[i]);
    const vec = value => new THREE.Vector3(...value);
    const scenePoint = object => group.worldToLocal(object.getWorldPosition(new THREE.Vector3())).toArray();
    const safeY = 1.36;
    const bridge = [0, safeY, 1.24];
    const incomingOffset = [-0.05, 0, -0.04];
    const outgoingOffset = [0.05, 0, 0.04];

    // Match the existing visible support surfaces, rather than hovering over them.
    for (const station of Object.values(stations)) {
      const y = station.kind === 'foup' ? 1.2205 : station.kind === 'cell' ? 1.2235 : 1.2035;
      station.socket.position.y = y;
      station.pos[1] = y;
    }
    group.updateWorldMatrix(true, true);
    const point = id => [...stations[id].pos];

    // Assign roles to the actual overview end effectors. Geometry and UUIDs stay intact.
    function colorFork(arm, role) {
      arm.end.traverse(object => {
        if (!object.isMesh || !/片叉$/.test(object.name)) return;
        object.material = object.material.clone();
        object.material.color.setHex(role === 'wet' ? 0xc17b36 : 0x286f8c);
        object.name = object.name.replace(/(?:干|湿)片叉$/, role === 'wet' ? '湿片叉' : '干片叉');
        object.userData.handlingRole = role;
      });
    }
    colorFork(robots.front.a, 'dry');
    colorFork(robots.rear.a, 'wet');
    colorFork(robots.rear.b, 'dry');

    let planState = {
      frontTip: [0, safeY, 1.95], frontYaw: 0,
      rearTip: [0.14, safeY, 0.98], rearYaw: Math.PI, rearArm: 'b', rearRailZ: 0.98,
      owner: 'foup1', gripOffset: [0, 0, 0], condition: 'dry', waferYaw: 0,
      headY: 1.42,
    };
    const stages = [];
    let clock = 0;
    function add(id, title, detail, duration, changes = {}) {
      const startState = copy(planState);
      planState = { ...copy(planState), ...copy(changes) };
      stages.push({ id, title, detail, start: clock, end: clock + duration, duration, startState, endState: copy(planState) });
      clock += duration;
    }
    function front(id, title, target, detail = '前端蓝色干片叉沿真实横向导轨与关节运动。', extra = {}) {
      add(id, title, detail, 1.4, { frontTip: target, ...extra });
    }
    function rear(id, title, target, detail = '中央机械手沿两排工位之间的真实纵向导轨移动。', extra = {}) {
      add(id, title, detail, 1.5, { rearTip: target, rearRailZ: clamp(target[2], -1.92, 0.98), ...extra });
    }
    function transfer(id, title, owner, offset = [0, 0, 0]) {
      add(id, title, '承接面保持接触，动作中点改变唯一晶圆归属；接收完成前不撤离原支撑。', 0.9, { owner, gripOffset: offset });
    }
    const foupNear = id => plus(point(id), [0, 0, -0.42]);
    const elevated = p => [p[0], safeY, p[2]];

    add('ready', '原位与干湿末端确认', '同一台整机：前端横向干片机械手；中央纵向双末端，蓝色 B 为干片、琥珀色 A 为湿片。唯一晶圆在 FOUP 1。', 1);
    front('front-load-approach', '空叉对准 FOUP 1 槽位', foupNear('foup1'));
    front('front-load-insert', '空叉水平伸入 FOUP 1', point('foup1'), '保持当前槽位高度，空叉从 FOUP 开口水平伸入，晶圆仍由槽位支撑。');
    transfer('front-load-take', '前端干片叉承接晶圆', 'front');
    front('front-load-retract', '同高度退出 FOUP 开口', foupNear('foup1'), '先沿槽位水平退出，晶圆完全离开 FOUP 后才允许抬升。');
    front('front-load-lift', '离盒后抬升至转运高度', elevated(foupNear('foup1')));
    front('front-load-to-align', '送至真实定向工位上方', elevated(point('align')));
    front('front-load-lower-align', '落到定向工位支撑面', point('align'));
    transfer('front-load-place-align', '定向台接收干片', 'align');
    front('front-load-clear-align', '空叉退出定向工位', plus(point('align'), [0.36, 0, 0]));
    add('align', '晶圆缺口定向', '晶圆在整机前侧左边的“对准 / 交接”工位旋转定向，前端叉已经退出。', 2, { waferYaw: -Math.PI / 2 });

    front('front-handoff-insert-align', '重新伸入定向台取片', point('align'));
    transfer('front-handoff-take-align', '前端叉重新持有干片', 'front');
    front('front-handoff-lift-align', '抬离定向支撑面', elevated(point('align')));
    front('front-handoff-position', '前端送到两臂可达交接区', bridge, '交接区位于前端横轨与中央纵轨之间；晶圆始终由前端真实叉承托，并非新增悬空工位。');
    rear('front-handoff-rear-approach', '后端蓝色 B 叉低位接近', plus(bridge, [0.05, -0.035, 0.04]), 'B 干片叉反向接近，X 偏置 50 mm、Z 偏置 40 mm，让现有叉的长指和根部横梁互相错开。', { rearArm: 'b', rearYaw: Math.PI });
    rear('front-handoff-rear-contact', '后端 B 叉升到同一支撑面', plus(bridge, [0.05, 0, 0.04]));
    transfer('front-handoff-transfer', '前端向后端 B 叉交接', 'rear-b', incomingOffset);
    front('front-handoff-front-clear', '前端空叉降低并退出', plus(bridge, [0, -0.035, 0.32]));

    rear('rear-load-clear-front', 'B 干片叉抬离前端交接区', plus(bridge, [0.05, 0.06, 0.04]));
    rear('rear-load-center', '收回中央安全通道', [0.14, safeY, 1.02]);
    rear('rear-load-extend-apt', 'B 叉送往左前 APT 上方', minus(elevated(point('prewet')), incomingOffset));
    rear('rear-load-lower-apt', '将干片放到 APT 支撑面', minus(point('prewet'), incomingOffset));
    transfer('rear-load-place-apt', 'APT 工位接收干片', 'prewet');
    rear('rear-load-empty-retract', 'B 空叉退出 APT', [-0.14, point('prewet')[1], 1.02]);
    add('prewet', 'APT 预处理与预湿', '晶圆由真实 APT 工位支撑；预湿完成时标记为湿片，之后只允许琥珀色 A 湿片叉接触。', 3, { condition: 'wet' });

    rear('rear-wet-apt-plt-select', '切换琥珀色 A 湿片叉', [-0.14, point('prewet')[1], 0.98], 'B 干片叉退出；A 湿片叉进入 APT 出片路径。', { rearArm: 'a', rearYaw: 0 });
    rear('rear-wet-apt-plt-insert', 'A 湿片叉伸入 APT', point('prewet'));
    transfer('rear-wet-apt-plt-take', 'A 叉接收预湿晶圆', 'rear-a');
    rear('rear-wet-apt-plt-lift', '湿片抬离 APT', elevated(point('prewet')));
    rear('rear-wet-apt-plt-retract', '湿片收至中央通道', [-0.14, safeY, 0.98]);
    rear('rear-wet-apt-plt-travel', '沿纵轨到左排 L3', [-0.14, safeY, point('L3')[2]], '使用整机总览左排第三只真实电镀杯 L3，不替换成横排工位。');
    rear('rear-wet-apt-plt-extend', 'A 叉进入 L3 抬头下方', elevated(point('L3')));
    rear('rear-wet-apt-plt-lower', '湿片落到 L3 工位', point('L3'));
    transfer('rear-wet-apt-plt-place', 'L3 电镀工位接收湿片', 'L3');
    rear('rear-wet-apt-plt-clear', 'A 空叉退出夹持区域', [-0.14, point('L3')[1], point('L3')[2]]);
    add('plate', 'L3 夹持与铜电镀', '实际 L3 夹持头下移，晶圆保持湿片并由 L3 工位支撑；完整杯内工序可在 PLT 教学中逐步观察。', 3, { headY: 1.295 });

    add('rear-wet-plt-srd-open', 'L3 夹持头抬起', '释放实际 L3 工位夹持头，保持晶圆仍由 L3 支撑。', 1.2, { headY: 1.42 });
    rear('rear-wet-plt-srd-insert', 'A 湿片叉伸入 L3', point('L3'));
    transfer('rear-wet-plt-srd-take', 'A 叉承接镀后湿片', 'rear-a');
    rear('rear-wet-plt-srd-lift', '抬起镀后晶圆', elevated(point('L3')));
    rear('rear-wet-plt-srd-retract', '收回左侧中央通道', [-0.14, safeY, point('L3')[2]]);
    rear('rear-wet-plt-srd-pivot', '在中央通道转向右侧', [0.14, safeY, point('L3')[2] + 0.2], '沿可达弧侧绕开零半径奇点，不改变真实臂长。', { rearRailZ: point('L3')[2] });
    rear('rear-wet-plt-srd-travel', '沿纵轨返回右前 SRD', [0.14, safeY, point('rinse')[2]]);
    rear('rear-wet-plt-srd-extend', 'A 叉送入真实 SRD 上方', elevated(point('rinse')));
    rear('rear-wet-plt-srd-lower', '湿片落到 SRD 承托', point('rinse'));
    transfer('rear-wet-plt-srd-place', 'SRD 工位接收湿片', 'rinse');
    rear('rear-wet-plt-srd-clear', 'A 空叉退出 SRD', [0.14, point('rinse')[1], point('rinse')[2]]);
    add('rinse-dry', 'SRD 漂洗与旋转干燥', '干燥动作结束前保持湿片状态；达到本步 100% 后才允许 B 干片叉取走。', 3, { condition: 'dry', waferYaw: -Math.PI / 2 + Math.PI * 4 });

    rear('rear-unload-select', '切换蓝色 B 干片叉', [0.14, point('rinse')[1], point('rinse')[2]], 'SRD 已干燥完成；此后使用 B 干片叉，A 湿片叉退出。', { rearArm: 'b', rearYaw: Math.PI });
    rear('rear-unload-insert', 'B 干片叉进入 SRD', point('rinse'));
    transfer('rear-unload-take', 'B 叉接收干燥晶圆', 'rear-b');
    rear('rear-unload-lift', '干片抬离 SRD', elevated(point('rinse')));
    rear('rear-unload-retract', '干片收至中央通道', [0.14, safeY, point('rinse')[2]]);
    rear('rear-unload-to-front', 'B 叉送到前端交接区', bridge);
    front('rear-unload-front-approach', '前端干片叉低位接近', plus(bridge, [-0.05, -0.035, -0.04]));
    front('rear-unload-front-contact', '前端叉接触同一干片', plus(bridge, [-0.05, 0, -0.04]), '前端叉与 B 叉反向错指，确认支撑后再切换唯一归属。');
    transfer('rear-unload-transfer', '后端 B 叉向前端交接', 'front', outgoingOffset);
    rear('rear-unload-rear-clear', 'B 空叉降低并退出', plus(bridge, [0, -0.035, -0.2]));

    front('front-return-lift', '前端持干片抬离交接区', minus(plus(bridge, [0, 0.06, 0]), outgoingOffset));
    front('front-return-position', '移到 FOUP 3 开口外', minus(elevated(foupNear('foup3')), outgoingOffset));
    front('front-return-slot-height', '开口外降到目标槽位', minus(foupNear('foup3'), outgoingOffset));
    front('front-return-insert', '同高度水平送回 FOUP 3', minus(point('foup3'), outgoingOffset));
    transfer('front-return-place', 'FOUP 3 槽位接收干片', 'foup3');
    front('front-return-clear', '空叉同高度退出 FOUP', minus(foupNear('foup3'), outgoingOffset));
    add('complete', '本片回盒完成', '唯一晶圆位于 FOUP 3 干片槽；前后机械手保持静止，等待下一次手动教学。', 1);

    // This is the actual plan's route, separate from presentation text. In
    // particular the plating target is the physical L3 socket, never row L2.
    const routePlan = [
      { first: 'ready', last: 'front-load-clear-align', source: 'foup1', target: 'align', actors: ['front'] },
      { first: 'align', last: 'align', source: 'align', target: 'align', actors: [] },
      { first: 'front-handoff-insert-align', last: 'front-handoff-front-clear', source: 'align', target: 'rear-b', actors: ['front', 'rear-b'] },
      { first: 'rear-load-clear-front', last: 'rear-load-empty-retract', source: 'front', target: 'prewet', actors: ['rear-b'] },
      { first: 'prewet', last: 'prewet', source: 'prewet', target: 'prewet', actors: [] },
      { first: 'rear-wet-apt-plt-select', last: 'rear-wet-apt-plt-clear', source: 'prewet', target: 'L3', actors: ['rear-a'] },
      { first: 'plate', last: 'plate', source: 'L3', target: 'L3', actors: [] },
      { first: 'rear-wet-plt-srd-open', last: 'rear-wet-plt-srd-clear', source: 'L3', target: 'rinse', actors: ['rear-a'] },
      { first: 'rinse-dry', last: 'rinse-dry', source: 'rinse', target: 'rinse', actors: [] },
      { first: 'rear-unload-select', last: 'rear-unload-rear-clear', source: 'rinse', target: 'front', actors: ['rear-b', 'front'] },
      { first: 'front-return-lift', last: 'front-return-clear', source: 'front', target: 'foup3', actors: ['front'] },
      { first: 'complete', last: 'complete', source: 'foup3', target: 'foup3', actors: [] },
    ];
    for (const segment of routePlan) {
      const first = stages.findIndex(stage => stage.id === segment.first);
      const last = stages.findIndex(stage => stage.id === segment.last);
      for (let at = first; at <= last; at++) stages[at].route = segment;
    }
    const supportLabels = {
      foup1: 'FOUP 1 槽位', foup2: 'FOUP 2 槽位', foup3: 'FOUP 3 槽位',
      align: '晶圆定向台', front: '前手臂干片叉', 'rear-a': '后手臂 A 湿片叉', 'rear-b': '后手臂 B 干片叉',
      prewet: 'APT 预湿工位', L3: 'PLT 左排 L3 工位', rinse: 'SRD 清洗甩干工位',
    };

    let active = false;
    let playing = false;
    let index = 0;
    let progress = 0;
    let viewId = 'all';
    let teachingMode = 'structure';
    let labelsManuallyHidden = false;
    let lastNow = performance.now();
    let currentMetrics = {};
    const baseView = model.currentView;
    const basePresets = { ...model.viewPresets };
    const originalToggle = lab.toggle;
    const originalLabels = [...lab.labels];
    const baseTickerIndex = lab.tickers.length - 1;
    const baseTicker = lab.tickers[baseTickerIndex];
    const views = {
      all: { ...platform.views.whole, target: [0, 0.82, 0.16], frameX: 0 },
      overview: { ...platform.views.whole, target: [0, 0.82, 0.16], frameX: 0 },
      front: { ...platform.views.front, target: [0, 1.15, 1.9], frameX: 0 },
      foup: { ...platform.views.front, target: [0, 1.2, 2.35], dist: platform.views.front.dist * 0.92, frameX: 0 },
      rear: { ...platform.views.transfer, target: [0, 1.15, -0.48], frameX: 0 },
      joint: { ...platform.views.front, target: [0, 1.35, 1.24], dist: platform.views.front.dist * 0.7, frameX: 0 },
    };
    const labelDefinitions = [
      { id: 'foup1', scope: 'foup', obj: stations.foup1.socket, title: 'FOUP 1', detail: '前端载片盒 · 装片', side: 'left', at: [0, 0.16, 0] },
      { id: 'foup2', scope: 'foup', obj: stations.foup2.socket, title: 'FOUP 2', detail: '前端载片盒', side: 'right', at: [0, 0.16, 0] },
      { id: 'foup3', scope: 'foup', obj: stations.foup3.socket, title: 'FOUP 3', detail: '前端载片盒 · 回盒', side: 'right', at: [0, 0.16, 0] },
      { id: 'align', scope: 'foup', obj: stations.align.socket, title: '晶圆定向台', detail: '缺口定向 / 干片交接', side: 'left', at: [0, 0.05, 0] },
      { id: 'front', scope: 'front', obj: robots.front.a.end, title: '前手臂 · 干片', detail: '横向导轨 / 蓝色干片叉', side: 'left', at: [0, 0.047, 0] },
      { id: 'rear', scope: 'rear', obj: robots.rear.rig, title: '后手臂 · 双末端', detail: 'A 琥珀湿片叉 / B 蓝色干片叉', side: 'right', at: [0, 0.18, 0] },
      { id: 'apt', scope: 'apt', obj: stations.prewet.socket, title: 'APT 预湿模块', detail: '左前工位 · 预处理 / 预湿', side: 'left', at: [0, 0.06, 0] },
      { id: 'plt-left', scope: 'plt', obj: stations.L2.socket, title: 'PLT 电镀腔 · 左排', detail: 'L1 / L2 / L3 / L4', side: 'left', at: [0, 0.2, 0] },
      { id: 'plt-right', scope: 'plt', obj: stations.R2.socket, title: 'PLT 电镀腔 · 右排', detail: 'R1 / R2 / R3 / R4', side: 'right', at: [0, 0.2, 0] },
      { id: 'srd', scope: 'srd', obj: stations.rinse.socket, title: 'SRD 清洗甩干', detail: '右前工位 · 漂洗 / 干燥', side: 'right', at: [0, 0.06, 0] },
    ];
    const processDefinitions = [
      { id: 'foup1', obj: stations.foup1.socket, title: 'FOUP 1 · 装片', side: 'left', at: [0, 0.16, 0] },
      { id: 'foup3', obj: stations.foup3.socket, title: 'FOUP 3 · 回盒', side: 'right', at: [0, 0.16, 0] },
      { id: 'align', obj: stations.align.socket, title: '晶圆定向台', side: 'left', at: [0, 0.05, 0] },
      { id: 'front', obj: robots.front.a.end, title: '前手臂 · 干片叉', side: 'left', at: [0, 0.047, 0] },
      { id: 'rear-a', obj: robots.rear.a.end, title: '后手臂 A · 湿片叉', side: 'right', at: [0, 0.047, 0] },
      { id: 'rear-b', obj: robots.rear.b.end, title: '后手臂 B · 干片叉', side: 'right', at: [0, 0.047, 0] },
      { id: 'prewet', obj: stations.prewet.socket, title: 'APT · 预湿工位', side: 'left', at: [0, 0.06, 0] },
      { id: 'L3', obj: stations.L3.socket, title: 'PLT · 左排 L3', side: 'left', at: [0, 0.15, 0] },
      { id: 'rinse', obj: stations.rinse.socket, title: 'SRD · 清洗甩干', side: 'right', at: [0, 0.06, 0] },
    ];
    function makeLabel(definition, process = false) {
      const label = lab.label(definition.obj, definition.title, { at: definition.at, side: definition.side, value: () => definition.detail });
      label.scope = definition.scope;
      label.participantId = definition.id;
      label.el.dataset.platformLabel = process ? `process-${definition.id}` : definition.id;
      label.el.dataset.platformLabelMode = process ? 'process' : 'structure';
      return label;
    }
    const teachingLabels = labelDefinitions.map(definition => makeLabel(definition));
    const processLabels = processDefinitions.map(definition => makeLabel(definition, true));
    const allLabels = [...teachingLabels, ...processLabels];
    lab.labels = originalLabels;
    allLabels.forEach(label => { label.el.hidden = true; });
    const style = document.createElement('style');
    style.textContent = `
      .platform-handling-active .lab-labels{display:block!important}
      .platform-handling-active [data-platform-label]{box-sizing:border-box;transform:none!important;white-space:normal;max-width:none;font-size:11px;line-height:1.45;padding:6px 8px;border:1px solid #cdd7c8;background:#f8f8f1f2;color:#29463b;box-shadow:0 2px 7px #29463b0b}
      .platform-handling-active [data-platform-label] small{display:block;font-size:9px;line-height:1.5;color:#687d65;margin-top:2px;white-space:normal}
      .platform-handling-active [data-platform-label-mode=process]{border-color:#9bbaa7;box-shadow:0 2px 8px #29463b1a}
      .platform-handling-active [data-platform-label-role=support]{border-color:#3d7861;background:#edf5ecf5}
      [data-platform-label][hidden]{display:none!important}
      @media(max-width:500px){.platform-handling-active [data-platform-label]{font-size:9px;padding:4px 5px}.platform-handling-active [data-platform-label] small{font-size:8px}.platform-handling-active[data-platform-label-view=all] [data-platform-label] small{display:none}}
    `;
    document.head.appendChild(style);

    let labelSelectionKey = '';
    let highlightedObjects = [];
    const highlightMaterials = new WeakMap();
    function clearHighlights() {
      for (const object of highlightedObjects) object.material = highlightMaterials.get(object).original;
      highlightedObjects = [];
    }
    function highlightParticipants(ids) {
      clearHighlights();
      if (teachingMode !== 'process') return;
      const objects = new Set();
      const prefixes = { foup1: 'FOUP 1 ', foup3: 'FOUP 3 ', align: '对准 / 交接 ', prewet: 'APT 预湿 ', L3: 'L3 ', rinse: 'SRD 漂洗干燥 ' };
      for (const id of ids) {
        const arm = id === 'front' ? robots.front.a : id === 'rear-a' ? robots.rear.a : id === 'rear-b' ? robots.rear.b : null;
        if (arm) arm.end.traverse(object => { if (object.isMesh && object.userData.handlingRole) objects.add(object); });
        else group.traverse(object => { if (object.isMesh && prefixes[id] && object.name.startsWith(prefixes[id])) objects.add(object); });
      }
      for (const object of objects) {
        let material = highlightMaterials.get(object);
        if (!material) {
          const originals = Array.isArray(object.material) ? object.material : [object.material];
          const highlighted = originals.map(original => {
            const clone = original.clone();
            if (clone.emissive) { clone.emissive.setHex(0x426747); clone.emissiveIntensity = 0.18; }
            return clone;
          });
          material = { original: object.material, highlighted: Array.isArray(object.material) ? highlighted : highlighted[0] };
          highlightMaterials.set(object, material);
        }
        object.material = material.highlighted;
        highlightedObjects.push(object);
      }
    }
    function participantIds(value = evaluated()) {
      const stage = stages[index];
      return [...new Set([stage.route.source, ...stage.route.actors, stage.route.target, value.owner])];
    }
    function selectLabels(resetVisibility = true) {
      if (resetVisibility) labelsManuallyHidden = false;
      const value = evaluated();
      const route = stages[index].route;
      const participants = participantIds(value);
      lab.labels = teachingMode === 'process'
        ? processLabels.filter(label => participants.includes(label.participantId))
        : teachingLabels.filter(label => viewId === 'all' || label.scope === viewId || (viewId === 'joint' && ['front', 'rear'].includes(label.scope)));
      for (const label of allLabels) {
        label.el.hidden = !lab.labels.includes(label);
        if (label.el.hidden) label.el.style.opacity = '0';
        if (label.el.dataset.platformLabelMode === 'process') {
          const id = label.participantId;
          const roles = [];
          if (id === route.source) roles.push('起点');
          if (route.actors.includes(id)) roles.push('本步机械手');
          if (id === route.target) roles.push('目标');
          if (id === value.owner) roles.push('当前承托');
          label.value = () => roles.join(' · ');
          label.el.dataset.platformLabelRole = id === value.owner ? 'support' : 'participant';
        }
      }
      labelSelectionKey = `${teachingMode}:${viewId}:${index}:${value.owner}`;
      highlightParticipants(teachingMode === 'process' ? participants : []);
      document.documentElement.dataset.platformLabelView = teachingMode === 'process' ? 'process' : viewId;
      document.documentElement.dataset.platformTeachingMode = teachingMode;
      lab.target.labels = labelsManuallyHidden ? 0 : 1;
      lab.$('.lab-labels svg').innerHTML = '';
    }

    // The embedded canvas owns its whole width. Keep cards in two bounded lanes,
    // with leader lines ending on the actual moving part or station in this scene.
    const originalUpdateLabels = lab._updateLabels;
    lab._updateLabels = function () {
      if (!active) return originalUpdateLabels.call(lab);
      const width = lab.renderer.domElement.clientWidth;
      const height = lab.renderer.domElement.clientHeight;
      if (width < 1 || height < 1) return;
      const padding = width < 500 ? 10 : 18;
      const cardWidth = Math.min(160, width * 0.27);
      const top = 14, bottom = Math.max(top + 30, height - 58);
      const opacity = lab.state.labels;
      const entries = [];
      for (const label of lab.labels) {
        label.obj.updateWorldMatrix(true, false);
        const projected = label.at.clone().applyMatrix4(label.obj.matrixWorld).project(lab.camera);
        if (opacity <= 0.01 || projected.z < -1 || projected.z >= 1 || !Number.isFinite(projected.x + projected.y)) {
          label.el.style.opacity = '0';
          continue;
        }
        label.el.style.width = `${cardWidth}px`;
        label.small.textContent = label.value();
        entries.push({ label, x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height, h: label.el.offsetHeight });
      }
      let paths = '';
      for (const side of ['left', 'right']) {
        const lane = entries.filter(entry => entry.label.side === side).sort((a, b) => a.y - b.y);
        const gap = Math.min(8, Math.max(0, (bottom - top - lane.reduce((sum, entry) => sum + entry.h, 0)) / Math.max(1, lane.length - 1)));
        let cursor = top;
        for (const entry of lane) {
          entry.top = Math.max(cursor, clamp(entry.y - entry.h / 2, top, bottom - entry.h));
          cursor = entry.top + entry.h + gap;
        }
        cursor = bottom;
        for (const entry of [...lane].reverse()) {
          entry.top = Math.min(entry.top, cursor - entry.h);
          cursor = entry.top - gap;
        }
        for (const entry of lane) {
          const left = side === 'left' ? padding : width - padding - cardWidth;
          const endX = side === 'left' ? left + cardWidth : left;
          const endY = entry.top + entry.h / 2;
          entry.label.el.style.left = `${left}px`;
          entry.label.el.style.top = `${entry.top}px`;
          entry.label.el.style.opacity = String(opacity);
          paths += `<path data-platform-leader="${entry.label.el.dataset.platformLabel}" d="M${entry.x.toFixed(1)},${entry.y.toFixed(1)} L${(endX + (side === 'left' ? 12 : -12)).toFixed(1)},${endY.toFixed(1)} L${endX.toFixed(1)},${endY.toFixed(1)}" stroke="rgba(65,99,77,${(0.6 * opacity).toFixed(3)})" stroke-width="1" fill="none"/><circle cx="${entry.x.toFixed(1)}" cy="${entry.y.toFixed(1)}" r="3" fill="#53795e" stroke="#f7f7ef" stroke-width="1"/>`;
        }
      }
      lab.$('.lab-labels svg').innerHTML = paths;
    };

    function evaluated() {
      const stage = stages[index];
      const a = stage.startState, b = stage.endState, p = ease(progress);
      const value = copy(a);
      value.frontTip = mix(a.frontTip, b.frontTip, p);
      value.rearTip = mix(a.rearTip, b.rearTip, p);
      value.frontYaw = a.frontYaw + (b.frontYaw - a.frontYaw) * p;
      value.rearYaw = a.rearYaw + (b.rearYaw - a.rearYaw) * p;
      value.rearRailZ = a.rearRailZ + (b.rearRailZ - a.rearRailZ) * p;
      value.waferYaw = a.waferYaw + (b.waferYaw - a.waferYaw) * p;
      value.headY = a.headY + (b.headY - a.headY) * p;
      value.rearArm = b.rearArm;
      if (progress >= 0.5) { value.owner = b.owner; value.gripOffset = b.gripOffset; }
      if (progress >= 1) value.condition = b.condition;
      return value;
    }

    function solution(robot, target, armId, yaw, railZ) {
      const arm = robot[armId];
      const frontRig = robot === robots.front;
      const mount = [frontRig ? clamp(target[0] * 0.63, -0.73, 0.73) : 0, 0, frontRig ? 1.66 : railZ];
      const dx = target[0] - mount[0], dz = target[2] - mount[2];
      const upper = arm.elbow.position.x, lower = arm.end.position.x;
      const cosine = clamp((dx * dx + dz * dz - upper * upper - lower * lower) / (2 * upper * lower), -1, 1);
      const elbow = Math.acos(cosine);
      const shoulder = Math.atan2(dz, dx) - Math.atan2(lower * Math.sin(elbow), upper + lower * Math.cos(elbow));
      const joints = {};
      for (const key of ['a', 'b']) {
        if (!robot[key]) continue;
        joints[key] = key === armId ? [-shoulder, -elbow, shoulder + elbow + yaw] : [key === 'b' ? Math.PI + 0.8 : 0.8, -2.2, 1.4];
      }
      return { mount, rigY: target[1] - arm.offsetY - 0.03 - 0.047, joints };
    }
    function applyRobot(robot, pose) {
      robot.mount.position.set(...pose.mount);
      robot.rig.position.y = pose.rigY;
      robot.lift.scale.y = Math.max(0.05, (pose.rigY - 1.125) / 0.18);
      for (const [key, angles] of Object.entries(pose.joints)) {
        const arm = robot[key];
        arm.shoulder.rotation.y = angles[0]; arm.elbow.rotation.y = angles[1]; arm.end.rotation.y = angles[2];
      }
    }
    function metricsRobot(robot, target, armId) {
      const arm = robot[armId];
      const actual = group.worldToLocal(arm.end.localToWorld(new THREE.Vector3(0, 0.047, 0))).toArray();
      return {
        arm: armId, target: [...target], actual, errorM: vec(actual).distanceTo(vec(target)), socketUUID: arm.socket.uuid,
        mountLocal: robot.mount.position.toArray(),
        arms: Object.fromEntries(['a', 'b'].filter(key => robot[key]).map(key => {
          const forks = [];
          robot[key].end.traverse(object => {
            if (object.userData.handlingRole) forks.push({ uuid: object.uuid, name: object.name, role: object.userData.handlingRole, color: object.material.color.getHexString() });
          });
          return [key, {
            uuid: robot[key].end.uuid, socketUUID: robot[key].socket.uuid, role: robot === robots.front || key === 'b' ? 'dry' : 'wet',
            world: robot[key].end.localToWorld(new THREE.Vector3(0, 0.047, 0)).toArray(), forks,
          }];
        })),
      };
    }
    function draw() {
      if (!active) return;
      const state = evaluated();
      const frontPose = solution(robots.front, state.frontTip, 'a', state.frontYaw, 1.66);
      let rearPose = solution(robots.rear, state.rearTip, state.rearArm, state.rearYaw, state.rearRailZ);
      const stage = stages[index];
      // Empty-arm selection moves both real joint chains continuously.
      if (stage.startState.rearArm !== stage.endState.rearArm) {
        const old = solution(robots.rear, stage.startState.rearTip, stage.startState.rearArm, stage.startState.rearYaw, stage.startState.rearRailZ);
        const p = ease(progress);
        rearPose = {
          mount: mix(old.mount, rearPose.mount, p), rigY: old.rigY + (rearPose.rigY - old.rigY) * p,
          joints: Object.fromEntries(Object.entries(rearPose.joints).map(([key, values]) => [key, mix(old.joints[key], values, p)])),
        };
      }
      applyRobot(robots.front, frontPose); applyRobot(robots.rear, rearPose);
      for (const cell of cells) {
        cell.head.position.y = cell.id === 'L3' ? state.headY : 1.42;
        cell.shaft.position.y = (1.5 + cell.head.position.y) / 2;
        cell.shaft.scale.y = 1.5 - cell.head.position.y;
      }
      route.visible = false;
      group.updateWorldMatrix(true, true);
      const robotOwner = state.owner === 'front' ? robots.front.a : state.owner === 'rear-a' ? robots.rear.a : state.owner === 'rear-b' ? robots.rear.b : null;
      const owner = robotOwner?.socket || stations[state.owner].socket;
      const desired = robotOwner ? plus(state.owner === 'front' ? state.frontTip : state.rearTip, state.gripOffset) : point(state.owner);
      if (wafer.parent !== owner) owner.add(wafer);
      wafer.position.copy(owner.worldToLocal(group.localToWorld(vec(desired))));
      const worldYaw = group.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), state.waferYaw));
      wafer.quaternion.copy(owner.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldYaw));
      group.updateWorldMatrix(true, true);
      const frontMetrics = metricsRobot(robots.front, state.frontTip, 'a');
      const rearMetrics = metricsRobot(robots.rear, state.rearTip, state.rearArm);
      const changingArm = stage.startState.rearArm !== stage.endState.rearArm && progress < 1;
      rearMetrics.changingArm = changingArm;
      rearMetrics.activeTargetApplicable = !changingArm;
      const supportLocal = robotOwner
        ? plus(state.owner === 'front' ? frontMetrics.actual : rearMetrics.actual, state.gripOffset)
        : scenePoint(stations[state.owner].socket);
      let waferGroups = 0, waferMeshes = 0, visibleWaferGroups = 0;
      group.traverse(object => {
        if (object.name === '唯一 300 mm 晶圆') {
          waferGroups++;
          let visible = true;
          for (let ancestor = object; ancestor; ancestor = ancestor.parent) visible = visible && ancestor.visible;
          if (visible) visibleWaferGroups++;
        }
        if (object.isMesh && object.name === '300 mm 硅晶圆') waferMeshes++;
      });
      currentMetrics = {
        sceneUUID: lab.scene.uuid, platformUUID: group.uuid, canvasId: lab.renderer.domElement.id,
        canvasUUID: lab.renderer.domElement.dataset.handlingCanvas || (lab.renderer.domElement.dataset.handlingCanvas = group.uuid),
        stageId: stage.id, stepIndex: index, progress, paused: !playing, active,
        owner: state.owner, condition: state.condition,
        wafer: { uuid: wafer.uuid, owner: state.owner, condition: state.condition, local: scenePoint(wafer), world: wafer.getWorldPosition(new THREE.Vector3()).toArray(), parentUUID: owner.uuid, desiredLocal: desired, gripOffset: state.gripOffset, supportLocal, supportWorld: group.localToWorld(vec(supportLocal)).toArray() },
        robots: { front: frontMetrics, rear: rearMetrics },
        ikMaxErrorM: Math.max(frontMetrics.errorM, changingArm ? 0 : rearMetrics.errorM),
        supportErrorM: vec(scenePoint(wafer)).distanceTo(vec(supportLocal)),
        stations: Object.fromEntries(Object.entries(stations).map(([id, station]) => [id, { uuid: station.socket.uuid, local: [...station.pos], world: station.socket.getWorldPosition(new THREE.Vector3()).toArray(), kind: station.kind }])),
        counts: { wafers: waferGroups, visibleWafers: visibleWaferGroups, waferMeshes, platingCells: cells.length, foup: Object.values(stations).filter(station => station.kind === 'foup').length, robots: Object.keys(robots).length, rearEndEffectors: ['a', 'b'].filter(key => robots.rear[key]).length },
        interlockPass: state.condition !== 'wet' || !(['front', 'rear-b'].includes(state.owner) || state.owner.startsWith('foup')),
        camera: { position: lab.camera.position.toArray(), target: lab.controlsOrbit.target.toArray() },
      };
      const key = `${teachingMode}:${viewId}:${index}:${state.owner}`;
      if (key !== labelSelectionKey) { selectLabels(false); lab._updateLabels(); }
      currentMetrics.teachingMode = teachingMode;
      currentMetrics.participants = teachingMode === 'process' ? participantIds(state) : [];
      currentMetrics.waferStatus = waferStatus(state);
      currentMetrics.highlightedMeshes = highlightedObjects.length;
    }
    function waferStatus(value = evaluated()) {
      const stage = stages[index];
      let phase = '当前工位承托';
      if (stage.startState.owner !== stage.endState.owner) {
        phase = progress < 0.5 ? '原承托保持接触' : progress < 1 ? '接收方已承托' : '交接完成';
      } else if (stage.id === 'prewet') phase = progress >= 1 ? '预湿完成，等待取片' : '预湿进行中';
      else if (stage.id === 'rinse-dry') phase = progress >= 1 ? '干燥完成，等待取片' : '漂洗干燥进行中';
      else if (stage.id === 'align') phase = progress >= 1 ? '定向完成' : '缺口定向进行中';
      else if (stage.id === 'plate') phase = progress >= 1 ? '电镀完成，等待取片' : '夹持电镀进行中';
      else if (stage.id === 'complete') phase = '已回盒，等待下一片';
      else if (['front', 'rear-a', 'rear-b'].includes(value.owner)) phase = progress >= 1 ? '持片停稳' : '机械手承托转运';
      else if (stage.route.actors.length) phase = progress >= 1 ? '机械手停稳，工位承托' : '工位承托，机械手动作中';
      return {
        condition: value.condition, conditionLabel: value.condition === 'wet' ? '湿片' : '干片',
        supportId: value.owner, supportLabel: supportLabels[value.owner] || stations[value.owner]?.label || value.owner,
        sourceId: stage.route.source, sourceLabel: supportLabels[stage.route.source] || stage.route.source,
        targetId: stage.route.target, targetLabel: supportLabels[stage.route.target] || stage.route.target,
        phase,
      };
    }
    function state() {
      const stage = stages[index];
      return { title: stage.title, detail: stage.detail, stepIndex: index, stepCount: stages.length, progress, playing, completed: progress >= 1, time: stage.start + stage.duration * progress, teachingMode, waferStatus: waferStatus(), participants: teachingMode === 'process' ? participantIds() : [] };
    }
    function pause() { playing = false; lab.paused = true; lab._syncButtons(); return state(); }
    function setTeachingMode(mode) {
      teachingMode = mode === 'process' ? 'process' : 'structure';
      if (active) { selectLabels(); lab._updateLabels(); }
      return state();
    }
    function setStructure(id) {
      pause();
      viewId = id === 'overview' ? 'all' : id === 'transfer' ? 'rear' : id === 'FOUP' ? 'foup' : id;
      if (!views[viewId]) viewId = 'all';
      selectLabels();
      // Cached iframes can have a zero-sized canvas while hidden. Restore the
      // current viewport before laying out labels when the platform returns.
      if (window.innerWidth > 0 && window.innerHeight > 0 && (lab.renderer.domElement.clientWidth !== window.innerWidth || lab.renderer.domElement.clientHeight !== window.innerHeight)) lab._resize();
      lab.setView(views[viewId]);
      lab._updateLabels();
      return state();
    }
    function activate() {
      if (active) return state();
      window.teachingViewer.pause();
      model.setView('overview');
      active = true; playing = false; lab.paused = true;
      Object.assign(model.viewPresets, views);
      model.currentView = () => active ? viewId : baseView();
      document.documentElement.classList.add('platform-handling-active');
      originalLabels.forEach(label => { label.el.style.opacity = '0'; });
      lab.target.cut = 0; lab.target.explode = 0; lab.target.xray = 0;
      lastNow = performance.now();
      draw(); setStructure(viewId);
      return state();
    }
    function deactivate() {
      pause(); active = false;
      clearHighlights();
      model.currentView = baseView;
      model.viewPresets = { ...basePresets };
      lab.labels = originalLabels;
      document.documentElement.classList.remove('platform-handling-active');
      delete document.documentElement.dataset.platformLabelView;
      delete document.documentElement.dataset.platformTeachingMode;
      allLabels.forEach(label => { label.el.hidden = true; label.el.style.opacity = '0'; });
      lab.$('.lab-labels svg').innerHTML = '';
      return state();
    }
    function selectStep(value) {
      pause(); index = Math.trunc(clamp(value, 0, stages.length - 1)); progress = 0; draw(); return state();
    }
    function playStep() {
      if (!active) activate();
      if (progress >= 1) progress = 0;
      playing = true; lab.paused = true; lastNow = performance.now(); draw(); return state();
    }
    function seekProgress(value) { pause(); progress = clamp(value); draw(); return state(); }
    function reset() { return selectStep(0); }
    lab.tickers[baseTickerIndex] = (...args) => { if (!active) baseTicker(...args); };
    lab.tickers.push(() => {
      const now = performance.now(), delta = clamp((now - lastNow) / 1000, 0, 0.05);
      lastNow = now;
      if (!active) return;
      if (playing && !document.hidden) {
        progress = clamp(progress + delta / stages[index].duration);
        if (progress >= 1) playing = false;
      }
      lab.paused = true;
      draw();
    });
    lab.toggle = function (key, value) {
      if (!active) return originalToggle.call(lab, key, value);
      if (key === 'run') return (value ?? playing) ? pause() : playStep();
      pause();
      if (key === 'labels') {
        // The preserved overview also re-applies labels=false on resize. Only
        // button/key toggles (no explicit value) change the user's label choice.
        if (value === undefined) labelsManuallyHidden = lab.target.labels >= 0.5;
        lab.target.labels = labelsManuallyHidden ? 0 : 1;
        lab._syncButtons();
        return;
      }
      if (['cut', 'explode', 'xray', 'labels', 'slow'].includes(key)) lab.target[key] = (value ?? lab.target[key] < 0.5) ? 1 : 0;
      lab._syncButtons();
    };
    window.addEventListener('resize', () => {
      if (!active) return;
      // Run after the legacy viewer's resize, which replaces its label array.
      selectLabels(false);
      lab.setView(views[viewId]);
      lab._updateLabels();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && active) pause(); });
    window.platformHandling = {
      steps: stages.map(({ id, title, detail }) => ({ id, title, detail })),
      state, selectStep, playStep, pause, seekProgress, setStructure, setTeachingMode, reset, activate, deactivate,
      metrics: () => copy(currentMetrics),
      assertions: () => [
        { name: 'unique overview wafer', pass: currentMetrics.counts?.wafers === 1 && wafer.parent != null },
        { name: 'dry wet segregation', pass: currentMetrics.interlockPass === true },
        { name: 'reachable physical arms', pass: currentMetrics.ikMaxErrorM < 1e-5 },
        { name: 'supported wafer', pass: currentMetrics.supportErrorM < 1e-5 },
      ],
    };
    window.dispatchEvent(new CustomEvent('platform-handling-ready'));
  }
  if (window.teachingViewer) initialize();
  else window.addEventListener('teaching-viewer-ready', initialize, { once: true });
})();
