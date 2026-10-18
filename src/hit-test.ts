import type { MapObject, Point } from "./types";
export function hitObject(object: MapObject, point: Point, padding = 7) {
  const angle = (-object.rotation * Math.PI) / 180,
    dx = point.x - object.x,
    dy = point.y - object.y;
  const x = dx * Math.cos(angle) - dy * Math.sin(angle),
    y = dx * Math.sin(angle) + dy * Math.cos(angle);
  return (
    Math.abs(x) <= object.width / 2 + padding &&
    Math.abs(y) <= object.height / 2 + padding
  );
}
export function navigationTarget(objects: MapObject[], point: Point) {
  const pins = objects.filter(
    (o) =>
      ["city", "village", "castle", "dungeon"].includes(o.kind) &&
      hitObject(o, point),
  );
  pins.sort(
    (a, b) =>
      Math.hypot(a.x - point.x, a.y - point.y) -
      Math.hypot(b.x - point.x, b.y - point.y),
  );
  return pins[0] || [...objects].reverse().find((o) => hitObject(o, point));
}
