/**
 * Devanagari to Roman Script (English Alphabets) Transliteration Utility
 *
 * Converts Hindi / Devanagari speech recognition outputs into standard English alphabets
 * (Romanized Hinglish / English script) so that whether spoken in Hindi or English,
 * the recorded transcript and typed input are strictly in English letters.
 */

// Devanagari numerals mapping to standard digits
const DIGIT_MAP: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

// Independent vowels
const VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'अं': 'an', 'अः': 'ah',
};

// Dependent vowel signs (matras)
const MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ं': 'n', 'ँ': 'n', 'ः': 'h',
};

// Consonants with inherent 'a'
const CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gya',
  // Nukta consonants
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'फ़': 'f', 'ड़': 'd', 'ढ़': 'dh',
};

// Common Indian / Hindi spoken vocabulary replacements for natural financial phrases
const PHRASE_DICTIONARY: Record<string, string> = {
  'रुपये': 'rupaye',
  'रुपया': 'rupaye',
  'रू': 'rs',
  'रु': 'rs',
  'दिए': 'diye',
  'दिया': 'diya',
  'दे दिया': 'de diya',
  'पे किया': 'pay kiya',
  'लिए': 'liye',
  'लिया': 'liya',
  'ले लिया': 'le liya',
  'मिले': 'mile',
  'मिला': 'mila',
  'आए': 'aaye',
  'आया': 'aaya',
  'खर्चा': 'kharcha',
  'खर्च': 'kharcha',
  'हज़ार': 'hazaar',
  'हजार': 'hazaar',
  'सौ': 'sau',
  'लाख': 'lakh',
  'दूध': 'doodh',
  'किराना': 'kirana',
  'सब्जी': 'sabzi',
  'सब्ज़ी': 'sabzi',
  'पेट्रोल': 'petrol',
  'डीजल': 'diesel',
  'किराया': 'kiraya',
  'बिजली': 'bijli',
  'पानी': 'paani',
  'गैस': 'gas',
  'टेडी बेयर': 'Teddy Bear',
  'टेडीबेयर': 'Teddy Bear',
  'बिल बनाना है': 'bill banana hai',
  'बिल बनाओ': 'bill banao',
  'बिल बना दो': 'bill bana do',
  'चालान बनाना है': 'challan banana hai',
  'चालान बनाओ': 'challan banao',
  'बिस्कुट': 'biscuit',
  'बिस्किट': 'biscuit',
  'शैम्पू': 'shampoo',
  'साबुन': 'soap',
  'चीनी': 'sugar',
  'चावल': 'rice',
  'आटा': 'atta',
  'दाल': 'dal',
  'नमक': 'salt',
  'चार्जर': 'charger',
  'लैपटॉप': 'laptop',
  'सीमेंट': 'cement',
  'सरसों तेल': 'mustard oil',
  'रिफाइंड तेल': 'refined oil',
  'शर्ट': 'shirt',
  'पैंट': 'pant',
  'जींस': 'jeans',
  'जूते': 'shoes',
  'चप्पल': 'slippers',
  'खिलौना': 'toy',
  'खिलौने': 'toys',
  'पेंट': 'paint',
  'पुट्टी': 'putty',
  'तार': 'wire',
  'पाइप': 'pipe',
  'बल्ब': 'bulb',
  'पंखा': 'fan',
  'मोबाइल': 'mobile',
  'रिचार्ज': 'recharge',
  'दवाई': 'dawai',
  'दवा': 'dawa',
  'राशन': 'ration',
  'वेतन': 'vetan',
  'सैलरी': 'salary',
  'अग्रिम': 'advance',
  'खाता': 'khata',
  'उधार': 'udhaar',
  'नगद': 'cash',
  'कैश': 'cash',
  'ऑनलाइन': 'online',
  'गूगल पे': 'google pay',
  'फोन पे': 'phonepe',
  'पेटीएम': 'paytm',
};

const HALANT = '्';
const NUKTA = '़';

/**
 * Transliterates a single Devanagari word into English Latin alphabets.
 */
function transliterateWord(word: string): string {
  // Check fast phrase dictionary first
  if (PHRASE_DICTIONARY[word]) {
    return PHRASE_DICTIONARY[word];
  }

  let result = '';
  const len = word.length;
  let i = 0;

  while (i < len) {
    const ch = word[i];
    const nextCh = i + 1 < len ? word[i + 1] : '';

    // Check for nukta combination (e.g. क + ़ = क़)
    const combinedNukta = nextCh === NUKTA ? ch + NUKTA : null;
    const effectiveChar = combinedNukta || ch;
    if (combinedNukta) {
      i++; // skip nukta on next iteration
    }

    // 1. Digits
    if (DIGIT_MAP[effectiveChar]) {
      result += DIGIT_MAP[effectiveChar];
      i++;
      continue;
    }

    // 2. Independent Vowels
    if (VOWELS[effectiveChar]) {
      result += VOWELS[effectiveChar];
      i++;
      continue;
    }

    // 3. Consonants
    if (CONSONANTS[effectiveChar]) {
      const romConsonant = CONSONANTS[effectiveChar];
      const lookahead = i + 1 < len ? word[i + 1] : '';

      if (lookahead === HALANT) {
        // Halant suppresses inherent 'a'
        result += romConsonant;
        i += 2; // skip consonant and halant
        continue;
      } else if (MATRAS[lookahead]) {
        // Matra replaces inherent 'a'
        result += romConsonant + MATRAS[lookahead];
        i += 2; // skip consonant and matra
        continue;
      } else {
        // End of word or followed by another consonant
        // In Hindi orthography, the schwa ('a') at the very end of a word is usually silent (shwa deletion),
        // except when it is a single-letter syllable.
        const isEndOfWord = (i + 1 >= len);
        if (isEndOfWord && result.length > 0) {
          result += romConsonant;
        } else {
          result += romConsonant + 'a';
        }
        i++;
        continue;
      }
    }

    // 4. Standalone matra or punctuation
    if (MATRAS[effectiveChar]) {
      result += MATRAS[effectiveChar];
      i++;
      continue;
    }

    // Non-Devanagari characters (already English, punctuation, or spaces)
    result += effectiveChar;
    i++;
  }

  return result;
}

/**
 * Converts any Devanagari / Hindi text into English alphabets (Latin characters).
 * If the input is already in English, it returns the input unchanged (or slightly normalized).
 */
export function transliterateDevanagariToEnglish(text: string): string {
  if (!text) return '';

  // Quick check if text contains any Devanagari characters (U+0900 to U+097F)
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  if (!hasDevanagari) {
    return text;
  }

  // Replace multi-word common phrases first
  let processed = text;
  for (const [hindi, roman] of Object.entries(PHRASE_DICTIONARY)) {
    if (processed.includes(hindi)) {
      processed = processed.split(hindi).join(roman);
    }
  }

  // Split remaining text into tokens while preserving whitespace & punctuation
  const tokens = processed.split(/(\s+|[^\u0900-\u097Fa-zA-Z0-9])/);
  const result = tokens.map((token) => {
    if (/[\u0900-\u097F]/.test(token)) {
      return transliterateWord(token);
    }
    return token;
  }).join('');

  // Clean up any double spaces and capitalize first letter
  const cleaned = result.replace(/\s+/g, ' ').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
