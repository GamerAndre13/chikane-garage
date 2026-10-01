/// <reference types="@webgpu/types" />

"use client";

import { useEffect, useRef } from "react";

const SPEED_SHADER = /* wgsl */ `
  @group(0) @binding(0) var<uniform> time: f32;

  @fragment
  fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let sweep = uv.y + uv.x * 0.24 + sin(uv.x * 5.5 - time * 0.32) * 0.018;
    let upper = exp(-abs(sweep - 0.36) * 92.0) * 0.34;
    let lower = exp(-abs(sweep - 0.58) * 76.0) * 0.2;
    let edge_fade = smoothstep(0.02, 0.26, uv.x) * (1.0 - smoothstep(0.66, 1.0, uv.x));
    let vertical_fade = smoothstep(0.12, 0.32, uv.y) * (1.0 - smoothstep(0.76, 0.94, uv.y));
    let alpha = (upper + lower) * edge_fade * vertical_fade;
    let copper = vec3f(0.95, 0.24, 0.035);
    return vec4f(copper * alpha, alpha);
  }
`;

export default function VgpuSpeedLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let gpu: import("vgpu").Gpu | undefined;

    async function start() {
      const canvas = canvasRef.current;
      if (!canvas || !navigator.gpu) return;

      try {
        const { clock, effect, frame, frameLoop, init, surface } = await import("vgpu");
        if (cancelled) return;

        gpu = await init({ powerPreference: "low-power", label: "Chikane hero accent" });
        if (cancelled) {
          gpu.dispose();
          return;
        }

        const target = surface(gpu, canvas, { alphaMode: "premultiplied", dpr: [1, 1], label: "Chikane speed lines" });
        const shader = effect(gpu, SPEED_SHADER, { blend: "premultiplied", set: { time: 0 } });
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reducedMotion) {
          shader.set({ time: 0.8 });
          frame(gpu, (current) => current.pass(target, shader));
        } else {
          const timer = clock(gpu);
          frameLoop(gpu, (current) => {
            shader.set({ time: timer.time });
            current.pass(target, shader);
          }, { fps: 30 });
        }

        canvas.style.opacity = "1";
      } catch {
        gpu?.dispose();
      }
    }

    void start();
    return () => {
      cancelled = true;
      gpu?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-0" style={{ transition: "opacity 700ms ease" }} />;
}
