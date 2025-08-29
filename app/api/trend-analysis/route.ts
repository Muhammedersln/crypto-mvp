import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findPatternMatches, normalizeToRange, resampleData } from '@/lib/similarity';

// Query parametreleri için validation schema
const querySchema = z.object({
  symbol: z.string().min(1, 'Sembol gerekli'),
  interval: z.enum(['1m', '5m', '15m', '1h', '4h']),
  analysisHours: z.string().default('6').transform(val => {
    const num = parseInt(val);
    return isNaN(num) || num < 1 || num > 24 ? 6 : num;
  })
});

// Interval'a göre milisaniye hesabı
const intervalToMs = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
};

// Trend pattern'ini çıkar (iniş-çıkış dizisi)
function extractTrendPattern(prices: number[]): number[] {
  if (prices.length < 2) return [];
  
  const pattern: number[] = [];
  const changes: number[] = [];
  
  // Önce tüm değişimleri hesapla
  for (let i = 1; i < prices.length; i++) {
    const change = (prices[i] - prices[i-1]) / prices[i-1];
    changes.push(change);
  }
  
  // Adaptif normalizasyon: 95th percentile'a göre normalize et
  const sortedChanges = [...changes.map(Math.abs)].sort((a, b) => a - b);
  const percentile95 = sortedChanges[Math.floor(sortedChanges.length * 0.95)] || 0.01;
  const normalizationFactor = Math.max(percentile95, 0.005); // Min %0.5 değişim
  
  // Normalize edilmiş pattern oluştur
  for (const change of changes) {
    const normalized = change / normalizationFactor;
    // -2 ile 2 arasında normalize et (daha geniş aralık)
    pattern.push(Math.max(-2, Math.min(2, normalized)));
  }
  
  console.log(`Pattern normalization: factor=${(normalizationFactor*100).toFixed(3)}%, range=[${Math.min(...pattern).toFixed(2)}, ${Math.max(...pattern).toFixed(2)}]`);
  
  return pattern;
}

// Trend istatistikleri hesapla
function calculateTrendStats(prices: number[]) {
  if (prices.length < 2) return null;
  
  const changes = [];
  let upMoves = 0;
  let downMoves = 0;
  let sidewaysMoves = 0;
  
  for (let i = 1; i < prices.length; i++) {
    const change = (prices[i] - prices[i-1]) / prices[i-1] * 100;
    changes.push(change);
    
    if (change > 0.1) upMoves++;
    else if (change < -0.1) downMoves++;
    else sidewaysMoves++;
  }
  
  const totalChange = (prices[prices.length - 1] - prices[0]) / prices[0] * 100;
  const volatility = Math.sqrt(changes.reduce((sum, change) => sum + change * change, 0) / changes.length);
  
  return {
    totalChange,
    volatility,
    upMoves,
    downMoves,
    sidewaysMoves,
    totalMoves: changes.length,
    avgChange: changes.reduce((sum, change) => sum + change, 0) / changes.length
  };
}

async function fetchHistoricalData(symbol: string, interval: string, hours: number): Promise<number[]> {
  const binanceBase = process.env.BINANCE_BASE || 'https://api1.binance.com';
  const endTime = Date.now();
  const startTime = endTime - (hours * 60 * 60 * 1000);
  
  const url = `${binanceBase}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'crypto-similarity-mvp/1.0'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Binance API hatası: ${response.status}`);
  }
  
  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((candle: any[]) => parseFloat(candle[4]));
}

