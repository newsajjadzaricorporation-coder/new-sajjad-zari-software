import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Gemini API Client with required User-Agent
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
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

// Resilient Gemini generateContent helper with automatic multi-model fallback and backoff
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: string;
    config: any;
  }
): Promise<{ text: string; modelUsed: string } | null> {
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      const isOverloadedOrUnavailable =
        errorMsg.includes('503') ||
        errorMsg.includes('UNAVAILABLE') ||
        errorMsg.includes('high demand') ||
        errorMsg.includes('overloaded') ||
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED');

      if (isOverloadedOrUnavailable) {
        console.warn(`[Gemini API] Model ${model} is experiencing high demand (${errorMsg.slice(0, 120)}...). Trying fallback...`);
        // Short pause before attempting fallback model
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      } else {
        console.warn(`[Gemini API] Model ${model} call failed:`, errorMsg.slice(0, 150));
      }
    }
  }

  return null;
}

// AI Category Suggestions Endpoint
app.post('/api/ai/suggest-categories', async (req, res) => {
  const itemsToProcess = Array.isArray(req.body?.products) ? req.body.products.slice(0, 50) : [];

  if (itemsToProcess.length === 0) {
    return res.status(400).json({ error: 'Array of products is required' });
  }

  try {
    const ai = getGemini();

    if (ai) {
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

      const aiResult = await callGeminiWithFallback(ai, {
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

      if (aiResult && aiResult.text) {
        try {
          const parsed = JSON.parse(aiResult.text.trim() || '[]');
          if (Array.isArray(parsed) && parsed.length > 0) {
            return res.json({
              source: 'gemini_ai',
              model: aiResult.modelUsed,
              suggestions: parsed,
            });
          }
        } catch {
          // JSON parse issue, fall through to heuristic
        }
      }
    }

    // High-precision heuristic fallback if Gemini is experiencing high demand or unconfigured
    const suggestions = itemsToProcess.map((item: any) => {
      const fallback = fallbackCategoryClassifier(item);
      return {
        productId: item.id,
        suggestedCategory: fallback.category,
        confidence: fallback.confidence,
        reasoning: fallback.reasoning,
      };
    });

    return res.json({
      source: 'domain_taxonomy_engine',
      suggestions,
    });
  } catch (error: any) {
    // Graceful error recovery: return domain taxonomy suggestions seamlessly
    const suggestions = itemsToProcess.map((item: any) => {
      const fallback = fallbackCategoryClassifier(item);
      return {
        productId: item.id,
        suggestedCategory: fallback.category,
        confidence: fallback.confidence,
        reasoning: fallback.reasoning,
      };
    });

    return res.json({
      source: 'domain_taxonomy_engine',
      suggestions,
    });
  }
});

// Smart Stock Verification Endpoint with AI & Heuristic Fallback
app.post('/api/ai/smart-stock-verify', async (req, res) => {
  const products = Array.isArray(req.body?.products) ? req.body.products : [];
  if (products.length === 0) {
    return res.status(400).json({ error: 'Products array is required' });
  }

  const computeHeuristicAnomalies = () =>
    products
      .filter((p: any) => p.stock < 0 || p.stock <= (p.minStockAlert ?? 5))
      .map((p: any) => ({
        productId: p.id,
        productName: p.name,
        issueType: p.stock < 0 ? 'NEGATIVE_STOCK' : 'LOW_STOCK_RISK',
        severity: p.stock < 0 ? 'HIGH' : 'MEDIUM',
        recommendation: p.stock < 0 ? 'Immediate physical audit required to correct negative stock entry.' : 'Reorder stock soon to prevent stockout.',
      }));

  try {
    const ai = getGemini();
    if (ai) {
      const prompt = `You are an expert inventory auditor for "New Sajjad Zari Corporation". Analyze the following inventory stock data and detect potential anomalies, shrinkage, counting errors, or stockout risks.
Products Data:
${JSON.stringify(products.slice(0, 60).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, minStockAlert: p.minStockAlert, costPrice: p.costPrice, sellingPrice: p.sellingPrice })), null, 2)}

Return a JSON array of anomalies detected (items with negative stock, suspicious zero counts, or high risk of inventory discrepancy). Each element must contain:
- productId (string)
- productName (string)
- issueType (string e.g. "NEGATIVE_STOCK", "POSSIBLE_SHRINKAGE", "LOW_STOCK_WARNING")
- severity (string enum: "HIGH", "MEDIUM", "LOW")
- recommendation (string: actionable advice)`;

      const aiResult = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                productId: { type: Type.STRING },
                productName: { type: Type.STRING },
                issueType: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
                recommendation: { type: Type.STRING },
              },
              required: ['productId', 'productName', 'issueType', 'severity', 'recommendation'],
            },
          },
        },
      });

      if (aiResult && aiResult.text) {
        try {
          const parsed = JSON.parse(aiResult.text.trim() || '[]');
          if (Array.isArray(parsed)) {
            return res.json({
              source: 'gemini_ai',
              model: aiResult.modelUsed,
              anomalies: parsed,
            });
          }
        } catch {
          // Fall through to heuristic
        }
      }
    }

    return res.json({
      source: 'heuristic_engine',
      anomalies: computeHeuristicAnomalies(),
    });
  } catch {
    return res.json({
      source: 'heuristic_engine',
      anomalies: computeHeuristicAnomalies(),
    });
  }
});

// Download Windows Desktop .exe and ZIP package
app.get('/api/download/exe', (req, res) => {
  const exePath = path.join(process.cwd(), 'public', 'SajjadZariPOS.exe');
  res.download(exePath, 'SajjadZariPOS.exe', (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'Desktop executable not found' });
    }
  });
});

app.get('/api/download/zip', (req, res) => {
  const zipPath = path.join(process.cwd(), 'public', 'SajjadZariPOS-Windows.zip');
  res.download(zipPath, 'SajjadZariPOS-Windows.zip', (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'Desktop package not found' });
    }
  });
});

// Start Server with Vite Middleware in Development and Static Serving in Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} already in use, exiting cleanly for supervisor reboot...`);
      process.exit(0);
    } else {
      console.error('[Server] Unhandled server error:', err);
    }
  });
}

startServer();
