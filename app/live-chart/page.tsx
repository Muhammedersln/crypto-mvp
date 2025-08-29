'use client';

import { useState } from 'react';
import LiveChart from '../components/LiveChart';

interface LiveChartData {
  symbol?: string;
  chartData?: unknown[];
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  error?: string;
}

export default function LiveChartPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('15m');
  const [hours, setHours] = useState(24);
  const [liveChartData, setLiveChartData] = useState<LiveChartData | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  const handleLoadChart = async () => {
    setIsLoadingChart(true);
    setLiveChartData(null);
    
    try {
      const response = await fetch(`/api/live-chart?symbol=${symbol}&interval=${interval}&hours=${hours}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Grafik yüklenemedi');
      }
      
      setLiveChartData(data);
    } catch (error) {
      console.error('Live chart hatası:', error);
      setLiveChartData({ 
        error: error instanceof Error ? error.message : 'Grafik yüklenemedi' 
      });
    } finally {
      setIsLoadingChart(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Canlı Grafik
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Gerçek zamanlı fiyat hareketlerini ve piyasa verilerini görüntüleyin
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
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
                  Zaman Aralığı (Saat)
                </label>
                <select
                  value={hours}
                  onChange={(e) => setHours(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value={6}>Son 6 Saat</option>
                  <option value={12}>Son 12 Saat</option>
                  <option value={24}>Son 24 Saat</option>
                  <option value={48}>Son 48 Saat</option>
                  <option value={168}>Son 1 Hafta</option>
                </select>
              </div>
            </div>
            
            {/* Load Chart Button */}
            <button
              onClick={handleLoadChart}
              disabled={isLoadingChart}
              className="w-full h-14 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              {isLoadingChart ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Grafik Yükleniyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Canlı Grafik Yükle</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {liveChartData?.error && (
          <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <div className="text-red-800 dark:text-red-200 font-medium mb-1">Canlı Grafik Hatası</div>
                <div className="text-red-700 dark:text-red-300 text-sm">
                  {liveChartData.error}
                </div>
                <button
                  onClick={handleLoadChart}
                  className="mt-3 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                  disabled={isLoadingChart}
                >
                  {isLoadingChart ? 'Yeniden Yükleniyor...' : 'Tekrar Yükle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chart Results */}
        {liveChartData && !liveChartData.error && (
          <div className="mb-8">
            <LiveChart
              chartData={(liveChartData.chartData || []) as {
                timestamp: number;
                open: number;
                high: number;
                low: number;
                close: number;
                volume: number;
                time: string;
              }[]}
              symbol={liveChartData.symbol || symbol}
              currentPrice={liveChartData.currentPrice || 0}
              change={liveChartData.change || 0}
              changePercent={liveChartData.changePercent || 0}
              high24h={liveChartData.high24h || 0}
              low24h={liveChartData.low24h || 0}
              volume24h={liveChartData.volume24h || 0}
            />
          </div>
        )}

        {/* Auto-refresh Info */}
        <div className="max-w-2xl mx-auto mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Grafik verileri manuel olarak yüklenir. Güncel veriler için &quot;Canlı Grafik Yükle&quot; butonuna tıklayın.
          </p>
        </div>
      </div>
    </div>
  );
}
