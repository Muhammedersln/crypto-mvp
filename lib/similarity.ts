/**
 * Z-score normalizasyonu hesaplar
 */
export function zscore(data: number[]): number[] {
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  return data.map(val => (val - mean) / stdDev);
}

/**
 * Pearson korelasyon katsayısını hesaplar
 */
export function pearson(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Cosine similarity hesaplar
 */
export function cosine(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const dotProduct = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const magnitudeX = Math.sqrt(x.reduce((sum, val) => sum + val * val, 0));
  const magnitudeY = Math.sqrt(y.reduce((sum, val) => sum + val * val, 0));
  
  const denominator = magnitudeX * magnitudeY;
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * 5 gün önceki aynı uzunluktaki pencereyi döndürür
 * 15 dakikalık interval için 5 gün = 480 veri noktası
 */
export function sliceFiveDaysAgo(data: number[], window: number): number[] {
  const fiveDaysAgo = 480; // 5 gün * 24 saat * 4 (15 dakikalık interval)
  const startIndex = Math.max(0, data.length - fiveDaysAgo - window);
  const endIndex = Math.max(0, data.length - fiveDaysAgo);
  
  return data.slice(startIndex, endIndex);
}

/**
 * İki veri setinin benzer olup olmadığını kontrol eder
 */
export function isSimilar(correlation: number, cosine: number): boolean {
  return correlation >= 0.92 || cosine >= 0.95;
}

/**
 * Veri setlerini normalize eder ve benzerlik hesaplar
 */
export function calculateSimilarity(current: number[], historical: number[]): {
  correlation: number;
  cosine: number;
  isSimilar: boolean;
} {
  if (current.length !== historical.length || current.length === 0) {
    return { correlation: 0, cosine: 0, isSimilar: false };
  }
  
  const normalizedCurrent = zscore(current);
  const normalizedHistorical = zscore(historical);
  
  const correlation = pearson(normalizedCurrent, normalizedHistorical);
  const cosineSim = cosine(normalizedCurrent, normalizedHistorical);
  const similar = isSimilar(correlation, cosineSim);
  
  return {
    correlation: Math.round(correlation * 10000) / 10000, // 4 ondalık basamak
    cosine: Math.round(cosineSim * 10000) / 10000,
    isSimilar: similar
  };
}

/**
 * Pattern matching için veriyi yeniden örnekler
 */
export function resampleData(data: number[], targetLength: number): number[] {
  if (data.length === targetLength) return [...data];
  
  const result: number[] = [];
  const ratio = (data.length - 1) / (targetLength - 1);
  
  for (let i = 0; i < targetLength; i++) {
    const index = i * ratio;
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.min(Math.ceil(index), data.length - 1);
    const weight = index - lowerIndex;
    
    if (lowerIndex === upperIndex) {
      result.push(data[lowerIndex]);
    } else {
      // Linear interpolation
      const interpolated = data[lowerIndex] * (1 - weight) + data[upperIndex] * weight;
      result.push(interpolated);
    }
  }
  
  return result;
}

/**
 * Fiyat verisini normalize eder (0-1 arası)
 */
export function normalizeToRange(data: number[]): number[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  if (range === 0) return data.map(() => 0.5);
  
  return data.map(value => (value - min) / range);
}

/**
 * Pattern matching için benzerlik skorunu hesaplar
 */
export function calculatePatternSimilarity(pattern: number[], data: number[]): number {
  if (pattern.length === 0 || data.length === 0) return 0;
  
  // Her ikisini de aynı uzunluğa getir
  const targetLength = Math.min(pattern.length, 50); // Maksimum 50 nokta
  const resampledPattern = resampleData(pattern, targetLength);
  const resampledData = resampleData(data, targetLength);
  
  // Normalize et (0-1 arası)
  const normalizedPattern = normalizeToRange(resampledPattern);
  const normalizedData = normalizeToRange(resampledData);
  
  // Shape-based similarity (şekil benzerliği)
  const shapeSimilarity = calculateShapeSimilarity(normalizedPattern, normalizedData);
  
  // Z-score normalizasyonu
  const zPattern = zscore(normalizedPattern);
  const zData = zscore(normalizedData);
  
  // Korelasyon ve cosine similarity
  const correlation = Math.abs(pearson(zPattern, zData));
  const cosineSim = Math.abs(cosine(zPattern, zData));
  
  // Trend similarity (yön benzerliği)
  const trendSimilarity = calculateTrendSimilarity(normalizedPattern, normalizedData);
  
  // Ağırlıklı ortalama: Shape %40, Correlation %30, Cosine %20, Trend %10
  return (shapeSimilarity * 0.4 + correlation * 0.3 + cosineSim * 0.2 + trendSimilarity * 0.1);
}

/**
 * Şekil benzerliği hesaplar (point-to-point distance)
 */
function calculateShapeSimilarity(pattern1: number[], pattern2: number[]): number {
  if (pattern1.length !== pattern2.length) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < pattern1.length; i++) {
    const distance = Math.abs(pattern1[i] - pattern2[i]);
    totalDistance += distance;
  }
  
  const averageDistance = totalDistance / pattern1.length;
  // 1'den uzaklığı çıkararak benzerlik skoru elde et
  return Math.max(0, 1 - averageDistance);
}

/**
 * Trend benzerliği hesaplar (yön değişimleri)
 */
function calculateTrendSimilarity(pattern1: number[], pattern2: number[]): number {
  if (pattern1.length < 3 || pattern2.length < 3) return 0;
  
  const trends1 = getTrendDirections(pattern1);
  const trends2 = getTrendDirections(pattern2);
  
  if (trends1.length !== trends2.length) return 0;
  
  let matches = 0;
  for (let i = 0; i < trends1.length; i++) {
    if (trends1[i] === trends2[i]) matches++;
  }
  
  return matches / trends1.length;
}

/**
 * Veri serisinin trend yönlerini hesaplar
 */
function getTrendDirections(data: number[]): number[] {
  const trends: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i] > data[i - 1]) trends.push(1);      // Yükseliş
    else if (data[i] < data[i - 1]) trends.push(-1); // Düşüş
    else trends.push(0);                              // Yatay
  }
  return trends;
}

