/**
 * Reference: user-supplied CAD view + confirmed left/right eight-axis hierarchy.
 * Image proportions, NOT a manufacturer's dimensioned model: bed ~6.6 m;
 * white frames ~1.65 m; all physical offsets are in DIMENSIONS and geometry.ts.
 * Materials: painted steel bed/frame, machined steel rails, aluminium tooling,
 * rubber bellows, polymer drag chains, finned motor housings, plated fasteners.
 * This is a kinematic position workbench. Every readout comes from the same
 * state/matrices that move the parts; no forming force or springback is inferred.
 * Tgrip = Tlower Tpivot Rbend Tupper Rinitial Tz Rswing Theading Rheading Tstretch Rchuck Ttip.
 * q_linear[m] = q_input[mm]/1000; q_angular[rad] = q_input[deg] * pi/180.
 * Hero readout: count(q_i != 0), i=1..16. Inputs: the sixteen joint coordinates.
 * Geometry follows the machine/anatomy solid-detail and studio-lighting workflow.
 */
import * as THREE from 'three'
import { buildBender } from './geometry'
import { createStudio } from './studio'
import { AXES, AXIS_IDS, DIMENSIONS, FRAME_IDS, computeFrames, normalizePose, setAxis, zeroPose } from './kinematics'
import type { AxisId, FrameId, Side } from './kinematics'

function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`Missing workbench element: ${selector}`)
  return found
}

const sideNames = { left: '左侧', right: '右侧' } as const
const host = element('#stage')
const axisPanel = element('#axis-panel')
const message = element('#message')
const jsonArea = element<HTMLTextAreaElement>('#pose-json')
const poseDialog = element<HTMLDialogElement>('#pose-dialog')
const referenceDialog = element<HTMLDialogElement>('#reference-dialog')
const filmMode = new URLSearchParams(location.search).has('film')
let pose = zeroPose()
let side: Side = 'left'
let selected: AxisId = 'lower'
let selectionVisible = false
let labelsVisible = false
let studio: ReturnType<typeof createStudio>
let model: ReturnType<typeof buildBender>
let renderFrame = 0
let previousRenderAt = 0
let filmTime = 0
let filmStarted = false
let sceneReady = false
const rows = new Map<AxisId, { number: HTMLInputElement; range: HTMLInputElement; row: HTMLElement; low: HTMLElement; high: HTMLElement }>()

const labelLayer = element('#part-labels')
const labelElements: { node: THREE.Object3D; local: THREE.Vector3; el: HTMLElement; line: SVGLineElement }[] = []
const axisIndicator = new THREE.Group()
axisIndicator.visible = false
const indicatorColors = [0xc77759, 0x6c9161, 0x628aa4]
for (let index = 0; index < 3; index++) {
  const direction = new THREE.Vector3(index === 0 ? 1 : 0, index === 1 ? 1 : 0, index === 2 ? 1 : 0)
  const arrow = new THREE.ArrowHelper(direction, new THREE.Vector3(), .22, indicatorColors[index], .045, .022)
  for (const material of [arrow.line.material, arrow.cone.material].flat()) material.depthTest = false
  arrow.renderOrder = 1000
  axisIndicator.add(arrow)
}
const pivot = new THREE.Mesh(new THREE.SphereGeometry(.016, 12, 8), new THREE.MeshBasicMaterial({ color: 0x406c50, depthTest: false }))
pivot.renderOrder = 1001
axisIndicator.add(pivot)

function notify(text: string, error = false) {
  message.textContent = text
  message.classList.toggle('is-error', error)
}

function countFor(which: Side) {
  return AXIS_IDS.filter((id) => pose[which][id] !== 0).length
}

