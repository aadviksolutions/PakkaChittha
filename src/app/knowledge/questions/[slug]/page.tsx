import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { 
  ArrowLeft, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  FileText, 
  BookOpen, 
  ExternalLink,
  ShieldCheck,
  Calendar,
  Eye,
  Share2
} from 'lucide-react';
import { 
  getPublicQuestionBySlug, 
  incrementKnowledgeView 
} from '@/lib/services/knowledgeService';
import { ShareButtons } from '@/components/knowledge/ShareButtons';
import { FeedbackWidget } from '@/components/knowledge/FeedbackWidget';
import { SITE_URL } from '@/lib/seo/constants';

export const revalidate = 60; // Revalidate every minute

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const question = await getPublicQuestionBySlug(slug);
  if (!question) return { title: 'Question Not Found' };

  const title = question.titleHi ? `${question.titleHi} | ${question.titleEn}` : question.titleEn;
  const description = question.shortAnswerHi || question.shortAnswerEn || '';

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      url: `${SITE_URL}/knowledge/questions/${slug}`,
      type: 'article',
    },
    alternates: {
      canonical: `${SITE_URL}/knowledge/questions/${slug}`,
    },
  };
}

export default async function SingleQuestionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const question = await getPublicQuestionBySlug(slug);

  if (!question) {
    notFound();
  }

  // Increment view count asynchronously
  incrementKnowledgeView({ questionId: question.id }).catch(() => {});

  const category = question.category;
  const subcategory = question.subcategory;
  const relatedQuestions = question.relatedQuestions || [];

  // Parse points or split by lines if string
  const importantPoints = question.importantPointsHi
    ? question.importantPointsHi.split('\n').filter(Boolean)
    : question.importantPointsEn
    ? question.importantPointsEn.split('\n').filter(Boolean)
    : [];

  const references = question.referencesHi
    ? question.referencesHi.split('\n').filter(Boolean)
    : question.referencesEn
    ? question.referencesEn.split('\n').filter(Boolean)
    : [];

  // JSON-LD Schema for Google Rich Snippets
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: question.titleEn,
      text: question.titleHi ? `${question.titleHi} (${question.titleEn})` : question.titleEn,
      answerCount: 1,
      acceptedAnswer: {
        '@type': 'Answer',
        text: question.detailedAnswerEn || question.shortAnswerEn,
        datePublished: question.createdAt.toISOString(),
      },
    },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* JSON-LD Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Breadcrumb Navigation */}
      <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/knowledge" className="hover:text-emerald-700">Home</Link>
        <span>/</span>
        <Link href="/knowledge/questions" className="hover:text-emerald-700">Questions</Link>
        {category && (
          <>
            <span>/</span>
            <Link href={`/knowledge/category/${category.slug}`} className="hover:text-emerald-700">
              {category.nameHi || category.nameEn}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-900 font-bold truncate max-w-xs">{question.titleEn}</span>
      </nav>

      {/* Question Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {category && (
              <Link
                href={`/knowledge/category/${category.slug}`}
                className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100 transition-colors"
              >
                {category.nameHi} ({category.nameEn})
              </Link>
            )}
            {subcategory && (
              <span className="text-xs text-slate-500 font-medium">
                • {subcategory.nameHi || subcategory.nameEn}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {question.viewCount + 1} views
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(question.updatedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Question Title (Hindi + English) */}
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {question.titleHi || question.titleEn}
          </h1>
          {question.titleEn && question.titleHi && (
            <p className="text-sm sm:text-base font-semibold text-slate-500 mt-2">
              {question.titleEn}
            </p>
          )}
        </div>

        {/* Share buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            100% Verified Government & Legal Rules
          </span>
          <ShareButtons title={question.titleHi || question.titleEn} />
        </div>
      </div>

      {/* 1. Fast Summary Box (Short Answer) */}
      <div className="p-6 rounded-2xl bg-amber-50/80 border-2 border-amber-200/80 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
          <Lightbulb className="w-5 h-5 text-amber-600 shrink-0" />
          <span>संक्षिप्त उत्तर (Quick Summary / Direct Answer):</span>
        </div>
        <div className="text-sm sm:text-base text-amber-950 leading-relaxed font-medium">
          {question.shortAnswerHi || question.shortAnswerEn}
        </div>
        {question.shortAnswerEn && question.shortAnswerHi && (
          <p className="text-xs text-amber-800/80 pt-2 border-t border-amber-200/60 font-sans italic">
            English: {question.shortAnswerEn}
          </p>
        )}
      </div>

      {/* 2. Detailed Answer */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            विस्तृत समाधान व कानूनी विश्लेषण (Detailed Explanation)
          </h2>
        </div>

        {/* Hindi Detailed Answer */}
        {question.detailedAnswerHi && (
          <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed space-y-3">
            <div className="whitespace-pre-line text-sm sm:text-base">
              {question.detailedAnswerHi}
            </div>
          </div>
        )}

        {/* English Detailed Answer */}
        {question.detailedAnswerEn && (
          <div className="pt-6 border-t border-slate-100 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              In English:
            </span>
            <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {question.detailedAnswerEn}
            </div>
          </div>
        )}
      </div>

      {/* 3. Practical Example / Case Scenario */}
      {(question.practicalExampleHi || question.practicalExampleEn) && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-50/70 to-emerald-50/70 border border-teal-200/80 space-y-3">
          <div className="flex items-center gap-2 text-teal-900 font-bold text-base">
            <span className="text-xl">🏪</span>
            <span>व्यावहारिक उदाहरण (Practical Scenario):</span>
          </div>

          <div className="text-sm sm:text-base text-teal-950 leading-relaxed whitespace-pre-line">
            {question.practicalExampleHi || question.practicalExampleEn}
          </div>

          {question.practicalExampleEn && question.practicalExampleHi && (
            <div className="pt-3 border-t border-teal-200/60 text-xs text-teal-800 leading-relaxed italic">
              Scenario in English: {question.practicalExampleEn}
            </div>
          )}
        </div>
      )}

      {/* 4. Important Points & Precautions (Dos and Don'ts) */}
      {importantPoints.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base pb-2 border-b border-slate-100">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>महत्वपूर्ण सावधानियां एवं नियम (Important Points):</span>
          </div>

          <ul className="space-y-2 text-sm text-slate-700">
            {importantPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Official References & Acts */}
      {references.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <span className="font-bold text-slate-600 uppercase tracking-wider">
            कानूनी संदर्भ एवं आधिकारिक अधिनियम (Acts & Legal References):
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            {references.map((ref, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-md bg-white border border-slate-200 font-mono text-slate-700"
              >
                {ref}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Widget */}
      <FeedbackWidget contentId={question.id} contentType="QUESTION" />

      {/* Related Questions */}
      {relatedQuestions.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">
            संबंधित सवाल (Related Questions)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedQuestions.map((rq) => (
              <Link
                key={rq.id}
                href={`/knowledge/questions/${rq.slug}`}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all space-y-1 group"
              >
                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 leading-snug">
                  {rq.titleHi || rq.titleEn}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {rq.shortAnswerHi || rq.shortAnswerEn}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Back to list */}
      <div className="pt-4 flex justify-between items-center text-xs">
        <Link
          href="/knowledge/questions"
          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>सभी सवाल-जवाब सूची पर वापस जाएं</span>
        </Link>
        <Link
          href="/knowledge/ask"
          className="text-emerald-700 hover:underline font-bold"
        >
          अपना नया सवाल पूछें →
        </Link>
      </div>
    </div>
  );
}
