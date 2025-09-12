"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const generationSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
generationSchema.virtual('age').get(function () {
    return Date.now() - this.createdAt.getTime();
});
// Limit the size of imageData when converting to JSON (for listing)
generationSchema.set('toJSON', {
    transform: function (_doc, ret, options) {
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
const Generation = mongoose_1.default.model('Generation', generationSchema);
exports.default = Generation;
//# sourceMappingURL=Generation.js.map