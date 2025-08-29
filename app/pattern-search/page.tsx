'use client';

import { useState } from 'react';
import PatternDrawer from '../components/PatternDrawer';
import PatternResults from '../components/PatternResults';

interface PatternResult {
  matches?: unknown[];
  error?: string;
}

export default function PatternSearchPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('15m');
  const [currentPattern, setCurrentPattern] = useState<number[]>([]);
  const [isPatternSearching, setIsPatternSearching] = useState(false);
  const [patternResults, setPatternResults] = useState<PatternResult | null>(null);

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
          pattern: currentPattern,
          threshold: 0.75,
          maxMatches: 10,
          continuationLength: 30
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Pattern Arama
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Geçmiş verilerden benzer fiyat hareketlerini bulun ve gelecekteki potansiyel devamlarını görün
          </p>
        </div>

        {/* Settings Panel */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kripto Para
                </label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="1m">1 Dakika</option>
                  <option value="5m">5 Dakika</option>
                  <option value="15m">15 Dakika</option>
                  <option value="1h">1 Saat</option>
                  <option value="4h">4 Saat</option>
                </select>
              </div>
            </div>

            {/* Pattern Drawing */}
            <div className="mb-6">
              <PatternDrawer onPatternChange={setCurrentPattern} />
            </div>
            
            {/* Search Button */}
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
                  <span>Pattern Ara</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {patternResults?.error && (
          <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <div className="text-red-800 dark:text-red-200 font-medium mb-1">Pattern Arama Hatası</div>
                <div className="text-red-700 dark:text-red-300 text-sm">
                  {patternResults.error}
                </div>
                <button
                  onClick={handlePatternSearch}
                  className="mt-3 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                  disabled={isPatternSearching || currentPattern.length === 0}
                >
                  {isPatternSearching ? 'Yeniden Aranıyor...' : 'Tekrar Ara'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {patternResults && !patternResults.error && (
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
      </div>
    </div>
  );
}
