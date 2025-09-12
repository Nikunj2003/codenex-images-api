import { z } from 'zod';
import { Document, Types } from 'mongoose';

// Zod schemas for validation
export const UserApiKeySchema = z.object({
  geminiApiKey: z.string().optional().nullable(),
});

export const UserCreateSchema = z.object({
  auth0Id: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
  geminiApiKey: z.string().optional().nullable(),
});

export const UserUpdateSchema = UserCreateSchema.partial();

export const GenerationSettingsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  seed: z.number().int().optional().nullable(),
  width: z.number().int().min(64).max(2048).optional(),
  height: z.number().int().min(64).max(2048).optional(),
  negativePrompt: z.string().optional(),
  referenceImages: z.array(z.string()).optional(),
  originalImage: z.string().optional(),
  maskImage: z.string().optional(),
  isEdit: z.boolean().optional(),
});

export const GenerationRequestSchema = z.object({
  auth0Id: z.string().min(1),
  prompt: z.string().min(1).max(5000),
  settings: GenerationSettingsSchema.optional(),
});

export const EditRequestSchema = z.object({
  auth0Id: z.string().min(1),
  instruction: z.string().min(1).max(5000),
  originalImage: z.string().min(1),
  maskImage: z.string().optional(),
  referenceImages: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(2).optional(),
  seed: z.number().int().optional().nullable(),
});

export const SegmentRequestSchema = z.object({
  auth0Id: z.string().min(1),
  image: z.string().min(1),
  query: z.string().min(1).max(500),
});

export const GenerationMetadataSchema = z.object({
  model: z.string(),
  generationTime: z.number(),
  apiKeyUsed: z.enum(['default', 'user']).optional(),
});

export const GenerationCreateSchema = z.object({
  userId: z.union([z.string(), z.instanceof(Types.ObjectId)]),
  auth0Id: z.string().min(1),
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  imageData: z.string().optional(),
  settings: GenerationSettingsSchema.optional(),
  metadata: GenerationMetadataSchema.optional(),
  isEdit: z.boolean().default(false),
  editInstruction: z.string().optional(),
  maskData: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
});

// TypeScript interfaces for Mongoose documents
export interface IUser extends Document {
  auth0Id: string;
  email: string;
  name?: string;
  picture?: string;
  geminiApiKey?: string | null;
  hasApiKey: boolean;
  generationCount: number;
  lastGenerationDate?: Date;
  dailyGenerationCount: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getDecryptedApiKey(): string | null;
  setApiKey(apiKey: string): Promise<void>;
  removeApiKey(): Promise<void>;
  incrementGeneration(): Promise<void>;
  getTodayGenerations(): Promise<number>;
  resetDailyCount(): Promise<void>;
}

export interface IGeneration extends Document {
  userId: Types.ObjectId;
  auth0Id: string;
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string | null;
  imageData?: string;
  settings?: z.infer<typeof GenerationSettingsSchema>;
  metadata?: z.infer<typeof GenerationMetadataSchema>;
  isEdit: boolean;
  editInstruction?: string;
  maskData?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// Type exports
export type UserApiKey = z.infer<typeof UserApiKeySchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type GenerationSettings = z.infer<typeof GenerationSettingsSchema>;
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
export type EditRequest = z.infer<typeof EditRequestSchema>;
export type SegmentRequest = z.infer<typeof SegmentRequestSchema>;
export type GenerationMetadata = z.infer<typeof GenerationMetadataSchema>;
export type GenerationCreate = z.infer<typeof GenerationCreateSchema>;