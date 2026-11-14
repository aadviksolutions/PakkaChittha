import prisma from '@/lib/prisma';
import { KhStatus, KhLanguage, KhSubmissionStatus, Prisma } from '@prisma/client';

/**
 * Helper to calculate reading time in minutes from content
 */
export function estimateReadingTime(content: string): number {
  if (!content) return 3;
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 180);
  return Math.max(2, minutes);
}

/**
 * Generate a clean URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0900-\u097F\-]+/g, '') // preserves Devanagari and Latin letters
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// ============================================================================
// PUBLIC KNOWLEDGE HUB METHODS
// ============================================================================

/**
 * Fetch all active categories with published count
 */
export async function getPublicCategories() {
  const categories = await prisma.khCategory.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      subcategories: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      },
      _count: {
        select: {
          questions: { where: { status: KhStatus.PUBLISHED } },
          articles: { where: { status: KhStatus.PUBLISHED } },
        },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    nameEn: cat.nameEn,
    nameHi: cat.nameHi,
    descriptionEn: cat.descriptionEn,
    descriptionHi: cat.descriptionHi,
    icon: cat.icon || 'BookOpen',
    imageUrl: cat.imageUrl,
    displayOrder: cat.displayOrder,
    questionCount: cat._count.questions,
    articleCount: cat._count.articles,
    totalCount: cat._count.questions + cat._count.articles,
    subcategories: cat.subcategories.map((sub) => ({
      id: sub.id,
      slug: sub.slug,
      nameEn: sub.nameEn,
      nameHi: sub.nameHi,
      descriptionEn: sub.descriptionEn,
      descriptionHi: sub.descriptionHi,
    })),
  }));
}

/**
 * Fetch a single public category by its slug with its published content
 */
export async function getPublicCategoryBySlug(slug: string) {
  const category = await prisma.khCategory.findUnique({
    where: { slug },
    include: {
      subcategories: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      },
      questions: {
        where: { status: KhStatus.PUBLISHED },
        orderBy: [{ isFeatured: 'desc' }, { viewCount: 'desc' }, { publishedAt: 'desc' }],
        take: 30,
        include: {
          subcategory: true,
        },
      },
      articles: {
        where: { status: KhStatus.PUBLISHED },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        take: 30,
        include: {
          subcategory: true,
        },
      },
      _count: {
        select: {
          questions: { where: { status: KhStatus.PUBLISHED } },
          articles: { where: { status: KhStatus.PUBLISHED } },
        },
      },
    },
  });

  if (!category || !category.isActive) {
    return null;
  }

  return {
    ...category,
    questionCount: category._count.questions,
    articleCount: category._count.articles,
    totalCount: category._count.questions + category._count.articles,
  };
}

/**
 * Public Questions query with filtering, sorting and pagination
 */
export async function getPublicQuestions(params: {
  categorySlug?: string;
  subcategorySlug?: string;
  search?: string;
  language?: string;
  sort?: 'popular' | 'latest' | 'featured';
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 12));
  const skip = (page - 1) * limit;

  const where: Prisma.KhQuestionWhereInput = {
    status: KhStatus.PUBLISHED,
  };

  if (params.categorySlug) {
    where.category = { slug: params.categorySlug, isActive: true };
  }

  if (params.subcategorySlug) {
    where.subcategory = { slug: params.subcategorySlug, isActive: true };
  }

  if (params.language && params.language !== 'all') {
    const langUpper = params.language.toUpperCase();
    if (langUpper === 'HI') {
      where.language = { in: [KhLanguage.HI, KhLanguage.BOTH] };
    } else if (langUpper === 'EN') {
      where.language = { in: [KhLanguage.EN, KhLanguage.BOTH] };
    }
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { titleEn: { contains: q, mode: 'insensitive' } },
      { titleHi: { contains: q, mode: 'insensitive' } },
      { shortAnswerEn: { contains: q, mode: 'insensitive' } },
      { shortAnswerHi: { contains: q, mode: 'insensitive' } },
      { detailedAnswerEn: { contains: q, mode: 'insensitive' } },
      { detailedAnswerHi: { contains: q, mode: 'insensitive' } },
    ];
  }

  let orderBy: Prisma.KhQuestionOrderByWithRelationInput[] = [{ publishedAt: 'desc' }];
  if (params.sort === 'popular') {
    orderBy = [{ viewCount: 'desc' }, { helpfulCount: 'desc' }];
  } else if (params.sort === 'featured') {
    orderBy = [{ isFeatured: 'desc' }, { viewCount: 'desc' }];
  }

  const [questions, totalCount] = await Promise.all([
    prisma.khQuestion.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: { select: { id: true, slug: true, nameEn: true, nameHi: true, icon: true } },
        subcategory: { select: { id: true, slug: true, nameEn: true, nameHi: true } },
      },
    }),
    prisma.khQuestion.count({ where }),
  ]);

  return {
    questions,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + questions.length < totalCount,
    },
  };
}

