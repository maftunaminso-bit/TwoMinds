import React, { useState } from 'react';
import {
  Car,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Database,
  Instagram,
  Link2,
  Loader2,
  RefreshCw,
  Send,
  ShoppingBag,
  Trash2,
  Webhook,
} from 'lucide-react';
import { formatUZS } from '../../i18n';
import type { EcosystemIntegrations, Language, ShopWorkspace } from '../../types';

interface ChannelsTabProps {
  lang: Language;
  shop: ShopWorkspace;
  onConnectTelegram: (payload: {
    botToken: string;
    mode: 'webhook' | 'polling';
    channelUsername?: string;
  }) => Promise<void>;
  onDisconnectTelegram: () => Promise<void>;
  onConnectInstagram: (payload: {
    pageId: string;
    igAccountId: string;
    igUsername?: string;
    accessToken: string;
    verifyToken?: string;
  }) => Promise<void>;
  onDisconnectInstagram: () => Promise<void>;
  onTestInstagramWebhook: (payload: { username?: string; text: string }) => Promise<void>;
  onToggleEcosystem?: (payload: Partial<EcosystemIntegrations>) => Promise<void>;
  onRefreshShop: () => Promise<void>;
}

export const ChannelsTab: React.FC<ChannelsTabProps> = ({
  lang,
  shop,
  onConnectTelegram,
  onDisconnectTelegram,
  onConnectInstagram,
  onDisconnectInstagram,
  onTestInstagramWebhook,
  onToggleEcosystem,
  onRefreshShop,
}) => {
  const tg = shop.channelIntegrations?.telegram;
  const ig = shop.channelIntegrations?.instagram;
  const eco = shop.ecosystemIntegrations || {
    instagramConnected: shop.channels.instagram,
    instagramChatsToday: 84,
    telegramConnected: shop.channels.telegram,
    telegramChatsToday: 64,
    clickPaymeConnected: true,
    yandexDeliveryConnected: true,
    erpSyncConnected: false,
  };
  const orders = shop.orders || [];

  // Telegram form state
  const [tgToken, setTgToken] = useState('');
  const [tgMode, setTgMode] = useState<'polling' | 'webhook'>(tg?.mode || 'polling');
  const [tgChannel, setTgChannel] = useState(tg?.channelUsername || '');
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState('');

  // Instagram form state
  const [igPageId, setIgPageId] = useState(ig?.pageId || '');
  const [igAccountId, setIgAccountId] = useState(ig?.igAccountId || '');
  const [igUsername, setIgUsername] = useState(ig?.igUsername || '');
  const [igAccessToken, setIgAccessToken] = useState('');
  const [igVerifyToken, setIgVerifyToken] = useState(ig?.verifyToken || '');
  const [igLoading, setIgLoading] = useState(false);
  const [igError, setIgError] = useState('');

  // Test IG webhook state
  const [testIgMessage, setTestIgMessage] = useState(
    'Salom, Qora Oversize Kurtka L razmer bormi? Narxi qancha?'
  );
  const [testIgLoading, setTestIgLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const originBase =
    typeof window !== 'undefined' ? window.location.origin : '';
  const tgWebhookFullUrl =
    tg?.webhookUrl?.startsWith('http')
      ? tg.webhookUrl
      : `${originBase}${tg?.webhookUrl || `/api/webhooks/telegram/${shop.id}`}`;
  const igWebhookFullUrl =
    ig?.webhookUrl?.startsWith('http')
      ? ig.webhookUrl
      : `${originBase}${ig?.webhookUrl || '/api/webhooks/instagram'}`;

  const copyText = (key: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTgError('');
    setTgLoading(true);
    try {
      await onConnectTelegram({
        botToken: tgToken,
        mode: tgMode,
        channelUsername: tgChannel || undefined,
      });
      setTgToken('');
    } catch (err: unknown) {
      setTgError(err instanceof Error ? err.message : 'Telegram ulanish xatosi');
    } finally {
      setTgLoading(false);
    }
  };

  const handleIgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIgError('');
    setIgLoading(true);
    try {
      await onConnectInstagram({
        pageId: igPageId,
        igAccountId,
        igUsername: igUsername || undefined,
        accessToken: igAccessToken,
        verifyToken: igVerifyToken || undefined,
      });
      setIgAccessToken('');
    } catch (err: unknown) {
      setIgError(err instanceof Error ? err.message : 'Instagram ulanish xatosi');
    } finally {
      setIgLoading(false);
    }
  };

  const handleRunTestWebhook = async () => {
    if (!testIgMessage.trim()) return;
    setTestIgLoading(true);
    setIgError('');
    try {
      await onTestInstagramWebhook({
        username: 'malika_uz',
        text: testIgMessage.trim(),
      });
    } catch (err: unknown) {
      setIgError(err instanceof Error ? err.message : 'Test webhook xatosi');
    } finally {
      setTestIgLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshShop();
    } finally {
      setRefreshing(false);
    }
  };

  const handleEcoToggle = async (
    key: keyof Pick<
      EcosystemIntegrations,
      | 'instagramConnected'
      | 'telegramConnected'
      | 'clickPaymeConnected'
      | 'yandexDeliveryConnected'
      | 'erpSyncConnected'
    >,
    currentVal: boolean
  ) => {
    if (!onToggleEcosystem || togglingKey) return;
    setTogglingKey(key);
    try {
      await onToggleEcosystem({ [key]: !currentVal });
    } finally {
      setTogglingKey(null);
    }
  };

  const ecosystemCards: Array<{
    key: keyof Pick<
      EcosystemIntegrations,
      | 'instagramConnected'
      | 'telegramConnected'
      | 'clickPaymeConnected'
      | 'yandexDeliveryConnected'
      | 'erpSyncConnected'
    >;
    title: string;
    connectedText: string;
    disconnectedText: string;
    enabled: boolean;
    icon: React.ComponentType<{ className?: string }>;
    toneClass: string;
  }> = [
    {
      key: 'instagramConnected',
      title: 'Instagram Business API',
      connectedText:
        lang === 'uz'
          ? `Ulangan · Bugun ${eco.instagramChatsToday} ta chat`
          : `Connected · ${eco.instagramChatsToday} chats today`,
      disconnectedText: lang === 'uz' ? "O'chirilgan" : 'Paused',
      enabled: eco.instagramConnected,
      icon: Instagram,
      toneClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    },
    {
      key: 'telegramConnected',
      title: 'Telegram Bot API',
      connectedText:
        lang === 'uz'
          ? `Ulangan · Bugun ${eco.telegramChatsToday} ta chat`
          : `Connected · ${eco.telegramChatsToday} chats today`,
      disconnectedText: lang === 'uz' ? "O'chirilgan" : 'Paused',
      enabled: eco.telegramConnected,
      icon: Send,
      toneClass: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800',
    },
    {
      key: 'clickPaymeConnected',
      title: 'Click & Payme Merchant',
      connectedText:
        lang === 'uz'
          ? 'Ulangan · Avto-hisob faol'
          : 'Connected · Auto-invoice active',
      disconnectedText: lang === 'uz' ? 'Ulanmagan' : 'Disconnected',
      enabled: eco.clickPaymeConnected,
      icon: CreditCard,
      toneClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    },
    {
      key: 'yandexDeliveryConnected',
      title: 'Yandex Delivery & BTS Pochta',
      connectedText:
        lang === 'uz'
          ? 'Ulangan · Kuryer avto-chaqiruv faol'
          : 'Connected · Auto-dispatch active',
      disconnectedText: lang === 'uz' ? 'Ulanmagan' : 'Disconnected',
      enabled: eco.yandexDeliveryConnected,
      icon: Car,
      toneClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    {
      key: 'erpSyncConnected',
      title: 'BILLZ / MoySklad Sync',
      connectedText:
        lang === 'uz'
          ? '2-tomonlama ombor sinxron faol'
          : '2-way stock sync active',
      disconnectedText:
        lang === 'uz' ? 'Ixtiyoriy 2-tomonlama sinxron' : 'Optional 2-way sync',
      enabled: eco.erpSyncConnected,
      icon: Database,
      toneClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Info Strip */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {lang === 'uz'
              ? '1-Klik Mahalliy Ekotizim va Kanallar'
              : '1-Click Local Ecosystem & Live Channels'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {lang === 'uz'
              ? "Click, Payme, Yandex Delivery, BILLZ/MoySklad hamda haqiqiy Telegram Bot va Instagram API ulanishlarini boshqaring."
              : 'Toggle local payment, courier & ERP integrations alongside your live Telegram Bot and Instagram Graph API.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{lang === 'uz' ? 'Holatni yangilash' : 'Sync Status'}</span>
        </button>
      </div>

      {/* 1-Click Local Ecosystem Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {ecosystemCards.map((card) => {
          const CardIcon = card.icon;
          const isBusy = togglingKey === card.key;
          return (
            <div
              key={card.key}
              className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border ${card.toneClass}`}
                  >
                    <CardIcon className="h-4 w-4" />
                  </span>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={card.enabled}
                    disabled={isBusy}
                    onClick={() => void handleEcoToggle(card.key, card.enabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      card.enabled
                        ? 'bg-emerald-600'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    aria-label={card.title}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        card.enabled ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {card.title}
                </h3>
              </div>

              <p
                className={`mt-2 text-xs font-medium ${
                  card.enabled
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {card.enabled ? card.connectedText : card.disconnectedText}
              </p>
            </div>
          );
        })}
      </div>

      {/* 2-Column Channel Setup Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* TELEGRAM BOT CARD */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Telegram Bot API
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'uz'
                      ? 'Polling yoki HTTPS Webhook orqali real vaqtda javob'
                      : 'Real-time customer replies via Polling or HTTPS Webhook'}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  tg?.connected
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tg?.connected ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{tg.botUsername || 'Connected'}</span>
                  </>
                ) : (
                  <span>{lang === 'uz' ? 'Ulanmagan' : 'Not Connected'}</span>
                )}
              </span>
            </div>

            {tg?.connected && (
              <div className="mt-4 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {tg.botName} ({tg.botUsername})
                  </span>
                  <span className="font-mono-num text-emerald-700 dark:text-emerald-400">
                    {tg.maskedToken} · {tg.mode === 'webhook' ? 'Webhook' : 'Live Polling'}
                  </span>
                </div>
                {tg.channelUsername && (
                  <p className="text-emerald-800 dark:text-emerald-300">
                    {lang === 'uz' ? 'Aksiya kanali:' : 'Promo channel:'}{' '}
                    <span className="font-mono-num font-semibold">{tg.channelUsername}</span>
                  </p>
                )}
                {tg.lastSyncAt && (
                  <p className="text-emerald-700 dark:text-emerald-400">
                    {lang === 'uz' ? 'Oxirgi faollik:' : 'Last activity:'}{' '}
                    <span className="font-mono-num">{tg.lastSyncAt}</span>
                  </p>
                )}
                {tg.lastError && (
                  <p className="text-rose-700 dark:text-rose-300 font-medium">
                    {tg.lastError}
                  </p>
                )}
              </div>
            )}

            {tgError && (
              <div className="mt-4 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                {tgError}
              </div>
            )}

            <form onSubmit={handleTgSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'uz' ? 'Telegram Bot Token (@BotFather)' : 'Telegram Bot Token (@BotFather)'}
                </label>
                <input
                  type="password"
                  required
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="7482910421:AAH..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'uz' ? 'Ulanish rejimi' : 'Connection Mode'}
                  </label>
                  <select
                    value={tgMode}
                    onChange={(e) => setTgMode(e.target.value as 'polling' | 'webhook')}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="polling">
                      {lang === 'uz' ? 'Live Polling (Tezkor sinov)' : 'Live Polling (Instant)'}
                    </option>
                    <option value="webhook">
                      {lang === 'uz' ? 'HTTPS Webhook (Production)' : 'HTTPS Webhook (Production)'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'uz' ? 'Aksiya kanali (@username, ixtiyoriy)' : 'Promo Channel (@username, optional)'}
                  </label>
                  <input
                    type="text"
                    value={tgChannel}
                    onChange={(e) => setTgChannel(e.target.value)}
                    placeholder="@modahub_uz"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Webhook Endpoint:
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText('tg-url', tgWebhookFullUrl)}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copiedKey === 'tg-url' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedKey === 'tg-url' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400 break-all">
                  {tgWebhookFullUrl}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={tgLoading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {tgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  <span>
                    {tg?.connected
                      ? lang === 'uz'
                        ? 'Botni Yangilash'
                        : 'Update Bot Connection'
                      : lang === 'uz'
                      ? 'Botni Ulash va Ishga Tushirish'
                      : 'Connect & Activate Bot'}
                  </span>
                </button>

                {tg?.connected && (
                  <button
                    type="button"
                    onClick={onDisconnectTelegram}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{lang === 'uz' ? 'Uzish' : 'Disconnect'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          <p className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {lang === 'uz'
              ? "Qadam: Telegram'da @BotFather ga /newbot yozing -> tokenni shu yerga kiriting -> botingizga /start yuboring. Xabarlar shu zahoti AI Savdo Botida paydo bo'ladi."
              : 'Steps: Send /newbot to @BotFather -> paste token above -> message /start to your bot. Live chats appear immediately in AI Sales Bot.'}
          </p>
        </div>

        {/* INSTAGRAM DM (META GRAPH API) CARD */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
                  <Instagram className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Instagram DM (Meta Graph API)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'uz'
                      ? 'Instagram Business DM xabarlariga avtomatik AI javob'
                      : 'Automated AI replies for Instagram Business Direct'}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  ig?.connected
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {ig?.connected ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{ig.igUsername || ig.igAccountId}</span>
                  </>
                ) : (
                  <span>{lang === 'uz' ? 'Ulanmagan' : 'Not Connected'}</span>
                )}
              </span>
            </div>

            {ig?.connected && (
              <div className="mt-4 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 space-y-1.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                    IG ID: <span className="font-mono-num">{ig.igAccountId}</span>
                  </span>
                  <span className="font-mono-num text-emerald-700 dark:text-emerald-400">
                    {ig.maskedToken}
                  </span>
                </div>
                {ig.lastSyncAt && (
                  <p className="text-emerald-700 dark:text-emerald-400">
                    {lang === 'uz' ? 'Oxirgi faollik:' : 'Last activity:'}{' '}
                    <span className="font-mono-num">{ig.lastSyncAt}</span>
                  </p>
                )}
              </div>
            )}

            {igError && (
              <div className="mt-4 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                {igError}
              </div>
            )}

            <form onSubmit={handleIgSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Instagram Business Account ID
                  </label>
                  <input
                    type="text"
                    required
                    value={igAccountId}
                    onChange={(e) => setIgAccountId(e.target.value)}
                    placeholder="17841400000000"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Facebook Page ID / @Username
                  </label>
                  <input
                    type="text"
                    value={igPageId}
                    onChange={(e) => setIgPageId(e.target.value)}
                    placeholder="1029384756"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Meta Page Access Token
                  </label>
                  <input
                    type="password"
                    required
                    value={igAccessToken}
                    onChange={(e) => setIgAccessToken(e.target.value)}
                    placeholder="EAAGm0PX4ZCps..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Instagram Handle (ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    value={igUsername}
                    onChange={(e) => setIgUsername(e.target.value)}
                    placeholder="@modahub_tashkent"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Meta Webhook Callback Info */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Meta Callback URL:
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText('ig-url', igWebhookFullUrl)}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copiedKey === 'ig-url' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedKey === 'ig-url' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400 break-all">
                  {igWebhookFullUrl}
                </p>

                <div className="flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Verify Token:{' '}
                    <span className="font-mono-num text-slate-900 dark:text-white">
                      {igVerifyToken || ig?.verifyToken}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText('ig-verify', igVerifyToken || ig?.verifyToken || '')}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copiedKey === 'ig-verify' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedKey === 'ig-verify' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="submit"
                  disabled={igLoading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {igLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  <span>
                    {ig?.connected
                      ? lang === 'uz'
                        ? 'Instagramni Yangilash'
                        : 'Update Instagram'
                      : lang === 'uz'
                      ? 'Instagram Graph API Ulash'
                      : 'Connect Instagram API'}
                  </span>
                </button>

                {ig?.connected && (
                  <button
                    type="button"
                    onClick={onDisconnectInstagram}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{lang === 'uz' ? 'Uzish' : 'Disconnect'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Live Webhook Simulator for Instagram */}
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3.5 space-y-2">
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {lang === 'uz'
                ? 'Instagram Webhook Sinovi (Meta tasdiqidan oldin test qilish):'
                : 'Test Instagram DM Webhook Pipeline:'}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testIgMessage}
                onChange={(e) => setTestIgMessage(e.target.value)}
                className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleRunTestWebhook}
                disabled={testIgLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {testIgLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Webhook className="h-3.5 w-3.5" />
                )}
                <span>{lang === 'uz' ? 'Test Webhook' : 'Fire Test'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Orders Ledger */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'uz'
                  ? 'Bot orqali tasdiqlangan real buyurtmalar'
                  : 'Confirmed Bot Orders Ledger'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'uz'
                  ? "Telegram, Instagram DM va Web sinov orqali yaratilgan barcha buyurtmalar"
                  : 'Persistent orders confirmed via Telegram, Instagram DM, and AI Cashier'}
              </p>
            </div>
          </div>
          <span className="font-mono-num text-xs font-semibold text-slate-500 dark:text-slate-400">
            {orders.length} {lang === 'uz' ? 'ta' : 'orders'}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {lang === 'uz'
              ? "Hozircha buyurtmalar yo'q. AI Savdo Boti yoki Telegram botingiz orqali buyurtma bering."
              : 'No orders yet. Confirm an order via AI Sales Bot or your connected Telegram bot.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">{lang === 'uz' ? 'Kanal' : 'Channel'}</th>
                  <th className="px-4 py-3">{lang === 'uz' ? 'Mijoz' : 'Customer'}</th>
                  <th className="px-4 py-3">{lang === 'uz' ? 'Tovar' : 'Product'}</th>
                  <th className="px-4 py-3 text-right">{lang === 'uz' ? 'Summa' : 'Amount'}</th>
                  <th className="px-4 py-3">{lang === 'uz' ? 'Vaqt' : 'Time'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono-num text-xs font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                      {ord.orderId}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                          ord.platform === 'instagram'
                            ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            : 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                        }`}
                      >
                        {ord.platform === 'instagram' ? 'Instagram' : 'Telegram'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {ord.customerName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {ord.handle}
                        {ord.address ? ` · ${ord.address}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-200">
                      {ord.productName}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatUZS(ord.price, lang)}
                    </td>
                    <td className="px-4 py-3 font-mono-num text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {ord.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
