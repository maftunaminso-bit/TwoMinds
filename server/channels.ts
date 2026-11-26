import crypto from 'crypto';
import net from 'net';
import type {
  ChatMessage,
  Conversation,
  Language,
  Platform,
  ShopOrder,
} from '../src/types.ts';
import { formatUZS } from '../src/i18n.ts';
import {
  answerOwnerDirectorQuestion,
  generateGeminiCashierReply,
  transcribeVoiceAudio,
} from './aiCashier.ts';
import { loadDatabase, saveDatabase, type ServerShopRecord } from './store.ts';

function getInitials(name: string): string {
  const clean = name.replace(/[@._-]/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'MJ';
}

function nowTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function nowIsoShort(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${nowTimeHHMM()}`;
}

export function buildRealPaymentUrl(
  shop: ServerShopRecord,
  provider: 'Click' | 'Payme',
  orderId: string,
  amountUzs: number
): string | undefined {
  if (provider === 'Click') {
    const serviceId =
      shop.channelSecrets?.click?.serviceId || process.env.CLICK_SERVICE_ID?.trim();
    const merchantId =
      shop.channelSecrets?.click?.merchantId || process.env.CLICK_MERCHANT_ID?.trim();
    if (serviceId && merchantId) {
      const qs = new URLSearchParams({
        service_id: serviceId,
        merchant_id: merchantId,
        amount: String(Math.round(amountUzs)),
        transaction_param: orderId,
      });
      return `https://my.click.uz/services/pay?${qs.toString()}`;
    }
    return undefined;
  }

  const paymeMerchant =
    shop.channelSecrets?.payme?.merchantId || process.env.PAYME_MERCHANT_ID?.trim();
  if (paymeMerchant) {
    const amountTiyin = Math.round(amountUzs) * 100;
    const encoded = Buffer.from(
      `m=${paymeMerchant};ac.order_id=${orderId};a=${amountTiyin}`,
      'utf8'
    ).toString('base64');
    return `https://checkout.paycom.uz/${encoded}`;
  }
  return undefined;
}

