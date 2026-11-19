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
} from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';

interface Message {
  id: string;
  sender: 'user' | 'pakku';
  text: string;
  timestamp: string;
}

const QUICK_QUESTIONS = [
  '📄 नया GST बिल कैसे बनाएं?',
  '🎙️ बोलकर बिल (Voice Entry) कैसे करें?',
  '💰 ग्राहक की उधारी कैसे दर्ज करें?',
  '🏠 घर खर्चा (Ghar Kharcha) कैसे सेट करें?',
  '📊 GSTR-1 रिपोर्ट कैसे डाउनलोड करें?',
  '📱 व्हाट्सएप रिमाइंडर कैसे भेजें?',
];

export function AskPakkuWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'pakku',
      text: 'नमस्ते जी! मैं **पक्कू (Pakku)** हूँ — पक्का चिट्ठा का AI साथी। 🧾✨\n\nआप मुझसे बिलिंग, जीएसटी, उधारी खाता, स्टॉक, घर खर्चा या वेबसाइट के किसी भी सवाल के लिए हिंदी या इंग्लिश में कभी भी पूछ सकते हैं!\n\nनीचे दिए गए किसी भी टॉपिक पर क्लिक करें या अपना सवाल लिखकर/बोलकर पूछें:',
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Voice speech-to-text for asking Pakku
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition();

  // Sync voice transcript to input
  useEffect(() => {
    if (transcript) {
      setInputQuery(transcript);
    }
  }, [transcript]);

  // Scroll to bottom when new messages arrive
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
        'माफ़ कीजिये, मैं अभी जवाब नहीं दे पा रहा हूँ। कृपया दोबारा प्रयास करें या [हेल्प सेंटर](/knowledge) देखें।';

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

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'pakku',
        text: 'नमस्ते जी! चैट रीसेट हो गई है। आप मुझसे पक्का चिट्ठा से जुड़ा कोई भी सवाल कभी भी पूछ सकते हैं!',
        timestamp: 'Just now',
      },
    ]);
  };

  // Simple Markdown parser for bold and clickable links
  const renderFormattedText = (raw: string) => {
    // Split into paragraphs
    const lines = raw.split('\n');

    return lines.map((line, lIdx) => {
      if (!line.trim()) {
        return <div key={lIdx} className="h-2" />;
      }

      // Check for bullet points
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      // Parse markdown links [text](url) and **bold**
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
        <div key={lIdx} className={isBullet ? 'flex items-start gap-1.5 ml-2 my-1' : 'my-1'}>
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
      {/* Floating Trigger Button (Bottom-Right, above bottom nav on mobile) */}
      <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-[60] print:hidden">
        {!isOpen && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 150);
            }}
            className="group flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 p-1.5 pr-3.5 rounded-full shadow-2xl border-2 border-emerald-500 hover:border-emerald-600 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
            title="Ask Pakku - 24/7 AI Guide"
          >
            {/* Mascot Image Thumbnail */}
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
                पक्कू से पूछें • AI Guide
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Expandable Chat Drawer / Modal */}
      {isOpen && (
        <div className="fixed bottom-2 sm:bottom-6 right-2 sm:right-6 z-[70] w-[calc(100vw-16px)] sm:w-[410px] max-w-full h-[580px] max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 print:hidden">
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
                  <span className="text-[9px] font-extrabold uppercase bg-emerald-500 text-white px-1.5 py-0.2 rounded-full tracking-wider">
                    AI Online
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-300 font-medium">
                  Pakka Chittha Smart Assistant • हिंदी / EN
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
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-orange-100 border border-orange-300 shrink-0 mt-0.5">
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
                    <div
                      className={`text-[9px] mt-1.5 font-semibold text-right ${
                        isPakku ? 'text-slate-400' : 'text-emerald-100'
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Questions Pills (Visible when chat has few messages) */}
            {messages.length <= 2 && (
              <div className="pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Frequently Asked Questions (अक्सर पूछे जाने वाले सवाल):
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {QUICK_QUESTIONS.map((q, idx) => (
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
                  <span className="ml-1 text-[10px] text-slate-500">पक्कू सोच रहा है...</span>
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
                  className="text-[10px] underline font-bold"
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
                placeholder="Ask Pakku anything... (पक्कू से कुछ भी पूछें)"
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
