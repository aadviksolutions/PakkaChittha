/**
 * PakkaChittha - Smart Voice Entry & Voice Accounting Natural Language Parser
 * Supports: Hindi, English, Hinglish, Devanagari numerals, and Indian spoken terminology.
 * Accurately interprets transactions, auto-detects customer intents, disambiguates quantities vs amounts vs rates,
 * and extracts multi-item invoice details without misclassifying amounts as item quantities.
 */

export type VoiceTransactionType =
  | 'PAYMENT_RECEIVED' // Mile, Aaye, Received, Credit, Jama, Prapt, Liye, प्राप्त हुए
  | 'PAYMENT_GIVEN'    // Diye, Paid, Given, Bhugtan, Bheje, दिए
  | 'EXPENSE'          // Kharcha, Petrol, Rent, Chai, Expense, खर्च
  | 'INCOME'           // Kamai, Income, आय
  | 'SALE'             // Becha, Sale, Mal becha, Mal diya, Bill banao, बिक्री
  | 'PURCHASE'         // Kharida, Purchase, Mal kharida, खरीद
  | 'TO_RECEIVE'       // Lene hain, Udhar diya, Receivable, लेने हैं
  | 'TO_PAY';          // Dene hain, Payable, देने हैं

export type VoicePaymentMode = 'CASH' | 'UPI' | 'BANK' | 'OTHER';

export interface ParsedVoiceItem {
  spokenName: string;
  quantity: number;
  unit: string;
  rate?: number;
  isFromAmount?: boolean;
}

export interface CustomerCreationIntent {
  isCreateCustomer: boolean;
  customerName: string;
  customerMobile?: string | null;
}

export interface ParsedVoiceTransaction {
  rawText: string;
  type: VoiceTransactionType;
  typeLabelHi: string;
  typeLabelEn: string;
  partyName: string | null;
  amount: number | null;
  cashReceived: number | null;
  balanceDue: number | null;
  discount: number | null;
  paymentMode: VoicePaymentMode;
  date: Date;
  dateLabel: string;
  category: string | null;
  description: string;
  confidence: number; // 0 to 1
  requiresClarification: boolean;
  missingFields: string[];
  isInvoiceIntent: boolean;
  items: ParsedVoiceItem[];
  // Customer Auto-Detection & Creation Intent
  isCustomerCreateIntent?: boolean;
  customerName?: string | null;
  customerMobile?: string | null;
}

