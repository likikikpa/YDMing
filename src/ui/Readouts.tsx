import { BIOMES } from "../generator";
import { useCursorStatus } from "../status";

export function ZoomReadout() {
  return <>{Math.round(useCursorStatus().zoom)}</>;
}
export function CursorReadout({
  world,
  t,
}: {
  world: boolean;
  t: (s: string) => string;
}) {
  const status = useCursorStatus();
  return (
    <>
      <span>
        X <b>{status.x}</b>
      </span>
      <span>
        Y <b>{status.y}</b>
      </span>
      {world && (
        <span>
          ↟ <b>{status.height} m</b>
        </span>
      )}
      <span>{t(BIOMES[status.biome] || "Auto")}</span>
    </>
  );
}
