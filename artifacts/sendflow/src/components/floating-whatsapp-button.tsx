import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent } from 'react';
import whatsappLogo from '@/assets/whatsapp-mark.png';
import { ProtectedImage } from '@/components/protected-image';

type FloatingWhatsAppButtonProps = {
  href: string | null;
  isFrench: boolean;
};

type Position = { left: number; top: number };
type DragState = Position & { pointerId: number; startX: number; startY: number; moved: boolean };

const POSITION_STORAGE_KEY = 'sendflow-home-whatsapp-position-v1';

function buttonSize() {
  return window.matchMedia('(max-width: 640px)').matches ? 64 : 72;
}

function clampPosition(position: Position): Position {
  const size = buttonSize();
  return {
    left: Math.max(8, Math.min(position.left, window.innerWidth - size - 8)),
    top: Math.max(8, Math.min(position.top, window.innerHeight - size - 8)),
  };
}

function readSavedPosition(): Position | null {
  try {
    const value = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<Position>;
    if (typeof parsed.left !== 'number' || typeof parsed.top !== 'number') return null;
    return clampPosition({ left: parsed.left, top: parsed.top });
  } catch {
    return null;
  }
}

function savePosition(position: Position) {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // The button remains movable for this page view if browser storage is unavailable.
  }
}

export function FloatingWhatsAppButton({ href, isFrench }: FloatingWhatsAppButtonProps) {
  const contactLabel = href
    ? isFrench ? 'Contacter SendFlow sur WhatsApp' : 'Contact SendFlow on WhatsApp'
    : isFrench ? 'WhatsApp — numéro à configurer' : 'WhatsApp — number not configured';
  const moveHint = isFrench
    ? 'Faites glisser pour déplacer, ou utilisez les flèches du clavier.'
    : 'Drag to move, or use the keyboard arrow keys.';
  const label = `${contactLabel}. ${moveHint}`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const positionRef = useRef<Position | null>(null);
  const draggedRef = useRef(false);
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    const saved = readSavedPosition();
    if (saved) {
      positionRef.current = saved;
      setPosition(saved);
    }

    const keepOnScreen = () => {
      const current = positionRef.current;
      if (!current) return;
      const next = clampPosition(current);
      positionRef.current = next;
      setPosition(next);
      savePosition(next);
    };
    window.addEventListener('resize', keepOnScreen);
    return () => window.removeEventListener('resize', keepOnScreen);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return;
    dragRef.current = {
      left: bounds.left,
      top: bounds.top,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return;
    drag.moved = true;
    const next = clampPosition({ left: drag.left + deltaX, top: drag.top + deltaY });
    positionRef.current = next;
    setPosition(next);
  };

  const handlePointerUp = (event: PointerEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved && positionRef.current) {
      draggedRef.current = true;
      savePosition(positionRef.current);
      window.setTimeout(() => { draggedRef.current = false; }, 0);
    }
    dragRef.current = null;
  };

  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (!href || draggedRef.current) {
      event.preventDefault();
      if (draggedRef.current) event.stopPropagation();
      draggedRef.current = false;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    const movement = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!movement) return;
    const bounds = wrapperRef.current?.getBoundingClientRect();
    const current = positionRef.current ?? (bounds ? { left: bounds.left, top: bounds.top } : null);
    if (!current) return;
    event.preventDefault();
    const distance = event.shiftKey ? 32 : 12;
    const next = clampPosition({
      left: current.left + movement[0] * distance,
      top: current.top + movement[1] * distance,
    });
    positionRef.current = next;
    setPosition(next);
    savePosition(next);
  };

  const logo = <ProtectedImage src={whatsappLogo} alt="" className="sf-floating-whatsapp__logo" />;

  return (
    <div
      ref={wrapperRef}
      className="sf-floating-whatsapp-drag"
      style={position ? { left: `${position.left}px`, top: `${position.top}px`, right: 'auto' } : undefined}
    >
      {href ? (
        <a
          href={href}
          className="sf-floating-whatsapp"
          aria-label={label}
          title={contactLabel}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          data-testid="button-floating-whatsapp"
        >
          {logo}
        </a>
      ) : (
        <button
          type="button"
          className="sf-floating-whatsapp"
          aria-label={label}
          aria-disabled="true"
          title={contactLabel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          data-testid="button-floating-whatsapp-unconfigured"
        >
          {logo}
        </button>
      )}
    </div>
  );
}