// Indian Word-to-Number Mappings for Hindi, Hinglish and English
export const NUMBER_WORDS: Record<string, number> = {
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000, lakh: 100000, lac: 100000, lakhs: 100000, crore: 10000000, crores: 10000000,

  // Hindi & Hinglish
  ek: 1, do: 2, teen: 3, chaar: 4, char: 4, paanch: 5, panch: 5, chhe: 6, che: 6, saat: 7, aath: 8, nau: 9, das: 10,
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
 * Normalizes speech transcript:
 * - Fixes common speech recognition mis-transcriptions (e.g. bacha/bcha -> becha in commercial context)
 * - Converts fractional quantities (aadha kilo -> 0.5 kilo, paav -> 0.25, dedh -> 1.5, dhai -> 2.5)
 * - Converts compound Indian number words (Do hazaar -> 2000, das hazaar -> 10000, ek lakh -> 100000)
 * - Replaces Devanagari digits with Arabic digits
 * - Cleans punctuation while preserving words
 */
export function normalizeSpeechTranscript(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();

  // Strip punctuation cleanly
  s = s.replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim();

  // Convert Devanagari digits: "१५००" -> "1500"
  s = s.replace(/[०-९]/g, (ch) => String(NUMBER_WORDS[ch] ?? ch));

  // Normalization of bacha / bcha -> becha in selling / transaction contexts
  // e.g. "10000 ki website bacha" -> "10000 ki website becha"
  s = s.replace(/\b(bacha|bcha|baicha|bicha|बचा)\b/gi, 'becha');

  // Fractional units conversion
  s = s.replace(/\b(aadha|aadhe|adha|half|आधा)\s+(kilo|kg|किलो)\b/gi, '0.5 kilo');
  s = s.replace(/\b(aadha|aadhe|adha|half|आधा)\s+(litre|liter|लीटर)\b/gi, '0.5 litre');
  s = s.replace(/\b(paav|pao|pawa|पाव)\s*(kilo|kg|किलो)?\b/gi, '0.25 kilo');
  s = s.replace(/\b(dedh|dhed|डेढ़)\s+(kilo|kg|किलो)\b/gi, '1.5 kilo');
  s = s.replace(/\b(dhai|dhayi|ढाई)\s+(kilo|kg|किलो)\b/gi, '2.5 kilo');
  s = s.replace(/\b(ek|1|एक)\s+(dozen|darjan|दर्जन)\b/gi, '12 piece');
  s = s.replace(/\b(do|2|दो)\s+(dozen|darjan|दर्जन)\b/gi, '24 piece');
  s = s.replace(/\b(aadha|half|आधा)\s+(dozen|darjan|दर्जन)\b/gi, '6 piece');

  // Convert Indian compound words to digits: e.g. "Do hazaar" -> "2000", "das hazaar" -> "10000"
  s = s.replace(
    /\b(ek|do|teen|chaar|char|paanch|panch|chhe|saat|aath|nau|das|एक|दो|तीन|चार|पांच|छह|सात|आठ|नौ|दस)\s+(hazaar|hazar|thousand|हजार|हज़ार)\b/gi,
    (_m, g1) => {
      const num = NUMBER_WORDS[g1.toLowerCase()] || 1;
      return String(num * 1000);
    }
  );
  s = s.replace(
    /\b(ek|do|teen|chaar|char|paanch|panch|chhe|saat|aath|nau|das|एक|दो|तीन|चार|पांच|छह|सात|आठ|नौ|दस)\s+(lakh|laakh|lac|लाख)\b/gi,
    (_m, g1) => {
      const num = NUMBER_WORDS[g1.toLowerCase()] || 1;
      return String(num * 100000);
    }
  );
  s = s.replace(
    /\b(ek|do|teen|chaar|char|paanch|panch|chhe|saat|aath|nau|das|एक|दो|तीन|चार|पांच|छह|सात|आठ|नौ|दस)\s+(sau|hundred|सौ)\b/gi,
    (_m, g1) => {
      const num = NUMBER_WORDS[g1.toLowerCase()] || 1;
      return String(num * 100);
    }
  );

  return s;
}

/**
 * Detects direct voice-based customer creation command:
 * Examples:
 * - "नया ग्राहक Suresh Kumar जोड़ो"
 * - "Add new customer Rajesh Sharma"
 * - "Suresh Kumar का मोबाइल नंबर 9876543210 है"
 */
export function detectCustomerCreationIntent(text: string): CustomerCreationIntent | null {
  if (!text) return null;
  const clean = text.trim();

  // Pattern 1: Direct command e.g. "naya grahak Suresh Kumar jodo", "नया ग्राहक Suresh Kumar जोड़ो"
  const m1 = clean.match(
    /(?:naya|new|naye|नया)\s+(?:grahak|customer|party|ग्राहक)\s+([a-zA-Z\u0900-\u097F\s]{2,35}?)(?:\s+(?:jodo|add\s*karo|add|kholiye|banao|जोड़ो|बनाएं|है))?$/i
  );
  if (m1) {
    const rawName = m1[1].replace(/\b(jodo|add|karo|banao|hai|जोड़ो|बनाएं)\b/gi, '').trim();
    if (rawName.length >= 2) {
      return { isCreateCustomer: true, customerName: rawName };
    }
  }

  // Pattern 2: Customer phone number assignment command:
  // "Suresh Kumar ka mobile number 9876543210 hai"
  const m2 =
    clean.match(
      /^(.+?)\s+(?:ka|ki|ke|का|की|के)\s+(?:mobile|phone|मोबाइल|फ़ोन)\s*(?:number|no|नंबर)?\s*(?:hai|h|है)?\s*([6-9]\d{9})/i
    ) ||
    clean.match(
      /^(.+?)\s+(?:mobile|phone|मोबाइल|फ़ोन)\s*(?:number|no|नंबर)?\s*(?:hai|h|है)?\s*([6-9]\d{9})/i
    );
  if (m2) {
    const rawName = m2[1]
      .replace(/\b(ka|ki|ke|का|की|के|mobile|phone|number|मोबाइल|फ़ोन|नंबर|ग्राहक|customer)\b/gi, '')
      .trim();
    if (rawName.length >= 2) {
      return { isCreateCustomer: true, customerName: rawName, customerMobile: m2[2] };
    }
  }

  return null;
}

/**
 * Parses Indian numeric amounts like "5000", "5 thousand", "1.5 lakh", "das hazaar", "डेढ़ लाख"
 * Restricts values to valid financial amounts (< 100,000,000) so phone numbers are not captured.
 */
export function extractIndianAmount(text: string): number | null {
  if (!text) return null;
  const clean = normalizeSpeechTranscript(text).toLowerCase();

  // 1. Direct Regex for numbers followed by unit: e.g. "1.5 lakh", "25 k", "5 thousand", "1.5लाख"
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

  // 2. Special colloquial multipliers: "dedh lakh", "dhai hazaar", etc.
  if (/\b(dedh|dhed|डेढ़)\s+(lakh|laakh|lac|लाख)\b/i.test(clean)) return 150000;
  if (/\b(dhai|dhayi|ढाई)\s+(lakh|laakh|lac|लाख)\b/i.test(clean)) return 250000;
  if (/\b(sawa|सवा)\s+(lakh|laakh|lac|लाख)\b/i.test(clean)) return 125000;
  if (/\b(paune do|पौने दो)\s+(lakh|laakh|lac|लाख)\b/i.test(clean)) return 175000;
  if (/\b(aadha|aadhe|आधा)\s+(lakh|laakh|lac|लाख)\b/i.test(clean)) return 50000;

  if (/\b(dedh|dhed|डेढ़)\s+(hazar|hazaar|thousand|हजार|हज़ार)\b/i.test(clean)) return 1500;
  if (/\b(dhai|dhayi|ढाई)\s+(hazar|hazaar|thousand|हजार|हज़ार)\b/i.test(clean)) return 2500;

  // 3. Digits with explicit monetary markers: "5000 rupaye", "₹1200", "rs 1500", "10000 ki"
  const monetaryRegex = /(?:₹|rs\.?|inr|रुपये|रूपये|रुपया)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rupaye|rupee|rs|inr|रुपये|रूपये|रुपया|ki|ka|की|का)/i;
  const matchMonetary = clean.match(monetaryRegex);
  if (matchMonetary) {
    const val = parseFloat(matchMonetary[1] || matchMonetary[2]);
    if (!isNaN(val) && val > 0 && val < 100000000) {
      return val;
    }
  }

  // 4. Standalone direct numeric digits: e.g. "5000", "1500" (filter out 10-digit phone numbers!)
  const standaloneDigits = clean.match(/\b(\d{1,8}(?:\.\d+)?)\b/);
  if (standaloneDigits && standaloneDigits[1]) {
    const val = parseFloat(standaloneDigits[1]);
    if (!isNaN(val) && val > 0 && val < 100000000) {
      return val;
    }
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
    .replace(
      /\b(se|ko|ne|ka|ki|ke|supplier|customer|party|bhai|ji|shree|mr|mrs|shri|from|to|rupaye|rupee|rs|cash|aaj|today|से|को|ने|का|की|के|रुपये|रूपये)\b/gi,
      ''
    )
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Strips trailing action verbs and clutter from product line item names
 */
function cleanProductSpokenName(raw: string): string {
  return raw
    .replace(
      /\b(?:ka\s+maal\s+diya|maal\s+diya|diya|diye|becha|bechi|de\s+do|bill\s+banao|दिए|दिया|बेचा|बेची|बेचा\s+गया)\b/gi,
      ''
    )
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

/**
 * Parses multi-product line items from spoken sentence.
 *
 * CRITICAL DISAMBIGUATION RULES:
 * 1. Numbers followed by monetary terms ('ki', 'ka', 'rupaye', 'rs', 'रुपये') are NEVER parsed as quantities!
 * 2. In amount-based sales like "10000 ki website becha", item is 'website', qty is 1, rate is 10000, and isFromAmount is true.
 * 3. Rate clauses like "rate 10 rupaye", "rate 5", "भाव 10" are parsed and attached to items.
 * 4. Recognizes Hindi units: packet, kilo, kg, bori, bottle, piece, pcs, box, nag, etc.
 */
export function extractVoiceLineItems(text: string): ParsedVoiceItem[] {
  if (!text) return [];

  const norm = normalizeSpeechTranscript(text);

  // If text is a pure payment or loan without product names, skip item extraction
  if (
    /\b(?:rupaye|rupee|rs|cash|रुपये|रूपये|रुपया)\s*(?:diye|diya|liye|liya|lene|dene|prapt|mile|bheje)\b/i.test(norm) ||
    (/\b(?:lene|dene)\s+(?:hain|hai|h)\b/i.test(norm) && !/\b(aur|and|tatha|\+)\b/i.test(norm))
  ) {
    return [];
  }

  // 1. Check for Rate clause: e.g. "rate 10 rupaye", "rate 5 rupaye", "रेट 10"
  let rateSpoken: number | undefined;
  const rateMatch = norm.match(
    /\b(?:rate|रेट|भाव|ke hisaab se)\s*(?:hai|h)?\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:rupaye|rs|रूपये)?/i
  );
  if (rateMatch && rateMatch[1]) {
    const rVal = parseFloat(rateMatch[1]);
    if (!isNaN(rVal) && rVal > 0) {
      rateSpoken = rVal;
    }
  }

  // 2. Check for Amount-Based Sale:
  // e.g. "10000 ki website becha", "2000 ka saman becha", "Do hazaar ka saman becha"
  const amountForSaleMatch = norm.match(
    /(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:rupaye|rs|रुपये|रूपये)?\s*(?:ki|ka|की|का)\s+([a-zA-Z\u0900-\u097F\s]{2,25})\s*(?:becha|bechi|diya|diye|बेचा|बेची|दिया|दिए)/i
  );

  if (amountForSaleMatch) {
    const saleAmt = parseFloat(amountForSaleMatch[1]);
    const prodSpoken = cleanProductSpokenName(amountForSaleMatch[2]);

    // If item is not generic "saman" or "maal", return it as a structured 1-unit item with the specified rate
    if (
      prodSpoken &&
      !/^(saman|maal|mal|goods|items|सामान|माल)$/i.test(prodSpoken)
    ) {
      return [
        {
          spokenName: prodSpoken,
          quantity: 1,
          unit: 'Pcs',
          rate: saleAmt,
          isFromAmount: true,
        },
      ];
    }
    // If it is generic "saman" or "maal", it's a general monetary sale without specific catalogue items
    return [];
  }

  // 3. Standard Multi-item Sale parsing
  // Remove customer prefix: "Mohan ko 2 kilo chini diya" -> "2 kilo chini diya"
  let clean = norm.replace(/^[a-zA-Z\u0900-\u097F\s]{2,25}\s+(?:ko|to|को)\s+/i, '');

  // Strip rate clause from item text
  clean = clean.replace(/\b(?:rate|भाव|रेट)\b.*/i, '');
  // Strip discount or payment clauses at tail
  clean = clean.replace(/(?:aur|\+)?\s*\d+\s*(?:rupaye|rs|cash|का)?\s*(?:cash|discount|chhoot|udhar|उधार|कैश|डिस्काउंट|छूट).*/i, '');
  // Strip trailing verbs
  clean = cleanProductSpokenName(clean);

  // Split into multiple items using "aur", "and", ",", "+"
  const parts = clean.split(/\s*(?:aur|and|tatha|\+)\s*/i).map((p) => p.trim()).filter(Boolean);
  const items: ParsedVoiceItem[] = [];

  const unitRegex = /\b(packet|packets|pkt|kilo|kg|kgs|gm|grams|quintal|bori|bag|bags|bottle|bottles|piece|pieces|pcs|box|boxes|peti|nag|लीटर|किलो|बोरी|पीस|पैकेट|बंडल|बोतल)\b/i;

  for (const part of parts) {
    if (!part || part.length < 2) continue;

    // RULE: If part contains monetary prepositions right after a number ("10000 ki", "5000 ka"), NEVER treat as quantity!
    if (/^\d+\s*(?:ki|ka|ke|rupaye|rs|रुपये|रूपये)\b/i.test(part)) {
      continue;
    }

    // Pattern A: [Quantity] [Unit?] [Product Name]
    // e.g. "2 kilo chini", "do packet biscuit", "5 pen", "10 bottle oil"
    const match = part.match(
      /^(\d+(?:\.\d+)?|ek|do|teen|chaar|char|paanch|panch|chhe|saat|aath|nau|das|ग्यारह|बारह|एक|दो|तीन|चार|पांच|छह|सात|आठ|नौ|दस)\s*(?:(packet|packets|pkt|kilo|kg|kgs|gm|grams|quintal|bori|bag|bags|bottle|bottles|piece|pieces|pcs|box|boxes|peti|nag|लीटर|किलो|बोरी|पीस|पैकेट|बंडल|बोतल)\s+)?(.+)$/i
    );

    if (match) {
      let qty = 1;
      const rawQty = match[1].toLowerCase();
      if (!isNaN(parseFloat(rawQty))) {
        qty = parseFloat(rawQty);
      } else if (NUMBER_WORDS[rawQty] !== undefined) {
        qty = NUMBER_WORDS[rawQty];
      }

      let unit = match[2] ? match[2].trim() : 'Pcs';
      let prodName = match[3] ? match[3].trim() : '';

      // Normalize unit
      if (unit.match(/^(kilo|kg|kgs|किलो)$/i)) unit = 'Kg';
      else if (unit.match(/^(packet|packets|pkt|पैकेट)$/i)) unit = 'Packet';
      else if (unit.match(/^(bottle|bottles|बोतल)$/i)) unit = 'Bottle';
      else if (unit.match(/^(bori|bag|bags|बोरी)$/i)) unit = 'Bori';
      else if (unit.match(/^(piece|pieces|pcs|पीस)$/i)) unit = 'Pcs';
      else if (unit.match(/^(box|boxes|peti)$/i)) unit = 'Box';

      // Check if product name itself contains a trailing unit: e.g. "cement bori"
      if (!match[2]) {
        const trailingUnitMatch = prodName.match(unitRegex);
        if (trailingUnitMatch) {
          const found = trailingUnitMatch[0].toLowerCase();
          if (found === 'bori' || found === 'बोरी') unit = 'Bori';
          else if (found === 'kilo' || found === 'kg') unit = 'Kg';
          else if (found === 'packet' || found === 'pkt') unit = 'Packet';
          else if (found === 'bottle' || found === 'bottles' || found === 'बोतल') unit = 'Bottle';
        }
      }

      const cleanedProd = cleanProductSpokenName(prodName);

      if (
        cleanedProd.length >= 2 &&
        !/^(maal|mal|goods|items|saman|rupaye|rupay|rupee|rupees|rs|inr|cash|rokad|nagad|aaj|today|रुपये|रूपये|रुपया|पैसे|कैश|रोकड़|lene|dene|diye|diya|liye|liya|hain|hai|h)$/i.test(
          cleanedProd
        )
      ) {
        items.push({
          spokenName: cleanedProd,
          quantity: qty,
          unit,
          rate: rateSpoken,
        });
      }
    }
  }

  return items;
}

/**
 * Extracts cash received / partial payment from voice text
 * e.g. "2000 cash le liya", "2000 cash mila", "2000 jama hua"
 */
export function extractCashReceived(text: string): number | null {
  const norm = normalizeSpeechTranscript(text);
  const match = norm.match(
    /(\d+(?:\.\d+)?)\s*(?:rupaye|rs|रूपये)?\s*(?:cash\s*)?(?:le\s*liya|jama|mile|prapt|aaye|mila|cash\s*mila|cash\s*aaya|le\s*liye|नकद|कैश)/i
  );
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0 && val < 100000000) return val;
  }
  return null;
}

