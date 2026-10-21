import { SRD } from "../generator";
import { Field } from "../ui/Field";
import { BookOpen, ChevronRight, Trash2 } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function RoomsPanel({ app }: { app: ReadyApp }) {
  const { lang, map, mutateMap, roomDetail, setRoomDetail, setSrdDetail, t } =
    app;
  const currentRoom = map.rooms.find((r) => r.id === roomDetail);
  return (
    <>
      <div className="panel-heading">
        <span className="section-kicker">{t("Room key")}</span>
        <h2>{map.name}</h2>
        <p>
          {map.rooms.length} {lang === "ru" ? "комнат" : "rooms"} · {t("Level")}{" "}
          {map.settings.level} · {map.settings.party}{" "}
          {lang === "ru" ? "игроков" : "adventurers"}
        </p>
      </div>
      {map.rooms.map((room) => (
        <button
          className={`room-row ${roomDetail === room.id ? "active" : ""}`}
          key={room.id}
          onClick={() => setRoomDetail(room.id)}
        >
          <span>{room.number}</span>
          <div>
            <b>{room.type}</b>
            <small>
              {SRD.find((e) => e.key === room.monster || e.key === room.item)
                ?.name || room.description.slice(0, 50)}
            </small>
          </div>
          <ChevronRight size={14} />
        </button>
      ))}
      {currentRoom && (
        <div className="room-detail">
          <div className="section-kicker">
            {t("Room")} {currentRoom.number}
          </div>
          <Field label={t("Description")}>
            <textarea
              rows={4}
              value={currentRoom.description}
              onChange={(e) =>
                mutateMap(
                  (m) =>
                    (m.rooms.find((r) => r.id === currentRoom.id)!.description =
                      e.target.value),
                  "Edit room description",
                )
              }
            />
          </Field>
          {[currentRoom.monster, currentRoom.item]
            .filter(Boolean)
            .map((key) => {
              const e = SRD.find((e) => e.key === key);
              return e ? (
                <button
                  className="srd-link"
                  key={key}
                  onClick={() => setSrdDetail(e)}
                >
                  <BookOpen size={15} />
                  {e.name}
                  <ChevronRight size={14} />
                </button>
              ) : null;
            })}
          <button
            className="button subtle full"
            onClick={() => {
              mutateMap((m) => {
                const room = m.rooms.find((r) => r.id === currentRoom.id)!;
                const cell = m.width / m.cols,
                  ch = m.height / m.rows;
                for (
                  let y = Math.floor(room.y / ch);
                  y < Math.ceil((room.y + room.h) / ch);
                  y++
                )
                  for (
                    let x = Math.floor(room.x / cell);
                    x < Math.ceil((room.x + room.w) / cell);
                    x++
                  ) {
                    if (
                      !m.rooms.some(
                        (r) =>
                          r.id !== room.id &&
                          x * cell >= r.x &&
                          x * cell < r.x + r.w &&
                          y * ch >= r.y &&
                          y * ch < r.y + r.h,
                      )
                    )
                      m.heights[y * m.cols + x] = 0;
                  }
                m.rooms = m.rooms.filter((r) => r.id !== room.id);
                m.rooms.forEach((r, i) => (r.number = i + 1));
              }, "Delete room");
              setRoomDetail(null);
            }}
          >
            <Trash2 size={13} />
            {t("Delete room")}
          </button>
        </div>
      )}
    </>
  );
}
