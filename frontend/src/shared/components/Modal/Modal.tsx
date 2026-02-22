import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import {
  useEscKey,
  useOnClickOutside,
  useScrollLock,
  useFocusTrap,
} from '../../hooks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: Props) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEscKey(onClose, isOpen);
  useScrollLock(isOpen);
  useOnClickOutside(dialogRef, onClose, isOpen);
  useFocusTrap(dialogRef, isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full ${sizeClasses[size]} rounded-2xl bg-white p-6 shadow-xl outline-none`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 id={titleId} className="text-2xl font-bold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div>{children}</div>

        {footer && <div className="mt-6 flex gap-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
