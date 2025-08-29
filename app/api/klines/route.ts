import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cache, CacheKeys, getTTLForInterval } from '@/lib/cache';

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
  limit: z.string().transform(val => {
    const num = parseInt(val);
    return isNaN(num) || num < 1 || num > 1000 ? 500 : num;
  }).default(500)
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    // Query parametrelerini validate et
    const validatedQuery = querySchema.parse(query);
    
    // Cache kontrolü
    const cacheKey = CacheKeys.klines(validatedQuery.symbol, validatedQuery.interval, validatedQuery.limit);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit: ${cacheKey}`);
      return NextResponse.json(cachedData);
    }
    
    const binanceBase = process.env.BINANCE_BASE || 'https://api1.binance.com';
    const url = `${binanceBase}/api/v3/klines?symbol=${validatedQuery.symbol}&interval=${validatedQuery.interval}&limit=${validatedQuery.limit}`;
    
    console.log(`Klines API: ${validatedQuery.symbol} - ${validatedQuery.interval} - limit: ${validatedQuery.limit}`);
    
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
    
    // Sadece close fiyatlarını al (4. indeks)
    const closePrices = data.map((candle: unknown[]) => parseFloat(candle[4] as string));
    
    const responseData = {
      symbol: validatedQuery.symbol,
      interval: validatedQuery.interval,
      limit: validatedQuery.limit,
      closePrices
    };
    
    // Cache'e kaydet
    const ttl = getTTLForInterval(validatedQuery.interval);
    cache.set(cacheKey, responseData, ttl);
    console.log(`Cache set: ${cacheKey} (TTL: ${ttl}s)`);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Klines API hatası:', error);
    
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