/**
 * Fetch a single public question by slug
 */
export async function getPublicQuestionBySlug(slug: string) {
  const question = await prisma.khQuestion.findUnique({
    where: { slug },
    include: {
      category: {
        select: { id: true, slug: true, nameEn: true, nameHi: true, icon: true },
      },
      subcategory: {
        select: { id: true, slug: true, nameEn: true, nameHi: true },
      },
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!question || question.status !== KhStatus.PUBLISHED) {
    return null;
  }

  // Fetch related questions in same category
  const relatedQuestions = await prisma.khQuestion.findMany({
    where: {
      categoryId: question.categoryId,
      id: { not: question.id },
      status: KhStatus.PUBLISHED,
    },
    take: 5,
    orderBy: { viewCount: 'desc' },
    select: {
      id: true,
      slug: true,
      titleEn: true,
      titleHi: true,
      shortAnswerEn: true,
      shortAnswerHi: true,
    },
  });

  // Fetch related articles in same category
  const relatedArticles = await prisma.khArticle.findMany({
    where: {
      categoryId: question.categoryId,
      status: KhStatus.PUBLISHED,
    },
    take: 3,
    orderBy: { viewCount: 'desc' },
    select: {
      id: true,
      slug: true,
      titleEn: true,
      titleHi: true,
      summaryEn: true,
      summaryHi: true,
      featuredImage: true,
      readingTimeMinutes: true,
    },
  });

  return {
    ...question,
    relatedQuestions,
    relatedArticles,
  };
}

/**
 * Public Articles query with filtering, sorting and pagination
 */
export async function getPublicArticles(params: {
  categorySlug?: string;
  subcategorySlug?: string;
  search?: string;
  language?: string;
  sort?: 'popular' | 'latest' | 'featured';
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 9));
  const skip = (page - 1) * limit;

  const where: Prisma.KhArticleWhereInput = {
    status: KhStatus.PUBLISHED,
  };

  if (params.categorySlug) {
    where.category = { slug: params.categorySlug, isActive: true };
  }

  if (params.subcategorySlug) {
    where.subcategory = { slug: params.subcategorySlug, isActive: true };
  }

  if (params.language && params.language !== 'all') {
    const langUpper = params.language.toUpperCase();
    if (langUpper === 'HI') {
      where.language = { in: [KhLanguage.HI, KhLanguage.BOTH] };
    } else if (langUpper === 'EN') {
      where.language = { in: [KhLanguage.EN, KhLanguage.BOTH] };
    }
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { titleEn: { contains: q, mode: 'insensitive' } },
      { titleHi: { contains: q, mode: 'insensitive' } },
      { summaryEn: { contains: q, mode: 'insensitive' } },
      { summaryHi: { contains: q, mode: 'insensitive' } },
      { contentEn: { contains: q, mode: 'insensitive' } },
      { contentHi: { contains: q, mode: 'insensitive' } },
    ];
  }

  let orderBy: Prisma.KhArticleOrderByWithRelationInput[] = [{ publishedAt: 'desc' }];
  if (params.sort === 'popular') {
    orderBy = [{ viewCount: 'desc' }, { helpfulCount: 'desc' }];
  } else if (params.sort === 'featured') {
    orderBy = [{ isFeatured: 'desc' }, { publishedAt: 'desc' }];
  }

  const [articles, totalCount] = await Promise.all([
    prisma.khArticle.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: { select: { id: true, slug: true, nameEn: true, nameHi: true, icon: true } },
        subcategory: { select: { id: true, slug: true, nameEn: true, nameHi: true } },
      },
    }),
    prisma.khArticle.count({ where }),
  ]);

  return {
    articles,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + articles.length < totalCount,
    },
  };
}

/**
 * Fetch a single public article by slug
 */
