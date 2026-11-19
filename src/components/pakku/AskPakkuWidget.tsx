'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  X,
  Send,
  Mic,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Brain,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Check,
} from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';

interface Message {
  id: string;
  sender: 'user' | 'pakku';
  text: string;
  timestamp: string;
  feedbackGiven?: 'up' | 'down';
}

interface PatternSummary {
  todaySales?: number;
  totalReceivables?: number;
  lowStockCount?: number;
  budgetRemaining?: number;
}

export function AskPakkuWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [upgradeLevel, setUpgradeLevel] = useState<number>(2);
  const [levelTitle, setLevelTitle] = useState<string>('सक्रिय मुनीम जी (Active Munim Ji)');
  const [patternSummary, setPatternSummary] = useState<PatternSummary | null>(null);
  const [learningNotification, setLearningNotification] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'pakku',
      text: 'नमस्ते जी! 🙏 मैं **पक्कू (Pakku)** हूँ — आपका निजी AI बिजनेस पार्टनर व मुनीम जी!\n\nमैं आपकी दुकान की बिक्री, उधारी खाता, स्टॉक, घर खर्चा और किसी भी विषय पर बिल्कुल एक अनुभवी साथी की तरह सलाह दे सकता हूँ।\n\nआप मुझसे कुछ भी पूछ सकते हैं या बोलकर सवाल कर सकते हैं:',
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Voice speech-to-text
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition();

  useEffect(() => {
    if (transcript) {
      setInputQuery(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const q = (textToSend || inputQuery).trim();
    if (!q) return;

    if (isListening) {
      stopListening();
    }

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    resetTranscript();
    setIsTyping(true);

    try {
      const res = await fetch('/api/pakku/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        'माफ़ कीजिये, मैं अभी जवाब नहीं दे पा रहा हूँ। कृपया पुनः प्रयास करें।';

      if (data.upgradeLevel) {
        setUpgradeLevel(data.upgradeLevel);
      }
      if (data.levelTitle) {
        setLevelTitle(data.levelTitle);
      }
      if (data.patternSummary) {
        setPatternSummary(data.patternSummary);
      }

      const pakkuMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'pakku',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, pakkuMsg]);
    } catch (err) {
      console.error('Pakku error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'pakku',
          text: 'इंटरनेट कनेक्शन में कुछ समस्या आई है। कृपया पुनः प्रयास करें।',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFeedback = async (messageId: string, isPositive: boolean) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, feedbackGiven: isPositive ? 'up' : 'down' } : m
      )
    );

    try {
      const res = await fetch('/api/pakku/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feedback', isPositive }),
      });
      const data = await res.json();
      if (data.upgradeLevel) {
        setUpgradeLevel(data.upgradeLevel);
        setLevelTitle(data.levelTitle);
      }

      setLearningNotification(
        isPositive
          ? 'पक्कू ने आपकी रेटिंग से सीखा और खुद को अपग्रेड किया! ⭐'
          : 'धन्यवाद! पक्कू भविष्य में इस तरह की गलती सुधारने की कोशिश करेगा।'
      );
      setTimeout(() => setLearningNotification(null), 3500);
    } catch (err) {
      console.warn('Feedback err:', err);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'pakku',
        text: 'नमस्ते जी! बातचीत रीसेट हो गई है। आप अपनी दुकान, उधारी, बिलिंग या किसी भी विषय पर मुझसे कभी भी पूछ सकते हैं!',
        timestamp: 'Just now',
      },
    ]);
  };

  // Simple Markdown parser for bold and clickable links
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');

    return lines.map((line, lIdx) => {
      if (!line.trim()) {
        return <div key={lIdx} className="h-2" />;
      }

      const isBullet = line.trim().startsWith('• ') || line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      const parts: React.ReactNode[] = [];
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let lastIdx = 0;
      let match;

      while ((match = linkRegex.exec(cleanLine)) !== null) {
        if (match.index > lastIdx) {
          parts.push(parseBold(cleanLine.substring(lastIdx, match.index)));
        }
        const linkText = match[1];
        const linkUrl = match[2];
        parts.push(
          <Link
            key={match.index}
            href={linkUrl}
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded text-xs underline decoration-emerald-500 transition-colors mx-0.5"
          >
            <span>{linkText}</span>
            <ExternalLink className="w-2.5 h-2.5 text-emerald-600 inline" />
          </Link>
        );
        lastIdx = match.index + match[0].length;
      }

      if (lastIdx < cleanLine.length) {
        parts.push(parseBold(cleanLine.substring(lastIdx)));
      }

      return (
        <div key={lIdx} className={isBullet ? 'flex items-start gap-1.5 ml-1.5 my-1' : 'my-1'}>
          {isBullet && <span className="text-emerald-600 font-black">•</span>}
          <div className="flex-1 leading-relaxed">{parts}</div>
        </div>
      );
    });
  };

  const parseBold = (text: string) => {
    const boldParts = text.split(/\*\*([^*]+)\*\*/g);
    return boldParts.map((part, idx) => {
      if (idx % 2 === 1) {
        return <strong key={idx} className="font-extrabold text-slate-900">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right) */}
      <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-[60] print:hidden">
        {!isOpen && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 150);
            }}
            className="group flex items-center gap-2.5 bg-white hover:bg-slate-50 text-slate-800 p-1.5 pr-4 rounded-full shadow-2xl border-2 border-emerald-500 hover:border-emerald-600 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
            title="Ask Pakku - AI Business Advisor"
          >
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-orange-50 border-2 border-orange-400 shrink-0 shadow-sm">
              <img
                src="/pakku.png"
                alt="Pakku AI"
                className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-300"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  Ask Pakku
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <p className="text-[10px] font-bold text-emerald-700">
                AI मुनीम जी • 24/7 Live
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Expandable Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-2 sm:bottom-6 right-2 sm:right-6 z-[70] w-[calc(100vw-16px)] sm:w-[420px] max-w-full h-[610px] max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 print:hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#071D35] to-[#103E6A] text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-orange-100 border-2 border-orange-400 shrink-0 shadow-md">
                <img
                  src="/pakku.png"
                  alt="Pakku"
                  className="w-full h-full object-cover object-top"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#071D35]" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-white tracking-tight">Pakku (पक्कू)</h3>
                  <span className="text-[9px] font-extrabold uppercase bg-emerald-500 text-white px-1.5 py-0.2 rounded-full tracking-wider flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 inline" /> AI Online
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] bg-white/15 text-amber-300 font-bold px-1.5 py-0.2 rounded flex items-center gap-1">
                    <Brain className="w-2.5 h-2.5" /> Lv.{upgradeLevel}: {levelTitle.split(' ')[0]}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset Chat"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Smart Pattern Chips Strip */}
          <div className="bg-slate-100/90 border-b border-slate-200/80 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[10.5px] font-bold text-slate-700 shrink-0 scrollbar-none">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider shrink-0">Live Pulse:</span>
            <button
              type="button"
              onClick={() => handleSendMessage('आज का लाइव बिक्री हिसाब बताओ')}
              className="px-2 py-0.5 rounded-full bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 hover:border-emerald-300 shrink-0 flex items-center gap-1 shadow-2xs transition-colors"
            >
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>आज की बिक्री</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('बाजार में कुल कितना उधार बकाया है?')}
              className="px-2 py-0.5 rounded-full bg-white hover:bg-rose-50 text-rose-800 border border-slate-200 hover:border-rose-300 shrink-0 flex items-center gap-1 shadow-2xs transition-colors"
            >
              <AlertCircle className="w-3 h-3 text-rose-600" />
              <span>उधारी हिसाब</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('स्टॉक चेक करो, क्या कोई माल खत्म होने वाला है?')}
              className="px-2 py-0.5 rounded-full bg-white hover:bg-amber-50 text-amber-800 border border-slate-200 hover:border-amber-300 shrink-0 flex items-center gap-1 shadow-2xs transition-colors"
            >
              <span>📦 लो-स्टॉक</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('घर खर्चा का क्या हाल है? कितना बजट बचा है?')}
              className="px-2 py-0.5 rounded-full bg-white hover:bg-blue-50 text-blue-800 border border-slate-200 hover:border-blue-300 shrink-0 flex items-center gap-1 shadow-2xs transition-colors"
            >
              <span>🏠 घर बजट</span>
            </button>
          </div>

          {/* Learning Feedback Notification Toast */}
          {learningNotification && (
            <div className="bg-emerald-600 text-white text-[10.5px] font-bold px-3 py-1.5 text-center flex items-center justify-center gap-1.5 animate-in fade-in duration-200 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{learningNotification}</span>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-slate-50/70 text-xs">
            {messages.map((m) => {
              const isPakku = m.sender === 'pakku';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isPakku ? 'justify-start' : 'justify-end'}`}
                >
                  {isPakku && (
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-orange-100 border border-orange-300 shrink-0 mt-0.5 shadow-2xs">
                      <img src="/pakku.png" alt="Pakku" className="w-full h-full object-cover object-top" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 shadow-xs ${
                      isPakku
                        ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-sm'
                        : 'bg-emerald-600 text-white rounded-tr-sm'
                    }`}
                  >
                    <div className="text-[12px] leading-relaxed">
                      {isPakku ? renderFormattedText(m.text) : m.text}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[9px] font-semibold">
                      {isPakku && m.id !== 'welcome' ? (
                        <div className="flex items-center gap-1 text-slate-400">
                          <span>सटीक लगा?</span>
                          <button
                            type="button"
                            onClick={() => handleFeedback(m.id, true)}
                            disabled={Boolean(m.feedbackGiven)}
                            title="सही जवाब (Good Answer)"
                            className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                              m.feedbackGiven === 'up' ? 'text-emerald-600 font-black' : 'hover:text-emerald-600'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(m.id, false)}
                            disabled={Boolean(m.feedbackGiven)}
                            title="सुधार की ज़रूरत (Needs Improvement)"
                            className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                              m.feedbackGiven === 'down' ? 'text-rose-600 font-black' : 'hover:text-rose-600'
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div />
                      )}

                      <span className={isPakku ? 'text-slate-400' : 'text-emerald-100'}>
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Questions Pills */}
            {messages.length <= 2 && (
              <div className="pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  अक्सर पूछे जाने वाले सवाल (Quick Guides):
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    '📄 नया GST बिल कैसे बनाएं?',
                    '🎙️ बोलकर बिल (Smart Voice Entry) कैसे करें?',
                    '💰 ग्राहक की उधारी कैसे दर्ज व रिकवर करें?',
                    '🏠 घर खर्चा (Ghar Kharcha) कैसे सेट करें?',
                    '📊 GSTR-1 रिपोर्ट कैसे डाउनलोड करें?',
                    '💡 उधारी जल्दी वसूल करने के तरीके बताओ',
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="w-full text-left p-2 rounded-xl bg-white hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-900 transition-all cursor-pointer font-semibold text-[11px] flex items-center justify-between group shadow-2xs"
                    >
                      <span>{q}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold py-1">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-orange-100 border border-orange-300 shrink-0">
                  <img src="/pakku.png" alt="Pakku" className="w-full h-full object-cover object-top" />
                </div>
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-1 text-[10px] text-slate-500 font-semibold">पक्कू सोच रहा है...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            {isListening && (
              <div className="mb-2 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                  <span>पक्कू सुन रहा है... बोलिए! (Speak now)</span>
                </div>
                <button
                  type="button"
                  onClick={() => stopListening()}
                  className="text-[10px] underline font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="पक्कू से कुछ भी पूछें (हिंदी या English)..."
                disabled={isTyping}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />

              {/* Voice Input Button */}
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening('hi-IN');
                  }
                }}
                title={isListening ? 'Stop Listening' : 'Speak to Pakku'}
                className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputQuery.trim() || isTyping}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
