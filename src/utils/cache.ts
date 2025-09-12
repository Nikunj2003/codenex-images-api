import NodeCache from 'node-cache';
import config from '../config/config';

class CacheService {
  private cache: NodeCache;

  constructor(ttlSeconds: number = config.cache.ttl) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: config.cache.checkPeriod,
      useClones: false,
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl || config.cache.ttl);
  }

  del(keys: string | string[]): number {
    return this.cache.del(keys);
  }

  flush(): void {
    this.cache.flushAll();
  }

  getStats() {
    return this.cache.getStats();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  ttl(key: string, ttl: number): boolean {
    return this.cache.ttl(key, ttl);
  }

  getTtl(key: string): number | undefined {
    return this.cache.getTtl(key);
  }

  keys(): string[] {
    return this.cache.keys();
  }

  // Cache decorator for methods
  static memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    ttl?: number
  ): T {
    const cache = new CacheService(ttl);
    
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      const cached = cache.get<ReturnType<T>>(key);
      
      if (cached !== undefined) {
        return cached;
      }
      
      const result = fn(...args);
      
      // Handle promises
      if (result && typeof result.then === 'function') {
        return result.then((value: any) => {
          cache.set(key, value);
          return value;
        });
      }
      
      cache.set(key, result);
      return result;
    }) as T;
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export class for custom instances
export default CacheService;