"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Atraso em ms para efeito de cascata (stagger). */
  delay?: number;
  /** Duração da transição em ms (por omissão: 600ms definidos no CSS). */
  duration?: number;
};

/**
 * Revela o conteúdo ao entrar no viewport (fade + subida + leve skew).
 * Com `prefers-reduced-motion` a transição é instantânea (regra global em globals.css).
 */
export function Reveal({ children, className = "", delay = 0, duration }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "reveal-in" : ""} ${className}`}
      style={
        delay || duration
          ? {
              ...(delay ? { transitionDelay: `${delay}ms` } : {}),
              ...(duration ? { transitionDuration: `${duration}ms` } : {}),
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}