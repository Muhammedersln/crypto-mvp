'use client';

import { useRef, useEffect, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface PatternDrawerProps {
  onPatternChange: (pattern: number[]) => void;
  width?: number;
  height?: number;
}

export default function PatternDrawer({ 
  onPatternChange, 
  width = 400, 
  height = 200 
}: PatternDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas'ı temizle
    ctx.clearRect(0, 0, width, height);
    
    // Grid çiz
    drawGrid(ctx);
    
    // Noktaları çiz
    if (points.length > 1) {
      drawPattern(ctx, points);
    }
  }, [points, width, height]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    // Dikey çizgiler
    for (let i = 0; i <= width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    
    // Yatay çizgiler
    for (let i = 0; i <= height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
  };

  const drawPattern = (ctx: CanvasRenderingContext2D, points: Point[]) => {
    if (points.length < 2) return;
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.stroke();
    
    // Noktaları çiz
    ctx.fillStyle = '#3b82f6';
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const getMousePos = (canvas: HTMLCanvasElement, e: React.MouseEvent): Point => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const pos = getMousePos(canvas, e);
    setPoints([pos]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const pos = getMousePos(canvas, e);
    setPoints(prev => [...prev, pos]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    convertToPattern();
  };

  const convertToPattern = () => {
    if (points.length < 2) return;
    
    // Noktaları Y ekseninde normalize et (0-1 arası)
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    const range = maxY - minY;
    
    if (range === 0) return;
    
    // X ekseninde eşit aralıklarla örnekle
    const sampleCount = 50; // 50 nokta
    const pattern: number[] = [];
    
    for (let i = 0; i < sampleCount; i++) {
      const targetX = (i / (sampleCount - 1)) * width;
      
      // En yakın noktayı bul veya interpolasyon yap
      let closestPoint = points[0];
      let minDistance = Math.abs(points[0].x - targetX);
      
      for (const point of points) {
        const distance = Math.abs(point.x - targetX);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      }
      
      // Y değerini normalize et (ters çevir çünkü canvas Y ekseninde yukarı negatif)
      const normalizedY = 1 - ((closestPoint.y - minY) / range);
      pattern.push(normalizedY);
    }
    
    onPatternChange(pattern);
  };

  const clearPattern = () => {
    setPoints([]);
    onPatternChange([]);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Pattern Çiz
        </h3>
        <button
          onClick={clearPattern}
          className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Temizle
        </button>
      </div>
      
      <div className="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="cursor-crosshair bg-white dark:bg-slate-700"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDrawing(false)}
        />
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        Fare ile istediğiniz pattern&apos;i çizin. Bu pattern son 1 yıllık veride aranacak.
      </p>
    </div>
  );
}
