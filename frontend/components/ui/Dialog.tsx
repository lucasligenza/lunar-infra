"use client";
import { useEffect, useRef, type ReactNode } from 'react';

export default function Dialog({ open, onClose, label, className = '', children }: {
  open: boolean; onClose: () => void; label: string; className?: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-dialog-focus]')?.focus();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus(); };
  }, [open]);
  return <dialog ref={ref} aria-label={label} className={`mission-dialog ${className}`}
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); } }}
    onCancel={event => { event.preventDefault(); close.current(); }} onClick={event => { if (event.target === event.currentTarget) close.current(); }}>
    {open && children}
  </dialog>;
}
