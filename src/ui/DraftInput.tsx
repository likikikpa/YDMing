import { useEffect, useRef, useState } from "react";
import type {
  InputHTMLAttributes,
  KeyboardEvent,
  TextareaHTMLAttributes,
} from "react";
import { createDraft } from "./draft";

const DELAY = 300;

/** The text of a field that keeps what is typed until a pause, then commits it. */
function useDraft(value: string, onCommit: (text: string) => void) {
  const [text, setText] = useState(value);
  const draft = useRef(createDraft(DELAY));
  // Changes that did not come from typing here (undo, another object) show up.
  useEffect(() => {
    if (!draft.current.pending) setText(value);
  }, [value]);
  // Leaving the field, or removing it, must not lose what was typed.
  useEffect(() => {
    const d = draft.current;
    return () => d.flush();
  }, []);
  return {
    text,
    change(next: string) {
      setText(next);
      draft.current.type(next, onCommit);
    },
    flush: () => draft.current.flush(),
  };
}

type Props<T> = Omit<T, "value" | "onChange"> & {
  value: string;
  onCommit: (text: string) => void;
};

/** A text input whose edits reach the map after a pause, on Enter, or on leaving the field. */
export function DraftInput({
  value,
  onCommit,
  onBlur,
  onKeyDown,
  ...rest
}: Props<InputHTMLAttributes<HTMLInputElement>>) {
  const d = useDraft(value, onCommit);
  return (
    <input
      {...rest}
      value={d.text}
      onChange={(e) => d.change(e.target.value)}
      onBlur={(e) => {
        d.flush();
        onBlur?.(e);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") d.flush();
        onKeyDown?.(e);
      }}
    />
  );
}

/** Like `DraftInput`, for several lines of text: Enter adds a line. */
export function DraftTextarea({
  value,
  onCommit,
  onBlur,
  ...rest
}: Props<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  const d = useDraft(value, onCommit);
  return (
    <textarea
      {...rest}
      value={d.text}
      onChange={(e) => d.change(e.target.value)}
      onBlur={(e) => {
        d.flush();
        onBlur?.(e);
      }}
    />
  );
}
