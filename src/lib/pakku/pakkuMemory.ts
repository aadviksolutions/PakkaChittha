import { prisma } from '@/lib/prisma';

export interface PakkuLearnedMemory {
  userId: string;
  preferredName: string;
  preferredLanguage: 'hi' | 'en' | 'hinglish';
  upgradeLevel: number;
  levelTitle: string;
  totalInteractions: number;
  learnedFacts: string[];
  feedbackStats: {
    positive: number;
    negative: number;
  };
  frequentTopics: Record<string, number>;
  lastInteractionAt: string;
}

const DEFAULT_MEMORY = (userId: string, userName?: string): PakkuLearnedMemory => ({
  userId,
  preferredName: userName ? `${userName.split(' ')[0]} जी` : 'व्यापारी जी',
  preferredLanguage: 'hi',
  upgradeLevel: 2,
  levelTitle: 'सक्रिय मुनीम जी (Active Munim Ji)',
  totalInteractions: 1,
  learnedFacts: [
    'पक्का चिट्ठा के सभी टूल्स (GST बिल, उधारी, स्टॉक, घर खर्चा) की पूरी जानकारी है।',
    'ग्राहक और व्यापार की गोपनीयता हमेशा सुरक्षित रखी जाती है।',
  ],
  feedbackStats: { positive: 0, negative: 0 },
  frequentTopics: { billing: 1, udhaar: 1, ghar_kharcha: 1 },
  lastInteractionAt: new Date().toISOString(),
});

function calculateLevel(interactions: number, positiveFeedback: number): { level: number; title: string } {
  const score = interactions + positiveFeedback * 2;
  if (score >= 45) {
    return { level: 4, title: 'मुख्य रणनीतिकार (Chief Commercial Strategist)' };
  }
  if (score >= 20) {
    return { level: 3, title: 'बिजनेस पार्टनर (Business Partner)' };
  }
  if (score >= 8) {
    return { level: 2, title: 'सक्रिय मुनीम जी (Active Munim Ji)' };
  }
  return { level: 1, title: 'सहायक (Smart Assistant)' };
}

/**
 * Retrieves Pakku's learned memory for a user
 */
export async function getPakkuMemory(userId: string, userName?: string): Promise<PakkuLearnedMemory> {
  if (!userId) {
    return DEFAULT_MEMORY('guest', userName);
  }

  const memoryKey = `pakku_mem:${userId}`;

  try {
    const record = await prisma.platformSetting.findUnique({
      where: { key: memoryKey },
    });

    if (record && record.value) {
      const parsed: PakkuLearnedMemory = JSON.parse(record.value);
      const { level, title } = calculateLevel(parsed.totalInteractions, parsed.feedbackStats?.positive || 0);
      parsed.upgradeLevel = level;
      parsed.levelTitle = title;
      if (userName && !parsed.preferredName) {
        parsed.preferredName = `${userName.split(' ')[0]} जी`;
      }
      return parsed;
    }
  } catch (err) {
    console.warn('[Pakku Memory] Failed to read memory from DB:', err);
  }

  return DEFAULT_MEMORY(userId, userName);
}

/**
 * Persists an updated memory object into the database
 */
export async function savePakkuMemory(memory: PakkuLearnedMemory): Promise<void> {
  if (!memory.userId || memory.userId === 'guest') return;

  const memoryKey = `pakku_mem:${memory.userId}`;
  const serialized = JSON.stringify(memory);

  try {
    await prisma.platformSetting.upsert({
      where: { key: memoryKey },
      update: {
        value: serialized,
        category: 'PAKKU_AI',
        description: `Learned memory and pattern preferences for user ${memory.userId}`,
      },
      create: {
        key: memoryKey,
        value: serialized,
        category: 'PAKKU_AI',
        description: `Learned memory and pattern preferences for user ${memory.userId}`,
      },
    });
  } catch (err) {
    console.warn('[Pakku Memory] Failed to save memory to DB:', err);
  }
}

/**
 * Detects if the user explicitly commanded Pakku to learn/remember something
 */
export function extractFactToLearn(userText: string): string | null {
  const t = userText.trim();
  
  // Patterns like: "याद रखना...", "नोट कर लो...", "याद रखो...", "remember that...", "note that..."
  const patterns = [
    /(?:याद\s*(?:रखना|रखो|रखिए)|ध्यान\s*(?:रखना|रखो)|नोट\s*(?:कर\s*लो|कीजिए|करो))\s*[:,-]?\s*(.+)/i,
    /(?:remember\s+that|note\s+that|keep\s+in\s+mind\s+that)\s*[:,-]?\s*(.+)/i,
    /(?:हमारे\s*यहाँ|meri\s*dukan\s*pe|hamare\s*yahan)\s+(.+)/i,
  ];

  for (const regex of patterns) {
    const match = t.match(regex);
    if (match && match[1] && match[1].trim().length > 4) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Records an interaction and updates learning progression
 */
export async function recordPakkuInteraction(
  userId: string,
  userName: string | undefined,
  query: string,
  topic?: string
): Promise<{ memory: PakkuLearnedMemory; learnedNewFact?: string }> {
  const memory = await getPakkuMemory(userId, userName);

  memory.totalInteractions += 1;
  memory.lastInteractionAt = new Date().toISOString();

  // Detect language habit
  const hasDevanagari = /[\u0900-\u097F]/.test(query);
  const englishWords = (query.match(/[a-zA-Z]+/g) || []).length;
  if (hasDevanagari) {
    memory.preferredLanguage = 'hi';
  } else if (englishWords > 6) {
    memory.preferredLanguage = 'hinglish';
  }

  // Record topic frequency
  if (topic) {
    memory.frequentTopics[topic] = (memory.frequentTopics[topic] || 0) + 1;
  }

  // Check if user is teaching a new fact
  const newFact = extractFactToLearn(query);
  if (newFact && !memory.learnedFacts.includes(newFact)) {
    memory.learnedFacts.push(newFact);
    if (memory.learnedFacts.length > 20) {
      // Keep most recent 20 facts
      memory.learnedFacts = memory.learnedFacts.slice(-20);
    }
  }

  // Re-calculate upgrade level
  const { level, title } = calculateLevel(memory.totalInteractions, memory.feedbackStats.positive);
  memory.upgradeLevel = level;
  memory.levelTitle = title;

  // Save asynchronously
  savePakkuMemory(memory).catch(() => {});

  return { memory, learnedNewFact: newFact || undefined };
}

/**
 * Records user feedback (Thumbs up / down)
 */
export async function recordPakkuFeedback(
  userId: string,
  isPositive: boolean,
  note?: string
): Promise<PakkuLearnedMemory> {
  const memory = await getPakkuMemory(userId);

  if (isPositive) {
    memory.feedbackStats.positive += 1;
  } else {
    memory.feedbackStats.negative += 1;
  }

  if (note && note.trim().length > 3) {
    memory.learnedFacts.push(`सुझाव/सुधार: ${note.trim()}`);
  }

  const { level, title } = calculateLevel(memory.totalInteractions, memory.feedbackStats.positive);
  memory.upgradeLevel = level;
  memory.levelTitle = title;

  await savePakkuMemory(memory);
  return memory;
}
