/* global performance, innerWidth, innerHeight */
const lerp = (from, to, progress) => from + (to - from) * progress;
const clamp = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (value) => value * value * (3 - 2 * value);

function quaternionBetween(from, to, progress) {
  let destination = to;
  let dot = from.reduce((sum, value, index) => sum + value * to[index], 0);
  if (dot < 0) { destination = to.map(value => -value); dot = -dot; }
  if (dot > 0.9995) {
    const mixed = from.map((value, index) => lerp(value, destination[index], progress));
    const length = Math.hypot(...mixed) || 1;
    return mixed.map(value => value / length);
  }
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  const denominator = Math.sin(angle);
  return from.map((value, index) => (value * Math.sin((1 - progress) * angle) + destination[index] * Math.sin(progress * angle)) / denominator);
}

/** Interpolate around the orbit target instead of cutting through the model. */
export function interpolateCameraPose(from, to, fraction) {
  const progress = smoothstep(clamp(fraction));
  if (progress === 0) return structuredCopy(from);
  if (progress === 1) return structuredCopy(to);
  const target = from.target.map((value, index) => lerp(value, to.target[index], progress));
  const orbit = (pose) => {
    const [x, y, z] = pose.position.map((value, index) => value - pose.target[index]);
    const radius = Math.max(1e-9, Math.hypot(x, y, z));
    return { radius, azimuth: Math.atan2(x, z), elevation: Math.asin(Math.max(-1, Math.min(1, y / radius))) };
  };
  const a = orbit(from);
  const b = orbit(to);
  const shortestAzimuth = Math.atan2(Math.sin(b.azimuth - a.azimuth), Math.cos(b.azimuth - a.azimuth));
  const azimuth = a.azimuth + shortestAzimuth * progress;
  const elevation = lerp(a.elevation, b.elevation, progress);
  const radius = lerp(a.radius, b.radius, progress);
  return {
    position: [target[0] + radius * Math.cos(elevation) * Math.sin(azimuth), target[1] + radius * Math.sin(elevation), target[2] + radius * Math.cos(elevation) * Math.cos(azimuth)],
    target,
    quaternion: quaternionBetween(from.quaternion, to.quaternion, progress),
    fov: lerp(from.fov, to.fov, progress),
    frameX: lerp(from.frameX, to.frameX, progress),
  };
}

const structuredCopy = (pose) => ({ ...pose, position: [...pose.position], target: [...pose.target], quaternion: [...pose.quaternion] });
const equalPose = (from, to) => ['position', 'target', 'quaternion'].every(key => from[key].every((value, index) => Math.abs(value - to[key][index]) < 1e-8)) && Math.abs(from.fov - to.fov) < 1e-8 && Math.abs(from.frameX - to.frameX) < 1e-8;

/** Install once on a preserved Lab, without touching its process clock or pause. */
export function installSmoothCamera(lab, options = {}) {
  if (lab.cameraTransition) return lab.cameraTransition;
  const duration = options.duration ?? 900;
  const maxFrameDelta = options.maxFrameDelta ?? 80;
  const now = options.now ?? (() => performance.now());
  const viewport = options.viewport ?? (() => ({ width: innerWidth, height: innerHeight }));
  const camera = lab.camera;
  const controls = lab.controlsOrbit;
  const applyView = lab._applyView.bind(lab);
  const orbitUpdate = controls.update.bind(controls);
  let transition = null;
  let previous = null;
  let initialized = false;
  let serial = 0;
  // Camera motion is explicit even when a structure has remained paused for 9 s.
  lab.o.autoOrbit = false;
  controls.autoRotate = false;

  function capture() {
    return {
      position: camera.position.toArray(),
      target: controls.target.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
      frameX: camera.view?.enabled ? -camera.view.offsetX / camera.view.fullWidth : 0,
    };
  }

  function apply(pose) {
    camera.position.fromArray(pose.position);
    controls.target.fromArray(pose.target);
    camera.quaternion.fromArray(pose.quaternion);
    camera.fov = pose.fov;
    const { width, height } = viewport();
    camera.setViewOffset(width, height, -pose.frameX * width, 0, width, height);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  function clearInertia() {
    // OrbitControls r170 keeps these public instance fields after pointer release.
    controls._sphericalDelta?.set(0, 0, 0);
    controls._panOffset?.set(0, 0, 0);
    if ('_scale' in controls) controls._scale = 1;
  }

  lab._applyView = (view) => {
    if (!initialized || lab.filmMode) {
      initialized = true;
      applyView(view);
      clearInertia();
      return;
    }
    const from = capture();
    applyView(view);
    const to = capture();
    apply(from);
    if (transition && equalPose(to, transition.to)) return;
    clearInertia();
    if (equalPose(from, to)) return;
    transition = { id: ++serial, from, to, updatedAt: now(), elapsed: 0, duration };
    previous = transition;
  };

  function update() {
    if (!transition) return false;
    const timestamp = now();
    // A stalled GPU must still display intermediate poses when it resumes.
    // Normal frames complete in 900 ms; long frames slow the camera, not skip it.
    transition.elapsed += Math.min(maxFrameDelta, Math.max(0, timestamp - transition.updatedAt));
    transition.updatedAt = timestamp;
    const fraction = clamp(transition.elapsed / transition.duration);
    apply(interpolateCameraPose(transition.from, transition.to, fraction));
    if (fraction >= 1) transition = null;
    return true;
  }

  controls.update = (delta) => update() || orbitUpdate(delta);
  const cancel = () => { transition = null; clearInertia(); };
  controls.addEventListener('start', cancel);
  const api = {
    update,
    cancel,
    finish() {
      if (transition) { apply(transition.to); transition.elapsed = transition.duration; }
      transition = null;
    },
    state() {
      const item = transition || previous;
      return {
        active: Boolean(transition),
        id: item?.id ?? 0,
        duration,
        progress: item ? clamp(item.elapsed / item.duration) : 1,
        current: capture(),
        from: item ? structuredCopy(item.from) : null,
        target: item ? structuredCopy(item.to) : null,
      };
    },
  };
  lab.cameraTransition = api;
  return api;
}
