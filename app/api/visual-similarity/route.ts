import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculatePatternSimilarity, normalizeToRange } from '@/lib/similarity';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Interval'a göre window size
const getWindowSize = (interval: string): number => {
  switch (interval) {
    case '15m': return 48; // 12 saat
    case '1h': return 24; // 24 saat  
    case '4h': return 18; // 3 gün
    default: return 24;
  }
};

// Historical data'dan pattern benzerlikleri bulur
const findSimilarPatterns = (
  patternData: number[],
  historicalData: number[],
  windowSize: number,
  threshold: number = 0.65,
  maxMatches: number = 10
): Array<{
  startIndex: number;
  endIndex: number;
  similarity: number;
  data: number[];
}> => {
  const matches: Array<{
    startIndex: number;
    endIndex: number;
    similarity: number;
    data: number[];
  }> = [];

  // Sliding window ile benzerlik ara
  for (let i = 0; i <= historicalData.length - windowSize; i++) {
    const window = historicalData.slice(i, i + windowSize);
    const similarity = calculatePatternSimilarity(patternData, window);

    if (similarity >= threshold) {
      matches.push({
        startIndex: i,
        endIndex: i + windowSize - 1,
        similarity,
        data: window
      });
    }
  }

  // Benzerlik skoruna göre sırala ve en iyi sonuçları al
  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxMatches);
};

// AI'dan numeric pattern çıkarır
const extractNumericPattern = async (image: File): Promise<number[]> => {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      maxOutputTokens: 1024,
    }
  });

  const bytes = await image.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64Image = buffer.toString('base64');

  const prompt = `
Bu grafik görselini analiz et ve fiyat hareketlerini sayısal diziye çevir.

Göreldeki grafik çizgisini soldan sağa takip ederek, fiyat seviyelerini 0-1 arası normalize edilmiş değerlerle ifade et.
- Grafikteki en düşük nokta = 0
- Grafikteki en yüksek nokta = 1
- Ara değerler orantılı olarak 0-1 arası

Yaklaşık 20-50 veri noktası ver. Sadece sayısal dizi olarak cevap ver, başka metin ekleme.

Örnek format: [0.2, 0.3, 0.5, 0.8, 0.6, 0.4, ...]
`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Image,
        mimeType: image.type
      }
    }
  ]);

  const response = await result.response;
  const text = response.text().trim();

  try {
    // JSON array parse et
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    const numbers = JSON.parse(cleanedText);
    
    if (Array.isArray(numbers) && numbers.every(n => typeof n === 'number')) {
      return numbers;
    }
    throw new Error('Invalid number array');
  } catch {
    // Fallback: virgül ayrılmış sayıları parse et
    const matches = text.match(/[\d.]+/g);
    if (matches) {
      return matches.map(m => parseFloat(m)).filter(n => !isNaN(n));
    }
    throw new Error('Pattern extraction failed');
  }
};

export async function POST(request: NextRequest) {
  try {
    // API key kontrolü
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'Google AI API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const symbol = formData.get('symbol') as string;
    const interval = formData.get('interval') as string;

    if (!image || !symbol || !interval) {
      return NextResponse.json(
        { error: 'Eksik parametreler' },
        { status: 400 }
      );
    }

    // Görseldan numeric pattern çıkar
    console.log('Extracting numeric pattern from image...');
    const patternData = await extractNumericPattern(image);
    console.log(`Pattern extracted: ${patternData.length} points`, patternData.slice(0, 5));

    if (patternData.length < 5) {
      return NextResponse.json(
        { error: 'Görselden yeterli pattern verisi çıkarılamadı' },
        { status: 400 }
      );
    }

    // Historical data çek
    console.log(`Fetching historical data for ${symbol} ${interval}...`);
    const historicalUrl = new URL('/api/historical', request.url);
    historicalUrl.searchParams.set('symbol', symbol);
    historicalUrl.searchParams.set('interval', interval);

    const historicalResponse = await fetch(historicalUrl.toString(), {
      headers: {
        'User-Agent': 'crypto-similarity-mvp/1.0'
      }
    });

    if (!historicalResponse.ok) {
      const errorText = await historicalResponse.text();
      console.error(`Historical API error: ${historicalResponse.status} - ${errorText}`);
      throw new Error(`Historical data fetch failed: ${historicalResponse.status}`);
    }

    const historicalData = await historicalResponse.json();
    const closePrices = historicalData.closePrices;

    if (!closePrices || closePrices.length < 100) {
      return NextResponse.json(
        { error: 'Yeterli historical data bulunamadı' },
        { status: 400 }
      );
    }

    console.log(`Historical data loaded: ${closePrices.length} points`);

    // Window size'ı belirle
    const windowSize = getWindowSize(interval);
    console.log(`Using window size: ${windowSize}`);

    // Pattern normalizasyonu
    const normalizedPattern = normalizeToRange(patternData);

    // Benzer patternleri bul (sadece %90+ benzerlik)
    console.log('Finding similar patterns with 90%+ similarity...');
    const matches = findSimilarPatterns(normalizedPattern, closePrices, windowSize, 0.9, 10);

    if (matches.length === 0) {
      return NextResponse.json({
        symbol,
        interval,
        matches: [],
        message: 'Benzer pattern bulunamadı. Threshold değerini düşürmeyi deneyin.'
      });
    }

    console.log(`Found ${matches.length} similar patterns`);

    // Zaman hesaplamaları için interval'ı ms'ye çevir
    const intervalMs = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
    }[interval] || 60 * 60 * 1000;

    // Başlangıç zamanı (1 yıl öncesi)
    const endTime = Date.now();
    const startTimeBase = endTime - (365 * 24 * 60 * 60 * 1000);

    // Match'leri zenginleştir
    const enrichedMatches = matches.map(match => {
      const matchStartTime = startTimeBase + (match.startIndex * intervalMs);
      const matchEndTime = startTimeBase + (match.endIndex * intervalMs);
      
      return {
        ...match,
        startTime: new Date(matchStartTime).toISOString(),
        endTime: new Date(matchEndTime).toISOString(),
        startPrice: match.data[0],
        endPrice: match.data[match.data.length - 1],
        priceChange: ((match.data[match.data.length - 1] - match.data[0]) / match.data[0]) * 100,
        chartData: match.data.slice(0, 30) // İlk 30 nokta preview için
      };
    });

    return NextResponse.json({
      symbol,
      interval,
      patternLength: patternData.length,
      windowSize,
      historicalDataPoints: closePrices.length,
      matches: enrichedMatches,
      summary: {
        totalMatches: matches.length,
        avgSimilarity: matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length,
        bestMatch: matches[0]?.similarity || 0
      }
    });

  } catch (error) {
    console.error('Visual similarity error:', error);

    // Google AI API hatası
    if (error instanceof Error && error.message.includes('quota')) {
      return NextResponse.json(
        { error: 'AI API limit aşıldı. Lütfen daha sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'AI servisi konfigürasyon hatası' },
        { status: 500 }
      );
    }

    // Historical data hatası
    if (error instanceof Error && error.message.includes('Historical data fetch failed')) {
      return NextResponse.json(
        { error: 'Geçmiş veriler alınamadı. Lütfen tekrar deneyin.' },
        { status: 502 }
      );
    }

    // Pattern extraction hatası
    if (error instanceof Error && error.message.includes('Pattern extraction failed')) {
      return NextResponse.json(
        { error: 'Görselden pattern çıkarılamadı. Daha net bir grafik resmi yüklemeyi deneyin.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Benzerlik analizi sırasında bir hata oluştu', 
        details: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      },
      { status: 500 }
    );
  }
}
