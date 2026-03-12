"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

const FORMAT_LABELS = [
  "PNG", "JPG", "WebP", "AVIF", "ICO", "GIF", "TIFF", "BMP", "SVG",
  "PDF", "DOCX", "TXT", ".png", ".jpg", ".webp", ".avif", ".ico",
  ".gif", ".tiff", ".bmp", ".svg", ".pdf", ".docx", ".txt",
];

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string;
  opacity: number;
  shade: number; // 0-1 how light/dark within the theme color range
  fontSize: number;
}

export function ParticlesBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDark = resolvedTheme === "dark";

    // Indigo-based palette matching the theme primary
    // dark: shades of indigo on dark navy bg
    // light: shades of indigo on light bg
    const baseR = isDark ? 110 : 79;
    const baseG = isDark ? 120 : 70;
    const baseB = isDark ? 220 : 229;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 25000), 50);
    nodesRef.current = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      label: FORMAT_LABELS[i % FORMAT_LABELS.length],
      opacity: Math.random() * 0.18 + 0.06,
      shade: Math.random(),
      fontSize: Math.random() * 5 + 13,
    }));

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouse);

    // Get shade of indigo based on node's shade value
    const getColor = (shade: number, alpha: number) => {
      const variation = 40;
      const r = Math.round(baseR + (shade - 0.5) * variation);
      const g = Math.round(baseG + (shade - 0.5) * variation);
      const b = Math.round(baseB + (shade - 0.5) * (variation * 0.3));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const nodes = nodesRef.current;
      const mouse = mouseRef.current;

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -40) n.x = canvas.width + 40;
        if (n.x > canvas.width + 40) n.x = -40;
        if (n.y < -20) n.y = canvas.height + 20;
        if (n.y > canvas.height + 20) n.y = -20;
      }

      // Lines between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const avgShade = (nodes[i].shade + nodes[j].shade) / 2;
            const alpha = (1 - dist / 200) * 0.07;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = getColor(avgShade, alpha);
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Mouse interaction lines
      for (const n of nodes) {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 220) {
          const alpha = (1 - dist / 220) * 0.22;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = getColor(n.shade, alpha);
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }

      // Draw labels
      for (const n of nodes) {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hoverBoost = dist < 200 ? (1 - dist / 200) * 0.3 : 0;
        const alpha = n.opacity + hoverBoost;

        ctx.font = `600 ${n.fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = getColor(n.shade, alpha);
        ctx.fillText(n.label, n.x, n.y);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, [resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  );
}
