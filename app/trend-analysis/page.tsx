'use client';

import { useState } from 'react';
import TrendAnalysis from '../components/TrendAnalysis';

interface TrendAnalysisData {
  symbol?: string;
  interval?: string;
  analysisHours?: number;
  recentData?: number[];
  recentStats?: unknown;
  matches?: unknown[];
  error?: string;
}

export default function TrendAnalysisPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('15m');
  const [analysisHours, setAnalysisHours] = useState(6);
  const [trendAnalysisData, setTrendAnalysisData] = useState<TrendAnalysisData | null>(null);
  const [isTrendAnalyzing, setIsTrendAnalyzing] = useState(false);

  const handleTrendAnalysis = async () => {
    setIsTrendAnalyzing(true);
    setTrendAnalysisData(null);
    
    try {
      const response = await fetch('/api/trend-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          interval,
          analysisHours: analysisHours.toString()
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Trend analizi başarısız');
      }
      
      setTrendAnalysisData(data);
    } catch (error) {
      console.error('Trend analysis hatası:', error);
      setTrendAnalysisData({ 
        error: error instanceof Error ? error.message : 'Trend analizi başarısız' 
      });
    } finally {
      setIsTrendAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Trend Analizi
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Mevcut fiyat trendini analiz edin ve geçmiş benzer trendlerin devamlarını inceleyin
          </p>
        </div>

        {/* Settings Panel */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kripto Para
                </label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="BTCUSDT">Bitcoin (BTC/USDT)</option>
                  <option value="ETHUSDT">Ethereum (ETH/USDT)</option>
                  <option value="ADAUSDT">Cardano (ADA/USDT)</option>
                  <option value="DOTUSDT">Polkadot (DOT/USDT)</option>
                  <option value="LINKUSDT">Chainlink (LINK/USDT)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zaman Aralığı
                </label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="1m">1 Dakika</option>
                  <option value="5m">5 Dakika</option>
                  <option value="15m">15 Dakika</option>
                  <option value="1h">1 Saat</option>
                  <option value="4h">4 Saat</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Analiz Süresi (Saat)
                </label>
                <select
                  value={analysisHours}
                  onChange={(e) => setAnalysisHours(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value={3}>Son 3 Saat</option>
                  <option value={6}>Son 6 Saat</option>
                  <option value={12}>Son 12 Saat</option>
                  <option value={24}>Son 24 Saat</option>
                </select>
              </div>
            </div>
            
            {/* Analysis Button */}
            <button
              onClick={handleTrendAnalysis}
              disabled={isTrendAnalyzing}
              className="w-full h-14 px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              {isTrendAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Trend Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>Trend Analizi Başlat</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {trendAnalysisData?.error && (
          <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <div className="text-red-800 dark:text-red-200 font-medium mb-1">Trend Analizi Hatası</div>
                <div className="text-red-700 dark:text-red-300 text-sm">
                  {trendAnalysisData.error}
                </div>
                <button
                  onClick={handleTrendAnalysis}
                  className="mt-3 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                  disabled={isTrendAnalyzing}
                >
                  {isTrendAnalyzing ? 'Yeniden Analiz Ediliyor...' : 'Tekrar Analiz Et'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {trendAnalysisData && !trendAnalysisData.error && (
          <div className="mb-8">
            <TrendAnalysis
              symbol={trendAnalysisData.symbol || ''}
              interval={trendAnalysisData.interval || ''}
              analysisHours={trendAnalysisData.analysisHours || 0}
              recentData={trendAnalysisData.recentData || []}
              recentStats={trendAnalysisData.recentStats as {
                totalChange: number;
                volatility: number;
                upMoves: number;
                downMoves: number;
                sidewaysMoves: number;
                totalMoves: number;
                avgChange: number;
              }}
              matches={(trendAnalysisData.matches || []) as {
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
                stats: {
                  totalChange: number;
                  volatility: number;
                  upMoves: number;
                  downMoves: number;
                  sidewaysMoves: number;
                  totalMoves: number;
                  avgChange: number;
                };
              }[]}
            />
          </div>
        )}

        {/* Info */}
        <div className="max-w-2xl mx-auto mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trend analizi, mevcut fiyat hareketini geçmiş benzer trendlerle karşılaştırarak potansiyel devamları tahmin eder.
          </p>
        </div>
      </div>
    </div>
  );
}
