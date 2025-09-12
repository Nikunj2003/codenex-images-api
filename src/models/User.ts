import mongoose, { Schema, Model } from 'mongoose';
import crypto from 'crypto';
import config from '../config/config';
import { IUser } from '../types';

const userSchema = new Schema<IUser>({
  auth0Id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  name: {
    type: String,
  },
  picture: {
    type: String,
  },
  geminiApiKey: {
    type: String,
    default: null,
  },
  hasApiKey: {
    type: Boolean,
    default: false,
  },
  generationCount: {
    type: Number,
    default: 0,
  },
  lastGenerationDate: {
    type: Date,
  },
  dailyGenerationCount: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc, ret: any) {
      delete ret.geminiApiKey; // Never expose API key
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(_doc, ret) {
      return ret;
    }
  }
});

// Indexes for performance
// Note: auth0Id and email already have indexes via the schema fields (index/unique).
// Keep only non-duplicate compound/sort index below.
userSchema.index({ createdAt: -1 });

// Encrypt API key before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('geminiApiKey')) {
    return next();
  }

  if (this.geminiApiKey) {
    try {
      const algorithm = config.encryption.algorithm;
      const key = Buffer.from(config.encryption.secretKey.slice(0, 32));
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(this.geminiApiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      this.geminiApiKey = iv.toString('hex') + ':' + encrypted;
      this.hasApiKey = true;
    } catch (error) {
      return next(error as Error);
    }
  } else {
    this.hasApiKey = false;
  }
  
  next();
});

// Decrypt API key
userSchema.methods.getDecryptedApiKey = function(this: IUser): string | null {
  if (!this.geminiApiKey) return null;
  
  try {
    const algorithm = config.encryption.algorithm;
    const key = Buffer.from(config.encryption.secretKey.slice(0, 32));
    
    const parts = this.geminiApiKey.split(':');
    if (parts.length !== 2) return null;
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    return null;
  }
};

// Set API key (triggers encryption on save)
userSchema.methods.setApiKey = async function(this: IUser, apiKey: string): Promise<void> {
  this.geminiApiKey = apiKey;
  // hasApiKey will be set by the pre-save hook
  await this.save();
};

// Remove API key
userSchema.methods.removeApiKey = async function(this: IUser): Promise<void> {
  this.geminiApiKey = null;
  // hasApiKey will be set to false by the pre-save hook
  await this.save();
};

// Increment generation count
userSchema.methods.incrementGeneration = async function(this: IUser): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastGen = this.lastGenerationDate ? new Date(this.lastGenerationDate) : null;
  if (lastGen) {
    lastGen.setHours(0, 0, 0, 0);
  }
  
  // Reset daily count if it's a new day
  if (!lastGen || lastGen.getTime() !== today.getTime()) {
    this.dailyGenerationCount = 1;
  } else {
    this.dailyGenerationCount += 1;
  }
  
  this.generationCount += 1;
  this.lastGenerationDate = new Date();
  
  await this.save();
};

// Get today's generation count
userSchema.methods.getTodayGenerations = async function(this: IUser): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastGen = this.lastGenerationDate ? new Date(this.lastGenerationDate) : null;
  if (lastGen) {
    lastGen.setHours(0, 0, 0, 0);
  }
  
  // If last generation was not today, count is 0
  if (!lastGen || lastGen.getTime() !== today.getTime()) {
    return 0;
  }
  
  return this.dailyGenerationCount || 0;
};

// Reset daily count
userSchema.methods.resetDailyCount = async function(this: IUser): Promise<void> {
  this.dailyGenerationCount = 0;
  await this.save();
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;