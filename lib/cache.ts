// Basit memory cache implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // TTL kontrolü
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Expired entries'leri temizle
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Cache stats
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const cache = new MemoryCache();

// Cleanup her 5 dakikada bir
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);

// Cache key helper functions
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

// Specific cache keys
export const CacheKeys = {
  klines: (symbol: string, interval: string, limit: number) => 
    createCacheKey('klines', symbol, interval, limit),
  
  liveChart: (symbol: string, interval: string, hours: number) =>
    createCacheKey('live-chart', symbol, interval, hours),
    
  analyze: (symbol: string, interval: string, window: number) =>
    createCacheKey('analyze', symbol, interval, window),
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  KLINES_1M: 30,    // 30 saniye
  KLINES_5M: 120,   // 2 dakika
  KLINES_15M: 300,  // 5 dakika
  KLINES_1H: 900,   // 15 dakika
  KLINES_4H: 1800,  // 30 dakika
  LIVE_CHART: 60,   // 1 dakika
  ANALYZE: 120,     // 2 dakika
};

// Interval'a göre TTL döndür
export function getTTLForInterval(interval: string): number {
  switch (interval) {
    case '1m': return CacheTTL.KLINES_1M;
    case '5m': return CacheTTL.KLINES_5M;
    case '15m': return CacheTTL.KLINES_15M;
    case '1h': return CacheTTL.KLINES_1H;
    case '4h': return CacheTTL.KLINES_4H;
    default: return CacheTTL.KLINES_15M;
  }
}
