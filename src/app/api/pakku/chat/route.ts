import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Comprehensive Knowledge Base of Pakka Chittha
const PAKKACHITTHA_KNOWLEDGE = `
You are "Pakku" (पक्कू), the official intelligent, friendly AI assistant and mascot of Pakka Chittha (पक्का चिट्ठा).
Pakka Chittha is India's premier 100% cloud-native GST Billing, Inventory Stock Management, Udhaar Khata, and Ghar Kharcha (Household Budget) platform for MSMEs, shopkeepers, traders, and families.

Your Personality:
- Cheerful, respectful, knowledgeable, and concise.
- Speaks fluent Hindi (हिंदी / Hinglish) and English.
- Always guide users with exact navigation steps and clickable Markdown links to pages in Pakka Chittha.
- When answering in Hindi, use natural, friendly Indian business language (e.g. "नमस्ते जी! बिल बनाने के लिए...", "चिंता न करें, मैं बताता हूँ...").

Key Modules & Page Links:
1. GST Billing & Invoices:
   - Create Invoice: [नया बिल बनाएं](/invoices/new)
   - Invoices List: [सभी बिल देखें](/invoices)
   - Features: Supports B2B with GSTIN, B2C, Multi-item line items, Tax rates (0%, 5%, 12%, 18%, 28%), 3-inch thermal printing, A4 standard PDF, and 1-click WhatsApp bill sharing.
2. Smart Voice Entry & Voice Billing (बोलकर बिल बनाना):
   - Access: Top navigation bar click [🎙️ Smart Voice Entry] or press keyboard shortcut \`Ctrl+K\` / \`Cmd+K\`.
   - How it works: Simply speak in Hindi, English, or Hinglish (e.g., "एक बिल बनाओ Teddy Bear 2000" or "Ramesh ko 500 diye" or "500 ki chini becha"). Pakku AI automatically identifies customer, product items, quantities, rates, and creates the invoice draft in 2 seconds!
3. Customer Udhaar Khata (ग्राहक खाता):
   - Customers: [ग्राहक सूची](/customers)
   - Record Udhaar (Debit) & Jama (Credit), track outstanding balance, and send automated WhatsApp payment reminders with UPI QR codes.
4. Supplier & Purchase Management (सप्लायर व खरीद):
   - Purchases: [खरीद दर्ज करें](/purchases/new)
   - Suppliers: [सप्लायर सूची](/suppliers)
   - Features: Bill scanner, purchase registers, input tax credit (ITC) tracking.
5. Inventory & Stock (स्टॉक प्रबंधन):
   - Inventory: [स्टॉक सूची](/inventory)
   - Features: Low-stock alerts, HSN codes, barcode scanning, CSV bulk import, selling vs purchase price.
6. Quotations / Estimates (कोटेशन / कच्चा बिल):
   - Quotations: [कोटेशन बनाएं](/quotations/new)
   - 1-click conversion from quotation to final GST invoice.
7. Ghar Kharcha (घर खर्चा एवं पारिवारिक बजट):
   - Dashboard: [घर खर्चा डैशबोर्ड](/ghar-kharcha)
   - Register: [खर्चा रजिस्टर](/ghar-kharcha/transactions)
   - Monthly Budget: [माहवार बजट](/ghar-kharcha/budget)
   - Family Members & Splits: [सदस्य व खर्च विभाजन](/ghar-kharcha/splits)
   - Reports: [घर खर्चा रिपोर्ट्स](/ghar-kharcha/reports)
   - Features: 100% Free household expense tracking, date-wise itemized expense view, multi-unit management (up to 3 homes/units), monthly budget utilization, bills & recharge tracker.
8. Free Khata (पर्सनल खाता):
   - Access: [फ्री खाता](/free-khata)
   - Simple single-entry debit/credit ledger for personal daily lending without business taxes.
9. Reports & Tax Filing (रिपोर्ट्स व सीए टूल्स):
   - Reports: [फाइनेंशियल रिपोर्ट्स](/reports)
   - Accountant ERP: [अकाउंटेंट मोड](/accountant)
   - Reports available: GSTR-1, GSTR-2B, GSTR-3B, Sales Register, Purchase Register, Day Book, Profit & Loss, Balance Sheet.
10. Security & 6-Digit Fast PIN:
   - Platform Settings: [सेटिंग्स](/settings)
   - Platform Admin Settings: [सुपर एडमिन सेटिंग्स](/platform-admin/settings)
   - Fast login with 6-digit PIN and auto screen lock protection.
`;

