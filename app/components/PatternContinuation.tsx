'use client';

import { useRef, useEffect } from 'react';

interface PatternContinuationProps {
  patternData: number[];
  continuationData: number[];
  title: string;
  patternColor?: string;
  continuationColor?: string;
  width?: number;
  height?: number;
}

export default function PatternContinuation({ 
  patternData,
  continuationData,
  title,
  patternColor = '#3b82f6',
  continuationColor = '#ef4444',
  width = 500,
  height = 200 
}: PatternContinuationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || patternData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas'ı temizle
    ctx.clearRect(0, 0, width, height);

    // Tüm veriyi birleştir
    const allData = [...patternData, ...continuationData];
    if (allData.length === 0) return;

    // Her veri setini ayrı normalize et (gerçek değer aralıklarını koru)
    const patternMin = Math.min(...patternData);
    const patternMax = Math.max(...patternData);
    const continuationMin = continuationData.length > 0 ? Math.min(...continuationData) : patternMin;
    const continuationMax = continuationData.length > 0 ? Math.max(...continuationData) : patternMax;
    
    // Genel min-max (Y ekseni için)
    const globalMin = Math.min(patternMin, continuationMin);
    const globalMax = Math.max(patternMax, continuationMax);
    const globalRange = globalMax - globalMin;

    if (globalRange === 0) return;

    // Padding
    const padding = 30;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Professional grid system (LiveChart style)
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    // Yatay grid çizgileri (5 çizgi)
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * chartHeight / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Dikey grid çizgileri (6 çizgi)
    for (let i = 0; i <= 6; i++) {
      const x = padding + (i * chartWidth / 6);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Pattern ve continuation ayrım çizgisi
    const patternEndX = padding + (patternData.length / allData.length) * chartWidth;
    if (continuationData.length > 0) {
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(patternEndX, padding);
      ctx.lineTo(patternEndX, height - padding);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Pattern çizgisi ve gradient fill (LiveChart style)
    if (patternData.length > 0) {
      // Gradient fill area için path oluştur
      const patternPath = new Path2D();
      patternPath.moveTo(padding, height - padding);
      
      for (let i = 0; i < patternData.length; i++) {
        const x = padding + (i / (allData.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((patternData[i] - globalMin) / globalRange) * chartHeight;
        patternPath.lineTo(x, y);
      }
      
      patternPath.lineTo(padding + ((patternData.length - 1) / (allData.length - 1)) * chartWidth, height - padding);
      patternPath.closePath();

      // Gradient fill
      const patternGradient = ctx.createLinearGradient(0, padding, 0, height - padding);
      patternGradient.addColorStop(0, patternColor + '20'); // 20% opacity
      patternGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = patternGradient;
      ctx.fill(patternPath);

      // Pattern çizgisi
      ctx.strokeStyle = patternColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (let i = 0; i < patternData.length; i++) {
        const x = padding + (i / (allData.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((patternData[i] - globalMin) / globalRange) * chartHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Continuation çizgisi ve gradient fill (LiveChart style)
    if (continuationData.length > 0) {
      // Continuation gradient fill area
      const continuationPath = new Path2D();
      const startX = padding + ((patternData.length - 1) / (allData.length - 1)) * chartWidth;
      continuationPath.moveTo(startX, height - padding);
      
      // Pattern'in son noktasından başla
      if (patternData.length > 0) {
        const lastPatternY = padding + chartHeight - ((patternData[patternData.length - 1] - globalMin) / globalRange) * chartHeight;
        continuationPath.lineTo(startX, lastPatternY);
      }
      
      for (let i = 0; i < continuationData.length; i++) {
        const dataIndex = patternData.length + i;
        const x = padding + (dataIndex / (allData.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((continuationData[i] - globalMin) / globalRange) * chartHeight;
        continuationPath.lineTo(x, y);
      }
      
      const endX = padding + ((patternData.length + continuationData.length - 1) / (allData.length - 1)) * chartWidth;
      continuationPath.lineTo(endX, height - padding);
      continuationPath.closePath();

      // Continuation gradient fill
      const continuationGradient = ctx.createLinearGradient(0, padding, 0, height - padding);
      continuationGradient.addColorStop(0, continuationColor + '20'); // 20% opacity
      continuationGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = continuationGradient;
      ctx.fill(continuationPath);

      // Continuation çizgisi
      ctx.strokeStyle = continuationColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (let i = 0; i < continuationData.length; i++) {
        const dataIndex = patternData.length + i;
        const x = padding + (dataIndex / (allData.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((continuationData[i] - globalMin) / globalRange) * chartHeight;

        if (i === 0) {
          // Pattern'in son noktasından başla
          if (patternData.length > 0) {
            const prevX = padding + ((patternData.length - 1) / (allData.length - 1)) * chartWidth;
            const prevY = padding + chartHeight - ((patternData[patternData.length - 1] - globalMin) / globalRange) * chartHeight;
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
          } else {
            ctx.moveTo(x, y);
          }
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Y ekseni değerleri (LiveChart style)
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * chartHeight / 5);
      const value = globalMax - (i * globalRange / 5);
      ctx.fillText(value.toFixed(2), padding - 10, y + 4);
    }

    // Legend
    const legendY = height - 10;
    
    // Pattern legend
    ctx.fillStyle = patternColor;
    ctx.fillRect(padding, legendY - 10, 15, 3);
    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Pattern', padding + 20, legendY - 5);

    // Continuation legend
    if (continuationData.length > 0) {
      ctx.fillStyle = continuationColor;
      ctx.fillRect(padding + 80, legendY - 10, 15, 3);
      ctx.fillStyle = '#374151';
      ctx.fillText('Devamı', padding + 100, legendY - 5);
    }

  }, [patternData, continuationData, patternColor, continuationColor, width, height]);

  // Trend analizi
  const analyzeTrend = (data: number[]) => {
    if (data.length < 2) return 'Yeterli veri yok';
    
    const start = data[0];
    const end = data[data.length - 1];
    const change = ((end - start) / start) * 100;
    
    if (Math.abs(change) < 1) return 'Yatay';
    return change > 0 ? `Yükseliş (+${change.toFixed(1)}%)` : `Düşüş (${change.toFixed(1)}%)`;
  };

  const patternTrend = analyzeTrend(patternData);
  const continuationTrend = continuationData.length > 0 ? analyzeTrend(continuationData) : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pattern eşleşmesi ve devamı
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Pattern: {patternTrend}
              </span>
            </div>
            {continuationTrend && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500 rounded"></div>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  Devamı: {continuationTrend}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
          style={{ maxWidth: '100%' }}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
            Pattern
          </h5>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {patternData.length} veri noktası
          </p>
        </div>
        {continuationData.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">
              Devamı
            </h5>
            <p className="text-sm font-medium text-red-900 dark:text-red-100">
              {continuationData.length} veri noktası
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
