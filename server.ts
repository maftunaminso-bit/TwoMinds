import 'dotenv/config';
import crypto from 'crypto';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  AiServiceError,
} from './server/aiCashier.ts';
import {
  hashPassword,
  requireAdmin,
  requireShopAccess,
  safeEqual,
  signSessionToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './server/auth.ts';
import {
  broadcastTelegramPromo,
  disconnectInstagram,
  disconnectTelegram,
  processCustomerMessageForShop,
  processInstagramWebhookEntries,
  processTelegramUpdate,
  sendInstagramDmReply,
  sendTelegramMessage,
  startTelegramPollingWorker,
  verifyAndConnectInstagram,
  verifyAndConnectTelegram,
  type InstagramWebhookEntry,
  type TelegramUpdate,
} from './server/channels.ts';
import {
  loadDatabase,
  sanitizeShopForClient,
  saveDatabase,
  type ServerShopRecord,
} from './server/store.ts';
import type { AuthSession, InventoryItem, Language, PlanTier, ProductCategory } from './src/types.ts';

const PORT = Number(process.env.PORT) || 3000;

function getRequestBaseUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  return `${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`;
}

function getAdminAuthSource(db: ReturnType<typeof loadDatabase>): 'env' | 'claimed' | 'unclaimed' {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass) return 'env';
  if (db.adminPasswordHash) return 'claimed';
  return 'unclaimed';
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  // Ensure DB is initialized on boot
  loadDatabase();

  // --------------------------------------------------------------------------
  // HEALTH & PUBLIC SUMMARY ENDPOINTS
  // --------------------------------------------------------------------------
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'savdopilot-mvp', timestamp: new Date().toISOString() });
  });

  app.get('/api/public/shops', (_req: Request, res: Response) => {
    const db = loadDatabase();
    const summaries = db.shops.map((s) => ({
      id: s.id,
      name: s.name,
      branch: s.branch,
      ownerName: s.ownerName,
      ownerEmail: s.ownerEmail,
      plan: s.plan,
      status: s.status,
      todaySales: s.todaySales,
      aiResolvedCount: s.aiResolvedCount,
    }));
    res.json({ shops: summaries });
  });

  // --------------------------------------------------------------------------
  // AUTHENTICATION ENDPOINTS
  // --------------------------------------------------------------------------
  app.get('/api/auth/admin-status', (_req: Request, res: Response) => {
    const db = loadDatabase();
    const source = getAdminAuthSource(db);
    res.json({
      configured: source !== 'unclaimed',
      source,
    });
  });

  app.post('/api/auth/admin-claim', async (req: Request, res: Response) => {
    const db = loadDatabase();
    const source = getAdminAuthSource(db);
    if (source !== 'unclaimed') {
      res.status(409).json({
        error: 'Super Admin password is already configured.',
      });
      return;
    }
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    if (password.length < 6) {
      res.status(400).json({
        error: 'Admin password must be at least 6 characters long.',
      });
      return;
    }

    db.adminPasswordHash = hashPassword(password);
    await saveDatabase();

    const sessionCore: Omit<AuthSession, 'token'> = {
      role: 'admin',
      name: 'Platform Super Admin',
      email: 'admin@savdopilot.uz',
    };
    const token = signSessionToken(sessionCore);
    const baseUrl = getRequestBaseUrl(req);
    res.json({
      session: { ...sessionCore, token },
      shops: db.shops.map((s) => sanitizeShopForClient(s, baseUrl)),
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const db = loadDatabase();
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    const baseUrl = getRequestBaseUrl(req);

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    if (email === 'admin@savdopilot.uz') {
      const envPass = process.env.ADMIN_PASSCODE?.trim();
      let valid = false;
      if (envPass) {
        valid = safeEqual(password, envPass);
      } else if (db.adminPasswordHash) {
        valid = verifyPassword(password, db.adminPasswordHash);
      } else {
        res.status(403).json({
          error: 'Super Admin password has not been claimed yet.',
          code: 'ADMIN_UNCLAIMED',
        });
        return;
      }

      if (!valid) {
        res.status(401).json({ error: 'Invalid Super Admin password.' });
        return;
      }

      const sessionCore: Omit<AuthSession, 'token'> = {
        role: 'admin',
        name: 'Platform Super Admin',
        email: 'admin@savdopilot.uz',
      };
      const token = signSessionToken(sessionCore);
      res.json({
        session: { ...sessionCore, token },
        shops: db.shops.map((s) => sanitizeShopForClient(s, baseUrl)),
      });
      return;
    }

    const shop = db.shops.find((s) => s.ownerEmail.toLowerCase() === email);
    if (!shop || !verifyPassword(password, shop.ownerPasswordHash)) {
      res.status(401).json({ error: 'Invalid shop email or password.' });
      return;
    }

    if (shop.status === 'paused') {
      res.status(403).json({ error: 'This shop panel is currently paused by the administrator.' });
      return;
    }

    const sessionCore: Omit<AuthSession, 'token'> = {
      role: 'shop_owner',
      name: shop.ownerName,
      email: shop.ownerEmail,
      shopId: shop.id,
    };
    const token = signSessionToken(sessionCore);
    res.json({
      session: { ...sessionCore, token },
      shop: sanitizeShopForClient(shop, baseUrl),
    });
  });

  // Scoped 1-click demo login — strictly limited to the single public demo shop
  app.post('/api/auth/demo', (req: Request, res: Response) => {
    const db = loadDatabase();
    const requestedShopId =
      typeof req.body?.shopId === 'string' ? req.body.shopId.trim() : 'shop-modahub';

    if (requestedShopId !== 'shop-modahub') {
      res.status(403).json({
        error: "Faqat bitta Demo do'kon (ModaHub) ochiq. Boshqa do'konlar uchun parol bilan kiring.",
      });
      return;
    }

    const shop = db.shops.find((s) => s.id === 'shop-modahub');

    if (!shop) {
      res.status(404).json({ error: 'Demo shop workspace not found.' });
      return;
    }
    if (shop.status === 'paused') {
      res.status(403).json({ error: `"${shop.name}" paneli to'xtatilgan.` });
      return;
    }

    const sessionCore: Omit<AuthSession, 'token'> = {
      role: 'shop_owner',
      name: shop.ownerName,
      email: shop.ownerEmail,
      shopId: shop.id,
    };
    const token = signSessionToken(sessionCore);
    const baseUrl = getRequestBaseUrl(req);
    res.json({
      session: { ...sessionCore, token },
      shop: sanitizeShopForClient(shop, baseUrl),
    });
  });

  // --------------------------------------------------------------------------
  // PROTECTED SHOP WORKSPACE ROUTES
  // --------------------------------------------------------------------------
  app.get('/api/shops/:shopId', requireShopAccess, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const shop = db.shops.find((s) => s.id === req.params.shopId);
    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }
    res.json({ shop: sanitizeShopForClient(shop, getRequestBaseUrl(req)) });
  });

  app.post(
    '/api/shops/:shopId/conversations/:convId/reply',
    requireShopAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const shop = db.shops.find((s) => s.id === req.params.shopId);
      if (!shop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }

      const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const lang: Language = req.body?.lang === 'en' ? 'en' : 'uz';
      const sendToPlatform = Boolean(req.body?.sendToPlatform);

      if (!text) {
        res.status(400).json({ error: 'Message text is required' });
        return;
      }

      const conv = shop.conversations.find((c) => c.id === req.params.convId);
      if (!conv) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      try {
        const result = await processCustomerMessageForShop({
          shop,
          platform: conv.platform,
          conversationId: conv.id,
          externalChatId: conv.externalChatId,
          customerName: conv.customerName,
          handle: conv.handle,
          messageText: text,
          preferredLang: lang,
        });

        // If this conversation is linked to a real external Telegram/Instagram user and sendToPlatform is requested
        if (sendToPlatform && conv.externalChatId) {
          if (conv.platform === 'telegram' && shop.channelSecrets?.telegram?.botToken) {
            await sendTelegramMessage(
              shop.channelSecrets.telegram.botToken,
              conv.externalChatId,
              result.aiMessage.text
            );
          } else if (
            conv.platform === 'instagram' &&
            shop.channelSecrets?.instagram?.accessToken &&
            !conv.externalChatId.startsWith('test-ig-')
          ) {
            await sendInstagramDmReply(
              shop.channelSecrets.instagram.accessToken,
              conv.externalChatId,
              result.aiMessage.text
            );
          }
        }

        res.json({
          shop: sanitizeShopForClient(shop, getRequestBaseUrl(req)),
          aiMessage: result.aiMessage,
          order: result.order,
        });
      } catch (err: unknown) {
        if (err instanceof AiServiceError) {
          res.status(err.statusCode).json({ error: err.message, code: err.code });
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
      }
    }
  );

  app.post(
    '/api/shops/:shopId/inventory',
    requireShopAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const shop = db.shops.find((s) => s.id === req.params.shopId);
      if (!shop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }

      const nameUz = typeof req.body?.nameUz === 'string' ? req.body.nameUz.trim() : '';
      const nameEn = typeof req.body?.nameEn === 'string' ? req.body.nameEn.trim() : nameUz;
      const sku = typeof req.body?.sku === 'string' ? req.body.sku.trim().toUpperCase() : '';
      const category = req.body?.category as ProductCategory;
      const sizes = typeof req.body?.sizes === 'string' ? req.body.sizes.trim() : 'Standart';
      const stock = Number(req.body?.stock);
      const costPrice = Number(req.body?.costPrice);
      const sellPrice = Number(req.body?.sellPrice);

      if (
        !nameUz ||
        !sku ||
        !['Ustki kiyim', 'Oyoq kiyim', 'Aksessuarlar'].includes(category) ||
        !Number.isFinite(stock) ||
        stock < 0 ||
        !Number.isFinite(costPrice) ||
        costPrice <= 0 ||
        !Number.isFinite(sellPrice) ||
        sellPrice <= 0
      ) {
        res.status(400).json({ error: 'Invalid product fields provided.' });
        return;
      }

      const keywords = nameUz
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length >= 2);

      const created: InventoryItem = {
        id: `prod-${Date.now()}`,
        sku,
        nameUz,
        nameEn,
        category,
        sizes: sizes || 'Standart',
        stock: Math.floor(stock),
        costPrice: Math.round(costPrice),
        sellPrice: Math.round(sellPrice),
        daysIdle: 0,
        dailyVelocity: 1.0,
        recommendedRestock: stock <= 5 ? 15 : 8,
        keywords,
      };

      shop.inventory.unshift(created);
      await saveDatabase();

      res.json({
        item: created,
        shop: sanitizeShopForClient(shop, getRequestBaseUrl(req)),
      });
    }
  );

  app.post(
    '/api/shops/:shopId/inventory/:itemId/discount',
    requireShopAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const shop = db.shops.find((s) => s.id === req.params.shopId);
      if (!shop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }

      const item = shop.inventory.find((i) => i.id === req.params.itemId);
      if (!item) {
        res.status(404).json({ error: 'Inventory item not found' });
        return;
      }

      const newPrice = Number(req.body?.newPrice);
      if (!Number.isFinite(newPrice) || newPrice <= 0) {
        res.status(400).json({ error: 'Valid newPrice is required.' });
        return;
      }

      item.originalSellPrice = item.originalSellPrice || item.sellPrice;
      item.sellPrice = Math.round(newPrice);
      item.discountApplied = true;
      await saveDatabase();

      let broadcastResult: { sent: boolean; channel?: string; reason?: string } = {
        sent: false,
      };
      if (shop.channelIntegrations?.telegram?.connected && shop.channelIntegrations.telegram.channelUsername) {
        try {
          const promoText = `🔥 Maxsus Chegirma (${shop.name})!\n\n${item.nameUz} (${item.sizes})\nEski narx: ${item.originalSellPrice.toLocaleString()} so'm\nYangi narx: ${item.sellPrice.toLocaleString()} so'm\nQoldiq: ${item.stock} dona\n\nBuyurtma uchun botimizga yozing: ${shop.channelIntegrations.telegram.botUsername || ''}`;
          broadcastResult = await broadcastTelegramPromo(shop, promoText);
        } catch (err: unknown) {
          broadcastResult = {
            sent: false,
            reason: err instanceof Error ? err.message : String(err),
          };
        }
      }

      res.json({
        shop: sanitizeShopForClient(shop, getRequestBaseUrl(req)),
        broadcast: broadcastResult,
      });
    }
  );

  // --------------------------------------------------------------------------
  // CHANNEL INTEGRATION ROUTES (TELEGRAM & INSTAGRAM)
  // --------------------------------------------------------------------------
  app.post(
    '/api/shops/:shopId/channels/telegram',
    requireShopAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const shop = db.shops.find((s) => s.id === req.params.shopId);
      if (!shop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }

      const botToken = typeof req.body?.botToken === 'string' ? req.body.botToken.trim() : '';
      const mode = req.body?.mode === 'webhook' ? 'webhook' : 'polling';
      const channelUsername =
        typeof req.body?.channelUsername === 'string' ? req.body.channelUsername.trim() : undefined;

      if (!botToken) {
        res.status(400).json({ error: 'Telegram Bot Token is required.' });
        return;
      }

      try {
        await verifyAndConnectTelegram({
          shop,
          botToken,
          mode,
          channelUsername,
          baseUrl: getRequestBaseUrl(req),
        });
        res.json({ shop: sanitizeShopForClient(shop, getRequestBaseUrl(req)) });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(400).json({ error: msg });
      }
    }
  );

  app.delete(
    '/api/shops/:shopId/channels/telegram',
    requireShopAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const shop = db.shops.find((s) => s.id === req.params.shopId);
      if (!shop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }
      await disconnectTelegram(shop);
      res.json({ shop: sanitizeShopForClient(shop, getRequestBaseUrl(req)) });
    }
  );

  app.post(
    '/api/shops/:shopId/channels/instagram',
    requireShopAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const shop = db.shops.find((s) => s.id === req.params.shopId);
      if (!shop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }

      const pageId = typeof req.body?.pageId === 'string' ? req.body.pageId.trim() : '';
      const igAccountId =
        typeof req.body?.igAccountId === 'string' ? req.body.igAccountId.trim() : '';
      const igUsername =
        typeof req.body?.igUsername === 'string' ? req.body.igUsername.trim() : undefined;
      const accessToken =
        typeof req.body?.accessToken === 'string' ? req.body.accessToken.trim() : '';
      const verifyToken =
        typeof req.body?.verifyToken === 'string' ? req.body.verifyToken.trim() : undefined;

      try {
        await verifyAndConnectInstagram({
          shop,
          pageId,
          igAccountId,
          igUsername,
          accessToken,
          verifyToken,
        });
        res.json({ shop: sanitizeShopForClient(shop, getRequestBaseUrl(req)) });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(400).json({ error: msg });
      }
    }
  );

  app.delete(
    '/api/shops/:shopId/channels/instagram',
    requireShopAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const shop = db.shops.find((s) => s.id === req.params.shopId);
      if (!shop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }
      await disconnectInstagram(shop);
      res.json({ shop: sanitizeShopForClient(shop, getRequestBaseUrl(req)) });
    }
  );

  app.post(
    '/api/shops/:shopId/channels/instagram/test-webhook',
    requireShopAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const shop = db.shops.find((s) => s.id === req.params.shopId);
      if (!shop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }

      const senderUsername =
        typeof req.body?.username === 'string' && req.body.username.trim()
          ? req.body.username.trim()
          : 'instagram_test_mijoz';
      const text =
        typeof req.body?.text === 'string' && req.body.text.trim()
          ? req.body.text.trim()
          : 'Salom, Qora Oversize Kurtka L razmer bormi? Narxi qancha?';

      try {
        const result = await processInstagramWebhookEntries(
          [
            {
              id: shop.channelIntegrations?.instagram?.igAccountId || shop.id,
              messaging: [
                {
                  sender: {
                    id: `test-ig-${senderUsername.toLowerCase()}`,
                    username: senderUsername,
                  },
                  recipient: {
                    id: shop.channelIntegrations?.instagram?.igAccountId || shop.id,
                  },
                  message: {
                    mid: `mid.test.${Date.now()}`,
                    text,
                  },
                },
              ],
            },
          ],
          { isSimulatedTest: true, overrideShopId: shop.id }
        );

        res.json({
          ...result,
          shop: sanitizeShopForClient(shop, getRequestBaseUrl(req)),
        });
      } catch (err: unknown) {
        if (err instanceof AiServiceError) {
          res.status(err.statusCode).json({ error: err.message, code: err.code });
          return;
        }
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    }
  );

  // --------------------------------------------------------------------------
  // EXTERNAL WEBHOOK ENDPOINTS (CALLED BY TELEGRAM & META)
  // --------------------------------------------------------------------------
  app.post('/api/webhooks/telegram/:shopId', async (req: Request, res: Response) => {
    const db = loadDatabase();
    const shop = db.shops.find((s) => s.id === req.params.shopId);
    if (!shop || !shop.channelSecrets?.telegram) {
      res.status(404).json({ error: 'Unknown webhook target' });
      return;
    }

    const headerSecret = String(req.headers['x-telegram-bot-api-secret-token'] || '');
    if (!headerSecret || !safeEqual(headerSecret, shop.channelSecrets.telegram.secretToken)) {
      res.status(401).json({ error: 'Invalid Telegram secret token' });
      return;
    }

    res.status(200).json({ ok: true });
    const update = req.body as TelegramUpdate;
    await processTelegramUpdate(shop, update);
  });

  app.get('/api/webhooks/instagram', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = String(req.query['hub.verify_token'] || '');
    const challenge = String(req.query['hub.challenge'] || '');

    if (mode !== 'subscribe' || !token) {
      res.sendStatus(403);
      return;
    }

    const db = loadDatabase();
    const envVerify = process.env.INSTAGRAM_VERIFY_TOKEN?.trim();
    const matchesEnv = Boolean(envVerify && safeEqual(token, envVerify));
    const matchesShop = db.shops.some((s) => {
      const vt = s.channelSecrets?.instagram?.verifyToken || s.channelIntegrations?.instagram?.verifyToken;
      return Boolean(vt && safeEqual(token, vt));
    });

    if (matchesEnv || matchesShop) {
      res.status(200).send(challenge);
      return;
    }

    res.sendStatus(403);
  });

  app.post('/api/webhooks/instagram', async (req: Request, res: Response) => {
    const metaSecret = process.env.META_APP_SECRET?.trim();
    if (metaSecret) {
      const signature = String(req.headers['x-hub-signature-256'] || '');
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!signature || !rawBody) {
        res.sendStatus(401);
        return;
      }
      const expected =
        'sha256=' + crypto.createHmac('sha256', metaSecret).update(rawBody).digest('hex');
      if (!safeEqual(signature, expected)) {
        res.sendStatus(401);
        return;
      }
    }

    res.status(200).send('EVENT_RECEIVED');

    if (req.body?.object === 'instagram' && Array.isArray(req.body?.entry)) {
      try {
        await processInstagramWebhookEntries(req.body.entry as InstagramWebhookEntry[]);
      } catch (err) {
        console.error('[Instagram Webhook] Failed:', err);
      }
    }
  });

  // --------------------------------------------------------------------------
  // SUPER ADMIN ROUTES
  // --------------------------------------------------------------------------
  app.get('/api/admin/shops', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const baseUrl = getRequestBaseUrl(req);
    res.json({
      shops: db.shops.map((s) => sanitizeShopForClient(s, baseUrl)),
    });
  });

  app.post('/api/admin/shops', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const branch = typeof req.body?.branch === 'string' ? req.body.branch.trim() : '';
    const ownerName = typeof req.body?.ownerName === 'string' ? req.body.ownerName.trim() : '';
    const ownerEmail =
      typeof req.body?.ownerEmail === 'string' ? req.body.ownerEmail.trim().toLowerCase() : '';
    const ownerPassword =
      typeof req.body?.ownerPassword === 'string' ? req.body.ownerPassword.trim() : '';
    const plan = req.body?.plan as PlanTier;
    const instagram = Boolean(req.body?.instagram);
    const telegram = Boolean(req.body?.telegram);

    if (
      !name ||
      !branch ||
      !ownerName ||
      !ownerEmail ||
      ownerPassword.length < 4 ||
      !['Start', 'Biznes', 'Pro'].includes(plan)
    ) {
      res.status(400).json({ error: 'Please complete all required shop fields.' });
      return;
    }

    if (db.shops.some((s) => s.ownerEmail.toLowerCase() === ownerEmail)) {
      res.status(409).json({ error: 'A shop with this owner email already exists.' });
      return;
    }

    const newId = `shop-${Date.now()}`;
    const starterProdId = `${newId}-p1`;
    const starterDeadId = `${newId}-p2`;

    const newShop: ServerShopRecord = {
      id: newId,
      name,
      branch,
      ownerName,
      ownerEmail,
      ownerPasswordHash: hashPassword(ownerPassword),
      plan,
      status: 'active',
      channels: { instagram, telegram },
      channelIntegrations: {
        telegram: { connected: false, mode: 'polling', webhookActive: false },
        instagram: { connected: false, verifyToken: `sp_${crypto.randomBytes(6).toString('hex')}` },
      },
      channelSecrets: {},
      orders: [],
      todaySales: 2850000,
      aiResolvedCount: 18,
      createdAt: new Date().toISOString().slice(0, 10),
      inventory: [
        {
          id: starterProdId,
          sku: `${name.slice(0, 2).toUpperCase()}-001`,
          nameUz: 'Mavsumiy Kurtka (Qora)',
          nameEn: 'Seasonal Jacket (Black)',
          category: 'Ustki kiyim',
          sizes: 'M, L, XL',
          stock: 4,
          costPrice: 220000,
          sellPrice: 360000,
          daysIdle: 2,
          dailyVelocity: 1.3,
          recommendedRestock: 18,
          keywords: ['kurtka', 'jacket', 'qora', 'black', 'ustki'],
        },
        {
          id: starterDeadId,
          sku: `${name.slice(0, 2).toUpperCase()}-002`,
          nameUz: 'Sport Krossovka',
          nameEn: 'Sport Sneakers',
          category: 'Oyoq kiyim',
          sizes: '41, 42, 43',
          stock: 12,
          costPrice: 250000,
          sellPrice: 410000,
          daysIdle: 33,
          dailyVelocity: 0.2,
          recommendedRestock: 0,
          keywords: ['krossovka', 'sneaker', 'sport', '42'],
        },
      ],
      conversations: [
        {
          id: `${newId}-conv1`,
          customerName: 'Test Mijoz',
          handle: '@mijoz_demo',
          initials: 'TM',
          platform: instagram ? 'instagram' : 'telegram',
          status: 'ai_replied',
          lastActive: '14:15',
          contextProductId: starterProdId,
          messages: [
            {
              id: `${newId}-m1`,
              sender: 'customer',
              text: 'Salom, Mavsumiy kurtka L razmer bormi? Narxi qancha?',
              timestamp: '14:14',
            },
            {
              id: `${newId}-m2`,
              sender: 'ai',
              text: "Assalomu alaykum! Ha, Mavsumiy Kurtka (Qora) L razmer omborimizda 4 dona mavjud. Narxi: 360,000 so'm. Rasmiylashtiramizmi?",
              timestamp: '14:15',
            },
          ],
        },
      ],
    };

    db.shops.unshift(newShop);
    await saveDatabase();

    res.status(201).json({
      shop: sanitizeShopForClient(newShop, getRequestBaseUrl(req)),
    });
  });

  app.patch(
    '/api/admin/shops/:shopId',
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const shop = db.shops.find((s) => s.id === req.params.shopId);
      if (!shop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }

      if (req.body?.status === 'active' || req.body?.status === 'paused') {
        shop.status = req.body.status;
      }
      if (['Start', 'Biznes', 'Pro'].includes(req.body?.plan)) {
        shop.plan = req.body.plan;
      }

      await saveDatabase();
      res.json({ shop: sanitizeShopForClient(shop, getRequestBaseUrl(req)) });
    }
  );

  // --------------------------------------------------------------------------
  // VITE DEV MIDDLEWARE / PRODUCTION STATIC HANDLER
  // --------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SavdoPilot full-stack MVP running at http://0.0.0.0:${PORT}`);
    startTelegramPollingWorker();
  });
}

startServer().catch((err) => {
  console.error('Failed to start SavdoPilot server:', err);
  process.exit(1);
});
