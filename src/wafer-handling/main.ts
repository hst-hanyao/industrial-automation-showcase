import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createHandlingScene, type HandlingViewMode } from './geometry'
import { sampleCycle, stages, stations, cycleDuration, handoffGateTime, armBaseOffsets, type Snapshot, type Stage, type StationId } from './kinematics'
import '../styles/wafer-handling.css'

const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const robotName = { front: '前手臂', rear: '后手臂', none: '工位处理' }
const shortStation: Record<StationId, string> = { FOUP: 'FOUP', ALIGN: '定向', HANDOFF_IN: '入片交接', HANDOFF_OUT: '回片交接', APT: 'APT', PLT: 'PLT', SRD: 'SRD' }
const groupKey = (stage: Stage) => stage.from && stage.to ? `${stage.from}-${stage.to}` : stage.processStation ? `process-${stage.processStation}` : stage.id

function initialize() {
  document.body.classList.toggle('is-embedded', window.parent !== window)
  try {
    document.body.classList.toggle('has-outer-notice', window.parent !== window && Boolean(window.parent.document.querySelector('.teaching-notice')))
  } catch { /* Cross-origin embeds retain the notice in this document. */ }
  const host = element('scene')
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#f1f0e9')
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.setAttribute('aria-label', '前后手臂与干湿末端三维模型')
  host.append(renderer.domElement)
  element('loading').remove()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.09
  controls.minDistance = 1.4
  controls.maxDistance = 20
  controls.maxPolarAngle = Math.PI / 2 - 0.05
  controls.enablePan = true
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environmentScene = new RoomEnvironment()
  const environment = pmrem.fromScene(environmentScene, 0.035)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.72
  environmentScene.dispose()
  pmrem.dispose()
  scene.add(new THREE.HemisphereLight('#eaf4ff', '#a6a18b', 2.2))
  const key = new THREE.DirectionalLight('#fff9ed', 3.2)
  key.position.set(-2.4, 7, 5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -5
  key.shadow.camera.right = 5
  key.shadow.camera.top = 4
  key.shadow.camera.bottom = -4
  key.shadow.camera.near = 0.1
  key.shadow.camera.far = 18
  key.shadow.bias = -0.00025
  key.shadow.normalBias = 0.015
  scene.add(key)
  const fill = new THREE.DirectionalLight('#d5e8ff', 1.2)
  fill.position.set(3, 3, -4)
  scene.add(fill)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: '#eeede5', roughness: 0.88, metalness: 0 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.012
  floor.receiveShadow = true
  scene.add(floor)
  const model = createHandlingScene()
  scene.add(model.group)
  let view: HandlingViewMode = 'all'
  let showLabels = true
  let time = 0
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let speed = 1
  let gateFault = false
  let selectedRobot: 'front' | 'rear' = 'front'
  let lastStage = -1
  let lastUI = -Infinity
  let lastFrame = performance.now()
  let frameCount = 0
  let measuredFPS = 0
  let fpsEpoch = lastFrame
  const timeline = element<HTMLInputElement>('timeline')
  timeline.max = String(cycleDuration)
  element('duration').textContent = ` / ${cycleDuration.toFixed(1)} s 示意时间`
  const labelHost = element('scene-labels')
  const world = new THREE.Vector3()
  const labelNodes = model.anchors.map(anchor => {
    const node = document.createElement('span')
    node.className = 'scene-label'
    node.dataset.zone = anchor.zone
    node.dataset.kind = anchor.id.includes('wet') ? 'wet' : 'dry'
    node.textContent = anchor.id in shortStation ? shortStation[anchor.id as StationId]
      : anchor.id === 'front-dry' ? '前 · 干片末端'
      : anchor.id === 'rear-dry' ? '后 · 干片末端'
      : anchor.id === 'rear-wet' ? '后 · 湿片末端' : anchor.label
    labelHost.append(node)
    return { anchor, node }
  })
  const groups = new Map<string, { start: number; button: HTMLButtonElement }>()
  for (const stage of stages) {
    const id = groupKey(stage)
    if (groups.has(id) || (!stage.from && !stage.processStation)) continue
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.stage = stage.id
    button.textContent = stage.from && stage.to ? `${shortStation[stage.from]} → ${shortStation[stage.to]}` : `${shortStation[stage.processStation!]} · ${stage.action}`
    button.addEventListener('click', () => { seek(stage.start); playing = false; syncUI(true); announce(stage.label) })
    element('route-steps').append(button)
    groups.set(id, { start: stage.start, button })
  }

  function announce(message: string) { element('announcement').textContent = message }
  function isBlocked() { return gateFault && time >= handoffGateTime - 0.00001 }
  function seek(value: number) {
    time = Math.max(0, Math.min(cycleDuration, Number.isFinite(value) ? value : 0, gateFault ? handoffGateTime : cycleDuration))
    const snapshot = sampleCycle(time)
    model.update(snapshot)
    model.group.updateMatrixWorld(true)
    return snapshot
  }
  function setView(mode: HandlingViewMode) {
    view = mode
    if (mode !== 'all') selectedRobot = mode
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === mode)))
    model.setViewMode(mode)
    const focus = mode === 'front' ? new THREE.Vector3(-1.13, 0.78, 0.03) : mode === 'rear' ? new THREE.Vector3(1.15, 0.8, 0.08) : new THREE.Vector3(0.3, 0.72, 0.08)
    const offset = mode === 'front' ? new THREE.Vector3(1.15, 1.8, -2.8) : mode === 'rear' ? new THREE.Vector3(1.5, 2.55, -3.7) : new THREE.Vector3(1.65, 3.6, -5.6)
    const narrowScale = Math.max(1, 1.35 / camera.aspect)
    offset.multiplyScalar(Math.min(1.85, narrowScale))
    camera.position.copy(focus).add(offset)
    controls.target.copy(focus)
    controls.update()
    syncUI(true)
  }
  function resize() {
    const width = host.clientWidth
    const height = host.clientHeight
    camera.aspect = width / Math.max(1, height)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    setView(view)
  }
  function setFault(value: boolean) {
    gateFault = value
    if (value) time = handoffGateTime
    playing = !value
    element('gate').setAttribute('aria-pressed', String(value))
    element('gate').textContent = value ? '恢复：入片交接位已就绪' : '演示：入片交接位未就绪'
    element('gate-description').textContent = value ? '已定位到交接等待：前手臂保持持片，交接位仍为空；恢复后才允许放片。' : '可观察互锁等待：前手臂保持持片，后手臂等待许可。'
    seek(time)
    syncUI(true)
    announce(value ? '交接位未就绪，前手臂持片等待。' : '交接许可恢复，可以继续放片。')
  }
  function syncUI(force = false) {
    const snapshot = sampleCycle(time)
    const stage = snapshot.stage
    if (snapshot.activeRobot !== 'none' && view === 'all') selectedRobot = snapshot.activeRobot
    element('play').textContent = playing ? '暂停' : time >= cycleDuration ? '再播放' : '播放'
    element('time').textContent = time.toFixed(1)
    timeline.value = String(time)
    const blocked = isBlocked()
    element('live-lamp').textContent = blocked ? '互锁等待' : time >= cycleDuration ? '本轮完成' : playing ? '运行中' : '已暂停'
    if (force || lastStage !== snapshot.stageIndex) {
      element('action-title').textContent = blocked ? '交接位未就绪 · 持片等待' : `${robotName[snapshot.activeRobot]} · ${stage.action}`
      element('action-detail').textContent = stage.responsibility
      element('interlock-text').textContent = blocked ? '入片交接位无接收许可。前手臂不能放片，后手臂不能取片。' : stage.interlock
      element('front-status').textContent = snapshot.activeRobot === 'front' ? `执行：${stage.action}` : '等待干片装卸或回片交接'
      element('rear-status').textContent = snapshot.activeRobot === 'rear' ? `执行：${snapshot.activeBlade === 'wet' ? '湿片' : '干片'}末端 · ${stage.action}` : '等待交接许可或工艺完成'
      for (const [id, item] of groups) { if (id === groupKey(stage)) item.button.setAttribute('aria-current', 'step'); else item.button.removeAttribute('aria-current') }
      lastStage = snapshot.stageIndex
    }
    element('wafer-state').textContent = snapshot.wafer.condition === 'wet' ? '湿片' : '干片'
    element('wafer-state').dataset.condition = snapshot.wafer.condition
    const location = snapshot.wafer.location
    element('wafer-holder').textContent = location.kind === 'station' ? stations[location.station].label : `${robotName[location.robot]} · ${location.blade === 'wet' ? '湿片' : '干片'}末端`
    document.querySelectorAll<HTMLElement>('[data-focus]').forEach(card => { card.dataset.active = String(card.dataset.focus === snapshot.activeRobot) })
    const pose = snapshot.robots[selectedRobot]
    element('rail-value').textContent = `${(pose.railX * 1000).toFixed(0)} mm`
    element('lift-value').textContent = `${(pose.liftY * 1000).toFixed(0)} mm`
    element('angle-value').textContent = `${THREE.MathUtils.radToDeg(pose.shoulderAngle).toFixed(1)}° / ${THREE.MathUtils.radToDeg(pose.elbowAngle).toFixed(1)}°`
    element('reach-value').textContent = `${(Math.hypot(pose.endPosition.x - pose.railX - armBaseOffsets[selectedRobot][pose.activeBlade], pose.endPosition.z) * 1000).toFixed(0)} mm`
  }
  function positionLabels(snapshot: Snapshot) {
    const occupied: { x: number; y: number; w: number; h: number }[] = []
    for (const { anchor, node } of labelNodes) {
      const rail = anchor.id.endsWith('rail')
      const shown = showLabels && anchor.object.visible && !(rail && view === 'all')
      if (!shown) { node.hidden = true; continue }
      anchor.object.getWorldPosition(world)
      world.project(camera)
      if (world.z < -1 || world.z > 1 || Math.abs(world.x) > 1.05 || Math.abs(world.y) > 1.05) { node.hidden = true; continue }
      node.hidden = false
      const w = node.offsetWidth
      const h = node.offsetHeight
      const x = Math.max(w / 2 + 3, Math.min(host.clientWidth - w / 2 - 3, (world.x * 0.5 + 0.5) * host.clientWidth))
      let y = (-world.y * 0.5 + 0.5) * host.clientHeight
      for (let attempt = 0; attempt < 5; attempt++) {
        if (!occupied.some(r => x - w / 2 < r.x + r.w + 3 && x + w / 2 > r.x - 3 && y - h < r.y + r.h + 2 && y > r.y - 2)) break
        y -= h + 4
      }
      y = Math.max(h + 3, y)
      occupied.push({ x: x - w / 2, y: y - h, w, h })
      node.style.left = `${x.toFixed(1)}px`
      node.style.top = `${y.toFixed(1)}px`
      node.dataset.active = String(snapshot.wafer.location.kind === 'station' && snapshot.wafer.location.station === anchor.id || snapshot.wafer.location.kind === 'blade' && `${snapshot.wafer.location.robot}-${snapshot.wafer.location.blade}` === anchor.id)
    }
  }
  const pause = () => { playing = false; syncUI(true) }
  const play = () => { if (time >= cycleDuration) time = 0; playing = true; syncUI(true) }
  element<HTMLVideoElement>('overview-video').addEventListener('play', pause)
  element('play').addEventListener('click', () => playing ? pause() : play())
  const step = (direction: -1 | 1) => {
    const current = sampleCycle(time)
    const index = Math.max(0, Math.min(stages.length - 1, current.stageIndex + direction))
    seek(stages[index]!.start)
    playing = false
    syncUI(true)
    announce(sampleCycle(time).stage.label)
  }
  element('previous').addEventListener('click', () => step(-1))
  element('next').addEventListener('click', () => step(1))
  element('reset').addEventListener('click', () => { gateFault = false; setFault(false); seek(0); playing = false; setView('all'); syncUI(true); announce('已重置，唯一晶圆位于 FOUP。') })
  timeline.addEventListener('input', () => { playing = false; seek(Number(timeline.value)); syncUI(true) })
  element<HTMLSelectElement>('speed').addEventListener('change', event => { speed = Number((event.target as HTMLSelectElement).value) })
  element('gate').addEventListener('click', () => setFault(!gateFault))
  element('labels').addEventListener('click', () => { showLabels = !showLabels; model.setLabels(showLabels); element('labels').setAttribute('aria-pressed', String(showLabels)); element('labels').textContent = `部件标签：${showLabels ? '开' : '关'}` })
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view as HandlingViewMode)))
  document.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(button => button.addEventListener('click', () => setView(button.dataset.focus as HandlingViewMode)))
  document.addEventListener('keydown', event => {
    if ((event.target as HTMLElement).matches('input,select,textarea,button,a,summary')) return
    if (event.code === 'Space') { event.preventDefault(); if (playing) pause(); else play() }
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') { event.preventDefault(); step(event.code === 'ArrowLeft' ? -1 : 1) }
  })
  new ResizeObserver(resize).observe(host)
  resize()
  seek(0)
  syncUI(true)
  const tick = (now: number) => {
    const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000))
    lastFrame = now
    if (!document.hidden) {
      if (playing && !isBlocked()) { seek(time + delta * speed); if (time >= cycleDuration) playing = false }
      const snapshot = sampleCycle(time)
      model.update(snapshot)
      controls.update()
      model.group.updateMatrixWorld(true)
      positionLabels(snapshot)
      renderer.render(scene, camera)
      if (now - lastUI > 80) { syncUI(); lastUI = now }
      frameCount++
      if (now - fpsEpoch > 1000) { measuredFPS = frameCount * 1000 / (now - fpsEpoch); fpsEpoch = now; frameCount = 0 }
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  window.__handlingQA = {
    sample: sampleCycle,
    seek: value => { pause(); const snapshot = seek(value); syncUI(true); return snapshot },
    snapshot: () => sampleCycle(time),
    setView,
    setFault,
    pause,
    play,
    stages,
    duration: cycleDuration,
    gateTime: handoffGateTime,
    metrics: () => {
      const wafer = model.group.getObjectByName('Single tracked 300 mm wafer')
      return { fps: measuredFPS, draws: renderer.info.render.calls, triangles: renderer.info.render.triangles, time, playing, gateFault, view,
        waferCount: model.group.children.filter(child => child.name === 'Single tracked 300 mm wafer').length,
        waferPosition: wafer ? { x: wafer.position.x, y: wafer.position.y, z: wafer.position.z } : null }
    },
  }
}

declare global {
  interface Window {
    __handlingQA: {
      sample: typeof sampleCycle
      seek: (time: number) => Snapshot
      snapshot: () => Snapshot
      setView: (view: HandlingViewMode) => void
      setFault: (value: boolean) => void
      pause: () => void
      play: () => void
      stages: typeof stages
      duration: number
      gateTime: number
      metrics: () => { fps: number; draws: number; triangles: number; time: number; playing: boolean; gateFault: boolean; view: HandlingViewMode; waferCount: number; waferPosition: { x: number; y: number; z: number } | null }
    }
  }
}

try { initialize() }
catch (error) {
  console.error(error)
  element('loading')?.remove()
  const notice = document.createElement('p')
  notice.className = 'webgl-fallback'
  notice.setAttribute('role', 'alert')
  notice.textContent = '三维画面暂时无法建立。请使用支持 WebGL 2 的浏览器并开启硬件加速；下方仍可阅读前后手臂职责及教学边界。'
  element('scene').append(notice)
  document.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('.scene-toolbar button,.playback button,.playback input,.playback select').forEach(control => { control.disabled = true })
}
