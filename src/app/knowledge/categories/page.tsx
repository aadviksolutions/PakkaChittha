import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Layers, ChevronRight, HelpCircle, FileText, ArrowLeft } from 'lucide-react';
import { getPublicCategories } from '@/lib/services/knowledgeService';

export const metadata: Metadata = {
  title: 'All Categories | ज्ञान केंद्र श्रेणियां',
  description: 'Explore all 15 core knowledge categories covering GST, Billing, Udhar Recovery, MSME, Banking, and Legal rights.',
};

export const revalidate = 300;

export default async function CategoriesPage() {
  const categories = await getPublicCategories();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb & Title */}
      <div className="space-y-3">
        <Link
          href="/knowledge"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ज्ञान केंद्र होम (Knowledge Home)</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ज्ञान केंद्र की सभी श्रेणियां (Knowledge Categories)
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              15 मुख्य श्रेणियां और 150+ उप-श्रेणियों में संकलित भारत का सबसे व्यापक व्यापारिक व जन-जागरूकता पोर्टल।
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 self-start sm:self-auto">
            15 Master Categories
          </span>
        </div>
      </div>

      {/* Grid of 15 Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-4xl">{cat.icon || '📚'}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {cat.questionCount} Questions • {cat.articleCount} Guides
                </span>
              </div>

              <div>
                <Link href={`/knowledge/category/${cat.slug}`} className="block group">
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {cat.nameHi}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">{cat.nameEn}</p>
                </Link>
                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {cat.descriptionHi || cat.descriptionEn}
                </p>
              </div>

              {cat.subcategories && cat.subcategories.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    उप-श्रेणियां (Subcategories):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.subcategories.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/knowledge/category/${cat.slug}?sub=${sub.slug}`}
                        className="text-xs px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-100 transition-colors"
                      >
                        {sub.nameHi || sub.nameEn}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
              <Link
                href={`/knowledge/category/${cat.slug}`}
                className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>इस श्रेणी के सभी सवाल व लेख देखें</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