function updateSummary() {
  const count = countFor('left') + countFor('right')
  element('#changed-count').textContent = String(count).padStart(2, '0')
  element('#pose-state').textContent = count === 0 ? '图片零位' : '自定义姿态'
  element('#left-count').textContent = `${countFor('left')} / 8`
  element('#right-count').textContent = `${countFor('right')} / 8`
  for (const which of ['left', 'right'] as const) {
    const point = new THREE.Vector3().setFromMatrixPosition(computeFrames(which, pose[which]).grip).multiplyScalar(1000)
    element(`#${which}-position`).textContent = `X ${point.x.toFixed(1)}  Y ${point.y.toFixed(1)}  Z ${point.z.toFixed(1)}`
  }
}

function numberLabel(value: number) {
  return Number(value.toFixed(4)).toString()
}

function updateRows(except?: HTMLInputElement) {
  for (const axis of AXES) {
    const row = rows.get(axis.id)
    if (!row) continue
    const value = pose[side][axis.id]
    if (row.number !== except) row.number.value = numberLabel(value)
    // The range is an editing aid. Numeric input always retains the supplied value.
    const low = Math.min(axis.min, value)
    const high = Math.max(axis.max, value)
    row.range.min = String(low)
    row.range.max = String(high)
    row.range.value = String(value)
    row.range.setAttribute('aria-valuetext', `${numberLabel(value)} ${axis.unit}`)
    row.low.textContent = numberLabel(low)
    row.high.textContent = `${numberLabel(high)} ${axis.unit}`
    row.row.classList.toggle('is-selected', selectionVisible && selected === axis.id)
  }
}

function updateSelection() {
  const index = AXES.findIndex((axis) => axis.id === selected)
  const axis = AXES[index]!
  element('#selection-index').textContent = String(index + 1).padStart(2, '0')
  element('#selection-title').textContent = `${sideNames[side]} · ${axis.label}`
  element('#selection-description').textContent = axis.description
  axisIndicator.visible = selectionVisible
  if (model && selectionVisible) {
    const node = model.sides[side][selected]
    const matrix = model.root.matrixWorld.clone().invert().multiply(node.matrixWorld)
    matrix.decompose(axisIndicator.position, axisIndicator.quaternion, new THREE.Vector3())
  }
}

function selectAxis(id: AxisId, reveal = true) {
  selected = id
  selectionVisible = reveal
  updateRows()
  updateSelection()
}

function applyPoseToModel() {
  if (!model) return
  for (const which of ['left', 'right'] as const) {
    const n = model.sides[which]
    const q = pose[which]
    n.lower.position.x = (which === 'left' ? DIMENSIONS.leftBaseX : DIMENSIONS.rightBaseX) + q.lower / 1000
    const inward = which === 'left' ? 1 : -1
    n.bend.position.x = inward * DIMENSIONS.bendPivotInsetX
    n.upper.position.x = -inward * DIMENSIONS.bendPivotInsetX + q.upper / 1000
    n.bend.rotation.z = THREE.MathUtils.degToRad(q.bend)
    n.z.position.z = DIMENSIONS.carriageZ + q.z / 1000
    n.swing.rotation.y = THREE.MathUtils.degToRad(q.swing)
    n.heading.rotation.z = THREE.MathUtils.degToRad(q.heading)
    n.stretch.position.x = DIMENSIONS.sliderX + q.stretch / 1000
    n.chuck.rotation.x = THREE.MathUtils.degToRad(q.chuck)
  }
  model.root.updateMatrixWorld(true)
  model.updateDetails()
  model.root.updateMatrixWorld(true)
  updateSelection()
}

function changeAxis(id: AxisId, value: number, source?: HTMLInputElement) {
  pose = setAxis(pose, side, id, value)
  selected = id
  selectionVisible = true
  applyPoseToModel()
  updateRows(source)
  updateSummary()
  const axis = AXES.find((item) => item.id === id)!
  notify(`${sideNames[side]} · ${axis.label}：${numberLabel(value)} ${axis.unit}`)
}

