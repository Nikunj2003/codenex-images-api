import NodeCache from 'node-cache';
declare class CacheService {
    private cache;
    constructor(ttlSeconds?: number);
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T, ttl?: number): boolean;
    del(keys: string | string[]): number;
    flush(): void;
    getStats(): NodeCache.Stats;
    has(key: string): boolean;
    ttl(key: string, ttl: number): boolean;
    getTtl(key: string): number | undefined;
    keys(): string[];
    static memoize<T extends (...args: any[]) => any>(fn: T, keyGenerator?: (...args: Parameters<T>) => string, ttl?: number): T;
}
export declare const cacheService: CacheService;
export default CacheService;
//# sourceMappingURL=cache.d.ts.map