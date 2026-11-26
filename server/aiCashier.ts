import { GoogleGenAI, Type } from '@google/genai';
import type {
  ChatMessage,
  DeadStockMarketingPlan,
  ForecastAnalysisResult,
  InventoryItem,
  Language,
  OwnerDirectorAnswer,
  ProductCategory,
  ShopOrder,
  SmartParsedProduct,
} from '../src/types.ts';

export interface GeminiCashierDecision {
  replyText: string;
  matchedProductId: string;
  isOrderConfirmed: boolean;
  requestedSize?: string;
  deliveryAddress?: string;
  paymentProvider?: 'Click' | 'Payme';
}

export class AiServiceError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'AI_UPSTREAM_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new AiServiceError(
      'GEMINI_API_KEY is not configured in Settings > Secrets.',
      503,
      'MISSING_GEMINI_API_KEY'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable =
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('UNAVAILABLE');
      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt - 1)));
    }
  }
  throw lastError;
}

function mapGeminiError(err: unknown, contextLabel: string): never {
  if (err instanceof AiServiceError) throw err;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
    throw new AiServiceError(
      'Gemini API permission denied. Please verify GEMINI_API_KEY in Settings > Secrets.',
      403,
      'PERMISSION_DENIED'
    );
  }
  if (msg.includes('API_KEY_INVALID') || msg.includes('400')) {
    throw new AiServiceError(
      'Gemini API key invalid. Please check GEMINI_API_KEY in Settings > Secrets.',
      400,
      'API_KEY_INVALID'
    );
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    throw new AiServiceError(
      'Gemini API rate limit exceeded. Please try again in a moment.',
      429,
      'RESOURCE_EXHAUSTED'
    );
  }
  throw new AiServiceError(`${contextLabel}: ${msg}`, 502, 'AI_UPSTREAM_ERROR');
}

export async function transcribeVoiceAudio(params: {
  audioBase64: string;
  mimeType: string;
  preferredLang?: Language;
}): Promise<string> {
  const ai = getGeminiClient();
  const cleanMime = (params.mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';
  const promptText =
    params.preferredLang === 'en'
      ? 'Transcribe this retail customer voice message accurately. It may be in Uzbek (Latin script), Russian, or English, including local retail slang. Return only the clean transcription text.'
      : "Ushbu mijoz ovozli xabarini aniq matnga o'giring. Xabar o'zbek (lotin alifbosida, shevada ham bo'lishi mumkin), rus yoki ingliz tilida bo'lishi mumkin. Faqat sof matnni qaytaring.";

  const audioPart = {
    inlineData: {
      mimeType: cleanMime,
      data: params.audioBase64,
    },
  };

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: { parts: [audioPart, { text: promptText }] },
      })
    );
    const text = (response.text ?? '').trim();
    if (!text) {
      throw new AiServiceError('Empty audio transcription received.', 502, 'EMPTY_AI_RESPONSE');
    }
    return text;
  } catch (err: unknown) {
    // Fallback to gemini-4-hydrogen multimodal audio if transcribe endpoint rejects container codec (e.g. audio/mp4)
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('400') || msg.includes('404') || msg.includes('UNSUPPORTED')) {
      try {
        const retryRes = await withRetry(() =>
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: { parts: [audioPart, { text: promptText }] },
          })
        );
        const text = (retryRes.text ?? '').trim();
        if (!text) {
          throw new AiServiceError('Could not understand audio recording.', 422, 'EMPTY_TRANSCRIPT');
        }
        return text;
      } catch (innerErr: unknown) {
        mapGeminiError(innerErr, 'Voice transcription error');
      }
    }
    mapGeminiError(err, 'Voice transcription error');
  }
}

