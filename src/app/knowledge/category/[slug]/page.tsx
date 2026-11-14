import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { 
  ArrowLeft, 
  HelpCircle, 
  FileText, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { getPublicCategoryBySlug } from '@/lib/services/knowledgeService';
import { SITE_URL } from '@/lib/seo/constants';

export const revalidate = 180;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);
  if (!category) return { title: 'Category Not Found' };

  return {
    title: `${category.nameHi} (${category.nameEn})`,
    description: category.descriptionHi || category.descriptionEn || undefined,
    openGraph: {
      title: `${category.nameHi} - ${category.nameEn} | PakkaChittha Knowledge Hub`,
      description: category.descriptionHi || category.descriptionEn || undefined,
      url: `${SITE_URL}/knowledge/category/${slug}`,
    },
    alternates: {
      canonical: `${SITE_URL}/knowledge/category/${slug}`,
    },
  };
}

export default async function SingleCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const questions = category.questions || [];
  const articles = category.articles || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/knowledge" className="hover:text-emerald-700">Home</Link>
        <span>/</span>
        <Link href="/knowledge/categories" className="hover:text-emerald-700">Categories</Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">{category.nameEn}</span>
      </nav>

      {/* Category Hero Banner */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{category.icon || '📚'}</span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Knowledge Domain
              </span>
              <h1 className="text-2xl sm:text-4xl font-black mt-0.5">
                {category.nameHi}
              </h1>
              <p className="text-sm sm:text-base font-medium text-emerald-200">
                {category.nameEn}
              </p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed pt-2">
            {category.descriptionHi || category.descriptionEn}
          </p>

          <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-emerald-300">
            <span className="px-3 py-1 rounded-full bg-white/10">
              {questions.length} Questions (सवाल-जवाब)
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10">
              {articles.length} Deep Guides (लेख व गाइड)
            </span>
          </div>
        </div>
      </div>

      {/* Subcategories Pills */}
      {category.subcategories && category.subcategories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            उप-विषय (Sub-topics in this category):
          </h2>
          <div className="flex flex-wrap gap-2">
            {category.subcategories.map((sub) => (
              <span
                key={sub.id}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-medium text-slate-700 border border-slate-200 transition-colors"
              >
                {sub.nameHi} ({sub.nameEn})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Two Columns: Questions (Left) & Articles (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Questions Section (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                प्रश्न एवं उत्तर (Questions & Answers)
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {questions.length} Questions
            </span>
          </div>

          {questions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-sm">
              इस श्रेणी में अभी नए सवाल जोड़े जा रहे हैं।
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/50">
                      {q.subcategory?.nameHi || q.subcategory?.nameEn || 'General'}
                    </span>
                    <span className="text-[11px] text-slate-400">{q.viewCount} views</span>
                  </div>

                  <Link href={`/knowledge/questions/${q.slug}`} className="block group">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 leading-snug">
                      {q.titleHi || q.titleEn}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {q.shortAnswerHi || q.shortAnswerEn}
                  </p>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      सत्यापित उत्तर (Verified)
                    </span>
                    <Link
                      href={`/knowledge/questions/${q.slug}`}
                      className="font-bold text-slate-700 hover:text-emerald-600 flex items-center gap-1"
                    >
                      <span>पूरा उत्तर पढ़ें</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Guides & Articles Section (1 column) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                गाइड व लेख (Articles)
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {articles.length} Guides
            </span>
          </div>

          {articles.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-sm">
              इस श्रेणी में जल्द ही विस्तृत लेख प्रकाशित होंगे।
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((art) => (
                <div
                  key={art.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {art.readingTimeMinutes} min read
                    </span>
                    <span>{art.viewCount} views</span>
                  </div>

                  <Link href={`/knowledge/articles/${art.slug}`} className="block group">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 leading-snug">
                      {art.titleHi || art.titleEn}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {art.summaryHi || art.summaryEn}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{art.authorName || 'PakkaChittha Team'}</span>
                    <Link
                      href={`/knowledge/articles/${art.slug}`}
                      className="font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                    >
                      <span>पढ़ें →</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ask Callout in category */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3">
            <h3 className="text-sm font-bold">
              {category.nameHi} से जुड़ा कोई सवाल है?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              अगर आपको अपनी समस्या का सटीक समाधान नहीं मिला, तो हमारे विशेषज्ञों से सीधे निशुल्क पूछें।
            </p>
            <Link
              href={`/knowledge/ask?categoryId=${category.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors w-full justify-center"
            >
              <span>सवाल पूछें</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
