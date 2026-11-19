/**
 * Pakku Voice AI & Natural Language Normalizer
 *
 * Specializes in Indian commercial terms, Hinglish idioms, Indian names, products,
 * English loan words spoken in Hindi/Hinglish (e.g. 'टेडी बेयर' -> 'Teddy Bear'),
 * cities, amounts, and aggressive stripping of command preambles ('ek bill banana hai').
 */

// Command & intent phrases that must NEVER be treated as customer or product names
export const COMMAND_PREAMBLES: RegExp[] = [
  /^(?:kripya|please|कृपया|प्लीज)?\s*(?:ek|1|एक)?\s*(?:pakka|kachha|gst|पक्का|कच्चा|जीएसटी)?\s*(?:bill|bil|invoice|chalan|challan|parcha|purja|बिल|चालान|इनवॉइस|पर्चा)\s*(?:banana|bana\s*do|banao|banaiye|banaye|bananna|generate\s*karo|generate\s*karna|kaatna|kaato|likho|create\s*karo|बनाना\s*है|बना\s*दो|बनाओ|बनाइये|बनाएं|काटना\s*है|काटो|लिखो)\s*(?:hai|h)?\s*(?:ki|ke|ka|की|के|का)?\s*/i,
  /^(?:bill|bil|invoice|chalan|challan|बिल|चालान|इनवॉइस)\s*(?:banana|banao|bana\s*do|banaye|बनाना|बनाओ|बना\s*दो|बनाएं)\s*(?:hai|h|है)?\s*/i,
  /^(?:likho|entry\s*karo|note\s*karo|likhiye|darj\s*karo|लिखो|दर्ज\s*करो|नोट\s*करो)\s*/i,
  /^(?:mujhe|hume|humko|मुझे|हमें)\s*(?:ek|एक)?\s*(?:bill|bil|invoice|बिल|चालान)\s*(?:chahiye|bana\s*do|चाहिए|बना\s*दो)\s*/i,
  /^(?:sale|bikri|बिक्री)\s*(?:ki\s*entry|likho|darj\s*karo|लिखो|दर्ज\s*करो)\s*/i,
  /\b(?:ek|1|एक)?\s*(?:bill|bil|invoice|chalan|challan|parcha|बिल|चालान|इनवॉइस|पर्चा)\s*(?:banana|bana\s*do|banao|banaye|hai|बनाना\s*है|बना\s*दो|बनाओ|बनाएं)\s*(?:hai|h|है)?\b/gi,
];