export async function generateGeminiCashierReply(params: {
  shopName: string;
  shopBranch: string;
  customerMessage: string;
  inventory: InventoryItem[];
  recentMessages: ChatMessage[];
  contextProductId: string;
  preferredLang: Language;
}): Promise<GeminiCashierDecision> {
  const ai = getGeminiClient();

  const inventorySummary = params.inventory.map((item) => ({
    id: item.id,
    sku: item.sku,
    nameUz: item.nameUz,
    nameEn: item.nameEn,
    category: item.category,
    sizes: item.sizes,
    stock: item.stock,
    sellPriceUZS: item.sellPrice,
    originalPriceUZS: item.originalSellPrice ?? null,
    discountApplied: Boolean(item.discountApplied),
    isDeadStockPromoCandidate: item.daysIdle >= 30,
  }));

  const historyLines = params.recentMessages
    .slice(-8)
    .map((m) => `${m.sender === 'customer' ? 'Customer' : 'SavdoPilot AI'}: ${m.text}`)
    .join('\n');

  const systemInstruction = `You are SavdoPilot AI, an expert retail sales director & cashier for "${params.shopName}" (${params.shopBranch}) in Uzbekistan.
Rules:
1. Language & Dialect: Understand natural Uzbek dialect (sheva), Latin-Cyrillic mixed words ("brat", "nechi", "krasovka", "nalichida bormi", "dastavka", "golos"), as well as Russian or English. Reply warmly and politely in the customer's language (default fallback: ${params.preferredLang === 'en' ? 'English' : 'Uzbek (Latin script)'}).
2. Truthful Live Stock: Rely ONLY on the LIVE WAREHOUSE INVENTORY JSON provided below. Never invent products, prices, or stock quantities.
3. Pricing, Click/Payme & Yandex Delivery: Quote exact sellPriceUZS (formatted cleanly like "380,000 so'm"). Tashkent Yandex Delivery is 22,000 so'm (free for orders >= 500,000 so'm). Both Click and Payme in-chat payments are supported! If a user asks "Payme bilan to'lasam bo'ladimi?" or mentions Click/Payme, confirm it is supported right inside the chat and quote the total including delivery.
4. Dead-stock / Discount: If a product has discountApplied=true, highlight the markdown price. If isDeadStockPromoCandidate=true and customer asks about discounts, offer a -15% bundle/today-only promo.
5. Order Confirmation: Set "isOrderConfirmed": true ONLY when the customer clearly says they want to buy/order right now (e.g. "ha, buyurtma beraman", "ha, yuboring", "rasmiylashtiring", "yes, order it"). Never confirm an order if stock <= 0!
6. Matched Product & Payment Provider: Pick the most relevant product "id" from LIVE WAREHOUSE INVENTORY (fallback to "${params.contextProductId}" if ambiguous). Set "paymentProvider" to "Payme" if Payme was discussed in the message/recent chat, else "Click".
7. Keep "replyText" concise, helpful, and conversion-focused (2-4 sentences).`;

  const userPrompt = `LIVE WAREHOUSE INVENTORY:
${JSON.stringify(inventorySummary, null, 2)}

RECENT CONVERSATION HISTORY:
${historyLines || '(New conversation)'}

CURRENT CONTEXT PRODUCT ID: ${params.contextProductId}

NEW CUSTOMER MESSAGE:
${params.customerMessage}`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replyText: {
                type: Type.STRING,
                description: 'Natural, helpful sales cashier reply to send directly to the customer.',
              },
              matchedProductId: {
                type: Type.STRING,
                description: 'The matching product ID from LIVE WAREHOUSE INVENTORY.',
              },
              isOrderConfirmed: {
                type: Type.BOOLEAN,
                description: 'True only if the customer clearly confirmed an order and stock > 0.',
              },
              requestedSize: {
                type: Type.STRING,
                description: 'Requested product size if mentioned (e.g. L, 42, M), or empty string.',
              },
              deliveryAddress: {
                type: Type.STRING,
                description: 'Delivery address if mentioned by customer, or empty string.',
              },
              paymentProvider: {
                type: Type.STRING,
                description: 'Either "Click" or "Payme" depending on conversation.',
              },
            },
            required: ['replyText', 'matchedProductId', 'isOrderConfirmed'],
          },
        },
      })
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new AiServiceError('Empty response received from Gemini model.', 502, 'EMPTY_AI_RESPONSE');
    }

    const parsed = JSON.parse(rawText) as Partial<GeminiCashierDecision>;
    const validProduct =
      params.inventory.find((i) => i.id === parsed.matchedProductId) ||
      params.inventory.find((i) => i.id === params.contextProductId) ||
      params.inventory[0];

    const provider: 'Click' | 'Payme' =
      parsed.paymentProvider === 'Payme' ||
      params.customerMessage.toLowerCase().includes('payme') ||
      historyLines.toLowerCase().includes('payme')
        ? 'Payme'
        : 'Click';

    return {
      replyText:
        typeof parsed.replyText === 'string' && parsed.replyText.trim()
          ? parsed.replyText.trim()
          : 'Assalomu alaykum! Savolingizni aniqlashtirib yozsangiz, ombordan darhol tekshirib beraman.',
      matchedProductId: validProduct.id,
      isOrderConfirmed: Boolean(parsed.isOrderConfirmed && validProduct.stock > 0),
      requestedSize: parsed.requestedSize?.trim() || undefined,
      deliveryAddress: parsed.deliveryAddress?.trim() || undefined,
      paymentProvider: provider,
    };
  } catch (err: unknown) {
    mapGeminiError(err, 'AI Cashier error');
  }
}

