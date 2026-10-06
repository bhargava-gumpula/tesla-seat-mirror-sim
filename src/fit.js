// Vehicle frame: +X forward, +Y driver side (left-hand drive), +Z up.
// Origin on the ground, near the design seating position.
// Lengths are meters. A simplified Model 3-sized cabin, not factory CAD.

export const DEG = Math.PI / 180;

// Thigh slopes down toward the hip (knee higher than the hip), which is
// how a cushion sits in a low sedan. Positive would put the hip above the knee.
const THIGH_TARGET = -12 * DEG;

export const CABIN = {
  pedal: { x: 0.78, y: 0.37, z: 0.16 },
  seatY: 0.37,
  seatTrackX: { min: -0.12, max: 0.32 },
  seatTrackZ: { min: 0.2, max: 0.42 },
  kneeDeg: 118,
  seatbackDeg: 22,
  wheel: { x: 0.4, y: 0.37, z: 0.74 },
  mirrors: [
    {
      id: "rearview",
      label: "Rearview",
      eye: "mid",
      pivot: { x: 0.48, y: 0.0, z: 1.22 },
      // Center of the rear glass, so that point lands in the middle of the mirror.
      target: { x: -1.65, y: 0.0, z: 1.08 },
    },
    {
      id: "left",
      label: "Left side",
      eye: "left",
      pivot: { x: 0.22, y: 1.02, z: 0.98 },
      // Just outboard of the rear quarter, into the adjacent lane.
      target: { x: -10, y: 1.75, z: 0.82 },
    },
    {
      id: "right",
      label: "Right side",
      eye: "right",
      pivot: { x: 0.22, y: -1.02, z: 0.98 },
      target: { x: -10, y: -1.75, z: 0.82 },
    },
  ],
};

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function mul(a, s) {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function len(a) {
  return Math.hypot(a.x, a.y, a.z);
}

export function norm(a) {
  const l = len(a);
  if (l < 1e-12) return { x: 0, y: 0, z: 1 };
  return mul(a, 1 / l);
}

// Stature fractions follow the usual ergonomics ratios (shank and thigh
// about a quarter of stature, seated eye height a bit under half).
// legRatio trades leg length against torso length so stature stays put.
export function anthropometry(person) {
  const H = person.heightM;
  if (!(H > 0.5 && H < 2.6)) throw new Error("height out of range");
  const leg = person.legRatio ?? 1;
  const torso = 2 - leg;
  if (!(torso > 0.2 && leg > 0.2)) throw new Error("proportion out of range");
  const shoulder = person.shoulderScale ?? 1;
  return {
    stature: H,
    shank: 0.246 * H * leg,
    thigh: 0.245 * H * leg,
    sittingEye: 0.452 * H * torso,
    shoulderBreadth: 0.259 * H * shoulder,
    head: 0.13 * H,
    upperArm: 0.186 * H,
    forearm: 0.146 * H * torso,
  };
}

function rot2(x, z, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: x * c - z * s, z: x * s + z * c };
}

// Shank leans back from the pedal by `sigma`. Knee angle is the interior
// angle between shank and thigh. Hip is the candidate behind the knee.
function legPose(sigma, shank, thigh, kneeAngle, ankle) {
  const knee = {
    x: ankle.x - shank * Math.sin(sigma),
    y: ankle.y,
    z: ankle.z + shank * Math.cos(sigma),
  };
  const kax = Math.sin(sigma);
  const kaz = -Math.cos(sigma);
  const hips = [kneeAngle, -kneeAngle].map((ang) => {
    const d = rot2(kax, kaz, ang);
    return {
      x: knee.x + thigh * d.x,
      y: ankle.y,
      z: knee.z + thigh * d.z,
    };
  });
  const good = hips.filter((h) => h.x < knee.x - 0.02 && h.z > 0.12);
  if (!good.length) return null;
  good.sort((a, b) => {
    const score = (h) => Math.abs(Math.atan2(h.z - knee.z, knee.x - h.x) - THIGH_TARGET);
    return score(a) - score(b);
  });
  return { ankle: { x: ankle.x, y: ankle.y, z: ankle.z }, knee, hip: good[0], sigma };
}

function poseScore(pose) {
  const run = pose.knee.x - pose.hip.x;
  if (run <= 0.04) return 100;
  const thighUp = Math.atan2(pose.hip.z - pose.knee.z, run);
  return Math.abs(thighUp - THIGH_TARGET);
}

function inTrack(hip) {
  return (
    hip.x >= CABIN.seatTrackX.min &&
    hip.x <= CABIN.seatTrackX.max &&
    hip.z >= CABIN.seatTrackZ.min &&
    hip.z <= CABIN.seatTrackZ.max
  );
}

