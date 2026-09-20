import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Gemini API Client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Heuristic Fallback Category Classifier for Zari, Laces, and Embroidery Products
function fallbackCategoryClassifier(product: {
  id: string;
  name: string;
  description?: string;
  urduName?: string;
  sku?: string;
}) {
  const combined = `${product.name} ${product.description || ''} ${product.urduName || ''} ${product.sku || ''}`.toLowerCase();

  if (/gota|gotha|گوٹہ|gota kinari|gota patti|gota phool/i.test(combined)) {
    return {
      category: 'Gota & Gota Patti',
      confidence: 'HIGH' as const,
      reasoning: 'Detected Gota / Gota Patti keywords in product title and specifications',
    };
  }
  if (/tilla|tila|تلہ|metallic thread|gold tilla|silver tilla|zari thread|resham/i.test(combined)) {
    return {
      category: 'Tilla & Metallic Threads',
      confidence: 'HIGH' as const,
      reasoning: 'Matches metallic embroidery thread, Tilla, or Zari thread signatures',
    };
  }
  if (/lace|less|لیس|fancy lace|crochet lace|cotton lace|organza lace|shuttle lace/i.test(combined)) {
    return {
      category: 'Laces & Borders',
      confidence: 'HIGH' as const,
      reasoning: 'Detected lace, trim, or border edging keywords',
    };
  }
  if (/velvet|ribbon|velvet ribbon|satin ribbon|organza ribbon|پٹی|ربن/i.test(combined)) {
    return {
      category: 'Velvet & Satin Ribbons',
      confidence: 'HIGH' as const,
      reasoning: 'Product title contains velvet ribbon, satin trim, or ribbon band keywords',
    };
  }
  if (/sitara|star|sequin|sequins|ستارہ|chamki|paillettes/i.test(combined)) {
    return {
      category: 'Sitara & Sequins',
      confidence: 'HIGH' as const,
      reasoning: 'Identified sequin, sitara, or sparkle embellishment indicators',
    };
  }
  if (/bead|beads|pearl|pearls|moti|موتی|dull moti|glass beads/i.test(combined)) {
    return {
      category: 'Pearls & Beads (Moti)',
      confidence: 'HIGH' as const,
      reasoning: 'Detected pearl, moti, or beads embroidery terminology',
    };
  }
  if (/cutdana|cut dana|pipe|کٹ دانہ|nali/i.test(combined)) {
    return {
      category: 'Cutdana & Glass Tubes',
      confidence: 'HIGH' as const,
      reasoning: 'Matches Cutdana (cut beads / glass tubes) zari craft category',
    };
  }
  if (/dori|cord|latkan|لٹکن|tassel|tassels|fancy latkan/i.test(combined)) {
    return {
      category: 'Dori & Fancy Latkan',
      confidence: 'HIGH' as const,
      reasoning: 'Matches cord, dori, or decorative latkan tassel keywords',
    };
  }
  if (/brocade|banarsi|jamawar|بنارسی|fabric|tissue/i.test(combined)) {
    return {
      category: 'Brocade & Banarsi Fabrics',
      confidence: 'MEDIUM' as const,
      reasoning: 'Detected brocade, banarsi, or specialized zari fabric terms',
    };
  }
  if (/patch|motif|embroidered patch|گلا|apparel patch/i.test(combined)) {
    return {
      category: 'Embroidered Patches & Necklines',
      confidence: 'MEDIUM' as const,
      reasoning: 'Identified patch, floral motif, or gala neckline embellishments',
    };
  }

  return {
    category: 'General Fancy Trims',
    confidence: 'LOW' as const,
    reasoning: 'Standard general fancy zari & tailoring accessory item',
  };
}

// AI Category Suggestions Endpoint
app.post('/api/ai/suggest-categories', async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Array of products is required' });
    }

    // Limit batch size to 50 items per request for fast processing
    const itemsToProcess = products.slice(0, 50);

    const ai = getGemini();

    if (!ai) {
      // Graceful heuristic fallback if API key is not configured
      const suggestions = itemsToProcess.map((item) => {
        const fallback = fallbackCategoryClassifier(item);
        return {
          productId: item.id,
          suggestedCategory: fallback.category,
          confidence: fallback.confidence,
          reasoning: fallback.reasoning,
        };
      });

      return res.json({
        source: 'heuristic_fallback',
        suggestions,
      });
    }

    const prompt = `You are an expert catalog taxonomist for "New Sajjad Zari Corporation", a premier Pakistani wholesale and retail store specializing in Zari, Laces, Gota, Tilla, Embroidery threads, Velvet ribbons, Sequins, Pearls, Cutdana, and Bridal Trims.

Analyze the following list of products and categorize each one into a clean, professional, standardized retail category.

Standard preferred categories include:
- "Gota & Gota Patti"
- "Tilla & Metallic Threads"
- "Laces & Borders"
- "Velvet & Satin Ribbons"
- "Sitara & Sequins"
- "Pearls & Beads (Moti)"
- "Cutdana & Glass Tubes"
- "Dori & Fancy Latkan"
- "Brocade & Banarsi Fabrics"
- "Embroidered Patches & Necklines"
- "Tailoring Accessories & Tools"
(You may also suggest another precise category if none of these fit).

Product Items to Categorize:
${JSON.stringify(
  itemsToProcess.map((p) => ({
    id: p.id,
    name: p.name,
    urduName: p.urduName || '',
    description: p.description || '',
    sku: p.sku,
    currentCategory: p.category || 'Uncategorized',
    unit: p.unit || 'Yards',
  })),
  null,
  2
)}

Return a JSON array where each element contains:
- productId (string): matching input product id
- suggestedCategory (string): the recommended standard category
- confidence (string): "HIGH", "MEDIUM", or "LOW"
- reasoning (string): brief 1-sentence justification in English explaining why this category fits.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              productId: { type: Type.STRING },
              suggestedCategory: { type: Type.STRING },
              confidence: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
              reasoning: { type: Type.STRING },
            },
            required: ['productId', 'suggestedCategory', 'confidence', 'reasoning'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]');

    return res.json({
      source: 'gemini_ai',
      suggestions: parsed,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/suggest-categories:', error);

    // Fallback on error so the client never breaks
    const items = Array.isArray(req.body.products) ? req.body.products.slice(0, 50) : [];
    const suggestions = items.map((item: any) => {
      const fallback = fallbackCategoryClassifier(item);
      return {
        productId: item.id,
        suggestedCategory: fallback.category,
        confidence: fallback.confidence,
        reasoning: fallback.reasoning,
      };
    });

    return res.json({
      source: 'heuristic_fallback_error_recovery',
      suggestions,
    });
  }
});

// Start Server with Vite Middleware in Development and Static Serving in Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