function changeSide(next: Side) {
  side = next
  document.querySelectorAll<HTMLButtonElement>('[data-side]').forEach((button) => {
    const active = button.dataset.side === next
    button.setAttribute('aria-selected', String(active))
    button.tabIndex = active ? 0 : -1
  })
  axisPanel.setAttribute('aria-labelledby', `side-${next}`)
  element('#reset-side').innerHTML = `${sideNames[next]}归零 <span aria-hidden="true">↺</span>`
  buildRows()
  updateSelection()
}

function buildRows() {
  rows.clear()
  axisPanel.replaceChildren()
  AXES.forEach((axis, index) => {
    const row = document.createElement('div')
    row.className = 'axis-row'
    row.dataset.axis = axis.id
    const key = `${side}-${axis.id}`
    row.innerHTML = `<div class="axis-top"><button class="axis-select" aria-label="选择${sideNames[side]}${axis.label}"><span class="axis-number">${String(index + 1).padStart(2, '0')}</span><span><span class="axis-title">${axis.label}</span><span class="axis-kind">${axis.unit === 'mm' ? 'LINEAR / 直线' : 'ROTARY / 旋转'}</span></span></button><label class="number-wrap"><input id="${key}-number" type="number" step="0.1" inputmode="decimal" aria-label="${sideNames[side]}${axis.label}位置"><span>${axis.unit}</span></label><button class="axis-zero" title="${sideNames[side]}${axis.label}归零" aria-label="${sideNames[side]}${axis.label}归零">↺</button></div><input id="${key}-range" class="axis-range" type="range" min="${axis.min}" max="${axis.max}" step="0.1" aria-label="${sideNames[side]}${axis.label}滑块"><div class="range-caption"><span class="range-low"></span><span>0</span><span class="range-high"></span></div>`
    const number = row.querySelector<HTMLInputElement>('input[type=number]')!
    const range = row.querySelector<HTMLInputElement>('input[type=range]')!
    row.querySelector('.axis-select')!.addEventListener('click', () => selectAxis(axis.id))
    row.querySelector('.axis-zero')!.addEventListener('click', () => changeAxis(axis.id, 0))
    number.addEventListener('focus', () => selectAxis(axis.id))
    number.addEventListener('input', () => {
      if (number.value.trim() === '' || !Number.isFinite(number.valueAsNumber)) {
        number.setAttribute('aria-invalid', 'true')
        notify('请输入有效数值，当前轴位置保留。', true)
        return
      }
      number.removeAttribute('aria-invalid')
      changeAxis(axis.id, number.valueAsNumber, number)
    })
    number.addEventListener('blur', () => {
      if (number.getAttribute('aria-invalid') === 'true') {
        number.value = numberLabel(pose[side][axis.id])
        number.removeAttribute('aria-invalid')
      }
    })
    range.addEventListener('input', () => changeAxis(axis.id, range.valueAsNumber))
    rows.set(axis.id, { number, range, row, low: row.querySelector('.range-low')!, high: row.querySelector('.range-high')! })
    axisPanel.append(row)
  })
  updateRows()
}

function setWholePose(input: unknown) {
  const next = normalizePose(input)
  pose = next
  applyPoseToModel()
  updateRows()
  updateSummary()
}

function poseDocument() {
  return { format: 'stretch-bender-pose', version: 1, reference: 'photo-zero', units: { linear: 'mm', angular: 'deg' }, pose: normalizePose(pose) }
}

function parseDocument(text: string) {
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || !('format' in parsed) || parsed.format !== 'stretch-bender-pose' || !('version' in parsed) || parsed.version !== 1 || !('pose' in parsed)) {
    throw new Error('请选择本工作台导出的版本 1 姿态文件。')
  }
  if (!('units' in parsed) || typeof parsed.units !== 'object' || parsed.units === null || !('linear' in parsed.units) || parsed.units.linear !== 'mm' || !('angular' in parsed.units) || parsed.units.angular !== 'deg') {
    throw new Error('姿态单位必须是 mm 与 deg。')
  }
  return normalizePose(parsed.pose)
}

