import { useEffect, useState } from "react";
import { NotebookText } from "lucide-react";
import { isNoteUrl, noteName } from "../note-link";
import { Field } from "../ui/Field";

/** A link to a note (Obsidian or web). Only a valid link or an empty field is saved. */
export function NoteLinkField({
  label,
  value,
  onChange,
  t,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  t: (s: string) => string;
}) {
  const [draft, setDraft] = useState(value || "");
  useEffect(() => setDraft(value || ""), [value]);
  const bad = draft !== "" && !isNoteUrl(draft.trim());
  return (
    <Field label={label}>
      <span className="note-link">
        <input
          className={bad ? "invalid" : ""}
          placeholder="obsidian://open?vault=…"
          spellCheck={false}
          value={draft}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            if (next.trim() === "") onChange(undefined);
            else if (isNoteUrl(next.trim())) onChange(next.trim());
          }}
          onBlur={() => bad && setDraft(value || "")}
        />
        {value && <NoteLinkButton url={value} t={t} />}
      </span>
    </Field>
  );
}

export function NoteLinkButton({
  url,
  t,
}: {
  url: string;
  t: (s: string) => string;
}) {
  if (!isNoteUrl(url)) return null;
  // An obsidian: link hands over to the app; a web link opens in a new tab.
  const web = !url.toLowerCase().startsWith("obsidian:");
  return (
    <a
      className="icon-button note-open"
      href={url}
      target={web ? "_blank" : undefined}
      rel="noreferrer"
      aria-label={`${t("Open note")}: ${noteName(url)}`}
      data-tip={`${t("Open note")}: ${noteName(url)}`}
    >
      <NotebookText size={15} />
    </a>
  );
}