export async function getPublicArticleBySlug(slug: string) {
  const article = await prisma.khArticle.findUnique({
    where: { slug },
    include: {
      category: {
        select: { id: true, slug: true, nameEn: true, nameHi: true, icon: true },
      },
      subcategory: {
        select: { id: true, slug: true, nameEn: true, nameHi: true },
      },
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!article || article.status !== KhStatus.PUBLISHED) {
    return null;
  }

  // Fetch related articles in same category
  const relatedArticles = await prisma.khArticle.findMany({
    where: {
      categoryId: article.categoryId,
      id: { not: article.id },
      status: KhStatus.PUBLISHED,
    },
    take: 3,
    orderBy: { viewCount: 'desc' },
    select: {
      id: true,
      slug: true,
      titleEn: true,
      titleHi: true,
      summaryEn: true,
      summaryHi: true,
      featuredImage: true,
      readingTimeMinutes: true,
    },
  });

  // Fetch related questions in same category
  const relatedQuestions = await prisma.khQuestion.findMany({
    where: {
      categoryId: article.categoryId,
      status: KhStatus.PUBLISHED,
    },
    take: 5,
    orderBy: { viewCount: 'desc' },
    select: {
      id: true,
      slug: true,
      titleEn: true,
      titleHi: true,
      shortAnswerEn: true,
      shortAnswerHi: true,
    },
  });

  return {
    ...article,
    relatedArticles,
    relatedQuestions,
  };
}

/**
 * Global Search across Questions, Articles, and Categories
 */
export async function globalKnowledgeSearch(params: {
  query: string;
  language?: string;
  type?: 'all' | 'questions' | 'articles';
  categorySlug?: string;
  limit?: number;
}) {
  const q = params.query.trim();
  if (!q || q.length < 2) {
    return { questions: [], articles: [], categories: [], query: q };
  }

  const limit = Math.min(20, params.limit || 8);
  const searchType = params.type || 'all';

  const categoryFilter = params.categorySlug
    ? { category: { slug: params.categorySlug, isActive: true } }
    : {};

  const [questions, articles, categories] = await Promise.all([
    searchType === 'articles'
      ? Promise.resolve([])
      : prisma.khQuestion.findMany({
          where: {
            status: KhStatus.PUBLISHED,
            ...categoryFilter,
            OR: [
              { titleEn: { contains: q, mode: 'insensitive' } },
              { titleHi: { contains: q, mode: 'insensitive' } },
              { shortAnswerEn: { contains: q, mode: 'insensitive' } },
              { shortAnswerHi: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: limit,
          orderBy: { viewCount: 'desc' },
          include: {
            category: { select: { slug: true, nameEn: true, nameHi: true } },
          },
        }),
    searchType === 'questions'
      ? Promise.resolve([])
      : prisma.khArticle.findMany({
          where: {
            status: KhStatus.PUBLISHED,
            ...categoryFilter,
            OR: [
              { titleEn: { contains: q, mode: 'insensitive' } },
              { titleHi: { contains: q, mode: 'insensitive' } },
              { summaryEn: { contains: q, mode: 'insensitive' } },
              { summaryHi: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: limit,
          orderBy: { viewCount: 'desc' },
          include: {
            category: { select: { slug: true, nameEn: true, nameHi: true } },
          },
        }),
    prisma.khCategory.findMany({
      where: {
        isActive: true,
        OR: [
          { nameEn: { contains: q, mode: 'insensitive' } },
          { nameHi: { contains: q, mode: 'insensitive' } },
          { descriptionEn: { contains: q, mode: 'insensitive' } },
          { descriptionHi: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 4,
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameHi: true,
        icon: true,
        articleCount: true,
        questionCount: true,
      },
    }),
  ]);

  return {
    query: q,
    questions,
    articles,
    categories,
    totalFound: questions.length + articles.length + categories.length,
  };
}

/**
 * Public User Question Submission ("Ask a Question")
 */
export async function submitUserQuestion(input: {
  name?: string;
  email?: string;
  question: string;
  categoryId?: string;
  preferredLang?: string;
  ipHash?: string;
}) {
  const trimmedQ = input.question?.trim();
  if (!trimmedQ || trimmedQ.length < 10) {
    throw new Error('कृपया अपना सवाल विस्तार से लिखें (कम से कम 10 अक्षर)। / Please provide a valid question (at least 10 characters).');
  }

  return prisma.khSubmission.create({
    data: {
      name: input.name?.trim() || null,
      email: input.email?.trim() || null,
      question: trimmedQ,
      categoryId: input.categoryId || null,
      preferredLang: input.preferredLang || 'hi',
      ipHash: input.ipHash || null,
      status: KhSubmissionStatus.PENDING,
    },
  });
}

/**
 * Record feedback (Helpful / Not Helpful)
 */
export async function recordFeedback(input: {
  questionId?: string;
  articleId?: string;
  isHelpful: boolean;
  feedbackText?: string;
  ipHash?: string;
}) {
  if (!input.questionId && !input.articleId) {
    throw new Error('Target questionId or articleId required.');
  }

  // Create feedback record
  const feedback = await prisma.khFeedback.create({
    data: {
      questionId: input.questionId || null,
      articleId: input.articleId || null,
      isHelpful: input.isHelpful,
      feedbackText: input.feedbackText?.trim() || null,
      ipHash: input.ipHash || null,
    },
  });

  // Increment counter on target item
  if (input.questionId) {
    await prisma.khQuestion.update({
      where: { id: input.questionId },
      data: input.isHelpful ? { helpfulCount: { increment: 1 } } : { notHelpfulCount: { increment: 1 } },
    });
  } else if (input.articleId) {
    await prisma.khArticle.update({
      where: { id: input.articleId },
      data: input.isHelpful ? { helpfulCount: { increment: 1 } } : { notHelpfulCount: { increment: 1 } },
    });
  }

  return feedback;
}

/**
 * Increment view count
 */
export async function incrementKnowledgeView(input: { questionId?: string; articleId?: string }) {
  if (input.questionId) {
    return prisma.khQuestion.update({
      where: { id: input.questionId },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    });
  }
  if (input.articleId) {
    return prisma.khArticle.update({
      where: { id: input.articleId },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    });
  }
  return null;
}

// ============================================================================
// ADMIN MANAGEMENT METHODS (SUPER ADMIN ONLY)
// ============================================================================

/**
 * Super Admin Knowledge Hub Dashboard Metrics
 */
export async function adminGetKnowledgeDashboardMetrics() {
  const [
    totalCategories,
    totalSubcategories,
    totalQuestions,
    publishedQuestions,
    draftQuestions,
    totalArticles,
    publishedArticles,
    draftArticles,
    pendingSubmissions,
    topQuestions,
    topArticles,
    recentSubmissions,
  ] = await Promise.all([
    prisma.khCategory.count(),
    prisma.khSubcategory.count(),
    prisma.khQuestion.count(),
    prisma.khQuestion.count({ where: { status: KhStatus.PUBLISHED } }),
    prisma.khQuestion.count({ where: { status: KhStatus.DRAFT } }),
    prisma.khArticle.count(),
    prisma.khArticle.count({ where: { status: KhStatus.PUBLISHED } }),
    prisma.khArticle.count({ where: { status: KhStatus.DRAFT } }),
    prisma.khSubmission.count({ where: { status: KhSubmissionStatus.PENDING } }),
    prisma.khQuestion.findMany({
      take: 5,
      orderBy: { viewCount: 'desc' },
      select: { id: true, slug: true, titleEn: true, titleHi: true, viewCount: true, status: true },
    }),
    prisma.khArticle.findMany({
      take: 5,
      orderBy: { viewCount: 'desc' },
      select: { id: true, slug: true, titleEn: true, titleHi: true, viewCount: true, status: true },
    }),
    prisma.khSubmission.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { nameEn: true, nameHi: true } } },
    }),
  ]);

  return {
    metrics: {
      totalCategories,
      totalSubcategories,
      totalQuestions,
      publishedQuestions,
      draftQuestions,
      totalArticles,
      publishedArticles,
      draftArticles,
      pendingSubmissions,
    },
    topQuestions,
    topArticles,
    recentSubmissions,
  };
}

/**
 * Admin: Get all categories with full details
 */
export async function adminGetCategories() {
  return prisma.khCategory.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      subcategories: {
        orderBy: { displayOrder: 'asc' },
      },
      _count: {
        select: {
          questions: true,
          articles: true,
          submissions: true,
        },
      },
    },
  });
}

/**
 * Admin: Create a new Category
 */
export async function adminCreateCategory(input: {
  slug?: string;
  nameEn: string;
  nameHi: string;
  descriptionEn?: string | null;
  descriptionHi?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}) {
  const generatedSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.nameEn);
  return prisma.khCategory.create({
    data: {
      slug: generatedSlug,
      nameEn: input.nameEn.trim(),
      nameHi: input.nameHi.trim(),
      descriptionEn: input.descriptionEn?.trim() || null,
      descriptionHi: input.descriptionHi?.trim() || null,
      icon: input.icon?.trim() || 'BookOpen',
      imageUrl: input.imageUrl?.trim() || null,
      displayOrder: input.displayOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
}

/**
 * Admin: Update an existing Category
 */
export async function adminUpdateCategory(
  id: string,
  input: {
    slug?: string;
    nameEn?: string;
    nameHi?: string;
    descriptionEn?: string | null;
    descriptionHi?: string | null;
    icon?: string | null;
    imageUrl?: string | null;
    displayOrder?: number;
    isActive?: boolean;
  }
) {
  return prisma.khCategory.update({
    where: { id },
    data: {
      slug: input.slug ? slugify(input.slug) : undefined,
      nameEn: input.nameEn ? input.nameEn.trim() : undefined,
      nameHi: input.nameHi ? input.nameHi.trim() : undefined,
      descriptionEn: input.descriptionEn !== undefined ? (input.descriptionEn ? input.descriptionEn.trim() : null) : undefined,
      descriptionHi: input.descriptionHi !== undefined ? (input.descriptionHi ? input.descriptionHi.trim() : null) : undefined,
      icon: input.icon !== undefined ? (input.icon ? input.icon.trim() : 'BookOpen') : undefined,
      imageUrl: input.imageUrl !== undefined ? (input.imageUrl ? input.imageUrl.trim() : null) : undefined,
      displayOrder: input.displayOrder !== undefined ? input.displayOrder : undefined,
      isActive: input.isActive !== undefined ? input.isActive : undefined,
    },
  });
}

/**
 * Admin: Safely delete or archive a category
 */
export async function adminDeleteCategory(id: string, reassignCategoryId?: string) {
  const category = await prisma.khCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: { questions: true, articles: true },
      },
    },
  });

  if (!category) {
    throw new Error('Category not found.');
  }

  // If content exists and reassign target provided, safely reassign
  if (category._count.questions > 0 || category._count.articles > 0) {
    if (!reassignCategoryId) {
      // Soft-delete by setting inactive
      return prisma.khCategory.update({
        where: { id },
        data: { isActive: false },
      });
    }

    await prisma.$transaction([
      prisma.khQuestion.updateMany({
        where: { categoryId: id },
        data: { categoryId: reassignCategoryId, subcategoryId: null },
      }),
      prisma.khArticle.updateMany({
        where: { categoryId: id },
        data: { categoryId: reassignCategoryId, subcategoryId: null },
      }),
      prisma.khCategory.delete({ where: { id } }),
    ]);
    return { success: true, message: 'Category deleted and content reassigned.' };
  }

  return prisma.khCategory.delete({ where: { id } });
}

/**
 * Admin: Create Subcategory
 */
export async function adminCreateSubcategory(input: {
  categoryId: string;
  slug?: string;
  nameEn: string;
  nameHi: string;
  descriptionEn?: string | null;
  descriptionHi?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}) {
  const generatedSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.nameEn);
  return prisma.khSubcategory.create({
    data: {
      categoryId: input.categoryId,
      slug: generatedSlug,
      nameEn: input.nameEn.trim(),
      nameHi: input.nameHi.trim(),
      descriptionEn: input.descriptionEn?.trim() || null,
      descriptionHi: input.descriptionHi?.trim() || null,
      displayOrder: input.displayOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
}

/**
 * Admin: Update Subcategory
 */
export async function adminUpdateSubcategory(
  id: string,
  input: {
    slug?: string;
    nameEn?: string;
    nameHi?: string;
    descriptionEn?: string | null;
    descriptionHi?: string | null;
    displayOrder?: number;
    isActive?: boolean;
  }
) {
  return prisma.khSubcategory.update({
    where: { id },
    data: {
      slug: input.slug ? slugify(input.slug) : undefined,
      nameEn: input.nameEn ? input.nameEn.trim() : undefined,
      nameHi: input.nameHi ? input.nameHi.trim() : undefined,
      descriptionEn: input.descriptionEn !== undefined ? (input.descriptionEn ? input.descriptionEn.trim() : null) : undefined,
      descriptionHi: input.descriptionHi !== undefined ? (input.descriptionHi ? input.descriptionHi.trim() : null) : undefined,
      displayOrder: input.displayOrder !== undefined ? input.displayOrder : undefined,
      isActive: input.isActive !== undefined ? input.isActive : undefined,
    },
  });
}

/**
 * Admin: Delete Subcategory
 */
export async function adminDeleteSubcategory(id: string) {
  return prisma.khSubcategory.delete({ where: { id } });
}

/**
 * Admin: Questions listing with search & filters
 */
export async function adminGetQuestions(params: {
  categoryId?: string;
  status?: KhStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.KhQuestionWhereInput = {};
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.status) where.status = params.status;
  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { titleEn: { contains: q, mode: 'insensitive' } },
      { titleHi: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [questions, totalCount] = await Promise.all([
    prisma.khQuestion.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: {
        category: { select: { id: true, nameEn: true, nameHi: true } },
        subcategory: { select: { id: true, nameEn: true, nameHi: true } },
      },
    }),
    prisma.khQuestion.count({ where }),
  ]);

  return { questions, pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) } };
}

