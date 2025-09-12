import mongoose, { Schema, Model } from 'mongoose';
import { IGeneration } from '../types';

const generationSchema = new Schema<IGeneration>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  auth0Id: {
    type: String,
    required: true,
    index: true,
  },
  prompt: {
    type: String,
    required: true,
  },
  negativePrompt: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  imageData: {
    type: String,
  },
  settings: {
    type: {
      temperature: Number,
      seed: Number,
      width: Number,
      height: Number,
      negativePrompt: String,
      referenceImages: [String],
      originalImage: String,
      maskImage: String,
      isEdit: Boolean,
    },
    default: {},
  },
  metadata: {
    type: {
      model: String,
      generationTime: Number,
      apiKeyUsed: {
        type: String,
        enum: ['default', 'user'],
      },
    },
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
  editInstruction: {
    type: String,
  },
  maskData: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

// Indexes for performance
generationSchema.index({ userId: 1, createdAt: -1 });
generationSchema.index({ auth0Id: 1, createdAt: -1 });
generationSchema.index({ status: 1 });
generationSchema.index({ createdAt: -1 });

// Virtual for age
generationSchema.virtual('age').get(function(this: IGeneration) {
  return Date.now() - this.createdAt.getTime();
});

// Limit the size of imageData when converting to JSON (for listing)
generationSchema.set('toJSON', {
  transform: function(_doc, ret: any, options: any) {
    // Only remove imageData if not explicitly requested
    if (ret.imageData && ret.imageData.length > 100 && !options.includeImageData) {
      ret.hasImageData = true;
      delete ret.imageData; // Don't include full image data in listings
    }
    delete ret.__v;
    return ret;
  },
  virtuals: true,
});

const Generation: Model<IGeneration> = mongoose.model<IGeneration>('Generation', generationSchema);

export default Generation;