"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
const config_1 = __importDefault(require("../config/config"));
class CacheService {
    constructor(ttlSeconds = config_1.default.cache.ttl) {
        this.cache = new node_cache_1.default({
            stdTTL: ttlSeconds,
            checkperiod: config_1.default.cache.checkPeriod,
            useClones: false,
        });
    }
    get(key) {
        return this.cache.get(key);
    }
    set(key, value, ttl) {
        return this.cache.set(key, value, ttl || config_1.default.cache.ttl);
    }
    del(keys) {
        return this.cache.del(keys);
    }
    flush() {
        this.cache.flushAll();
    }
    getStats() {
        return this.cache.getStats();
    }
    has(key) {
        return this.cache.has(key);
    }
    ttl(key, ttl) {
        return this.cache.ttl(key, ttl);
    }
    getTtl(key) {
        return this.cache.getTtl(key);
    }
    keys() {
        return this.cache.keys();
    }
    // Cache decorator for methods
    static memoize(fn, keyGenerator, ttl) {
        const cache = new CacheService(ttl);
        return ((...args) => {
            const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
            const cached = cache.get(key);
            if (cached !== undefined) {
                return cached;
            }
            const result = fn(...args);
            // Handle promises
            if (result && typeof result.then === 'function') {
                return result.then((value) => {
                    cache.set(key, value);
                    return value;
                });
            }
            cache.set(key, result);
            return result;
        });
    }
}
// Export singleton instance
exports.cacheService = new CacheService();
// Export class for custom instances
exports.default = CacheService;
//# sourceMappingURL=cache.js.map