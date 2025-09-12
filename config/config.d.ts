import { z } from 'zod';
declare const configSchema: z.ZodObject<{
    env: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>>;
    port: z.ZodDefault<z.ZodNumber>;
    mongodb: z.ZodObject<{
        uri: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    cors: z.ZodObject<{
        origin: z.ZodDefault<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
        credentials: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
    rateLimit: z.ZodObject<{
        windowMs: z.ZodDefault<z.ZodNumber>;
        max: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    gemini: z.ZodObject<{
        apiKey: z.ZodString;
        model: z.ZodDefault<z.ZodString>;
        maxRetries: z.ZodDefault<z.ZodNumber>;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    encryption: z.ZodObject<{
        algorithm: z.ZodDefault<z.ZodString>;
        secretKey: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    logging: z.ZodObject<{
        level: z.ZodDefault<z.ZodEnum<{
            error: "error";
            warn: "warn";
            info: "info";
            http: "http";
            verbose: "verbose";
            debug: "debug";
            silly: "silly";
        }>>;
        format: z.ZodDefault<z.ZodEnum<{
            json: "json";
            simple: "simple";
        }>>;
    }, z.core.$strip>;
    cache: z.ZodObject<{
        ttl: z.ZodDefault<z.ZodNumber>;
        checkPeriod: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type Config = z.infer<typeof configSchema>;
declare const config: Config;
export default config;
//# sourceMappingURL=config.d.ts.map