export async function processCustomerMessageForShop(params: {
  shop: ServerShopRecord;
  platform: Platform;
  externalChatId?: string;
  conversationId?: string;
  customerName: string;
  handle: string;
  messageText: string;
  preferredLang?: Language;
  isVoice?: boolean;
  voiceDuration?: string;
}): Promise<{
  conversation: Conversation;
  aiMessage: ChatMessage;
  order?: ShopOrder;
}> {
  const {
    shop,
    platform,
    externalChatId,
    conversationId,
    customerName,
    handle,
    messageText,
    isVoice,
    voiceDuration,
  } = params;
  const preferredLang: Language = params.preferredLang || 'uz';

  let conv =
    (conversationId
      ? shop.conversations.find((c) => c.id === conversationId)
      : undefined) ||
    (externalChatId
      ? shop.conversations.find(
          (c) => c.platform === platform && c.externalChatId === externalChatId
        )
      : undefined);

  if (!conv) {
    conv = {
      id: `conv-${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customerName,
      handle,
      initials: getInitials(customerName || handle),
      platform,
      externalChatId,
      status: 'waiting',
      lastActive: nowTimeHHMM(),
      contextProductId: shop.inventory[0]?.id || '',
      tags: isVoice ? ['Ovozli xabar'] : [],
      messages: [],
    };
    shop.conversations.unshift(conv);
  }

  const timestamp = nowTimeHHMM();
  const customerMsg: ChatMessage = {
    id: `msg-c-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    sender: 'customer',
    text: messageText,
    timestamp,
    ...(isVoice
      ? {
          isVoice: true,
          voiceDuration: voiceDuration || '0:05',
          voiceTranscript: messageText,
        }
      : {}),
  };

  const decision = await generateGeminiCashierReply({
    shopName: shop.name,
    shopBranch: shop.branch,
    customerMessage: messageText,
    inventory: shop.inventory,
    recentMessages: conv.messages,
    contextProductId: conv.contextProductId || shop.inventory[0]?.id || '',
    preferredLang,
  });

  const matchedItem =
    shop.inventory.find((i) => i.id === decision.matchedProductId) || shop.inventory[0];

  let createdOrder: ShopOrder | undefined;
  let orderMeta: ChatMessage['orderCreated'] | undefined;
  let paymentCard: ChatMessage['paymentCard'] | undefined;
  let deliveryPill: ChatMessage['deliveryPill'] | undefined;
  let finalReplyText = decision.replyText;

  if (decision.isOrderConfirmed && matchedItem && matchedItem.stock > 0) {
    matchedItem.stock = Math.max(0, matchedItem.stock - 1);
    shop.todaySales += matchedItem.sellPrice;

    const orderNum = `SP-${Math.floor(4830 + Math.random() * 5000)}`;
    const deliveryFee = matchedItem.sellPrice >= 500000 ? 0 : 22000;
    const totalAmount = matchedItem.sellPrice + deliveryFee;
    const provider = decision.paymentProvider || 'Click';
    const deliveryAddr = decision.deliveryAddress || 'Chilonzor 5-kvartal';
    const labelWithSize = `${matchedItem.nameUz}${
      decision.requestedSize ? ` · ${decision.requestedSize}` : ''
    }`;
    const paymentUrl = buildRealPaymentUrl(shop, provider, orderNum, totalAmount);

    orderMeta = {
      orderId: orderNum,
      productName: labelWithSize,
      price: matchedItem.sellPrice,
      deliveryFee,
      remainingStock: matchedItem.stock,
    };

    paymentCard = {
      provider,
      amount: totalAmount,
      status: 'pending',
      paymentUrl,
      orderId: orderNum,
    };

    deliveryPill = {
      provider: 'Yandex Delivery',
      etaMinutes: 18,
      address: deliveryAddr,
      status: 'pending',
    };

    createdOrder = {
      orderId: orderNum,
      platform,
      customerName: conv.customerName,
      handle: conv.handle,
      productId: matchedItem.id,
      productName: labelWithSize,
      sku: matchedItem.sku,
      price: matchedItem.sellPrice,
      deliveryFee,
      paymentProvider: provider,
      paymentStatus: 'pending',
      paymentUrl,
      deliveryProvider: 'Yandex Delivery',
      address: deliveryAddr,
      createdAt: nowIsoShort(),
      status: 'confirmed',
    };

    shop.orders = shop.orders || [];
    shop.orders.unshift(createdOrder);

    if (!finalReplyText.includes(orderNum)) {
      finalReplyText = `${finalReplyText}\n\nBuyurtma raqami: ${orderNum} · Qoldiq: ${matchedItem.stock} dona.${
        paymentUrl ? `\n${provider} to'lov havolasi: ${paymentUrl}` : ''
      }`;
    }
  }

  const aiMsg: ChatMessage = {
    id: `msg-ai-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    sender: 'ai',
    text: finalReplyText,
    timestamp: nowTimeHHMM(),
    aiPowered: true,
    paymentCard,
    deliveryPill,
    orderCreated: orderMeta,
  };

  conv.messages.push(customerMsg, aiMsg);
  conv.contextProductId = matchedItem?.id || conv.contextProductId;
  conv.lastActive = aiMsg.timestamp;
  conv.status = orderMeta ? 'order_confirmed' : 'ai_replied';

  const existingTags = new Set(conv.tags || []);
  if (isVoice) existingTags.add('Ovozli xabar');
  if (paymentCard) {
    existingTags.add(`${paymentCard.provider} kutilmoqda`);
  }
  conv.tags = Array.from(existingTags);

  shop.aiResolvedCount += 1;

  // Move active conversation to top
  shop.conversations = [conv, ...shop.conversations.filter((c) => c.id !== conv!.id)];

  await saveDatabase();

  return {
    conversation: conv,
    aiMessage: aiMsg,
    order: createdOrder,
  };
}

// ============================================================================
// TELEGRAM BOT API INTEGRATION
// ============================================================================

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    text?: string;
    voice?: {
      file_id: string;
      duration?: number;
      mime_type?: string;
    };
  };
}