export async function answerOwnerDirectorQuestion(params: {
  shopName: string;
  branch: string;
  todaySales: number;
  aiResolvedCount: number;
  inventory: InventoryItem[];
  orders: ShopOrder[];
  question: string;
  preferredLang: Language;
}): Promise<OwnerDirectorAnswer> {
  const ai = getGeminiClient();

  const totalStockUnits = params.inventory.reduce((s, i) => s + i.stock, 0);
  const lowStock = params.inventory.filter((i) => i.stock <= 5 && i.daysIdle < 30);
  const deadStock = params.inventory.filter((i) => i.daysIdle >= 30);
  const avgMarginPct =
    params.inventory.length > 0
      ? Math.round(
          (params.inventory.reduce(
            (s, i) => s + (i.sellPrice - i.costPrice) / Math.max(1, i.sellPrice),
            0
          ) /
            params.inventory.length) *
            100
        )
      : 36;

  const systemInstruction = `You are the private Telegram AI Business Director for the owner of "${params.shopName}" (${params.branch}).
Analyze ONLY the live store metrics, inventory, and orders provided below. Never invent numbers.
Respond in ${params.preferredLang === 'en' ? 'English' : 'Uzbek (Latin script)'}.
Keep "headline" short (max 10 words), "detail" concise and actionable (2-3 sentences quoting real product names/UZS numbers), and provide one highlighted KPI in "metricLabel" and "metricValue".`;

  const userPrompt = `LIVE STORE METRICS:
- todaySalesUZS: ${params.todaySales}
- estimatedAvgMarginPct: ${avgMarginPct}%
- estimatedNetProfitTodayUZS: ${Math.round((params.todaySales * avgMarginPct) / 100)}
- aiResolvedChats: ${params.aiResolvedCount}
- totalWarehouseUnits: ${totalStockUnits}
- lowStockCount: ${lowStock.length}
- deadStockCount: ${deadStock.length}

INVENTORY SKUS:
${JSON.stringify(
    params.inventory.map((i) => ({
      sku: i.sku,
      nameUz: i.nameUz,
      nameEn: i.nameEn,
      category: i.category,
      stock: i.stock,
      costPrice: i.costPrice,
      sellPrice: i.sellPrice,
      daysIdle: i.daysIdle,
      dailyVelocity: i.dailyVelocity,
    }))
  )}

RECENT CONFIRMED ORDERS (${params.orders.length}):
${JSON.stringify(params.orders.slice(0, 15))}

OWNER QUESTION:
${params.question}`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              detail: { type: Type.STRING },
              metricLabel: { type: Type.STRING },
              metricValue: { type: Type.STRING },
            },
            required: ['headline', 'detail', 'metricLabel', 'metricValue'],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<OwnerDirectorAnswer>;
    if (!parsed.headline || !parsed.detail) {
      throw new AiServiceError('Empty answer from AI Director.', 502, 'EMPTY_AI_RESPONSE');
    }
    return {
      headline: parsed.headline,
      detail: parsed.detail,
      metricLabel: parsed.metricLabel || (params.preferredLang === 'en' ? 'Key Metric' : "Ko'rsatkich"),
      metricValue: parsed.metricValue || `${avgMarginPct}%`,
    };
  } catch (err: unknown) {
    mapGeminiError(err, 'Owner AI Director error');
  }
}

