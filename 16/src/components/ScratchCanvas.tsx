import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

import { clamp } from '@/utils/format';

type ScratchCanvasProps = {
  panelId: string;
  width?: number;
  height?: number;
  brushRadius: number;
  revealed: boolean;
  reducedMotion: boolean;
  externalProgress: number;
  onProgress: (percent: number) => void;
  onScratchDistance: (distance: number) => void;
  onScratchActiveChange?: (active: boolean) => void;
};

type Point = { x: number; y: number };

export function ScratchCanvas({
  panelId,
  width = 900,
  height = 540,
  brushRadius,
  revealed,
  reducedMotion,
  externalProgress,
  onProgress,
  onScratchDistance,
  onScratchActiveChange,
}: ScratchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const drawingRef = useRef(false);
  const samplePointsRef = useRef<Point[]>([]);
  const clearedRef = useRef<Set<number>>(new Set());
  const notifiedPercentRef = useRef(0);
  const sampledTargetRef = useRef(0);

  const sampleStep = useMemo(() => Math.max(10, Math.round(brushRadius * 0.45)), [brushRadius]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const deviceScale = window.devicePixelRatio || 1;
    canvas.width = width * deviceScale;
    canvas.height = height * deviceScale;
    context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#d5b377';
    context.fillRect(0, 0, width, height);

    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(255,255,255,0.18)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.05)');
    gradient.addColorStop(1, 'rgba(8,12,24,0.22)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = 'rgba(255,255,255,0.08)';
    context.lineWidth = 1.2;
    for (let y = 34; y < height; y += 76) {
      context.beginPath();
      context.moveTo(28, y);
      context.lineTo(width - 28, y);
      context.stroke();
    }
    for (let x = 44; x < width; x += 92) {
      context.beginPath();
      context.moveTo(x, 24);
      context.lineTo(x, height - 24);
      context.stroke();
    }

    context.fillStyle = 'rgba(255,255,255,0.1)';
    context.font = "700 28px 'IBM Plex Sans KR', sans-serif";
    context.textAlign = 'center';
    context.fillText('Brush the seal to uncover the hidden runes.', width / 2, height / 2);

    const samplePoints: Point[] = [];
    for (let y = sampleStep / 2; y < height; y += sampleStep) {
      for (let x = sampleStep / 2; x < width; x += sampleStep) {
        samplePoints.push({ x, y });
      }
    }
    samplePointsRef.current = samplePoints;
    clearedRef.current = new Set();
    notifiedPercentRef.current = 0;
    sampledTargetRef.current = 0;
    onProgress(0);
  }, [height, onProgress, panelId, sampleStep, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const current = sampledTargetRef.current;
    if (externalProgress <= current + 1.5) return;
    sampledTargetRef.current = externalProgress;
    const context = canvas.getContext('2d');
    if (!context) return;
    const samplePoints = samplePointsRef.current;
    const targetSamples = Math.floor((externalProgress / 100) * samplePoints.length);
    while (clearedRef.current.size < targetSamples) {
      const point = samplePoints[Math.floor(Math.random() * samplePoints.length)];
      if (!point) break;
      stampBrush(context, point, brushRadius * 0.94, reducedMotion ? 0.3 : 0.5);
      markSamples(point, brushRadius * 0.94, samplePoints, clearedRef.current);
    }
    publishProgress(samplePoints.length, clearedRef.current.size, notifiedPercentRef, onProgress);
  }, [brushRadius, externalProgress, onProgress, reducedMotion, revealed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.opacity = revealed ? '0' : '1';
  }, [panelId, revealed]);

  const getCanvasPoint = (event: PointerEvent | ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: clamp((event.clientX - rect.left) * scaleX, 0, width),
      y: clamp((event.clientY - rect.top) * scaleY, 0, height),
    };
  };

  const drawSegment = (from: Point, to: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const samplePoints = samplePointsRef.current;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / Math.max(3, brushRadius * 0.22)));
    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps;
      const point = {
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
      };
      stampBrush(context, point, brushRadius, reducedMotion ? 0.58 : 0.72);
      markSamples(point, brushRadius, samplePoints, clearedRef.current);
    }
    publishProgress(samplePoints.length, clearedRef.current.size, notifiedPercentRef, onProgress);
    onScratchDistance(distance);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (revealed) return;
    drawingRef.current = true;
    onScratchActiveChange?.(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    lastPointRef.current = point;
    drawSegment(point, point);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || revealed) return;
    const point = getCanvasPoint(event);
    const previous = lastPointRef.current ?? point;
    drawSegment(previous, point);
    lastPointRef.current = point;
  };

  const finishScratch = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
    onScratchActiveChange?.(false);
  };

  return (
    <canvas
      ref={canvasRef}
      className="pg-absolute pg-inset-0 pg-h-full pg-w-full pg-touch-none pg-rounded-[28px] pg-transition-opacity pg-duration-300"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishScratch}
      onPointerCancel={finishScratch}
      onPointerLeave={() => {
        if (!drawingRef.current) return;
        finishScratch();
      }}
    />
  );
}

function stampBrush(context: CanvasRenderingContext2D, point: Point, radius: number, softness: number) {
  const gradient = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${softness})`);
  gradient.addColorStop(0.55, `rgba(0, 0, 0, ${softness * 0.56})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  context.save();
  context.globalCompositeOperation = 'destination-out';
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function markSamples(point: Point, radius: number, samplePoints: Point[], cleared: Set<number>) {
  const radiusSquared = radius * radius;
  for (let index = 0; index < samplePoints.length; index += 1) {
    if (cleared.has(index)) continue;
    const sample = samplePoints[index];
    const dx = sample.x - point.x;
    const dy = sample.y - point.y;
    if (dx * dx + dy * dy <= radiusSquared) {
      cleared.add(index);
    }
  }
}

function publishProgress(
  totalSamples: number,
  clearedCount: number,
  notifiedPercentRef: MutableRefObject<number>,
  onProgress: (percent: number) => void,
) {
  const percent = totalSamples === 0 ? 0 : clamp((clearedCount / totalSamples) * 100, 0, 100);
  if (Math.abs(percent - notifiedPercentRef.current) >= 0.35) {
    notifiedPercentRef.current = percent;
    onProgress(percent);
  }
}