// ponytail: 0.25° shank sweep. Closed form if this ever needs to be per-pixel.
function search(anthro, kneeDeg) {
  const kneeAngle = kneeDeg * DEG;
  let best = null;
  let bestIn = null;
  for (let deg = 1; deg <= 78; deg += 0.25) {
    const pose = legPose(deg * DEG, anthro.shank, anthro.thigh, kneeAngle, CABIN.pedal);
    if (!pose) continue;
    const score = poseScore(pose);
    const row = { ...pose, score };
    if (!best || score < best.score) best = row;
    if (inTrack(pose.hip) && (!bestIn || score < bestIn.score)) bestIn = row;
  }
  return { best, bestIn };
}

function eyeFromHip(hip, sittingEye, recline) {
  return {
    x: hip.x - sittingEye * Math.sin(recline),
    y: hip.y,
    z: hip.z + sittingEye * Math.cos(recline),
  };
}

export function solveSeat(anthro, options = {}) {
  const reclineDeg = options.seatbackDeg ?? CABIN.seatbackDeg;
  const preferred = CABIN.kneeDeg;
  const first = search(anthro, preferred);
  let chosen = null;
  let kneeDeg = preferred;
  let limited = false;

  if (first.bestIn) {
    chosen = first.bestIn;
    limited =
      Math.abs(first.best.hip.x - first.bestIn.hip.x) > 0.01 ||
      Math.abs(first.best.hip.z - first.bestIn.hip.z) > 0.01;
  } else {
    let relax = null;
    for (let k = 100; k <= 145; k += 1) {
      const found = search(anthro, k);
      if (!found.bestIn) continue;
      const penalty = Math.abs(k - preferred);
      if (!relax || penalty < relax.penalty) {
        relax = { pose: found.bestIn, penalty, kneeDeg: k };
      }
    }
    if (relax) {
      chosen = relax.pose;
      kneeDeg = relax.kneeDeg;
      limited = true;
    } else if (first.best) {
      chosen = first.best;
      limited = true;
    } else {
      throw new Error("no leg pose");
    }
  }

  const recline = reclineDeg * DEG;
  return {
    hip: chosen.hip,
    knee: chosen.knee,
    ankle: chosen.ankle,
    eye: eyeFromHip(chosen.hip, anthro.sittingEye, recline),
    kneeDeg,
    recline,
    reclineDeg,
    limited,
    reach: !limited || inTrack(chosen.hip),
  };
}

// Normal that sends the eye ray to the target: the unit bisector of
// (pivot → eye) and (pivot → target). Both points sit on the reflective side.
export function mirrorNormal(eye, pivot, target) {
  return norm(add(norm(sub(eye, pivot)), norm(sub(target, pivot))));
}

// I points toward the glass. N points back toward the eye.
export function reflect(incident, normal) {
  const d = dot(incident, normal);
  return norm(sub(incident, mul(normal, 2 * d)));
}

export function mirrorAngles(normal) {
  const yaw = Math.atan2(normal.y, -normal.x);
  const pitch = Math.atan2(normal.z, Math.hypot(normal.x, normal.y));
  return { yaw, pitch };
}

export function normalFromAngles(yaw, pitch) {
  const cp = Math.cos(pitch);
  return {
    x: -cp * Math.cos(yaw),
    y: cp * Math.sin(yaw),
    z: Math.sin(pitch),
  };
}

function eyesOf(eye) {
  const ipd = 0.064;
  return {
    mid: eye,
    left: { x: eye.x, y: eye.y + ipd / 2, z: eye.z },
    right: { x: eye.x, y: eye.y - ipd / 2, z: eye.z },
  };
}

export function aimMirrors(seat) {
  const eyes = eyesOf(seat.eye);
  return CABIN.mirrors.map((mirror) => {
    const eye = eyes[mirror.eye];
    const normal = mirrorNormal(eye, mirror.pivot, mirror.target);
    const incident = norm(sub(mirror.pivot, eye));
    const reflected = reflect(incident, normal);
    const toTarget = norm(sub(mirror.target, mirror.pivot));
    const align = Math.min(1, Math.max(-1, dot(reflected, toTarget)));
    const { yaw, pitch } = mirrorAngles(normal);
    return {
      id: mirror.id,
      label: mirror.label,
      pivot: mirror.pivot,
      target: mirror.target,
      eye,
      normal,
      yaw,
      pitch,
      panDeg: yaw / DEG,
      tiltDeg: pitch / DEG,
      errorRad: Math.acos(align),
    };
  });
}

export function simulate(person) {
  const anthro = anthropometry(person);
  const seat = solveSeat(anthro, { seatbackDeg: person.seatbackDeg });
  const mirrors = aimMirrors(seat);
  const maxReflectionErrorRad = Math.max(...mirrors.map((m) => m.errorRad));
  return { person, anthro, seat, mirrors, maxReflectionErrorRad };
}
