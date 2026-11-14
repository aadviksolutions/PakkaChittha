import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { 
  Search, 
  HelpCircle, 
  FileText, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  Clock,
  Sparkles
} from 'lucide-react';
import { globalKnowledgeSearch } from '@/lib/services/knowledgeService';
import { KnowledgeSearchBar } from '@/components/knowledge/KnowledgeSearchBar';

export const metadata: Metadata = {
  title: 'Search Knowledge Hub | ज्ञान केंद्र खोजें',
  description: 'Search answers, articles, rules, and government schemes in Hindi and English.',
};

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const query = typeof resolved.q === 'string' ? resolved.q : '';
  const categorySlug = typeof resolved.category === 'string' ? resolved.category : undefined;

  const results = query.trim()
    ? await globalKnowledgeSearch({
        query: query.trim(),
        categorySlug,
        limit: 20,
      })
    : { questions: [], articles: [], categories: [] };

  const totalResults = results.questions.length + results.articles.length + results.categories.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Search Header */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          ज्ञान केंद्र में खोजें (Search Portal)
        </h1>
        <p className="text-sm text-slate-600">
          जीएसटी, उधारी नियम, कच्चा बिल, एमएसएमई सब्सिडी या कोई भी प्रश्न खोजें।
        </p>

        <KnowledgeSearchBar
          initialQuery={query}
          large
        />
      </div>

      {query ? (
        <div className="space-y-8 pt-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <p className="text-sm text-slate-600">
              <strong className="text-slate-900">"{query}"</strong> के लिए{' '}
              <strong className="text-emerald-700">{totalResults} परिणाम</strong> मिले:
            </p>
          </div>

          {totalResults === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <Search className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                "{query}" के लिए कोई परिणाम नहीं मिला
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                कृपया अलग शब्दों का उपयोग करें, या अपना सवाल हमारे विशेषज्ञों से सीधे निशुल्क पूछें।
              </p>
              <Link
                href={`/knowledge/ask?prefill=${encodeURIComponent(query)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
              >
                <span>यह सवाल सबमिट करें</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Categories Matches */}
              {results.categories.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    मिलती-जुलती श्रेणियां (Matching Categories):
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {results.categories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/knowledge/category/${c.slug}`}
                        className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-sm flex items-center gap-3 transition-all"
                      >
                        <span className="text-2xl">{c.icon || '📚'}</span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{c.nameHi}</h4>
                          <p className="text-xs text-slate-500">{c.nameEn}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions Matches */}
              {results.questions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                    <HelpCircle className="w-5 h-5 text-amber-600" />
                    <span>सवाल और जवाब ({results.questions.length})</span>
                  </div>

                  <div className="space-y-4">
                    {results.questions.map((q) => (
                      <div
                        key={q.id}
                        className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all space-y-2"
                      >
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                          {q.category?.nameHi || q.category?.nameEn}
                        </span>
                        <Link href={`/knowledge/questions/${q.slug}`} className="block group">
                          <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700">
                            {q.titleHi || q.titleEn}
                          </h4>
                        </Link>
                        <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg">
                          {q.shortAnswerHi || q.shortAnswerEn}
                        </p>
                        <div className="flex justify-end pt-1">
                          <Link
                            href={`/knowledge/questions/${q.slug}`}
                            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <span>पूरा उत्तर पढ़ें</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Articles Matches */}
              {results.articles.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                    <FileText className="w-5 h-5 text-teal-600" />
                    <span>गाइड व लेख ({results.articles.length})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.articles.map((art) => (
                      <div
                        key={art.id}
                        className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                              {art.category?.nameHi || art.category?.nameEn}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {art.readingTimeMinutes} min
                            </span>
                          </div>
                          <Link href={`/knowledge/articles/${art.slug}`} className="block group">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-700">
                              {art.titleHi || art.titleEn}
                            </h4>
                          </Link>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {art.summaryHi || art.summaryEn}
                          </p>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <Link
                            href={`/knowledge/articles/${art.slug}`}
                            className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
                          >
                            <span>पढ़ें →</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-sm">
          खोज शुरू करने के लिए ऊपर खोज बॉक्स में कोई भी प्रश्न या विषय लिखें।
        </div>
      )}
    </div>
  );
}