/**
 * Admin: Create Question
 */
export async function adminCreateQuestion(input: {
  slug?: string;
  categoryId: string;
  subcategoryId?: string | null;
  language?: KhLanguage;
  status?: KhStatus;
  titleEn: string;
  titleHi: string;
  shortAnswerEn: string;
  shortAnswerHi: string;
  detailedAnswerEn?: string | null;
  detailedAnswerHi?: string | null;
  simpleExplanationEn?: string | null;
  simpleExplanationHi?: string | null;
  practicalExampleEn?: string | null;
  practicalExampleHi?: string | null;
  importantPointsEn?: string | null;
  importantPointsHi?: string | null;
  referencesEn?: string | null;
  referencesHi?: string | null;
  isFeatured?: boolean;
}) {
  const generatedSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.titleEn || input.titleHi);
  const status = input.status || KhStatus.DRAFT;
  const publishedAt = status === KhStatus.PUBLISHED ? new Date() : null;

  const question = await prisma.khQuestion.create({
    data: {
      slug: generatedSlug,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId || null,
      language: input.language || KhLanguage.BOTH,
      status,
      titleEn: input.titleEn.trim(),
      titleHi: input.titleHi.trim(),
      shortAnswerEn: input.shortAnswerEn.trim(),
      shortAnswerHi: input.shortAnswerHi.trim(),
      detailedAnswerEn: input.detailedAnswerEn?.trim() || null,
      detailedAnswerHi: input.detailedAnswerHi?.trim() || null,
      simpleExplanationEn: input.simpleExplanationEn?.trim() || null,
      simpleExplanationHi: input.simpleExplanationHi?.trim() || null,
      practicalExampleEn: input.practicalExampleEn?.trim() || null,
      practicalExampleHi: input.practicalExampleHi?.trim() || null,
      importantPointsEn: input.importantPointsEn?.trim() || null,
      importantPointsHi: input.importantPointsHi?.trim() || null,
      referencesEn: input.referencesEn?.trim() || null,
      referencesHi: input.referencesHi?.trim() || null,
      isFeatured: input.isFeatured ?? false,
      publishedAt,
    },
  });

  // Update category question counter
  await prisma.khCategory.update({
    where: { id: input.categoryId },
    data: { questionCount: { increment: 1 } },
  });

  return question;
}