async function telegramApiCall<T>(
  botToken: string,
  method: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json()) as TelegramApiResponse<T>;
  if (!res.ok || !data.ok || data.result === undefined) {
    throw new Error(data.description || `Telegram API error (${res.status})`);
  }
  return data.result;
}

export async function verifyAndConnectTelegram(params: {
  shop: ServerShopRecord;
  botToken: string;
  mode: 'webhook' | 'polling';
  channelUsername?: string;
  baseUrl?: string;
}): Promise<void> {
  const cleanToken = params.botToken.trim();
  if (!cleanToken.includes(':')) {
    throw new Error("Noto'g'ri Bot Token formati. @BotFather bergan tokenni kiriting.");
  }

  const botInfo = await telegramApiCall<TelegramUser>(cleanToken, 'getMe');
  const secretToken = crypto.randomBytes(16).toString('hex');

  const cleanBase = (params.baseUrl || process.env.APP_URL || '').replace(/\/+$/, '');
  const isHttpsPublic =
    cleanBase.startsWith('https://') &&
    !cleanBase.includes('localhost') &&
    !cleanBase.includes('127.0.0.1');

  let effectiveMode: 'webhook' | 'polling' = params.mode;
  let webhookActive = false;

  if (effectiveMode === 'webhook' && isHttpsPublic) {
    const webhookUrl = `${cleanBase}/api/webhooks/telegram/${params.shop.id}`;
    await telegramApiCall<boolean>(cleanToken, 'setWebhook', {
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ['message'],
    });
    webhookActive = true;
  } else {
    effectiveMode = 'polling';
    await telegramApiCall<boolean>(cleanToken, 'deleteWebhook', {
      drop_pending_updates: false,
    });
  }

  params.shop.channels.telegram = true;
  params.shop.channelSecrets = params.shop.channelSecrets || {};
  params.shop.channelSecrets.telegram = {
    botToken: cleanToken,
    secretToken,
    lastUpdateOffset: params.shop.channelSecrets.telegram?.lastUpdateOffset || 0,
  };

  params.shop.channelIntegrations = params.shop.channelIntegrations || {
    telegram: { connected: false, mode: 'polling' },
    instagram: { connected: false },
  };
  params.shop.channelIntegrations.telegram = {
    connected: true,
    botUsername: botInfo.username ? `@${botInfo.username}` : undefined,
    botName: botInfo.first_name,
    mode: effectiveMode,
    webhookActive,
    channelUsername: params.channelUsername?.trim() || undefined,
    lastSyncAt: nowIsoShort(),
    lastError: undefined,
  };

  await saveDatabase();
}

export async function disconnectTelegram(shop: ServerShopRecord): Promise<void> {
  const token = shop.channelSecrets?.telegram?.botToken;
  if (token) {
    try {
      await telegramApiCall<boolean>(token, 'deleteWebhook', { drop_pending_updates: false });
    } catch {
      // Ignore upstream errors when disconnecting
    }
  }
  if (shop.channelSecrets) {
    delete shop.channelSecrets.telegram;
  }
  shop.channelIntegrations = shop.channelIntegrations || {
    telegram: { connected: false, mode: 'polling' },
    instagram: { connected: false },
  };
  shop.channelIntegrations.telegram = {
    connected: false,
    mode: 'polling',
    webhookActive: false,
  };
  await saveDatabase();
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string
): Promise<void> {
  await telegramApiCall(botToken, 'sendMessage', {
    chat_id: chatId,
    text,
  });
}

export async function broadcastTelegramPromo(
  shop: ServerShopRecord,
  text: string
): Promise<{ sent: boolean; channel?: string; reason?: string }> {
  const token = shop.channelSecrets?.telegram?.botToken;
  const channel = shop.channelIntegrations?.telegram?.channelUsername;
  if (!token || !channel) {
    return {
      sent: false,
      reason: 'Telegram bot or channel @username is not configured',
    };
  }
  const target = channel.startsWith('@') || channel.startsWith('-100') ? channel : `@${channel}`;
  await sendTelegramMessage(token, target, text);
  return { sent: true, channel: target };
}

