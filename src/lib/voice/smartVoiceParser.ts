/**
 * PakkaChittha - Smart Voice Entry Natural Language Parser
 * Supports: Hindi, English, Hinglish, Devanagari, and Indian numeral expressions.
 */

export type VoiceTransactionType =
  | 'PAYMENT_RECEIVED' // Mile, Aaye, Received, Credit, Jama, प्राप्त हुए
  | 'PAYMENT_GIVEN'    // Diye, Paid, Given, Bhugtan, दिए
  | 'EXPENSE'          // Kharcha, Petrol, Rent, Chai, Expense, खर्च
  | 'INCOME'           // Kamai, Income, आय
  | 'SALE'             // Becha, Sale, Mal becha, बिक्री
  | 'PURCHASE'         // Kharida, Purchase, Mal kharida, खरीद
  | 'TO_RECEIVE'       // Lene hain, Udhar diya, Receivable, लेने हैं
  | 'TO_PAY';          // Dene hain, Payable, देने हैं

export type VoicePaymentMode = 'CASH' | 'UPI' | 'BANK' | 'OTHER';

export interface ParsedVoiceTransaction {
  rawText: string;
  type: VoiceTransactionType;
  typeLabelHi: string;
  typeLabelEn: string;
  partyName: string | null;
  amount: number | null;
  paymentMode: VoicePaymentMode;
  date: Date;
  dateLabel: string;
  category: string | null;
  description: string;
  confidence: number; // 0 to 1
  requiresClarification: boolean;
  missingFields: string[];
}

// Indian Word-to-Number Mappings for Hindi, Hinglish and English
const NUMBER_WORDS: Record<string, number> = {
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000, lakh: 100000, lac: 100000, lakhs: 100000, crore: 10000000, crores: 10000000,

  // Hindi & Hinglish
  ek: 1, do: 2, teen: 3, chaar: 4, char: 4, paanch: 5, panch: 5, chhe: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, baarah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnees: 19,
  bees: 20, tees: 30, chaalis: 40, chalis: 40, pachaas: 50, pachas: 50, saath: 60, sath: 60, sattar: 70, assi: 80, nabbe: 90,
  sau: 100, hazaar: 1000, hazar: 1000, laakh: 100000, karor: 10000000, karod: 10000000,

  // Devanagari Numerals & Words
  '०': 0, '१': 1, '२': 2, '३': 3, '४': 4, '५': 5, '६': 6, '७': 7, '८': 8, '९': 9,
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
  ग्यारह: 11, बारह: 12, तेरह: 13, चौदह: 14, पंद्रह: 15, सोलह: 16, सत्रह: 17, अठारह: 18, उन्नीस: 19,
  बीस: 20, तीस: 30, चालीस: 40, पचास: 50, साठ: 60, सत्तर: 70, अस्सी: 80, नब्बे: 90,
  सौ: 100, हजार: 1000, हज़ार: 1000, लाख: 100000, करोड़: 10000000,
};

/**
 * Parses Indian numeric strings like "5000", "5 thousand", "1.5 lakh", "das hazaar", "डेढ़ लाख"
 */
