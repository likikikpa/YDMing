import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function IconButton({
  icon: Icon,
  title,
  hint,
  keys,
  side,
  onClick,
  active,
  disabled,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** One or two sentences explaining what the button does. */
  hint?: string;
  keys?: string;
  side?: "right" | "bottom";
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      className={`icon-button ${active ? "active" : ""}`}
      aria-label={title}
      data-tip={title}
      data-tip-hint={hint}
      data-tip-keys={keys}
      data-tip-side={side}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={18} />
      {children}
    </button>
  );
}
