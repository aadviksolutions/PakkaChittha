# PakkaChittha Knowledge Hub — Android Integration Guide

**Module:** Knowledge Hub & Public Awareness Portal  
**Tagline:** हर सवाल का जवाब, अब एक ही जगह!  
**Architecture:** Jetpack Compose + Retrofit + Kotlin Coroutines + Room (Optional Offline Cache)  
**Access Model:** 100% Free Public Access (No Auth Header required for public endpoints)

---

## 1. Overview & Public API Contract

The Knowledge Hub backend endpoints are exposed under `/api/v1/knowledge/` and are accessible without JWT or cookie session tokens. This ensures that any Android user can open and browse the Knowledge Hub immediately after app install without signing in.

### Base URL:
- Production: `https://pakkachittha.com/api/v1/knowledge/`
- Local/Dev: `http://10.0.2.2:3000/api/v1/knowledge/` (Android Emulator)

---

## 2. Retrofit Service Interface (Kotlin)

```kotlin
package com.pakkachittha.app.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface KnowledgeApiService {

    // 1. Get all active categories with subcategory summary
    @GET("categories")
    suspend fun getCategories(): Response<KnowledgeCategoriesResponse>

    // 2. Get single category with questions & articles
    @GET("categories/{slug}")
    suspend fun getCategoryDetails(
        @Path("slug") slug: String
    ): Response<KnowledgeCategoryDetailResponse>

    // 3. Get questions directory (paginated, with filters)
    @GET("questions")
    suspend fun getQuestions(
        @Query("category") categorySlug: String? = null,
        @Query("targetAudience") audience: String? = null,
        @Query("q") query: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 15
    ): Response<KnowledgeQuestionsResponse>

    // 4. Get single question by slug
    @GET("questions/{slug}")
    suspend fun getQuestionBySlug(
        @Path("slug") slug: String
    ): Response<KnowledgeQuestionDetailResponse>

    // 5. Get articles directory (paginated)
    @GET("articles")
    suspend fun getArticles(
        @Query("category") categorySlug: String? = null,
        @Query("q") query: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 12
    ): Response<KnowledgeArticlesResponse>

    // 6. Get single article by slug
    @GET("articles/{slug}")
    suspend fun getArticleBySlug(
        @Path("slug") slug: String
    ): Response<KnowledgeArticleDetailResponse>

    // 7. Global Search (Questions, Articles & Categories)
    @GET("search")
    suspend fun globalSearch(
        @Query("q") query: String,
        @Query("category") categorySlug: String? = null,
        @Query("audience") audience: String? = null
    ): Response<KnowledgeSearchResponse>

    // 8. Submit visitor question
    @POST("questions/submit")
    suspend fun submitQuestion(
        @Body request: SubmitQuestionRequest
    ): Response<SubmitQuestionResponse>

    // 9. Submit helpful/not helpful feedback
    @POST("feedback")
    suspend fun submitFeedback(
        @Body request: KnowledgeFeedbackRequest
    ): Response<KnowledgeFeedbackResponse>
}
```

---

## 3. Data Transfer Objects (DTOs)

```kotlin
data class KnowledgeCategoryDto(
    val id: String,
    val nameEn: String,
    val nameHi: String,
    val slug: String,
    val descriptionEn: String?,
    val descriptionHi: String?,
    val icon: String?,
    val questionCount: Int,
    val articleCount: Int,
    val subcategories: List<KnowledgeSubcategoryDto>?
)

data class KnowledgeSubcategoryDto(
    val id: String,
    val nameEn: String,
    val nameHi: String,
    val slug: String
)

data class KnowledgeQuestionDto(
    val id: String,
    val slug: String,
    val questionEn: String,
    val questionHi: String?,
    val shortAnswerEn: String,
    val shortAnswerHi: String?,
    val detailedAnswerEn: String?,
    val detailedAnswerHi: String?,
    val practicalExampleEn: String?,
    val practicalExampleHi: String?,
    val importantPointsEn: List<String>?,
    val importantPointsHi: List<String>?,
    val officialReferences: List<String>?,
    val targetAudience: String,
    val viewCount: Int,
    val category: KnowledgeCategorySummaryDto?,
    val subcategory: KnowledgeSubcategoryDto?
)

data class SubmitQuestionRequest(
    val name: String,
    val question: String,
    val context: String? = null,
    val categoryId: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val city: String? = null,
    val occupation: String? = null
)

data class KnowledgeFeedbackRequest(
    val questionId: String? = null,
    val articleId: String? = null,
    val isHelpful: Boolean,
    val reason: String? = null,
    val comment: String? = null
)
```

---

## 4. Jetpack Compose UI Screens

The Android app should implement:
1. `KnowledgeHubHomeScreen`:
   - Hero banner with tagline: *"हर सवाल का जवाब, अब एक ही जगह!"*
   - Global Search field with auto-suggest
   - 15 Categories Carousel / Grid
   - Audience filter chips (Household, Shopkeeper, MSME, Professional)
   - Popular Q&A cards
2. `KnowledgeCategoryScreen`:
   - Subcategory chips
   - Questions and Articles tabs
3. `KnowledgeQuestionDetailScreen`:
   - Instant Short Summary box
   - Detailed Legal & Step-by-Step explanation
   - Practical case study scenario box
   - Important Dos and Don'ts checklist
   - WhatsApp share button (`Intent.ACTION_SEND`)
   - "Was this helpful?" feedback buttons
4. `AskQuestionScreen`:
   - User form to submit questions to the Super Admin queue.

---

## 5. Offline Caching Strategy

Using Room DB:
- Cache categories and top 50 popular questions locally.
- In case of no internet connectivity, users can still read previously loaded questions and offline rules.

