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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../config/config"));
const userSchema = new mongoose_1.Schema({
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
        transform: function (_doc, ret) {
            delete ret.geminiApiKey; // Never expose API key
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        transform: function (_doc, ret) {
            return ret;
        }
    }
});
// Indexes for performance
// auth0Id and email indexes come from field definitions (unique/index true)
userSchema.index({ createdAt: -1 });
// Encrypt API key before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('geminiApiKey')) {
        return next();
    }
    if (this.geminiApiKey) {
        try {
            const algorithm = config_1.default.encryption.algorithm;
            const key = Buffer.from(config_1.default.encryption.secretKey.slice(0, 32));
            const iv = crypto_1.default.randomBytes(16);
            const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
            let encrypted = cipher.update(this.geminiApiKey, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            this.geminiApiKey = iv.toString('hex') + ':' + encrypted;
            this.hasApiKey = true;
        }
        catch (error) {
            return next(error);
        }
    }
    else {
        this.hasApiKey = false;
    }
    next();
});
// Decrypt API key
userSchema.methods.getDecryptedApiKey = function () {
    if (!this.geminiApiKey)
        return null;
    try {
        const algorithm = config_1.default.encryption.algorithm;
        const key = Buffer.from(config_1.default.encryption.secretKey.slice(0, 32));
        const parts = this.geminiApiKey.split(':');
        if (parts.length !== 2)
            return null;
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('Failed to decrypt API key:', error);
        return null;
    }
};
// Set API key (triggers encryption on save)
userSchema.methods.setApiKey = async function (apiKey) {
    this.geminiApiKey = apiKey;
    // hasApiKey will be set by the pre-save hook
    await this.save();
};
// Remove API key
userSchema.methods.removeApiKey = async function () {
    this.geminiApiKey = null;
    // hasApiKey will be set to false by the pre-save hook
    await this.save();
};
// Increment generation count
userSchema.methods.incrementGeneration = async function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastGen = this.lastGenerationDate ? new Date(this.lastGenerationDate) : null;
    if (lastGen) {
        lastGen.setHours(0, 0, 0, 0);
    }
    // Reset daily count if it's a new day
    if (!lastGen || lastGen.getTime() !== today.getTime()) {
        this.dailyGenerationCount = 1;
    }
    else {
        this.dailyGenerationCount += 1;
    }
    this.generationCount += 1;
    this.lastGenerationDate = new Date();
    await this.save();
};
// Get today's generation count
userSchema.methods.getTodayGenerations = async function () {
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
userSchema.methods.resetDailyCount = async function () {
    this.dailyGenerationCount = 0;
    await this.save();
};
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
//# sourceMappingURL=User.js.map