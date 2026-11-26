import type {
  AdminAuthStatus,
  AuthSession,
  ChatMessage,
  DeadStockMarketingPlan,
  EcosystemIntegrations,
  ForecastAnalysisResult,
  InventoryItem,
  Language,
  OwnerDirectorAnswer,
  PlanTier,
  ProductCategory,
  ShopOrder,
  ShopStatus,
  ShopWorkspace,
  SmartParsedProduct,
} from '../types';

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(
      data?.error || `Request failed (${res.status})`,
      res.status,
      data?.code
    );
  }

  return data as T;
}

export interface PublicShopSummary {
  id: string;
  name: string;
  branch: string;
  ownerName: string;
  ownerEmail: string;
  plan: PlanTier;
  status: ShopStatus;
  todaySales: number;
  aiResolvedCount: number;
}

export const api = {
  getPublicShops(): Promise<{ shops: PublicShopSummary[] }> {
    return apiFetch('/api/public/shops');
  },

  askPublicAssistant(payload: {
    question: string;
    lang: Language;
  }): Promise<{
    replyText: string;
    includeContact: boolean;
    suggestedRoute?: 'inventory' | 'sales-bot' | 'login';
  }> {
    return apiFetch('/api/public/assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAdminAuthStatus(): Promise<AdminAuthStatus> {
    return apiFetch('/api/auth/admin-status');
  },

  claimAdminPassword(
    password: string
  ): Promise<{ session: AuthSession; shops: ShopWorkspace[] }> {
    return apiFetch('/api/auth/admin-claim', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  login(
    email: string,
    password: string
  ): Promise<{ session: AuthSession; shop?: ShopWorkspace; shops?: ShopWorkspace[] }> {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  loginDemoShop(
    shopId = 'shop-modahub'
  ): Promise<{ session: AuthSession; shop: ShopWorkspace }> {
    return apiFetch('/api/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ shopId }),
    });
  },

  getShop(shopId: string, token: string): Promise<{ shop: ShopWorkspace }> {
    return apiFetch(`/api/shops/${encodeURIComponent(shopId)}`, {}, token);
  },

  sendBotMessage(
    shopId: string,
    convId: string,
    payload: {
      text: string;
      lang: Language;
      sendToPlatform?: boolean;
      isVoice?: boolean;
      voiceDuration?: string;
    },
    token: string
  ): Promise<{ shop: ShopWorkspace; aiMessage: ChatMessage; order?: ShopOrder }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/conversations/${encodeURIComponent(convId)}/reply`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  sendBotVoice(
    shopId: string,
    convId: string,
    payload: {
      audioBase64: string;
      mimeType: string;
      duration: string;
      lang: Language;
      sendToPlatform?: boolean;
    },
    token: string
  ): Promise<{ transcript: string; shop: ShopWorkspace; aiMessage: ChatMessage; order?: ShopOrder }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/conversations/${encodeURIComponent(convId)}/voice`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  askOwnerDirector(
    shopId: string,
    payload: { question: string; lang: Language },
    token: string
  ): Promise<{ answer: OwnerDirectorAnswer }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/owner-assistant`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  addProduct(
    shopId: string,
    payload: {
      nameUz: string;
      nameEn: string;
      sku: string;
      category: ProductCategory;
      sizes: string;
      stock: number;
      costPrice: number;
      sellPrice: number;
    },
    token: string
  ): Promise<{ item: InventoryItem; shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/inventory`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  smartParseInventory(
    shopId: string,
    payload: {
      fileName: string;
      mimeType: string;
      fileBase64?: string;
      textContent?: string;
    },
    token: string
  ): Promise<{ items: SmartParsedProduct[] }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/inventory/smart-parse`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  smartImportProducts(
    shopId: string,
    items: Array<
      Omit<InventoryItem, 'id' | 'daysIdle' | 'dailyVelocity' | 'recommendedRestock' | 'keywords'>
    > | undefined,
    token: string
  ): Promise<{ addedItems: InventoryItem[]; shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/inventory/import`,
      {
        method: 'POST',
        body: JSON.stringify({ items }),
      },
      token
    );
  },

  restockInventory(
    shopId: string,
    items: Array<{ itemId: string; addQty: number }>,
    token: string
  ): Promise<{ totalUnitsAdded: number; shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/inventory/restock`,
      {
        method: 'POST',
        body: JSON.stringify({ items }),
      },
      token
    );
  },

  analyzeForecast(
    shopId: string,
    payload: { timeframe: 7 | 14 | 30; categoryFilter: 'All' | ProductCategory },
    token: string
  ): Promise<{ forecast: ForecastAnalysisResult }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/forecast/analyze`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  generateAiMarketing(
    shopId: string,
    itemId: string,
    token: string
  ): Promise<{ plan: DeadStockMarketingPlan }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/inventory/${encodeURIComponent(itemId)}/ai-marketing`,
      { method: 'POST' },
      token
    );
  },

  applyDiscount(
    shopId: string,
    itemId: string,
    newPrice: number,
    token: string,
    promoText?: string
  ): Promise<{
    shop: ShopWorkspace;
    broadcast: { sent: boolean; channel?: string; reason?: string };
  }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/inventory/${encodeURIComponent(itemId)}/discount`,
      {
        method: 'POST',
        body: JSON.stringify({ newPrice, promoText }),
      },
      token
    );
  },

  markOrderPaid(
    shopId: string,
    orderId: string,
    token: string
  ): Promise<{ order: ShopOrder; shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/orders/${encodeURIComponent(orderId)}/mark-paid`,
      { method: 'POST' },
      token
    );
  },

  dispatchOrder(
    shopId: string,
    orderId: string,
    token: string
  ): Promise<{
    dispatch: { mode: string; claimId: string; note: string };
    order: ShopOrder;
    shop: ShopWorkspace;
  }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/orders/${encodeURIComponent(orderId)}/dispatch`,
      { method: 'POST' },
      token
    );
  },

  deliverOrder(
    shopId: string,
    orderId: string,
    token: string
  ): Promise<{ order: ShopOrder; shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/orders/${encodeURIComponent(orderId)}/deliver`,
      { method: 'POST' },
      token
    );
  },

  saveMerchantConfig(
    shopId: string,
    payload: {
      click?: { serviceId: string; merchantId: string; secretKey?: string };
      payme?: { merchantId: string; secretKey?: string };
      yandex?: { pickupAddress: string; senderPhone: string; apiToken?: string };
      erp?: { provider: 'BILLZ' | 'MoySklad' | '1C' | 'Webhook'; webhookUrl: string };
    },
    token: string
  ): Promise<{ shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/merchant-config`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  syncErpWebhook(
    shopId: string,
    token: string
  ): Promise<{ sync: { syncedAt: string; status: string }; shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/erp/sync`,
      { method: 'POST' },
      token
    );
  },

  updateEcosystem(
    shopId: string,
    payload: Partial<EcosystemIntegrations>,
    token: string
  ): Promise<{ shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/ecosystem`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  connectTelegram(
    shopId: string,
    payload: { botToken: string; mode: 'webhook' | 'polling'; channelUsername?: string },
    token: string
  ): Promise<{ shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/channels/telegram`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  disconnectTelegram(shopId: string, token: string): Promise<{ shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/channels/telegram`,
      { method: 'DELETE' },
      token
    );
  },

  connectInstagram(
    shopId: string,
    payload: {
      pageId: string;
      igAccountId: string;
      igUsername?: string;
      accessToken: string;
      verifyToken?: string;
    },
    token: string
  ): Promise<{ shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/channels/instagram`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  disconnectInstagram(shopId: string, token: string): Promise<{ shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/channels/instagram`,
      { method: 'DELETE' },
      token
    );
  },

  testInstagramWebhook(
    shopId: string,
    payload: { username?: string; text: string },
    token: string
  ): Promise<{ processedCount: number; lastReply?: string; shop: ShopWorkspace }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/channels/instagram/test-webhook`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  getAdminShops(token: string): Promise<{ shops: ShopWorkspace[] }> {
    return apiFetch('/api/admin/shops', {}, token);
  },

  createAdminShop(
    payload: {
      name: string;
      branch: string;
      ownerName: string;
      ownerEmail: string;
      ownerPassword: string;
      plan: PlanTier;
      instagram: boolean;
      telegram: boolean;
    },
    token: string
  ): Promise<{ shop: ShopWorkspace }> {
    return apiFetch(
      '/api/admin/shops',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  updateAdminShop(
    shopId: string,
    payload: { status?: ShopStatus; plan?: PlanTier },
    token: string
  ): Promise<{ shop: ShopWorkspace }> {
    return apiFetch(
      `/api/admin/shops/${encodeURIComponent(shopId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      token
    );
  },
};
