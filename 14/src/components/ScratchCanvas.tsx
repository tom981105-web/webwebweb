import { useEffect, useRef } from 'react';

import { clamp, mulberry32, randomBetween } from '@/utils/random';

const INTERNAL_WIDTH = 840;
const INTERNAL_HEIGHT = 480;
const SAMPLE_STEP = 10;

type Point = { x: number; y: number };

function hashPanelId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) + 1;
}

export function ScratchCanvas({
  panelId,
  scratchedPercent,
  revealed,
  brushRadius,
  reducedMotion,
  onProgress,
}: {
  panelId: string;
  scratchedPercent: number;
  revealed: boolean;
  brushRadius: number;
  reducedMotion: boolean;
  onProgress: (percent: number, distance: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const measuredPercentRef = useRef(0);

  const drawCover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    const gradient = ctx.createLinearGradient(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    gradient.addColorStop(0, '#3a425b');
    gradient.addColorStop(0.5, '#232a3a');
    gradient.addColorStop(1, '#171b27');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

    ctx.globalAlpha = 0.18;
    for (let index = 0; index < 16; index += 1) {
      const padding = 24 + index * 6;
      ctx.beginPath();
      ctx.strokeStyle = index % 2 === 0 ? '#9adfff' : '#f3d67f';
      ctx.lineWidth = 1 + (index % 3);
      ctx.roundRect(padding, padding, INTERNAL_WIDTH - padding * 2, INTERNAL_HEIGHT - padding * 2, 18);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const readPercent = () => {
    const canvas = canvasRef.current;
    if (!canvas) return measuredPercentRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return measuredPercentRef.current;
    const { data } = ctx.getImageData(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    let total = 0;
    let cleared = 0;
    for (let y = 0; y < INTERNAL_HEIGHT; y += SAMPLE_STEP) {
      for (let x = 0; x < INTERNAL_WIDTH; x += SAMPLE_STEP) {
        total += 1;
        const alpha = data[(y * INTERNAL_WIDTH + x) * 4 + 3];
        if (alpha < 24) cleared += 1;
      }
    }
    measuredPercentRef.current = total > 0 ? (cleared / total) * 100 : 0;
    return measuredPercentRef.current;
  };

  const eraseStroke = (from: Point, to: Point, radius: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / Math.max(4, radius * 0.28)));
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const x = from.x + dx * t;
      const y = from.y + dy * t;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const replayScratchTo = (targetPercent: number) => {
    const current = readPercent();
    if (targetPercent <= current + 0.8) return;
    const rng = mulberry32(hashPanelId(panelId));
    let attempts = 0;
    while (attempts < 80 && readPercent() < targetPercent - 0.6) {
      const from = { x: rng() * INTERNAL_WIDTH, y: rng() * INTERNAL_HEIGHT };
      const angle = rng() * Math.PI * 2;
      const length = randomBetween(36, 118);
      const to = {
        x: clamp(from.x + Math.cos(angle) * length, 0, INTERNAL_WIDTH),
        y: clamp(from.y + Math.sin(angle) * length, 0, INTERNAL_HEIGHT),
      };
      eraseStroke(from, to, reducedMotion ? brushRadius * 0.9 : brushRadius);
      attempts += 1;
    }
  };

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * INTERNAL_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * INTERNAL_HEIGHT,
    };
  };

  useEffect(() => {
    drawCover();
    measuredPercentRef.current = 0;
    if (revealed) {
      canvasRef.current?.getContext('2d')?.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
      measuredPercentRef.current = 100;
      return;
    }
    if (scratchedPercent > 0) {
      replayScratchTo(scratchedPercent);
    }
  }, [panelId]);

  useEffect(() => {
    if (revealed) {
      canvasRef.current?.getContext('2d')?.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
      measuredPercentRef.current = 100;
      return;
    }
    replayScratchTo(scratchedPercent);
  }, [scratchedPercent, revealed, panelId]);

  return (
    <canvas
      ref={canvasRef}
      width={INTERNAL_WIDTH}
      height={INTERNAL_HEIGHT}
      className="rg-absolute rg-inset-0 rg-h-full rg-w-full rg-touch-none"
      onPointerDown={(event) => {
        if (revealed) return;
        const point = getPoint(event);
        if (!point) return;
        drawingRef.current = true;
        lastPointRef.current = point;
        event.currentTarget.setPointerCapture(event.pointerId);
        eraseStroke(point, point, brushRadius);
        onProgress(readPercent(), 0);
      }}
      onPointerMove={(event) => {
        if (!drawingRef.current || revealed) return;
        const nextPoint = getPoint(event);
        const lastPoint = lastPointRef.current;
        if (!nextPoint || !lastPoint) return;
        eraseStroke(lastPoint, nextPoint, brushRadius);
        lastPointRef.current = nextPoint;
        onProgress(readPercent(), Math.hypot(nextPoint.x - lastPoint.x, nextPoint.y - lastPoint.y));
      }}
      onPointerUp={(event) => {
        drawingRef.current = false;
        lastPointRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerLeave={() => {
        drawingRef.current = false;
        lastPointRef.current = null;
      }}
    />
  );
}