export async function processTelegramUpdate(
  shop: ServerShopRecord,
  update: TelegramUpdate
): Promise<void> {
  const msg = update.message;
  if (!msg || (!msg.text && !msg.voice)) return;

  const botToken = shop.channelSecrets?.telegram?.botToken;
  if (!botToken) return;

  const chatId = String(msg.chat.id);
  const fullName =
    [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') ||
    msg.chat.first_name ||
    'Telegram Mijoz';
  const handle = msg.from?.username ? `@${msg.from.username}` : `tg:${chatId}`;

  let text = (msg.text || '').trim();
  let isVoice = false;
  let voiceDuration: string | undefined;

  if (!text && msg.voice?.file_id) {
    try {
      const fileMeta = await telegramApiCall<{ file_path?: string }>(botToken, 'getFile', {
        file_id: msg.voice.file_id,
      });
      if (fileMeta.file_path) {
        const audioRes = await fetch(
          `https://api.telegram.org/file/bot${botToken}/${fileMeta.file_path}`
        );
        if (audioRes.ok) {
          const buf = Buffer.from(await audioRes.arrayBuffer());
          const mime = msg.voice.mime_type || 'audio/ogg';
          text = await transcribeVoiceAudio({
            audioBase64: buf.toString('base64'),
            mimeType: mime,
            preferredLang: 'uz',
          });
          isVoice = true;
          const sec = Math.max(1, Math.round(msg.voice.duration || 5));
          voiceDuration = `0:${String(sec).padStart(2, '0')}`;
        }
      }
    } catch (voiceErr: unknown) {
      console.error(`[Telegram:${shop.id}] Voice transcription failed:`, voiceErr);
      await sendTelegramMessage(
        botToken,
        chatId,
        "Ovozli xabarni tinglashda muammo yuz berdi. Iltimos, matn ko'rinishida yozib yuboring."
      );
      return;
    }
  }

  if (!text) return;

  if (text === '/start') {
    const topItems = shop.inventory
      .filter((i) => i.stock > 0)
      .slice(0, 4)
      .map((i) => `• ${i.nameUz} (${i.sizes}) — ${formatUZS(i.sellPrice, 'uz')} [${i.stock} dona]`)
      .join('\n');

    const welcome = `Assalomu alaykum, ${fullName}! "${shop.name}" (${shop.branch}) AI savdo botiga xush kelibsiz.\n\nOmbordagi mavjud tovarlar:\n${topItems}\n\nQaysi mahsulot yoki razmer bo'yicha yordam bera olaman? Ovozli xabar (golos) yuborishingiz ham mumkin!`;

    await sendTelegramMessage(botToken, chatId, welcome);
    if (shop.channelIntegrations?.telegram) {
      shop.channelIntegrations.telegram.lastSyncAt = nowIsoShort();
      shop.channelIntegrations.telegram.lastError = undefined;
    }
    await saveDatabase();
    return;
  }

  if (text.startsWith('/hisobot') || text.startsWith('/report')) {
    try {
      const q = text.replace(/^\/(hisobot|report)\s*/i, '').trim() || 'Bugungi savdo, kam qolgan tovarlar va sof foyda hisobotini bering';
      const ans = await answerOwnerDirectorQuestion({
        shopName: shop.name,
        branch: shop.branch,
        todaySales: shop.todaySales,
        aiResolvedCount: shop.aiResolvedCount,
        inventory: shop.inventory,
        orders: shop.orders || [],
        question: q,
        preferredLang: 'uz',
      });
      await sendTelegramMessage(
        botToken,
        chatId,
        `📊 ${ans.headline}\n\n${ans.detail}\n\n${ans.metricLabel}: ${ans.metricValue}`
      );
      return;
    } catch (err: unknown) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `Hisobot olishda xato: ${err instanceof Error ? err.message : String(err)}`
      );
      return;
    }
  }

  try {
    const result = await processCustomerMessageForShop({
      shop,
      platform: 'telegram',
      externalChatId: chatId,
      customerName: fullName,
      handle,
      messageText: text,
      preferredLang: 'uz',
      isVoice,
      voiceDuration,
    });

    await sendTelegramMessage(botToken, chatId, result.aiMessage.text);
    if (shop.channelIntegrations?.telegram) {
      shop.channelIntegrations.telegram.lastSyncAt = nowIsoShort();
      shop.channelIntegrations.telegram.lastError = undefined;
    }
    await saveDatabase();
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (shop.channelIntegrations?.telegram) {
      shop.channelIntegrations.telegram.lastError = errMsg;
    }
    await saveDatabase();
    console.error(`[Telegram:${shop.id}] Error processing update:`, errMsg);
  }
}

