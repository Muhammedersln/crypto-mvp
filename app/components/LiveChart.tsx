'use client';

import { useRef, useEffect } from 'react';

interface ChartDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: string;
}

interface LiveChartProps {
  chartData: ChartDataPoint[];
  symbol: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  width?: number;
  height?: number;
}

export default function LiveChart({ 
  chartData,
  symbol,
  currentPrice,
  change,
  changePercent,
  high24h,
  low24h,
  volume24h,
  width = 800,
  height = 400 
}: LiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas'ı temizle
    ctx.clearRect(0, 0, width, height);

    // Fiyat verilerini al
    const prices = chartData.map(d => d.close);
    const volumes = chartData.map(d => d.volume);
    const timestamps = chartData.map(d => d.timestamp);

    // Min-Max değerleri
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    if (priceRange === 0) return;

    // Padding ve boyutlar
    const padding = { top: 20, right: 80, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Grid çiz
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    // Yatay grid çizgileri
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i * chartHeight / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Dikey grid çizgileri
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (i * chartWidth / 6);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    // Fiyat çizgisini çiz
    const isPositive = change >= 0;
    ctx.strokeStyle = isPositive ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (let i = 0; i < prices.length; i++) {
      const x = padding.left + (i / (prices.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((prices[i] - minPrice) / priceRange) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Alan dolgusu (gradient)
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    
    for (let i = 0; i < prices.length; i++) {
      const x = padding.left + (i / (prices.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((prices[i] - minPrice) / priceRange) * chartHeight;
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Y ekseni değerleri (fiyat)
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i * chartHeight / 5);
      const price = maxPrice - (i * priceRange / 5);
      ctx.fillText(price.toFixed(2), padding.left - 10, y + 4);
    }

    // X ekseni değerleri (zaman)
    ctx.textAlign = 'center';
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (i * chartWidth / 6);
      const index = Math.floor((i / 6) * (timestamps.length - 1));
      const time = new Date(timestamps[index]);
      const timeStr = time.getHours().toString().padStart(2, '0') + ':' + 
                     time.getMinutes().toString().padStart(2, '0');
      ctx.fillText(timeStr, x, height - padding.bottom + 20);
    }

    // Son fiyat çizgisi
    const lastPrice = prices[prices.length - 1];
    const lastY = padding.top + chartHeight - ((lastPrice - minPrice) / priceRange) * chartHeight;
    
    ctx.strokeStyle = isPositive ? '#10b981' : '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, lastY);
    ctx.lineTo(width - padding.right, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Son fiyat etiketi
    ctx.fillStyle = isPositive ? '#10b981' : '#ef4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(lastPrice.toFixed(2), width - padding.right + 5, lastY + 4);

  }, [chartData, width, height, change]);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const isPositive = change >= 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {symbol} Güncel Grafik
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Son 24 saat
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${currentPrice.toFixed(2)}
          </div>
          <div className={`text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
          style={{ maxWidth: '100%' }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            24s Yüksek
          </h3>
          <p className="text-lg font-semibold text-green-600">
            ${high24h.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            24s Düşük
          </h3>
          <p className="text-lg font-semibold text-red-600">
            ${low24h.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            24s Hacim
          </h3>
          <p className="text-lg font-semibold text-blue-600">
            {formatNumber(volume24h)}
          </p>
        </div>
      </div>
    </div>
  );
}
