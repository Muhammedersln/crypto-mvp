'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface AnalysisResult {
  analysis?: {
    summary: string;
    movements: string[];
    prices: string[];
    trends: string[];
    predictions: string[];
  };
  error?: string;
}

export default function VisualAnalysisPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Similarity comparison state
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [selectedInterval, setSelectedInterval] = useState('4h');
  const [similarityResults, setSimilarityResults] = useState<{
    matches?: Array<{
      similarity: number;
      startTime: string;
      endTime: string;
      startPrice?: number;
      endPrice?: number;
      priceChange?: number;
      chartData?: number[];
    }>;
    symbol?: string;
    error?: string;
    summary?: {
      avgSimilarity: number;
      bestMatch: number;
    };
  } | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setSelectedImage(file);
        setAnalysisResult(null);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  });

  const handleAnalyzeAndCompare = async () => {
    if (!selectedImage) {
      alert('Lütfen önce bir grafik görseli seçin!');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setSimilarityResults(null);

    try {
      console.log('🤖 AI Görsel Analizi başlatılıyor...');
      
      // 1. Önce görsel analizi yap
      const analysisFormData = new FormData();
      analysisFormData.append('image', selectedImage);

      const analysisResponse = await fetch('/api/visual-analysis', {
        method: 'POST',
        body: analysisFormData,
      });

      const analysisData = await analysisResponse.json();

      if (!analysisResponse.ok) {
        throw new Error(analysisData.error || 'Görsel analiz başarısız');
      }

      console.log('✅ Görsel Analizi Tamamlandı:');
      console.log('📊 Genel Değerlendirme:', analysisData.analysis?.summary);
      console.log('📈 Fiyat Hareketleri:', analysisData.analysis?.movements);
      console.log('💰 Fiyat Seviyeleri:', analysisData.analysis?.prices);
      console.log('📉 Trend Analizi:', analysisData.analysis?.trends);
      console.log('🔮 Potansiyel Gelişmeler:', analysisData.analysis?.predictions);

      setAnalysisResult(analysisData);

      // 2. Hemen tarihsel karşılaştırmayı da yap
      console.log('🔄 Tarihsel verilerle karşılaştırma başlatılıyor...');
      
      const comparisonFormData = new FormData();
      comparisonFormData.append('image', selectedImage);
      comparisonFormData.append('symbol', selectedSymbol);
      comparisonFormData.append('interval', selectedInterval);
      comparisonFormData.append('analysisData', JSON.stringify(analysisData.analysis));

      const comparisonResponse = await fetch('/api/visual-similarity', {
        method: 'POST',
        body: comparisonFormData,
      });

      const comparisonData = await comparisonResponse.json();

      if (!comparisonResponse.ok) {
        console.warn('⚠️ Tarihsel karşılaştırma hatası:', comparisonData.error);
        setSimilarityResults({ error: comparisonData.error });
        return;
      }

              console.log('✅ Tarihsel Karşılaştırma Tamamlandı:');
        console.log(`🎯 ${comparisonData.symbol} - ${comparisonData.interval} için analiz (%90+ benzerlik)`);
        console.log(`📊 ${comparisonData.matches?.length || 0} yüksek benzerlik (%90+) dönem bulundu`);
      
      if (comparisonData.matches && comparisonData.matches.length > 0) {
        console.log('🏆 En İyi Eşleşmeler:');
        comparisonData.matches.slice(0, 3).forEach((match: typeof comparisonData.matches[0], index: number) => {
          console.log(`${index + 1}. %${(match.similarity * 100).toFixed(1)} benzerlik - ${new Date(match.startTime).toLocaleDateString('tr-TR')} ile ${new Date(match.endTime).toLocaleDateString('tr-TR')} arası`);
          console.log(`   💲 Fiyat Değişimi: ${match.priceChange >= 0 ? '+' : ''}${match.priceChange?.toFixed(2)}%`);
        });

        console.log('📈 Özet İstatistikler:');
        console.log(`   • Ortalama Benzerlik: %${(comparisonData.summary?.avgSimilarity * 100).toFixed(1)}`);
        console.log(`   • En Yüksek Benzerlik: %${(comparisonData.summary?.bestMatch * 100).toFixed(1)}`);
      } else {
        console.log('❌ Benzer dönem bulunamadı');
      }

      setSimilarityResults(comparisonData);

    } catch (error) {
      console.error('❌ Analiz hatası:', error);
      setAnalysisResult({
        error: error instanceof Error ? error.message : 'Analiz başarısız'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
    setSimilarityResults(null);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Görsel Grafik Analizi
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Grafik görselini yükleyin, AI ile analiz edin ve son 1 senedeki verilerle karşılaştırın. 
                         Sonuçlar browser console&apos;unda detaylı olarak görüntülenir.
          </p>
        </div>

        {/* Upload Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            
            {!imagePreview ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive
                    ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-gray-300 dark:border-slate-600 hover:border-orange-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {isDragActive ? 'Görseli buraya bırakın...' : 'Grafik görselini yükleyin'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Sürükle-bırak yapın veya tıklayarak dosya seçin
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <span>Desteklenen formatlar:</span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded">JPG</span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded">PNG</span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded">WEBP</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Image Preview */}
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Yüklenen grafik"
                    className="w-full h-auto rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm"
                    style={{ maxHeight: '500px', objectFit: 'contain' }}
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-4 right-4 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                    title="Görseli kaldır"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* File Info */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedImage?.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedImage && (selectedImage.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={clearImage}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Settings Panel for Symbol & Interval */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Karşılaştırma Kripto Para
                    </label>
                    <select
                      value={selectedSymbol}
                      onChange={(e) => setSelectedSymbol(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="BTCUSDT">Bitcoin (BTC/USDT)</option>
                      <option value="ETHUSDT">Ethereum (ETH/USDT)</option>
                      <option value="ADAUSDT">Cardano (ADA/USDT)</option>
                      <option value="DOTUSDT">Polkadot (DOT/USDT)</option>
                      <option value="LINKUSDT">Chainlink (LINK/USDT)</option>
                      <option value="BNBUSDT">Binance Coin (BNB/USDT)</option>
                      <option value="SOLUSDT">Solana (SOL/USDT)</option>
                      <option value="XRPUSDT">Ripple (XRP/USDT)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Zaman Aralığı
                    </label>
                    <select
                      value={selectedInterval}
                      onChange={(e) => setSelectedInterval(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="15m">15 Dakika</option>
                      <option value="1h">1 Saat</option>
                      <option value="4h">4 Saat</option>
                    </select>
                  </div>
                </div>

                {/* Single Analyze & Compare Button */}
                <button
                  onClick={handleAnalyzeAndCompare}
                  disabled={isAnalyzing}
                  className="w-full h-14 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:shadow-none"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Analiz Ediliyor ve Karşılaştırılıyor...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>AI Analiz Et ve Tarihsel Verilerle Karşılaştır</span>
                    </>
                  )}
                </button>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-blue-800 dark:text-blue-200 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                                         Sonuçlar browser console&apos;unda detaylı olarak görüntülenecek (F12 tuşu ile açın)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display - Only for critical errors */}
        {(analysisResult?.error || similarityResults?.error) && (
          <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <div className="text-red-800 dark:text-red-200 font-medium mb-1">İşlem Hatası</div>
                <div className="text-red-700 dark:text-red-300 text-sm">
                  {analysisResult?.error || similarityResults?.error}
                </div>
                <button
                  onClick={handleAnalyzeAndCompare}
                  className="mt-3 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Yeniden Deneniyor...' : 'Tekrar Dene'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Similarity Results */}
        {similarityResults?.matches && similarityResults?.matches.length > 0 && (
          <div className="max-w-6xl mx-auto mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              {/* Results Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                                         <h2 className="text-xl font-bold text-white">Tarihsel Yüksek Benzerlik Sonuçları</h2>
                     <p className="text-blue-100 text-sm">
                       {similarityResults.symbol} - Son 1 yılda {similarityResults.matches.length} yüksek benzerlik (%90+) dönem bulundu
                     </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                     {similarityResults.matches.map((match, index: number) => (
                    <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          #{index + 1} Benzer Dönem
                        </span>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            %{(match.similarity * 100).toFixed(1)} benzer
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Başlangıç:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {new Date(match.startTime).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Bitiş:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {new Date(match.endTime).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Başlangıç Fiyat:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${match.startPrice?.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Bitiş Fiyat:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${match.endPrice?.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Değişim:</span>
                          <span className={`font-semibold ${
                            (match.priceChange ?? 0) >= 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {(match.priceChange ?? 0) >= 0 ? '+' : ''}{match.priceChange?.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* Mini Chart Preview */}
                      {match.chartData && (
                        <div className="mt-4 h-20 bg-gray-50 dark:bg-slate-700 rounded border overflow-hidden">
                          <div className="h-full flex items-end justify-center p-2">
                            {(match.chartData || []).slice(0, 20).map((point: number, i: number) => {
                              const chartData = match.chartData || [];
                              const height = ((point - Math.min(...chartData)) / 
                                           (Math.max(...chartData) - Math.min(...chartData))) * 100;
                              return (
                                <div
                                  key={i}
                                  className="bg-blue-500 mx-0.5 min-w-[2px]"
                                  style={{ height: `${height}%` }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Summary Stats */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {similarityResults.matches.length}
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        Benzer Dönem Bulundu
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                 %{((similarityResults.matches.reduce((sum: number, m) => sum + m.similarity, 0) / similarityResults.matches.length) * 100).toFixed(1)}
                      </div>
                      <div className="text-sm text-green-800 dark:text-green-300">
                        Ortalama Benzerlik
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        %{(similarityResults.matches[0]?.similarity * 100).toFixed(1)}
                      </div>
                      <div className="text-sm text-purple-800 dark:text-purple-300">
                        En Yüksek Benzerlik
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Results Message */}
        {similarityResults && similarityResults?.matches?.length === 0 && !similarityResults?.error && (
          <div className="max-w-4xl mx-auto bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <div className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">Benzer Dönem Bulunamadı</div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Bilgi:</p>
                <p>Bu analiz eğitim ve araştırma amaçlıdır. Yatırım kararları alırken profesyonel danışmanlık alınız. AI analizleri referans niteliğindedir.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
