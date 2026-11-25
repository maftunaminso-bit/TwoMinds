import type {
  AdminAuthStatus,
  AuthSession,
  ChatMessage,
  InventoryItem,
  Language,
  PlanTier,
  ProductCategory,
  ShopOrder,
  ShopStatus,
  ShopWorkspace,
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
    payload: { text: string; lang: Language; sendToPlatform?: boolean },
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

  applyDiscount(
    shopId: string,
    itemId: string,
    newPrice: number,
    token: string
  ): Promise<{
    shop: ShopWorkspace;
    broadcast: { sent: boolean; channel?: string; reason?: string };
  }> {
    return apiFetch(
      `/api/shops/${encodeURIComponent(shopId)}/inventory/${encodeURIComponent(itemId)}/discount`,
      {
        method: 'POST',
        body: JSON.stringify({ newPrice }),
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
