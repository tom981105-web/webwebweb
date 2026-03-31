import { useEffect, useRef } from 'react';

import { clamp, mulberry32, randomBetween } from '@/utils/random';

const INTERNAL_WIDTH = 840;
const INTERNAL_HEIGHT = 480;
const SAMPLE_GAP = 8;
const PROGRESS_DELTA_TO_EMIT = 0.2;

type Point = { x: number; y: number };
type CoverageGrid = {
  cols: number;
  rows: number;
  total: number;
  cleared: number;
  flags: Uint8Array;
};

function hashPanelId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) + 1;
}

function pointToSegmentDistance(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (!dx && !dy) return Math.hypot(point.x - start.x, point.y - start.y);
  const projection = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const t = clamp(projection, 0, 1);
  const nearestX = start.x + dx * t;
  const nearestY = start.y + dy * t;
  return Math.hypot(point.x - nearestX, point.y - nearestY);
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
  const lastEmittedPercentRef = useRef(0);
  const coverageGridRef = useRef<CoverageGrid | null>(null);

  const createCoverageGrid = () => {
    const cols = Math.ceil(INTERNAL_WIDTH / SAMPLE_GAP);
    const rows = Math.ceil(INTERNAL_HEIGHT / SAMPLE_GAP);
    coverageGridRef.current = {
      cols,
      rows,
      total: cols * rows,
      cleared: 0,
      flags: new Uint8Array(cols * rows),
    };
    measuredPercentRef.current = 0;
    lastEmittedPercentRef.current = 0;
  };

  const getCoveragePercent = () => {
    const grid = coverageGridRef.current;
    if (!grid || grid.total <= 0) return 0;
    return (grid.cleared / grid.total) * 100;
  };

  const emitProgress = (distance: number, force = false) => {
    const percent = getCoveragePercent();
    measuredPercentRef.current = percent;
    if (force || Math.abs(percent - lastEmittedPercentRef.current) >= PROGRESS_DELTA_TO_EMIT || distance === 0) {
      lastEmittedPercentRef.current = percent;
      onProgress(percent, distance);
    }
  };

  const drawCover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    const gradient = ctx.createLinearGradient(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    gradient.addColorStop(0, '#374056');
    gradient.addColorStop(0.48, '#20273a');
    gradient.addColorStop(1, '#121824');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

    ctx.globalAlpha = 0.2;
    for (let index = 0; index < 18; index += 1) {
      const padding = 22 + index * 5;
      ctx.beginPath();
      ctx.strokeStyle = index % 2 === 0 ? '#8edaf8' : '#f1d48f';
      ctx.lineWidth = index % 4 === 0 ? 2 : 1;
      ctx.roundRect(padding, padding, INTERNAL_WIDTH - padding * 2, INTERNAL_HEIGHT - padding * 2, 18);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.12;
    for (let index = 0; index < 44; index += 1) {
      const x = ((index * 97) % INTERNAL_WIDTH) + 10;
      const y = ((index * 53) % INTERNAL_HEIGHT) + 6;
      ctx.beginPath();
      ctx.arc(x, y, 2 + (index % 4), 0, Math.PI * 2);
      ctx.fillStyle = index % 3 === 0 ? '#f5d37a' : '#8ddcf8';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const eraseStamp = (ctx: CanvasRenderingContext2D, point: Point, radius: number) => {
    const inner = Math.max(4, radius * 0.18);
    const gradient = ctx.createRadialGradient(point.x, point.y, inner, point.x, point.y, radius);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.58, 'rgba(0,0,0,0.96)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const markCoverageAlongStroke = (from: Point, to: Point, radius: number) => {
    const grid = coverageGridRef.current;
    if (!grid) return;

    const { cols, rows, flags } = grid;
    const minX = clamp(Math.floor((Math.min(from.x, to.x) - radius) / SAMPLE_GAP), 0, cols - 1);
    const maxX = clamp(Math.ceil((Math.max(from.x, to.x) + radius) / SAMPLE_GAP), 0, cols - 1);
    const minY = clamp(Math.floor((Math.min(from.y, to.y) - radius) / SAMPLE_GAP), 0, rows - 1);
    const maxY = clamp(Math.ceil((Math.max(from.y, to.y) + radius) / SAMPLE_GAP), 0, rows - 1);
    const hitRadius = radius * 0.92;

    for (let row = minY; row <= maxY; row += 1) {
      for (let col = minX; col <= maxX; col += 1) {
        const index = row * cols + col;
        if (flags[index]) continue;
        const samplePoint = {
          x: col * SAMPLE_GAP + SAMPLE_GAP * 0.5,
          y: row * SAMPLE_GAP + SAMPLE_GAP * 0.5,
        };
        if (pointToSegmentDistance(samplePoint, from, to) <= hitRadius) {
          flags[index] = 1;
          grid.cleared += 1;
        }
      }
    }
  };

  const eraseStroke = (from: Point, to: Point, radius: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / Math.max(2, radius * 0.16)));

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      eraseStamp(ctx, { x: from.x + dx * t, y: from.y + dy * t }, radius);
    }
    ctx.restore();

    markCoverageAlongStroke(from, to, radius);
  };

  const replayScratchTo = (targetPercent: number) => {
    const rng = mulberry32(hashPanelId(panelId));
    let attempts = 0;
    while (attempts < 150 && measuredPercentRef.current < targetPercent - 0.4) {
      const from = { x: rng() * INTERNAL_WIDTH, y: rng() * INTERNAL_HEIGHT };
      const angle = rng() * Math.PI * 2;
      const length = randomBetween(46, 156);
      const to = {
        x: clamp(from.x + Math.cos(angle) * length, 0, INTERNAL_WIDTH),
        y: clamp(from.y + Math.sin(angle) * length, 0, INTERNAL_HEIGHT),
      };
      eraseStroke(from, to, reducedMotion ? brushRadius * 0.9 : brushRadius);
      measuredPercentRef.current = getCoveragePercent();
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
    createCoverageGrid();
    drawCover();

    if (revealed) {
      canvasRef.current?.getContext('2d')?.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
      measuredPercentRef.current = 100;
      lastEmittedPercentRef.current = 100;
      return;
    }

    if (scratchedPercent > 0) {
      replayScratchTo(scratchedPercent);
      measuredPercentRef.current = getCoveragePercent();
      lastEmittedPercentRef.current = measuredPercentRef.current;
    }
  }, [panelId, brushRadius, revealed, scratchedPercent, reducedMotion]);

  useEffect(() => {
    if (revealed) {
      canvasRef.current?.getContext('2d')?.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
      measuredPercentRef.current = 100;
      lastEmittedPercentRef.current = 100;
      return;
    }

    if (scratchedPercent > measuredPercentRef.current + 0.6) {
      replayScratchTo(scratchedPercent);
      measuredPercentRef.current = getCoveragePercent();
      lastEmittedPercentRef.current = measuredPercentRef.current;
    }
  }, [scratchedPercent, revealed, panelId, brushRadius, reducedMotion]);

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
        emitProgress(0, true);
      }}
      onPointerMove={(event) => {
        if (!drawingRef.current || revealed) return;
        const nextPoint = getPoint(event);
        const lastPoint = lastPointRef.current;
        if (!nextPoint || !lastPoint) return;
        eraseStroke(lastPoint, nextPoint, brushRadius);
        const distance = Math.hypot(nextPoint.x - lastPoint.x, nextPoint.y - lastPoint.y);
        lastPointRef.current = nextPoint;
        emitProgress(distance);
      }}
      onPointerUp={(event) => {
        drawingRef.current = false;
        lastPointRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={(event) => {
        drawingRef.current = false;
        lastPointRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerLeave={() => {
        drawingRef.current = false;
        lastPointRef.current = null;
      }}
    />
  );
}
