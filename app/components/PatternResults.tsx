'use client';

import { useRef, useEffect } from 'react';
import PatternContinuation from './PatternContinuation';

interface PatternMatch {
  startIndex: number;
  endIndex: number;
  similarity: number;
  data: number[];
  startTime: string;
  endTime: string;
  startTimestamp: number;
  endTimestamp: number;
  continuation: number[];
  continuationStartTime: string;
  continuationEndTime: string;
  continuationStartTimestamp: number;
  continuationEndTimestamp: number;
}

interface PatternResultsProps {
  matches: PatternMatch[];
  originalPattern: number[];
  symbol: string;
  interval: string;
}

function PatternChart({ 
  data, 
  title, 
  color = '#3b82f6',
  width = 300,
  height = 150 
}: { 
  data: number[]; 
  title: string; 
  color?: string;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas'ı temizle
    ctx.clearRect(0, 0, width, height);

    // Veriyi normalize et
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    if (range === 0) return;

    // Padding
    const padding = 20;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Grid çiz
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    // Yatay grid çizgileri
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * chartHeight / 4);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Dikey grid çizgileri
    for (let i = 0; i <= 4; i++) {
      const x = padding + (i * chartWidth / 4);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Veri çizgisini çiz
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((data[i] - min) / range) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Y ekseni değerleri
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * chartHeight / 4);
      const value = max - (i * range / 4);
      ctx.fillText(value.toFixed(2), padding - 5, y + 3);
    }

  }, [data, color, width, height]);

  return (
    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h4>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
      />
    </div>
  );
}

export default function PatternResults({ 
  matches, 
  originalPattern, 
  symbol, 
  interval 
}: PatternResultsProps) {
  if (matches.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Pattern Arama Sonuçları
        </h2>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Benzer Pattern Bulunamadı
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Çizdiğiniz pattern son 1 yıllık {symbol} verisinde bulunamadı.
            <br />
            Farklı bir pattern deneyin veya benzerlik eşiğini düşürün.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Pattern Arama Sonuçları
      </h2>

      {/* Özet */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
            Sembol
          </h3>
          <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {symbol}
          </p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
            Bulunan Eşleşme
          </h3>
          <p className="text-lg font-semibold text-green-900 dark:text-green-100">
            {matches.length}
          </p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
            En Yüksek Benzerlik
          </h3>
          <p className="text-lg font-semibold text-purple-900 dark:text-purple-100">
            {(matches[0]?.similarity * 100).toFixed(1)}%
          </p>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">
            Interval
          </h3>
          <p className="text-lg font-semibold text-orange-900 dark:text-orange-100">
            {interval}
          </p>
        </div>
      </div>

      {/* Orijinal Pattern */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Çizdiğiniz Pattern
        </h3>
        <div className="flex justify-center">
          <PatternChart
            data={originalPattern}
            title="Orijinal Pattern"
            color="#8b5cf6"
            width={400}
            height={200}
          />
        </div>
      </div>

              {/* Eşleşen Pattern'ler */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Bulunan Benzer Pattern&apos;ler ve Devamları
          </h3>
          
          <div className="space-y-8">
            {matches.map((match, index) => (
              <div 
                key={index}
                className="border border-gray-200 dark:border-slate-600 rounded-lg p-6 bg-white dark:bg-slate-800"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      Eşleşme #{index + 1}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(match.startTime).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })} - {new Date(match.continuationEndTime).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {(match.similarity * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">
                      benzerlik oranı
                    </div>
                  </div>
                </div>

                {/* Pattern + Continuation Chart */}
                <div className="mb-6">
                  <PatternContinuation
                    patternData={match.data}
                    continuationData={match.continuation}
                    title={`Pattern ve Devamı - ${new Date(match.startTime).toLocaleDateString('tr-TR')}`}
                    patternColor="#3b82f6"
                    continuationColor="#ef4444"
                    width={700}
                    height={250}
                  />
                </div>

                {/* Detaylar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pattern Detayları */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Pattern Dönemi
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Başlangıç:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {new Date(match.startTime).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Bitiş:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {new Date(match.endTime).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Veri Noktası:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {match.data.length} nokta
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Devam Detayları */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <h5 className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      Devam Dönemi
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Başlangıç:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {new Date(match.continuationStartTime).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Bitiş:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {new Date(match.continuationEndTime).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Veri Noktası:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {match.continuation.length} nokta
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analiz Özeti */}
                {match.continuation.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      💡 Analiz Özeti
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Bu pattern {new Date(match.startTime).toLocaleDateString('tr-TR')} tarihinde 
                      %{(match.similarity * 100).toFixed(1)} benzerlikle eşleşti. 
                      Pattern sonrasında {match.continuation.length} veri noktası boyunca 
                      {(() => {
                        const start = match.continuation[0];
                        const end = match.continuation[match.continuation.length - 1];
                        const change = ((end - start) / start) * 100;
                        if (Math.abs(change) < 1) return 'yatay seyir gösterdi';
                        return change > 0 
                          ? `%${change.toFixed(1)} yükseldi` 
                          : `%${Math.abs(change).toFixed(1)} düştü`;
                      })()}.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      
      {matches.length >= 10 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            En iyi 10 eşleşme gösteriliyor. Daha fazla sonuç için benzerlik eşiğini düşürün.
          </p>
        </div>
      )}
    </div>
  );
}