// Dictionary of English & Loan Words commonly spoken in Hindi / Hinglish
// Maps mis-transcribed or phonetically spelled words to proper, clean title-cased names
export const LOAN_WORDS_DICTIONARY: Record<string, string> = {
  // Toys & Gifts
  'tedee beyara': 'Teddy Bear',
  'tedee beyear': 'Teddy Bear',
  'tedee bear': 'Teddy Bear',
  'tedi bear': 'Teddy Bear',
  'teddy beyara': 'Teddy Bear',
  'tedybare': 'Teddy Bear',
  'teddy bare': 'Teddy Bear',
  'tedi beyara': 'Teddy Bear',
  'टेडी बेयर': 'Teddy Bear',
  'टेडीबेयर': 'Teddy Bear',
  'khilona': 'Toy (खिलौना)',
  'khilone': 'Toys (खिलौने)',

  // Grocery, Food & Staples
  'chini': 'Sugar (चीनी)',
  'cheeni': 'Sugar (चीनी)',
  'sugar': 'Sugar',
  'shakkar': 'Sugar (शक्कर)',
  'chawal': 'Rice (चावल)',
  'chaawal': 'Rice (चावल)',
  'rice': 'Rice',
  'atta': 'Atta (आटा)',
  'aata': 'Atta (आटा)',
  'gehu': 'Wheat (गेहूं)',
  'maida': 'Maida',
  'besan': 'Besan (चना आटा)',
  'suji': 'Suji / Rava',
  'sooji': 'Suji / Rava',
  'tel': 'Oil (तेल)',
  'sarso tel': 'Mustard Oil (सरसों तेल)',
  'mustard oil': 'Mustard Oil',
  'refined oil': 'Refined Oil',
  'dal': 'Dal (दाल)',
  'daal': 'Dal (दाल)',
  'arhar dal': 'Arhar Dal',
  'moong dal': 'Moong Dal',
  'chana dal': 'Chana Dal',
  'masoor dal': 'Masoor Dal',
  'doodh': 'Milk (दूध)',
  'milk': 'Milk',
  'dahi': 'Curd (दही)',
  'paneer': 'Paneer',
  'ghee': 'Desi Ghee (घी)',
  'makhan': 'Butter (मक्खन)',
  'butter': 'Butter',
  'namak': 'Salt (नमक)',
  'salt': 'Salt',
  'haldi': 'Turmeric (हल्दी)',
  'mirch': 'Chilli Powder (मिर्च)',
  'dhaniya': 'Coriander (धनिया)',
  'garam masala': 'Garam Masala',
  'masala': 'Spices / Masala',
  'chai patti': 'Tea Leaves (चाय पत्ती)',
  'chai': 'Tea (चाय)',
  'tea': 'Tea',
  'coffee': 'Coffee',
  'biscuit': 'Biscuits (बिस्कुट)',
  'biskut': 'Biscuits (बिस्कुट)',
  'biscuits': 'Biscuits',
  'cookie': 'Cookies',
  'cookies': 'Cookies',
  'toast': 'Rusk / Toast',
  'rusk': 'Rusk',
  'namkeen': 'Namkeen',
  'chips': 'Chips',
  'kurkure': 'Kurkure',
  'chocolates': 'Chocolates',
  'chocolate': 'Chocolate',
  'maggi': 'Maggi Noodles',
  'noodles': 'Noodles',
  'pasta': 'Pasta',

  // Personal Care & Household
  'sabun': 'Soap (साबुन)',
  'soap': 'Soap',
  'bathing soap': 'Bathing Soap',
  'shampoo': 'Shampoo (शैम्पू)',
  'conditioner': 'Hair Conditioner',
  'hair oil': 'Hair Oil',
  'toothpaste': 'Toothpaste',
  'colgate': 'Colgate Toothpaste',
  'toothbrush': 'Toothbrush',
  'detergent': 'Detergent Powder',
  'surf': 'Surf Detergent',
  'washing powder': 'Washing Powder',
  'dishwash': 'Dishwash Liquid / Bar',
  'vim bar': 'Vim Bar',
  'harpic': 'Harpic Toilet Cleaner',
  'phenyl': 'Phenyl Cleaner',
  'agarbatti': 'Agarbatti / Incense',
  'matchbox': 'Matchbox (माचिस)',
  'machis': 'Matchbox (माचिस)',
  'mombatti': 'Candle (मोमबत्ती)',
  'candle': 'Candle',

  // Electronics & Mobile
  'mobile': 'Mobile Phone',
  'phone': 'Smartphone',
  'smartphone': 'Smartphone',
  'charger': 'Mobile Charger',
  'data cable': 'Data Cable',
  'cable': 'Cable',
  'earphone': 'Earphones',
  'earphones': 'Earphones',
  'headphone': 'Headphones',
  'headphones': 'Headphones',
  'earbuds': 'TWS Earbuds',
  'powerbank': 'Power Bank',
  'power bank': 'Power Bank',
  'screen guard': 'Screen Guard / Glass',
  'tempered glass': 'Tempered Glass',
  'back cover': 'Phone Back Cover',
  'cover': 'Mobile Cover',
  'battery': 'Battery',
  'laptop': 'Laptop',
  'mouse': 'Computer Mouse',
  'keyboard': 'Keyboard',
  'pendrive': 'Pen Drive / USB',
  'memory card': 'Memory Card / SD Card',
  'sim': 'SIM Card',
  'recharge': 'Mobile Recharge',

  // Hardware, Electrical & Construction
  'cement': 'Cement (सीमेंट)',
  'ultratech cement': 'UltraTech Cement',
  'ambuja cement': 'Ambuja Cement',
  'sariya': 'Steel TMT Sariya (सरिया)',
  'steel': 'Steel',
  'tmt': 'TMT Bars',
  'eent': 'Bricks (ईंट)',
  'bricks': 'Bricks',
  'ret': 'Sand / Ret (रेत)',
  'sand': 'Sand',
  'paint': 'Paint / Wall Color',
  'primer': 'Primer Paint',
  'putty': 'Wall Putty',
  'pipe': 'PVC Pipe',
  'pvc pipe': 'PVC Pipe',
  'wire': 'Electrical Wire',
  'taar': 'Electric Wire (तार)',
  'switch': 'Electric Switch',
  'socket': 'Electric Socket',
  'bulb': 'LED Bulb',
  'led bulb': 'LED Bulb',
  'tube light': 'LED Tube Light',
  'fan': 'Ceiling Fan',
  'cooler': 'Air Cooler',
  'motor': 'Water Motor / Pump',

  // Clothing, Footwear & Fashion
  'shirt': 'Shirt',
  't-shirt': 'T-Shirt',
  'tshirt': 'T-Shirt',
  'pant': 'Pant / Trousers',
  'jeans': 'Jeans',
  'kurta': 'Kurta',
  'pajama': 'Pajama',
  'saree': 'Saree (साड़ी)',
  'suit': 'Ladies Suit',
  'dupatta': 'Dupatta',
  'shoes': 'Shoes (जूते)',
  'joota': 'Shoes (जूते)',
  'jootey': 'Shoes (जूते)',
  'chappal': 'Slippers / Chappal (चप्पल)',
  'sandals': 'Sandals',
  'socks': 'Socks (मोज़े)',
  'belt': 'Leather Belt',
  'wallet': 'Wallet / Purse',
  'bag': 'Bag / School Bag',

  // Pharma & Medical
  'dawa': 'Medicines (दवाई)',
  'dawai': 'Medicines (दवाई)',
  'medicine': 'Medicines',
  'medicines': 'Medicines',
  'tablet': 'Tablets',
  'syrup': 'Cough Syrup',
  'paracetamol': 'Paracetamol Tablets',
  'bandage': 'Bandage / Patti',
  'mask': 'Face Mask',
  'sanitizer': 'Hand Sanitizer',

  // Automotive & Fuel
  'petrol': 'Petrol Fuel',
  'diesel': 'Diesel Fuel',
  'engine oil': 'Engine Oil',
  'mobil oil': 'Mobil Engine Oil',
  'grease': 'Automotive Grease',
  'puncture': 'Puncture Repair',
  'servicing': 'Vehicle Servicing',
  'washing': 'Car / Bike Washing',
};

