export const CAMERA_DISTANCE = 3.2;

// Drops the last coordinate until two are left. Each step scales the rest by d / (d - w),
// which is 1 at w = 0 and grows as a point gets closer to the camera.
export const projectTo2D = (p, perspective = true, distance = CAMERA_DISTANCE) => {
  let v = p;
  while (v.length > 2) {
    const d = v.length;
    const f = perspective ? distance / (distance - v[d - 1]) : 1;
    const next = new Array(d - 1);
    for (let k = 0; k < d - 1; k++) next[k] = v[k] * f;
    v = next;
  }
  return v;
};

// The total factor projectTo2D applies to p, used to size tiles by depth.
export const perspectiveScale = (p, distance = CAMERA_DISTANCE) => {
  let v = p;
  let total = 1;
  while (v.length > 2) {
    const d = v.length;
    const f = distance / (distance - v[d - 1]);
    total *= f;
    v = v.slice(0, d - 1).map((x) => x * f);
  }
  return total;
};
