export type ToastTone = "success" | "error" | "info" | "warning";

export type ToastInput = {
  title: string;
  message?: string;
  tone?: ToastTone;
};

export type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
  createdAt: number;
};

export const TOAST_DURATION_MS = 10_000;

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  const snapshot = toasts;
  listeners.forEach((listener) => listener(snapshot));
}

export function dismissToast(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function showToast(input: ToastInput) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const toast: ToastItem = {
    id,
    title: input.title,
    message: input.message,
    tone: input.tone ?? "success",
    createdAt: Date.now(),
  };
  toasts = [...toasts, toast].slice(-4);
  emit();
  timers.set(
    id,
    setTimeout(() => {
      dismissToast(id);
    }, TOAST_DURATION_MS),
  );
  return id;
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

function titleForAction(action: string) {
  const key = action.toUpperCase();
  if (key.includes("DRAFT") || key === "SAVE") return "Draft saved";
  if (key.includes("SUBMIT")) return "Submitted for approval";
  if (key.includes("APPROVE")) return "Approved successfully";
  if (key.includes("REJECT")) return "Rejected";
  if (key.includes("CANCEL")) return "Document cancelled";
  if (key.includes("POST")) return "Posted successfully";
  if (key.includes("DELETE") || key.includes("ARCHIVE")) return "Deleted";
  if (key.includes("CREATE") || key.includes("UPDATE")) return "Saved successfully";
  if (key.includes("GENERATE")) return "Issue generated";
  return "Action completed";
}

function messageForAction(action: string) {
  const key = action.toUpperCase();
  if (key.includes("DRAFT")) return "You can keep editing this document.";
  if (key.includes("SUBMIT")) return "It is now waiting for approval.";
  if (key.includes("APPROVE")) return "The document has been approved.";
  if (key.includes("REJECT")) return "The document was sent back.";
  if (key.includes("CANCEL")) return "The document is no longer active.";
  if (key.includes("POST")) return "Stock and accounts were updated.";
  return undefined;
}

export function notifyActionSuccess(action: string) {
  showToast({
    tone: "success",
    title: titleForAction(action),
    message: messageForAction(action),
  });
}

export function notifyActionError(message: string) {
  showToast({
    tone: "error",
    title: "Action failed",
    message,
  });
}

export function notifyFromEndpoint(endpoint: string) {
  const action = endpoint.split("/").filter(Boolean).at(-1) ?? "done";
  notifyActionSuccess(action);
}
