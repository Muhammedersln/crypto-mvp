import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateSimilarity, sliceFiveDaysAgo } from '@/lib/similarity';
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
  interval: z.enum(['1m', '5m', '15m', '1h', '4h'], {
    error: 'Geçersiz interval'
  }),
  window: z.string().transform(val => {
    const num = parseInt(val);
    return isNaN(num) || num < 10 || num > 200 ? 60 : num;
  }).default(60)
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    // Query parametrelerini validate et
    const validatedQuery = querySchema.parse(query);
    
    // Cache kontrolü
    const cacheKey = CacheKeys.analyze(validatedQuery.symbol, validatedQuery.interval, validatedQuery.window);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit: ${cacheKey}`);
      return NextResponse.json(cachedData);
    }
    
    // Klines API'sinden veri al
    const klinesUrl = new URL('/api/klines', request.url);
    klinesUrl.searchParams.set('symbol', validatedQuery.symbol);
    klinesUrl.searchParams.set('interval', validatedQuery.interval);
    klinesUrl.searchParams.set('limit', '1000'); // Yeterli veri için
    
    console.log(`Analyze API: ${validatedQuery.symbol} - ${validatedQuery.interval} - window: ${validatedQuery.window}`);
    
    const klinesResponse = await fetchWithRetry(klinesUrl.toString(), {
      headers: {
        'User-Agent': 'crypto-similarity-mvp/1.0'
      }
    });
    
    if (!klinesResponse.ok) {
      const errorText = await klinesResponse.text();
      console.error(`Klines API hatası: ${klinesResponse.status} - ${errorText}`);
      throw new Error(`Klines API hatası: ${klinesResponse.status}`);
    }
    
    const klinesData = await klinesResponse.json();
    const closePrices = klinesData.closePrices;
    
    if (closePrices.length < validatedQuery.window * 2) {
      return NextResponse.json(
        { error: 'Yeterli veri yok' },
        { status: 400 }
      );
    }
    
    // Son window adet veriyi al
    const currentWindow = closePrices.slice(-validatedQuery.window);
    
    // 5 gün önceki aynı uzunluktaki pencereyi al
    const historicalWindow = sliceFiveDaysAgo(closePrices, validatedQuery.window);
    
    if (historicalWindow.length < validatedQuery.window) {
      return NextResponse.json(
        { error: '5 gün önceki veri yeterli değil' },
        { status: 400 }
      );
    }
    
    // Benzerlik hesapla
    const similarity = calculateSimilarity(currentWindow, historicalWindow);
    
    const responseData = {
      symbol: validatedQuery.symbol,
      interval: validatedQuery.interval,
      window: validatedQuery.window,
      ok: similarity.isSimilar,
      metrics: {
        corr: similarity.correlation,
        cos: similarity.cosine
      }
    };
    
    // Cache'e kaydet
    cache.set(cacheKey, responseData, CacheTTL.ANALYZE);
    console.log(`Cache set: ${cacheKey} (TTL: ${CacheTTL.ANALYZE}s)`);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Analyze API hatası:', error);
    
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
    if (error instanceof Error && error.message.includes('Klines API hatası')) {
      return NextResponse.json(
        { error: 'Veri kaynağı hatası', details: error.message },
        { status: 502 }
      );
    }
    
    return NextResponse.json(
      { error: 'Sunucu hatası', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}
