import React from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  HelpCircle, 
  FileText, 
  Search, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  TrendingUp, 
  Layers, 
  Users, 
  Store, 
  Briefcase, 
  Building2, 
  Clock, 
  ChevronRight,
  Send,
  Award
} from 'lucide-react';
import { 
  getPublicCategories, 
  getPublicQuestions, 
  getPublicArticles 
} from '@/lib/services/knowledgeService';
import { KnowledgeSearchBar } from '@/components/knowledge/KnowledgeSearchBar';

export const revalidate = 180; // ISR 3 minutes

export default async function KnowledgeHubHomePage() {
  const [categories, featuredQuestionsData, recentArticlesData] = await Promise.all([
    getPublicCategories(),
    getPublicQuestions({ limit: 6, sort: 'featured' }),
    getPublicArticles({ limit: 3, sort: 'latest' }),
  ]);

  const featuredQuestions = featuredQuestionsData.questions;
  const recentArticles = recentArticlesData.articles;

  // Audience Profiles
  const audienceSegments = [
    {
      role: 'आम नागरिक एवं परिवार',
      roleEn: 'Households & Individuals',
      desc: 'घर खर्च, व्यक्तिगत उधारी, बैंक फ्रॉड से बचाव, उपभोक्ता अधिकार और बचत योजनाएं।',
      icon: Users,
      href: '/knowledge/questions?q=kharcha',
      color: 'from-blue-500/10 to-indigo-500/10 border-blue-200 text-blue-700',
    },
    {
      role: 'दुकानदार एवं खुदरा विक्रेता',
      roleEn: 'Retailers & Shopkeepers',
      desc: 'उधारी वसूली के कानूनी नियम, कच्चा बिल बनाम पक्का बिल, जीएसटी छूट सीमा और स्टॉक प्रबंधन।',
      icon: Store,
      href: '/knowledge/questions?q=bill',
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-700',
    },
    {
      role: 'लघु उद्योग एवं स्टार्टअप',
      roleEn: 'Small Businesses & MSMEs',
      desc: 'MSME 45-दिन भुगतान नियम, एमएसएमई समाधान पोर्टल, मुद्रा लोन और बिजनेस बैंक खाते।',
      icon: Briefcase,
      href: '/knowledge/questions?q=msme',
      color: 'from-amber-500/10 to-orange-500/10 border-amber-200 text-amber-700',
    },
    {
      role: 'व्यावसायिक एवं कॉर्पोरेट',
      roleEn: 'Professionals & Corporates',
      desc: 'ई-इनवॉइसिंग, ई-वे बिल, ऑडिट नियम, ट्रेडमार्क रजिस्ट्रेशन और कॉरपोरेट अनुपालन।',
      icon: Building2,
      href: '/knowledge/questions?q=gst',
      color: 'from-purple-500/10 to-pink-500/10 border-purple-200 text-purple-700',
    },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-slate-50 to-white pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>100% Free Public Awareness & Education • हर सवाल का जवाब</span>
          </div>

          {/* Main Headings */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight sm:leading-tight">
            हर सवाल का जवाब,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
              अब एक ही जगह!
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            सरल, सटीक और प्रमाणित जानकारी — आम नागरिक से लेकर खुदरा दुकानदार, एमएसएमई और बड़े व्यापारी तक सबके लिए।
          </p>

          {/* Interactive Global Search Bar */}
          <div className="max-w-3xl mx-auto pt-2">
            <KnowledgeSearchBar large />
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-3 bg-white/80 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">100% Free</p>
                <p className="text-xs font-bold text-slate-900">निशुल्क जनसेवा</p>
              </div>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">15 Categories</p>
                <p className="text-xs font-bold text-slate-900">150+ उप-श्रेणियां</p>
              </div>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Verified Laws</p>
                <p className="text-xs font-bold text-slate-900">प्रमाणित सरकारी नियम</p>
              </div>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Bilingual</p>
                <p className="text-xs font-bold text-slate-900">हिंदी व English</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* 2. AUDIENCE ROLE SELECTOR */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Tailored Knowledge
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                अपनी भूमिका चुनें और जानें अपने अधिकार
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              प्रत्येक वर्ग की ज़रूरतों के अनुसार विशेष रूप से तैयार की गई कानूनी व व्यापारिक सामग्री
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {audienceSegments.map((aud) => {
              const IconComp = aud.icon;
              return (
                <Link
                  key={aud.roleEn}
                  href={aud.href}
                  className={`p-6 rounded-2xl border bg-gradient-to-br transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between ${aud.color}`}
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{aud.role}</h3>
                      <p className="text-xs font-semibold text-slate-500">{aud.roleEn}</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{aud.desc}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 text-xs font-bold">
                    <span>संबंधित सवाल देखें</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 3. 15 MASTER KNOWLEDGE CATEGORIES */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                15 Core Knowledge Domains
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                विषय अनुसार ज्ञान खोजें (Browse by Category)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                जीएसटी, बिलिंग, उधारी, स्टॉक, बैंकिंग और व्यापार कानून पर भारत का सबसे व्यापक संग्रह।
              </p>
            </div>
            <Link
              href="/knowledge/categories"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg"
            >
              <span>सभी 15 श्रेणियां देखें</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/knowledge/category/${cat.slug}`}
                className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{cat.icon || '📚'}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700">
                      {cat.questionCount + cat.articleCount} Topics
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {cat.nameHi} ({cat.nameEn})
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {cat.descriptionHi || cat.descriptionEn}
                    </p>
                  </div>

                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {cat.subcategories.slice(0, 3).map((sub) => (
                        <span
                          key={sub.id}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-100"
                        >
                          {sub.nameHi || sub.nameEn}
                        </span>
                      ))}
                      {cat.subcategories.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 text-slate-400 font-medium">
                          +{cat.subcategories.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-emerald-600">
                  <span>एक्सप्लोर करें</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. FEATURED & POPULAR QUESTIONS (Q&A) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Popular Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                व्यापारियों और नागरिकों द्वारा सबसे ज्यादा पूछे जाने वाले सवाल
              </h2>
            </div>
            <Link
              href="/knowledge/questions"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg"
            >
              <span>सभी सवाल-जवाब देखें</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredQuestions.map((q) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/50">
                      {q.category?.nameHi || q.category?.nameEn}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {q.viewCount} views
                    </span>
                  </div>

                  <Link href={`/knowledge/questions/${q.slug}`} className="block group">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 leading-snug">
                      {q.titleHi || q.titleEn}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {q.shortAnswerHi || q.shortAnswerEn}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    सत्यापित उत्तर
                  </span>
                  <Link
                    href={`/knowledge/questions/${q.slug}`}
                    className="text-xs font-bold text-slate-700 hover:text-emerald-600 flex items-center gap-1"
                  >
                    <span>विस्तार से पढ़ें</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. IN-DEPTH ARTICLES & PRACTICAL GUIDES */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Comprehensive Guides
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                विस्तृत गाइड एवं कानूनी प्रक्रियाएं (Guides & Articles)
              </h2>
            </div>
            <Link
              href="/knowledge/articles"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg"
            >
              <span>सभी गाइड देखें</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentArticles.map((art) => (
              <div
                key={art.id}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {art.category?.nameHi || art.category?.nameEn}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {art.readingTimeMinutes} min read
                    </span>
                  </div>

                  <Link href={`/knowledge/articles/${art.slug}`} className="block group">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 leading-snug">
                      {art.titleHi || art.titleEn}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {art.summaryHi || art.summaryEn}
                  </p>
                </div>

                <div className="p-6 pt-0">
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      लेखक: <strong className="text-slate-700">{art.authorName || 'PakkaChittha Team'}</strong>
                    </span>
                    <Link
                      href={`/knowledge/articles/${art.slug}`}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <span>पूरा लेख पढ़ें</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. ASK A QUESTION PROMOTIONAL CALLOUT */}
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>पक्काचिट्ठा जन-सहयोग</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              क्या आपको अपने सवाल का जवाब नहीं मिला?
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              जीएसटी, बिलिंग विवाद, उधारी वसूली, या किसी सरकारी योजना से संबंधित अपना सवाल हमें भेजें। हमारे विशेषज्ञ और सीए पैनल द्वारा इसका परीक्षण करके निशुल्क उत्तर प्रकाशित किया जाएगा।
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/knowledge/ask"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-4 h-4" />
                <span>निशुल्क सवाल सबमिट करें</span>
              </Link>
              <Link
                href="/knowledge/about"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors"
              >
                <span>ज्ञान केंद्र का उद्देश्य जानें</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
