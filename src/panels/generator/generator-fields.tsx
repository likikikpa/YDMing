import { Field, Slider } from "../../ui/Field";
import { defaultSettings } from "../../types";
import type { GeneratorSettings } from "../../types";
import type { ReadyApp } from "../../app/useAppModel";

/** Select and slider rows bound to the generator settings, shared by the field groups. */
export function generatorFields(app: ReadyApp) {
  const { settings, changeSetting, t } = app;
  const selectField = (
    label: string,
    key: keyof GeneratorSettings,
    values: [string, string][],
  ) => (
    <Field label={t(label)}>
      <select
        value={String(settings[key])}
        onChange={(e) => changeSetting(key, e.target.value as never)}
      >
        {values.map(([v, l]) => (
          <option value={v} key={v}>
            {t(l)}
          </option>
        ))}
      </select>
    </Field>
  );
  const slider = (
    label: string,
    key: keyof GeneratorSettings,
    min = 0,
    max = 100,
    suffix = "%",
  ) => (
    <Slider
      label={t(label)}
      value={Number(settings[key] ?? defaultSettings[key])}
      onChange={(v) => changeSetting(key, v as never)}
      min={min}
      max={max}
      suffix={suffix}
    />
  );
  return { selectField, slider };
}