function applyJson(text: string) {
  const validated = parseDocument(text)
  setWholePose(validated)
  element('#pose-error').textContent = ''
  poseDialog.close()
  notify('已载入左右完整十六轴姿态。')
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function buildLabels() {
  labelLayer.replaceChildren()
  labelElements.length = 0
  const connectors = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  connectors.classList.add('label-connectors')
  connectors.setAttribute('aria-hidden', 'true')
  labelLayer.append(connectors)
  for (const anchor of model.anchors) {
    const label = document.createElement('span')
    label.className = 'part-label'
    label.textContent = anchor.label
    label.hidden = true
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    connectors.append(line)
    labelLayer.append(label)
    labelElements.push({ node: anchor.node, local: anchor.local, el: label, line })
  }
}

function updateLabels() {
  if (!labelsVisible) return
  const width = host.clientWidth
  const height = host.clientHeight
  const placed: { x: number; y: number; w: number; h: number }[] = []
  const projected = labelElements.map((label) => {
    const p = label.node.localToWorld(label.local.clone()).project(studio.camera)
    const x = (p.x + 1) * width / 2
    const y = (1 - p.y) * height / 2
    return { label, x, y, visible: p.z >= -1 && p.z <= 1 && x >= 10 && x <= width - 10 && y >= 30 && y <= height - 10, w: label.el.offsetWidth || 85, h: label.el.offsetHeight || 25 }
  }).sort((a, b) => a.y - b.y || a.x - b.x)
  for (const item of projected) {
    const { label, w, h } = item
    label.el.hidden = !item.visible
    label.line.style.display = item.visible ? '' : 'none'
    if (!item.visible) continue
    let best = { x: THREE.MathUtils.clamp(item.x, w / 2 + 8, width - w / 2 - 8), y: THREE.MathUtils.clamp(item.y - 7, h + 10, height - 10) }
    let found = false
    for (let ring = 0; ring < 10 && !found; ring++) {
      const candidates = ring === 0 ? [[0, 0]] : [[0, -ring * (h + 5)], [0, ring * (h + 5)], [-ring * 40, 0], [ring * 40, 0], [-ring * 35, -ring * 20], [ring * 35, -ring * 20]]
      for (const [dx, dy] of candidates) {
        const candidate = { x: THREE.MathUtils.clamp(item.x + dx!, w / 2 + 8, width - w / 2 - 8), y: THREE.MathUtils.clamp(item.y - 7 + dy!, h + 10, height - 10) }
        if (placed.every((other) => Math.abs(candidate.x - other.x) >= (w + other.w) / 2 + 5 || candidate.y < other.y - other.h - 5 || candidate.y - h > other.y + 5)) {
          best = candidate
          found = true
          break
        }
      }
    }
    placed.push({ ...best, w, h })
    label.el.style.left = `${best.x}px`
    label.el.style.top = `${best.y}px`
    label.line.setAttribute('x1', String(item.x))
    label.line.setAttribute('y1', String(item.y))
    label.line.setAttribute('x2', String(THREE.MathUtils.clamp(item.x, best.x - w / 2, best.x + w / 2)))
    label.line.setAttribute('y2', String(THREE.MathUtils.clamp(item.y, best.y - h, best.y)))
  }
}

function actualFrames(which: Side) {
  model.root.updateMatrixWorld(true)
  const inverse = model.root.matrixWorld.clone().invert()
  return Object.fromEntries(FRAME_IDS.map((id) => [id, inverse.clone().multiply(model.sides[which][id].matrixWorld).elements])) as unknown as Record<FrameId, number[]>
}

function render(now = performance.now()) {
  if (!studio) return
  studio.render()
  updateLabels()
  if (previousRenderAt > 0) metrics.frameMs = now - previousRenderAt
  previousRenderAt = now
}

function animate(now: number) {
  render(now)
  renderFrame = requestAnimationFrame(animate)
}

const metrics = { meshes: 0, triangles: 0, frameMs: 0, drawCalls: 0 }

function sampleFilm(time: number) {
  const eased = (from: number, to: number) => {
    const t = THREE.MathUtils.clamp((time - from) / (to - from), 0, 1)
    return t * t * (3 - 2 * t)
  }
  const l = eased(3, 9) * (1 - eased(23, 27))
  const r = eased(11, 17) * (1 - eased(23, 27))
  const next = zeroPose()
  const left = { lower: 100, upper: -50, bend: 15, z: 75, swing: 18, heading: 12, stretch: 100, chuck: 35 }
  const right = { lower: -100, upper: 50, bend: -15, z: 45, swing: -12, heading: -10, stretch: 80, chuck: -25 }
  for (const id of AXIS_IDS) { next.left[id] = left[id] * l; next.right[id] = right[id] * r }
  const nextSide = time < 11 || time >= 23 ? 'left' : 'right'
  if (side !== nextSide) changeSide(nextSide)
  setWholePose(next)
  const caption = element('#film-caption')
  caption.hidden = false
  caption.textContent = time < 3 ? '图片姿态，十六轴零位。' : time < 11 ? '左侧八轴，各自设定，逐级带动。' : time < 23 ? '右侧独立设定，姿态分别保留。' : '全部归零，回到参考图姿态。'
}

try {
  studio = createStudio(host)
  model = buildBender()
  studio.world.add(model.root)
  model.root.add(axisIndicator)
  for (const which of ['left', 'right'] as const) {
    for (const id of AXIS_IDS) {
      model.sides[which][id].userData.axis = id
      model.sides[which][id].userData.side = which
    }
    model.sides[which].frame.userData.axis = 'bend'
    model.sides[which].mirror.userData.axis = 'upper'
    model.sides[which].grip.userData.axis = 'chuck'
  }
  buildRows()
  buildLabels()
  applyPoseToModel()
  updateSummary()
  const chainOrder: AxisId[] = ['lower', 'bend', 'upper', 'z', 'swing', 'heading', 'stretch', 'chuck']
  element('#chain-list').innerHTML = chainOrder.map((id) => `<li>${AXES.find((axis) => axis.id === id)!.label}</li>`).join('')
  element('#ready-state').textContent = '十六轴就绪'
  model.root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      metrics.meshes++
      const geometry = object.geometry
      metrics.triangles += (geometry.index ? geometry.index.count : geometry.attributes.position!.count) / 3 * (object instanceof THREE.InstancedMesh ? object.count : 1)
    }
  })
  const raycaster = new THREE.Raycaster()
  let pointerStart = { x: 0, y: 0 }
  studio.renderer.domElement.addEventListener('pointerdown', (event) => { pointerStart = { x: event.clientX, y: event.clientY } })
  studio.renderer.domElement.addEventListener('pointerup', (event) => {
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5 || event.button !== 0) return
    const box = host.getBoundingClientRect()
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1), studio.camera)
    for (const hit of raycaster.intersectObject(model.root, true)) {
      let node: THREE.Object3D | null = hit.object
      while (node && !(AXIS_IDS as readonly string[]).includes(String(node.userData.axis))) node = node.parent
      if (node?.userData.side && node.userData.axis) {
        changeSide(node.userData.side as Side)
        selectAxis(node.userData.axis as AxisId)
        break
      }
    }
  })
  studio.renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    element('#render-error').hidden = false
    element('#render-error-message').textContent = '图形上下文已中断，当前轴值仍保留。请重新加载场景。'
    cancelAnimationFrame(renderFrame)
  })
  render()
  if (!filmMode) renderFrame = requestAnimationFrame(animate)
  metrics.drawCalls = studio.renderer.info.render.calls
  sceneReady = true
} catch (error) {
  element('#render-error').hidden = false
  element('#render-error-message').textContent = errorMessage(error)
  element('#ready-state').textContent = '场景未就绪'
  buildRows()
  updateSummary()
}

