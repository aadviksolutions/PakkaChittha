import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Eye, 
  User, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  HelpCircle,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { 
  getPublicArticleBySlug, 
  incrementKnowledgeView 
} from '@/lib/services/knowledgeService';
import { ShareButtons } from '@/components/knowledge/ShareButtons';
import { FeedbackWidget } from '@/components/knowledge/FeedbackWidget';
import { SITE_URL } from '@/lib/seo/constants';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);
  if (!article) return { title: 'Article Not Found' };

  const title = article.titleHi ? `${article.titleHi} | ${article.titleEn}` : article.titleEn;
  const description = article.seoDescriptionEn || article.summaryEn || '';

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      url: `${SITE_URL}/knowledge/articles/${slug}`,
      type: 'article',
      publishedTime: article.publishedAt ? article.publishedAt.toISOString() : undefined,
      authors: article.authorName ? [article.authorName] : undefined,
    },
    alternates: {
      canonical: `${SITE_URL}/knowledge/articles/${slug}`,
    },
  };
}

export default async function SingleArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Increment view count
  incrementKnowledgeView({ articleId: article.id }).catch(() => {});

  const category = article.category;
  const subcategory = article.subcategory;
  const relatedArticles = article.relatedArticles || [];

  // JSON-LD Schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.titleEn,
    alternativeHeadline: article.titleHi,
    description: article.seoDescriptionEn || article.summaryEn,
    author: {
      '@type': 'Person',
      name: article.authorName || 'PakkaChittha Editorial Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'PakkaChittha',
      url: SITE_URL,
    },
    datePublished: article.publishedAt ? article.publishedAt.toISOString() : article.createdAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    mainEntityOfPage: `${SITE_URL}/knowledge/articles/${slug}`,
  };

  const content = article.contentHi || article.contentEn;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* JSON-LD Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Breadcrumb Navigation */}
      <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/knowledge" className="hover:text-emerald-700">Home</Link>
        <span>/</span>
        <Link href="/knowledge/articles" className="hover:text-emerald-700">Guides</Link>
        {category && (
          <>
            <span>/</span>
            <Link href={`/knowledge/category/${category.slug}`} className="hover:text-emerald-700">
              {category.nameHi || category.nameEn}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-900 font-bold truncate max-w-xs">{article.titleEn}</span>
      </nav>

      {/* Article Header */}
      <div className="space-y-4 pb-8 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          {category && (
            <Link
              href={`/knowledge/category/${category.slug}`}
              className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200/60"
            >
              {category.nameHi} ({category.nameEn})
            </Link>
          )}
          {subcategory && (
            <span className="text-xs text-slate-400 font-medium">
              • {subcategory.nameHi || subcategory.nameEn}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          {article.titleHi || article.titleEn}
        </h1>

        {article.titleEn && article.titleHi && (
          <p className="text-base sm:text-lg font-semibold text-slate-500">
            {article.titleEn}
          </p>
        )}

        {(article.summaryHi || article.summaryEn) && (
          <p className="text-sm sm:text-base text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-medium">
            {article.summaryHi || article.summaryEn}
          </p>
        )}

        {/* Metadata bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 text-xs text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{article.authorName || 'PakkaChittha Team'}</p>
              <p className="text-[11px] text-slate-400">PakkaChittha Legal & Tax Advisory Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {article.readingTimeMinutes} min read
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {article.viewCount + 1} views
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Share buttons */}
        <div className="pt-2 flex justify-end">
          <ShareButtons title={article.titleHi || article.titleEn} />
        </div>
      </div>

      {/* Article Body */}
      <article className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 space-y-4">
        <div className="whitespace-pre-line font-sans text-base leading-relaxed bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xs">
          {content}
        </div>

        {article.contentEn && article.contentHi && (
          <div className="mt-8 p-6 sm:p-10 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              English Reference Version:
            </h3>
            <div className="whitespace-pre-line text-sm sm:text-base text-slate-700 leading-relaxed font-sans">
              {article.contentEn}
            </div>
          </div>
        )}
      </article>

      {/* Feedback Widget */}
      <FeedbackWidget contentId={article.id} contentType="ARTICLE" />

      {/* Related Guides */}
      {relatedArticles.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">
            संबंधित गाइड व लेख (Related Guides)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedArticles.map((ra) => (
              <Link
                key={ra.id}
                href={`/knowledge/articles/${ra.slug}`}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all space-y-1 group"
              >
                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 leading-snug">
                  {ra.titleHi || ra.titleEn}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {ra.summaryHi || ra.summaryEn}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Back to list */}
      <div className="pt-4 flex justify-between items-center text-xs">
        <Link
          href="/knowledge/articles"
          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>सभी गाइड सूची पर वापस जाएं</span>
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
