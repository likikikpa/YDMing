import { useRef, useState } from "react";

/** The short message at the bottom of the screen. */
export function useToast() {
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  };
  return { toast, setToast, notify };
}
