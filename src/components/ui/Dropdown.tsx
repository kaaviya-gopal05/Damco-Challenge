import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface DropdownContextValue {
  isOpen: boolean;
  close: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: align === 'right' ? rect.right + window.scrollX : rect.left + window.scrollX,
      });
    }

    updatePosition();

    function onClickOutside(e: MouseEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        close();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, align]);

  return (
    <DropdownContext.Provider value={{ isOpen, close, triggerRef }}>
      <div ref={triggerRef} onClick={() => setIsOpen((p) => !p)} className="inline-flex">
        {trigger}
      </div>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: position.top,
              left: align === 'right' ? undefined : position.left,
              right: align === 'right' ? window.innerWidth - position.left : undefined,
            }}
            className={cn(
              'z-50 min-w-[200px] rounded-xl border border-ink-200 bg-white p-1.5 shadow-popover animate-scale-in',
              className
            )}
          >
            {children}
          </div>,
          document.body
        )}
    </DropdownContext.Provider>
  );
}

export function DropdownItem({
  children,
  onClick,
  className,
  destructive = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
}) {
  const ctx = useContext(DropdownContext);
  return (
    <button
      onClick={() => {
        onClick?.();
        ctx?.close();
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-700 transition-colors hover:bg-ink-50',
        destructive && 'text-rose-600 hover:bg-rose-50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1.5 h-px bg-ink-100" />;
}
