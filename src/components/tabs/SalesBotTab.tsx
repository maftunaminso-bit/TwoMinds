import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Instagram,
  Loader2,
  Package,
  Send,
  ShoppingBag,
} from 'lucide-react';
import { COPY, formatUZS } from '../../i18n';
import { Conversation, InventoryItem, Language, Platform } from '../../types';

interface SalesBotTabProps {
  lang: Language;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  inventory: InventoryItem[];
  onSendTestMessage: (
    conversationId: string,
    text: string,
    sendToPlatform?: boolean
  ) => Promise<void>;
}

export const SalesBotTab: React.FC<SalesBotTabProps> = ({
  lang,
  conversations,
  activeConversationId,
  onSelectConversation,
  inventory,
  onSendTestMessage,
}) => {
  const t = COPY[lang].salesBot;
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendToPlatform, setSendToPlatform] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredConversations = conversations.filter((c) =>
    platformFilter === 'all' ? true : c.platform === platformFilter
  );

  const activeConv =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const contextProduct =
    inventory.find((i) => i.id === activeConv?.contextProductId) || inventory[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length, activeConv?.id, mobileShowChat, isSending]);

  if (!activeConv || !contextProduct) {
    return null;
  }

  const dispatchMessage = async (text: string) => {
    if (!text.trim() || isSending) return;
    setSendError('');
    setIsSending(true);
    try {
      await onSendTestMessage(
        activeConv.id,
        text.trim(),
        Boolean(activeConv.externalChatId && sendToPlatform)
      );
      setDraft('');
    } catch (err: unknown) {
      setSendError(
        err instanceof Error
          ? err.message
          : lang === 'uz'
          ? 'AI javob olishda xatolik yuz berdi'
          : 'Failed to generate AI reply'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void dispatchMessage(draft);
  };

  const handleChipClick = (chipText: string) => {
    void dispatchMessage(chipText);
  };

  return (
    <div className="grid h-[calc(100dvh-9.5rem)] min-h-[520px] lg:h-[calc(100vh-11rem)] lg:min-h-[600px] grid-cols-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:grid-cols-12">
      {/* Left Column: Unified Conversations Inbox (master list on mobile) */}
      <div
        className={`${
          mobileShowChat ? 'hidden lg:flex' : 'flex'
        } flex-col border-b border-slate-200 dark:border-slate-800 lg:col-span-4 lg:border-b-0 lg:border-r h-full overflow-hidden`}
      >
        <div className="border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            {(['all', 'instagram', 'telegram'] as const).map((plat) => (
              <button
                key={plat}
                type="button"
                onClick={() => setPlatformFilter(plat)}
                className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  platformFilter === plat
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {plat === 'all'
                  ? t.filterAll
                  : plat === 'instagram'
                  ? 'Instagram'
                  : 'Telegram'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredConversations.map((conv) => {
            const isSelected = conv.id === activeConv.id;
            const lastMsg = conv.messages[conv.messages.length - 1];
            const isConfirmed = conv.status === 'order_confirmed';

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => {
                  onSelectConversation(conv.id);
                  setSendError('');
                  setMobileShowChat(true);
                }}
                className={`w-full text-left p-4 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-800 text-xs font-bold text-white">
                      {conv.initials}
                      <span
                        className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white dark:border-slate-900 ${
                          conv.platform === 'instagram'
                            ? 'bg-rose-500 text-white'
                            : 'bg-sky-500 text-white'
                        }`}
                      >
                        {conv.platform === 'instagram' ? (
                          <Instagram className="h-2.5 w-2.5" />
                        ) : (
                          <Send className="h-2.5 w-2.5" />
                        )}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {conv.customerName}
                        </p>
                        {conv.externalChatId && (
                          <span className="rounded bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                            Live
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {conv.handle}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono-num text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                    {conv.lastActive}
                  </span>
                </div>

                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                  {lastMsg?.text}
                </p>

                <div className="mt-2.5 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                      isConfirmed
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    {isConfirmed ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                    {t.statusLabels[conv.status]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Chat & Live Inventory Demo */}
      <div
        className={`${
          mobileShowChat ? 'flex' : 'hidden lg:flex'
        } flex-col lg:col-span-8 h-full overflow-hidden`}
      >
        {/* Chat Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 px-3.5 py-3 sm:px-5 sm:py-3.5 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileShowChat(false)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 lg:hidden cursor-pointer shrink-0"
              aria-label={lang === 'uz' ? 'Suhbatlarga qaytish' : 'Back to conversations'}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                activeConv.platform === 'instagram'
                  ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  : 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
              }`}
            >
              {activeConv.platform === 'instagram' ? (
                <Instagram className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {activeConv.customerName}
                </h3>
                <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-600">·</span>
                <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
                  {activeConv.platform === 'instagram' ? 'Instagram DM' : 'Telegram Bot'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {lang === 'uz' ? 'Mavzu:' : 'Context:'}{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {lang === 'uz' ? contextProduct.nameUz : contextProduct.nameEn}
                </span>
              </p>
            </div>
          </div>

          {/* Live Stock Context Sync Badge */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs shrink-0">
            <Package className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline text-slate-600 dark:text-slate-300">
              {t.liveStockLabel}:
            </span>
            <span
              className={`font-mono-num font-bold ${
                contextProduct.stock <= 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : contextProduct.stock <= 5
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {contextProduct.stock} {lang === 'uz' ? 'dona' : 'pcs'}
            </span>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">|</span>
            <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
              {formatUZS(contextProduct.sellPrice, lang)}
            </span>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto bg-slate-50/70 dark:bg-slate-950/60 p-3.5 sm:p-5 space-y-4">
          {activeConv.messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
              >
                <div className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {isAi && <Bot className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                  <span className="font-medium">
                    {isAi ? 'SavdoPilot AI' : activeConv.customerName}
                  </span>
                  {isAi && msg.aiPowered && (
                    <span className="rounded bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                      Gemini AI
                    </span>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[90%] sm:max-w-xl rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed whitespace-pre-line ${
                    isAi
                      ? 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {msg.text}

                  {msg.orderCreated && (
                    <div className="mt-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs text-slate-800 dark:text-slate-100">
                      <div className="flex items-center justify-between gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                        <span className="inline-flex items-center gap-1.5">
                          <ShoppingBag className="h-3.5 w-3.5" />
                          {t.orderBadge}
                        </span>
                        <span className="font-mono-num">{msg.orderCreated.orderId}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-200/80 dark:border-emerald-800/80 pt-2 text-slate-700 dark:text-slate-300">
                        <span>{msg.orderCreated.productName}</span>
                        <span className="font-mono-num font-semibold">
                          {formatUZS(msg.orderCreated.price, lang)} ·{' '}
                          {lang === 'uz'
                            ? `Qoldiq: ${msg.orderCreated.remainingStock} dona`
                            : `Stock: ${msg.orderCreated.remainingStock} left`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>
                {lang === 'uz'
                  ? 'Gemini AI omborni tekshirib javob yozmoqda...'
                  : 'Gemini AI is checking live stock and writing reply...'}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Interactive Prompt & Live Channel Reply Area */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 space-y-2.5">
          {sendError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{sendError}</span>
            </div>
          )}

          {activeConv.externalChatId && (
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={sendToPlatform}
                onChange={(e) => setSendToPlatform(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                {lang === 'uz'
                  ? `AI javobini haqiqiy ${activeConv.platform === 'telegram' ? 'Telegram' : 'Instagram'} mijoziga ham yuborish`
                  : `Also send AI reply to real ${activeConv.platform === 'telegram' ? 'Telegram' : 'Instagram'} user`}
              </span>
            </label>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap shrink-0">
              {t.quickChipsTitle}
            </span>
            {t.chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isSending}
                onClick={() => handleChipClick(chip)}
                className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              disabled={isSending}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isSending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 sm:px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline">{t.sendBtn}</span>
              {isSending ? (
                <Loader2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
