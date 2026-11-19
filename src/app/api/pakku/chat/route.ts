import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { analyzeClientPattern } from '@/lib/pakku/pakkuPatternAnalyzer';
import {
  recordPakkuInteraction,
  recordPakkuFeedback,
  getPakkuMemory,
} from '@/lib/pakku/pakkuMemory';
import {
  buildPakkuSystemPrompt,
  getAutonomousHumanAnswer,
} from '@/lib/pakku/pakkuBrain';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Handle user feedback (Thumbs Up / Down)
    if (body.action === 'feedback') {
      const session = await getCurrentSession().catch(() => null);
      const userId = session?.user?.id || body.userId || 'guest';
      const isPositive = Boolean(body.isPositive);
      const note = body.note;

      const updatedMemory = await recordPakkuFeedback(userId, isPositive, note);
      return NextResponse.json({
        success: true,
        message: 'Feedback recorded! Pakku is learning.',
        upgradeLevel: updatedMemory.upgradeLevel,
        levelTitle: updatedMemory.levelTitle,
      });
    }

    const messages: ChatMessage[] = body.messages || [];
    const userQuery = body.query || (messages.length > 0 ? messages[messages.length - 1].content : '');

    if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid question.' },
        { status: 400 }
      );
    }

    // 2. Resolve authenticated user & active workspace
    const session = await getCurrentSession().catch(() => null);
    const userId = session?.user?.id || 'guest';
    const userName = session?.user?.name || 'व्यापारी मित्र';
    const userRole = session?.activeBusiness?.role || 'BUSINESS_OWNER';
    const businessId = session?.activeBusiness?.id || body.businessId;
    const householdId = body.householdId;

    // 3. Analyze live client pattern
    const pattern = await analyzeClientPattern({
      userId,
      userName,
      userRole,
      businessId,
      householdId,
    });

    // 4. Update memory, interaction count, and check for new taught facts
    const { memory, learnedNewFact } = await recordPakkuInteraction(
      userId,
      userName,
      userQuery
    );

    // 5. Try live autonomous human-brain for live data, business stats, math, or known guides
    const offlineResult = getAutonomousHumanAnswer(userQuery, pattern, memory);

    // If live_data or math_engine matched, return immediately with highest precision
    if (offlineResult.source === 'live_data' || offlineResult.source === 'math_engine') {
      let finalReply = offlineResult.reply;
      if (learnedNewFact) {
        finalReply = `📝 **मैंने याद रख लिया:** "${learnedNewFact}"। अगली बार से मैं इसका ध्यान रखूँगा!\n\n` + finalReply;
      }

      return NextResponse.json({
        success: true,
        reply: finalReply,
        source: offlineResult.source,
        upgradeLevel: memory.upgradeLevel,
        levelTitle: memory.levelTitle,
        patternSummary: {
          todaySales: pattern.todaySales,
          totalReceivables: pattern.totalReceivables,
          lowStockCount: pattern.lowStockCount,
          budgetRemaining: pattern.budgetRemaining,
        },
      });
    }

    // 6. If external LLM API keys are configured, generate human-like generative response
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      try {
        const systemPrompt = buildPakkuSystemPrompt(pattern, memory);
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `${systemPrompt}\n\nClient's Question: "${userQuery}"\n\nAnswer in Pakku's warm, human, experienced Indian business partner tone.`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.45,
                maxOutputTokens: 600,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json();
          const generated = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generated && generated.trim()) {
            let finalReply = generated.trim();
            if (learnedNewFact) {
              finalReply = `📝 **नोट कर लिया:** मैंने याद रख लिया है कि "${learnedNewFact}"।\n\n` + finalReply;
            }

            return NextResponse.json({
              success: true,
              reply: finalReply,
              source: 'gemini_ai',
              upgradeLevel: memory.upgradeLevel,
              levelTitle: memory.levelTitle,
              patternSummary: {
                todaySales: pattern.todaySales,
                totalReceivables: pattern.totalReceivables,
                lowStockCount: pattern.lowStockCount,
                budgetRemaining: pattern.budgetRemaining,
              },
            });
          }
        }
      } catch (geminiErr) {
        console.warn('[Pakku API] Gemini API call error:', geminiErr);
      }
    }

    if (openaiKey) {
      try {
        const systemPrompt = buildPakkuSystemPrompt(pattern, memory);
        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userQuery },
            ],
            temperature: 0.5,
            max_tokens: 500,
          }),
        });

        if (openaiRes.ok) {
          const openaiJson = await openaiRes.json();
          const replyText = openaiJson?.choices?.[0]?.message?.content;
          if (replyText && replyText.trim()) {
            let finalReply = replyText.trim();
            if (learnedNewFact) {
              finalReply = `📝 **नोट कर लिया:** मैंने याद रख लिया है कि "${learnedNewFact}"।\n\n` + finalReply;
            }

            return NextResponse.json({
              success: true,
              reply: finalReply,
              source: 'openai_ai',
              upgradeLevel: memory.upgradeLevel,
              levelTitle: memory.levelTitle,
              patternSummary: {
                todaySales: pattern.todaySales,
                totalReceivables: pattern.totalReceivables,
                lowStockCount: pattern.lowStockCount,
                budgetRemaining: pattern.budgetRemaining,
              },
            });
          }
        }
      } catch (openaiErr) {
        console.warn('[Pakku API] OpenAI API call error:', openaiErr);
      }
    }

    // 7. High-IQ Autonomous Human-Brain Engine reply
    let finalReply = offlineResult.reply;
    if (learnedNewFact) {
      finalReply = `📝 **मैंने याद रख लिया:** "${learnedNewFact}"। अगली बार से मैं इसका ध्यान रखूँगा!\n\n` + finalReply;
    }

    return NextResponse.json({
      success: true,
      reply: finalReply,
      source: 'pakku_human_brain',
      upgradeLevel: memory.upgradeLevel,
      levelTitle: memory.levelTitle,
      patternSummary: {
        todaySales: pattern.todaySales,
        totalReceivables: pattern.totalReceivables,
        lowStockCount: pattern.lowStockCount,
        budgetRemaining: pattern.budgetRemaining,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error processing AI chat';
    console.error('[Pakku API] Fatal error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
