import { GoogleGenAI, Type } from '@google/genai';
import type { ChatMessage, InventoryItem, Language } from '../src/types.ts';

export interface GeminiCashierDecision {
  replyText: string;
  matchedProductId: string;
  isOrderConfirmed: boolean;
  requestedSize?: string;
  deliveryAddress?: string;
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

  const systemInstruction = `You are SavdoPilot AI, an expert retail sales cashier for "${params.shopName}" (${params.shopBranch}) in Uzbekistan.
Rules:
1. Language: Match the customer's message language naturally (Uzbek Latin by default, or English/Russian if they write in English/Russian). Default fallback language: ${params.preferredLang === 'en' ? 'English' : 'Uzbek (Latin script)'}.
2. Truthful Live Stock: Rely ONLY on the LIVE WAREHOUSE INVENTORY JSON provided below. Never invent products, prices, or stock quantities.
3. Pricing & Delivery: Quote exact sellPriceUZS (formatted cleanly like "380,000 so'm"). Tashkent delivery is 25,000 so'm (free for orders >= 500,000 so'm).
4. Dead-stock / Discount: If a product has discountApplied=true, highlight the markdown price. If isDeadStockPromoCandidate=true and customer asks about discounts, offer a -15% bundle/today-only promo.
5. Order Confirmation: Set "isOrderConfirmed": true ONLY when the customer clearly says they want to buy/order right now (e.g. confirms purchase, gives a delivery address, says "ha, yuboring", "buyurtma beraman", "yes, send it"). Never confirm an order if stock <= 0!
6. Matched Product: Pick the most relevant product "id" from LIVE WAREHOUSE INVENTORY (fallback to "${params.contextProductId}" if ambiguous).
7. Keep "replyText" concise, friendly, and conversion-focused (2-4 sentences).`;

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

    return {
      replyText:
        typeof parsed.replyText === 'string' && parsed.replyText.trim()
          ? parsed.replyText.trim()
          : 'Assalomu alaykum! Savolingizni aniqlashtirib yozsangiz, ombordan darhol tekshirib beraman.',
      matchedProductId: validProduct.id,
      isOrderConfirmed: Boolean(parsed.isOrderConfirmed && validProduct.stock > 0),
      requestedSize: parsed.requestedSize?.trim() || undefined,
      deliveryAddress: parsed.deliveryAddress?.trim() || undefined,
    };
  } catch (err: unknown) {
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
    throw new AiServiceError(`AI Cashier error: ${msg}`, 502, 'AI_UPSTREAM_ERROR');
  }
}
