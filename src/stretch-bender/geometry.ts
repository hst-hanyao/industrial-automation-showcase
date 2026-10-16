/**
 * Reference-led reconstruction of the user's sixteen-axis stretch bender.
 * Dimensions are estimated metres, not recovered manufacturer dimensions:
 * bed 6.60 × 1.18 × .72; side frames 1.65 high; guide 1.55 long;
 * tooling plate 1.62 × 1.04; paired rotary heads 2.70 apart at image zero.
 * Assembly: fabricated painted bed, levelling feet, lower steel slide,
 * rotary base, upper slide, white slotted uprights, Z carriage, trunnion, heading bearing,
 * fixed ball-screw guide, translating carriage, rotating chuck and jaws.
 * This file describes geometry and assembly only. Kinematics supplies every
 * position/angle; no force, stress or forming accuracy is fabricated here.
 * Z is up; local +X points inward on each mirrored head at the reference zero.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DIMENSIONS, type AxisId } from './kinematics';

export type BenderSide = 'left' | 'right';
export type BenderSideNodes = Record<
  'lower' | 'upper' | 'mirror' | 'bend' | 'frame' | 'z' | 'swing' | 'heading' | 'stretch' | 'chuck' | 'grip',
  THREE.Group
>;
export interface BenderAnchor {
  id: string;
  label: string;
  side?: BenderSide;
  node: THREE.Object3D;
  local: THREE.Vector3;
}

type XYZ = readonly [number, number, number];
type Axis = 'x' | 'y' | 'z';
type VisualJointId = Exclude<keyof BenderSideNodes, 'mirror'>;
type MaterialMap = ReturnType<typeof createBenderMaterials>;

export function createBenderMaterials() {
  const metal = (color: number, roughness = .32, metalness = .8) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  return {
    white: metal(0xe3e6df, .38, .22),
    whiteEdge: metal(0xb9c2bb, .4, .35),
    charcoal: metal(0x303b3e, .42, .35),
    graphite: metal(0x465052, .43, .5),
    black: metal(0x10191e, .48, .24),
    rubber: metal(0x171b1b, .83, .02),
    steel: metal(0xaebcc1, .24, .9),
    bright: metal(0xd3dce0, .18, .96),
    aluminium: metal(0x8d9a9d, .36, .75),
    blue: metal(0xc7e4eb, .31, .45),
    darkBlue: metal(0x547e8b, .4, .58),
    brass: metal(0xaa8751, .34, .75),
    yellow: metal(0xdcbf26, .39, .22),
    red: metal(0xb74c39, .4, .18),
    green: metal(0x579278, .38, .18),
    screen: new THREE.MeshStandardMaterial({ color: 0x142b32, emissive: 0x142b32, emissiveIntensity: .3, roughness: .25, metalness: .2 }),
  };
}

/** Parts are merged by assembly/material; joints remain independent scene nodes. */
class Parts {
  private buckets = new Map<THREE.Object3D, Map<THREE.Material, THREE.BufferGeometry[]>>();
  readonly resources = new Set<THREE.BufferGeometry>();
  add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) {
    if (geometry.index) {
      const nonIndexed = geometry.toNonIndexed(); geometry.dispose(); geometry = nonIndexed;
    }
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    // Primitive UV layouts differ; the solid painted/metal parts do not use UVs.
    geometry.deleteAttribute('uv');
    geometry.deleteAttribute('uv1');
    let perMaterial = this.buckets.get(parent);
    if (!perMaterial) { perMaterial = new Map(); this.buckets.set(parent, perMaterial); }
    let items = perMaterial.get(material);
    if (!items) { items = []; perMaterial.set(material, items); }
    items.push(geometry);
  }
  box(parent: THREE.Object3D, size: XYZ, at: XYZ, material: THREE.Material, radius = .008, rotation?: XYZ) {
    const g = new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(radius, Math.min(...size) * .35));
    if (rotation) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)));
    g.translate(...at); this.add(parent, g, material);
  }
  cylinder(parent: THREE.Object3D, radius: number, length: number, at: XYZ, material: THREE.Material, axis: Axis = 'z', radiusTop = radius, segments = 32) {
    const g = new THREE.CylinderGeometry(radiusTop, radius, length, segments, 1, false);
    if (axis === 'z') g.rotateX(Math.PI / 2);
    if (axis === 'x') g.rotateZ(-Math.PI / 2);
    g.translate(...at); this.add(parent, g, material);
  }
  ring(parent: THREE.Object3D, radius: number, tube: number, at: XYZ, material: THREE.Material, axis: Axis = 'z') {
    const g = new THREE.TorusGeometry(radius, tube, 6, 36);
    if (axis === 'y') g.rotateX(Math.PI / 2);
    if (axis === 'x') g.rotateY(Math.PI / 2);
    g.translate(...at); this.add(parent, g, material);
  }
  pipe(parent: THREE.Object3D, points: XYZ[], radius: number, material: THREE.Material, segments = 48) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    this.add(parent, new THREE.TubeGeometry(curve, segments, radius, 8, false), material);
    // Hemispherical terminal collars seal the route and meet the connector ports.
    for (const point of [points[0], points.at(-1)]) if (point) {
      const cap = new THREE.SphereGeometry(radius, 8, 6); cap.translate(...point); this.add(parent, cap, material);
    }
  }
  bolts(parent: THREE.Object3D, points: XYZ[], material: THREE.Material, radius = .009, axis: Axis = 'z') {
    for (const p of points) this.cylinder(parent, radius, radius * .8, p, material, axis, radius, 6);
  }
  boltCircle(parent: THREE.Object3D, radius: number, at: XYZ, material: THREE.Material, axis: Axis = 'z', count = 8, size = .009) {
    const points: XYZ[] = [];
    for (let n = 0; n < count; n++) {
      const a = n * Math.PI * 2 / count;
      points.push(axis === 'z' ? [at[0] + radius * Math.cos(a), at[1] + radius * Math.sin(a), at[2]]
        : axis === 'y' ? [at[0] + radius * Math.cos(a), at[1], at[2] + radius * Math.sin(a)]
          : [at[0], at[1] + radius * Math.cos(a), at[2] + radius * Math.sin(a)]);
    }
    this.bolts(parent, points, material, size, axis);
  }
  flush() {
    for (const [parent, perMaterial] of this.buckets) for (const [material, items] of perMaterial) {
      const merged = mergeGeometries(items, false);
      if (!merged) throw new Error(`Could not merge stretch-bender assembly ${parent.name}`);
      merged.computeBoundingSphere(); this.resources.add(merged);
      const mesh = new THREE.Mesh(merged, material);
      const assemblyName = parent.userData.logicalJointName ?? parent.name;
      mesh.name = `${assemblyName}:${material.name || material.uuid.slice(0, 6)}`;
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.assembly = assemblyName;
      mesh.userData.side = parent.userData.side;
      mesh.userData.axis = parent.userData.axis;
      parent.add(mesh);
      for (const geometry of items) geometry.dispose();
    }
    this.buckets.clear();
  }
}