let isPollingActive = false;

export function startTelegramPollingWorker(): void {
  setInterval(async () => {
    if (isPollingActive) return;
    isPollingActive = true;
    try {
      const db = loadDatabase();
      for (const shop of db.shops) {
        const tgMeta = shop.channelIntegrations?.telegram;
        const tgSecret = shop.channelSecrets?.telegram;
        if (!tgMeta?.connected || tgMeta.mode !== 'polling' || !tgSecret?.botToken) {
          continue;
        }
        try {
          const updates = await telegramApiCall<TelegramUpdate[]>(
            tgSecret.botToken,
            'getUpdates',
            {
              offset: (tgSecret.lastUpdateOffset || 0) + 1,
              limit: 20,
              timeout: 0,
              allowed_updates: ['message'],
            }
          );

          if (updates.length > 0) {
            for (const upd of updates) {
              tgSecret.lastUpdateOffset = Math.max(tgSecret.lastUpdateOffset || 0, upd.update_id);
              await processTelegramUpdate(shop, upd);
            }
            tgMeta.lastSyncAt = nowIsoShort();
            tgMeta.lastError = undefined;
            await saveDatabase();
          }
        } catch (err: unknown) {
          tgMeta.lastError = err instanceof Error ? err.message : String(err);
        }
      }
    } finally {
      isPollingActive = false;
    }
  }, 2500);
}

// ============================================================================
// INSTAGRAM DM (META GRAPH API) INTEGRATION
// ============================================================================

