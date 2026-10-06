import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { CABIN, DEG, add, mul, norm, simulate, sub } from "./fit.js";

const $ = (id) => document.getElementById(id);
const DESIGN = simulate({ heightM: 1.75, legRatio: 1, shoulderScale: 1, seatbackDeg: 22 });
const PRESETS = {
  compact: { height: 158, leg: 0.96, shoulder: 0.92, seatback: 20 },
  average: { height: 175, leg: 1, shoulder: 1, seatback: 22 },
  tall: { height: 190, leg: 1.06, shoulder: 1.08, seatback: 24 },
};
const NEUTRAL = {
  rearview: norm({ x: -0.92, y: 0, z: -0.28 }),
  left: norm({ x: -0.9, y: 0.35, z: -0.08 }),
  right: norm({ x: -0.9, y: -0.35, z: -0.08 }),
};
const HOME = { pos: [3.3, 4.5, 2.15], target: [0.1, 0.05, 0.72] };

const stage = $("stage");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
stage.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const scene = new THREE.Scene();
scene.environment = envMap;
scene.background = new THREE.Color(0x7f93a8);
scene.fog = new THREE.Fog(0x7f93a8, 12, 28);

const camera = new THREE.PerspectiveCamera(40, 1, 0.08, 80);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(...HOME.target);
camera.position.set(...HOME.pos);
controls.update();

scene.add(new THREE.HemisphereLight(0xd5e4f0, 0x3a3e44, 1.1));
const sun = new THREE.DirectionalLight(0xfff4e8, 2.4);
sun.position.set(5, 7, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -8;
sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -8;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 30;
scene.add(sun);
const cabinLight = new THREE.PointLight(0xfff1dd, 6, 6);
cabinLight.position.set(0.15, 0, 1.2);
scene.add(cabinLight);
const rim = new THREE.DirectionalLight(0x8ebfff, 0.85);
rim.position.set(-6, -4, 6);
scene.add(rim);

const paint = new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.38, metalness: 0.04 });
const black = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.6 });
const glass = new THREE.MeshStandardMaterial({
  color: 0x8ea8b8,
  roughness: 0.05,
  metalness: 0.1,
  transparent: true,
  opacity: 0.28,
  side: THREE.DoubleSide,
});
const chrome = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.25, metalness: 0.85 });
const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.8 });
const mirrorMat = new THREE.MeshStandardMaterial({
  color: 0xd5e4ee,
  roughness: 0.02,
  metalness: 1,
  envMapIntensity: 1.4,
});
mirrorMat.emissive = new THREE.Color(0x9fd4ff);
const skinMat = new THREE.MeshStandardMaterial({ color: 0xd7a07a, roughness: 0.55 });
const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.7 });
const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.7 });
const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2c333c, roughness: 0.75 });
const shoeMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.5 });
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.4 });

function box(parent, sx, sy, sz, x, y, z, material, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x4c5158, roughness: 1 }),
);
ground.receiveShadow = true;
scene.add(ground);
const road = new THREE.Mesh(
  new THREE.PlaneGeometry(26, 3.6),
  new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 1 }),
);
road.position.set(4.2, 0, 0.003);
road.receiveShadow = true;
scene.add(road);
const dashMat = new THREE.MeshStandardMaterial({ color: 0xe4dcc8, roughness: 0.55 });
for (let i = 0; i < 9; i += 1) {
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.07, 0.008), dashMat);
  dash.position.set(2.1 + i * 1.7, 0, 0.02);
  scene.add(dash);
}
const chaseMat = new THREE.MeshStandardMaterial({ color: 0xb4332c, roughness: 0.48 });
const chase = new THREE.Group();
box(chase, 1.7, 1.5, 0.46, 0, 0, 0.4, chaseMat);
box(chase, 0.62, 1.15, 0.26, -0.32, 0, 0.78, chaseMat);
chase.position.set(-5.6, 0.2, 0);
scene.add(chase);
const postMat = new THREE.MeshStandardMaterial({ color: 0xe2a52b, roughness: 0.5 });
for (const y of [1.75, -1.75]) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 8), postMat);
  post.rotation.x = Math.PI / 2;
  post.position.set(-3.4, y, 0.48);
  scene.add(post);
}
const grid = new THREE.GridHelper(24, 24, 0x9aa3ad, 0x6a727c);
grid.rotation.x = Math.PI / 2;
grid.position.z = 0.004;
scene.add(grid);