async function fetchYearlyData(symbol: string, interval: string): Promise<number[]> {
  const binanceBase = process.env.BINANCE_BASE || 'https://api1.binance.com';
  const endTime = Date.now();
  const startTime = endTime - (365 * 24 * 60 * 60 * 1000); // 1 yıl öncesi
  
  const intervalMs = intervalToMs[interval as keyof typeof intervalToMs];
  const maxTimePerChunk = intervalMs * 1000; // Her chunk'ta 1000 veri noktası
  const totalTimeSpan = endTime - startTime;
  const chunks = Math.ceil(totalTimeSpan / maxTimePerChunk);
  
  const allClosePrices: number[] = [];
  
  // Gerçek 1 yıllık veri için interval'a göre chunk sayısı
  const getMaxChunksForInterval = (interval: string, totalChunks: number) => {
    const limits = {
      '1m': 100,   // ~70 gün (API limits nedeniyle)
      '5m': 120,   // ~420 gün (1+ yıl)  
      '15m': 40,   // ~416 gün (1+ yıl)
      '1h': 12,    // ~500 gün (1+ yıl)
      '4h': 4      // ~664 gün (1+ yıl)
    };
    const limit = limits[interval as keyof typeof limits] || 50;
    return Math.min(totalChunks, limit);
  };
  
  const maxChunks = getMaxChunksForInterval(interval, chunks);
  
  console.log(`1 yıllık veri için ${maxChunks}/${chunks} chunk işlenecek (interval: ${interval})`);
  
  for (let i = 0; i < maxChunks; i++) {
    const chunkStartTime = startTime + (i * maxTimePerChunk);
    const chunkEndTime = Math.min(chunkStartTime + maxTimePerChunk - intervalMs, endTime);
    
    try {
      const url = `${binanceBase}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${chunkStartTime}&endTime=${chunkEndTime}&limit=1000`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'crypto-similarity-mvp/1.0'
        }
      });
      
      if (!response.ok) {
        console.warn(`Chunk ${i + 1} API hatası: ${response.status}, devam ediliyor...`);
        continue; // Hatayı görmezden gel, devam et
      }
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`Chunk ${i + 1} boş veri, atlanıyor...`);
        continue;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const closePrices = data.map((candle: any[]) => parseFloat(candle[4])).filter(price => !isNaN(price));
      allClosePrices.push(...closePrices);
      
      // Rate limiting - çok fazla API çağrısı için daha konservatif
      if (i < maxChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // Her 5 chunk'ta progress log
      if ((i + 1) % 5 === 0) {
        console.log(`${i + 1}/${maxChunks} chunk işlendi, toplam ${allClosePrices.length} veri noktası`);
      }
      
    } catch (error) {
      console.error(`Chunk ${i + 1} hatası:`, error);
      // Hata durumunda devam et, ancak çok fazla hata varsa dur
      if (allClosePrices.length === 0 && i > 5) {
        console.error('Çok fazla hata, işlem durduruluyor');
        break;
      }
    }
  }
  
  console.log(`Toplam ${allClosePrices.length} fiyat verisi alındı`);
  return allClosePrices;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedQuery = querySchema.parse(body);
    
    const { symbol, interval, analysisHours } = validatedQuery;
    
    console.log('Trend analizi başlatılıyor:', {
      symbol,
      interval,
      analysisHours
    });
    
    // Son N saatlik veriyi al
    const recentData = await fetchHistoricalData(symbol, interval, analysisHours);
    
    // Debug: son 6 saatlik veriyi kontrol et
    const expectedDataPoints = Math.ceil((analysisHours * 60) / (intervalToMs[interval as keyof typeof intervalToMs] / (60 * 1000)));
    console.log(`Son ${analysisHours} saat için beklenen: ${expectedDataPoints} nokta, alınan: ${recentData.length} nokta`);
    
    if (recentData.length > 0) {
      const recentStart = new Date(Date.now() - (analysisHours * 60 * 60 * 1000));
      console.log(`Recent veri aralığı: ${recentStart.toLocaleString('tr-TR')} - ${new Date().toLocaleString('tr-TR')}`);
      console.log(`Recent fiyat aralığı: ${Math.min(...recentData).toFixed(2)} - ${Math.max(...recentData).toFixed(2)}`);
    }
    
    if (recentData.length < 10) {
      return NextResponse.json(
        { error: 'Yeterli güncel veri yok' },
        { status: 400 }
      );
    }
    
    // 1 yıllık veriyi al (sınırlı)
    const yearlyData = await fetchYearlyData(symbol, interval);
    
    if (yearlyData.length < 100) {
      return NextResponse.json(
        { error: 'Yeterli historical veri yok' },
        { status: 400 }
      );
    }
    
    // Son N saatlik trend pattern'ini çıkar
    const recentTrendPattern = extractTrendPattern(recentData);
    const recentStats = calculateTrendStats(recentData);
    
    // 1 yıllık veriyi de trend pattern'e çevir (aynı veri türü için)
    const yearlyTrendPattern = extractTrendPattern(yearlyData);
    
    console.log(`Recent pattern uzunluğu: ${recentTrendPattern.length}, Yearly pattern uzunluğu: ${yearlyTrendPattern.length}`);
    
    // Pattern matching yap (her ikisi de trend pattern'i)
    const matches = findPatternMatches(
      recentTrendPattern,
      yearlyTrendPattern, // Artık aynı veri türü!
      recentTrendPattern.length, // Aynı uzunlukta pencere
      0.65, // Trend için threshold
      8, // Daha fazla match
      Math.min(30, Math.floor(recentTrendPattern.length * 0.5)) // Devam uzunluğu
    );
    
    console.log(`${matches.length} trend match bulundu`);
    
    // Tarih bilgilerini ekle
    const intervalMs = intervalToMs[interval as keyof typeof intervalToMs];
    const endTime = Date.now();
    const yearStartTime = endTime - (365 * 24 * 60 * 60 * 1000);
    
    const matchesWithDates = matches.map(match => {
      const matchStartTime = yearStartTime + (match.startIndex * intervalMs);
      const matchEndTime = yearStartTime + (match.endIndex * intervalMs);
      const continuationStartTime = yearStartTime + (match.continuationStartIndex * intervalMs);
      const continuationEndTime = yearStartTime + (match.continuationEndIndex * intervalMs);
      
      // Gerçek fiyat verilerini al (trend pattern indekslerini kullanarak)
      const realPriceStartIndex = match.startIndex;
      const realPriceEndIndex = match.endIndex + 1; // +1 çünkü trend pattern bir nokta daha kısa
      const realContinuationStartIndex = match.continuationStartIndex;
      const realContinuationEndIndex = match.continuationEndIndex + 1;
      
      // Güvenlik kontrolü - indekslerin yearlyData sınırları içinde olduğundan emin ol
      const safeStartIndex = Math.max(0, Math.min(realPriceStartIndex, yearlyData.length - 1));
      const safeEndIndex = Math.max(safeStartIndex + 1, Math.min(realPriceEndIndex, yearlyData.length));
      const safeContinuationStartIndex = Math.max(0, Math.min(realContinuationStartIndex, yearlyData.length - 1));
      const safeContinuationEndIndex = Math.max(safeContinuationStartIndex + 1, Math.min(realContinuationEndIndex, yearlyData.length));
      
      // Gerçek fiyat verilerini çıkar
      const realPriceData = yearlyData.slice(safeStartIndex, safeEndIndex);
      const realContinuationData = yearlyData.slice(safeContinuationStartIndex, safeContinuationEndIndex);
      
      // Match edilen dönemin gerçek fiyat istatistikleri
      const matchStats = calculateTrendStats(realPriceData);
      
      return {
        ...match,
        // Gerçek fiyat verilerini ekle
        data: realPriceData,
        continuation: realContinuationData,
        // Trend pattern verilerini de sakla (isteğe bağlı)
        trendPattern: match.data,
        continuationTrendPattern: match.continuation,
        startTime: new Date(matchStartTime).toISOString(),
        endTime: new Date(matchEndTime).toISOString(),
        continuationStartTime: new Date(continuationStartTime).toISOString(),
        continuationEndTime: new Date(continuationEndTime).toISOString(),
        stats: matchStats
      };
    });
    
    return NextResponse.json({
      symbol,
      interval,
      analysisHours,
      recentData,
      recentTrendPattern,
      recentStats,
      yearlyDataPoints: yearlyData.length,
      yearlyPatternLength: yearlyTrendPattern.length,
      recentPatternLength: recentTrendPattern.length,
      totalMatches: matches.length,
      matches: matchesWithDates,
      analysisTime: new Date().toISOString(),
      // Debug bilgileri
      debug: {
        recentDataRange: `${Math.min(...recentData).toFixed(2)} - ${Math.max(...recentData).toFixed(2)}`,
        yearlyDataRange: `${Math.min(...yearlyData).toFixed(2)} - ${Math.max(...yearlyData).toFixed(2)}`,
        actualHistoricalDays: Math.floor(yearlyData.length * intervalToMs[interval as keyof typeof intervalToMs] / (24 * 60 * 60 * 1000)),
        requestedDays: 365,
        algorithmUsed: 'trend-pattern-matching',
        intervalDetails: `${interval} (${intervalToMs[interval as keyof typeof intervalToMs] / (60 * 1000)} min per candle)`
      }
    });
    
  } catch (error) {
    console.error('Trend analysis API hatası:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Geçersiz parametreler', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Sunucu hatası', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}
