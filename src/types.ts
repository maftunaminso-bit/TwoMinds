export type Language = 'uz' | 'en';

export type ThemeMode = 'light' | 'dark';

export type AppView = 'landing' | 'login' | 'admin' | 'dashboard';

export type UserRole = 'admin' | 'shop_owner';

export type PlanTier = 'Start' | 'Biznes' | 'Pro';

export type ShopStatus = 'active' | 'paused';

export type DashboardTab = 'overview' | 'sales-bot' | 'inventory' | 'forecast';

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
  status: ConversationStatus;
  lastActive: string;
  contextProductId: string;
  messages: ChatMessage[];
}

export interface ShopWorkspace {
  id: string;
  name: string;
  branch: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  plan: PlanTier;
  status: ShopStatus;
  channels: {
    instagram: boolean;
    telegram: boolean;
  };
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