const car = new THREE.Group();
scene.add(car);
const tailLight = new THREE.MeshStandardMaterial({ color: 0x9a1c16, roughness: 0.45 });
box(car, 1.45, 1.76, 0.58, 1.4, 0, 0.52, paint);
box(car, 1.25, 1.76, 0.64, -1.45, 0, 0.55, paint);
box(car, 1.55, 1.55, 0.06, -0.05, 0, 0.24, black);
box(car, 1.2, 1.46, 0.06, -0.08, 0, 1.36, black);
const lampMat = new THREE.MeshStandardMaterial({
  color: 0xfff8ee,
  emissive: 0xffe6b0,
  emissiveIntensity: 1.5,
  roughness: 0.25,
});
box(car, 0.02, 0.22, 0.08, 2.16, 0.55, 0.58, lampMat, false);
box(car, 0.02, 0.22, 0.08, 2.16, -0.55, 0.58, lampMat, false);
const headLamp = new THREE.PointLight(0xfff1d0, 6, 9, 2);
headLamp.position.set(2.4, 0, 0.62);
scene.add(headLamp);
box(car, 0.04, 1.35, 0.07, -2.07, 0, 0.72, tailLight, false);
box(car, 1.4, 0.05, 0.66, -0.05, -0.88, 0.58, paint);
box(car, 1.05, 0.025, 0.38, -0.08, -0.86, 1.12, glass, false);
box(car, 1.38, 0.06, 0.1, -0.02, 0.86, 0.27, black);
box(car, 0.22, 1.2, 0.18, 0.58, 0.08, 0.78, black);
box(car, 0.55, 0.16, 0.12, 0.05, 0.02, 0.32, black);

const windshield = box(car, 0.025, 1.4, 0.7, 0.58, 0, 1.08, glass, false);
windshield.rotation.y = -0.52;
const rearGlass = box(car, 0.025, 1.28, 0.48, -0.9, 0, 1.14, glass, false);
rearGlass.rotation.y = 0.58;

function makeWheel(x, y) {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.2, 22), black);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.21, 16), chrome);
  group.add(tire, rim);
  group.position.set(x, y, 0.33);
  group.traverse((child) => {
    child.castShadow = true;
  });
  car.add(group);
}
makeWheel(1.48, 0.96);
makeWheel(1.48, -0.96);
makeWheel(-1.48, 0.96);
makeWheel(-1.48, -0.96);

const wheelMesh = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.014, 8, 28), black);
wheelMesh.position.set(CABIN.wheel.x, CABIN.wheel.y, CABIN.wheel.z);
wheelMesh.rotation.y = Math.PI / 2;
car.add(wheelMesh);
box(car, 0.06, 0.08, 0.05, CABIN.pedal.x, CABIN.pedal.y - 0.04, CABIN.pedal.z, black, false);
box(car, 0.05, 0.07, 0.04, CABIN.pedal.x - 0.06, CABIN.pedal.y + 0.12, CABIN.pedal.z, black, false);

const railMat = new THREE.MeshStandardMaterial({ color: 0x121418, emissive: 0xff3355, emissiveIntensity: 0 });
const rail = box(car, 0.58, 0.03, 0.012, 0.08, 0.37, 0.15, railMat, false);
const cushion = box(car, 0.48, 0.46, 0.1, 0, 0.37, 0.3, seatMat);
const backrest = box(car, 0.46, 0.08, 0.66, 0, 0.37, 0.7, seatMat);
box(backrest, 0.26, 0.08, 0.16, 0, 0, 0.4, seatMat);

const HINGE = { x: 0.68, y: 0.88, z: 0 };
const door = new THREE.Group();
door.position.set(HINGE.x, HINGE.y, HINGE.z);
car.add(door);
box(door, 1.38, 0.05, 0.62, -0.69, 0.025, 0.58, paint);
box(door, 0.95, 0.02, 0.4, -0.55, 0.045, 1.12, glass, false);
const leftMirror = new THREE.Group();
const leftLocal = {
  x: CABIN.mirrors[1].pivot.x - HINGE.x,
  y: CABIN.mirrors[1].pivot.y - HINGE.y,
  z: CABIN.mirrors[1].pivot.z - HINGE.z,
};
leftMirror.position.set(leftLocal.x, leftLocal.y, leftLocal.z);
door.add(leftMirror);
box(door, 0.03, Math.max(0.06, leftLocal.y), 0.03, leftLocal.x, leftLocal.y / 2, leftLocal.z, black, false);