function roundedPath(w: number, h: number, radius: number, cx = 0, cy = 0) {
  const p = new THREE.Shape();
  const x = cx - w / 2, y = cy - h / 2, r = Math.min(radius, w / 2, h / 2);
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); p.closePath();
  return p;
}

function group(parent: THREE.Object3D, name: string, at: XYZ = [0, 0, 0]) {
  const g = new THREE.Group(); g.name = name; g.position.set(...at); parent.add(g); return g;
}

function rectangleBolts(parts: Parts, parent: THREE.Object3D, width: number, depth: number, z: number, material: THREE.Material, x = 0, y = 0, inset = .045) {
  parts.bolts(parent, [-1, 1].flatMap(sx => [-1, 1].map(sy => [x + sx * (width / 2 - inset), y + sy * (depth / 2 - inset), z] as XYZ)), material);
}

function motor(parts: Parts, parent: THREE.Object3D, m: MaterialMap, center: XYZ, axis: Axis, radius = .095, length = .22, drivesAxis?: AxisId) {
  const a = group(parent, `${parent.userData.logicalJointName ?? parent.name}:motor`, center);
  // A stator belongs to its fixed support for motion, but picking selects the
  // joint it DRIVES rather than that support (e.g. swing motor carried by Z).
  a.userData.side = parent.userData.side;
  a.userData.axis = drivesAxis ?? parent.userData.axis;
  // Motors are static inside their owning assembly and merged with it below.
  parts.cylinder(a, radius, length, [0, 0, 0], m.graphite, axis);
  const along = (offset: number): XYZ => axis === 'x' ? [offset, 0, 0] : axis === 'y' ? [0, offset, 0] : [0, 0, offset];
  for (let n = 0; n < 10; n++) parts.cylinder(a, radius * 1.08, .008, along(-length / 2 + .015 + n * (length - .03) / 9), m.black, axis);
  parts.cylinder(a, radius * 1.12, .026, along(length / 2 + .012), m.aluminium, axis);
  parts.cylinder(a, radius * .9, .035, along(-length / 2 - .016), m.black, axis);
  parts.cylinder(a, radius * .7, .035, along(-length / 2 - .045), m.charcoal, axis);
  // Cable gland and terminal box are mounted onto the motor housing.
  parts.box(a, [.09, .08, .055], [0, 0, radius + .025], m.graphite, .007);
  parts.cylinder(a, .014, .035, [0, -.055, radius + .025], m.brass, 'y');
  const bracket: XYZ = axis === 'z' ? [.2, .18, .035] : [.2, .20, .035];
  parts.box(a, bracket, [0, 0, -radius - .017], m.aluminium, .006);
  rectangleBolts(parts, a, bracket[0], bracket[1], -radius + .004, m.black, 0, 0, .022);
  return a;
}