export async function parseInventoryUploadWithGemini(params: {
  fileName: string;
  mimeType: string;
  imageBase64?: string;
  spreadsheetText?: string;
}): Promise<SmartParsedProduct[]> {
  const ai = getGeminiClient();

  const instruction = `Extract retail products from the uploaded file (${params.fileName}) into structured JSON.
Rules:
1. Extract every real product row you see (do NOT invent random products if unreadable — return empty array if nothing is readable).
2. Map category strictly to one of: "Ustki kiyim", "Oyoq kiyim", "Aksessuarlar".
3. Provide clean "nameUz" and English "nameEn" (translate if only one language is shown).
4. If SKU is missing, generate a clean code like "SP-01", "SP-02".
5. If costPrice is missing, estimate ~62% of sellPrice. All prices must be integers in UZS (e.g. 380000). If prices look like thousands shorthand (e.g. "380" or "380k"), convert to UZS (380000).
6. If stock is missing, default to 10. If sizes is missing, default to "Standart".`;

  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [];

  if (params.imageBase64 && params.mimeType.startsWith('image/')) {
    parts.push({
      inlineData: {
        mimeType: params.mimeType,
        data: params.imageBase64,
      },
    });
    parts.push({
      text: `${instruction}\nRead all rows/items from this handwritten notebook, invoice, or catalog image.`,
    });
  } else if (params.spreadsheetText) {
    parts.push({
      text: `${instruction}\n\nEXTRACTED SPREADSHEET / CSV DATA:\n${params.spreadsheetText.slice(0, 28000)}`,
    });
  } else {
    throw new AiServiceError('No image or spreadsheet content provided.', 400, 'BAD_INPUT');
  }

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sku: { type: Type.STRING },
                nameUz: { type: Type.STRING },
                nameEn: { type: Type.STRING },
                category: { type: Type.STRING },
                sizes: { type: Type.STRING },
                stock: { type: Type.INTEGER },
                costPrice: { type: Type.INTEGER },
                sellPrice: { type: Type.INTEGER },
              },
              required: ['sku', 'nameUz', 'nameEn', 'category', 'sizes', 'stock', 'costPrice', 'sellPrice'],
            },
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '[]').trim()) as Array<Partial<SmartParsedProduct>>;
    const validCategories: ProductCategory[] = ['Ustki kiyim', 'Oyoq kiyim', 'Aksessuarlar'];

    return parsed
      .filter((p) => typeof p.nameUz === 'string' && p.nameUz.trim().length > 0)
      .map((p, idx) => {
        const sellPrice = Math.max(10000, Math.round(Number(p.sellPrice) || 250000));
        const rawCost = Math.round(Number(p.costPrice) || Math.round(sellPrice * 0.62));
        const costPrice = Math.min(sellPrice - 5000, Math.max(5000, rawCost));
        return {
          sku: (p.sku || `SP-IMP-${idx + 1}`).trim().toUpperCase(),
          nameUz: (p.nameUz || '').trim(),
          nameEn: (p.nameEn || p.nameUz || '').trim(),
          category: validCategories.includes(p.category as ProductCategory)
            ? (p.category as ProductCategory)
            : 'Ustki kiyim',
          sizes: (p.sizes || 'Standart').trim(),
          stock: Math.max(0, Math.floor(Number(p.stock) || 10)),
          costPrice,
          sellPrice,
        };
      });
  } catch (err: unknown) {
    mapGeminiError(err, 'Smart inventory parsing error');
  }
}

