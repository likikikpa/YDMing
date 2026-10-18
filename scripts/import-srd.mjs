import { mkdir, writeFile } from "node:fs/promises";
const base = "https://api.open5e.com/v2/";
async function collect(endpoint) {
  let url = `${base}${endpoint}/?document__key__in=srd-2024&limit=100&format=json`,
    all = [];
  while (url) {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(45000),
    });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    const data = await r.json();
    all.push(...data.results.filter((x) => x.document?.key === "srd-2024"));
    url = data.next;
    console.log(endpoint, all.length);
  }
  return all;
}
const [monsters, items] = await Promise.all([
  collect("creatures"),
  collect("magicitems"),
]);
const entries = [
  ...monsters.map((m) => ({
    key: m.key,
    name: m.name,
    kind: "monster",
    description: `${m.size?.name} ${m.type?.name}, ${m.alignment}. Speed: ${m.speed_all?.walk || 0} ft.`,
    cr: Number(m.challenge_rating),
    xp: m.experience_points,
    ac: m.armor_class,
    hp: m.hit_points,
    type: m.type?.key,
    details: [
      `Abilities: ${JSON.stringify(m.ability_scores)}`,
      `Saving throws: ${JSON.stringify(m.saving_throws || {})}`,
      `Skills: ${JSON.stringify(m.skill_bonuses || {})}`,
      `Speed: ${Object.entries(m.speed_all || {})
        .filter(([key, value]) => typeof value === "number" && value > 0)
        .map(([key, value]) => `${key} ${value} ft.`)
        .join(", ")}`,
      `Resistances and immunities: ${
        Object.entries(m.resistances_and_immunities || {})
          .filter(([key, value]) => key.endsWith("_display") && value)
          .map(
            ([key, value]) =>
              `${key.replace(/_display$/, "").replace(/_/g, " ")}: ${value}`,
          )
          .join("; ") || "None"
      }`,
      `Senses: passive Perception ${m.passive_perception}; ${
        [
          ["darkvision", m.darkvision_range],
          ["blindsight", m.blindsight_range],
          ["tremorsense", m.tremorsense_range],
          ["truesight", m.truesight_range],
        ]
          .filter(([, value]) => value)
          .map(([name, value]) => `${name} ${value} ft.`)
          .join(", ") || "normal vision"
      }`,
      `Languages: ${m.languages?.as_string || "—"}`,
      ...(m.traits || []).map((t) => `${t.name}. ${t.desc}`),
      ...(m.actions || []).map(
        (a) => `${a.name} (${a.action_type}). ${a.desc}`,
      ),
    ].join("\n\n"),
  })),
  ...items.map((m) => ({
    key: m.key,
    name: m.name,
    kind: "item",
    description: m.desc,
    rarity: m.rarity?.key,
    type: m.category?.name,
    details: m.requires_attunement
      ? `Requires attunement. ${m.attunement_detail || ""}`
      : "",
  })),
];
await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../src/data/srd.json", import.meta.url),
  JSON.stringify(entries),
);
console.log(
  `Bundled ${monsters.length} SRD creatures and ${items.length} magic items. CC BY 4.0; see THIRD_PARTY_NOTICES.md.`,
);
