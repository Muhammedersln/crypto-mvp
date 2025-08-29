import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Query parametreleri için validation schema
const querySchema = z.object({
  symbol: z.string().min(1, 'Sembol gerekli'),
  interval: z.enum(['1m', '5m', '15m', '1h', '4h'], {
    error: 'Geçersiz interval'
  })
});

// Bir çağrıda maksimum kaç veri noktası alabileceğimizi belirle
const MAX_KLINES_PER_REQUEST = 1000;

// Interval'a göre milisaniye hesabı
const intervalToMs = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
};

async function fetchKlinesChunk(
  symbol: string, 
  interval: string, 
  startTime: number, 
  endTime: number
): Promise<number[]> {
  const binanceBase = process.env.BINANCE_BASE || 'https://api1.binance.com';
  const url = `${binanceBase}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${MAX_KLINES_PER_REQUEST}`;
  
  console.log(`Fetching: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'crypto-similarity-mvp/1.0'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Binance API hatası: ${response.status} - ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Sadece close fiyatlarını al (4. indeks)
  return data.map((candle: unknown[]) => parseFloat(candle[4] as string));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    // Query parametrelerini validate et
    const validatedQuery = querySchema.parse(query);
    
    const { symbol, interval } = validatedQuery;
    
    // 1 yıl önceden şimdiye kadar
    const endTime = Date.now();
    const startTime = endTime - (365 * 24 * 60 * 60 * 1000); // 1 yıl öncesi
    
    const intervalMs = intervalToMs[interval as keyof typeof intervalToMs];
    
    // Toplam kaç chunk'a böleceğimizi hesapla
    const totalTimeSpan = endTime - startTime;
    const maxTimePerChunk = intervalMs * MAX_KLINES_PER_REQUEST;
    const chunks = Math.ceil(totalTimeSpan / maxTimePerChunk);
    
    console.log(`1 yıllık veri için ${chunks} chunk gerekiyor`);
    console.log(`Başlangıç: ${new Date(startTime).toISOString()}`);
    console.log(`Bitiş: ${new Date(endTime).toISOString()}`);
    
    const allClosePrices: number[] = [];
    
    // Chunk'ları sırayla al
    for (let i = 0; i < chunks; i++) {
      const chunkStartTime = startTime + (i * maxTimePerChunk);
      const chunkEndTime = Math.min(chunkStartTime + maxTimePerChunk - intervalMs, endTime);
      
      try {
        const chunkData = await fetchKlinesChunk(symbol, interval, chunkStartTime, chunkEndTime);
        allClosePrices.push(...chunkData);
        
        console.log(`Chunk ${i + 1}/${chunks}: ${chunkData.length} veri noktası alındı`);
        
        // Rate limiting için kısa bekleme
        if (i < chunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Chunk ${i + 1} hatası:`, error);
        throw error;
      }
    }
    
    return NextResponse.json({
      symbol,
      interval,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      totalDataPoints: allClosePrices.length,
      chunks,
      closePrices: allClosePrices
    });
    
  } catch (error) {
    console.error('Historical API hatası:', error);
    
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