/**
 * Admin: Update Question
 */
export async function adminUpdateQuestion(
  id: string,
  input: {
    slug?: string;
    categoryId?: string;
    subcategoryId?: string | null;
    language?: KhLanguage;
    status?: KhStatus;
    titleEn?: string;
    titleHi?: string;
    shortAnswerEn?: string;
    shortAnswerHi?: string;
    detailedAnswerEn?: string | null;
    detailedAnswerHi?: string | null;
    simpleExplanationEn?: string | null;
    simpleExplanationHi?: string | null;
    practicalExampleEn?: string | null;
    practicalExampleHi?: string | null;
    importantPointsEn?: string | null;
    importantPointsHi?: string | null;
    referencesEn?: string | null;
    referencesHi?: string | null;
    isFeatured?: boolean;
  }
) {
  const existing = await prisma.khQuestion.findUnique({ where: { id } });
  if (!existing) throw new Error('Question not found.');

  const willBePublished = input.status === KhStatus.PUBLISHED;
  const publishedAt = willBePublished && !existing.publishedAt ? new Date() : existing.publishedAt;

  return prisma.khQuestion.update({
    where: { id },
    data: {
      slug: input.slug ? slugify(input.slug) : undefined,
      categoryId: input.categoryId || undefined,
      subcategoryId: input.subcategoryId !== undefined ? input.subcategoryId : undefined,
      language: input.language || undefined,
      status: input.status || undefined,
      titleEn: input.titleEn ? input.titleEn.trim() : undefined,
      titleHi: input.titleHi ? input.titleHi.trim() : undefined,
      shortAnswerEn: input.shortAnswerEn ? input.shortAnswerEn.trim() : undefined,
      shortAnswerHi: input.shortAnswerHi ? input.shortAnswerHi.trim() : undefined,
      detailedAnswerEn: input.detailedAnswerEn !== undefined ? (input.detailedAnswerEn ? input.detailedAnswerEn.trim() : null) : undefined,
      detailedAnswerHi: input.detailedAnswerHi !== undefined ? (input.detailedAnswerHi ? input.detailedAnswerHi.trim() : null) : undefined,
      simpleExplanationEn: input.simpleExplanationEn !== undefined ? (input.simpleExplanationEn ? input.simpleExplanationEn.trim() : null) : undefined,
      simpleExplanationHi: input.simpleExplanationHi !== undefined ? (input.simpleExplanationHi ? input.simpleExplanationHi.trim() : null) : undefined,
      practicalExampleEn: input.practicalExampleEn !== undefined ? (input.practicalExampleEn ? input.practicalExampleEn.trim() : null) : undefined,
      practicalExampleHi: input.practicalExampleHi !== undefined ? (input.practicalExampleHi ? input.practicalExampleHi.trim() : null) : undefined,
      importantPointsEn: input.importantPointsEn !== undefined ? (input.importantPointsEn ? input.importantPointsEn.trim() : null) : undefined,
      importantPointsHi: input.importantPointsHi !== undefined ? (input.importantPointsHi ? input.importantPointsHi.trim() : null) : undefined,
      referencesEn: input.referencesEn !== undefined ? (input.referencesEn ? input.referencesEn.trim() : null) : undefined,
      referencesHi: input.referencesHi !== undefined ? (input.referencesHi ? input.referencesHi.trim() : null) : undefined,
      isFeatured: input.isFeatured !== undefined ? input.isFeatured : undefined,
      publishedAt,
    },
  });
}

