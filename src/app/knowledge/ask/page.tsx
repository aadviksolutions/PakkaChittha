'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/i18n/context';

interface CategoryOption {
  id: string;
  nameEn: string;
  nameHi: string;
}

export default function AskQuestionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale } = useTranslation();
  const isHi = locale === 'hi';

  const prefillQuestion = searchParams.get('prefill') || '';
  const prefillCategoryId = searchParams.get('categoryId') || '';

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [name, setName] = useState('');
  const [question, setQuestion] = useState(prefillQuestion);
  const [context, setContext] = useState('');
  const [categoryId, setCategoryId] = useState(prefillCategoryId);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [occupation, setOccupation] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/v1/knowledge/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !question.trim()) {
      setErrorMsg(isHi ? 'कृपया अपना नाम और सवाल अवश्य दर्ज करें।' : 'Please enter your name and question.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/v1/knowledge/questions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          question: question.trim(),
          context: context.trim() || undefined,
          categoryId: categoryId || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          occupation: occupation.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.error || (isHi ? 'सबमिट करने में त्रुटि आई।' : 'Failed to submit question.'));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(isHi ? 'सर्वर से संपर्क नहीं हो पाया।' : 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {isHi ? 'आपका सवाल सफलतापूर्वक सबमिट हो गया है!' : 'Your Question Has Been Submitted!'}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
            {isHi
              ? 'पक्काचिट्ठा विशेषज्ञ और कानूनी टीम आपके सवाल का अध्ययन करेगी और इसका प्रमाणित, सरल उत्तर ज्ञान केंद्र पर निशुल्क प्रकाशित किया जाएगा।'
              : 'Our legal, tax, and business advisory panel will review your question. A verified, comprehensive answer will be published on the Knowledge Hub.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 max-w-md mx-auto">
          {isHi
            ? 'यदि आपने ईमेल दर्ज किया है, तो उत्तर प्रकाशित होने पर आपको सूचना दी जाएगी।'
            : 'If you provided an email, you will receive an update once the answer is published.'}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={() => {
              setSubmitted(false);
              setQuestion('');
              setContext('');
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {isHi ? 'एक और सवाल पूछें' : 'Ask Another Question'}
          </button>
          <Link
            href="/knowledge"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 shadow-sm"
          >
            {isHi ? 'ज्ञान केंद्र होम पर जाएं' : 'Return to Knowledge Home'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
          <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isHi ? 'निशुल्क जन-सहयोग मंच' : 'Free Public Q&A Initiative'}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {isHi ? 'अपना सवाल पूछें (Ask Your Question)' : 'Ask Your Question for Free'}
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed">
          {isHi
            ? 'जीएसटी, इनवॉइसिंग, उधारी वसूली, सरकारी योजनाएं या व्यापार विवाद — कोई भी सवाल पूछें। हमारी टीम प्रमाणित नियमों के आधार पर निशुल्क उत्तर तैयार करेगी।'
            : 'Have a question about GST, invoicing, recovering dues, government subsidies, or shop compliance? Submit it here for verified guidance.'}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
        {/* Submitter Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800">
            {isHi ? 'आपका पूरा नाम *' : 'Your Full Name *'}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isHi ? 'e.g. राजेश कुमार' : 'e.g. Rajesh Kumar'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>

        {/* Question Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800">
            {isHi ? 'आपका मुख्य सवाल क्या है? *' : 'What is your main question? *'}
          </label>
          <input
            type="text"
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={isHi ? 'e.g. अगर ग्राहक उधारी देने से मना कर दे तो क्या कानूनी रास्ता है?' : 'e.g. What is the legal procedure if a customer refuses to pay credit dues?'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>

        {/* Context / Scenario */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800">
            {isHi ? 'समस्या का विस्तृत विवरण या संदर्भ (वैकल्पिक)' : 'Additional Context or Details (Optional)'}
          </label>
          <textarea
            rows={4}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={isHi ? 'अपनी स्थिति या समस्या को थोड़ा विस्तार से बताएं ताकि सटीक जवाब दिया जा सके...' : 'Explain your business situation or specific challenge...'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>

        {/* Category selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800">
            {isHi ? 'संबंधित श्रेणी चुनें' : 'Select Related Category'}
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">{isHi ? '-- श्रेणी चुनें (Select Category) --' : '-- Choose Category --'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameHi} ({c.nameEn})
              </option>
            ))}
          </select>
        </div>

        {/* 2-col inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              {isHi ? 'ईमेल (उत्तर की सूचना हेतु)' : 'Email (For Answer Notification)'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rajesh@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              {isHi ? 'फ़ोन / व्हाट्सऐप (वैकल्पिक)' : 'Phone / WhatsApp (Optional)'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              {isHi ? 'शहर व राज्य' : 'City & State'}
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={isHi ? 'e.g. कानपुर, उत्तर प्रदेश' : 'e.g. Jaipur, Rajasthan'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              {isHi ? 'व्यवसाय का प्रकार / पेशा' : 'Occupation / Business Type'}
            </label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder={isHi ? 'e.g. किराना स्टोर, हार्डवेयर, छात्र, सीए' : 'e.g. Grocery Store, Manufacturer, CA'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Notice */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <span>
            {isHi
              ? 'यह सेवा 100% निशुल्क है। सबमिट किए गए सवाल को जन-जागरूकता के लिए गोपनीय व्यक्तिगत विवरण हटाकर ज्ञान केंद्र पर प्रकाशित किया जा सकता है।'
              : 'This is a 100% free public service. Questions may be anonymized and published on the Knowledge Hub to help other citizens and business owners.'}
          </span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{loading ? (isHi ? 'सबमिट किया जा रहा है...' : 'Submitting...') : (isHi ? 'निशुल्क सवाल सबमिट करें' : 'Submit Question')}</span>
        </button>
      </form>
    </div>
  );
}

