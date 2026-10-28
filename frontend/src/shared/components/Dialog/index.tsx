import './Dialog.css';
import { useEffect, useId, useRef, type ReactNode } from 'react';

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="mes-dialog" aria-labelledby={titleId}
    onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="mes-dialog-content">
      <header><h2 id={titleId}>{title}</h2><button className="mes-close" aria-label="닫기" onClick={onClose}>×</button></header>
      {children}
    </div>
  </dialog>;
}