export async function verifyAndConnectInstagram(params: {
  shop: ServerShopRecord;
  pageId: string;
  igAccountId: string;
  igUsername?: string;
  accessToken: string;
  verifyToken?: string;
}): Promise<void> {
  const token = params.accessToken.trim();
  const pageId = params.pageId.trim();
  const igAccountId = params.igAccountId.trim();

  if (!token || !igAccountId) {
    throw new Error('Instagram Account ID va Page Access Token kiritilishi shart.');
  }

  // Validate token directly against Meta Graph API using Bearer header
  const meRes = await fetch('https://graph.facebook.com/v21.0/me?fields=id,name', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const meData = (await meRes.json()) as {
    id?: string;
    name?: string;
    error?: { message?: string };
  };

  if (!meRes.ok || meData.error) {
    throw new Error(
      meData.error?.message || `Meta Graph API token tekshiruvi xatosi (${meRes.status})`
    );
  }

  const finalVerifyToken =
    params.verifyToken?.trim() ||
    params.shop.channelSecrets?.instagram?.verifyToken ||
    params.shop.channelIntegrations?.instagram?.verifyToken ||
    `sp_${crypto.randomBytes(6).toString('hex')}`;

  params.shop.channels.instagram = true;
  params.shop.channelSecrets = params.shop.channelSecrets || {};
  params.shop.channelSecrets.instagram = {
    accessToken: token,
    verifyToken: finalVerifyToken,
  };

  params.shop.channelIntegrations = params.shop.channelIntegrations || {
    telegram: { connected: false, mode: 'polling' },
    instagram: { connected: false },
  };
  params.shop.channelIntegrations.instagram = {
    connected: true,
    pageId: pageId || meData.id || igAccountId,
    igAccountId,
    igUsername:
      params.igUsername?.trim() ||
      (meData.name ? `@${meData.name.toLowerCase().replace(/\s+/g, '_')}` : '@instagram_shop'),
    verifyToken: finalVerifyToken,
    lastSyncAt: nowIsoShort(),
    lastError: undefined,
  };

  await saveDatabase();
}

export async function disconnectInstagram(shop: ServerShopRecord): Promise<void> {
  if (shop.channelSecrets) {
    delete shop.channelSecrets.instagram;
  }
  const existingVerify = shop.channelIntegrations?.instagram?.verifyToken;
  shop.channelIntegrations = shop.channelIntegrations || {
    telegram: { connected: false, mode: 'polling' },
    instagram: { connected: false },
  };
  shop.channelIntegrations.instagram = {
    connected: false,
    verifyToken: existingVerify || `sp_${crypto.randomBytes(6).toString('hex')}`,
  };
  await saveDatabase();
}

export async function sendInstagramDmReply(
  accessToken: string,
  recipientId: string,
  text: string
): Promise<void> {
  const res = await fetch('https://graph.facebook.com/v21.0/me/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Meta Graph API send failed (${res.status}): ${errBody}`);
  }
}

export interface InstagramWebhookEntry {
  id?: string;
  messaging?: Array<{
    sender?: { id: string; username?: string };
    recipient?: { id: string };
    message?: { mid?: string; text?: string; is_echo?: boolean };
  }>;
}

export async function processInstagramWebhookEntries(
  entries: InstagramWebhookEntry[],
  options?: { isSimulatedTest?: boolean; overrideShopId?: string }
): Promise<{ processedCount: number; lastReply?: string }> {
  const db = loadDatabase();
  let processedCount = 0;
  let lastReply: string | undefined;

  for (const entry of entries) {
    for (const event of entry.messaging || []) {
      if (!event.message?.text || event.message.is_echo) continue;

      const recipientId = event.recipient?.id || entry.id || '';
      const senderId = event.sender?.id || `ig_${Date.now()}`;
      const shop = options?.overrideShopId
        ? db.shops.find((s) => s.id === options.overrideShopId)
        : db.shops.find(
            (s) =>
              s.channelIntegrations?.instagram?.connected &&
              (s.channelIntegrations.instagram.igAccountId === recipientId ||
                s.channelIntegrations.instagram.pageId === recipientId)
          );

      if (!shop) continue;

      const customerName = event.sender?.username
        ? `@${event.sender.username.replace(/^@/, '')}`
        : `Instagram DM (${senderId.slice(-4)})`;

      const result = await processCustomerMessageForShop({
        shop,
        platform: 'instagram',
        externalChatId: senderId,
        customerName,
        handle: customerName.startsWith('@') ? customerName : `@ig_${senderId.slice(-5)}`,
        messageText: event.message.text,
        preferredLang: 'uz',
      });

      lastReply = result.aiMessage.text;
      processedCount += 1;

      const igToken = shop.channelSecrets?.instagram?.accessToken;
      if (!options?.isSimulatedTest && igToken && !senderId.startsWith('test-ig-')) {
        try {
          await sendInstagramDmReply(igToken, senderId, result.aiMessage.text);
          if (shop.channelIntegrations?.instagram) {
            shop.channelIntegrations.instagram.lastSyncAt = nowIsoShort();
            shop.channelIntegrations.instagram.lastError = undefined;
          }
        } catch (err: unknown) {
          if (shop.channelIntegrations?.instagram) {
            shop.channelIntegrations.instagram.lastError =
              err instanceof Error ? err.message : String(err);
          }
        }
      } else if (shop.channelIntegrations?.instagram) {
        shop.channelIntegrations.instagram.lastSyncAt = nowIsoShort();
      }
      await saveDatabase();
    }
  }

  return { processedCount, lastReply };
}

// ============================================================================
// YANDEX DELIVERY CARGO API & SSRF-SAFE ERP WEBHOOK SYNC
// ============================================================================

export function assertSafeHttpsWebhookUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Noto'g'ri Webhook URL formati.");
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Faqat HTTPS URL manzillari ruxsat etiladi.');
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '169.254.169.254'
  ) {
    throw new Error("Ichki yoki lokal tarmoq manzillariga so'rov yuborish taqiqlangan.");
  }
  if (net.isIP(host)) {
    const parts = host.split('.').map(Number);
    const isPrivateV4 =
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168);
    if (isPrivateV4 || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
      throw new Error("Xususiy IP manzilga webhook yuborish taqiqlangan.");
    }
  }
  return parsed;
}

