'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2, MessageSquare } from 'lucide-react';
import { useTranslation } from '@/i18n/context';

export function FeedbackWidget({
  contentId,
  contentType,
}: {
  contentId: string;
  contentType: 'QUESTION' | 'ARTICLE';
}) {
  const { locale } = useTranslation();
  const isHi = locale === 'hi';

  const [submitted, setSubmitted] = useState(false);
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInitialChoice = async (helpful: boolean) => {
    setIsHelpful(helpful);
    // Submit positive feedback immediately or show reason dialog
    if (helpful) {
      submitFeedback(helpful, 'Clear and accurate');
    }
  };

  const submitFeedback = async (helpful: boolean, selectedReason?: string) => {
    try {
      setLoading(true);
      await fetch('/api/v1/knowledge/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: contentType === 'QUESTION' ? contentId : undefined,
          articleId: contentType === 'ARTICLE' ? contentId : undefined,
          isHelpful: helpful,
          reason: selectedReason || reason,
          comment: comment || undefined,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-800 text-sm font-medium">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <span>
          {isHi
            ? 'आपकी प्रतिक्रिया के लिए धन्यवाद! हम सामग्री को और बेहतर बनाएंगे।'
            : 'Thank you for your feedback! It helps us improve our educational guides.'}
        </span>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            {isHi ? 'क्या यह जानकारी आपके लिए उपयोगी थी?' : 'Was this information helpful to you?'}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {isHi
              ? 'आपकी प्रतिक्रिया से हम ज्ञान केंद्र को और बेहतर बना सकते हैं।'
              : 'Your feedback helps thousands of business owners and citizens.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleInitialChoice(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isHelpful === true
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{isHi ? 'हाँ, उपयोगी थी' : 'Yes, helpful'}</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleInitialChoice(false)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isHelpful === false
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-rose-400 hover:bg-rose-50/50'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            <span>{isHi ? 'नहीं' : 'No'}</span>
          </button>
        </div>
      </div>

      {isHelpful === false && (
        <div className="space-y-3 pt-3 border-t border-slate-200 animate-in fade-in-50">
          <p className="text-xs font-medium text-slate-700">
            {isHi ? 'हम इसे कैसे सुधार सकते हैं?' : 'How can we improve this content?'}
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              isHi ? 'अधिक उदाहरण चाहिए' : 'Needs more examples',
              isHi ? 'भाषा कठिन है' : 'Too technical / complex',
              isHi ? 'अधूरी जानकारी' : 'Incomplete information',
              isHi ? 'पुराना नियम' : 'Outdated rule',
            ].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  reason === r
                    ? 'bg-slate-900 border-slate-900 text-white font-medium'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={isHi ? 'सुझाव या टिप्पणी लिखें...' : 'Optional comment or suggestion...'}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => submitFeedback(false)}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors"
            >
              {loading ? 'Submitting...' : isHi ? 'भेजें' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

