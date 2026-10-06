import assert from "node:assert/strict";
import {
  anthropometry,
  aimMirrors,
  dot,
  mirrorAngles,
  mirrorNormal,
  mul,
  norm,
  normalFromAngles,
  reflect,
  simulate,
  solveSeat,
  sub,
} from "./fit.js";

function person(heightM, extra = {}) {
  return { heightM, legRatio: 1, shoulderScale: 1, seatbackDeg: 22, ...extra };
}

function angle(a, b) {
  const c = Math.min(1, Math.max(-1, dot(norm(a), norm(b))));
  return Math.acos(c);
}

const mid = simulate(person(1.75));
assert.equal(mid.seat.limited, false, JSON.stringify(mid.seat.hip));
assert.ok(mid.seat.eye.z > mid.seat.hip.z);
assert.ok(mid.seat.knee.z > mid.seat.hip.z);
assert.ok(mid.seat.hip.x < mid.seat.knee.x);
assert.ok(mid.seat.knee.x < mid.seat.ankle.x);

const short = simulate(person(1.58));
const tall = simulate(person(1.92));
assert.equal(short.seat.limited, false, JSON.stringify(short.seat.hip));
assert.equal(tall.seat.limited, false, JSON.stringify(tall.seat.hip));
assert.ok(
  tall.seat.hip.x < short.seat.hip.x,
  `tall hip ${tall.seat.hip.x} short hip ${short.seat.hip.x}`,
);
assert.ok(tall.seat.eye.z > short.seat.eye.z);

const longLegs = simulate(person(1.75, { legRatio: 1.12 }));
const shortLegs = simulate(person(1.75, { legRatio: 0.9 }));
assert.ok(longLegs.seat.hip.x < shortLegs.seat.hip.x);
assert.ok(longLegs.anthro.sittingEye < shortLegs.anthro.sittingEye);

const narrow = simulate(person(1.78, { shoulderScale: 0.9 }));
const broad = simulate(person(1.78, { shoulderScale: 1.15 }));
assert.ok(broad.anthro.shoulderBreadth > narrow.anthro.shoulderBreadth);
assert.ok(Math.abs(narrow.mirrors[0].panDeg - broad.mirrors[0].panDeg) < 1e-9);

const upright = simulate(person(1.75, { seatbackDeg: 16 }));
const reclined = simulate(person(1.75, { seatbackDeg: 28 }));
assert.ok(reclined.seat.eye.x < upright.seat.eye.x);
assert.ok(Math.abs(reclined.mirrors[0].tiltDeg - upright.mirrors[0].tiltDeg) > 0.2);

const giant = solveSeat(anthropometry(person(2.25, { legRatio: 1.1 })));
assert.equal(giant.limited, true);

for (const mirror of mid.mirrors) {
  const incident = norm(sub(mirror.pivot, mirror.eye));
  const reflected = reflect(incident, mirror.normal);
  const toTarget = norm(sub(mirror.target, mirror.pivot));
  assert.ok(dot(reflected, toTarget) > 0.999, mirror.id);
  const incidence = angle(mul(incident, -1), mirror.normal);
  const reflection = angle(reflected, mirror.normal);
  assert.ok(Math.abs(incidence - reflection) < 1e-6, mirror.id);
  assert.ok(mirror.errorRad < 1e-6, mirror.id);
  const rebuilt = normalFromAngles(mirror.yaw, mirror.pitch);
  assert.ok(Math.abs(dot(rebuilt, mirror.normal) - 1) < 1e-9, mirror.id);
  const again = mirrorAngles(rebuilt);
  assert.ok(Math.abs(again.yaw - mirror.yaw) < 1e-9);
  assert.ok(Math.abs(again.pitch - mirror.pitch) < 1e-9);
}

const byId = Object.fromEntries(mid.mirrors.map((m) => [m.id, m]));
assert.ok(byId.rearview.normal.y > 0, "rearview aims toward the driver");
assert.ok(byId.left.panDeg < 0, "left mirror faces in toward the driver");
assert.ok(byId.right.panDeg > 0, "right mirror faces in toward the driver");
const leftTall = tall.mirrors.find((m) => m.id === "left").panDeg;
const leftShort = short.mirrors.find((m) => m.id === "left").panDeg;
assert.ok(Math.abs(leftTall - leftShort) > 0.15, `${leftTall} vs ${leftShort}`);
assert.ok(byId.left.eye.y > byId.right.eye.y);
assert.equal(byId.rearview.eye.y, mid.seat.eye.y);

const eye = { x: 0, y: 0, z: 1 };
const pivot = { x: 0, y: 0, z: 0 };
const target = { x: 1, y: 0, z: 1 };
const n = mirrorNormal(eye, pivot, target);
const r = reflect(norm(sub(pivot, eye)), n);
assert.ok(dot(r, norm(sub(target, pivot))) > 0.999);

assert.ok(mid.maxReflectionErrorRad < 1e-6);
