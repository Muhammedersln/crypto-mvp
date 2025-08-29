import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateSimilarity, sliceFiveDaysAgo } from '@/lib/similarity';

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
    
    // Klines API'sinden veri al
    const klinesUrl = new URL('/api/klines', request.url);
    klinesUrl.searchParams.set('symbol', validatedQuery.symbol);
    klinesUrl.searchParams.set('interval', validatedQuery.interval);
    klinesUrl.searchParams.set('limit', '1000'); // Yeterli veri için
    
    const klinesResponse = await fetch(klinesUrl.toString());
    
    if (!klinesResponse.ok) {
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
    
    return NextResponse.json({
      symbol: validatedQuery.symbol,
      interval: validatedQuery.interval,
      window: validatedQuery.window,
      ok: similarity.isSimilar,
      metrics: {
        corr: similarity.correlation,
        cos: similarity.cosine
      }
    });
    
  } catch (error) {
    console.error('Analyze API hatası:', error);
    
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
