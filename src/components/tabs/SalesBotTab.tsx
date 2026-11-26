import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Car,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileAudio,
  Instagram,
  Loader2,
  Mic,
  Package,
  Send,
  ShoppingBag,
  Square,
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
    sendToPlatform?: boolean,
    options?: { isVoice?: boolean; voiceDuration?: string }
  ) => Promise<void>;
  onSendVoiceMessage?: (
    conversationId: string,
    payload: {
      audioBase64: string;
      mimeType: string;
      duration: string;
      sendToPlatform?: boolean;
    }
  ) => Promise<void>;
  onMarkOrderPaid?: (orderId: string) => Promise<void>;
  onDispatchOrder?: (orderId: string) => Promise<void>;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.max(1, seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const SalesBotTab: React.FC<SalesBotTabProps> = ({
  lang,
  conversations,
  activeConversationId,
  onSelectConversation,
  inventory,
  onSendTestMessage,
  onSendVoiceMessage,
  onMarkOrderPaid,
  onDispatchOrder,
}) => {
  const t = COPY[lang].salesBot;
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendToPlatform, setSendToPlatform] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [busyOrderAction, setBusyOrderAction] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordSecondsRef = useRef<number>(0);

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

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (!activeConv || !contextProduct) {
    return null;
  }

  const dispatchMessage = async (
    text: string,
    options?: { isVoice?: boolean; voiceDuration?: string }
  ) => {
    if (!text.trim() || isSending) return;
    setSendError('');
    setIsSending(true);
    try {
      await onSendTestMessage(
        activeConv.id,
        text.trim(),
        Boolean(activeConv.externalChatId && sendToPlatform),
        options
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

  const sendRecordedAudioBlob = async (blob: Blob, durationSec: number) => {
    if (!onSendVoiceMessage) return;
    setSendError('');
    setIsSending(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const commaIdx = result.indexOf(',');
          resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error('Failed to read audio stream.'));
        reader.readAsDataURL(blob);
      });
      await onSendVoiceMessage(activeConv.id, {
        audioBase64: base64,
        mimeType: blob.type || 'audio/webm',
        duration: formatDuration(durationSec),
        sendToPlatform: Boolean(activeConv.externalChatId && sendToPlatform),
      });
    } catch (err: unknown) {
      setSendError(
        err instanceof Error
          ? err.message
          : lang === 'uz'
          ? 'Ovozli xabarni transkripsiya qilishda xatolik'
          : 'Voice transcription failed'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleMicRecording = async () => {
    if (isSending) return;

    if (isRecording) {
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    setSendError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSendError(
        lang === 'uz'
          ? "Brauzerda mikrofon yozish qo'llab-quvvatlanmaydi. Audio fayl yuklang yoki matn yozing."
          : 'Microphone recording is not supported in this browser. Upload an audio file instead.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordSecondsRef.current = 0;
      setRecordingSeconds(0);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType.split(';')[0] });
        if (finalBlob.size > 0) {
          void sendRecordedAudioBlob(finalBlob, recordSecondsRef.current);
        }
      };

      recorder.start();
      setIsRecording(true);
      recordTimerRef.current = window.setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordingSeconds(recordSecondsRef.current);
        if (recordSecondsRef.current >= 45 && mediaRecorderRef.current?.state === 'recording') {
          if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 1000);
    } catch {
      setSendError(
        lang === 'uz'
          ? 'Mikrofonga ruxsat berilmadi. Brauzer sozlamasidan mikrofonni yoqing yoki audio fayl yuklang.'
          : 'Microphone permission denied. Allow microphone access or upload an audio file.'
      );
    }
  };

  const handleAudioFileUpload = async (file: File) => {
    if (isSending) return;
    await sendRecordedAudioBlob(file, Math.max(3, Math.round(file.size / 16000)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void dispatchMessage(draft);
  };

  const handleChipClick = (chipText: string) => {
    void dispatchMessage(chipText);
  };

  const handleSimulatedVoice = () => {
    const productHint =
      contextProduct.id === 'prod-krossovka'
        ? "Assalomu alaykum brat, krossovka 42 razmer bormi? Chilonzorga dastavka nechi pul bo'ladi?"
        : `Assalomu alaykum brat, ${contextProduct.nameUz.toLowerCase()} nalichida bormi, Chilonzorga dastavka nechi pul bo'ladi?`;
    void dispatchMessage(productHint, { isVoice: true, voiceDuration: '0:05' });
  };

  return (
    <div className="grid h-[calc(100dvh-9.5rem)] min-h-[540px] lg:h-[calc(100vh-11rem)] lg:min-h-[600px] grid-cols-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:grid-cols-12">
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

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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

                  {conv.tags && conv.tags.length > 0 && (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      {conv.tags.slice(0, 3).join(' · ')}
                    </span>
                  )}
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
                  {/* Simulated Voice Message Pill + AI Transcription */}
                  {msg.isVoice && (
                    <div className="mb-2 rounded-lg bg-indigo-700/80 border border-indigo-400/40 px-3 py-2 text-xs text-white">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <Mic className="h-3.5 w-3.5" />
                          <span>
                            {lang === 'uz' ? 'Ovozli xabar' : 'Voice message'} ({msg.voiceDuration || '0:06'})
                          </span>
                        </span>
                        <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold">
                          {lang === 'uz' ? 'AI Transkripsiya' : 'AI Transcript'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 opacity-80" aria-hidden="true">
                        {[10, 18, 12, 22, 16, 24, 14, 20, 11, 17, 13, 19, 10, 15, 9].map((h, idx) => (
                          <span
                            key={idx}
                            className="w-1 rounded-full bg-white/80"
                            style={{ height: `${Math.max(4, Math.round(h * 0.55))}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.isVoice ? (
                    <p className="text-sm leading-relaxed">“{msg.voiceTranscript || msg.text}”</p>
                  ) : (
                    msg.text
                  )}

                  {/* Click / Payme In-Chat Payment Card */}
                  {msg.paymentCard && (
                    <div
                      className={`mt-3 rounded-lg border p-3 text-xs text-slate-800 dark:text-slate-100 ${
                        msg.paymentCard.status === 'paid'
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/60'
                          : 'border-amber-200 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                          <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>
                            {lang === 'uz' ? "To'lov:" : 'Payment:'}{' '}
                            <span className="font-mono-num">
                              {formatUZS(msg.paymentCard.amount, lang)}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            msg.paymentCard.status === 'paid'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            {msg.paymentCard.provider}{' '}
                            {msg.paymentCard.status === 'paid'
                              ? lang === 'uz'
                                ? "orqali to'landi"
                                : 'Paid'
                              : lang === 'uz'
                              ? 'kutilmoqda'
                              : 'Pending'}
                          </span>
                        </span>
                      </div>

                      {msg.paymentCard.status === 'pending' && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-amber-200/70 dark:border-amber-800/70 pt-2">
                          {msg.paymentCard.paymentUrl &&
                            msg.paymentCard.paymentUrl.startsWith('https://') && (
                              <a
                                href={msg.paymentCard.paymentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                              >
                                <span>
                                  {msg.paymentCard.provider}{' '}
                                  {lang === 'uz' ? "orqali to'lash" : 'Pay Now'}
                                </span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          {msg.paymentCard.orderId && onMarkOrderPaid && (
                            <button
                              type="button"
                              disabled={busyOrderAction === `pay-${msg.paymentCard.orderId}`}
                              onClick={async () => {
                                if (!msg.paymentCard?.orderId) return;
                                setBusyOrderAction(`pay-${msg.paymentCard.orderId}`);
                                try {
                                  await onMarkOrderPaid(msg.paymentCard.orderId);
                                } finally {
                                  setBusyOrderAction(null);
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 cursor-pointer disabled:opacity-50"
                            >
                              {busyOrderAction === `pay-${msg.paymentCard.orderId}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              <span>
                                {lang === 'uz' ? "To'lovni tasdiqlash" : 'Mark Paid'}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Yandex Delivery Status Pill */}
                  {msg.deliveryPill && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <Car className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        <span>
                          {msg.deliveryPill.status === 'delivered'
                            ? lang === 'uz'
                              ? 'Yetkazib berildi'
                              : 'Delivered'
                            : msg.deliveryPill.status === 'dispatched'
                            ? lang === 'uz'
                              ? `Yandex Kuryer yo‘lda (${msg.deliveryPill.claimId || 'active'}) • ${msg.deliveryPill.etaMinutes} daq`
                              : `Courier dispatched (${msg.deliveryPill.claimId || 'active'}) • ${msg.deliveryPill.etaMinutes} min`
                            : lang === 'uz'
                            ? `Yetkazish tayyor • ~${msg.deliveryPill.etaMinutes} daqiqa`
                            : `Ready for dispatch • ~${msg.deliveryPill.etaMinutes} min`}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        {msg.deliveryPill.address && (
                          <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                            {msg.deliveryPill.address}
                          </span>
                        )}
                        {msg.orderCreated?.orderId &&
                          msg.deliveryPill.status !== 'dispatched' &&
                          msg.deliveryPill.status !== 'delivered' &&
                          onDispatchOrder && (
                            <button
                              type="button"
                              disabled={busyOrderAction === `disp-${msg.orderCreated.orderId}`}
                              onClick={async () => {
                                if (!msg.orderCreated?.orderId) return;
                                setBusyOrderAction(`disp-${msg.orderCreated.orderId}`);
                                try {
                                  await onDispatchOrder(msg.orderCreated.orderId);
                                } finally {
                                  setBusyOrderAction(null);
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-700 cursor-pointer disabled:opacity-50"
                            >
                              {busyOrderAction === `disp-${msg.orderCreated.orderId}` && (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              )}
                              <span>{lang === 'uz' ? 'Kuryer chaqirish' : 'Dispatch'}</span>
                            </button>
                          )}
                      </div>
                    </div>
                  )}

                  {msg.orderCreated && (
                    <div className="mt-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs text-slate-800 dark:text-slate-100">
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

          <form onSubmit={handleSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <button
              type="button"
              disabled={isSending}
              onClick={() => void handleToggleMicRecording()}
              title={
                lang === 'uz'
                  ? 'Mikrofondan haqiqiy ovozli xabar yozish (Gemini transkripsiya)'
                  : 'Record real voice message via microphone'
              }
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 ${
                isRecording
                  ? 'border-rose-500 bg-rose-600 text-white animate-pulse'
                  : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current shrink-0" />
                  <span className="font-mono-num">
                    {lang === 'uz' ? 'Yuborish' : 'Stop'} · {formatDuration(recordingSeconds)}
                  </span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">
                    {lang === 'uz' ? 'Ovoz yozish' : 'Record Voice'}
                  </span>
                </>
              )}
            </button>

            <label
              title={
                lang === 'uz'
                  ? 'Audio fayl yuklash (.mp3, .ogg, .wav)'
                  : 'Upload audio file (.mp3, .ogg, .wav)'
              }
              className={`inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shrink-0 ${
                isSending || isRecording ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <FileAudio className="h-4 w-4" />
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void handleAudioFileUpload(file);
                }}
              />
            </label>

            <input
              type="text"
              value={draft}
              disabled={isSending || isRecording}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="flex-1 min-w-[140px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={isSending || isRecording}
              onClick={handleSimulatedVoice}
              title={lang === 'uz' ? 'Tezkor namuna ovoz xabari' : 'Quick sample voice prompt'}
              className="hidden md:inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              {lang === 'uz' ? 'Namuna' : 'Sample'}
            </button>
            <button
              type="submit"
              disabled={!draft.trim() || isSending || isRecording}
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