function bed(parts: Parts, staticParts: THREE.Group, m: MaterialMap) {
  const body = group(staticParts, 'stationary-bed');
  parts.box(body, [6.6, 1.18, .49], [0, 0, .455], m.charcoal, .055);
  parts.box(body, [6.52, 1.20, .07], [0, 0, .725], m.steel, .014);
  parts.box(body, [6.46, 1.10, .035], [0, 0, .775], m.black, .006);
  parts.box(body, [6.58, .075, .07], [0, -.625, .713], m.bright, .008);
  parts.box(body, [6.58, .075, .07], [0, .625, .713], m.bright, .008);
  // Separate maintenance doors, hinges, latches and ventilation strips.
  for (let i = 0; i < 5; i++) {
    const x = -2.58 + i * 1.29;
    parts.box(body, [1.255, .024, .395], [x, -.601, .445], m.graphite, .018);
    parts.box(body, [.023, .018, .14], [x + .51, -.624, .49], m.black, .004);
    for (const z of [.31, .57]) parts.box(body, [.025, .024, .055], [x - .56, -.624, z], m.aluminium, .003);
    if (i === 0 || i === 4) for (let n = 0; n < 8; n++) parts.box(body, [.33, .012, .009], [x, -.62, .34 + n * .022], m.black, .003);
  }
  for (const x of [-2.9, -1.1, 1.1, 2.9]) for (const y of [-.41, .41]) {
    parts.cylinder(body, .10, .028, [x, y, .014], m.yellow);
    parts.cylinder(body, .06, .065, [x, y, .060], m.black);
    parts.cylinder(body, .026, .12, [x, y, .14], m.steel);
    parts.cylinder(body, .04, .026, [x, y, .12], m.aluminium, 'z', .04, 6);
    parts.box(body, [.15, .15, .025], [x, y, .21], m.graphite, .008);
  }
  // Front outriggers visibly reach the floor instead of leaving the bed floating.
  for (const x of [-2.19, 2.19]) {
    parts.box(body, [.105, .11, .66], [x, -.72, .345], m.graphite, .006);
    parts.box(body, [.23, .27, .025], [x, -.72, .0125], m.charcoal, .008);
    parts.box(body, [.19, .30, .075], [x, -.64, .685], m.charcoal, .006);
    rectangleBolts(parts, body, .23, .27, .033, m.steel, x, -.72, .03);
    parts.cylinder(body, .022, .018, [x, -.783, .65], m.green, 'y');
  }
  for (const x of [-3.05, 3.05]) {
    parts.box(body, [.042, .49, .04], [x, -.69, .13], m.yellow, .004);
    parts.box(body, [.12, .035, .07], [x, -.92, .13], m.black, .004);
  }
  // Two guide levels and their counterbored mounting holes.
  for (const y of [-.44, .44]) {
    parts.box(body, [6.34, .065, .035], [0, y, .818], m.steel, .004);
    parts.box(body, [6.34, .022, .015], [0, y, .842], m.bright, .002);
    parts.bolts(body, Array.from({ length: 43 }, (_, n) => [-3.08 + n * .1465, y, .843] as XYZ), m.black, .006);
  }
  // End stops, sensors and ruler strips belong to the rails.
  for (const x of [-3.19, 3.19]) for (const y of [-.44, .44]) {
    parts.box(body, [.11, .12, .08], [x, y, .858], m.aluminium, .008);
    parts.box(body, [.026, .08, .045], [x * .982, y, .87], m.black, .003);
  }
  parts.box(body, [6.25, .024, .004], [0, -.575, .765], m.white, .001);
  for (let i = 0; i < 125; i++) parts.box(body, [.003, i % 5 === 0 ? .024 : .013, .002], [-3.1 + i * .05, -.575, .768], m.graphite, .0005);
  // Small electrical cabinet at the outer left end.
  parts.box(body, [.28, 1.16, .64], [-3.38, 0, .455], m.white, .025);
  parts.box(body, [.02, .79, .49], [-3.529, -.10, .46], m.graphite, .006);
  parts.box(body, [.024, .05, .16], [-3.547, -.38, .46], m.black, .004);
  for (let n = 0; n < 3; n++) parts.cylinder(body, .022, .018, [-3.548, -.31 + n * .12, .72], [m.red, m.green, m.darkBlue][n]!, 'x');
  // Reference image: a broad central guard hangs down from the front rail,
  // with chamfered lower corners. It is not a solid pedestal under the table.
  const guardOutline = new THREE.Shape();
  guardOutline.moveTo(-.98, .77); guardOutline.lineTo(.98, .77);
  guardOutline.lineTo(.98, .66); guardOutline.lineTo(.78, .39);
  guardOutline.lineTo(.58, .29); guardOutline.lineTo(-.58, .29);
  guardOutline.lineTo(-.78, .39); guardOutline.lineTo(-.98, .66); guardOutline.closePath();
  const guard = new THREE.ExtrudeGeometry(guardOutline, { depth: .055, bevelEnabled: true, bevelSegments: 1, bevelSize: .012, bevelThickness: .006, steps: 1 });
  guard.rotateX(Math.PI / 2); guard.translate(0, -.64, 0); parts.add(body, guard, m.charcoal);
  parts.box(body, [2.08, .15, .045], [0, -.64, .775], m.graphite, .010);
  for (const x of [-.98, .98]) {
    parts.box(body, [.065, .12, .060], [x, -.64, .828], m.charcoal, .006);
    parts.box(body, [.075, .13, .012], [x, -.64, .864], m.graphite, .004);
    parts.bolts(body, [[x, -.709, .825]], m.steel, .008, 'y');
  }
  return body;
}

const TOOLING_TABLE_DROP = .39;

function tooling(parts: Parts, parent: THREE.Group, m: MaterialMap) {
  const station = group(parent, 'central-tooling-table');
  // Lower the deck by shortening the open four-post support. The bed-mounted
  // foot plates stay seated, while the deck, backing and locating bushes follow.
  // The inward round saddles reach |X|=.304 m including their bevel. This
  // .58 m pedestal leaves 14 mm at photo zero; its feet fit fully on the plate.
  const deckBottomZ = 1.445 - TOOLING_TABLE_DROP;
  const backingThickness = .025;
  const supportTopZ = deckBottomZ - backingThickness;
  const supportBaseZ = .85;
  parts.box(station, [.58, .76, .055], [0, .045, .8225], m.graphite, .010);
  parts.box(station, [1.44, .82, backingThickness], [0, .045, deckBottomZ - backingThickness / 2], m.aluminium, .008);
  for (const x of [-.21, .21]) for (const y of [-.245, .335]) {
    parts.box(station, [.075, .075, supportTopZ - supportBaseZ], [x, y, (supportBaseZ + supportTopZ) / 2], m.aluminium, .008);
    parts.box(station, [.15, .15, .025], [x, y, .8625], m.steel, .006);
    rectangleBolts(parts, station, .15, .15, .878, m.black, x, y, .024);
  }
  parts.box(station, [1.51, .94, .008], [0, .045, 1.441 - TOOLING_TABLE_DROP], m.black, .003);
  const shape = roundedPath(1.62, 1.04, .12);
  for (let ix = 0; ix < 13; ix++) for (let iy = 0; iy < 7; iy++) {
    const hole = new THREE.Path();
    hole.absarc(-.69 + ix * .115, -.36 + iy * .12, .0155, 0, Math.PI * 2, true); shape.holes.push(hole);
  }
  const plate = new THREE.ExtrudeGeometry(shape, { depth: .065, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .004, bevelThickness: .003, curveSegments: 10 });
  plate.translate(0, .045, 1.445 - TOOLING_TABLE_DROP); parts.add(station, plate, m.blue);
  // Locating bushes occupy a few actual tooling holes.
  for (const x of [-.575, .575]) for (const y of [-.24, .24]) {
    parts.cylinder(station, .022, .018, [x, y + .045, 1.52 - TOOLING_TABLE_DROP], m.steel);
    parts.cylinder(station, .008, .020, [x, y + .045, 1.53 - TOOLING_TABLE_DROP], m.black);
  }
  return station;
}

