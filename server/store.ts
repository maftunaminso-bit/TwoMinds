import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { INITIAL_SHOPS } from '../src/data/initialData.ts';
import type { ChannelIntegrationStatus, ShopOrder, ShopWorkspace } from '../src/types.ts';
import { hashPassword, maskSecret } from './auth.ts';

export interface ServerChannelSecrets {
  telegram?: {
    botToken: string;
    secretToken: string;
    lastUpdateOffset: number;
  };
  instagram?: {
    accessToken: string;
    verifyToken: string;
  };
}

export interface ServerShopRecord extends ShopWorkspace {
  ownerPasswordHash: string;
  channelSecrets: ServerChannelSecrets;
}

export interface DatabaseState {
  adminPasswordHash: string | null;
  shops: ServerShopRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'savdopilot-db.json');

function buildInitialOrders(shopId: string): ShopOrder[] {
  if (shopId === 'shop-modahub') {
    return [
      {
        orderId: 'SP-4821',
        platform: 'instagram',
        customerName: 'Aziza Karimova',
        handle: '@aziza_karimova',
        productId: 'prod-kurtka',
        productName: 'Oversize Kurtka (Qora) · L',
        sku: 'SP-JK-01',
        price: 380000,
        deliveryFee: 25000,
        address: 'Chilonzor 5-kvartal',
        createdAt: '2026-11-25 13:42',
        status: 'confirmed',
      },
    ];
  }
  if (shopId === 'shop-streetstep') {
    return [
      {
        orderId: 'SS-2190',
        platform: 'instagram',
        customerName: 'Malika Toshmatova',
        handle: '@malika_t',
        productId: 'ss-2',
        productName: 'Adidas Campus 00s · 40',
        sku: 'SS-AD-10',
        price: 450000,
        deliveryFee: 25000,
        address: 'Yunusobod',
        createdAt: '2026-11-25 13:12',
        status: 'confirmed',
      },
    ];
  }
  return [];
}

function defaultChannelIntegrations(): ChannelIntegrationStatus {
  return {
    telegram: {
      connected: false,
      mode: 'polling',
      webhookActive: false,
    },
    instagram: {
      connected: false,
      verifyToken: `sp_${crypto.randomBytes(6).toString('hex')}`,
    },
  };
}

function seedDatabase(): DatabaseState {
  const defaultHash = hashPassword('shop123');
  const seededShops: ServerShopRecord[] = INITIAL_SHOPS.map((shop) => ({
    ...shop,
    ownerPasswordHash: defaultHash,
    orders: buildInitialOrders(shop.id),
    channelIntegrations: defaultChannelIntegrations(),
    channelSecrets: {},
  }));
  return {
    adminPasswordHash: null,
    shops: seededShops,
  };
}

let dbState: DatabaseState | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export function loadDatabase(): DatabaseState {
  if (dbState) return dbState;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as DatabaseState;
      if (parsed && Array.isArray(parsed.shops)) {
        dbState = parsed;
        return dbState;
      }
    }
  } catch (err) {
    console.error('Failed to load savdopilot-db.json, seeding fresh store:', err);
  }
  dbState = seedDatabase();
  persistDatabaseSync(dbState);
  return dbState;
}

function persistDatabaseSync(state: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function saveDatabase(): Promise<void> {
  const state = loadDatabase();
  writeQueue = writeQueue.then(async () => {
    persistDatabaseSync(state);
  });
  return writeQueue;
}

export function sanitizeShopForClient(
  shop: ServerShopRecord,
  baseUrl?: string
): ShopWorkspace {
  const cleanBase = (baseUrl || process.env.APP_URL || '').replace(/\/+$/, '');
  const tgWebhookUrl = cleanBase
    ? `${cleanBase}/api/webhooks/telegram/${shop.id}`
    : `/api/webhooks/telegram/${shop.id}`;
  const igWebhookUrl = cleanBase
    ? `${cleanBase}/api/webhooks/instagram`
    : `/api/webhooks/instagram`;

  const tgMeta = shop.channelIntegrations?.telegram || {
    connected: false,
    mode: 'polling' as const,
  };
  const igMeta = shop.channelIntegrations?.instagram || {
    connected: false,
  };

  return {
    id: shop.id,
    name: shop.name,
    branch: shop.branch,
    ownerName: shop.ownerName,
    ownerEmail: shop.ownerEmail,
    plan: shop.plan,
    status: shop.status,
    channels: shop.channels,
    todaySales: shop.todaySales,
    aiResolvedCount: shop.aiResolvedCount,
    inventory: shop.inventory,
    conversations: shop.conversations,
    orders: shop.orders || [],
    createdAt: shop.createdAt,
    channelIntegrations: {
      telegram: {
        ...tgMeta,
        maskedToken: maskSecret(shop.channelSecrets?.telegram?.botToken),
        webhookUrl: tgWebhookUrl,
      },
      instagram: {
        ...igMeta,
        maskedToken: maskSecret(shop.channelSecrets?.instagram?.accessToken),
        verifyToken:
          shop.channelSecrets?.instagram?.verifyToken || igMeta.verifyToken,
        webhookUrl: igWebhookUrl,
      },
    },
  };
}