/**
 * Admin: Delete Question
 */
export async function adminDeleteQuestion(id: string) {
  const existing = await prisma.khQuestion.findUnique({ where: { id } });
  if (existing) {
    await prisma.khCategory.update({
      where: { id: existing.categoryId },
      data: { questionCount: { decrement: 1 } },
    });
  }
  return prisma.khQuestion.delete({ where: { id } });
}

/**
 * Admin: Articles listing with search & filters
 */
export async function adminGetArticles(params: {
  categoryId?: string;
  status?: KhStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.KhArticleWhereInput = {};
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.status) where.status = params.status;
  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { titleEn: { contains: q, mode: 'insensitive' } },
      { titleHi: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [articles, totalCount] = await Promise.all([
    prisma.khArticle.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: {
        category: { select: { id: true, nameEn: true, nameHi: true } },
        subcategory: { select: { id: true, nameEn: true, nameHi: true } },
      },
    }),
    prisma.khArticle.count({ where }),
  ]);

  return { articles, pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) } };
}

/**
 * Admin: Create Article
 */
export async function adminCreateArticle(input: {
  slug?: string;
  categoryId: string;
  subcategoryId?: string | null;
  language?: KhLanguage;
  status?: KhStatus;
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  summaryHi: string;
  contentEn: string;
  contentHi: string;
  featuredImage?: string | null;
  readingTimeMinutes?: number;
  authorName?: string;
  reviewerName?: string | null;
  seoTitleEn?: string | null;
  seoTitleHi?: string | null;
  seoDescriptionEn?: string | null;
  seoDescriptionHi?: string | null;
  canonicalUrl?: string | null;
  isFeatured?: boolean;
}) {
  const generatedSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.titleEn || input.titleHi);
  const status = input.status || KhStatus.DRAFT;
  const publishedAt = status === KhStatus.PUBLISHED ? new Date() : null;
  const readingTime = input.readingTimeMinutes || estimateReadingTime(input.contentEn || input.contentHi);

  const article = await prisma.khArticle.create({
    data: {
      slug: generatedSlug,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId || null,
      language: input.language || KhLanguage.BOTH,
      status,
      titleEn: input.titleEn.trim(),
      titleHi: input.titleHi.trim(),
      summaryEn: input.summaryEn.trim(),
      summaryHi: input.summaryHi.trim(),
      contentEn: input.contentEn,
      contentHi: input.contentHi,
      featuredImage: input.featuredImage?.trim() || null,
      readingTimeMinutes: readingTime,
      authorName: input.authorName?.trim() || 'PakkaChittha Editorial Team',
      reviewerName: input.reviewerName?.trim() || null,
      seoTitleEn: input.seoTitleEn?.trim() || null,
      seoTitleHi: input.seoTitleHi?.trim() || null,
      seoDescriptionEn: input.seoDescriptionEn?.trim() || null,
      seoDescriptionHi: input.seoDescriptionHi?.trim() || null,
      canonicalUrl: input.canonicalUrl?.trim() || null,
      isFeatured: input.isFeatured ?? false,
      publishedAt,
    },
  });

  // Update category article counter
  await prisma.khCategory.update({
    where: { id: input.categoryId },
    data: { articleCount: { increment: 1 } },
  });

  return article;
}