function sideAssembly(parts: Parts, parent: THREE.Group, side: BenderSide, m: MaterialMap) {
  // The real photograph places the turntable at the INWARD end of a long arm.
  // The shared estimated inset drives both the real pivot and fixed stator.
  const inward = side === 'left' ? 1 : -1;
  const pivotInset = inward * DIMENSIONS.bendPivotInsetX;
  const lower = group(parent, `${side}:lower`, [side === 'left' ? -1.35 : 1.35, 0, .76]);
  const bend = group(lower, `${side}:bend`, [pivotInset, 0, .08]);
  const upper = group(bend, `${side}:upper`, [-pivotInset, 0, .09]);
  const mirror = group(upper, `${side}:mirror`); if (side === 'right') mirror.rotation.z = Math.PI;
  const frame = group(mirror, `${side}:frame`);
  const z = group(frame, `${side}:z`, [0, 0, .52]);
  const swing = group(z, `${side}:swing`);
  const heading = group(swing, `${side}:heading`, [0, 0, .12]);
  const stretch = group(heading, `${side}:stretch`, [.52, 0, 0]);
  const chuck = group(stretch, `${side}:chuck`);
  const grip = group(chuck, `${side}:grip`, [.16, 0, 0]);
  const nodes: BenderSideNodes = { lower, upper, mirror, bend, frame, z, swing, heading, stretch, chuck, grip };
  for (const [axis, node] of Object.entries(nodes)) { node.userData.side = side; node.userData.axis = axis; }

  // Logical transforms remain proper rotations and exactly match FK. Every
  // joint has its OWN visual child; downstream joints never inherit a visual
  // reflection. Canonical geometry is authored once in left-side coordinates.
  // Before the inward-facing head adapter, right parts reflect local X. After
  // its Rz(pi), local-Y reflection cancels the unwanted fore/aft inversion.
  const visualNodes = {} as Record<VisualJointId, THREE.Group>;
  for (const axis of ['lower', 'bend', 'upper', 'frame', 'z', 'swing', 'heading', 'stretch', 'chuck', 'grip'] as const) {
    const visual = group(nodes[axis], `${side}:${axis}:visual`);
    visual.userData.side = side; visual.userData.axis = axis;
    visual.userData.logicalJointName = nodes[axis].name;
    if (side === 'right') {
      if (axis === 'lower' || axis === 'bend' || axis === 'upper') visual.scale.x = -1;
      else visual.scale.y = -1;
    }
    visualNodes[axis] = visual;
  }

  {
  const { lower, bend, upper, frame, z, swing, heading, stretch, chuck, grip } = visualNodes;
  const inward = 1;
  const pivotInset = DIMENSIONS.bendPivotInsetX;

  // The lower saddle has a genuine turntable pocket, so its stationary support
  // does not occupy the same solid volume as the rotary bearing above it.
  const lowerOutline = new THREE.Shape();
  lowerOutline.moveTo(inward * -1.75, -.51);
  lowerOutline.lineTo(inward * (DIMENSIONS.bendPivotInsetX - .50), -.51);
  lowerOutline.lineTo(pivotInset, -.39);
  for (let i = 1; i <= 32; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 32;
    lowerOutline.lineTo(pivotInset + inward * .39 * Math.cos(a), .39 * Math.sin(a));
  }
  lowerOutline.lineTo(inward * (DIMENSIONS.bendPivotInsetX - .50), .51);
  lowerOutline.lineTo(inward * -1.75, .51); lowerOutline.closePath();
  const pocket = new THREE.Path(); pocket.absarc(pivotInset, 0, .366, 0, Math.PI * 2, true); lowerOutline.holes.push(pocket);
  const lowerPlate = new THREE.ExtrudeGeometry(lowerOutline, { depth: .090, bevelEnabled: true, bevelSegments: 1, bevelSize: .006, bevelThickness: .004, steps: 1, curveSegments: 24 });
  lowerPlate.translate(0, 0, -.0025); parts.add(lower, lowerPlate, m.white);
  for (const x of [-.54, .54]) for (const y of [-.44, .44]) {
    parts.box(lower, [.25, .14, .078], [x, y, .03], m.graphite, .008);
    parts.box(lower, [.27, .13, .014], [x, y, .076], m.steel, .003);
    parts.bolts(lower, [x - .08, x + .08].map(bx => [bx, y, .086] as XYZ), m.black, .007);
  }
  motor(parts, lower, m, [-.54, -.40, -.025], 'x', .065, .17);
  // Return-chain attachment is bolted onto the front edge of the lower arm.
  parts.box(lower, [.15, .25, .08], [-inward * .50, -inward * .59, .02], m.aluminium, .008);

  // Fixed outer bearing and drive housing belong to the LOWER saddle. They
  // translate with it, but never follow the bend angle or upper-slide travel.
  const bendMount = group(lower, `${side}:bend-fixed-mount`, [pivotInset, 0, .08]);
  bendMount.userData.side = side; bendMount.userData.axis = 'bend'; bendMount.userData.fixedDrive = true;
  parts.box(lower, [.87, .80, .035], [pivotInset, 0, .01], m.graphite, .012);
  const bearingOutline = new THREE.Shape(); bearingOutline.absarc(0, 0, .360, 0, Math.PI * 2, false);
  const innerBearing = new THREE.Path(); innerBearing.absarc(0, 0, .286, 0, Math.PI * 2, true); bearingOutline.holes.push(innerBearing);
  const fixedBearing = new THREE.ExtrudeGeometry(bearingOutline, { depth: .065, bevelEnabled: false, steps: 1, curveSegments: 48 });
  fixedBearing.translate(pivotInset, 0, .025); parts.add(lower, fixedBearing, m.white);
  parts.boltCircle(lower, .328, [pivotInset, 0, .094], m.steel, 'z', 12, .008);
  parts.cylinder(bend, .282, .037, [0, 0, -.006], m.steel);
  parts.ring(bend, .285, .003, [0, 0, .011], m.black);
  parts.box(bendMount, [.20, .20, .10], [0, -inward * .46, .025], m.graphite, .012);
  parts.cylinder(bendMount, .065, .09, [0, -inward * .565, .025], m.aluminium, 'y');
  parts.cylinder(bendMount, .025, .21, [0, -inward * .32, .025], m.steel, 'y');
  for (const y of [-inward * .46]) parts.bolts(bendMount, [-.07, .07].map(x => [x, y, .08] as XYZ), m.steel, .008);

  // The complete upper guide turns with BEND; its carriage alone translates.
  // A long white carrier extends from the inner circular pivot to the outboard
  // chain return. The guide is centred under the original reference upright.
  const railOriginX = -pivotInset;
  const armOuter = -(DIMENSIONS.bendPivotInsetX + 1.70), armInner = .10;
  parts.box(bend, [armInner - armOuter, .76, .021], [inward * (armOuter + armInner) / 2, 0, .023], m.white, .010);
  for (const y of [-.30, .30]) {
    parts.box(bend, [1.39, .065, .025], [railOriginX, y, .043], m.bright, .004);
    parts.bolts(bend, Array.from({ length: 10 }, (_, n) => [railOriginX - .61 + n * .135, y, .0535] as XYZ), m.black, .006);
    for (const x of [-.22, .22]) {
      // U-section bearing trucks visibly straddle the fixed upper rail.
      for (const dy of [-.05, .05]) parts.box(upper, [.18, .024, .035], [x, y + dy, -.0425], m.darkBlue, .004);
      parts.box(upper, [.18, .124, .014], [x, y, -.022], m.darkBlue, .004);
    }
  }
  parts.box(upper, [.75, .76, .040], [0, 0, .005], m.white, .012);
  rectangleBolts(parts, upper, .75, .76, .030, m.steel);
  motor(parts, bend, m, [railOriginX - .39, .27, -.004], 'x', .058, .14, 'upper');
  parts.box(bend, [.10, .14, .060], [-inward * 1.55, inward * .26, .035], m.graphite, .006);
  parts.box(upper, [.075, .12, .13], [-inward * .23, inward * .26, .06], m.aluminium, .006);
  // This riser closes the stack to the original upright foot height (1.0175 m)
  // while frame/grip zero coordinates remain exactly those of the photo pose.
  parts.box(frame, [.36, .60, .0625], [0, 0, .05625], m.white, .009);

  for (const y of [-.24, .24]) {
    const outline = roundedPath(.27, 1.65, .025, 0, .92);
    for (const cz of [.40, .71, 1.02, 1.33]) outline.holes.push(roundedPath(.075, .19, .013, 0, cz));
    const plate = new THREE.ExtrudeGeometry(outline, { depth: .065, bevelEnabled: true, bevelSegments: 1, bevelSize: .004, bevelThickness: .004, steps: 1, curveSegments: 5 });
    plate.rotateX(Math.PI / 2); plate.translate(0, y + .0325, 0); parts.add(frame, plate, m.white);
    parts.box(frame, [.40, .19, .055], [0, y, .115], m.white, .012);
    rectangleBolts(parts, frame, .40, .19, .147, m.steel, 0, y, .035);
    parts.bolts(frame, [.26, 1.56].flatMap(cz => [-.085, .085].map(x => [x, y - .038, cz] as XYZ)), m.steel, .009, 'y');
  }
  parts.box(frame, [.28, .42, .11], [0, 0, 1.64], m.white, .016);
  // Upright linear guides and ball screw, with actual sliding bearing blocks.
  for (const y of [-.15, .15]) {
    parts.box(frame, [.032, .032, 1.40], [.035, y, .89], m.bright, .004);
    parts.box(z, [.065, .08, .27], [.035, y, .04], m.aluminium, .007);
  }
  parts.cylinder(frame, .017, 1.44, [-.065, 0, .90], m.steel);
  for (const cz of [.20, 1.60]) parts.box(frame, [.12, .14, .08], [-.065, 0, cz], m.aluminium, .009);
  parts.cylinder(z, .042, .11, [-.065, 0, .02], m.brass);
  parts.box(z, [.27, .45, .29], [.035, 0, .015], m.white, .016);
  rectangleBolts(parts, z, .27, .45, .165, m.steel, .035, 0, .025);
  motor(parts, frame, m, [-.065, 0, 1.83], 'z', .088, .23, 'z');
  parts.box(frame, [.43, .61, .38], [-.24, 0, 1.62], m.aluminium, .015);
  parts.box(frame, [.018, .49, .29], [-.465, 0, 1.62], m.white, .006);
  for (const y of [-.29, .29]) parts.box(frame, [.31, .015, .28], [-.24, y, 1.62], m.whiteEdge, .007);
  parts.bolts(frame, [-.21, .21].flatMap(y => [1.50, 1.74].map(cz => [-.48, y, cz] as XYZ)), m.black, .006, 'x');
  parts.box(frame, [.20, .21, .025], [.01, 0, 1.64], m.darkBlue, .006);
  parts.box(frame, [.08, .09, .06], [-.065, .29, 1.38], m.graphite, .006);
  parts.box(z, [.20, .05, .05], [.23, .23, .16], m.aluminium, .005);
  parts.box(z, [.05, .13, .05], [.31, .29, .16], m.aluminium, .005);

  // Trunnion motor and bearings: local-Y axis, in the user's marked location.
  for (const y of [-.24, .24]) {
    parts.cylinder(z, .105, .055, [0, y, 0], m.aluminium, 'y');
    parts.cylinder(z, .072, .025, [0, y + (y < 0 ? -.04 : .04), 0], m.steel, 'y');
    parts.boltCircle(z, .083, [0, y + (y < 0 ? -.031 : .031), 0], m.black, 'y', 6, .007);
  }
  motor(parts, z, m, [0, -.39, 0], 'y', .085, .19, 'swing');
  parts.cylinder(swing, .039, .49, [0, 0, 0], m.bright, 'y');
  parts.box(swing, [.70, .33, .10], [-.14, 0, .035], m.aluminium, .015);
  parts.box(swing, [.25, .25, .115], [0, 0, .075], m.graphite, .016);
  rectangleBolts(parts, swing, .7, .33, .091, m.steel, -.14, 0, .03);
  // Heading bearing about local Z; its guide follows the swing's local frame.
  parts.cylinder(heading, .151, .047, [0, 0, -.01], m.graphite);
  parts.cylinder(heading, .132, .032, [0, 0, .026], m.steel);
  parts.boltCircle(heading, .12, [0, 0, .045], m.black, 'z', 8, .007);
  motor(parts, swing, m, [-.24, .02, .20], 'z', .064, .14, 'heading');
  parts.box(heading, [1.54, .30, .072], [-.12, 0, -.055], m.aluminium, .012);
  for (const y of [-.112, .112]) {
    parts.box(heading, [1.43, .043, .028], [-.12, y, -.005], m.graphite, .004);
    parts.box(heading, [1.43, .026, .023], [-.12, y, .020], m.bright, .004);
    parts.bolts(heading, Array.from({ length: 11 }, (_, n) => [-.77 + n * .13, y, .035] as XYZ), m.black, .005);
  }
  parts.cylinder(heading, .017, 1.28, [-.10, 0, .045], m.steel, 'x');
  const helix: XYZ[] = [];
  for (let i = 0; i <= 900; i++) {
    const t = i / 900, a = t * Math.PI * 2 * 42;
    helix.push([-.73 + t * 1.22, .0185 * Math.cos(a), .045 + .0185 * Math.sin(a)]);
  }
  parts.pipe(heading, helix, .0017, m.bright, 900);
  for (const x of [-.79, .57]) {
    parts.box(heading, [.08, .19, .12], [x, 0, .027], m.aluminium, .008);
    parts.cylinder(heading, .038, .025, [x + (x < 0 ? -.05 : .05), 0, .045], m.graphite, 'x');
  }
  motor(parts, heading, m, [-.97, 0, .055], 'x', .09, .23, 'stretch');
  parts.box(heading, [.17, .24, .045], [-.96, 0, -.075], m.aluminium, .006);

  // Linear carriage and chuck rotation are intentionally different nodes.
  for (const y of [-.112, .112]) parts.box(stretch, [.22, .08, .078], [-.05, y, .045], m.darkBlue, .007);
  parts.box(stretch, [.30, .31, .045], [-.04, 0, .103], m.steel, .009);
  rectangleBolts(parts, stretch, .30, .31, .131, m.black, -.04, 0, .035);
  parts.box(stretch, [.17, .27, .20], [.035, 0, .032], m.graphite, .016);
  parts.cylinder(stretch, .104, .13, [.02, 0, 0], m.aluminium, 'x');
  parts.boltCircle(stretch, .085, [.09, 0, 0], m.black, 'x', 8, .006);
  parts.cylinder(chuck, .083, .085, [.105, 0, 0], m.steel, 'x');
  parts.cylinder(chuck, .096, .027, [.152, 0, 0], m.graphite, 'x');
  parts.boltCircle(chuck, .075, [.169, 0, 0], m.steel, 'x', 6, .006);
  // Opposed jaws form a visible throat on the inward side.
  for (const y of [-.048, .048]) {
    parts.box(grip, [.15, .058, .105], [.075, y, 0], m.graphite, .007);
    parts.box(grip, [.085, .012, .074], [.115, y < 0 ? -.014 : .014, 0], m.steel, .002);
    parts.bolts(grip, [.027, .115].map(x => [x, y, .058] as XYZ), m.steel, .007);
    // Contact serrations finish on the jaw's own face.
    for (let n = 0; n < 7; n++) parts.box(grip, [.003, .0025, .068], [.077 + n * .011, y < 0 ? -.007 : .007, 0], m.black, .0005);
  }

  // Local service loops route outside the spindle, connected at real glands.
  parts.box(heading, [.10, .12, .09], [-.40, -.17, .08], m.graphite, .008);
  parts.pipe(heading, [[-.95, -.055, .17], [-.92, -.20, .45], [-.59, -.23, .49], [-.40, -.20, .13]], .012, m.rubber);
  parts.cylinder(heading, .023, .035, [-.40, -.20, .13], m.brass);
  parts.cylinder(heading, .020, .035, [-.95, -.055, .17], m.brass);
  parts.box(frame, [.075, .04, .07], [-.12, .278, .71], m.graphite, .005);
  parts.pipe(frame, [[-.38, .327, 1.47], [-.50, .40, 1.11], [-.29, .40, .77], [-.13, .317, .71]], .011, m.rubber);
  parts.cylinder(frame, .022, .035, [-.38, .32, 1.47], m.brass, 'y');
  parts.cylinder(frame, .022, .035, [-.13, .305, .71], m.brass, 'y');
  }
  return nodes;
}

