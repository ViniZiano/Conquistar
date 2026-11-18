"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export function AnimatedCounter({ value, duration = 760 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const previousRef = useRef(0);

  useEffect(() => {
    const startValue = previousRef.current;
    const targetValue = Number.isFinite(value) ? value : 0;
    if (startValue === targetValue) return;

    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const raf = window.requestAnimationFrame(() => {
        setDisplay(targetValue);
        previousRef.current = targetValue;
      });
      return () => window.cancelAnimationFrame(raf);
    }

    let startTime: number | null = null;
    let rafId = 0;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(startValue + (targetValue - startValue) * eased));

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        previousRef.current = targetValue;
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [value, duration]);

  return <span className="tabular-metric">{display.toLocaleString("pt-BR")}</span>;
}

export interface SlidingTabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export function FluidSlidingTabs<T extends string>({
  items,
  activeId,
  onChange,
  ariaLabel,
  className = "",
  variant = "pill",
}: {
  items: Array<SlidingTabItem<T>>;
  activeId: T;
  onChange(id: T): void;
  ariaLabel: string;
  className?: string;
  variant?: "pill" | "segmented";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});
  const [pillStyle, setPillStyle] = useState({ x: 0, width: 0, ready: false });

  const measure = useCallback(() => {
    const activeButton = buttonRefs.current[activeId];
    if (!activeButton) return;
    setPillStyle({
      x: activeButton.offsetLeft,
      width: activeButton.offsetWidth,
      ready: true,
    });
  }, [activeId]);

  useLayoutEffect(() => {
    measure();
  }, [measure, items.length]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <div
      ref={containerRef}
      className={`fluid-tabs fluid-tabs-${variant} ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      <span
        aria-hidden="true"
        className="fluid-tabs-glider"
        style={{
          width: `${pillStyle.width}px`,
          transform: `translate3d(${pillStyle.x}px, 0, 0)`,
          opacity: pillStyle.ready ? 1 : 0,
        }}
      />
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            ref={(node) => {
              buttonRefs.current[item.id] = node;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`fluid-tab-btn ${isActive ? "active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" ? <span className="fluid-tab-count">{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function SpotlightButton({
  children,
  className = "",
  onClick,
  ariaLabel,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  onClick(): void;
  ariaLabel?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${(event.clientX - rect.left).toFixed(1)}px`);
    el.style.setProperty("--spot-y", `${(event.clientY - rect.top).toFixed(1)}px`);
  };

  return (
    <button
      ref={ref}
      type="button"
      onMouseMove={handleMove}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`spotlight-surface ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}