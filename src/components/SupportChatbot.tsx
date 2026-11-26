import React, { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Check,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Send,
  X,
} from 'lucide-react';
import { AppView, DashboardTab, Language } from '../types';
import { api } from '../utils/api';
import { SavdoPilotLogo } from './SavdoPilotLogo';

interface SupportChatbotProps {
  lang: Language;
  onNavigateView: (view: AppView, tab?: DashboardTab) => void;
}

interface BotChatItem {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  showEmail?: boolean;
  isError?: boolean;
}

const ADMIN_EMAIL = 'nigmatullayevamaftuna22@gmail.com';
const TELEGRAM_HANDLE = '@Nigmatullayeva_22';
const PHONE_NUMBER = '+998 91 567 21 07';

export const SupportChatbot: React.FC<SupportChatbotProps> = ({
  lang,
  onNavigateView,
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<BotChatItem[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text:
        lang === 'uz'
          ? "Assalomu alaykum! Men SavdoPilot Gemini AI yordamchisiman. Tariflar, SKU tushunchasi, AI savdo boti yoki admin bilan bog'lanish bo'yicha istalgan savolingizga javob beraman."
          : 'Hello! I am the SavdoPilot Gemini AI Assistant. Ask me anything about pricing plans, SKUs, integrations, or contacting the admin.',
    },
  ]);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, open, isLoading]);

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(ADMIN_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resolveSuggestedAction = (
    route?: 'inventory' | 'sales-bot' | 'login'
  ): BotChatItem['action'] | undefined => {
    if (route === 'inventory') {
      return {
        label: lang === 'uz' ? 'Ombor jadvalini ko‘rish' : 'View Inventory Table',
        onClick: () => {
          onNavigateView('dashboard', 'inventory');
          setOpen(false);
        },
      };
    }
    if (route === 'sales-bot') {
      return {
        label: lang === 'uz' ? 'AI Botni sinab ko‘rish' : 'Try AI Sales Bot',
        onClick: () => {
          onNavigateView('dashboard', 'sales-bot');
          setOpen(false);
        },
      };
    }
    if (route === 'login') {
      return {
        label: lang === 'uz' ? 'Kirish sahifasiga o‘tish' : 'Go to Login Page',
        onClick: () => {
          onNavigateView('login');
          setOpen(false);
        },
      };
    }
    return undefined;
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: BotChatItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.askPublicAssistant({ question: trimmed, lang });
      const botMsg: BotChatItem = {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: res.replyText,
        showEmail: res.includeContact,
        action: resolveSuggestedAction(res.suggestedRoute),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : lang === 'uz'
          ? "AI yordamchi bilan ulanishda xato yuz berdi."
          : 'Failed to reach AI assistant.';
      setMessages((prev) => [
        ...prev,
        {
          id: `b-err-${Date.now() + 1}`,
          sender: 'bot',
          text: errMsg,
          showEmail: true,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions =
    lang === 'uz'
      ? ['SKU nima?', 'Tariflar qancha?', 'Demo login', "Admin bilan bog'lanish"]
      : ['What is SKU?', 'Pricing plans?', 'Demo login', 'Contact Admin'];

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40">
      {open ? (
        <div className="flex h-[min(460px,calc(100dvh-6rem))] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-[#0F172A] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <SavdoPilotLogo size="md" showWordmark={false} />
              <div>
                <p className="font-display text-sm font-bold leading-tight">
                  SavdoPilot Yordamchi
                </p>
                <p className="text-[11px] text-slate-300">
                  {lang === 'uz' ? 'Tezkor savol-javob boti' : 'Instant Support Assistant'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/70 p-3.5 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white'
                      : msg.isError
                      ? 'border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200'
                      : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {msg.text}

                  {msg.showEmail && (
                    <div className="mt-2.5 space-y-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 p-2.5">
                      <a
                        href="https://t.me/Nigmatullayeva_22"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 font-mono-num text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:underline"
                      >
                        <Send className="h-3.5 w-3.5 shrink-0" />
                        <span>{TELEGRAM_HANDLE}</span>
                      </a>
                      <a
                        href="tel:+998915672107"
                        className="flex items-center gap-1.5 font-mono-num text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{PHONE_NUMBER}</span>
                      </a>
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={`mailto:${ADMIN_EMAIL}`}
                          className="inline-flex items-center gap-1.5 font-mono-num text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:underline truncate"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{ADMIN_EMAIL}</span>
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyEmail}
                          className="rounded p-1 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer shrink-0"
                          title={lang === 'uz' ? 'Nusxa olish' : 'Copy email'}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.action && (
                    <button
                      type="button"
                      onClick={msg.action.onClick}
                      className="mt-2.5 inline-flex items-center rounded-md bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      {msg.action.label} →
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-[11px] text-indigo-600 dark:text-indigo-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  {lang === 'uz' ? 'Gemini AI javob yozmoqda...' : 'Gemini AI is thinking...'}
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick Chips */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 pt-2.5 pb-1.5 flex flex-wrap gap-1.5">
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isLoading}
                onClick={() => void sendMessage(q)}
                className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
          >
            <input
              type="text"
              value={input}
              disabled={isLoading}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                lang === 'uz' ? 'Savolingizni yozing...' : 'Ask a question...'
              }
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shrink-0"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          aria-label="Open support chatbot"
        >
          <MessageSquare className="h-4 w-4" />
          <span>{lang === 'uz' ? 'Yordam boti' : 'AI Help'}</span>
        </button>
      )}
    </div>
  );
};