/**
 * Büyük veri setinde pattern arar ve devamını da getirir
 */
export function findPatternMatches(
  pattern: number[], 
  historicalData: number[], 
  windowSize: number = 50,
  threshold: number = 0.75,
  maxMatches: number = 10,
  continuationLength: number = 30
): Array<{
  startIndex: number;
  endIndex: number;
  similarity: number;
  data: number[];
  continuation: number[];
  continuationStartIndex: number;
  continuationEndIndex: number;
}> {
  if (pattern.length === 0 || historicalData.length < windowSize) {
    return [];
  }
  
  const matches: Array<{
    startIndex: number;
    endIndex: number;
    similarity: number;
    data: number[];
    continuation: number[];
    continuationStartIndex: number;
    continuationEndIndex: number;
  }> = [];
  
  // Sliding window ile pattern ara
  for (let i = 0; i <= historicalData.length - windowSize; i++) {
    const window = historicalData.slice(i, i + windowSize);
    const similarity = calculatePatternSimilarity(pattern, window);
    
    if (similarity >= threshold) {
      // Pattern'in devamını al
      const continuationStart = i + windowSize;
      const continuationEnd = Math.min(continuationStart + continuationLength, historicalData.length);
      const continuation = historicalData.slice(continuationStart, continuationEnd);
      
      matches.push({
        startIndex: i,
        endIndex: i + windowSize - 1,
        similarity: Math.round(similarity * 10000) / 10000,
        data: window,
        continuation,
        continuationStartIndex: continuationStart,
        continuationEndIndex: continuationEnd - 1
      });
    }
  }
  
  // Benzerlik skoruna göre sırala ve en iyi sonuçları al
  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxMatches);
}