/**
 * Extracts discount from voice text
 * e.g. "500 rupaye discount diya", "50 discount", "10% discount"
 */
export function extractDiscount(text: string): number | null {
  const norm = normalizeSpeechTranscript(text);
  const match = norm.match(
    /(\d+(?:\.\d+)?)\s*(?:rupaye|rs|रूपये|%|percent)?\s*(?:ka\s+)?(?:discount|chhoot|choot|डिस्काउंट|छूट)/i
  );
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0 && val < 100000000) return val;
  }
  return null;
}

/**
 * Core smart voice command interpreter
 */
export function parseVoiceTransaction(transcript: string): ParsedVoiceTransaction {
  const rawText = transcript.trim();
  const norm = normalizeSpeechTranscript(rawText);
  const lower = norm.toLowerCase();

  // 0. Check for Direct Customer Creation Intent
  const custIntent = detectCustomerCreationIntent(norm);
  if (custIntent) {
    return {
      rawText,
      type: 'PAYMENT_RECEIVED',
      typeLabelHi: 'नया ग्राहक जोड़ें (Add Customer)',
      typeLabelEn: 'Add Customer',
      partyName: custIntent.customerName,
      amount: null,
      cashReceived: null,
      balanceDue: null,
      discount: null,
      paymentMode: 'CASH',
      date: new Date(),
      dateLabel: 'Today (आज)',
      category: null,
      description: `Voice Customer Creation: "${rawText}"`,
      confidence: 0.95,
      requiresClarification: false,
      missingFields: [],
      isInvoiceIntent: false,
      items: [],
      isCustomerCreateIntent: true,
      customerName: custIntent.customerName,
      customerMobile: custIntent.customerMobile || null,
    };
  }

  let type: VoiceTransactionType = 'PAYMENT_RECEIVED';
  let typeLabelHi = 'भुगतान प्राप्त हुआ (Payment Received)';
  let typeLabelEn = 'Payment Received';
  let confidence = 0.85;

  const totalAmount = extractIndianAmount(rawText);
  const paymentMode = extractPaymentMode(rawText);
  const expenseCategory = extractExpenseCategory(rawText);
  const lineItems = extractVoiceLineItems(rawText);
  const cashReceived = extractCashReceived(rawText);
  const discount = extractDiscount(rawText);

  // 1. Transaction Type Semantic Understanding

  // Rule 1: TO_RECEIVE (Receivable / Udhaar)
  if (
    /\b(lene hain|lene h|lena hai|lena h|se lene|se lena|to receive|udhari di|baaki hai|baki hai)\b/i.test(lower) ||
    /(लेने हैं|लेना है|बाकी हैं|उधार दिया|लेना बाकी)/.test(rawText)
  ) {
    type = 'TO_RECEIVE';
    typeLabelHi = 'उधारी वसूली / लेना है (Money to Receive)';
    typeLabelEn = 'Money to Receive';
  }
  // Rule 2: TO_PAY (Payable)
  else if (
    /\b(dene hain|dene h|dena hai|dena h|ko dene|ko dena|to pay|udhar liya|chukane hain)\b/i.test(lower) ||
    /(देने हैं|देना है|उधार लिया|देना बाकी)/.test(rawText)
  ) {
    type = 'TO_PAY';
    typeLabelHi = 'उधारी चुकानी है (Money to Pay)';
    typeLabelEn = 'Money to Pay';
  }
  // Rule 3: EXPENSE
  else if (
    (/\b(kharch|kharcha|spent|expense|bill bhara|petrol|chai|kiraya)\b/i.test(lower) ||
      /(खर्च|खर्चा|व्यय|पेट्रोल|डीजल|किराया)/.test(rawText)) &&
    !/\b(lene|dene|prapt|mile)\b/i.test(lower) &&
    !/(लेने|देने|मिले|प्राप्त)/.test(rawText)
  ) {
    type = 'EXPENSE';
    typeLabelHi = 'खर्च (Expense)';
    typeLabelEn = 'Expense';
  }
  // Rule 4: PURCHASE
  else if (
    /\b(kharida|kharidi|bought|purchase|maal kharida|mal kharida)\b/i.test(lower) ||
    /(खरीदा|खरीदी|क्रय|माल खरीदा)/.test(rawText)
  ) {
    type = 'PURCHASE';
    typeLabelHi = 'खरीद / परचेज (Purchase)';
    typeLabelEn = 'Purchase';
  }
  // Rule 5: EXPLICIT PAYMENT GIVEN (e.g. "Ramesh ko 500 rupaye diye", "500 diye")
  else if (
    /\b(?:ko|to|को)\s+(?:\d+|ek|do|teen|chaar|paanch|chhe|saat|aath|nau|das|हजार|लाख)\s*(?:rupaye|rupee|rs|रुपये|रूपये)?\s*(?:diye|diya|de diye|paid|gave|दिए|दिया)\b/i.test(
      lower
    ) ||
    /\b(paid|transferred)\s+\d+\s+to\b/i.test(lower)
  ) {
    type = 'PAYMENT_GIVEN';
    typeLabelHi = 'भुगतान दिया (Payment Given)';
    typeLabelEn = 'Payment Given';
  }
  // Rule 6: EXPLICIT PAYMENT RECEIVED (e.g. "Ramesh se 500 rupaye liye", "500 mile")
  else if (
    /\b(?:se|from|से)\s+(?:\d+|ek|do|teen|chaar|paanch|chhe|saat|aath|nau|das|हजार|लाख)\s*(?:rupaye|rupee|rs|रुपये|रूपये)?\s*(?:liye|liya|mile|mila|prapt|received|credited|लिए|लिया|मिले|प्राप्त)\b/i.test(
      lower
    )
  ) {
    type = 'PAYMENT_RECEIVED';
    typeLabelHi = 'भुगतान प्राप्त हुआ (Payment Received)';
    typeLabelEn = 'Payment Received';
  }
  // Rule 7: SALE / VOICE INVOICE
  // "Mohan ko 5000 ka maal diya"
  // "Mohan ko 5 pen diye, rate 10 rupaye"
  // "10000 ki website bacha"
  // "Do hazaar ka saman becha"
  else if (
    lineItems.length > 0 ||
    /\b(maal diya|mal diya|maal becha|mal becha|saman becha|becha|bechi|sold|sale|sale hui|sales|bill banao|chalan banao)\b/i.test(
      lower
    ) ||
    /(माल दिया|माल बेचा|सामान बेचा|बेचा|बेची|बिक्री|बिल बनाओ)/.test(rawText)
  ) {
    type = 'SALE';
    typeLabelHi = 'बिक्री / बिल (Sale Invoice)';
    typeLabelEn = 'Sale Invoice';
  }
  // Rule 8: GENERIC PAYMENT GIVEN
  else if (
    /\b(ko diye|ko diya|diye|diya|de diye|paid|gave|payment kiya|bhugtan kiya|transfer kiye|bheje)\b/i.test(lower) ||
    /(दिए|दिया|भुगतान किया|को दिए)/.test(rawText)
  ) {
    type = 'PAYMENT_GIVEN';
    typeLabelHi = 'भुगतान दिया (Payment Given)';
    typeLabelEn = 'Payment Given';
  }
  // Rule 9: GENERIC PAYMENT RECEIVED
  else if (
    /\b(se liye|se liya|liye|liya|mile|mila|aaye|aaya|prapt|received|credited|jama hue|jama kiya|jama karo|got)\b/i.test(
      lower
    ) ||
    /(से लिए|लिए|लिया|मिले|मिला|प्राप्त हुए|आए|आया|जमा किए|जमा)/.test(rawText)
  ) {
    type = 'PAYMENT_RECEIVED';
    typeLabelHi = 'भुगतान प्राप्त हुआ (Payment Received)';
    typeLabelEn = 'Payment Received';
  }

  // 2. Party Name Extraction
  let partyName: string | null = null;

  if (type !== 'EXPENSE') {
    const STOP_PARTY_WORDS = new Set([
      'bank', 'cash', 'upi', 'transfer', 'kiya', 'diya', 'mila', 'aaj', 'today', 'kal',
      'parso', 'yesterday', 'rupaye', 'rupee', 'rs', 'inr', 'maal', 'mal', 'saman', 'kharcha',
      'petrol', 'diesel', 'chai', 'rent', 'kiraya', 'payment', 'bill', 'online', 'cheque',
      'check', 'gpay', 'phonepe', 'paytm', 'bhim', 'neft', 'rtgs', 'imps'
    ]);

    // A. "Paid 5000 to supplier Rajesh"
    const paidToMatch = rawText.match(
      /(?:paid|given|to)\s+(?:supplier|customer|party)?\s*([a-zA-Z\u0900-\u097F\s]{2,25})\s*$/i
    );
    if (paidToMatch && paidToMatch[1]) {
      const candidate = cleanPartyName(paidToMatch[1]);
      if (candidate.length >= 2 && !STOP_PARTY_WORDS.has(candidate.toLowerCase())) {
        partyName = candidate;
      }
    }

    // B. Find all matches of "[Name] (se|ko|from|to)"
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

    // C. "Payment received from Suresh"
    if (!partyName) {
      const fromMatch = rawText.match(/(?:from|to|ko)\s+([a-zA-Z\u0900-\u097F\s]{2,20})/i);
      if (fromMatch && fromMatch[1]) {
        partyName = cleanPartyName(fromMatch[1]);
      }
    }

    // Filter invalid party names
    if (
      partyName &&
      /^(aaj|today|kal|cash|upi|bank|maal|mal|saman|kharcha|rupaye|rs|petrol|आज|कल|कैश|रुपये)$/i.test(partyName)
    ) {
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

  // 4. Calculate Balance Due for Sales
  const isInvoiceIntent =
    type === 'SALE' &&
    (lineItems.length > 0 ||
      cashReceived !== null ||
      /maal diya|udhaar|bill|saman becha/i.test(lower));

  let finalAmount = totalAmount;
  // If line items have computed rates and totalAmount wasn't explicitly set
  if (lineItems.length > 0) {
    const itemsTotal = lineItems.reduce((acc, it) => acc + (it.rate ? it.quantity * it.rate : 0), 0);
    if (itemsTotal > 0 && (!finalAmount || finalAmount < itemsTotal)) {
      finalAmount = itemsTotal;
    }
  }

  let balanceDue: number | null = null;
  if (finalAmount !== null && cashReceived !== null) {
    balanceDue = Math.max(0, finalAmount - cashReceived);
  }

  // 5. Missing fields analysis
  const missingFields: string[] = [];
  if (!finalAmount && lineItems.length === 0) missingFields.push('amount');
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
    amount: finalAmount,
    cashReceived,
    balanceDue,
    discount,
    paymentMode,
    date,
    dateLabel,
    category: expenseCategory,
    description,
    confidence: requiresClarification ? 0.6 : confidence,
    requiresClarification,
    missingFields,
    isInvoiceIntent,
    items: lineItems,
    isCustomerCreateIntent: false,
  };
}
