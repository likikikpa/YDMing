import { Check, X } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function ToastMessage({ app }: { app: ReadyApp }) {
  const { setToast, toast } = app;
  if (!toast) return null;
  return (
    <div role="status" className="toast wood">
      <Check size={15} />
      {toast}
      <button onClick={() => setToast("")}>
        <X size={13} />
      </button>
    </div>
  );
}
