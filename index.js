const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

// Load environment variables from root directory
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const User = require('./models/User');
const Generation = require('./models/Generation');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// MongoDB connection
const MONGODB_URI = '';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.log('❌ Server requires MongoDB connection. Please check your connection string and network.');
  // Don't exit, let the server run but operations will fail
});

// Routes

// Get or create user
app.post('/api/users/sync', async (req, res) => {
  try {
    const { auth0Id, email, name, picture } = req.body;
    
    if (!auth0Id || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let user = await User.findOne({ auth0Id });
    
    if (!user) {
      user = new User({
        auth0Id,
        email,
        name,
        picture
      });
      await user.save();
      console.log('✅ New user created:', email);
    } else {
      // Update user info if changed
      user.email = email;
      user.name = name;
      user.picture = picture;
      await user.save();
    }

    // Check generation limit
    const canGenerate = user.canGenerate();
    
    res.json({
      user: {
        id: user._id,
        auth0Id: user.auth0Id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        hasApiKey: !!user.geminiApiKey,
        dailyGenerations: user.dailyGenerations,
        totalGenerations: user.totalGenerations,
        canGenerate: canGenerate.allowed,
        limitReason: canGenerate.reason,
        limitMessage: canGenerate.message
      }
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// Get user data
app.get('/api/users/:auth0Id', async (req, res) => {
  try {
    const user = await User.findOne({ auth0Id: req.params.auth0Id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const canGenerate = user.canGenerate();
    
    res.json({
      user: {
        id: user._id,
        auth0Id: user.auth0Id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        hasApiKey: !!user.geminiApiKey,
        dailyGenerations: user.dailyGenerations,
        totalGenerations: user.totalGenerations,
        canGenerate: canGenerate.allowed,
        limitReason: canGenerate.reason,
        limitMessage: canGenerate.message
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user API key
app.post('/api/users/:auth0Id/api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const user = await User.findOne({ auth0Id: req.params.auth0Id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.geminiApiKey = apiKey || null;
    await user.save();
    
    res.json({
      success: true,
      hasApiKey: !!user.geminiApiKey,
      message: apiKey ? 'API key saved successfully' : 'API key removed'
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// Check generation limit
app.get('/api/users/:auth0Id/can-generate', async (req, res) => {
  try {
    const user = await User.findOne({ auth0Id: req.params.auth0Id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const canGenerate = user.canGenerate();
    
    res.json({
      allowed: canGenerate.allowed,
      reason: canGenerate.reason,
      message: canGenerate.message,
      dailyGenerations: user.dailyGenerations,
      hasApiKey: !!user.geminiApiKey
    });
  } catch (error) {
    console.error('Error checking generation limit:', error);
    res.status(500).json({ error: 'Failed to check generation limit' });
  }
});

// Record generation
app.post('/api/generations', async (req, res) => {
  try {
    const {
      auth0Id,
      prompt,
      negativePrompt,
      imageUrl,
      imageData,
      settings,
      metadata,
      isEdit,
      parentGenerationId,
      editInstruction,
      maskData,
      status = 'completed'
    } = req.body;

    const user = await User.findOne({ auth0Id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user can generate
    const canGenerate = user.canGenerate();
    if (!canGenerate.allowed) {
      return res.status(403).json({
        error: 'Generation limit exceeded',
        message: canGenerate.message
      });
    }

    // Create generation record
    const generation = new Generation({
      userId: user._id,
      auth0Id,
      prompt,
      negativePrompt,
      imageUrl,
      imageData,
      settings,
      metadata: {
        ...metadata,
        usedOwnApiKey: !!user.geminiApiKey
      },
      isEdit,
      parentGenerationId,
      editInstruction,
      maskData,
      status
    });

    await generation.save();

    // Don't increment here - it's already incremented in /api/generate endpoint
    // This endpoint is just for recording the generation history
    // await user.incrementGeneration();

    res.json({
      success: true,
      generation: generation.toObject(),
      remainingGenerations: user.geminiApiKey ? 'unlimited' : (2 - user.dailyGenerations)
    });
  } catch (error) {
    console.error('Error recording generation:', error);
    res.status(500).json({ error: 'Failed to record generation' });
  }
});

// Get user generation history
app.get('/api/generations/:auth0Id', async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    
    const user = await User.findOne({ auth0Id: req.params.auth0Id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const generations = await Generation.getUserHistory(
      user._id,
      parseInt(limit),
      parseInt(skip)
    );

    const total = await Generation.countDocuments({ userId: user._id });

    res.json({
      generations,
      total,
      hasMore: total > (parseInt(skip) + generations.length)
    });
  } catch (error) {
    console.error('Error fetching generation history:', error);
    res.status(500).json({ error: 'Failed to fetch generation history' });
  }
});

// Get today's generation count
app.get('/api/generations/:auth0Id/today', async (req, res) => {
  try {
    const user = await User.findOne({ auth0Id: req.params.auth0Id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const todayGenerations = await Generation.getTodayGenerations(user._id);

    res.json({
      count: todayGenerations.length,
      generations: todayGenerations
    });
  } catch (error) {
    console.error('Error fetching today\'s generations:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s generations' });
  }
});

// Generate image with user's API key (proxy endpoint)
app.post('/api/generate', async (req, res) => {
  try {
    const { auth0Id, prompt, settings } = req.body;
    
    // Check if this is an edit operation
    const isEdit = settings?.isEdit || false;
    const originalImage = settings?.originalImage;
    const maskImage = settings?.maskImage;
    const referenceImages = settings?.referenceImages;
    
    const user = await User.findOne({ auth0Id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user can generate
    const canGenerate = user.canGenerate();
    if (!canGenerate.allowed) {
      return res.status(403).json({
        error: 'Generation limit exceeded',
        message: canGenerate.message
      });
    }

    // Get the appropriate API key
    // Use user's key if available, otherwise use default server key
    const apiKey = user.geminiApiKey || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key available' });
    }
    
    const usingUserKey = !!user.geminiApiKey;

    // Build the prompt with dimensions and advanced settings
    let enhancedPrompt = prompt;
    
    // Add creative style based on temperature
    let creativeGuidance = '';
    if (settings?.temperature !== undefined) {
      if (settings.temperature <= 0.5) {
        creativeGuidance = 'Create a precise, realistic, and highly detailed image with photographic accuracy.';
      } else if (settings.temperature <= 1.0) {
        creativeGuidance = 'Create a balanced image with natural style and moderate artistic interpretation.';
      } else if (settings.temperature <= 1.5) {
        creativeGuidance = 'Create an artistic and creative image with stylized elements and imaginative details.';
      } else {
        creativeGuidance = 'Create a highly imaginative, surreal, and experimental image with bold artistic choices.';
      }
    }
    
    // Add seed for consistency (as a style hint)
    let seedGuidance = '';
    if (settings?.seed) {
      seedGuidance = `Style reference: ${settings.seed}`;
    }
    
    if (settings?.width && settings?.height) {
      const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(settings.width, settings.height);
      const simplifiedWidth = settings.width / divisor;
      const simplifiedHeight = settings.height / divisor;
      
      const ratio = `${simplifiedWidth}:${simplifiedHeight}`;
      let format = '';
      if (ratio === '16:9') format = 'widescreen/cinematic';
      else if (ratio === '9:16') format = 'vertical/mobile';
      else if (ratio === '4:3') format = 'standard/classic';
      else if (ratio === '3:4') format = 'portrait';
      else if (ratio === '21:9') format = 'ultra-wide/cinematic';
      else if (ratio === '1:1') format = 'square/Instagram';
      
      enhancedPrompt = `${creativeGuidance ? creativeGuidance + '\n\n' : ''}Create an image with the following specifications:

CONTENT: ${prompt}

FORMAT REQUIREMENTS:
• Aspect Ratio: ${ratio} ${format ? `(${format} format)` : ''}
• Dimensions: ${settings.width}×${settings.height} pixels
• Composition: ${settings.width > settings.height ? 'Horizontal/Landscape - compose with wide framing, subjects spread horizontally' : settings.width < settings.height ? 'Vertical/Portrait - compose with tall framing, subjects arranged vertically' : 'Square - centered composition with balanced framing'}
${seedGuidance ? `• ${seedGuidance}` : ''}

Ensure the entire image fills the ${ratio} aspect ratio frame completely with no black bars or empty space.`;
    } else if (creativeGuidance || seedGuidance) {
      // Even without dimensions, apply creative settings
      enhancedPrompt = `${creativeGuidance ? creativeGuidance + '\n\n' : ''}${prompt}${seedGuidance ? '\n\n' + seedGuidance : ''}`;
    }

    // Validate API key before using
    if (!apiKey || apiKey === 'null' || apiKey === 'undefined' || apiKey.length < 20) {
      console.error('[Generate API] Invalid or missing API key');
      return res.status(400).json({ 
        error: 'Invalid API key',
        message: 'Please configure a valid API key to generate images'
      });
    }
    
    let images = [];
    let actuallyUsedUserKey = usingUserKey;
    
    try {
      // Initialize the Gemini API with the correct package
      const genAI = new GoogleGenAI({ apiKey });
      
      console.log(`[Generate API] Using ${usingUserKey ? "user's" : "default"} API key for ${auth0Id}`);
      console.log(`[Generate API] Mode: ${isEdit ? 'EDIT' : 'GENERATION'}`);
      console.log('[Generate API] Prompt:', enhancedPrompt.substring(0, 100) + '...');
      
      // Prepare content based on whether it's an edit or generation
      let contents;
      
      if (isEdit && originalImage) {
        // Build the edit prompt based on the original implementation
        let editPrompt;
        
        if (maskImage) {
          // Include mask instruction like the original
          editPrompt = `Edit this image according to the following instruction: ${enhancedPrompt}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.

IMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges.

Preserve image quality and ensure the edit looks professional and realistic.`;
        } else {
          editPrompt = `Edit this image according to the following instruction: ${enhancedPrompt}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.

Preserve image quality and ensure the edit looks professional and realistic.`;
        }
        
        // Build contents array exactly like the original implementation
        contents = [
          { text: editPrompt },
          {
            inlineData: {
              mimeType: "image/png",
              data: originalImage
            }
          }
        ];
        
        // Add reference images if provided (after original image, like in the original)
        if (referenceImages && referenceImages.length > 0) {
          referenceImages.forEach(refImage => {
            contents.push({
              inlineData: {
                mimeType: "image/png",
                data: refImage
              }
            });
          });
        }
        
        // Add mask image last if provided (like in the original)
        if (maskImage) {
          contents.push({
            inlineData: {
              mimeType: "image/png",
              data: maskImage
            }
          });
        }
        
      } else if (referenceImages && referenceImages.length > 0) {
        // For generation with reference images
        contents = [];
        
        // Add reference images
        for (const refImage of referenceImages) {
          contents.push({
            inlineData: {
              mimeType: "image/png",
              data: refImage
            }
          });
        }
        
        // Add prompt with reference context
        contents.push({ 
          text: `Using the provided reference image(s) for style and context: ${enhancedPrompt}` 
        });
        
      } else {
        // Regular text-only generation
        contents = enhancedPrompt;
      }
      
      // Generate content using the image generation model
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: contents
      });
      
      console.log('[Generate API] Response received');
      
      // Check if response contains image data
      if (response && response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            // Check for inline image data
            if (part.inlineData && part.inlineData.data) {
              console.log('[Generate API] Found image in response');
              images.push(part.inlineData.data);
            }
            // Log any text response for debugging
            if (part.text) {
              console.log('[Generate API] Text response:', part.text.substring(0, 200));
            }
          }
        }
      }
    } catch (apiError) {
      console.error('[Generate API] API Error:', apiError);
      
      // If user's API key is invalid, try falling back to default key
      if (usingUserKey && apiError.status === 400 && apiError.message?.includes('API key not valid')) {
        console.log('[Generate API] User API key is invalid, falling back to default key');
        
        // Clear the invalid user API key
        user.geminiApiKey = null;
        await user.save();
        
        // Check if we have a default key
        const defaultKey = process.env.GEMINI_API_KEY;
        if (!defaultKey || defaultKey.length < 20) {
          return res.status(400).json({
            error: 'No valid API key available',
            message: 'Your API key is invalid and no default key is configured. Please add a valid Gemini API key.'
          });
        }
        
        // Retry with default key
        try {
          const defaultGenAI = new GoogleGenAI({ apiKey: defaultKey });
          const retryResponse = await defaultGenAI.models.generateContent({
            model: "gemini-2.5-flash-image-preview",
            contents: enhancedPrompt
          });
          
          if (retryResponse?.candidates?.[0]?.content?.parts) {
            for (const part of retryResponse.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                images.push(part.inlineData.data);
              }
            }
          }
          
          actuallyUsedUserKey = false;
          console.log(`[Generate API] Successfully generated ${images.length} image(s) with default key`);
        } catch (retryError) {
          console.error('[Generate API] Failed with default key too:', retryError);
          throw retryError;
        }
      } else {
        // Re-throw other errors
        throw apiError;
      }
    }
    
    if (images.length === 0) {
      console.error('[Generate API] No images found in response');
      throw new Error('No images were generated. The model may not support image generation or the prompt may need adjustment.');
    }
    
    console.log(`[Generate API] Successfully generated ${images.length} image(s)`);
    
    // Record the generation (only if not using own key)
    if (!actuallyUsedUserKey) {
      await user.incrementGeneration();
    }
    
    res.json({
      success: true,
      result: {
        images: images
      },
      usedOwnKey: actuallyUsedUserKey
    });
  } catch (error) {
    console.error('Error generating with user key:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Segmentation endpoint (doesn't count toward generation limit)
app.post('/api/segment', async (req, res) => {
  try {
    const { auth0Id, image, query } = req.body;
    
    const user = await User.findOne({ auth0Id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get the appropriate API key
    const apiKey = user.geminiApiKey || process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'null' || apiKey === 'undefined' || apiKey.length < 20) {
      return res.status(400).json({ 
        error: 'Invalid API key',
        message: 'Please configure a valid API key to use segmentation'
      });
    }
    
    const usingUserKey = !!user.geminiApiKey;
    
    // Initialize the Gemini API
    const genAI = new GoogleGenAI({ apiKey });
    
    console.log(`[Segment API] Using ${usingUserKey ? "user's" : "default"} API key for ${auth0Id}`);
    console.log('[Segment API] Query:', query);
    
    // Prepare the segmentation prompt
    const prompt = `Analyze this image and create a segmentation mask for: ${query}

Return a JSON object with this exact structure:
{
  "masks": [
    {
      "label": "description of the segmented object",
      "box_2d": [x, y, width, height],
      "mask": "base64-encoded binary mask image"
    }
  ]
}

Only segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.`;

    // Call Gemini API for segmentation
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/png",
            data: image
          }
        },
        { text: prompt }
      ]
    });
    
    console.log('[Segment API] Response received');
    
    // Extract the JSON response
    let segmentationResult;
    if (response && response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            try {
              // Try to parse the JSON response
              const jsonMatch = part.text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                segmentationResult = JSON.parse(jsonMatch[0]);
              }
            } catch (parseError) {
              console.error('[Segment API] Failed to parse JSON:', parseError);
              console.log('[Segment API] Raw text:', part.text);
            }
          }
        }
      }
    }
    
    if (!segmentationResult) {
      // If we couldn't get a proper segmentation, return a mock response
      segmentationResult = {
        masks: [{
          label: query,
          box_2d: [0, 0, 100, 100],
          mask: null
        }]
      };
    }
    
    res.json({
      success: true,
      result: segmentationResult
    });
    
  } catch (error) {
    console.error('Error in segmentation:', error);
    res.status(500).json({ error: 'Failed to segment image' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});