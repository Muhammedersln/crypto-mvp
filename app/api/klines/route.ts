import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
    
    const binanceBase = process.env.BINANCE_BASE || 'https://api1.binance.com';
    const url = `${binanceBase}/api/v3/klines?symbol=${validatedQuery.symbol}&interval=${validatedQuery.interval}&limit=${validatedQuery.limit}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'crypto-similarity-mvp/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Binance API hatası: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Sadece close fiyatlarını al (4. indeks)
    const closePrices = data.map((candle: unknown[]) => parseFloat(candle[4] as string));
    
    return NextResponse.json({
      symbol: validatedQuery.symbol,
      interval: validatedQuery.interval,
      limit: validatedQuery.limit,
      closePrices
    });
    
  } catch (error) {
    console.error('Klines API hatası:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Geçersiz parametreler', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