export async function generateDeadStockMarketingPlan(params: {
  shopName: string;
  item: InventoryItem;
}): Promise<DeadStockMarketingPlan> {
  const ai = getGeminiClient();

  const prompt = `You are a retail pricing strategist & Uzbek social commerce copywriter for "${params.shopName}".
Analyze this product and generate an optimal markdown strategy + ready-to-post Telegram/Instagram copy:
- Product (UZ): ${params.item.nameUz}
- Product (EN): ${params.item.nameEn}
- SKU: ${params.item.sku}
- Sizes: ${params.item.sizes}
- Current Stock: ${params.item.stock} pcs
- Cost Price: ${params.item.costPrice} UZS
- Current Sell Price: ${params.item.sellPrice} UZS
- Days Idle (unsold): ${params.item.daysIdle} days

Rules:
1. "recommendedSellPrice" MUST be a clean multiple of 5,000 UZS, strictly greater than costPrice + 15,000 UZS, and between 10% and 28% below current sellPrice (if daysIdle >= 30) or 8-12% below (if active).
2. "expectedMultiplier": short string like "3.2x" or "2.4x".
3. "promoPostUz" and "promoPostEn": high-converting Telegram/Instagram promo copy with emojis, old vs new price in UZS, remaining stock urgency, and Click/Payme + Yandex Delivery CTA.`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedSellPrice: { type: Type.INTEGER },
              expectedMultiplier: { type: Type.STRING },
              elasticityNoteUz: { type: Type.STRING },
              elasticityNoteEn: { type: Type.STRING },
              promoPostUz: { type: Type.STRING },
              promoPostEn: { type: Type.STRING },
            },
            required: [
              'recommendedSellPrice',
              'expectedMultiplier',
              'elasticityNoteUz',
              'elasticityNoteEn',
              'promoPostUz',
              'promoPostEn',
            ],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<DeadStockMarketingPlan>;
    const minSafe = params.item.costPrice + 15000;
    const rawRec = Math.round((Number(parsed.recommendedSellPrice) || params.item.sellPrice * 0.82) / 5000) * 5000;
    const recommendedSellPrice = Math.min(params.item.sellPrice - 5000, Math.max(minSafe, rawRec));

    return {
      recommendedSellPrice,
      expectedMultiplier: parsed.expectedMultiplier || '2.8x',
      elasticityNoteUz:
        parsed.elasticityNoteUz ||
        `Narx pasaytirilganda sotilish tezligi ${parsed.expectedMultiplier || '2.8x'} oshishi kutilmoqda.`,
      elasticityNoteEn:
        parsed.elasticityNoteEn ||
        `Sell-through velocity expected to rise ${parsed.expectedMultiplier || '2.8x'} with this markdown.`,
      promoPostUz:
        parsed.promoPostUz ||
        `🔥 AKSIYA! ${params.item.nameUz} (${params.item.sizes})\n✅ Bugungi narx: ${recommendedSellPrice.toLocaleString()} so'm\n📦 Atigi ${params.item.stock} dona qoldi! Click/Payme + Yandex yetkazish bor.`,
      promoPostEn:
        parsed.promoPostEn ||
        `🔥 SPECIAL OFFER! ${params.item.nameEn} (${params.item.sizes})\n✅ Today: ${recommendedSellPrice.toLocaleString()} UZS\n📦 Only ${params.item.stock} left! Pay via Click/Payme with fast Yandex Delivery.`,
    };
  } catch (err: unknown) {
    mapGeminiError(err, 'AI Marketing generator error');
  }
}

export async function generateDemandForecastWithGemini(params: {
  shopName: string;
  todaySales: number;
  timeframe: 7 | 14 | 30;
  categoryFilter: 'All' | ProductCategory;
  inventory: InventoryItem[];
  orders: ShopOrder[];
}): Promise<ForecastAnalysisResult> {
  const ai = getGeminiClient();

  const todayStr = new Date().toISOString().slice(0, 10);
  const scaleFactor = params.timeframe === 7 ? 0.55 : params.timeframe === 14 ? 1 : 1.95;

  const prompt = `You are a retail supply-chain & demand forecasting AI for "${params.shopName}" in Uzbekistan.
Current Date: ${todayStr}
Timeframe: Next ${params.timeframe} days
Category Filter: ${params.categoryFilter}
Today's Sales: ${params.todaySales} UZS
Recent Confirmed Orders Count: ${params.orders.length}

LIVE INVENTORY:
${JSON.stringify(
    params.inventory.map((i) => ({
      id: i.id,
      sku: i.sku,
      nameUz: i.nameUz,
      category: i.category,
      stock: i.stock,
      costPrice: i.costPrice,
      sellPrice: i.sellPrice,
      daysIdle: i.daysIdle,
      dailyVelocity: i.dailyVelocity,
    }))
  )}

Task:
1. Build 4 realistic forecast periods ("buckets") covering the next ${params.timeframe} days, tailored to Uzbekistan retail demand (monthly salary/payday cycles on 1-5 and 15-20, weather shifts, holiday demand).
2. Calculate "apparel", "footwear", "accessories" unit demand proportional to the actual inventory velocities scaled by ${scaleFactor}, and "seasonalIndex" (around 105-155).
3. Calculate "projectedRevenueUZS" for the next ${params.timeframe} days based on actual daily velocities & prices.
4. For every active item (daysIdle < 30 and matching category filter if not "All"), output "skuRecommendations" with "itemId", realistic "recommendedRestockQty", "daysUntilStockout", and short "reasonUz" / "reasonEn".
5. Write concise 2-sentence "strategicSummaryUz" and "strategicSummaryEn".`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              projectedRevenueUZS: { type: Type.INTEGER },
              strategicSummaryUz: { type: Type.STRING },
              strategicSummaryEn: { type: Type.STRING },
              buckets: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    periodUz: { type: Type.STRING },
                    periodEn: { type: Type.STRING },
                    apparel: { type: Type.INTEGER },
                    footwear: { type: Type.INTEGER },
                    accessories: { type: Type.INTEGER },
                    seasonalIndex: { type: Type.INTEGER },
                  },
                  required: ['periodUz', 'periodEn', 'apparel', 'footwear', 'accessories', 'seasonalIndex'],
                },
              },
              skuRecommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    itemId: { type: Type.STRING },
                    recommendedRestockQty: { type: Type.INTEGER },
                    daysUntilStockout: { type: Type.INTEGER },
                    reasonUz: { type: Type.STRING },
                    reasonEn: { type: Type.STRING },
                  },
                  required: ['itemId', 'recommendedRestockQty', 'daysUntilStockout', 'reasonUz', 'reasonEn'],
                },
              },
            },
            required: [
              'projectedRevenueUZS',
              'strategicSummaryUz',
              'strategicSummaryEn',
              'buckets',
              'skuRecommendations',
            ],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<ForecastAnalysisResult>;
    return {
      timeframe: params.timeframe,
      projectedRevenueUZS: Number(parsed.projectedRevenueUZS) || Math.round(params.todaySales * params.timeframe * 1.08),
      strategicSummaryUz:
        parsed.strategicSummaryUz ||
        "Yaqin oylik maosh kunlari (1–5 / 15–20) va mavsumiy talab o'sishi asosida kam qoldiqli tovarlarni tezkor to'ldirish tavsiya etiladi.",
      strategicSummaryEn:
        parsed.strategicSummaryEn ||
        'Prioritize restocking low-runway SKUs ahead of local payday cycles (1st–5th / 15th–20th) and seasonal demand shifts.',
      buckets: Array.isArray(parsed.buckets) ? parsed.buckets.slice(0, 6) : [],
      skuRecommendations: Array.isArray(parsed.skuRecommendations) ? parsed.skuRecommendations : [],
      generatedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    mapGeminiError(err, 'AI Demand Forecast error');
  }
}

