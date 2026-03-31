/** @jsxImportSource react */

import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';

export function MarqueeText({ children, className, hold }: { children: ReactNode; className?: string; hold?: number }): ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      setShouldScroll(false);
      return;
    }

    const check = (): void => {
      setShouldScroll(content.scrollWidth > container.clientWidth + 1);
    };

    check();

    const ro = new globalThis.ResizeObserver(() => check());
    ro.observe(container);
    ro.observe(content);

    return () => ro.disconnect();
  }, [children]);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      return;
    }

    let rafId = 0;
    if (!shouldScroll) {
      content.style.transform = '';
      return () => {};
    }

    let start: number | null = null;
    const distance = Math.max(0, content.scrollWidth - container.clientWidth);
    const speed = 40; // px per second
    const phaseDuration = distance > 0 ? (distance / speed) * 1000 : 1000;
    const holdTime = hold ?? 1000;

    const step = (t: number) => {
      if (!start) {
        start = t;
      }
      const elapsed = t - start;
      const cycle = phaseDuration * 2 + holdTime * 2;
      const tmod = elapsed % cycle;
      let x = 0;

      if (tmod < holdTime) {
        x = 0;
      }
      else if (tmod < holdTime + phaseDuration) {
        const p = (tmod - holdTime) / phaseDuration;
        x = -distance * p;
      }
      else if (tmod < holdTime + phaseDuration + holdTime) {
        x = -distance;
      }
      else {
        const p = (tmod - holdTime - phaseDuration - holdTime) / phaseDuration;
        x = -distance + distance * p;
      }

      content.style.transform = `translateX(${x}px)`;
      rafId = globalThis.requestAnimationFrame(step);
    };

    rafId = globalThis.requestAnimationFrame(step);
    return () => globalThis.cancelAnimationFrame(rafId);
  }, [shouldScroll]);

  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap ${className ?? ''}`}>
      <div ref={contentRef} className='inline-block will-change-transform'>
        {children}
      </div>
    </div>
  );
}
