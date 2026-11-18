"use client";

import { Modal } from "./ClinicForms";

export function ConfirmDialog({ title, description, confirmLabel, danger = false, busy = false, onCancel, onConfirm }: {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  return <Modal title={title} subtitle="Confirmação necessária" onClose={onCancel}>
    <div className="confirm-content"><div className={`confirm-symbol ${danger ? "danger" : ""}`}>!</div><p>{description}</p></div>
    <footer className="dialog-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button><button type="button" className={danger ? "danger-button" : "green-button"} disabled={busy} onClick={onConfirm}>{busy ? "Processando…" : confirmLabel}</button></footer>
  </Modal>;
}