// Intent matchers for instant, offline zero-latency answers
function getInstantPakkuAnswer(query: string): string | null {
  const q = query.toLowerCase().trim();

  // 1. Who is Pakku?
  if (q.includes('who are you') || q.includes('kaun ho') || q.includes('tum kaun') || q.includes('aap kaun') || q.includes('pakku kaun')) {
    return `नमस्ते जी! 😊 मैं **पक्कू (Pakku)** हूँ — पक्का चिट्ठा (Pakka Chittha) का स्मार्ट AI सहायक और आधिकारिक मस्कट!\n\nमैं बिलिंग, जीएसटी, उधारी खाता, स्टॉक, घर खर्चा और पक्का चिट्ठा के सभी टूल्स में आपकी मदद के लिए 24/7 हाजिर हूँ। आप मुझसे वेबसाइट से जुड़ा कोई भी सवाल हिंदी या इंग्लिश में पूछ सकते हैं!`;
  }

  // 2. How to create GST invoice
  if (
    q.includes('gst bill') || q.includes('create invoice') || q.includes('bill kaise banaye') ||
    q.includes('invoice kaise') || q.includes('naya bill') || q.includes('bill banana') || q.includes('challan kaise')
  ) {
    return `**पक्का चिट्ठा में नया GST बिल / चालान बनाने का आसान तरीका:**\n\n1. ऊपर मेनू में या यहाँ क्लिक करें: [👉 नया बिल बनाएं (Create Invoice)](/invoices/new)\n2. **ग्राहक (Customer)** चुनें या नाम व मोबाइल नंबर दर्ज करें। (GST बिल के लिए GSTIN डालें — ऑटो-डिटेक्ट हो जाएगा)\n3. **आइटम (Product)** जोड़ें: उत्पाद का नाम, मात्रा (Qty), दर (Rate) और GST दर (0%, 5%, 12%, 18%) चुनें।\n4. डिस्काउंट या नकद भुगतान (Cash/Online) भरें।\n5. नीचे **"चालान / बिल बनाएं"** पर क्लिक करें!\n\n💡 **प्रो-टिप:** आप ऊपर मौजूद **[🎙️ Smart Voice Entry]** पर क्लिक करके बोलकर भी 2 सेकंड में बिल बना सकते हैं!`;
  }

  // 3. Voice entry explanation
  if (
    q.includes('voice') || q.includes('bolkar') || q.includes('awaz') || q.includes('speak') ||
    q.includes('teddy bear') || q.includes('voice entry')
  ) {
    return `**पक्का चिट्ठा स्मार्ट वॉयस एंट्री (Smart Voice Entry):**\n\nआप बिना टाइप किए सिर्फ बोलकर बिल या उधारी दर्ज कर सकते हैं:\n\n1. टॉप हेडर में **[🎙️ Smart Voice Entry]** बटन पर क्लिक करें (या \`Ctrl+K\` दबाएं)।\n2. माइक ऑन होने पर अपनी भाषा में बोलें, जैसे:\n   - *"एक बिल बनाओ Teddy Bear 2000"* 👉 अपने आप Teddy Bear ₹2000 का बिल बन जाएगा।\n   - *"Ramesh ko 500 diye"* 👉 रमेश के खाते में ₹500 का भुगतान दर्ज होगा।\n   - *"Mohan se 1200 cash mila"* 👉 मोहन से कैश पेमेंट रिकॉर्ड हो जाएगी।\n   - *"5000 ka diesel kharcha"* 👉 पेट्रोल/ईंधन खर्च में जुड़ जाएगा।\n3. स्क्रीन पर प्रीव्यू देखकर **"बिल बनाएं"** या **"सेव करें"** पर क्लिक करें!`;
  }

  // 4. Customer Udhaar & Payment Reminders
  if (
    q.includes('udhaar') || q.includes('customer') || q.includes('grahak') || q.includes('khata') ||
    q.includes('jama') || q.includes('baki') || q.includes('reminder') || q.includes('whatsapp')
  ) {
    return `**ग्राहक उधारी खाता व व्हाट्सएप रिमाइंडर:**\n\n1. [👉 ग्राहक सूची (Customers)](/customers) पर जाएं।\n2. **"नया ग्राहक जोड़ें"** पर क्लिक करके नाम व फोन नंबर सेव करें।\n3. जब भी ग्राहक उधार ले, **"उधार दिया (Gave)"** दर्ज करें। जब पैसे मिलें, **"प्राप्त हुआ (Got)"** दर्ज करें।\n4. **व्हाट्सएप पेमेंट रिमाइंडर:** ग्राहक के नाम के पास व्हाट्सएप आइकन दबाकर सीधे बकाए का पेमेंट लिंक और UPI QR कोड एसएमएस/व्हाट्सएप पर भेजें!`;
  }

  // 5. Ghar Kharcha / Household Budget
  if (
    q.includes('ghar kharcha') || q.includes('budget') || q.includes('household') ||
    q.includes('parivar') || q.includes('family') || q.includes('split')
  ) {
    return `**घर खर्चा (Household Budget & Ledger) गाइड:**\n\nपक्का चिट्ठा में घर खर्चा 100% फ्री है:\n\n- [🏠 घर खर्चा डैशबोर्ड](/ghar-kharcha): कुल महीने का खर्च, बचत और शुद्ध स्थिति देखें।\n- [📝 खर्चा रजिस्टर](/ghar-kharcha/transactions): दैनिक खर्चे दर्ज करें और तारीख अनुसार फिल्टर करें।\n- [📊 माहवार बजट](/ghar-kharcha/budget): महीने का बजट सेट करें (जैसे ₹25,000) ताकि ओवरस्पेंडिंग से बच सकें।\n- [👥 सदस्य व विभाजन](/ghar-kharcha/splits): परिवार के सदस्यों में खर्च बराबर या कस्टम बांटें और हिसाब सेटल करें।\n- [📅 रिपोर्ट्स](/ghar-kharcha/reports): तारीख अनुसार सभी खर्चे एक्सेल या पीडीएफ में डाउनलोड करें!`;
  }

  // 6. GSTR Reports & CA Tools
  if (
    q.includes('gstr') || q.includes('report') || q.includes('gst report') || q.includes('sales register') ||
    q.includes('tax') || q.includes('ca') || q.includes('accountant')
  ) {
    return `**GST रिपोर्ट्स व सीए टूल्स:**\n\n1. [👉 फाइनेंशियल रिपोर्ट्स (Reports)](/reports) पर जाएं।\n2. यहाँ आपको निम्न रिपोर्ट्स मिलेंगी:\n   - **GSTR-1**: सेल्स बिलों का समरी व JSON/Excel एक्सपोर्ट।\n   - **GSTR-2B**: इनपुट टैक्स क्रेडिट (ITC) मिलान।\n   - **Sales Register & Purchase Register**: विस्तृत इनवॉइस लिस्ट।\n   - **Day Book व Profit & Loss**: दैनिक रोकड़ व लाभ-हानि खाता।\n3. [अकाउंटेंट मोड (Accountant ERP)](/accountant) से आपका CA सीधे लेजर और बैलेंस शीट ऑडिट कर सकता है!`;
  }

  // 7. Security PIN & Screen Lock
  if (q.includes('pin') || q.includes('security') || q.includes('lock') || q.includes('password') || q.includes('passcode')) {
    return `**6-अंकीय सिक्योरिटी PIN व स्क्रीन लॉक:**\n\n- [👉 प्लेटफॉर्म सेटिंग्स](/settings) या [सुपर एडमिन सेटिंग्स](/platform-admin/settings) में जाएं।\n- **"Security PIN"** विकल्प में 6 अंकों का सुरक्षित पिन सेट करें।\n- पिन सेट होने के बाद आप बिना पासवर्ड टाइप किए तेज 6-Digit PIN से तुरंत लॉगिन कर सकते हैं और निष्क्रिय रहने पर स्क्रीन लॉक हो जाएगी!`;
  }

  // 8. Inventory / Stock
  if (q.includes('inventory') || q.includes('stock') || q.includes('product') || q.includes('saman') || q.includes('maal')) {
    return `**स्टॉक व इन्वेंट्री प्रबंधन:**\n\n1. [👉 इन्वेंट्री (Inventory)](/inventory) पर जाएं।\n2. **"नया उत्पाद जोड़ें"** पर क्लिक करें: नाम, SKU, सेलिंग प्राइस, खरीद भाव, HSN कोड व शुरुआती स्टॉक दर्ज करें।\n3. जब बिल बनेगा, स्टॉक अपने आप घट जाएगा। कम स्टॉक होने पर लो-स्टॉक अलर्ट मिलेगा!`;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ChatMessage[] = body.messages || [];
    const userQuery = body.query || (messages.length > 0 ? messages[messages.length - 1].content : '');

    if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a valid question.',
      }, { status: 400 });
    }

    // 1. Check instant knowledge base for zero-latency, high-accuracy reply
    const instantAnswer = getInstantPakkuAnswer(userQuery);
    if (instantAnswer) {
      return NextResponse.json({
        success: true,
        reply: instantAnswer,
        source: 'instant_knowledge',
      });
    }

    // 2. If GEMINI_API_KEY is configured, leverage Google Gemini Free Tier
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (geminiKey) {
      try {
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
                      text: `${PAKKACHITTHA_KNOWLEDGE}\n\nUser Question: "${userQuery}"\n\nAnswer in a helpful, friendly manner as Pakku. If the user asks in Hindi, reply in Hindi. If in English, reply in English. Always include relevant Pakka Chittha page links in markdown format. Keep it concise (under 120 words).`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 500,
              },
            }),
          }
        );

        const geminiJson = await geminiRes.json();
        const generated = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generated && generated.trim()) {
          return NextResponse.json({
            success: true,
            reply: generated.trim(),
            source: 'gemini_ai',
          });
        }
      } catch (geminiErr) {
        console.warn('[Pakku AI] Gemini API fallback error:', geminiErr);
      }
    }

    // 3. Robust Semantic Fallback if no external key or generic question
    const defaultHindiReply = `नमस्ते जी! मैं **पक्कू (Pakku)**, पक्का चिट्ठा का AI सहायक।\n\nआपके सवाल **"${userQuery}"** के संदर्भ में:\n- **बिलिंग व इनवॉइस**: [नया बिल बनाएं](/invoices/new)\n- **उधारी खाता**: [ग्राहक सूची](/customers)\n- **बोलकर बिलिंग**: ऊपर मौजूद **[🎙️ Smart Voice Entry]** पर टैप करें\n- **घर खर्चा व पारिवारिक बजट**: [घर खर्चा डैशबोर्ड](/ghar-kharcha)\n- **टैक्स व रिपोर्ट्स**: [फाइनेंशियल रिपोर्ट्स](/reports)\n\nयदि आप किसी विशेष फ़ीचर (जैसे GST बिल, प्रिंटिंग, व्हाट्सएप रिमाइंडर) के बारे में विस्तार से जानना चाहते हैं, तो कृपया पूछें!`;

    return NextResponse.json({
      success: true,
      reply: defaultHindiReply,
      source: 'pakku_semantic_engine',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error processing AI chat';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