// Major Indian Cities for auto-correction in addresses and party names
export const INDIAN_CITIES = [
  'Delhi', 'New Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Bangalore', 'Bengaluru',
  'Hyderabad', 'Ahmedabad', 'Pune', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur',
  'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara',
  'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot',
  'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai',
  'Allahabad', 'Prayagraj', 'Ranchi', 'Howrah', 'Jabalpur', 'Gwalior', 'Vijayawada',
  'Jodhpur', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Bareilly',
  'Moradabad', 'Mysore', 'Gurgaon', 'Gurugram', 'Aligarh', 'Jalandhar', 'Bhubaneswar',
  'Salem', 'Warangal', 'Guntur', 'Bhiwandi', 'Saharanpur', 'Gorakhpur', 'Bikaner',
  'Amravati', 'Noida', 'Jamshedpur', 'Bhilai', 'Cuttack', 'Firozabad', 'Kochi',
  'Nellore', 'Bhavnagar', 'Dehradun', 'Durgapur', 'Asansol', 'Rourkela', 'Nanded',
  'Kolhapur', 'Ajmer', 'Akola', 'Gulbarga', 'Jamnagar', 'Ujjain', 'Loni', 'Siliguri',
  'Jhansi', 'Ulhasnagar', 'Jammu', 'Sangli', 'Mangalore', 'Erode', 'Belgaum', 'Kurnool',
  'Ambattur', 'Tirunelveli', 'Malegaon', 'Gaya', 'Tiruppur', 'Davanagere', 'Kozhikode',
  'Udaipur', 'Muzaffarpur', 'Mathura', 'Panipat', 'Darbhanga', 'Haridwar', 'Rohtak',
];

/**
 * Strips initial voice command preambles:
 * e.g. "ek bill banana hai teddy bear 2000" -> "teddy bear 2000"
 * e.g. "bill bana do 500 ki chini" -> "500 ki chini"
 */
export function stripVoiceCommandPreamble(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  for (const re of COMMAND_PREAMBLES) {
    if (re.test(cleaned)) {
      cleaned = cleaned.replace(re, '').trim();
      break;
    }
  }

  // Also clean leading preposition words left behind
  cleaned = cleaned.replace(/^(?:ka|ki|ke|me|mein|par|ko|se)\s+/i, '').trim();
  return cleaned;
}

/**
 * Normalizes speech text using Pakku AI phonetic dictionary
 * Corrects "tedee beyara" -> "Teddy Bear"
 * Corrects "2000 ka ek bil banana hai tedee beyara" -> "Teddy Bear 2000"
 */
export function normalizeWithPakkuAI(text: string): string {
  if (!text) return '';
  let norm = text.trim();

  // 1. Strip command preambles
  norm = stripVoiceCommandPreamble(norm);

  // 2. Direct dictionary lookups for loan words & Indian products
  for (const [key, replacement] of Object.entries(LOAN_WORDS_DICTIONARY)) {
    const isAscii = /^[\x00-\x7F]+$/.test(key);
    const wordRegex = isAscii ? new RegExp(`\\b${key}\\b`, 'gi') : new RegExp(key, 'gi');
    if (wordRegex.test(norm)) {
      norm = norm.replace(wordRegex, replacement);
    }
  }

  // 3. Indian City Capitalization & Corrections
  for (const city of INDIAN_CITIES) {
    const cityRegex = new RegExp(`\\b${city}\\b`, 'gi');
    if (cityRegex.test(norm)) {
      norm = norm.replace(cityRegex, city);
    }
  }

  return norm.trim();
}
