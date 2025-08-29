'use client';

import { useState } from 'react';
import useSWR from 'swr';
import PatternDrawer from './components/PatternDrawer';
import PatternResults from './components/PatternResults';
import LiveChart from './components/LiveChart';
import TrendAnalysis from './components/TrendAnalysis';

interface AnalyzeResponse {
  symbol: string;
  interval: string;
  window: number;
  ok: boolean;
  metrics: {
    corr: number;
    cos: number;
  };
}

interface HistoricalResult {
  symbol?: string;
  interval?: string;
  totalDataPoints?: number;
  startTime?: string;
  endTime?: string;
  chunks?: number;
  error?: string;
}

interface PatternResult {
  matches?: unknown[];
  error?: string;
}

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

interface TrendAnalysisData {
  symbol?: string;
  interval?: string;
  analysisHours?: number;
  recentData?: number[];
  recentStats?: unknown;
  matches?: unknown[];
  error?: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }
  
  return response.json();
};

export default function Home() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('15m');
  const [window, setWindow] = useState(60);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTestingHistorical, setIsTestingHistorical] = useState(false);
  const [historicalResult, setHistoricalResult] = useState<HistoricalResult | null>(null);
  
  // Pattern matching state
  const [currentPattern, setCurrentPattern] = useState<number[]>([]);
  const [isPatternSearching, setIsPatternSearching] = useState(false);
  const [patternResults, setPatternResults] = useState<PatternResult | null>(null);
  const [activeTab, setActiveTab] = useState<'similarity' | 'pattern' | 'live' | 'trend'>('similarity');
  
  // Live chart state
  const [liveChartData, setLiveChartData] = useState<LiveChartData | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  
  // Trend analysis state
  const [trendAnalysisData, setTrendAnalysisData] = useState<TrendAnalysisData | null>(null);
  const [isTrendAnalyzing, setIsTrendAnalyzing] = useState(false);

  const { data, error, mutate, isLoading } = useSWR<AnalyzeResponse>(
    `/api/analyze?symbol=${symbol}&interval=${interval}&window=${window}`,
    fetcher,
    {
      refreshInterval: 30000, // 30 saniye
      revalidateOnFocus: false,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
      onError: (error) => {
        console.error('SWR API hatası:', error);
      }
    }
  );

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await mutate();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTestHistorical = async () => {
    setIsTestingHistorical(true);
    setHistoricalResult(null);
    try {
      const response = await fetch(`/api/historical?symbol=${symbol}&interval=${interval}`);
      const data = await response.json();
      setHistoricalResult(data);
    } catch (error) {
      console.error('Historical test hatası:', error);
      setHistoricalResult({ error: 'Test başarısız' });
    } finally {
      setIsTestingHistorical(false);
    }
  };

  const handlePatternSearch = async () => {
    if (currentPattern.length === 0) {
      alert('Önce bir pattern çizin!');
      return;
    }

    setIsPatternSearching(true);
    setPatternResults(null);
    
    try {
      const response = await fetch('/api/pattern-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          interval,
          pattern: JSON.stringify(currentPattern),
          threshold: '0.80',
          maxMatches: '8',
          continuationLength: '30'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Pattern arama başarısız');
      }
      
      setPatternResults(data);
    } catch (error) {
      console.error('Pattern search hatası:', error);
      setPatternResults({ 
        error: error instanceof Error ? error.message : 'Pattern arama başarısız' 
      });
    } finally {
      setIsPatternSearching(false);
    }
  };

  const handleLoadChart = async () => {
    setIsLoadingChart(true);
    setLiveChartData(null);
    
    try {
      const response = await fetch(`/api/live-chart?symbol=${symbol}&interval=${interval}&hours=24`);
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
          analysisHours: '6'
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

  const getSimilarityText = (ok: boolean) => {
    return ok ? 'Benzer' : 'Benzer Değil';
  };

  const getSimilarityColor = (ok: boolean) => {
    return ok ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Crypto Similarity MVP
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Kripto para fiyat benzerlik analizi ve pattern arama
          </p>
        </div>

        {/* Tab Navigation - Binance Style */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="flex">
              <button
                onClick={() => setActiveTab('similarity')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 relative ${
                  activeTab === 'similarity'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Benzerlik Analizi</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('pattern')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 relative ${
                  activeTab === 'pattern'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                  <span>Pattern Arama</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('live')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 relative ${
                  activeTab === 'live'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-b-2 border-green-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>Güncel Grafik</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('trend')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 relative ${
                  activeTab === 'trend'
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-b-2 border-purple-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Trend Analizi</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Control Panel - Binance Style */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Symbol Select */}
              <div className="space-y-2">
                <label htmlFor="symbol" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Trading Pair
              </label>
                <div className="relative">
                  <select
                id="symbol"
                value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-gray-50 dark:bg-slate-700 border-0 rounded-lg text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-yellow-500 focus:bg-white dark:focus:bg-slate-600 transition-all appearance-none cursor-pointer"
                  >
                    <option value="BTCUSDT">🟠 BTC/USDT</option>
                    <option value="ETHUSDT">🔵 ETH/USDT</option>
                    <option value="BNBUSDT">🟡 BNB/USDT</option>
                    <option value="XRPUSDT">🔵 XRP/USDT</option>
                    <option value="ADAUSDT">🔵 ADA/USDT</option>
                    <option value="SOLUSDT">🟣 SOL/USDT</option>
                    <option value="DOGEUSDT">🟡 DOGE/USDT</option>
                    <option value="DOTUSDT">🔴 DOT/USDT</option>
                    <option value="AVAXUSDT">🔴 AVAX/USDT</option>
                    <option value="MATICUSDT">🟣 MATIC/USDT</option>
                    <option value="LTCUSDT">🔵 LTC/USDT</option>
                    <option value="LINKUSDT">🔵 LINK/USDT</option>
                    <option value="ATOMUSDT">⚫ ATOM/USDT</option>
                    <option value="UNIUSDT">🦄 UNI/USDT</option>
                    <option value="FILUSDT">🔵 FIL/USDT</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
            </div>

            {/* Interval Select */}
              <div className="space-y-2">
                <label htmlFor="interval" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Time Frame
              </label>
                <div className="relative">
              <select
                id="interval"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                    className="w-full h-12 px-4 pr-10 bg-gray-50 dark:bg-slate-700 border-0 rounded-lg text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-yellow-500 focus:bg-white dark:focus:bg-slate-600 transition-all appearance-none cursor-pointer"
                  >
                    <option value="1m">📊 1 Dakika</option>
                    <option value="5m">📈 5 Dakika</option>
                    <option value="15m">📊 15 Dakika</option>
                    <option value="1h">⏰ 1 Saat</option>
                    <option value="4h">🕐 4 Saat</option>
              </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
            </div>

            {/* Window Input */}
              <div className="space-y-2">
                <label htmlFor="window" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Window Size
              </label>
                <div className="relative">
              <input
                id="window"
                type="number"
                value={window}
                onChange={(e) => setWindow(parseInt(e.target.value) || 60)}
                min="10"
                max="200"
                    className="w-full h-12 px-4 bg-gray-50 dark:bg-slate-700 border-0 rounded-lg text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-yellow-500 focus:bg-white dark:focus:bg-slate-600 transition-all"
                    placeholder="60"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-xs text-gray-400 font-medium">POINTS</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">10-200 arası değer girin</p>
              </div>
            </div>
            </div>
          </div>

        {/* Action Panel - Binance Style */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            {activeTab === 'similarity' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
                  className="h-14 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                      <span>Benzerlik Analizi Başlat</span>
                </>
              )}
            </button>

            <button
              onClick={handleTestHistorical}
              disabled={isTestingHistorical}
                  className="h-14 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              {isTestingHistorical ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Test Ediliyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                      <span>1 Yıllık Veri Testi</span>
                </>
              )}
            </button>
              </div>
          ) : activeTab === 'pattern' ? (
            <div className="space-y-4">
              <PatternDrawer onPatternChange={setCurrentPattern} />
              
              <button
                onClick={handlePatternSearch}
                disabled={isPatternSearching || currentPattern.length === 0}
                className="w-full h-14 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {isPatternSearching ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Pattern Aranıyor...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Pattern Ara (1 Yıllık Veri)</span>
                  </>
                )}
              </button>
              
              {currentPattern.length === 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Yukarıdaki alana istediğiniz pattern&apos;i çizin
                </p>
              )}
            </div>
          ) : activeTab === 'live' ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  📈 Son 24 Saatlik Grafik
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {symbol} için güncel fiyat hareketi ve istatistikler
                </p>
              </div>
              
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Güncel Grafiği Yükle</span>
                  </>
                )}
              </button>
            </div>
          ) : activeTab === 'trend' ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  📊 Son 6 Saatlik Trend Analizi
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {symbol} için son 6 saatlik iniş-çıkış pattern&apos;ini son 1 yıl ile karşılaştır
                </p>
              </div>
              
              <button
                onClick={handleTrendAnalysis}
                disabled={isTrendAnalyzing}
                className="w-full h-14 px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {isTrendAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Trend Analizi Yapılıyor...</span>
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
          ) : null}
          </div>
        </div>

        {/* Results */}
        {activeTab === 'similarity' && error && (
          <div className="max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <div className="text-red-800 dark:text-red-200 font-medium mb-1">Benzerlik Analizi Hatası</div>
                <div className="text-red-700 dark:text-red-300 text-sm">
                  {error.message || 'Veri alınırken bir hata oluştu. Lütfen tekrar deneyin.'}
                </div>
                <button
                  onClick={handleAnalyze}
                  className="mt-3 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                  disabled={isAnalyzing || isLoading}
                >
                  {isAnalyzing || isLoading ? 'Yeniden Deniyor...' : 'Tekrar Dene'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pattern Search Error */}
        {activeTab === 'pattern' && patternResults?.error && (
          <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800 dark:text-red-200 font-medium">Hata:</span>
              <span className="text-red-700 dark:text-red-300">{patternResults.error}</span>
            </div>
          </div>
        )}

        {/* Similarity Analysis Results */}
        {activeTab === 'similarity' && data && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Analiz Sonuçları
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Sembol</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{data.symbol}</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Interval</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{data.interval}</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Pencere Boyutu</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{data.window}</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Pearson Korelasyon</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {data.metrics.corr.toFixed(4)}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Cosine Similarity</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {data.metrics.cos.toFixed(4)}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Benzerlik Sonucu</h3>
                  <p className={`text-lg font-semibold ${getSimilarityColor(data.ok)}`}>
                    {getSimilarityText(data.ok)}
                  </p>
                </div>
              </div>
            </div>

            {/* Similarity Status */}
            <div className="mt-6 p-4 rounded-lg border-2 border-dashed text-center">
              <div className={`text-2xl font-bold ${getSimilarityColor(data.ok)} mb-2`}>
                {data.ok ? '✅ Benzer' : '❌ Benzer Değil'}
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {data.ok 
                  ? 'Mevcut fiyat hareketi 5 gün önceki benzer dönemle yüksek benzerlik gösteriyor'
                  : 'Mevcut fiyat hareketi 5 gün önceki benzer dönemle düşük benzerlik gösteriyor'
                }
              </p>
            </div>
          </div>
        )}

        {/* Pattern Search Results */}
        {activeTab === 'pattern' && patternResults && !patternResults.error && (
          <div className="mb-8">
            <PatternResults
              matches={(patternResults.matches || []) as {
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
              }[]}
              originalPattern={currentPattern}
              symbol={symbol}
              interval={interval}
            />
          </div>
        )}

        {/* Live Chart Error */}
        {activeTab === 'live' && liveChartData?.error && (
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

        {/* Live Chart Results */}
        {activeTab === 'live' && liveChartData && !liveChartData.error && (
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
              symbol={liveChartData.symbol || ''}
              currentPrice={liveChartData.currentPrice || 0}
              change={liveChartData.change || 0}
              changePercent={liveChartData.changePercent || 0}
              high24h={liveChartData.high24h || 0}
              low24h={liveChartData.low24h || 0}
              volume24h={liveChartData.volume24h || 0}
            />
          </div>
        )}

        {/* Trend Analysis Error */}
        {activeTab === 'trend' && trendAnalysisData?.error && (
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

        {/* Trend Analysis Results */}
        {activeTab === 'trend' && trendAnalysisData && !trendAnalysisData.error && (
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
                continuation: number[];
                trendPattern?: number[];
                continuationTrendPattern?: number[];
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
              }[]}
            />
          </div>
        )}

        {/* Historical Test Results */}
        {activeTab === 'similarity' && historicalResult && (
          <div className="max-w-4xl mx-auto mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              1 Yıllık Veri Testi Sonuçları
            </h2>
            
            {historicalResult.error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-800 dark:text-red-200 font-medium">Hata:</span>
                  <span className="text-red-700 dark:text-red-300">{historicalResult.error}</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Sembol</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{historicalResult.symbol}</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Interval</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{historicalResult.interval}</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Toplam Veri Noktası</h3>
                  <p className="text-lg font-semibold text-green-600">{historicalResult.totalDataPoints?.toLocaleString()}</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Başlangıç Tarihi</h3>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {historicalResult.startTime ? new Date(historicalResult.startTime).toLocaleDateString('tr-TR') : 'N/A'}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Bitiş Tarihi</h3>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {historicalResult.endTime ? new Date(historicalResult.endTime).toLocaleDateString('tr-TR') : 'N/A'}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">API Çağrı Sayısı</h3>
                  <p className="text-lg font-semibold text-blue-600">{historicalResult.chunks}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auto-refresh Info */}
        {activeTab === 'similarity' && (
        <div className="max-w-2xl mx-auto mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Veriler otomatik olarak 30 saniyede bir güncellenir
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
