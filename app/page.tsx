'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Kripto Analiz Platformu
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Gelişmiş algoritmaları kullanarak kripto para fiyat hareketlerini analiz edin, 
            benzer patternleri bulun ve trend analizleri yapın
          </p>
        </div>

        {/* Feature Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Pattern Search Card */}
          <Link href="/pattern-search">
            <div className="group bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Pattern Arama
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Kendi çizdiğiniz patternleri geçmiş verilerden bulun ve gelecekteki potansiyel devamlarını görün
              </p>
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-2 transition-transform">
                <span>Pattern Ara</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
            </div>
          </Link>

          {/* Live Chart Card */}
          <Link href="/live-chart">
            <div className="group bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-600 cursor-pointer">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Canlı Grafik
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Gerçek zamanlı fiyat hareketlerini görüntüleyin ve detaylı piyasa verilerini inceleyin
              </p>
              <div className="flex items-center text-green-600 dark:text-green-400 font-medium group-hover:translate-x-2 transition-transform">
                <span>Grafik Görüntüle</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                </div>
            </div>
          </Link>

          {/* Trend Analysis Card */}
          <Link href="/trend-analysis">
            <div className="group bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Trend Analizi
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Mevcut fiyat trendini analiz edin ve geçmiş benzer trendlerin devamlarını keşfedin
              </p>
              <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium group-hover:translate-x-2 transition-transform">
                <span>Trend Analizi</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
          </div>

        {/* Features Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Platform Özellikleri
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Gelişmiş Algoritmalar
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Pearson korelasyonu ve cosine similarity gibi matematiksel yöntemlerle hassas analiz
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Hızlı Performans
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Optimize edilmiş APIler ve cache sistemi ile hızlı sonuçlar
                </p>
          </div>
        </div>

            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Görsel Analiz
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Interaktif grafikler ve görsel pattern çizim araçları
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Gerçek Zamanlı Veri
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Binance APIsi üzerinden güncel piyasa verileri
              </p>
            </div>
            </div>
          </div>
                </div>
                
        {/* Footer Info */}
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Bu platform eğitim ve araştırma amaçlıdır. Yatırım kararları alırken profesyonel danışmanlık alınız.
          </p>
        </div>
      </div>
    </div>
  );
}