function dragChain(parts: Parts, frame: THREE.Group, zNode: THREE.Group, m: MaterialMap) {
  const count = 55;
  const geometry = new RoundedBoxGeometry(.096, .105, .043, 1, .008);
  const links = new THREE.InstancedMesh(geometry, m.rubber, count);
  const assemblyName = frame.userData.logicalJointName ?? frame.name;
  links.name = `${assemblyName}:vertical-energy-chain`; links.castShadow = true; links.receiveShadow = true;
  frame.add(links); parts.resources.add(geometry);
  const pinGeo = new THREE.CylinderGeometry(.007, .007, .111, 8); pinGeo.rotateX(Math.PI / 2);
  const pins = new THREE.InstancedMesh(pinGeo, m.graphite, count);
  pins.name = `${assemblyName}:energy-chain-pins`; frame.add(pins); parts.resources.add(pinGeo);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1);
  const from = new THREE.Vector3(0, 0, 1);
  let previousZ = Number.NaN;
  function update() {
    if (zNode.position.z === previousZ) return;
    previousZ = zNode.position.z;
    const endZ = zNode.position.z + .16;
    const arch = Math.max(2.14, endZ + .25);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.065, .33, 1.38),
      new THREE.Vector3(-.065, .33, arch - .12),
      new THREE.Vector3(.13, .33, arch),
      new THREE.Vector3(.31, .33, arch - .14),
      new THREE.Vector3(.31, .33, endZ),
    ], false, 'centripetal');
    const spacing = curve.getLength() / (count - 1);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1), p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
      q.setFromUnitVectors(from, tangent); scale.set(1, 1, Math.max(.6, spacing / .043));
      matrix.compose(p, q, scale); links.setMatrixAt(i, matrix);
      matrix.compose(p, q, new THREE.Vector3(1, 1, 1)); pins.setMatrixAt(i, matrix);
    }
    links.instanceMatrix.needsUpdate = true; pins.instanceMatrix.needsUpdate = true;
    links.computeBoundingSphere(); pins.computeBoundingSphere();
  }
  update(); return update;
}

