import { useEffect, useState } from 'react';

/**
 * Mide con `ResizeObserver` la altura de un elemento (el input fijo en móvil)
 * para poder ajustar el `padding-bottom` del scroll y evitar que tape el chat.
 * Cuando `enabled` es `false` la altura queda en `0` y no se observa nada.
 */
export function useMobileInputHeight(enabled: boolean): {
  ref: (el: HTMLDivElement | null) => void;
  height: number;
} {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!element || !enabled) {
      setHeight(0);
      return;
    }
    setHeight(element.getBoundingClientRect().height);
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height ?? 0;
      setHeight(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, element]);

  return { ref: setElement, height };
}