let reflecting = false;
function mirrorHead(parent) {
  const housing = box(parent, 0.2, 0.11, 0.035, 0, 0, -0.02, black, false);
  const glassPane = box(parent, 0.16, 0.085, 0.012, 0, 0, 0.012, mirrorMat, false);
  glassPane.visible = false;
  const reflector = new Reflector(new THREE.PlaneGeometry(0.15, 0.078), {
    color: 0xd5e2ea,
    textureWidth: 512,
    textureHeight: 256,
    clipBias: 0.003,
  });
  reflector.position.z = 0.02;
  const draw = reflector.onBeforeRender;
  reflector.onBeforeRender = function (renderer, scene, camera) {
    if (reflecting) return;
    reflecting = true;
    draw(renderer, scene, camera);
    reflecting = false;
  };
  parent.add(reflector);
  return { housing, glassPane, reflector };
}
mirrorHead(leftMirror);

const rightMirror = new THREE.Group();
rightMirror.position.set(CABIN.mirrors[2].pivot.x, CABIN.mirrors[2].pivot.y, CABIN.mirrors[2].pivot.z);
car.add(rightMirror);
mirrorHead(rightMirror);
box(car, 0.04, 0.12, 0.03, 0.22, -0.94, 0.96, black, false);

const rearMirror = new THREE.Group();
rearMirror.position.set(CABIN.mirrors[0].pivot.x, CABIN.mirrors[0].pivot.y, CABIN.mirrors[0].pivot.z);
car.add(rearMirror);
mirrorHead(rearMirror);
box(car, 0.03, 0.03, 0.16, 0.48, 0, 1.32, black, false);

const heads = { rearview: rearMirror, left: leftMirror, right: rightMirror };

function limb(material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12), material);
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}
const body = {
  torso: limb(shirtMat),
  neck: limb(skinMat),
  lArm: limb(shirtMat),
  rArm: limb(shirtMat),
  lFore: limb(skinMat),
  rFore: limb(skinMat),
  lThigh: limb(pantsMat),
  rThigh: limb(pantsMat),
  lShin: limb(pantsMat),
  rShin: limb(pantsMat),
};
const pelvis = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), pantsMat);
const head = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), skinMat);
const hairCap = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), hairMat);
const hairTail = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), hairMat);
const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.08), shoeMat);
const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.08), shoeMat);
const lEye = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), eyeMat);
const rEye = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), eyeMat);
for (const mesh of [pelvis, head, hairCap, hairTail, lShoe, rShoe, lEye, rEye]) {
  mesh.castShadow = true;
  scene.add(mesh);
}