export async function answerPublicAssistantQuestion(params: {
  question: string;
  preferredLang: Language;
}): Promise<{ replyText: string; includeContact: boolean; suggestedRoute?: 'inventory' | 'sales-bot' | 'login' }> {
  const ai = getGeminiClient();

  const systemInstruction = `You are SavdoPilot Assistant, the public product guide for SavdoPilot — an AI Omnichannel Sales Director, Smart Inventory, Dynamic Pricing, and Demand Forecasting SaaS for retail shops in Uzbekistan.
Facts:
- Pricing: Start (Bepul / Free, 1 channel, 50 SKU), Biznes (149,000 so'm/oy, IG + TG, 500 SKU, Dead-stock AI), Pro (349,000 so'm/oy, unlimited SKUs, multi-branch, 30-day forecast).
- Features: Understands Uzbek dialect & voice messages (Voice-to-Order), Click/Payme & Yandex Delivery in chat, Dead-stock Autopilot Marketing, 3-minute AI Excel/notebook photo import.
- Demo Policy: Only ModaHub Tashkent has a 1-click live demo. Other shop workspaces and Super Admin are password-protected.
- Contact for subscription/onboarding: Telegram @Nigmatullayeva_22, Phone +998 91 567 21 07, Email nigmatullayevamaftuna22@gmail.com.
- Reply concisely (2-4 sentences) in ${params.preferredLang === 'en' ? 'English' : 'Uzbek (Latin script)'}.`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: params.question,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replyText: { type: Type.STRING },
              includeContact: { type: Type.BOOLEAN },
              suggestedRoute: { type: Type.STRING },
            },
            required: ['replyText', 'includeContact'],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      replyText?: string;
      includeContact?: boolean;
      suggestedRoute?: string;
    };

    const route =
      parsed.suggestedRoute === 'inventory' ||
      parsed.suggestedRoute === 'sales-bot' ||
      parsed.suggestedRoute === 'login'
        ? parsed.suggestedRoute
        : undefined;

    return {
      replyText:
        parsed.replyText?.trim() ||
        "SavdoPilot Instagram va Telegram savdolarini 24/7 AI bilan boshqaradi. Batafsil ma'lumot uchun bog'laning.",
      includeContact: Boolean(parsed.includeContact),
      suggestedRoute: route,
    };
  } catch (err: unknown) {
    mapGeminiError(err, 'Public assistant error');
  }
}