/** Horizontal energy chain: two straight legs and a constant-radius U return.
 * In-range motion moves the return by half the endpoint travel, preserving the
 * routed chain length. Links rotate at their pins rather than accordion-scale.
 */
function horizontalDragChain(parts: Parts, parent: THREE.Group, side: BenderSide, axis: 'lower' | 'upper', m: MaterialMap, options: {
  fixedX: number; mobileX: () => number; y: number; z: number; radius: number; length: number;
}) {
  const carrier = group(parent, `${side}:${axis}-horizontal-energy-chain`);
  carrier.userData.side = side; carrier.userData.axis = axis;
  if (side === 'right') carrier.scale.x = -1;
  const count = axis === 'lower' ? 70 : 60;
  const walls: THREE.BufferGeometry[] = [];
  for (const y of [-.051, .051]) {
    const g = new RoundedBoxGeometry(.050, .018, .030, 1, .003); g.translate(0, y, 0); walls.push(g);
  }
  const bottom = new RoundedBoxGeometry(.010, .092, .030, 1, .002); bottom.translate(-.020, 0, 0); walls.push(bottom);
  const bar = new RoundedBoxGeometry(.010, .092, .010, 1, .002); bar.translate(.020, 0, .008); walls.push(bar);
  const linkGeometry = mergeGeometries(walls, false)!;
  for (const g of walls) g.dispose();
  parts.resources.add(linkGeometry);
  const links = new THREE.InstancedMesh(linkGeometry, m.rubber, count);
  links.name = `${carrier.name}:articulated-links`; links.castShadow = true; links.receiveShadow = true; carrier.add(links);
  const pinCaps: THREE.BufferGeometry[] = [];
  for (const y of [-.063, .063]) {
    const g = new THREE.CylinderGeometry(.008, .008, .005, 10).toNonIndexed(); g.translate(0, y, -.009); pinCaps.push(g);
  }
  const pinGeometry = mergeGeometries(pinCaps, false)!; for (const g of pinCaps) g.dispose();
  parts.resources.add(pinGeometry);
  const pins = new THREE.InstancedMesh(pinGeometry, m.yellow, count);
  pins.name = `${carrier.name}:yellow-pin-caps`; carrier.add(pins);
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1);
  const longAxis = new THREE.Vector3(0, 0, 1), position = new THREE.Vector3(), tangent = new THREE.Vector3();
  let previousMobile = Number.NaN;
  function update() {
    const raw = options.mobileX();
    // Numeric positions are not clipped. Only this flexible accessory's preview
    // is bounded far beyond the unmeasured travel to keep GPU matrices finite.
    const moving = Number.isFinite(raw) ? THREE.MathUtils.clamp(raw, -10000, 10000) : 0;
    if (moving === previousMobile) return; previousMobile = moving;
    const arc = Math.PI * options.radius;
    // Outside the illustrative travel, extend the accessory instead of making
    // a negative straight leg, NaN, or an inverted bend. Drive pose is untouched.
    const length = Math.max(options.length, Math.abs(moving - options.fixedX) + arc + .10);
    const returnX = options.fixedX / 2 + moving / 2 - (length - arc) / 2;
    const firstLeg = Math.max(0, options.fixedX - returnX);
    const pitch = length / (count - 1);
    for (let i = 0; i < count; i++) {
      const distance = i * pitch;
      if (distance <= firstLeg) {
        position.set(options.fixedX - distance, options.y, options.z); tangent.set(-1, 0, 0);
      } else if (distance <= firstLeg + arc) {
        const angle = -Math.PI / 2 - (distance - firstLeg) / options.radius;
        position.set(returnX + options.radius * Math.cos(angle), options.y, options.z + options.radius + options.radius * Math.sin(angle));
        tangent.set(Math.sin(angle), 0, -Math.cos(angle));
      } else {
        position.set(returnX + distance - firstLeg - arc, options.y, options.z + 2 * options.radius); tangent.set(1, 0, 0);
      }
      rotation.setFromUnitVectors(longAxis, tangent);
      scale.set(1, 1, pitch / .030); matrix.compose(position, rotation, scale); links.setMatrixAt(i, matrix);
      scale.set(1, 1, 1); matrix.compose(position, rotation, scale); pins.setMatrixAt(i, matrix);
    }
    links.instanceMatrix.needsUpdate = true; pins.instanceMatrix.needsUpdate = true;
    links.computeBoundingSphere(); pins.computeBoundingSphere();
  }
  update(); return update;
}

