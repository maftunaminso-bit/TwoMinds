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
  isVoice?: boolean;
  voiceDuration?: string;
  voiceTranscript?: string;
  paymentCard?: {
    provider: 'Click' | 'Payme';
    amount: number;
    status: 'paid' | 'pending';
    paymentUrl?: string;
    orderId?: string;
  };
  deliveryPill?: {
    provider: string;
    etaMinutes: number;
    address?: string;
    status?: 'pending' | 'dispatched' | 'delivered';
    claimId?: string;
  };
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
  tags?: string[];
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
  paymentProvider?: 'Click' | 'Payme';
  paymentStatus?: 'pending' | 'paid';
  paymentUrl?: string;
  deliveryProvider?: string;
  deliveryClaimId?: string;
  address?: string;
  createdAt: string;
  status: 'confirmed' | 'dispatched' | 'delivered';
}

export interface EcosystemIntegrations {
  instagramConnected: boolean;
  instagramChatsToday: number;
  telegramConnected: boolean;
  telegramChatsToday: number;
  clickPaymeConnected: boolean;
  yandexDeliveryConnected: boolean;
  erpSyncConnected: boolean;
}

export interface MerchantEcosystemConfig {
  click: {
    configured: boolean;
    serviceId?: string;
    merchantId?: string;
    hasSecretKey?: boolean;
  };
  payme: {
    configured: boolean;
    merchantId?: string;
    hasSecretKey?: boolean;
  };
  yandex: {
    configured: boolean;
    pickupAddress?: string;
    senderPhone?: string;
    hasApiToken?: boolean;
  };
  erp: {
    configured: boolean;
    provider: 'BILLZ' | 'MoySklad' | '1C' | 'Webhook';
    webhookUrl?: string;
    lastSyncAt?: string;
    lastSyncStatus?: string;
  };
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

export interface OwnerDirectorAnswer {
  headline: string;
  detail: string;
  metricLabel: string;
  metricValue: string;
}

export interface DeadStockMarketingPlan {
  recommendedSellPrice: number;
  expectedMultiplier: string;
  elasticityNoteUz: string;
  elasticityNoteEn: string;
  promoPostUz: string;
  promoPostEn: string;
}

export interface SmartParsedProduct {
  sku: string;
  nameUz: string;
  nameEn: string;
  category: ProductCategory;
  sizes: string;
  stock: number;
  costPrice: number;
  sellPrice: number;
}

export interface ForecastBucket {
  periodUz: string;
  periodEn: string;
  apparel: number;
  footwear: number;
  accessories: number;
  seasonalIndex: number;
}

export interface ForecastSkuRecommendation {
  itemId: string;
  recommendedRestockQty: number;
  daysUntilStockout: number;
  reasonUz: string;
  reasonEn: string;
}

export interface ForecastAnalysisResult {
  timeframe: 7 | 14 | 30;
  projectedRevenueUZS: number;
  strategicSummaryUz: string;
  strategicSummaryEn: string;
  buckets: ForecastBucket[];
  skuRecommendations: ForecastSkuRecommendation[];
  generatedAt: string;
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
  ecosystemIntegrations?: EcosystemIntegrations;
  merchantConfig?: MerchantEcosystemConfig;
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
