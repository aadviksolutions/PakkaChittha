import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { 
  FileText, 
  Clock, 
  Calendar, 
  ArrowRight, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { getPublicArticles, getPublicCategories } from '@/lib/services/knowledgeService';
import { KnowledgeSearchBar } from '@/components/knowledge/KnowledgeSearchBar';

export const metadata: Metadata = {
  title: 'Articles & Guides | ज्ञान केंद्र लेख व व्यावहारिक गाइड',
  description: 'In-depth educational articles, compliance guides, and practical handbooks on Indian Taxation, Invoicing, Udhar Recovery, and MSME growth.',
};

export const revalidate = 120;

export default async function ArticlesDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const categorySlug = typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined;
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page, 10) : 1;
  const query = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined;

  const [articlesData, categories] = await Promise.all([
    getPublicArticles({
      categorySlug,
      search: query,
      page,
      limit: 12,
    }),
    getPublicCategories(),
  ]);

  const { articles, pagination } = articlesData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title & Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Comprehensive Guides & Handbooks</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              विस्तृत लेख एवं व्यापारिक गाइड (Guides & Handbooks)
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              कदम-दर-कदम प्रक्रियाएं, सरकारी नियम और व्यावहारिक विश्लेषण जो आपके व्यवसाय और अधिकारों को सशक्त बनाते हैं।
            </p>
          </div>
        </div>

        {/* Search */}
        <KnowledgeSearchBar placeholder="गाइड या विषय खोजें... (e.g. MSME Samadhaan, E-way bill rules)" />
      </div>

      {/* Category Scroll Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
        <span className="text-slate-400 font-semibold whitespace-nowrap">श्रेणी (Category):</span>
        <Link
          href={`/knowledge/articles?${new URLSearchParams({
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
            href={`/knowledge/articles?${new URLSearchParams({
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

      {/* Articles Grid */}
      {articles.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <FileText className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">कोई लेख नहीं मिला</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            इस श्रेणी में जल्द ही नए शोध-आधारित लेख जोड़े जाएंगे।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((art) => (
            <div
              key={art.id}
              className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/50">
                    {art.category?.nameHi || art.category?.nameEn}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {art.readingTimeMinutes} min read
                  </span>
                </div>

                <Link href={`/knowledge/articles/${art.slug}`} className="block group">
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-teal-700 leading-snug">
                    {art.titleHi || art.titleEn}
                  </h2>
                  {art.titleEn && art.titleHi && (
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {art.titleEn}
                    </p>
                  )}
                </Link>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {art.summaryHi || art.summaryEn}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  By: <strong className="text-slate-700">{art.authorName || 'PakkaChittha Team'}</strong>
                </span>

                <Link
                  href={`/knowledge/articles/${art.slug}`}
                  className="font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                >
                  <span>पूरा लेख पढ़ें</span>
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
            Showing Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} Total Articles)
          </p>

          <div className="flex items-center gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/knowledge/articles?${new URLSearchParams({
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
                href={`/knowledge/articles?${new URLSearchParams({
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
