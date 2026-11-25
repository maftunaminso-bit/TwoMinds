export type Language = 'uz' | 'en';

export type ThemeMode = 'light' | 'dark';

export type AppView = 'landing' | 'login' | 'admin' | 'dashboard';

export type UserRole = 'admin' | 'shop_owner';

export type PlanTier = 'Start' | 'Biznes' | 'Pro';

export type ShopStatus = 'active' | 'paused';

export type DashboardTab = 'overview' | 'sales-bot' | 'inventory' | 'forecast' | 'channels';

export type ProductCategory = 'Ustki kiyim' | 'Oyoq kiyim' | 'Aksessuarlar';

export type Platform = 'instagram' | 'telegram';

export type ConversationStatus = 'ai_replied' | 'order_confirmed' | 'waiting';

export interface InventoryItem {
  id: string;
  sku: string;
  nameUz: string;
  nameEn: string;
  category: ProductCategory;
  sizes: string;
  highlightSize?: string;
  stock: number;
  costPrice: number;
  sellPrice: number;
  originalSellPrice?: number;
  daysIdle: number;
  dailyVelocity: number;
  recommendedRestock: number;
  discountApplied?: boolean;
  keywords: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'ai';
  text: string;
  timestamp: string;
  aiPowered?: boolean;
  orderCreated?: {
    orderId: string;
    productName: string;
    price: number;
    deliveryFee: number;
    remainingStock: number;
  };
}

export interface Conversation {
  id: string;
  customerName: string;
  handle: string;
  initials: string;
  platform: Platform;
  externalChatId?: string;
  status: ConversationStatus;
  lastActive: string;
  contextProductId: string;
  messages: ChatMessage[];
}

export interface ShopOrder {
  orderId: string;
  platform: Platform | 'web';
  customerName: string;
  handle: string;
  productId: string;
  productName: string;
  sku: string;
  price: number;
  deliveryFee: number;
  address?: string;
  createdAt: string;
  status: 'confirmed' | 'dispatched';
}

export interface ChannelIntegrationStatus {
  telegram: {
    connected: boolean;
    botUsername?: string;
    botName?: string;
    maskedToken?: string;
    mode: 'webhook' | 'polling';
    webhookActive?: boolean;
    webhookUrl?: string;
    channelUsername?: string;
    lastSyncAt?: string;
    lastError?: string;
  };
  instagram: {
    connected: boolean;
    pageId?: string;
    igAccountId?: string;
    igUsername?: string;
    maskedToken?: string;
    verifyToken?: string;
    webhookUrl?: string;
    lastSyncAt?: string;
    lastError?: string;
  };
}

export interface ShopWorkspace {
  id: string;
  name: string;
  branch: string;
  ownerName: string;
  ownerEmail: string;
  plan: PlanTier;
  status: ShopStatus;
  channels: {
    instagram: boolean;
    telegram: boolean;
  };
  channelIntegrations?: ChannelIntegrationStatus;
  orders?: ShopOrder[];
  todaySales: number;
  aiResolvedCount: number;
  inventory: InventoryItem[];
  conversations: Conversation[];
  createdAt: string;
}

export interface AuthSession {
  role: UserRole;
  name: string;
  email: string;
  shopId?: string;
  token?: string;
}

export interface AdminAuthStatus {
  configured: boolean;
  source: 'env' | 'claimed' | 'unclaimed';
}

export interface SalesForecastPoint {
  date: string;
  actual: number | null;
  forecast: number | null;
  isSpike?: boolean;
  noteUz?: string;
  noteEn?: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  description?: string;
  tone: 'success' | 'info' | 'warning';
}