function consoleGeometry(parts: Parts, parent: THREE.Group, m: MaterialMap) {
  const c = group(parent, 'operator-console', [3.55, -.79, 0]);
  for (const y of [-.24, .24]) {
    parts.box(c, [.69, .065, .055], [0, y, .10], m.graphite, .015);
    for (const x of [-.27, .27]) {
      parts.cylinder(c, .047, .033, [x, y, .047], m.rubber, 'x');
      parts.box(c, [.035, .035, .06], [x, y, .095], m.steel, .005);
    }
  }
  parts.box(c, [.105, .11, 1.18], [0, .08, .68], m.graphite, .012);
  parts.box(c, [.23, .22, .055], [0, .08, .15], m.charcoal, .01);
  const screen = group(c, 'operator-console:screen', [0, .02, 1.54]); screen.rotation.x = -.12;
  parts.box(screen, [.66, .17, .57], [0, 0, 0], m.charcoal, .023);
  parts.box(screen, [.58, .024, .48], [0, -.099, .01], m.black, .012);
  parts.box(screen, [.50, .006, .38], [-.015, -.115, .025], m.screen, .007);
  // Quiet screen graphics, no invented machine measurements.
  parts.box(screen, [.42, .003, .013], [-.02, -.12, .175], m.darkBlue, .002);
  for (let row = 0; row < 4; row++) {
    parts.box(screen, [.12, .004, .009], [-.14, -.121, .09 - row * .055], m.whiteEdge, .002);
    parts.box(screen, [.11 + row * .012, .004, .009], [.075, -.121, .09 - row * .055], m.darkBlue, .002);
  }
  for (const z of [-.16, -.10, -.04]) parts.cylinder(screen, .009, .011, [.288, -.095, z], m.graphite, 'y');
  parts.box(c, [.67, .45, .055], [0, -.12, 1.235], m.white, .02, [.11, 0, 0]);
  parts.box(c, [.57, .33, .012], [0, -.14, 1.273], m.graphite, .012, [.11, 0, 0]);
  for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) {
    const x = -.23 + col * .085, y = -.05 - row * .14;
    parts.cylinder(c, .018, .018, [x, y, 1.282 + (y + .12) * .11], col === 0 ? m.green : m.whiteEdge);
    parts.ring(c, .019, .003, [x, y, 1.291 + (y + .12) * .11], m.black);
  }
  parts.cylinder(c, .041, .012, [.245, -.17, 1.282], m.yellow);
  parts.cylinder(c, .027, .034, [.245, -.17, 1.305], m.red);
  return c;
}

