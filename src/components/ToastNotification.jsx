import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function ToastNotification({ toast, onClose }) {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={18} className="toast-icon toast-success" />,
    error: <AlertCircle size={18} className="toast-icon toast-error" />,
    info: <Info size={18} className="toast-icon toast-info" />
  };

  return (
    <div className={`toast-banner toast-${toast.type || "info"}`} role="alert">
      {icons[toast.type] || icons.info}
      <div className="toast-content">
        <strong>{toast.title}</strong>
        {toast.message && <p>{toast.message}</p>}
      </div>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Tutup notifikasi">
        <X size={15} />
      </button>
    </div>
  );
}