export function extractIndianAmount(text: string): number | null {
  if (!text) return null;
  const clean = text.toLowerCase().replace(/,/g, '');

  // 1. Direct Regex for numbers followed by unit: e.g. "1.5 lakh", "25 k", "5 thousand", "1.5लाख"
  // Note: we use strict word boundary for single letter 'k' or units to not match Hindi "ka"
  const multiplierRegex = /(\d+(?:\.\d+)?)\s*(?:\b(thousand|hazar|hazaar|हजार|हज़ार|lakh|laakh|lac|लाख|crore|cr|करोड़)\b|(\bk\b))/i;
  const matchMultiplier = clean.match(multiplierRegex);
  if (matchMultiplier) {
    const base = parseFloat(matchMultiplier[1]);
    const unit = (matchMultiplier[2] || matchMultiplier[3] || '').toLowerCase();
    if (unit === 'k' || unit.includes('thousand') || unit.includes('hazar') || unit.includes('हजार') || unit.includes('हज़ार')) {
      return base * 1000;
    }
    if (unit.includes('lakh') || unit.includes('laakh') || unit.includes('lac') || unit.includes('लाख')) {
      return base * 100000;
    }
    if (unit.includes('crore') || unit === 'cr' || unit.includes('करोड़')) {
      return base * 10000000;
    }
  }

  // 2. Special colloquial multipliers: "dedh lakh" (1.5 lakh), "dhai hazaar" (2500), "aadha lakh" (50000), "sawa lakh" (125000)
  if (/\b(dedh|dhed|डेढ़)\s+(lakh|laakh|lac|लाख)\b/i.test(clean)) return 150000;
  if (/\b(dhai|dhayi|ढाई)\s+(lakh|laakh|lac|लाख)\b/i.test(clean)) return 250000;
  if (/\b(sawa|सवा)\s+(lakh|laakh|lac|लाख)\b/i.test(clean)) return 125000;
  if (/\b(paune do|पौने दो)\s+(lakh|laakh|lac|लाख)\b/i.test(clean)) return 175000;
  if (/\b(aadha|aadhe|आधा)\s+(lakh|laakh|lac|लाख)\b/i.test(clean)) return 50000;

  if (/\b(dedh|dhed|डेढ़)\s+(hazar|hazaar|thousand|हजार|हज़ार)\b/i.test(clean)) return 1500;
  if (/\b(dhai|dhayi|ढाई)\s+(hazar|hazaar|thousand|हजार|हज़ार)\b/i.test(clean)) return 2500;

  // 3. Word-based numbers: "das hazaar" -> 10000, "paanch sau" -> 500, "do lakh" -> 200000
  const words = clean.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const nextW = words[i + 1];

    if (NUMBER_WORDS[w] !== undefined && nextW && (NUMBER_WORDS[nextW] === 100 || NUMBER_WORDS[nextW] === 1000 || NUMBER_WORDS[nextW] === 100000 || NUMBER_WORDS[nextW] === 10000000)) {
      return NUMBER_WORDS[w] * NUMBER_WORDS[nextW];
    }
  }

  // 4. Standalone direct numeric digits: e.g. "5000", "₹1200", "1500"
  const digitsRegex = /(?:₹|rs\.?|inr|रुपये|रूपये|रुपया)?\s*(\d+(?:\.\d+)?)/i;
  const matchDigits = clean.match(digitsRegex);
  if (matchDigits && matchDigits[1]) {
    const val = parseFloat(matchDigits[1]);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }

  // 5. Devanagari digit string conversion: "१५००" -> 1500
  const devanagariDigits = clean.match(/[०-९]+/);
  if (devanagariDigits) {
    const conv = devanagariDigits[0]
      .split('')
      .map((ch) => NUMBER_WORDS[ch] ?? ch)
      .join('');
    const val = parseFloat(conv);
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}

/**
 * Detects Payment Mode from voice transcript
 */
export function extractPaymentMode(text: string): VoicePaymentMode {
  const clean = text.toLowerCase();
  if (/\b(upi|gpay|google pay|phonepe|phone pe|paytm|bhim|qr code|क्यूआर)\b/i.test(clean)) {
    return 'UPI';
  }
  if (/\b(bank|cheque|check|neft|rtgs|imps|account|खाता|बैंक|चेक)\b/i.test(clean)) {
    return 'BANK';
  }
  if (/\b(cash|rokad|rokar|nagad|नकद|रोकड़|कैश)\b/i.test(clean)) {
    return 'CASH';
  }
  return 'CASH';
}

/**
 * Detects Expense Category
 */
export function extractExpenseCategory(text: string): string | null {
  const clean = text.toLowerCase();
  if (/\b(petrol|diesel|fuel)\b|(पेट्रोल|डीजल|ईंधन)/i.test(clean)) return 'Fuel & Petrol';
  if (/\b(chai|tea|coffee|refreshment|nasta)\b|(नाश्ता|चाय)/i.test(clean)) return 'Food & Refreshments';
  if (/\b(rent|kiraya|bhadha)\b|(भाड़ा|किराया)/i.test(clean)) return 'Rent & Premises';
  if (/\b(electricity|bijli|light|water)\b|(बिजली|पानी)/i.test(clean)) return 'Utilities & Electricity';
  if (/\b(salary|vetan|tanha|stipend)\b|(वेतन|सैलरी)/i.test(clean)) return 'Staff Salary';
  if (/\b(travel|auto|cab|train|bus|ticket)\b|(यात्रा|टिकट)/i.test(clean)) return 'Travel & Conveyance';
  if (/\b(repair|maintenance|servicing)\b|(मरम्मत)/i.test(clean)) return 'Repairs & Maintenance';
  if (/\b(stationary|packing|packaging|carton)\b|(स्टेशनरी)/i.test(clean)) return 'Packaging & Office';
  return null;
}