function nameplate(parent: THREE.Group, resources: Set<THREE.BufferGeometry>) {
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 180;
  const ctx = canvas.getContext('2d'); if (!ctx) return undefined;
  ctx.fillStyle = '#263439'; ctx.fillRect(0, 0, 1024, 180);
  ctx.fillStyle = '#8cc2ca'; ctx.font = '500 48px monospace'; ctx.fillText('STRETCH  /  16 AXIS', 40, 77);
  ctx.fillStyle = '#a4b1ac'; ctx.font = '26px monospace'; ctx.fillText('THREE-DIMENSIONAL FORMING', 42, 132);
  ctx.fillStyle = '#cfbb55'; ctx.fillRect(42, 151, 380, 4);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: .53, metalness: .22 });
  const geometry = new THREE.PlaneGeometry(1.55, .30); resources.add(geometry);
  const plaque = new THREE.Mesh(geometry, material); plaque.name = 'bed-identification-plaque';
  plaque.position.set(0, -.707, .565); plaque.rotation.x = Math.PI / 2; parent.add(plaque);
  return { texture, material };
}

export function buildBender() {
  const root = new THREE.Group(); root.name = 'sixteen-axis-stretch-bender';
  const staticParts = group(root, 'static-assemblies');
  const materials = createBenderMaterials();
  for (const [name, material] of Object.entries(materials)) material.name = `bender-${name}`;
  const parts = new Parts();
  const bedNode = bed(parts, staticParts, materials);
  const toolingNode = tooling(parts, staticParts, materials);
  const consoleNode = consoleGeometry(parts, staticParts, materials);
  const left = sideAssembly(parts, root, 'left', materials);
  const right = sideAssembly(parts, root, 'right', materials);
  const sides = { left, right };
  // The supplied photograph identifies BOTH black horizontal returns as cable
  // carriers. Their fixed/moving ends span bed→lower and bend→upper respectively.
  const horizontalUpdates = (['left', 'right'] as const).flatMap(side => {
    const s = sides[side];
    const inward = side === 'left' ? 1 : -1;
    const fixedMount = group(staticParts, `${side}:lower-chain-fixed-mount`);
    fixedMount.userData.side = side; fixedMount.userData.axis = 'lower';
    if (side === 'right') fixedMount.scale.x = -1;
    parts.box(fixedMount, [.12, .12, .06], [-2.30, -.64, .66], materials.graphite, .007);
    parts.box(fixedMount, [.98, .14, .025], [-2.66, -.68, .6325], materials.black, .005);
    const lowerUpdate = horizontalDragChain(parts, staticParts, side, 'lower', materials, {
      fixedX: -2.30, mobileX: () => inward * s.lower.position.x - .50, y: -.68, z: .67, radius: .075, length: 2.20,
    });
    const upperUpdate = horizontalDragChain(parts, s.bend, side, 'upper', materials, {
      fixedX: -1.55, mobileX: () => inward * s.upper.position.x - .23, y: .26, z: .055, radius: .080, length: 1.85,
    });
    return [lowerUpdate, upperUpdate];
  });
  const leftFrameVisual = left.frame.getObjectByName('left:frame:visual') as THREE.Group;
  const rightFrameVisual = right.frame.getObjectByName('right:frame:visual') as THREE.Group;
  const chainUpdates = [dragChain(parts, leftFrameVisual, left.z, materials), dragChain(parts, rightFrameVisual, right.z, materials)];
  parts.flush();
  const plaque = nameplate(staticParts, parts.resources);
  const anchors: BenderAnchor[] = [
    { id: 'bed', label: '固定床身', node: bedNode, local: new THREE.Vector3(-2.6, -.60, .48) },
    { id: 'tooling', label: '中央工装台', node: toolingNode, local: new THREE.Vector3(0, .10, 1.51 - TOOLING_TABLE_DROP) },
    { id: 'console', label: '操作台', node: consoleNode, local: new THREE.Vector3(0, -.10, 1.70) },
  ];
  const names = { lower: '下层滑台', upper: '上层滑台', bend: '拉弯轴', z: 'Z 轴', swing: '摆臂旋转', heading: '引申旋转', stretch: '引申轴', chuck: '夹头旋转' };
  const positions: Record<keyof typeof names, XYZ> = { lower: [-.5, -.48, .06], upper: [.16, -.33, .08], bend: [0, -.23, .07], z: [.04, -.26, .12], swing: [0, -.43, 0], heading: [-.24, .02, .11], stretch: [-.06, -.10, .15], chuck: [.16, 0, .05] };
  for (const side of ['left', 'right'] as const) for (const axis of Object.keys(names) as (keyof typeof names)[]) {
    const local = new THREE.Vector3(...positions[axis]);
    if (side === 'right') {
      if (axis === 'lower' || axis === 'bend' || axis === 'upper') local.x *= -1;
      else local.y *= -1;
    }
    anchors.push({ id: `${side}:${axis}`, label: `${side === 'left' ? '左' : '右'} · ${names[axis]}`, side, node: sides[side][axis], local });
  }
  function updateDetails() {
    for (const update of horizontalUpdates) update();
    for (const update of chainUpdates) update();
    root.updateMatrixWorld(true);
  }
  updateDetails();
  function dispose() {
    for (const geometry of parts.resources) geometry.dispose();
    for (const material of Object.values(materials)) material.dispose();
    plaque?.texture.dispose(); plaque?.material.dispose();
  }
  return { root, sides, anchors, staticParts, materials, updateDetails, dispose };
}

export type BenderModel = ReturnType<typeof buildBender>;
