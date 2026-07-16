import { useEffect, useState } from 'react';

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
