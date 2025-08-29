import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

// Timeout ve retry ayarları
const FETCH_TIMEOUT = 25000; // 25 saniye
const MAX_RETRIES = 2;

// Timeout ile fetch wrapper
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Retry ile fetch
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      if (i === retries) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

// Query parametreleri için validation schema
const querySchema = z.object({
  symbol: z.string().min(1, 'Sembol gerekli'),
  interval: z.enum(['1m', '5m', '15m', '1h', '4h']),
  hours: z.string().default('24').transform(val => {
    const num = parseInt(val);
    return isNaN(num) || num < 1 || num > 168 ? 24 : num; // Max 1 hafta
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    // Query parametrelerini validate et
    const validatedQuery = querySchema.parse(query);
    
    const { symbol, interval, hours } = validatedQuery;
    
    // Cache kontrolü
    const cacheKey = CacheKeys.liveChart(symbol, interval, hours);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit: ${cacheKey}`);
      return NextResponse.json(cachedData);
    }
    
    // Son N saat için zaman aralığı
    const endTime = Date.now();
    const startTime = endTime - (hours * 60 * 60 * 1000);
    
    const binanceBase = process.env.BINANCE_BASE || 'https://api1.binance.com';
    const url = `${binanceBase}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`;
    
    console.log(`Güncel grafik verisi alınıyor: ${symbol} - ${interval} - ${hours} saat`);
    
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'crypto-similarity-mvp/1.0'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Binance API hatası: ${response.status} - ${errorText}`);
      throw new Error(`Binance API hatası: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Kline verisini parse et
    const chartData = data.map((candle: unknown[]) => ({
      timestamp: parseInt(candle[0] as string),
      open: parseFloat(candle[1] as string),
      high: parseFloat(candle[2] as string),
      low: parseFloat(candle[3] as string),
      close: parseFloat(candle[4] as string),
      volume: parseFloat(candle[5] as string),
      time: new Date(parseInt(candle[0] as string)).toISOString()
    }));
    
    // İstatistikler hesapla
    const closePrices = chartData.map((d: { close: number }) => d.close);
    const currentPrice = closePrices[closePrices.length - 1];
    const startPrice = closePrices[0];
    const change = currentPrice - startPrice;
    const changePercent = (change / startPrice) * 100;
    
    const high24h = Math.max(...chartData.map((d: { high: number }) => d.high));
    const low24h = Math.min(...chartData.map((d: { low: number }) => d.low));
    const volume24h = chartData.reduce((sum: number, d: { volume: number }) => sum + d.volume, 0);
    
    const responseData = {
      symbol,
      interval,
      hours,
      dataPoints: chartData.length,
      currentPrice,
      change,
      changePercent,
      high24h,
      low24h,
      volume24h,
      chartData,
      timeRange: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString()
      }
    };
    
    // Cache'e kaydet
    cache.set(cacheKey, responseData, CacheTTL.LIVE_CHART);
    console.log(`Cache set: ${cacheKey} (TTL: ${CacheTTL.LIVE_CHART}s)`);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Live chart API hatası:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Geçersiz parametreler', details: error.issues },
        { status: 400 }
      );
    }
    
    // Network timeout hatası
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      return NextResponse.json(
        { error: 'İstek zaman aşımına uğradı', details: 'Lütfen tekrar deneyin' },
        { status: 408 }
      );
    }
    
    // Binance API hatası
    if (error instanceof Error && error.message.includes('Binance API hatası')) {
      return NextResponse.json(
        { error: 'Binance API hatası', details: error.message },
        { status: 502 }
      );
    }
    
    return NextResponse.json(
      { error: 'Sunucu hatası', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}
