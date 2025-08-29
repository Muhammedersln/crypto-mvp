'use client';

import { useRef, useEffect } from 'react';

interface TrendMatch {
  startIndex: number;
  endIndex: number;
  similarity: number;
  data: number[];
  continuation: number[];
  trendPattern?: number[]; // Yeni: trend pattern verisi
  continuationTrendPattern?: number[]; // Yeni: devam trend pattern verisi
  startTime: string;
  endTime: string;
  continuationStartTime: string;
  continuationEndTime: string;
  stats: {
    totalChange: number;
    volatility: number;
    upMoves: number;
    downMoves: number;
    sidewaysMoves: number;
    totalMoves: number;
    avgChange: number;
  };
}

interface TrendAnalysisProps {
  symbol: string;
  interval: string;
  analysisHours: number;
  recentData: number[];
  recentStats: {
    totalChange: number;
    volatility: number;
    upMoves: number;
    downMoves: number;
    sidewaysMoves: number;
    totalMoves: number;
    avgChange: number;
  };
  matches: TrendMatch[];
}

function TrendChart({ 
  data, 
  title, 
  color = '#3b82f6',
  width = 400,
  height = 150,
  timestamps
}: { 
  data: number[]; 
  title: string; 
  color?: string;
  width?: number;
  height?: number;
  timestamps?: number[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas'ı temizle
    ctx.clearRect(0, 0, width, height);

    // Fiyat verilerini al (LiveChart'taki gibi)
    const prices = data;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    if (priceRange === 0) return;

    // Padding ve boyutlar (LiveChart'taki gibi)
    const padding = { top: 20, right: 80, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Professional grid system (LiveChart'tan aynısı)
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

    // Fiyat değişimi kontrolü (LiveChart'taki gibi)
    const priceChange = prices[prices.length - 1] - prices[0];
    const isPositive = priceChange >= 0;

    // Fiyat çizgisini çiz (LiveChart'taki gibi)
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

    // Alan dolgusu (gradient) - LiveChart'taki gibi
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

    // Y ekseni değerleri (fiyat) - LiveChart'taki gibi
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i * chartHeight / 5);
      const price = maxPrice - (i * priceRange / 5);
      ctx.fillText('$' + price.toFixed(2), padding.left - 10, y + 4);
    }

    // X ekseni değerleri (zaman) - sadece timestamps varsa
    if (timestamps && timestamps.length > 0) {
      ctx.textAlign = 'center';
      for (let i = 0; i <= 6; i++) {
        const x = padding.left + (i * chartWidth / 6);
        const index = Math.floor((i / 6) * (timestamps.length - 1));
        const time = new Date(timestamps[index]);
        const timeStr = time.getHours().toString().padStart(2, '0') + ':' + 
                       time.getMinutes().toString().padStart(2, '0');
        ctx.fillText(timeStr, x, height - padding.bottom + 20);
      }
    }

    // Son fiyat çizgisi (LiveChart'taki gibi)
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

    // Son fiyat etiketi (LiveChart'taki gibi)
    ctx.fillStyle = isPositive ? '#10b981' : '#ef4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('$' + lastPrice.toFixed(2), width - padding.right + 5, lastY + 4);

  }, [data, color, width, height, timestamps]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        {title}
      </h4>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
}

export default function TrendAnalysis({ 
  symbol,
  interval,
  analysisHours,
  recentData,
  recentStats,
  matches 
}: TrendAnalysisProps) {
  const getTrendDirection = (change: number) => {
    if (change > 1) return { text: 'Güçlü Yükseliş', color: 'text-green-600', icon: '📈' };
    if (change > 0.1) return { text: 'Yükseliş', color: 'text-green-500', icon: '↗️' };
    if (change < -1) return { text: 'Güçlü Düşüş', color: 'text-red-600', icon: '📉' };
    if (change < -0.1) return { text: 'Düşüş', color: 'text-red-500', icon: '↘️' };
    return { text: 'Yatay', color: 'text-gray-500', icon: '➡️' };
  };

  const recentTrend = getTrendDirection(recentStats.totalChange);

  if (matches.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Trend Analizi Sonuçları
        </h2>
        
        {/* Güncel trend özeti */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Son {analysisHours} Saatlik Trend
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Toplam Değişim</span>
              <div className={`text-lg font-bold ${recentTrend.color}`}>
                {recentTrend.icon} {recentStats.totalChange.toFixed(2)}%
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Volatilite</span>
              <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                {recentStats.volatility.toFixed(2)}%
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Yükseliş/Düşüş</span>
              <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                {recentStats.upMoves}/{recentStats.downMoves}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Yatay Hareket</span>
              <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                {recentStats.sidewaysMoves}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Benzer Trend Bulunamadı
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Son {analysisHours} saatlik trend pattern&apos;i, son 1 yıllık veride bulunamadı.
            <br />
            Bu benzersiz bir fiyat hareketi olabilir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Trend Analizi Sonuçları
      </h2>

      {/* Güncel trend özeti */}
      <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
          Son {analysisHours} Saatlik Trend Analizi
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <TrendChart
              data={recentData}
              title={`${symbol} - Son ${analysisHours} Saat`}
              color="#3b82f6"
              width={450}
              height={200}
            />
          </div>
          
          <div className="space-y-4">
            {/* Fiyat Bilgileri (LiveChart tarzı) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Başlangıç Fiyatı
                </h6>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${recentData[0].toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Güncel Fiyat
                </h6>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${recentData[recentData.length - 1].toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  En Yüksek
                </h6>
                <p className="text-sm font-semibold text-green-600">
                  ${Math.max(...recentData).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  En Düşük
                </h6>
                <p className="text-sm font-semibold text-red-600">
                  ${Math.min(...recentData).toFixed(2)}
                </p>
              </div>
            </div>
            
            {/* Trend Analizi */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Genel Trend:</span>
                <span className={`font-bold ${recentTrend.color}`}>
                  {recentTrend.icon} {recentTrend.text}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Değişim:</span>
                <span className={`font-bold ${recentTrend.color}`}>
                  {recentStats.totalChange.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Volatilite:</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  {recentStats.volatility.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Hareket Dağılımı:</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  ↗️{recentStats.upMoves} / ↘️{recentStats.downMoves} / ➡️{recentStats.sidewaysMoves}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Özet istatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
            Bulunan Eşleşme
          </h3>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {matches.length}
          </p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
            En Yüksek Benzerlik
          </h3>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {(matches[0]?.similarity * 100).toFixed(1)}%
          </p>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">
            Analiz Süresi
          </h3>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {analysisHours}h
          </p>
        </div>
      </div>

      {/* Benzer trendler */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Geçmişte Benzer Trendler ve Devamları
        </h3>
        
        <div className="space-y-6">
          {matches.map((match, index) => {
            const matchTrend = getTrendDirection(match.stats.totalChange);
            const continuationChange = match.continuation.length > 1 
              ? ((match.continuation[match.continuation.length - 1] - match.continuation[0]) / match.continuation[0]) * 100
              : 0;
            const continuationTrend = getTrendDirection(continuationChange);
            
            return (
              <div 
                key={index}
                className="border border-gray-200 dark:border-slate-600 rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      Benzer Trend #{index + 1}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(match.startTime).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600">
                      {(match.similarity * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      benzerlik
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Benzer dönem */}
                  <div>
                    <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                      📊 Benzer Dönem
                    </h5>
                    <TrendChart
                      data={match.data}
                      title={`${new Date(match.startTime).toLocaleDateString('tr-TR')} - ${new Date(match.endTime).toLocaleDateString('tr-TR')}`}
                      color="#10b981"
                      width={400}
                      height={160}
                    />
                    {/* Fiyat İstatistikleri (LiveChart tarzı) */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                        <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Başlangıç Fiyatı
                        </h6>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${match.data[0].toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                        <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Bitiş Fiyatı
                        </h6>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${match.data[match.data.length - 1].toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                        <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          En Yüksek
                        </h6>
                        <p className="text-sm font-semibold text-green-600">
                          ${Math.max(...match.data).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                        <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          En Düşük
                        </h6>
                        <p className="text-sm font-semibold text-red-600">
                          ${Math.min(...match.data).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Trend:</span>
                        <span className={matchTrend.color}>{matchTrend.icon} {matchTrend.text}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Değişim:</span>
                        <span className={matchTrend.color}>{match.stats.totalChange.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Volatilite:</span>
                        <span>{match.stats.volatility.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Devamı */}
                  <div>
                    <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                      🔮 Sonrasında Ne Oldu?
                    </h5>
                    <TrendChart
                      data={match.continuation}
                      title={`${new Date(match.continuationStartTime).toLocaleDateString('tr-TR')} - ${new Date(match.continuationEndTime).toLocaleDateString('tr-TR')}`}
                      color="#ef4444"
                      width={400}
                      height={160}
                    />
                    {/* Devam Döneminin Fiyat İstatistikleri */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                        <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Başlangıç Fiyatı
                        </h6>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${match.continuation[0].toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                        <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Bitiş Fiyatı
                        </h6>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${match.continuation[match.continuation.length - 1].toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                        <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          En Yüksek
                        </h6>
                        <p className="text-sm font-semibold text-green-600">
                          ${Math.max(...match.continuation).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                        <h6 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          En Düşük
                        </h6>
                        <p className="text-sm font-semibold text-red-600">
                          ${Math.min(...match.continuation).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Devam Trendi:</span>
                        <span className={continuationTrend.color}>{continuationTrend.icon} {continuationTrend.text}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Devam Değişimi:</span>
                        <span className={continuationTrend.color}>{continuationChange.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Özet */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Analiz:</strong> {new Date(match.startTime).toLocaleDateString('tr-TR')} tarihinde 
                    %{(match.similarity * 100).toFixed(1)} benzerlikle eşleşen bu trend sonrasında{' '}
                    <span className={continuationTrend.color}>
                      {continuationChange > 0 ? 'yükseldi' : continuationChange < 0 ? 'düştü' : 'yatay seyretti'}
                    </span>
                    {' '}(%{Math.abs(continuationChange).toFixed(1)}).
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