export async function dispatchOrderToYandexOrCourier(params: {
  shop: ServerShopRecord;
  order: ShopOrder;
}): Promise<{ mode: 'yandex_api' | 'local_courier'; claimId: string; note: string }> {
  const token =
    params.shop.channelSecrets?.yandex?.apiToken ||
    process.env.YANDEX_DELIVERY_TOKEN?.trim();
  const pickupAddr =
    params.shop.channelSecrets?.yandex?.pickupAddress || `${params.shop.branch}, Tashkent`;
  const senderPhone = params.shop.channelSecrets?.yandex?.senderPhone || '+998901234567';

  if (!token) {
    const localId = `LOC-${params.order.orderId}`;
    return {
      mode: 'local_courier',
      claimId: localId,
      note: "Buyurtma ichki kuryer jo'natmasiga o'tkazildi (Yandex B2B API token kiritilmagan).",
    };
  }

  const requestId = `sp_${params.order.orderId}_${Date.now()}`;
  const res = await fetch(
    `https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/claims/create?request_id=${encodeURIComponent(
      requestId
    )}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Accept-Language': 'uz',
      },
      body: JSON.stringify({
        items: [
          {
            cost_currency: 'UZS',
            cost_value: String(params.order.price),
            droppof_point: 2,
            pickup_point: 1,
            quantity: 1,
            title: params.order.productName,
            weight: 0.8,
          },
        ],
        route_points: [
          {
            point_id: 1,
            visit_order: 1,
            type: 'source',
            address: { fullname: pickupAddr },
            contact: { name: params.shop.ownerName, phone: senderPhone },
          },
          {
            point_id: 2,
            visit_order: 2,
            type: 'destination',
            address: { fullname: params.order.address || 'Chilonzor, Tashkent' },
            contact: { name: params.order.customerName, phone: senderPhone },
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Yandex Delivery Cargo API error (${res.status}): ${errText.slice(0, 180)}`);
  }

  const data = (await res.json()) as { id?: string };
  return {
    mode: 'yandex_api',
    claimId: data.id || `YND-${params.order.orderId}`,
    note: 'Yandex Delivery Cargo API orqali haqiqiy kuryer arizasi yaratildi.',
  };
}

export async function syncInventoryWithErpWebhook(
  shop: ServerShopRecord
): Promise<{ syncedAt: string; status: string }> {
  const erp = shop.channelSecrets?.erp;
  if (!erp?.webhookUrl) {
    throw new Error('ERP Webhook URL sozlanmagan.');
  }
  const safeUrl = assertSafeHttpsWebhookUrl(erp.webhookUrl);
  const res = await fetch(safeUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SavdoPilot-Provider': erp.provider,
      'X-SavdoPilot-Shop': shop.id,
    },
    body: JSON.stringify({
      event: 'inventory.sync',
      provider: erp.provider,
      shopId: shop.id,
      shopName: shop.name,
      syncedAt: new Date().toISOString(),
      inventory: shop.inventory,
      ordersCount: shop.orders?.length || 0,
    }),
  });

  if (!res.ok) {
    throw new Error(`ERP Webhook javob xatosi (${res.status})`);
  }

  const syncedAt = nowIsoShort();
  erp.lastSyncAt = syncedAt;
  erp.lastSyncStatus = `HTTP ${res.status} OK`;
  await saveDatabase();
  return { syncedAt, status: erp.lastSyncStatus };
}
