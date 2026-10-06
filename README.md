# Seat and mirror fit

A browser simulation of a driver walking into a simplified left-hand-drive cabin. Sliders change height, leg length, shoulders, seatback, and appearance. After the driver sits, the page reports the seat position that fits that body and aims the rearview and both side mirrors.

The mirror glass is not posed by hand. Its normal is the direction that satisfies the law of reflection for that driver's eyes.

## Run

```bash
npm install
npm test
npm start
```

Open http://localhost:8765

Drag to orbit the view. Scroll to zoom. Space replays the walk-in.

## Calculation

Coordinates: +X forward, +Y to the driver's side, +Z up. Lengths are meters.

Body segment lengths are stature fractions (shank and thigh about a quarter of height, seated eye height a bit under half). The leg-length slider moves length from the torso onto the legs so stature stays the same.

The seat is a two-link leg. The knee stays at 118° when the seat track allows, and the thigh runs about 12° downhill from the knee to the hip. Shank angle is searched in 0.25° steps. If that hip is outside the track, the knee angle relaxes until the seat can get there, and the panel marks the track as limited.

The eye sits one seated-eye-height up the seatback from the hip. The rearview uses the point between the eyes and aims at the center of the rear glass. Each side mirror uses the nearer eye and aims just outboard of the rear quarter, into the adjacent lane.

The mirror normal is the unit bisector of (mirror → eye) and (mirror → aim point). That is the normal for which the incoming ray and the reflected ray make the same angle, and the reflected ray hits the aim point. Pan is the horizontal angle of that normal (0° looks straight back, positive turns toward +Y). Tilt is the vertical angle (positive aims up).

## Limits

This is a package study, not Tesla CAD. Side mirrors are treated as planar: a convex passenger mirror would widen the field of view and would not move the center ray. One seat track is shared by every body.