/**
 * Cleans extracted party name from noisy preposition words
 */
function cleanPartyName(raw: string): string {
  return raw
    .replace(/\b(se|ko|ne|ka|ki|ke|supplier|customer|party|bhai|ji|shree|mr|mrs|shri|from|to|rupaye|rupee|rs|cash|aaj|today|से|को|ने|का|की|के|रुपये|रूपये)\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Core smart voice command interpreter
 */
export function parseVoiceTransaction(transcript: string): ParsedVoiceTransaction {
  const rawText = transcript.trim();
  const lower = rawText.toLowerCase();

  let type: VoiceTransactionType = 'PAYMENT_RECEIVED';
  let typeLabelHi = 'भुगतान प्राप्त हुआ (Payment Received)';
  let typeLabelEn = 'Payment Received';
  let confidence = 0.85;

  const amount = extractIndianAmount(rawText);
  const paymentMode = extractPaymentMode(rawText);
  const expenseCategory = extractExpenseCategory(rawText);

  // 1. Transaction Type Detection

  // A. Expense: "kharcha hua", "spent", "petrol kharcha", "kharch kiye", "expense", "खर्च", "खर्चा"
  if (
    (/\b(kharch|kharcha|spent|expense|bill bhara|petrol|chai|kiraya)\b/i.test(lower) ||
      /(खर्च|खर्चा|व्यय|पेट्रोल|डीजल|किराया)/.test(rawText)) &&
    !/\b(lene|dene|prapt|mile)\b/i.test(lower) &&
    !/(लेने|देने|मिले|प्राप्त)/.test(rawText)
  ) {
    type = 'EXPENSE';
    typeLabelHi = 'खर्च (Expense)';
    typeLabelEn = 'Expense';
  }
  // B. Purchase: "maal kharida", "purchase", "kharidi", "kharida", "bought", "खरीदा", "खरीदी"
  else if (/\b(kharida|kharidi|bought|purchase|maal kharida|mal kharida)\b/i.test(lower) || /(खरीदा|खरीदी|क्रय)/.test(rawText)) {
    type = 'PURCHASE';
    typeLabelHi = 'खरीद / परचेज (Purchase)';
    typeLabelEn = 'Purchase';
  }
  // C. Sale: "maal becha", "sales", "sold", "becha", "sale kiya", "बेचा", "बेची"
  else if (/\b(becha|bechi|sold|sale|maal becha|mal becha)\b/i.test(lower) || /(बेचा|बेची|विक्रय)/.test(rawText)) {
    type = 'SALE';
    typeLabelHi = 'बिक्री / सेल (Sale)';
    typeLabelEn = 'Sale';
  }
  // D. To Receive (Receivable/Udhaar Given): "lene hain", "lene h", "to receive", "udhar diya", "baki hain", "लेने हैं", "लेना है"
  else if (/\b(lene hain|lene h|lena hai|lena h|to receive|udhar diya|udhari di|baaki hai|baki hai)\b/i.test(lower) || /(लेने हैं|लेना है|बाकी हैं|उधार दिया)/.test(rawText)) {
    type = 'TO_RECEIVE';
    typeLabelHi = 'उधारी वसूली / लेना है (Money to Receive)';
    typeLabelEn = 'Money to Receive';
  }
  // E. To Pay (Payable): "dene hain", "dene h", "dena hai", "to pay", "udhar liya", "देने हैं", "देना है"
  else if (/\b(dene hain|dene h|dena hai|dena h|to pay|udhar liya)\b/i.test(lower) || /(देने हैं|देना है|उधार लिया)/.test(rawText)) {
    type = 'TO_PAY';
    typeLabelHi = 'उधारी चुकानी है (Money to Pay)';
    typeLabelEn = 'Money to Pay';
  }
  // F. Payment Given: "diye", "paid", "diya", "de diye", "bhugtan kiya", "send kiye", "transfer kiya", "दिए", "दिया"
  else if (/\b(diye|diya|de diye|paid|gave|payment kiya|bhugtan kiya|transfer kiye|bheje)\b/i.test(lower) || /(दिए|दिया|भुगतान किया)/.test(rawText)) {
    type = 'PAYMENT_GIVEN';
    typeLabelHi = 'भुगतान दिया (Payment Given)';
    typeLabelEn = 'Payment Given';
  }
  // G. Payment Received: "mile", "prapt hue", "aaye", "aaya", "received", "credited", "jama hue", "मिले", "प्राप्त"
  else if (/\b(mile|mila|aaye|aaya|prapt|received|credited|jama hue|jama kiya|got)\b/i.test(lower) || /(मिले|मिला|प्राप्त हुए|आए|आया)/.test(rawText)) {
    type = 'PAYMENT_RECEIVED';
    typeLabelHi = 'भुगतान प्राप्त हुआ (Payment Received)';
    typeLabelEn = 'Payment Received';
  }

  // 2. Party Name Extraction
  let partyName: string | null = null;

  if (type !== 'EXPENSE') {
    const STOP_PARTY_WORDS = new Set([
      'bank', 'cash', 'upi', 'transfer', 'kiya', 'diya', 'mila', 'aaj', 'today', 'kal',
      'parso', 'yesterday', 'rupaye', 'rupee', 'rs', 'inr', 'maal', 'mal', 'kharcha',
      'petrol', 'diesel', 'chai', 'rent', 'kiraya', 'payment', 'bill', 'online', 'cheque',
      'check', 'gpay', 'phonepe', 'paytm', 'bhim', 'neft', 'rtgs', 'imps'
    ]);

    // A. "Paid 5000 to supplier Rajesh"
    const paidToMatch = rawText.match(/(?:paid|given|to)\s+(?:supplier|customer|party)?\s*([a-zA-Z\u0900-\u097F\s]{2,25})\s*$/i);
    if (paidToMatch && paidToMatch[1]) {
      const candidate = cleanPartyName(paidToMatch[1]);
      if (candidate.length >= 2 && !STOP_PARTY_WORDS.has(candidate.toLowerCase())) {
        partyName = candidate;
      }
    }

    // B. Find all matches of "[Name] (se|ko|from|to)" and pick the one that isn't a stopword (like "bank se")
    if (!partyName) {
      const regex = /\b([a-zA-Z\u0900-\u097F]{2,25}(?:\s+[a-zA-Z\u0900-\u097F]{2,25})?)\s+(?:se|ko|from|to|से|को)\b/gi;
      let match;
      while ((match = regex.exec(rawText)) !== null) {
        const candidate = cleanPartyName(match[1]);
        const lowerCand = candidate.toLowerCase();
        const wordsInCand = lowerCand.split(/\s+/);
        const hasStopWordOnly = wordsInCand.every((w) => STOP_PARTY_WORDS.has(w));
        if (candidate.length >= 2 && !hasStopWordOnly) {
          partyName = candidate;
          break;
        }
      }
    }

    // D. "Paid 5000 to Rajesh" / "Payment received from Suresh"
    if (!partyName) {
      const fromMatch = rawText.match(/(?:from|to|ko)\s+([a-zA-Z\u0900-\u097F\s]{2,20})/i);
      if (fromMatch && fromMatch[1]) {
        partyName = cleanPartyName(fromMatch[1]);
      }
    }

    // Filter invalid party names
    if (partyName && /^(aaj|today|kal|cash|upi|bank|maal|mal|kharcha|rupaye|rs|petrol|आज|कल|कैश|रुपये)$/i.test(partyName)) {
      partyName = null;
    }
  }

  // 3. Date Detection
  let date = new Date();
  let dateLabel = 'Today (आज)';
  if (/\b(kal|yesterday|कल)\b/i.test(lower)) {
    date = new Date(Date.now() - 24 * 60 * 60 * 1000);
    dateLabel = 'Yesterday (कल)';
  } else if (/\b(parso|parson|परसों)\b/i.test(lower)) {
    date = new Date(Date.now() - 48 * 60 * 60 * 1000);
    dateLabel = 'Day before yesterday (परसों)';
  }

  // 4. Missing fields analysis
  const missingFields: string[] = [];
  if (!amount) missingFields.push('amount');
  if (type !== 'EXPENSE' && !partyName) missingFields.push('partyName');

  const requiresClarification = missingFields.length > 0;

  // Description builder
  let description = rawText;
  if (type === 'EXPENSE' && expenseCategory) {
    description = `${expenseCategory} - ${rawText}`;
  }

  return {
    rawText,
    type,
    typeLabelHi,
    typeLabelEn,
    partyName,
    amount,
    paymentMode,
    date,
    dateLabel,
    category: expenseCategory,
    description,
    confidence: requiresClarification ? 0.6 : confidence,
    requiresClarification,
    missingFields,
  };
}
