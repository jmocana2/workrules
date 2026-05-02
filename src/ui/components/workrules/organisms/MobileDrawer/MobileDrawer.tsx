import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  children: React.ReactNode;
}

export function MobileDrawer({
  isOpen,
  onClose,
  side = 'left',
  children,
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Bloquear scroll del body cuando esta abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Save/restore focus and move focus into drawer when open
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      } else {
        drawerRef.current?.focus();
      }
    } else {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Escape key closes drawer; Tab key cycles focus within drawer (focus trap)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
        if (!focusable || focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className={cn(
          'fixed inset-y-0 z-50 w-80 max-w-[85vw] shadow-xl transition-transform duration-300 ease-out',
          side === 'left' ? 'left-0' : 'right-0',
          (() => {
            if (isOpen) return 'translate-x-0';
            return side === 'left' ? '-translate-x-full' : 'translate-x-full';
          })()
        )}
        role="dialog"
        aria-modal="true"
        aria-label={side === 'left' ? 'Menu de navegacion' : 'Panel de variables'}
      >
        {children}
      </div>
    </>
  );
}
