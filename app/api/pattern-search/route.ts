import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findPatternMatches } from '@/lib/similarity';

// Query parametreleri için validation schema
const querySchema = z.object({
  symbol: z.string().min(1, 'Sembol gerekli'),
  interval: z.enum(['1m', '5m', '15m', '1h', '4h']),
  pattern: z.string().min(1, 'Pattern gerekli').transform(val => {
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Geçersiz pattern formatı');
      }
      return parsed.map(Number).filter(n => !isNaN(n));
    } catch {
      throw new Error('Pattern JSON formatında olmalı');
    }
  }),
  threshold: z.string().default('0.75').transform(val => {
    const num = parseFloat(val);
    return isNaN(num) || num < 0 || num > 1 ? 0.75 : num;
  }),
  maxMatches: z.string().default('10').transform(val => {
    const num = parseInt(val);
    return isNaN(num) || num < 1 || num > 20 ? 10 : num;
  }),
  continuationLength: z.string().default('30').transform(val => {
    const num = parseInt(val);
    return isNaN(num) || num < 10 || num > 100 ? 30 : num;
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

async function fetchHistoricalData(symbol: string, interval: string): Promise<number[]> {
  const binanceBase = process.env.BINANCE_BASE || 'https://api1.binance.com';
  const endTime = Date.now();
  const startTime = endTime - (365 * 24 * 60 * 60 * 1000); // 1 yıl öncesi
  
  const intervalMs = intervalToMs[interval as keyof typeof intervalToMs];
  const maxTimePerChunk = intervalMs * 1000; // Her chunk'ta 1000 veri noktası
  const totalTimeSpan = endTime - startTime;
  const chunks = Math.ceil(totalTimeSpan / maxTimePerChunk);
  
  const allClosePrices: number[] = [];
  
  // Gerçek 1 yıllık veri için interval'a göre chunk sayısı (trend-analysis ile aynı)
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
  
  console.log(`Pattern search için ${maxChunks}/${chunks} chunk işlenecek (interval: ${interval})`);
  
  // Chunk'ları sırayla al (gelişmiş error handling ile)
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
        console.warn(`Pattern search chunk ${i + 1} API hatası: ${response.status}, devam ediliyor...`);
        continue; // Hatayı görmezden gel, devam et
      }
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`Pattern search chunk ${i + 1} boş veri, atlanıyor...`);
        continue;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const closePrices = data.map((candle: any[]) => parseFloat(candle[4])).filter(price => !isNaN(price));
      allClosePrices.push(...closePrices);
      
      // Rate limiting - daha konservatif
      if (i < maxChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // Her 5 chunk'ta progress log
      if ((i + 1) % 5 === 0) {
        console.log(`Pattern search: ${i + 1}/${maxChunks} chunk işlendi, toplam ${allClosePrices.length} veri noktası`);
      }
      
    } catch (error) {
      console.error(`Pattern search chunk ${i + 1} hatası:`, error);
      // Hata durumunda devam et, ancak çok fazla hata varsa dur
      if (allClosePrices.length === 0 && i > 5) {
        console.error('Pattern search: Çok fazla hata, işlem durduruluyor');
        break;
      }
    }
  }
  
  console.log(`Pattern search: Toplam ${allClosePrices.length} fiyat verisi alındı`);
  return allClosePrices;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedQuery = querySchema.parse(body);
    
    console.log('Pattern search başlatılıyor:', {
      symbol: validatedQuery.symbol,
      interval: validatedQuery.interval,
      patternLength: validatedQuery.pattern.length,
      threshold: validatedQuery.threshold
    });
    
    // 1 yıllık veriyi al
    const historicalData = await fetchHistoricalData(
      validatedQuery.symbol, 
      validatedQuery.interval
    );
    
    if (historicalData.length < 100) {
      return NextResponse.json(
        { error: 'Yeterli historical veri yok' },
        { status: 400 }
      );
    }
    
    // Pattern matching yap (gelişmiş parametreler)
    const matches = findPatternMatches(
      validatedQuery.pattern,
      historicalData,
      Math.max(validatedQuery.pattern.length, 20), // Window size: en az pattern uzunluğu kadar
      validatedQuery.threshold,
      validatedQuery.maxMatches,
      validatedQuery.continuationLength
    );
    
    console.log(`Pattern matching: ${validatedQuery.pattern.length} uzunluktaki pattern ile ${historicalData.length} veri noktasında arama yapıldı`);
    
    console.log(`${matches.length} pattern match bulundu`);
    
    // Tarih bilgilerini ekle
    const intervalMs = intervalToMs[validatedQuery.interval as keyof typeof intervalToMs];
    const endTime = Date.now();
    const startTime = endTime - (365 * 24 * 60 * 60 * 1000);
    
    const matchesWithDates = matches.map(match => {
      const matchStartTime = startTime + (match.startIndex * intervalMs);
      const matchEndTime = startTime + (match.endIndex * intervalMs);
      const continuationStartTime = startTime + (match.continuationStartIndex * intervalMs);
      const continuationEndTime = startTime + (match.continuationEndIndex * intervalMs);
      
      return {
        ...match,
        startTime: new Date(matchStartTime).toISOString(),
        endTime: new Date(matchEndTime).toISOString(),
        startTimestamp: matchStartTime,
        endTimestamp: matchEndTime,
        continuationStartTime: new Date(continuationStartTime).toISOString(),
        continuationEndTime: new Date(continuationEndTime).toISOString(),
        continuationStartTimestamp: continuationStartTime,
        continuationEndTimestamp: continuationEndTime
      };
    });
    
    return NextResponse.json({
      symbol: validatedQuery.symbol,
      interval: validatedQuery.interval,
      patternLength: validatedQuery.pattern.length,
      threshold: validatedQuery.threshold,
      totalDataPoints: historicalData.length,
      totalMatches: matches.length,
      matches: matchesWithDates,
      searchPeriod: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString()
      },
      // Debug bilgileri
      debug: {
        actualHistoricalDays: Math.floor(historicalData.length * intervalToMs[validatedQuery.interval as keyof typeof intervalToMs] / (24 * 60 * 60 * 1000)),
        requestedDays: 365,
        patternRange: `${Math.min(...validatedQuery.pattern).toFixed(2)} - ${Math.max(...validatedQuery.pattern).toFixed(2)}`,
        historicalRange: `${Math.min(...historicalData).toFixed(2)} - ${Math.max(...historicalData).toFixed(2)}`,
        algorithmUsed: 'shape-pattern-matching',
        intervalDetails: `${validatedQuery.interval} (${intervalToMs[validatedQuery.interval as keyof typeof intervalToMs] / (60 * 1000)} min per candle)`
      }
    });
    
  } catch (error) {
    console.error('Pattern search API hatası:', error);
    
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