/**
 * Admin: Update Article
 */
export async function adminUpdateArticle(
  id: string,
  input: {
    slug?: string;
    categoryId?: string;
    subcategoryId?: string | null;
    language?: KhLanguage;
    status?: KhStatus;
    titleEn?: string;
    titleHi?: string;
    summaryEn?: string;
    summaryHi?: string;
    contentEn?: string;
    contentHi?: string;
    featuredImage?: string | null;
    readingTimeMinutes?: number;
    authorName?: string;
    reviewerName?: string | null;
    seoTitleEn?: string | null;
    seoTitleHi?: string | null;
    seoDescriptionEn?: string | null;
    seoDescriptionHi?: string | null;
    canonicalUrl?: string | null;
    isFeatured?: boolean;
  }
) {
  const existing = await prisma.khArticle.findUnique({ where: { id } });
  if (!existing) throw new Error('Article not found.');

  const willBePublished = input.status === KhStatus.PUBLISHED;
  const publishedAt = willBePublished && !existing.publishedAt ? new Date() : existing.publishedAt;

  return prisma.khArticle.update({
    where: { id },
    data: {
      slug: input.slug ? slugify(input.slug) : undefined,
      categoryId: input.categoryId || undefined,
      subcategoryId: input.subcategoryId !== undefined ? input.subcategoryId : undefined,
      language: input.language || undefined,
      status: input.status || undefined,
      titleEn: input.titleEn ? input.titleEn.trim() : undefined,
      titleHi: input.titleHi ? input.titleHi.trim() : undefined,
      summaryEn: input.summaryEn ? input.summaryEn.trim() : undefined,
      summaryHi: input.summaryHi ? input.summaryHi.trim() : undefined,
      contentEn: input.contentEn !== undefined ? input.contentEn : undefined,
      contentHi: input.contentHi !== undefined ? input.contentHi : undefined,
      featuredImage: input.featuredImage !== undefined ? (input.featuredImage ? input.featuredImage.trim() : null) : undefined,
      readingTimeMinutes: input.readingTimeMinutes !== undefined ? input.readingTimeMinutes : undefined,
      authorName: input.authorName !== undefined ? input.authorName.trim() : undefined,
      reviewerName: input.reviewerName !== undefined ? (input.reviewerName ? input.reviewerName.trim() : null) : undefined,
      seoTitleEn: input.seoTitleEn !== undefined ? (input.seoTitleEn ? input.seoTitleEn.trim() : null) : undefined,
      seoTitleHi: input.seoTitleHi !== undefined ? (input.seoTitleHi ? input.seoTitleHi.trim() : null) : undefined,
      seoDescriptionEn: input.seoDescriptionEn !== undefined ? (input.seoDescriptionEn ? input.seoDescriptionEn.trim() : null) : undefined,
      seoDescriptionHi: input.seoDescriptionHi !== undefined ? (input.seoDescriptionHi ? input.seoDescriptionHi.trim() : null) : undefined,
      canonicalUrl: input.canonicalUrl !== undefined ? (input.canonicalUrl ? input.canonicalUrl.trim() : null) : undefined,
      isFeatured: input.isFeatured !== undefined ? input.isFeatured : undefined,
      publishedAt,
    },
  });
}

/**
 * Admin: Delete Article
 */
export async function adminDeleteArticle(id: string) {
  const existing = await prisma.khArticle.findUnique({ where: { id } });
  if (existing) {
    await prisma.khCategory.update({
      where: { id: existing.categoryId },
      data: { articleCount: { decrement: 1 } },
    });
  }
  return prisma.khArticle.delete({ where: { id } });
}

/**
 * Admin: Get Submissions
 */
export async function adminGetSubmissions(params: {
  status?: KhSubmissionStatus;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.KhSubmissionWhereInput = {};
  if (params.status) where.status = params.status;

  const [submissions, totalCount] = await Promise.all([
    prisma.khSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        category: { select: { id: true, nameEn: true, nameHi: true } },
      },
    }),
    prisma.khSubmission.count({ where }),
  ]);

  return { submissions, pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) } };
}

/**
 * Admin: Review Submission (Approve, Reject, or Answer)
 */
export async function adminReviewSubmission(
  id: string,
  input: {
    status: KhSubmissionStatus;
    adminNotes?: string | null;
  }
) {
  return prisma.khSubmission.update({
    where: { id },
    data: {
      status: input.status,
      adminNotes: input.adminNotes !== undefined ? input.adminNotes : undefined,
    },
  });
}

