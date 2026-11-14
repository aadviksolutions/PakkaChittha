import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { 
  HelpCircle, 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  Eye, 
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getPublicQuestions, getPublicCategories } from '@/lib/services/knowledgeService';
import { KnowledgeSearchBar } from '@/components/knowledge/KnowledgeSearchBar';

export const metadata: Metadata = {
  title: 'Questions & Answers (Q&A) | सभी प्रश्न एवं उत्तर',
  description: 'Browse verified questions and answers regarding GST, Billing, Udhar recovery, MSME rules, Banking, and Business compliance in India.',
};

export const revalidate = 120;

export default async function QuestionsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const categorySlug = typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined;
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page, 10) : 1;
  const query = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined;

  const [questionsData, categories] = await Promise.all([
    getPublicQuestions({
      categorySlug,
      search: query,
      page,
      limit: 15,
    }),
    getPublicCategories(),
  ]);

  const { questions, pagination } = questionsData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title & Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md mb-2">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Verified Answers Repository</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              प्रश्न एवं उत्तर संग्रह (Questions & Answers)
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              जीएसटी, इनवॉइसिंग, उधारी, सरकारी योजनाओं और व्यापारिक नियमों पर सरल हिंदी और अंग्रेजी में स्पष्ट समाधान।
            </p>
          </div>

          <Link
            href="/knowledge/ask"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-sm self-start sm:self-auto"
          >
            <span>नया सवाल पूछें</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Search */}
        <KnowledgeSearchBar placeholder="सवाल खोजें... (e.g. 45 days payment rule, raw bill legality)" />
      </div>

      {/* Category Scroll */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
          <span className="text-slate-400 font-semibold whitespace-nowrap">श्रेणी (Category):</span>
          <Link
            href={`/knowledge/questions?${new URLSearchParams({
              ...(query ? { q: query } : {}),
            }).toString()}`}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              !categorySlug
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            सभी श्रेणियां
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/knowledge/questions?${new URLSearchParams({
                category: cat.slug,
                ...(query ? { q: query } : {}),
              }).toString()}`}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                categorySlug === cat.slug
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.icon} {cat.nameHi}
            </Link>
          ))}
        </div>
      </div>

      {/* List */}
      {questions.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">कोई सवाल नहीं मिला</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            आपके चुने गए फिल्टर के अनुसार अभी कोई सवाल उपलब्ध नहीं है। आप अपना सवाल हमारे पोर्टल पर सबमिट कर सकते हैं।
          </p>
          <Link
            href="/knowledge/ask"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            <span>नया सवाल पूछें</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div
              key={q.id}
              className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                    {q.category?.nameHi || q.category?.nameEn}
                  </span>
                  {q.subcategory && (
                    <span className="text-xs text-slate-400 font-medium">
                      • {q.subcategory.nameHi || q.subcategory.nameEn}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {q.viewCount} views
                </span>
              </div>

              <Link href={`/knowledge/questions/${q.slug}`} className="block group">
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 leading-snug">
                  {q.titleHi || q.titleEn}
                </h2>
                {q.titleEn && q.titleHi && (
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {q.titleEn}
                  </p>
                )}
              </Link>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  संक्षिप्त उत्तर (Quick Answer):
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {q.shortAnswerHi || q.shortAnswerEn}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  प्रमाणित कानून व सरकारी नियम
                </span>

                <Link
                  href={`/knowledge/questions/${q.slug}`}
                  className="font-bold text-slate-900 hover:text-emerald-600 flex items-center gap-1.5"
                >
                  <span>विस्तृत समाधान व व्यावहारिक उदाहरण देखें</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Showing Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} Total Questions)
          </p>

          <div className="flex items-center gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/knowledge/questions?${new URLSearchParams({
                  ...(categorySlug ? { category: categorySlug } : {}),
                  ...(query ? { q: query } : {}),
                  page: (pagination.page - 1).toString(),
                }).toString()}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </Link>
            )}

            {pagination.page < pagination.totalPages && (
              <Link
                href={`/knowledge/questions?${new URLSearchParams({
                  ...(categorySlug ? { category: categorySlug } : {}),
                  ...(query ? { q: query } : {}),
                  page: (pagination.page + 1).toString(),
                }).toString()}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
