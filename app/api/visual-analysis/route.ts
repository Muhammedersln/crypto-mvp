import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

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

    if (!image) {
      return NextResponse.json(
        { error: 'Görsel dosyası bulunamadı' },
        { status: 400 }
      );
    }

    // Dosya boyutu kontrolü (maksimum 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (image.size > maxSize) {
      return NextResponse.json(
        { error: 'Dosya boyutu çok büyük (maksimum 10MB)' },
        { status: 400 }
      );
    }

    // Dosya tipini kontrol et
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: 'Desteklenmeyen dosya formatı. JPG, PNG, WEBP, GIF veya BMP kullanın.' },
        { status: 400 }
      );
    }

    // Görüntüyü base64'e çevir
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Gemini 2.5 Flash modelini başlat
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        maxOutputTokens: 2048,
      }
    });

    const prompt = `
Bu finansal grafik görselini analiz et ve aşağıdaki konularda detaylı bilgi ver:

1. GENEL DEĞERLENDİRME: Grafikte ne görüyorsun? Hangi finansal enstrüman veya zaman dilimi olabilir?

2. FİYAT HAREKETLERİ: 
   - Ana yükseliş ve düşüş trendlerini belirle
   - Önemli fiyat seviyelerini tespit et (destek/direnç)
   - Volatilite durumunu değerlendir

3. FİYAT SEVİYELERİ:
   - Görünen fiyat değerlerini yaklaşık olarak belirle
   - En yüksek ve en düşük noktaları tespit et
   - Mevcut seviyeyi değerlendir

4. TREND ANALİZİ:
   - Genel trend yönünü belirle (yükseliş/düşüş/yatay)
   - Trend değişim noktalarını tespit et
   - Güçlü formasyonları (pattern) varsa belirle

5. POTANSİYEL GELİŞMELER:
   - Gelecekteki olası fiyat hareketleri hakkında tahminler
   - Dikkat edilmesi gereken seviyeler
   - Risk faktörleri

Cevabını JSON formatında ver:
{
  "summary": "genel değerlendirme tek paragraf",
  "movements": ["hareket1", "hareket2", ...],
  "prices": ["fiyat1", "fiyat2", ...],
  "trends": ["trend1", "trend2", ...],
  "predictions": ["tahmin1", "tahmin2", ...]
}

Her liste elemanı kısa ve net olsun (maksimum 100 karakter). Türkçe cevap ver.
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
    const text = response.text();

    console.log('Gemini Response:', text);

    // JSON'u parse et
    let parsedResponse;
    try {
      // JSON'un başındaki ve sonundaki markdown formatını temizle
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', text);
      
      // Fallback: Text'i düz metin olarak döndür
      return NextResponse.json({
        analysis: {
          summary: text,
          movements: [],
          prices: [],
          trends: [],
          predictions: []
        }
      });
    }

    // Response'u validate et
    const validatedResponse = {
      summary: parsedResponse.summary || 'Analiz tamamlanamadı',
      movements: Array.isArray(parsedResponse.movements) ? parsedResponse.movements : [],
      prices: Array.isArray(parsedResponse.prices) ? parsedResponse.prices : [],
      trends: Array.isArray(parsedResponse.trends) ? parsedResponse.trends : [],
      predictions: Array.isArray(parsedResponse.predictions) ? parsedResponse.predictions : []
    };

    return NextResponse.json({
      analysis: validatedResponse
    });

  } catch (error) {
    console.error('Visual analysis error:', error);
    
    // Google AI API rate limit hatası
    if (error instanceof Error && error.message.includes('quota')) {
      return NextResponse.json(
        { error: 'API limit aşıldı. Lütfen daha sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    // Google AI API genel hatası
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'AI servisi konfigürasyon hatası' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Görsel analiz sırasında bir hata oluştu', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}