document.querySelectorAll<HTMLButtonElement>('[data-side]').forEach((button) => {
  button.addEventListener('click', () => changeSide(button.dataset.side as Side))
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = side === 'left' ? 'right' : 'left'
    changeSide(next)
    element(`#side-${next}`).focus()
  })
})
element('#reset-side').addEventListener('click', () => {
  setWholePose({ ...pose, [side]: zeroPose()[side] })
  notify(`${sideNames[side]}八轴已回到图片零位，另一侧姿态保留。`)
})
element('#reset-all').addEventListener('click', () => {
  selectionVisible = false
  setWholePose(zeroPose())
  notify('左右十六轴已回到图片零位。')
})
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    studio?.view(button.dataset.view as Parameters<typeof studio.view>[0])
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((item) => {
      item.classList.toggle('active', item === button)
      item.setAttribute('aria-pressed', String(item === button))
    })
  })
})
element('#focus-selection').addEventListener('click', () => {
  if (!model) return
  selectAxis(selected)
  const point = new THREE.Vector3().setFromMatrixPosition(computeFrames(side, pose[side])[selected])
  studio.focus(point)
})
element('#labels-toggle').addEventListener('click', () => {
  labelsVisible = !labelsVisible
  element('#labels-toggle').setAttribute('aria-pressed', String(labelsVisible))
  labelElements.forEach((item) => { item.el.hidden = !labelsVisible })
  labelElements.forEach((item) => { item.line.style.display = labelsVisible ? '' : 'none' })
})
element('#reference-open').addEventListener('click', () => referenceDialog.showModal())
element('#pose-open').addEventListener('click', () => {
  jsonArea.value = JSON.stringify(poseDocument(), null, 2)
  element('#pose-error').textContent = ''
  poseDialog.showModal()
})
document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((button) => {
  button.addEventListener('click', () => element<HTMLDialogElement>(`#${button.dataset.close}`).close())
})
element('#apply-json').addEventListener('click', () => {
  try { applyJson(jsonArea.value) } catch (error) { element('#pose-error').textContent = errorMessage(error) }
})
element<HTMLInputElement>('#import-file').addEventListener('change', async (event) => {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    jsonArea.value = text
    applyJson(text)
  } catch (error) { element('#pose-error').textContent = errorMessage(error) }
  input.value = ''
})
element('#download-pose').addEventListener('click', () => {
  const text = JSON.stringify(poseDocument(), null, 2)
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'stretch-bender-pose.json'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
})
element('#retry-render').addEventListener('click', () => location.reload())

const api = {
  ready: sceneReady,
  getPose: () => normalizePose(pose),
  setPose: setWholePose,
  setAxis: (which: Side, id: AxisId, value: number) => {
    const next = setAxis(pose, which, id, value)
    setWholePose(next)
  },
  reset: () => setWholePose(zeroPose()),
  frames: actualFrames,
  expectedFrames: (which: Side) => Object.fromEntries(Object.entries(computeFrames(which, pose[which])).map(([id, matrix]) => [id, matrix.elements])),
  select: (which: Side, id: AxisId) => { changeSide(which); selectAxis(id) },
  metrics,
  render: () => render(),
  camera: () => ({ position: studio.camera.position.toArray(), target: studio.controls.target.toArray() }),
}
const film = {
  ready: api.ready,
  len: 28,
  loaded: () => api.ready,
  start: () => { filmStarted = true; filmTime = 0; sampleFilm(0); render() },
  seek: (time: number) => { filmTime = THREE.MathUtils.clamp(time, 0, 28); sampleFilm(filmTime); render() },
  step: (dt: number) => { if (!filmStarted) filmStarted = true; filmTime += dt; sampleFilm(filmTime); render() },
}
Object.assign(window, { __bender: api, __film: film })
