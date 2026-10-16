import { describe, expect, it } from 'vitest'
import { MathUtils, PerspectiveCamera, Quaternion, Spherical, Vector3 } from 'three'

// The production file is a native public ES module, deliberately copied verbatim.
const modulePath = '../../public/waferplt/shared/smooth-camera.js'
const { installSmoothCamera, interpolateCameraPose } = await import(modulePath)

function setup(maxFrameDelta = Infinity) {
  let clock = 0
  const camera = new PerspectiveCamera(30, 16 / 9, 0.01, 100)
  const listeners: Record<string, () => void> = {}
  const controls = {
    target: new Vector3(), autoRotate: true,
    _sphericalDelta: new Spherical(), _panOffset: new Vector3(), _scale: 1,
    update: () => false,
    addEventListener: (name: string, callback: () => void) => { listeners[name] = callback },
  }
  const lab = {
    camera, controlsOrbit: controls, o: { autoOrbit: true }, paused: true, time: 12,
    _applyView(view: { az: number; el: number; dist: number; target: number[]; fov: number; frameX: number }) {
      const target = new Vector3().fromArray(view.target)
      const azimuth = MathUtils.degToRad(view.az)
      const elevation = MathUtils.degToRad(view.el)
      const radius = view.dist * 2.4
      camera.position.set(target.x + radius * Math.cos(elevation) * Math.sin(azimuth), target.y + radius * Math.sin(elevation), target.z + radius * Math.cos(elevation) * Math.cos(azimuth))
      controls.target.copy(target)
      camera.lookAt(target)
      camera.fov = view.fov
      camera.setViewOffset(1600, 900, -view.frameX * 1600, 0, 1600, 900)
      camera.updateProjectionMatrix()
    },
  }
  const options = { duration: 900, maxFrameDelta, now: () => clock, viewport: () => ({ width: 1600, height: 900 }) }
  const api = installSmoothCamera(lab, options)
  const overview = { az: 35, el: 30, dist: 2, target: [0, 0.5, 0], fov: 30, frameX: 0 }
  const closeup = { az: -20, el: 15, dist: 0.8, target: [0.4, 0.9, 0.3], fov: 38, frameX: 0.1 }
  lab._applyView(overview)
  return { lab, api, overview, closeup, listeners, options, tick: (time: number) => { clock = time; controls.update() } }
}

describe('shared smooth camera', () => {
  it('shows intermediate camera/target/FOV states and reaches the exact destination while process state is frozen', () => {
    const { lab, api, closeup, tick } = setup()
    const initial = api.state().current
    lab._applyView(closeup)
    expect(api.state().current).toEqual(initial)
    expect(api.state().active).toBe(true)
    tick(450)
    const middle = api.state()
    expect(middle.current.position).not.toEqual(initial.position)
    expect(middle.current.position).not.toEqual(middle.target.position)
    expect(middle.current.target).toEqual([0.2, 0.7, 0.15])
    expect(middle.current.fov).toBe(34)
    expect(middle.current.frameX).toBeCloseTo(0.05)
    tick(900)
    expect(api.state().active).toBe(false)
    expect(api.state().current).toEqual(api.state().target)
    expect(lab.paused).toBe(true)
    expect(lab.time).toBe(12)
  })

  it('interrupts from the actual displayed pose without a synchronous camera jump', () => {
    const { lab, api, closeup, overview, tick } = setup()
    lab._applyView(closeup)
    tick(360)
    const interrupted = api.state().current
    lab._applyView({ ...overview, az: 110, target: [-0.2, 0.4, 0] })
    expect(api.state().current).toEqual(interrupted)
    expect(api.state().from).toEqual(interrupted)
    tick(810)
    expect(api.state().current.position).not.toEqual(interrupted.position)
    expect(api.state().active).toBe(true)
    tick(1260)
    expect(api.state().current).toEqual(api.state().target)
    expect(api.state().active).toBe(false)
  })

  it('is idempotent, avoids restarting duplicate targets, and yields to pointer orbit', () => {
    const { lab, api, closeup, tick, options, listeners } = setup()
    expect(installSmoothCamera(lab, options)).toBe(api)
    lab._applyView(closeup)
    tick(250)
    const originalId = api.state().id
    lab._applyView(closeup)
    expect(api.state().id).toBe(originalId)
    expect(api.state().progress).toBeCloseTo(250 / 900)
    const stopped = api.state().current
    listeners.start!()
    tick(1000)
    expect(api.state().active).toBe(false)
    expect(api.state().current).toEqual(stopped)
    expect(lab.o.autoOrbit).toBe(false)
  })

  it('uses the short orbit across the azimuth seam and normalized quaternion interpolation', () => {
    const pose = (degrees: number) => {
      const radians = MathUtils.degToRad(degrees)
      return { position: [Math.sin(radians), 0, Math.cos(radians)], target: [0, 0, 0], quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), radians).toArray(), fov: 30, frameX: 0 }
    }
    const middle = interpolateCameraPose(pose(179), pose(-179), 0.5)
    expect(middle.position[0]).toBeCloseTo(0)
    expect(middle.position[2]).toBeCloseTo(-1)
    expect(Math.hypot(...middle.quaternion)).toBeCloseTo(1)
  })

  it('displays intermediate poses after long GPU frames instead of jumping to the destination', () => {
    const { lab, api, closeup, tick } = setup(80)
    lab._applyView(closeup)
    tick(6100)
    expect(api.state().active).toBe(true)
    expect(api.state().progress).toBeCloseTo(80 / 900)
    expect(api.state().current.position).not.toEqual(api.state().from.position)
    expect(api.state().current.position).not.toEqual(api.state().target.position)
    for (let frame = 1; frame <= 11; frame++) tick(6100 + frame * 1000)
    expect(api.state().active).toBe(false)
    expect(api.state().progress).toBe(1)
    expect(api.state().current).toEqual(api.state().target)
    expect(lab.paused).toBe(true)
    expect(lab.time).toBe(12)
  })
})