const scan = new THREE.Group();
const scanSheet = new THREE.Mesh(
  new THREE.PlaneGeometry(0.72, 0.72),
  new THREE.MeshBasicMaterial({
    color: 0xff3355,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
scan.add(scanSheet);
const scanLines = [];
for (let i = 0; i < 8; i++) {
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.006),
    new THREE.MeshBasicMaterial({
      color: 0xffe4e8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  scan.add(line);
  scanLines.push(line);
}
scene.add(scan);
const scanLight = new THREE.PointLight(0xff2244, 0, 2.6, 2);
scene.add(scanLight);

function rayMesh(color) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 1, 6),
    new THREE.MeshBasicMaterial({ color }),
  );
  scene.add(mesh);
  return mesh;
}
const rays = {};
for (const id of ["rearview", "left", "right"]) {
  rays[id] = { sight: rayMesh(0xf4f4f4), bounce: rayMesh(0xf0b429), normal: rayMesh(0x3ec6d8) };
}

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const yAxis = new THREE.Vector3(0, 1, 0);
const nVec = new THREE.Vector3();
const upVec = new THREE.Vector3(0, 0, 1);
const xVec = new THREE.Vector3();
const yVec = new THREE.Vector3();
const basis = new THREE.Matrix4();

function placeLimb(mesh, a, b, radius) {
  tmpA.set(a.x, a.y, a.z);
  tmpB.set(b.x, b.y, b.z);
  tmpDir.subVectors(tmpB, tmpA);
  const length = Math.max(tmpDir.length(), 1e-4);
  mesh.position.copy(tmpA).add(tmpB).multiplyScalar(0.5);
  tmpDir.multiplyScalar(1 / length);
  mesh.scale.set(radius, length, radius);
  mesh.quaternion.setFromUnitVectors(yAxis, tmpDir);
}

function orientFlat(mesh, normal) {
  nVec.set(normal.x, normal.y, normal.z).normalize();
  xVec.crossVectors(upVec, nVec);
  if (xVec.lengthSq() < 1e-8) xVec.set(1, 0, 0);
  else xVec.normalize();
  yVec.crossVectors(nVec, xVec).normalize();
  basis.makeBasis(xVec, yVec, nVec);
  mesh.quaternion.setFromRotationMatrix(basis);
}

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}
function smooth(t, a, b) {
  const u = clamp((t - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
}
function forward(yaw) {
  return { x: Math.cos(yaw), y: Math.sin(yaw), z: 0 };
}
function leftDir(yaw) {
  return { x: -Math.sin(yaw), y: Math.cos(yaw), z: 0 };
}
function bend(a, b, offset) {
  return {
    x: (a.x + b.x) / 2 + offset.x,
    y: (a.y + b.y) / 2 + offset.y,
    z: (a.z + b.z) / 2 + offset.z,
  };
}
function walkingPose(anthro, x, y, swing) {
  const yaw = -Math.PI / 2;
  const hipZ = anthro.shank + anthro.thigh;
  const hip = { x, y, z: hipZ + Math.abs(swing) * 0.045 };
  const torsoScale = anthro.sittingEye / (0.452 * anthro.stature);
  const chest = { x, y, z: hip.z + 0.28 * anthro.stature * torsoScale };
  const headP = { x, y, z: chest.z + anthro.head * 0.5 };
  const side = leftDir(yaw);
  const half = Math.min(anthro.shoulderBreadth * 0.36, 0.22);
  const lShoulder = add(chest, mul(side, half));
  const rShoulder = add(chest, mul(side, -half));
  const lAnkle = { x: x + 0.08, y: y - swing * 0.34, z: 0.04 + Math.max(0, swing) * 0.14 };
  const rAnkle = { x: x - 0.08, y: y + swing * 0.34, z: 0.04 + Math.max(0, -swing) * 0.14 };
  const lKnee = { x: x + 0.1, y: (hip.y + lAnkle.y) / 2, z: hip.z * 0.46 + Math.max(0, swing) * 0.1 };
  const rKnee = { x: x - 0.1, y: (hip.y + rAnkle.y) / 2, z: hip.z * 0.46 + Math.max(0, -swing) * 0.1 };
  const lHand = { x: lShoulder.x + 0.04, y: lShoulder.y + swing * 0.28, z: hip.z + 0.08 };
  const rHand = { x: rShoulder.x - 0.04, y: rShoulder.y - swing * 0.28, z: hip.z + 0.08 };
  return {
    yaw,
    hip,
    chest,
    head: headP,
    lShoulder,
    rShoulder,
    lElbow: bend(lShoulder, lHand, { x: 0.05, y: 0, z: 0.02 }),
    rElbow: bend(rShoulder, rHand, { x: -0.05, y: 0, z: 0.02 }),
    lHand,
    rHand,
    lKnee,
    rKnee,
    lAnkle,
    rAnkle,
  };
}

function seatedPose(result) {
  const { hip, knee, ankle, eye, recline } = result.seat;
  const anthro = result.anthro;
  const yaw = 0;
  const back = { x: -Math.sin(recline), y: 0, z: Math.cos(recline) };
  const chest = add(hip, mul(back, anthro.sittingEye * 0.84));
  const headP = { x: eye.x, y: eye.y, z: eye.z };
  const side = leftDir(yaw);
  const half = Math.min(anthro.shoulderBreadth * 0.36, 0.22);
  const lShoulder = add(chest, mul(side, half));
  const rShoulder = add(chest, mul(side, -half));
  const wheel = CABIN.wheel;
  const lHand = { x: wheel.x - 0.03, y: wheel.y + 0.12, z: wheel.z + 0.02 };
  const rHand = { x: wheel.x - 0.02, y: wheel.y - 0.1, z: wheel.z };
  const lAnkle = { x: ankle.x - 0.02, y: ankle.y + 0.16, z: ankle.z };
  const rAnkle = { x: ankle.x, y: ankle.y - 0.03, z: ankle.z };
  return {
    yaw,
    hip,
    chest,
    head: headP,
    lShoulder,
    rShoulder,
    lElbow: bend(lShoulder, lHand, mul(side, 0.06)),
    rElbow: bend(rShoulder, rHand, mul(side, -0.05)),
    lHand,
    rHand,
    lKnee: { x: knee.x, y: knee.y + 0.14, z: knee.z },
    rKnee: { x: knee.x, y: knee.y - 0.03, z: knee.z },
    lAnkle,
    rAnkle,
  };
}

function seatedBlend(result, motor) {
  const design = seatedPose({ seat: DESIGN.seat, anthro: result.anthro });
  if (motor <= 0) return design;
  if (motor >= 1) return seatedPose(result);
  return lerpJoints(design, seatedPose(result), motor, motor);
}

function poseAt(t, result) {
  const walkU = smooth(t, 0.15, 2.8);
  const y = 2.55 + (1.22 - 2.55) * walkU;
  const swing = Math.sin(t * 8.5) * (1 - walkU);
  const standing = walkingPose(result.anthro, 0.05, y, swing);
  if (t <= 2.8) return standing;
  const atDoor = walkingPose(result.anthro, 0.05, 1.22, 0);
  const sitting = seatedBlend(result, t >= 6.4 ? smooth(t, 7.8, 9.2) : 0);
  if (t >= 6.4) return sitting;
  const u = (t - 2.8) / (6.4 - 2.8);
  const drop = Math.min(1, u / 0.42);
  const slide = clamp((u - 0.2) / 0.8, 0, 1);
  return lerpJoints(atDoor, sitting, slide, drop);
}

function lerpJoints(a, b, slide, drop) {
  const pose = { yaw: a.yaw + (b.yaw - a.yaw) * slide };
  for (const key of Object.keys(a)) {
    if (key === "yaw") continue;
    pose[key] = {
      x: a[key].x + (b[key].x - a[key].x) * slide,
      y: a[key].y + (b[key].y - a[key].y) * slide,
      z: a[key].z + (b[key].z - a[key].z) * drop,
    };
  }
  return pose;
}

function applyPose(pose, anthro) {
  if (time > 6.4) {
    const breath = Math.sin(time * 1.7) * 0.012;
    pose = {
      ...pose,
      chest: { ...pose.chest, z: pose.chest.z + breath },
      head: { ...pose.head, z: pose.head.z + breath * 0.55 },
    };
  }
  const s = anthro.stature / 1.75;
  const arm = 0.038 * s;
  const leg = 0.058 * s;
  placeLimb(body.torso, pose.hip, pose.chest, 0.085 * s);
  placeLimb(body.neck, pose.chest, pose.head, 0.04 * s);
  placeLimb(body.lArm, pose.lShoulder, pose.lElbow, arm);
  placeLimb(body.rArm, pose.rShoulder, pose.rElbow, arm);
  placeLimb(body.lFore, pose.lElbow, pose.lHand, arm * 0.86);
  placeLimb(body.rFore, pose.rElbow, pose.rHand, arm * 0.86);
  placeLimb(body.lThigh, pose.hip, pose.lKnee, leg);
  placeLimb(body.rThigh, pose.hip, pose.rKnee, leg);
  placeLimb(body.lShin, pose.lKnee, pose.lAnkle, leg * 0.82);
  placeLimb(body.rShin, pose.rKnee, pose.rAnkle, leg * 0.82);
  const headR = anthro.head * 0.42;
  pelvis.position.set(pose.hip.x, pose.hip.y, pose.hip.z);
  pelvis.scale.setScalar(0.1 * s);
  head.position.set(pose.head.x, pose.head.y, pose.head.z);
  head.scale.setScalar(headR);
  const face = forward(pose.yaw);
  const side = leftDir(pose.yaw);
  const style = $("hair-style").value;
  const showHead = !driverView;
  head.visible = showHead;
  hairCap.visible = showHead && style !== "bald";
  hairTail.visible = showHead && style === "long";
  lEye.visible = showHead;
  rEye.visible = showHead;
  hairCap.position.set(pose.head.x, pose.head.y, pose.head.z + headR * 0.55);
  hairCap.scale.set(headR * 0.92, headR * 0.92, headR * 0.48);
  hairTail.position.set(
    pose.head.x - face.x * headR * 0.35,
    pose.head.y - face.y * headR * 0.35,
    pose.head.z - headR * 0.7,
  );
  hairTail.scale.set(headR * 0.9, headR * 0.55, headR * 1.8);
  const eyeR = 0.012 * s;
  for (const [mesh, sign] of [[lEye, 1], [rEye, -1]]) {
    mesh.position.set(
      pose.head.x + face.x * headR * 0.72 + side.x * sign * 0.032,
      pose.head.y + face.y * headR * 0.72 + side.y * sign * 0.032,
      pose.head.z + 0.01,
    );
    mesh.scale.setScalar(eyeR);
  }
  for (const [mesh, ankle] of [[lShoe, pose.lAnkle], [rShoe, pose.rAnkle]]) {
    mesh.position.set(ankle.x + face.x * 0.05, ankle.y + face.y * 0.05, ankle.z);
    mesh.rotation.set(0, 0, pose.yaw);
    mesh.scale.set(s, s, s);
  }
}

function placeSeat(hip, recline) {
  cushion.position.set(hip.x + 0.02, hip.y, hip.z - 0.07);
  const back = { x: -Math.sin(recline), y: 0, z: Math.cos(recline) };
  backrest.position.set(hip.x + back.x * 0.32, hip.y, hip.z + back.z * 0.32);
  backrest.rotation.set(0, -recline, 0);
}

function nlerp(a, b, u) {
  return norm({
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    z: a.z + (b.z - a.z) * u,
  });
}

function phaseName(t) {
  if (t < 2.8) return "Walking up";
  if (t < 3.8) return "Opening the door";
  if (t < 6.4) return "Sitting down";
  if (t < 7.6) return "Closing the door";
  if (t < 9.2) return "Scanning posture";
  if (t < 11.4) return "Aiming mirrors";
  return "Ready";
}

function readPerson() {
  return {
    heightM: Number($("height").value) / 100,
    legRatio: Number($("leg").value),
    shoulderScale: Number($("shoulder").value),
    seatbackDeg: Number($("seatback").value),
  };
}

function fmt(m) {
  return `${(m * 100).toFixed(1)} cm`;
}
function deg(n) {
  return `${n.toFixed(2)}°`;
}

let result = simulate(readPerson());

function fill() {
  const { anthro, seat, mirrors, maxReflectionErrorRad } = result;
  $("height-val").textContent = `${$("height").value} cm`;
  $("leg-val").textContent = `${Math.round(Number($("leg").value) * 100)}%`;
  $("shoulder-val").textContent = `${Math.round(Number($("shoulder").value) * 100)}%`;
  $("seatback-val").textContent = `${$("seatback").value}°`;
  $("out-name").textContent = $("name").value || "Driver";
  $("out-inseam").textContent = fmt(anthro.shank + anthro.thigh);
  $("out-shoulder").textContent = fmt(anthro.shoulderBreadth);
  $("out-eye").textContent = fmt(seat.eye.z);
  $("out-hip-back").textContent = fmt(CABIN.pedal.x - seat.hip.x);
  $("out-hip-height").textContent = fmt(seat.hip.z);
  $("out-knee").textContent = `${seat.kneeDeg.toFixed(0)}°`;
  const track = $("out-track");
  track.textContent = seat.limited ? "At the end of travel" : "Inside travel";
  track.className = seat.limited ? "warn" : "";
  const byId = Object.fromEntries(mirrors.map((m) => [m.id, m]));
  $("out-rear-pan").textContent = deg(byId.rearview.panDeg);
  $("out-rear-tilt").textContent = deg(byId.rearview.tiltDeg);
  $("out-left-pan").textContent = deg(byId.left.panDeg);
  $("out-left-tilt").textContent = deg(byId.left.tiltDeg);
  $("out-right-pan").textContent = deg(byId.right.panDeg);
  $("out-right-tilt").textContent = deg(byId.right.tiltDeg);
  const err = maxReflectionErrorRad / DEG;
  const errEl = $("out-error");
  errEl.textContent = `${err.toFixed(3)}°`;
  errEl.className = err < 0.01 ? "ok" : "warn";
  const base = Object.fromEntries(DESIGN.mirrors.map((m) => [m.id, m]));
  const signed = (n) => `${n > 0 ? "+" : ""}${n.toFixed(2)}°`;
  $("out-delta-left").textContent = signed(byId.left.panDeg - base.left.panDeg);
  $("out-delta-right").textContent = signed(byId.right.panDeg - base.right.panDeg);
  $("out-delta-rear").textContent = signed(byId.rearview.tiltDeg - base.rearview.tiltDeg);
  const lines = [
    `eye ${vec(seat.eye)}`,
    `hip ${vec(seat.hip)}`,
    ...mirrors.map((m) => `${m.id} n ${vec(m.normal)}`),
  ];
  $("raw").textContent = lines.join("\n");
}
function vec(v) {
  return `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
}

function paintLooks() {
  skinMat.color.set($("skin").value);
  hairMat.color.set($("hair").value);
  shirtMat.color.set($("shirt").value);
  pantsMat.color.set($("pants").value);
  eyeMat.color.set($("eye-color").value);
}

function onChange() {
  result = simulate(readPerson());
  fill();
  paintLooks();
}

let driverView = false;
let cinematic = true;
let time = 0;
let playing = true;
let last = performance.now();

const SHOTS = [
  { t: 0, pos: [1.15, 6.6, 1.7], look: [0.05, 2.4, 1.15] },
  { t: 2.7, pos: [1.45, 3.05, 1.28], look: [0.3, 1.05, 0.95] },
  { t: 4.8, pos: [0.35, 2.25, 1.55], look: [0.12, 0.42, 0.9] },
  { t: 7.4, pos: [1.45, 1.7, 1.48], look: [0.02, 0.37, 0.95] },
  { t: 9.3, pos: [0.7, 1.15, 1.38], look: [-0.05, 0.37, 1.15] },
  { t: 11.6, pos: [2.7, 3.5, 1.9], look: [0.12, 0.12, 0.95] },
  { t: 12.6, pos: [3.3, 4.5, 2.15], look: [0.1, 0.05, 0.72] },
];

function shotAt(t) {
  let i = 0;
  while (i < SHOTS.length - 2 && t > SHOTS[i + 1].t) i += 1;
  const a = SHOTS[i];
  const b = SHOTS[i + 1];
  const u = smooth(t, a.t, b.t);
  const mix = (p, q) => p + (q - p) * u;
  return {
    pos: [mix(a.pos[0], b.pos[0]), mix(a.pos[1], b.pos[1]), mix(a.pos[2], b.pos[2])],
    look: [mix(a.look[0], b.look[0]), mix(a.look[1], b.look[1]), mix(a.look[2], b.look[2])],
  };
}

function applyCamera(now) {
  if (!cinematic || driverView) return;
  if (time < 12.6) {
    const shot = shotAt(time);
    camera.position.set(...shot.pos);
    controls.target.set(...shot.look);
    return;
  }
  const ang = 0.95 + Math.sin(now * 0.00016) * 0.28;
  const radius = 5.2;
  controls.target.set(0.1, 0.05, 0.88);
  camera.position.set(
    0.1 + Math.cos(ang) * radius,
    Math.sin(ang) * radius * 0.9,
    2.02 + Math.sin(now * 0.00028) * 0.1,
  );
}

function update(t) {
  $("phase").textContent = phaseName(t);
  $("hud").classList.toggle("hot", t > 7.5 && t < 11.4);
  const open = smooth(t, 2.8, 3.7) * (1 - smooth(t, 6.5, 7.7));
  const bounce = Math.sin(clamp((t - 3.7) / 0.55, 0, Math.PI)) * 0.06 * (t > 3.7 && t < 4.5 ? 1 : 0);
  door.rotation.z = -(open + bounce) * 74 * DEG;
  const seatU = smooth(t, 7.8, 9.2);
  const hip = {
    x: DESIGN.seat.hip.x + (result.seat.hip.x - DESIGN.seat.hip.x) * seatU,
    y: result.seat.hip.y,
    z: DESIGN.seat.hip.z + (result.seat.hip.z - DESIGN.seat.hip.z) * seatU,
  };
  const recline = DESIGN.seat.recline + (result.seat.recline - DESIGN.seat.recline) * seatU;
  rail.position.x = hip.x;
  railMat.emissiveIntensity = seatU > 0.02 && seatU < 0.98 ? 1.2 : 0;
  placeSeat(hip, recline);
  applyPose(poseAt(t, result), result.anthro);

  const aim = smooth(t, 9.15, 11.35);
  mirrorMat.emissiveIntensity = aim * (1 - aim) * 3.2;
  const doorShut = open < 0.02;
  const showRays = $("rays").checked && aim > 0.02 && doorShut;
  for (const mirror of result.mirrors) {
    const solved = nlerp(NEUTRAL[mirror.id], mirror.normal, aim);
    if (mirror.id !== "left" || doorShut) orientFlat(heads[mirror.id], solved);
    const bundle = rays[mirror.id];
    const visible = showRays;
    bundle.sight.visible = visible;
    bundle.bounce.visible = visible;
    bundle.normal.visible = visible;
    if (!visible) continue;
    const pivot = mirror.pivot;
    placeLimb(bundle.sight, mirror.eye, pivot, 0.008);
    const dir = norm(sub(mirror.target, pivot));
    const full = Math.hypot(mirror.target.x - pivot.x, mirror.target.y - pivot.y, mirror.target.z - pivot.z);
    const reach = Math.min(2.4, full) * (0.15 + 0.85 * aim);
    placeLimb(bundle.bounce, pivot, add(pivot, mul(dir, reach)), 0.012);
    placeLimb(bundle.normal, pivot, add(pivot, mul(solved, 0.42)), 0.01);
  }

  const scanning = t > 7.55 && t < 9.35;
  scan.visible = scanning;
  scanLight.intensity = scanning ? 9 + Math.sin(t * 22) * 4 : 0;
  if (scanning) {
    const u = clamp((t - 7.6) / 1.5, 0, 1);
    const z = result.seat.eye.z + (result.seat.hip.z - result.seat.eye.z) * u;
    scan.position.set(result.seat.hip.x, result.seat.eye.y, z);
    scanSheet.material.opacity = 0.16 + 0.22 * (0.5 + 0.5 * Math.sin(t * 16));
    scanLines.forEach((line, i) => {
      const phase = (u * 3 + i / scanLines.length + t * 0.15) % 1;
      line.position.set(0, (i - 3.5) * 0.07, (phase - 0.5) * 0.08);
      line.material.opacity = 0.25 + 0.75 * phase;
    });
    scanLight.position.copy(scan.position);
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (playing && time < 12.6) time += dt;
  update(time);
  if (document.activeElement !== $("time")) {
    $("time").value = String(time);
    $("time-val").textContent = `${time.toFixed(1)}s`;
  }
  applyCamera(now);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function resize() {
  const w = stage.clientWidth || 1;
  const h = stage.clientHeight || 1;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

controls.addEventListener("start", () => {
  cinematic = false;
});
$("replay").onclick = () => {
  time = 0;
  playing = true;
  cinematic = true;
  driverView = false;
  camera.near = 0.08;
  camera.updateProjectionMatrix();
  last = performance.now();
};
$("jump").onclick = () => {
  time = 12.6;
  playing = false;
  cinematic = true;
  driverView = false;
  update(time);
};
$("view-out").onclick = () => {
  cinematic = false;
  driverView = false;
  camera.near = 0.08;
  camera.updateProjectionMatrix();
  camera.position.set(...HOME.pos);
  controls.target.set(...HOME.target);
  controls.update();
};
$("view-eye").onclick = () => {
  cinematic = false;
  driverView = true;
  const eye = result.seat.eye;
  camera.near = 0.02;
  camera.updateProjectionMatrix();
  camera.position.set(eye.x + 0.22, eye.y, eye.z - 0.04);
  controls.target.set(eye.x + 6, eye.y, eye.z - 0.22);
  controls.update();
};
for (const el of ["height", "leg", "shoulder", "seatback", "name", "hair-style"]) {
  $(el).addEventListener("input", onChange);
}
for (const el of ["skin", "hair", "shirt", "pants", "eye-color"]) {
  $(el).addEventListener("input", onChange);
}
for (const button of document.querySelectorAll("[data-preset]")) {
  button.onclick = () => {
    const preset = PRESETS[button.dataset.preset];
    $("height").value = preset.height;
    $("leg").value = preset.leg;
    $("shoulder").value = preset.shoulder;
    $("seatback").value = preset.seatback;
    onChange();
    $("replay").click();
  };
}
$("time").addEventListener("input", () => {
  time = Number($("time").value);
  playing = false;
  $("time-val").textContent = `${time.toFixed(1)}s`;
  update(time);
});
window.addEventListener("keydown", (event) => {
  if (event.target.matches("input, select")) return;
  if (event.code === "Space") {
    event.preventDefault();
    $("replay").click();
  }
});
window.addEventListener("resize", resize);

onChange();
resize();
if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  time = 12.6;
  playing = false;
  cinematic = false;
  camera.position.set(...HOME.pos);
  controls.target.set(...HOME.target);
  update(time);
}
requestAnimationFrame(frame);
