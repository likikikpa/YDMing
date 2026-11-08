import { FilePlus2 } from "lucide-react";
import { useRef } from "react";
import { BUNDLED_FONTS } from "../fonts";
import { Field } from "./Field";
import { IconButton } from "./IconButton";
import type { ReadyApp } from "../app/useAppModel";

/**
 * Picks a font for map text from the bundled ones and the world's own, and
 * adds a font file. `value` is a font id, or empty for the default.
 */
export function FontPicker({
  app,
  label,
  empty,
  value,
  onChange,
}: {
  app: ReadyApp;
  label: string;
  /** What the first entry, no font of its own, is called. */
  empty: string;
  value: string | undefined;
  onChange: (id: string | undefined) => void;
}) {
  const { fonts, importFont, t } = app,
    input = useRef<HTMLInputElement>(null),
    mine = Object.entries(fonts ?? {});
  return (
    <Field label={label}>
      <div className="font-picker">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">{empty}</option>
          <optgroup label={t("Fonts")}>
            {BUNDLED_FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
                {f.cyrillic ? "" : ` · ${t("Latin only")}`}
              </option>
            ))}
          </optgroup>
          {mine.length > 0 && (
            <optgroup label={t("My fonts")}>
              {mine.map(([id, f]) => (
                <option key={id} value={id}>
                  {f.name}
                </option>
              ))}
            </optgroup>
          )}
          {/* A font a label names that is not in the world any more still shows. */}
          {value &&
            !BUNDLED_FONTS.some((f) => f.id === value) &&
            !fonts?.[value] && <option value={value}>{value}</option>}
        </select>
        <IconButton
          icon={FilePlus2}
          title={t("Add a font file")}
          onClick={() => input.current?.click()}
        />
        <input
          ref={input}
          type="file"
          hidden
          accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importFont(file).then((id) => id && onChange(id));
          }}
        />
      </div>
    </Field>
  );
}
