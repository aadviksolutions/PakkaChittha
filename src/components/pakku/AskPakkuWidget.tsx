'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  Send,
  Mic,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  AlertCircle,
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
  const [levelTitle, setLevelTitle] = useState<string>('सक्रिय मुनीम जी');
  const [patternSummary, setPatternSummary] = useState<PatternSummary | null>(null);
  const [learningNotification, setLearningNotification] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'pakku',
      text: 'नमस्ते जी! 🙏 मैं **पक्कू (Pakku)** हूँ — आपका AI बिजनेस पार्टनर व मुनीम जी।\n\nआप मुझसे बिलिंग, कोटेशन, खरीद, स्टॉक, उधारी खाता या घर खर्चा के बारे में कभी भी पूछ सकते हैं:',
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
          ? 'पक्कू ने सीख लिया और अपग्रेड हुआ! ⭐'
          : 'सुझाव दर्ज हो गया, पक्कू भविष्य में सुधार करेगा।'
      );
      setTimeout(() => setLearningNotification(null), 3000);
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
        return <div key={lIdx} className="h-1.5" />;
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
            className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 px-2 py-0.5 rounded-md text-[11.5px] transition-colors mx-0.5"
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
        <div key={lIdx} className={isBullet ? 'flex items-start gap-1.5 ml-1 my-0.5' : 'my-0.5'}>
          {isBullet && <span className="text-emerald-600 font-bold">•</span>}
          <div className="flex-1 leading-relaxed">{parts}</div>
        </div>
      );
    });
  };

  const parseBold = (text: string) => {
    const boldParts = text.split(/\*\*([^*]+)\*\*/g);
    return boldParts.map((part, idx) => {
      if (idx % 2 === 1) {
        return <strong key={idx} className="font-semibold text-slate-900">{part}</strong>;
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
            className="group flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 px-3 py-1.5 rounded-full shadow-md hover:shadow-lg border border-slate-200/90 transition-all duration-200 cursor-pointer active:scale-95"
            title="Ask Pakku - AI Business Advisor"
          >
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              <img
                src="/pakku.png"
                alt="Pakku AI"
                className="w-full h-full object-cover object-top"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-900 tracking-tight">
                Ask Pakku
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            </div>
          </button>
        )}
      </div>

      {/* Mobile Backdrop to prevent messy background interaction */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-[65] sm:hidden transition-opacity backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Expandable Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-2 sm:bottom-6 right-2 sm:right-6 z-[70] w-[calc(100vw-16px)] sm:w-[410px] max-w-full h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-150 print:hidden">
          {/* Header */}
          <div className="bg-[#173653] text-white px-3.5 sm:px-4 py-3 flex items-center justify-between shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/20 shrink-0">
                <img
                  src="/pakku.png"
                  alt="Pakku"
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-white tracking-tight">Pakku (पक्कू)</h3>
                  <span className="text-[9.5px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 font-normal">
                  AI मुनीम जी • {levelTitle.split(' ')[0]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset Chat"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Smart Pattern Chips Strip */}
          <div className="bg-[#F8FAFC] border-b border-slate-200/80 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[11px] font-medium text-slate-700 shrink-0 scrollbar-none">
            <span className="text-[10px] text-slate-400 shrink-0">लाइव:</span>
            <button
              type="button"
              onClick={() => handleSendMessage('आज का लाइव बिक्री हिसाब बताओ')}
              className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shrink-0 flex items-center gap-1 transition-colors text-[11px]"
            >
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>आज की बिक्री</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('बाजार में कुल कितना उधार बकाया है?')}
              className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shrink-0 flex items-center gap-1 transition-colors text-[11px]"
            >
              <AlertCircle className="w-3 h-3 text-rose-600" />
              <span>उधारी हिसाब</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('स्टॉक चेक करो, क्या कोई माल खत्म होने वाला है?')}
              className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shrink-0 flex items-center gap-1 transition-colors text-[11px]"
            >
              <span>📦 लो-स्टॉक</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('घर खर्चा का क्या हाल है? कितना बजट बचा है?')}
              className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shrink-0 flex items-center gap-1 transition-colors text-[11px]"
            >
              <span>🏠 घर बजट</span>
            </button>
          </div>

          {/* Learning Feedback Notification Toast */}
          {learningNotification && (
            <div className="bg-[#173653] text-white text-[11px] font-medium px-3 py-1.5 text-center flex items-center justify-center gap-1.5 animate-in fade-in duration-200 shrink-0">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{learningNotification}</span>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#F8FAFC]/50 text-xs">
            {messages.map((m) => {
              const isPakku = m.sender === 'pakku';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isPakku ? 'justify-start' : 'justify-end'}`}
                >
                  {isPakku && (
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                      <img src="/pakku.png" alt="Pakku" className="w-full h-full object-cover object-top" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl p-3 ${
                      isPakku
                        ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-2xs'
                        : 'bg-[#173653] text-white rounded-tr-xs'
                    }`}
                  >
                    <div className="text-[12px] leading-relaxed">
                      {isPakku ? renderFormattedText(m.text) : m.text}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[9px] font-medium">
                      {isPakku && m.id !== 'welcome' ? (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <span>सटीक लगा?</span>
                          <button
                            type="button"
                            onClick={() => handleFeedback(m.id, true)}
                            disabled={Boolean(m.feedbackGiven)}
                            title="सही जवाब (Good)"
                            className={`p-0.5 rounded hover:text-emerald-600 transition-colors ${
                              m.feedbackGiven === 'up' ? 'text-emerald-600 font-bold' : ''
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(m.id, false)}
                            disabled={Boolean(m.feedbackGiven)}
                            title="सुधार चाहिए (Needs work)"
                            className={`p-0.5 rounded hover:text-rose-600 transition-colors ${
                              m.feedbackGiven === 'down' ? 'text-rose-600 font-bold' : ''
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div />
                      )}

                      <span className={isPakku ? 'text-slate-400' : 'text-slate-300'}>
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
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  अक्सर पूछे जाने वाले सवाल:
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    '📄 नया कोटेशन कैसे बनाएं?',
                    '🧾 नया GST बिल कैसे बनाएं?',
                    '🎙️ बोलकर बिल (Smart Voice Entry) कैसे करें?',
                    '💰 ग्राहक की उधारी कैसे दर्ज व रिकवर करें?',
                    '📸 खरीद बिल स्कैन (AI Bill Scanner) कैसे करें?',
                    '🏠 घर खर्चा (Ghar Kharcha) कैसे सेट करें?',
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors font-medium text-[11px] flex items-center justify-between group shadow-2xs cursor-pointer"
                    >
                      <span>{q}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-slate-500 text-[11px] py-1">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img src="/pakku.png" alt="Pakku" className="w-full h-full object-cover object-top" />
                </div>
                <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-1 text-[10px] text-slate-500">पक्कू सोच रहा है...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-2.5 bg-white border-t border-slate-200 shrink-0">
            {isListening && (
              <div className="mb-2 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-1.5">
                  <Mic className="w-3 h-3 text-rose-600 animate-bounce" />
                  <span>पक्कू सुन रहा है... बोलिए!</span>
                </div>
                <button
                  type="button"
                  onClick={() => stopListening()}
                  className="text-[10px] underline font-semibold cursor-pointer"
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
              className="flex items-center gap-1.5"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="पक्कू से कुछ भी पूछें (हिंदी या English)..."
                disabled={isTyping}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-xs font-normal focus:outline-none focus:border-[#173653] focus:bg-white transition-all"
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
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputQuery.trim() || isTyping}
                className="p-2 rounded-xl bg-[#173653] hover:bg-[#071D35] disabled:bg-slate-200 text-white disabled:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
