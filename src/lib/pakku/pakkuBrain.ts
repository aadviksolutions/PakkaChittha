import { ClientPatternProfile } from './pakkuPatternAnalyzer';
import { PakkuLearnedMemory } from './pakkuMemory';
import { globalKnowledgeSearch } from '@/lib/services/knowledgeService';

export interface PakkuResponse {
  reply: string;
  source: 'live_data' | 'math_engine' | 'knowledge_hub' | 'gemini_ai' | 'openai_ai' | 'pakku_human_brain';
  actionableLink?: { label: string; url: string };
  learnedNewFact?: string;
}

/**
 * Evaluates basic math expressions in natural language
 * e.g. "50000 ka 18% GST", "25% margin on 400", "12500 - 3400"
 */
function solveNaturalMath(query: string): string | null {
  const q = query.toLowerCase();

  // 1. Percentage GST: e.g. "50000 ka 18% gst", "18% of 45000", "50000 par 18%"
  const gstPattern1 = q.match(/(\d+(?:\.\d+)?)\s*(?:ka|का|par|पर|pe)\s*(\d+(?:\.\d+)?)\s*%/i);
  const gstPattern2 = q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:gst\s*)?(?:ka|का|of|on|par|पर|pe)?\s*(\d+(?:\.\d+)?)/i);

  let amount = 0;
  let rate = 0;

  if (gstPattern1) {
    amount = parseFloat(gstPattern1[1]);
    rate = parseFloat(gstPattern1[2]);
  } else if (gstPattern2) {
    rate = parseFloat(gstPattern2[1]);
    amount = parseFloat(gstPattern2[2]);
  }

  if (amount > 0 && rate > 0) {
    const gstAmount = (amount * rate) / 100;
    const total = amount + gstAmount;
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;

    return `अरे वाह! यहाँ आपका हिसाब तैयार है:\n\n` +
      `• **मूल राशि (Base Amount):** ₹${amount.toLocaleString('en-IN')}\n` +
      `• **GST दर (${rate}%):** ₹${gstAmount.toLocaleString('en-IN')}\n` +
      `  ↳ CGST (${rate / 2}%): ₹${cgst.toLocaleString('en-IN')}\n` +
      `  ↳ SGST (${rate / 2}%): ₹${sgst.toLocaleString('en-IN')}\n` +
      `• **कुल राशि (Grand Total):** ₹${total.toLocaleString('en-IN')}\n\n` +
      `💡 क्या आप इसका सीधा [GST इनवॉइस बनाना चाहते हैं?](/invoices/new)`;
  }

  // 2. Margin calculation: e.g. "400 par 20% margin" or "cost 500 margin 25%"
  const marginMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:par|cost|pe|पर)?\s*(\d+(?:\.\d+)?)\s*%\s*margin/i);
  if (marginMatch) {
    const cost = parseFloat(marginMatch[1]);
    const marginPct = parseFloat(marginMatch[2]);
    if (cost > 0 && marginPct > 0 && marginPct < 100) {
      const sellingPrice = cost / (1 - marginPct / 100);
      const profit = sellingPrice - cost;
      return `बिल्कुल! अगर आपकी खरीद लागत **₹${cost.toLocaleString('en-IN')}** है और आपको **${marginPct}% मार्जिन** चाहिए:\n\n` +
        `• **सेलिंग प्राइस (बिक्री मूल्य):** ₹${Math.round(sellingPrice).toLocaleString('en-IN')}\n` +
        `• **प्रति पीस मुनाफा (Profit):** ₹${Math.round(profit).toLocaleString('en-IN')}\n\n` +
        `आप इसे तुरंत [इन्वेंट्री में नया उत्पाद जोड़कर](/inventory) सेट कर सकते हैं!`;
    }
  }

  // 3. Simple arithmetic: e.g. "12000 + 4500" or "50000 - 13400"
  const basicMathMatch = q.match(/(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/);
  if (basicMathMatch && !q.includes('gst') && !q.includes('invoice') && !q.includes('date')) {
    const num1 = parseFloat(basicMathMatch[1]);
    const op = basicMathMatch[2];
    const num2 = parseFloat(basicMathMatch[3]);
    let res = 0;
    if (op === '+') res = num1 + num2;
    if (op === '-') res = num1 - num2;
    if (op === '*') res = num1 * num2;
    if (op === '/') res = num2 !== 0 ? num1 / num2 : 0;

    return `लीजिए, हिसाब यह रहा:\n\n**${num1.toLocaleString('en-IN')} ${op} ${num2.toLocaleString('en-IN')} = ${res.toLocaleString('en-IN')}**\n\nकोई और जोड़-घटाना या प्रतिशत निकालना हो तो बेझिझक बोलें!`;
  }

  return null;
}

/**
 * Answers questions about the client's live business or household data
 */
function answerFromClientPattern(query: string, pattern: ClientPatternProfile, memory: PakkuLearnedMemory): string | null {
  const q = query.toLowerCase().trim();
  const name = memory.preferredName || pattern.userName.split(' ')[0] + ' जी';

  // 1. Today's sales or invoices
  if (
    q.includes('aaj ka sale') || q.includes('aaj ki bikri') || q.includes('aaj ka bill') ||
    q.includes('aaj ka hisab') || q.includes('today sales') || q.includes('today sale') ||
    q.includes('aaj kitna becha') || q.includes('aaj kitna bill')
  ) {
    if (pattern.todayInvoiceCount === 0 && pattern.todaySales === 0) {
      return `नमस्ते ${name}! 😊\n\nआज अभी तक कोई बिल दर्ज नहीं हुआ है (बिक्री: ₹0)।\n\nयदि आज कोई ग्राहक आया है तो आप अभी [👉 नया बिल बनाएं](/invoices/new) या बोलकर दर्ज करने के लिए ऊपर **[🎙️ Smart Voice Entry]** पर टैप करें!`;
    }

    return `नमस्ते ${name}! 📈 आज का आपका लाइव बिक्री हिसाब यह रहा:\n\n` +
      `• **आज की कुल बिक्री:** ₹${pattern.todaySales.toLocaleString('en-IN')}\n` +
      `• **बने हुए इनवॉइस:** ${pattern.todayInvoiceCount} बिल\n` +
      `• **आज प्राप्त नकद/ऑनलाइन पेमेंट:** ₹${pattern.todayCollections.toLocaleString('en-IN')}\n` +
      `• **इस महीने की कुल बिक्री:** ₹${pattern.monthSales.toLocaleString('en-IN')}\n\n` +
      `बढ़िया रफ़्तार है! सारे बिल देखने के लिए [यहाँ क्लिक करें (Invoices)](/invoices)।`;
  }

  // 2. Udhaar / Pending Receivables
  if (
    q.includes('udhaar kitna') || q.includes('baki paisa') || q.includes('udhari') ||
    q.includes('kisko kitna lena') || q.includes('lena hai') || q.includes('pending payment') ||
    q.includes('receivables') || q.includes('kis kis ka baki') || q.includes('total udhaar')
  ) {
    if (pattern.totalReceivables === 0) {
      return `बधाई हो ${name}! 🎉 आपके खाते में बाजार का कोई भी बकाया उधार नहीं है। पूरा हिसाब क्लियर है!\n\nग्राहकों की लिस्ट देखने के लिए [ग्राहक सूची (Customers)](/customers) पर जाएं।`;
    }

    const debtorList = pattern.topDebtors.length > 0
      ? pattern.topDebtors.map(d => `  ↳ **${d.name}:** ₹${d.balance.toLocaleString('en-IN')}`).join('\n')
      : '';

    return `ध्यान दीजिए ${name}! ⚠️\n\n` +
      `बाजार में आपका कुल **₹${pattern.totalReceivables.toLocaleString('en-IN')}** का उधार बकाया है (${pattern.debtorCount} ग्राहकों से)।\n\n` +
      (debtorList ? `**शीर्ष बकाएदार ग्राहक:**\n${debtorList}\n\n` : '') +
      `💡 **मुनीम जी की सलाह:** इन ग्राहकों को [ग्राहक सूची](/customers) में जाकर 1-क्लिक में **व्हाट्सएप पेमेंट रिमाइंडर व UPI QR** भेजें ताकि पैसा जल्दी आ सके!`;
  }

  // 3. Low stock / Inventory health
  if (
    q.includes('stock kaisa') || q.includes('low stock') || q.includes('maal khatam') ||
    q.includes('saman khatam') || q.includes('kya khareedna') || q.includes('inventory check')
  ) {
    if (pattern.lowStockCount === 0) {
      return `बहुत बढ़िया ${name}! 👍 आपकी दुकान में सभी उत्पादों का स्टॉक पर्याप्त है। कोई भी आइटम लो-स्टॉक नहीं है (कुल ${pattern.totalProducts} उत्पाद दर्ज हैं)।\n\nपूरा स्टॉक देखने के लिए [इन्वेंट्री सूची](/inventory) पर जाएं।`;
    }

    const itemsStr = pattern.lowStockItems.length > 0 ? pattern.lowStockItems.join(', ') : '';

    return `चेतावनी ${name}! 📦\n\n` +
      `आपकी इन्वेंट्री में **${pattern.lowStockCount} उत्पादों का स्टॉक खत्म होने की कगार पर है**:\n` +
      (itemsStr ? `↳ *${itemsStr}*\n\n` : '\n') +
      `ग्राहकों को खाली हाथ न लौटना पड़े, इसलिए जल्द ही सप्लायर से माल मँगवा लें। आप यहाँ से [नई खरीद दर्ज कर सकते हैं (Purchases)](/purchases/new) या [स्टॉक अपडेट करें](/inventory)।`;
  }

  // 4. Supplier payables (kisko dena hai)
  if (
    q.includes('supplier') || q.includes('kisko dena hai') || q.includes('dena baki') ||
    q.includes('khareed ka baki') || q.includes('payables')
  ) {
    if (pattern.totalPayables === 0) {
      return `शानदार ${name}! 🤝 सप्लायरों का आपका कोई बकाया नहीं है। आप पूरी तरह देनदारी मुक्त हैं!\n\nसप्लायर लिस्ट देखने के लिए [सप्लायर सूची](/suppliers) पर जाएं।`;
    }

    return `${name}, सप्लायरों को आपको कुल **₹${pattern.totalPayables.toLocaleString('en-IN')}** का भुगतान करना बाकी है (${pattern.supplierCount} सप्लायर)।\n\nभुगतान दर्ज करने या बिल मिलान के लिए [सप्लायर सूची (Suppliers)](/suppliers) पर जाएं।`;
  }

  // 5. Ghar Kharcha / Household status
  if (
    pattern.hasHousehold &&
    (q.includes('ghar kharcha') || q.includes('ghar ka hisab') || q.includes('budget kitna bacha') ||
     q.includes('family budget') || q.includes('ghar me kitna kharch'))
  ) {
    return `नमस्ते ${name}! 🏠 आपके **${pattern.householdName || 'My Family'}** का इस महीने का बजट स्टेटस:\n\n` +
      `• **मासिक बजट:** ₹${pattern.monthlyBudget.toLocaleString('en-IN')}\n` +
      `• **अब तक का खर्च:** ₹${pattern.monthExpenses.toLocaleString('en-IN')} (${pattern.budgetUtilizationPct}% इस्तेमाल)\n` +
      `• **शेष बचा बजट:** ₹${pattern.budgetRemaining.toLocaleString('en-IN')}\n` +
      (pattern.topExpenseCategory ? `• **सबसे बड़ा खर्च वर्ग:** ${pattern.topExpenseCategory}\n` : '') +
      (pattern.budgetUtilizationPct > 85 ? `\n⚠️ *सावधानी:* बजट का अधिकांश हिस्सा खर्च हो चुका है, थोड़ा हाथ खींचकर चलें!\n` : '\n') +
      `विस्तृत तारीख-वार खर्चे देखने के लिए [खर्चा रजिस्टर](/ghar-kharcha/transactions) पर जाएं!`;
  }

  // 6. Shop pulse / Overall business summary
  if (
    q.includes('meri dukan') || q.includes('business kaisa') || q.includes('mera hisab') ||
    q.includes('report card') || q.includes('kaisa chal raha') || q.includes('dukan ka hal')
  ) {
    return `नमस्ते ${name}! 📊 आपकी दुकान **${pattern.businessName || 'आपका व्यापार'}** का संपूर्ण हेल्थ चेक:\n\n` +
      `• **आज की बिक्री:** ₹${pattern.todaySales.toLocaleString('en-IN')} (${pattern.todayInvoiceCount} बिल)\n` +
      `• **इस महीने की बिक्री:** ₹${pattern.monthSales.toLocaleString('en-IN')}\n` +
      `• **बाजार में फंसा उधार:** ₹${pattern.totalReceivables.toLocaleString('en-IN')} (${pattern.debtorCount} ग्राहक)\n` +
      `• **लो-स्टॉक उत्पाद:** ${pattern.lowStockCount} आइटम्स\n\n` +
      `💡 **मुनीम जी का आज का मंत्र:** ` +
      (pattern.totalReceivables > 20000
        ? `आज कम से कम 3 बकाएदारों को फोन या [व्हाट्सएप रिमाइंडर](/customers) भेजकर उधारी रिकवर करें!`
        : `नया स्टॉक मंगाने और बिक्री बढ़ाने पर ध्यान केंद्रित करें!`);
  }

  return null;
}

/**
 * Comprehensive Platform Knowledge Base covering every function & module in Pakka Chittha
 */
function answerPlatformFeature(query: string, name: string): string | null {
  const q = query.toLowerCase().trim();

  // 1. Quotations / Estimates (कच्चा बिल / कोटेशन / एस्टीमेट)
  if (
    q.includes('quotation') || q.includes('कोटेशन') || q.includes('estimate') ||
    q.includes('एस्टीमेट') || q.includes('kachha bill') || q.includes('kaccha bill') ||
    q.includes('कच्चा बिल') || q.includes('proforma') || q.includes('kotation')
  ) {
    return `नमस्ते ${name}! 😊 पक्का चिट्ठा में नया **कोटेशन / एस्टीमेट (Quotation / Estimate)** बनाने का आसान तरीका यह रहा:\n\n` +
      `1. यहाँ क्लिक करें: [👉 नया कोटेशन बनाएं (Create Quotation)](/quotations/new)\n` +
      `2. **ग्राहक (Customer)** का नाम व मोबाइल नंबर चुनें या दर्ज करें।\n` +
      `3. **सामान (Products)**, मात्रा (Qty), और दर (Rate) जोड़ें। आवश्यकतानुसार GST या छूट भरें।\n` +
      `4. **'कोटेशन बनाएं'** पर क्लिक करें। इसे आप सीधे WhatsApp या PDF में ग्राहक को भेज सकते हैं।\n\n` +
      `💡 **जादुई फ़ीचर:** जैसे ही ग्राहक कोटेशन पास कर दे, कोटेशन व्यू में जाकर सिर्फ 1 बटन दबाएं — **"Convert to GST Invoice"**। बिना दोबारा टाइप किए तुरंत पक्का GST बिल बन जाएगा!\n\n` +
      `सारे पुराने कोटेशन देखने के लिए [कोटेशन सूची (Quotations)](/quotations) पर जाएं।`;
  }

  // 2. GST Billing & Invoices (बिल बनाना / इनवॉइस / चालान)
  if (
    q.includes('bill banana') || q.includes('invoice banana') || q.includes('naya bill') ||
    q.includes('gst bill') || q.includes('challan') || q.includes('पक्का बिल') ||
    q.includes('bill kaise banaye') || q.includes('create invoice') || q.includes('make bill') ||
    q.includes('invoice kaise') || q.includes('naya invoice') || q.includes('bill generator')
  ) {
    return `नमस्ते ${name}! 🧾 **नया GST बिल / चालान बनाने की आसान विधि:**\n\n` +
      `1. सीधे यहाँ क्लिक करें: [👉 नया बिल बनाएं (Create Invoice)](/invoices/new)\n` +
      `2. **ग्राहक (Customer)** चुनें। यदि B2B पार्टी है तो उसका GSTIN डालें — नाम व पता अपने आप भर जाएगा!\n` +
      `3. **उत्पाद (Items)** जोड़ें, दर व GST दर (0%, 5%, 12%, 18%, 28%) चुनें।\n` +
      `4. नकद या ऑनलाइन पेमेंट दर्ज करें।\n` +
      `5. नीचे **"चालान / बिल बनाएं"** पर क्लिक करें!\n\n` +
      `🎙️ **सुपर फास्ट टिप:** टाइप करने की जगह ऊपर **[🎙️ Smart Voice Entry]** (या Ctrl+K) पर टैप करके बोलकर 2 सेकंड में बिल बनाएं!\n\n` +
      `सभी पिछले बिल देखने के लिए: [सभी इनवॉइस देखें (Invoices)](/invoices)`;
  }

  // 3. Purchase & AI Bill Scanner (खरीद / सप्लायर बिल / पर्ची स्कैनर)
  if (
    q.includes('purchase') || q.includes('kharid') || q.includes('supplier bill') ||
    q.includes('bill scan') || q.includes('scan bill') || q.includes('सप्लायर बिल') ||
    q.includes('खरीद दर्ज') || q.includes('खरीद बिल') || q.includes('parchi')
  ) {
    return `नमस्ते ${name}! 🛒 **खरीद (Purchase) दर्ज करने और बिल स्कैन करने के 2 तरीके:**\n\n` +
      `• **मैन्युअल खरीद दर्ज करें:** [👉 नई खरीद दर्ज करें (Add Purchase)](/purchases/new) पर जाकर सप्लायर चुनें, इनवॉइस नंबर व खरीदे गए आइटम डालें।\n` +
      `• **AI बिल स्कैनर (जादुई तरीका):** [📸 बिल स्कैन करें (AI Bill Scanner)](/purchases/scan) पर जाएं। सप्लायर के पेपर बिल का फोटो खींचें या अपलोड करें — पक्कू AI अपने आप सभी उत्पाद, दरें और टैक्स पढ़कर खरीद इनवॉइस बना देगा!\n\n` +
      `सप्लायरों का हिसाब देखने के लिए [सप्लायर सूची (Suppliers)](/suppliers) पर जाएं।`;
  }

  // 4. Smart Voice Entry & Voice Billing (बोलकर बिल बनाना)
  if (
    q.includes('voice') || q.includes('bolkar') || q.includes('smart voice') ||
    q.includes('awaz') || q.includes('mic') || q.includes('speak') || q.includes('बोलकर बिल') ||
    q.includes('teddy bear') || q.includes('voice entry')
  ) {
    return `नमस्ते ${name}! 🎙️ **स्मार्ट वॉयस एंट्री (Smart Voice Entry):**\n\n` +
      `बिना कुछ टाइप किए सिर्फ बोलकर बिल बनाने का तरीका:\n\n` +
      `1. ऊपर हेडर में **[🎙️ Smart Voice Entry]** बटन पर क्लिक करें या कीबोर्ड पर \`Ctrl+K\` दबाएं।\n` +
      `2. माइक शुरू होने पर अपनी भाषा में स्वाभाविक रूप से बोलें, जैसे:\n` +
      `   - *"एक बिल बनाओ Teddy Bear 2000"* ➔ तुरंत Teddy Bear ₹2000 का बिल बन जाएगा।\n` +
      `   - *"रमेश को 500 दिए"* ➔ रमेश के खाते में पेमेंट दर्ज हो जाएगी।\n` +
      `   - *"मोहन से 1200 नकद मिला"* ➔ मोहन से कैश जमा रिकॉर्ड हो जाएगा।\n` +
      `3. स्क्रीन पर प्रीव्यू देखकर **"चालान / बिल बनाएं"** पर क्लिक करें!`;
  }

  // 5. Customer Udhaar & WhatsApp Reminders (उधारी खाता व व्हाट्सएप तकादा)
  if (
    q.includes('customer') || q.includes('grahak') || q.includes('udhaar') ||
    q.includes('udhari') || q.includes('khata') || q.includes('jama') ||
    q.includes('reminder') || q.includes('whatsapp') || q.includes('takada') ||
    q.includes('उधार') || q.includes('बकाया')
  ) {
    return `नमस्ते ${name}! 💰 **ग्राहक उधारी खाता व व्हाट्सएप पेमेंट रिमाइंडर:**\n\n` +
      `1. [👉 ग्राहक सूची (Customers)](/customers) पर जाएं।\n` +
      `2. **नया ग्राहक:** "नया ग्राहक जोड़ें" पर क्लिक करके नाम व फोन नंबर सेव करें।\n` +
      `3. **लेना-देना:** जब भी माल उधार दें, 'उधार दिया (Gave)' और जब पैसे मिलें 'प्राप्त हुआ (Got)' दर्ज करें।\n` +
      `4. **व्हाट्सएप तकादा (Reminders):** ग्राहक के नाम के पास व्हाट्सएप आइकन दबाकर 1-क्लिक में बकाए की पर्ची, कुल राशि और आपका UPI QR कोड सीधे उसके फोन पर भेजें!\n\n` +
      `इससे उधारी 3 गुना तेजी से वापस आती है!`;
  }

  // 6. Inventory & Stock (स्टॉक / माल / बारकोड / CSV इंपोर्ट)
  if (
    q.includes('inventory') || q.includes('stock') || q.includes('product') ||
    q.includes('saman') || q.includes('maal') || q.includes('barcode') ||
    q.includes('csv') || q.includes('लो-स्टॉक') || q.includes('स्टॉक')
  ) {
    return `नमस्ते ${name}! 📦 **स्टॉक व इन्वेंट्री प्रबंधन:**\n\n` +
      `1. [👉 इन्वेंट्री सूची (Inventory)](/inventory) पर जाएं।\n` +
      `2. **नया आइटम जोड़ना:** 'नया उत्पाद जोड़ें' पर क्लिक करके नाम, SKU, सेलिंग रेट, खरीद भाव, HSN कोड और मिनिमम स्टॉक अलर्ट सेट करें।\n` +
      `3. **थोक इंपोर्ट (Bulk CSV):** अगर बहुत सारे आइटम हैं, तो 'Import CSV' बटन से एक्सेल शीट सीधे अपलोड करें।\n` +
      `4. जब भी बिल बनेगा, स्टॉक अपने आप घटता जाएगा। कम होने पर पक्कू आपको अलर्ट देगा!`;
  }

  // 7. Ghar Kharcha / Household Budget (घर खर्चा / पारिवारिक बजट)
  if (
    q.includes('ghar kharcha') || q.includes('household') || q.includes('ghar ka kharcha') ||
    q.includes('parivar') || q.includes('family') || q.includes('split') ||
    q.includes('rashan') || q.includes('bijli bill') || q.includes('ghar budget')
  ) {
    return `नमस्ते ${name}! 🏠 **घर खर्चा (Household Budget & Ledger):**\n\n` +
      `पक्का चिट्ठा में घर खर्चा 100% फ्री है:\n\n` +
      `• [🏠 घर खर्चा डैशबोर्ड](/ghar-kharcha): कुल महीने का खर्च, बचत और शुद्ध स्थिति देखें।\n` +
      `• [📝 खर्चा रजिस्टर](/ghar-kharcha/transactions): राशन, दूध, बिजली बिल आदि तारीख-वार दर्ज करें।\n` +
      `• [📊 माहवार बजट](/ghar-kharcha/budget): हर महीने का बजट सेट करें (जैसे ₹25,000)।\n` +
      `• [👥 सदस्य व खर्च विभाजन (Splits)](/ghar-kharcha/splits): परिवार के सदस्यों में खर्च बराबर या कस्टम बांटें।\n` +
      `• [📅 रिपोर्ट्स व एक्सेल डाउनलोड](/ghar-kharcha/reports): पूरे महीने का खर्च पीडीएफ या एक्सेल में निकालें।\n\n` +
      `💡 आप अधिकतम 3 घर या ऑफिस यूनिट्स (Homes/Units) एक साथ मैनेज कर सकते हैं!`;
  }

  // 8. Free Khata (फ्री पर्सनल खाता)
  if (q.includes('free khata') || q.includes('personal khata') || q.includes('फ्री खाता')) {
    return `नमस्ते ${name}! 📒 **फ्री खाता (Personal Khata):**\n\n` +
      `यदि आपको बिना किसी GST या इनवॉइस के सिर्फ दोस्तों, पड़ोसियों या रिश्तेदारों का पर्सनल लेन-देन ट्रैक करना है:\n\n` +
      `• [👉 फ्री खाता डैशबोर्ड](/free-khata) पर जाएं।\n` +
      `• [👉 संपर्क सूची (Contacts)](/free-khata/contacts) में किसी का भी नाम जोड़ें और सीधे 'दिया' या 'लिया' दर्ज करें।\n` +
      `• यह 100% फ्री और सुपर फास्ट है!`;
  }

  // 9. Accountant ERP & CA Mode (अकाउंटेंट मोड / डे-बुक / लेजर / वाउचर / GSTR)
  if (
    q.includes('accountant') || q.includes('ca mode') || q.includes('voucher') ||
    q.includes('day book') || q.includes('trial balance') || q.includes('balance sheet') ||
    q.includes('profit loss') || q.includes('p&l') || q.includes('gstr') || q.includes('सीए')
  ) {
    return `नमस्ते ${name}! 💼 **अकाउंटेंट ERP व CA टूल्स:**\n\n` +
      `• [👉 अकाउंटेंट मोड (Accountant ERP)](/accountant) से आपका CA सीधे डे-बुक, लेजर बैलेंस, ट्रायल बैलेंस और बैलेंस शीट देख सकता है।\n` +
      `• [👉 फाइनेंशियल रिपोर्ट्स (Reports)](/reports) में आपको मिलेंगी:\n` +
      `  ↳ **GSTR-1:** सेल्स इनवॉइस की समरी व JSON फाइल (सीधे GST पोर्टल पर अपलोड के लिए)\n` +
      `  ↳ **GSTR-2B:** इनपुट टैक्स क्रेडिट (ITC) मिलान\n` +
      `  ↳ **Sales & Purchase Register:** एक्सेल व पीडीएफ में विस्तृत विवरण\n` +
      `  ↳ **Day Book व P&L:** दैनिक रोकड़ व लाभ-हानि खाता।`;
  }

  // 10. Security PIN & Screen Lock (6-Digit PIN / स्क्रीन लॉक)
  if (
    q.includes('pin') || q.includes('security pin') || q.includes('screen lock') ||
    q.includes('lock') || q.includes('सिक्योरिटी') || q.includes('पासवर्ड')
  ) {
    return `नमस्ते ${name}! 🔐 **6-अंकीय फास्ट सिक्योरिटी PIN:**\n\n` +
      `1. [👉 प्लेटफॉर्म सेटिंग्स (Settings)](/settings) या [सुपर एडमिन सेटिंग्स](/platform-admin/settings) में जाएं।\n` +
      `2. **"Security PIN"** विकल्प में 6 अंकों का सुरक्षित पिन सेट या बदलें।\n` +
      `3. पिन सेट होने के बाद आप बिना लंबा पासवर्ड डाले सिर्फ 6 अंकों से तुरंत लॉगिन कर सकेंगे और स्क्रीन कुछ देर खाली रहने पर अपने आप सुरक्षित लॉक हो जाएगी!`;
  }

  // 11. Printer & Thermal Printing (प्रिंटर सेटिंग्स / थर्मल प्रिंट / 3-इंच / A4)
  if (
    q.includes('printer') || q.includes('thermal') || q.includes('print setting') ||
    q.includes('3 inch') || q.includes('2 inch') || q.includes('प्रिंटर') || q.includes('प्रिंट')
  ) {
    return `नमस्ते ${name}! 🖨️ **प्रिंटर व प्रिंटिंग सेटिंग्स:**\n\n` +
      `• [👉 प्रिंटर सेटिंग्स](/settings/printer) पर जाएं।\n` +
      `• यहाँ आप चुन सकते हैं:\n` +
      `  ↳ **3-इंच / 2-इंच POS थर्मल प्रिंटर:** छोटी पर्ची निकालने के लिए (ब्लूटूथ / USB)\n` +
      `  ↳ **A4 स्टैंडर्ड इनवॉइस:** फुल साइज कलर या ब्लैक & व्हाइट PDF बिल\n` +
      `• बिल पर अपनी दुकान का लोगो, बैंक डिटेल्स और UPI QR कोड भी यहीं से सेट होते हैं!`;
  }

  // 12. Staff Management (स्टाफ व कर्मचारी)
  if (q.includes('staff') || q.includes('employee') || q.includes('karmchari') || q.includes('permission')) {
    return `नमस्ते ${name}! 👥 **स्टाफ व कर्मचारी प्रबंधन:**\n\n` +
      `• [👉 स्टाफ प्रबंधन (Staff)](/staff) पर जाएं।\n` +
      `• आप अपने बिलिंग ऑपरेटर, कैशियर या अकाउंटेंट को अलग लॉगिन दे सकते हैं।\n` +
      `• स्टाफ केवल वही देख पाएगा जिसकी आपने अनुमति दी है (जैसे केवल बिल बनाना, स्टॉक न बदलना)। आपकी व्यावसायिक गोपनीयता 100% सुरक्षित रहेगी!`;
  }

  // 13. Help Center & Knowledge Hub
  if (q.includes('help') || q.includes('knowledge') || q.includes('tutorial') || q.includes('मदद') || q.includes('सिखाओ')) {
    return `नमस्ते ${name}! 📚 **पक्का चिट्ठा सहायता केंद्र (Knowledge Hub):**\n\n` +
      `• [👉 नॉलेज हब होम](/knowledge): सभी गाइड्स, आर्टिकल्स और वीडियो ट्यूटोरियल्स।\n` +
      `• [👉 अक्सर पूछे जाने वाले सवाल (FAQs)](/knowledge/questions): व्यापार और टैक्स से जुड़े सामान्य प्रश्न।\n` +
      `• या फिर आप मुझसे (पक्कू से) यहाँ चैट में सीधे कोई भी सवाल पूछ सकते हैं — मैं 24/7 तैयार हूँ! 😊`;
  }

  return null;
}

/**
 * Searches the Knowledge Hub in the database for relevant published answers
 */
async function searchKnowledgeHub(query: string, name: string): Promise<string | null> {
  try {
    const results = await globalKnowledgeSearch({ query, limit: 3 });

    // 1. Check questions first
    if (results.questions && results.questions.length > 0) {
      const topQ = results.questions[0];
      const answer = topQ.shortAnswerHi || topQ.shortAnswerEn;
      const title = topQ.titleHi || topQ.titleEn;

      if (answer && answer.trim().length > 10) {
        return `नमस्ते ${name}! 📖 आपके सवाल **"${title}"** के संदर्भ में नॉलेज हब से जानकारी:\n\n` +
          `${answer.trim()}\n\n` +
          `विस्तृत जानकारी के लिए नॉलेज हब देखें: [👉 सवाल का पूरा उत्तर पढ़ें](/knowledge/questions/${topQ.slug})`;
      }
    }

    // 2. Check articles
    if (results.articles && results.articles.length > 0) {
      const topA = results.articles[0];
      const excerpt = topA.summaryHi || topA.summaryEn || topA.contentHi?.substring(0, 200) || topA.contentEn?.substring(0, 200);
      const title = topA.titleHi || topA.titleEn;

      if (excerpt && excerpt.trim().length > 10) {
        return `नमस्ते ${name}! 📚 **${title}**:\n\n` +
          `${excerpt.trim()}...\n\n` +
          `पूरा आर्टिकल पढ़ने के लिए यहाँ क्लिक करें: [👉 ${title} पढ़ें](/knowledge/articles/${topA.slug})`;
      }
    }
  } catch (err) {
    console.warn('[Pakku Brain] Knowledge Hub search error:', err);
  }

  return null;
}

/**
 * Builds the comprehensive prompt for frontier LLM (Gemini/OpenAI) with client context
 */
export function buildPakkuSystemPrompt(
  pattern: ClientPatternProfile,
  memory: PakkuLearnedMemory
): string {
  const learnedFactsStr = memory.learnedFacts.length > 0
    ? memory.learnedFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')
    : 'None yet.';

  return `
You are "Pakku" (पक्कू), the beloved, highly intelligent AI Mascot and Senior Business Advisor ("मुनीम जी" + Partner) of Pakka Chittha.
You talk like a real, experienced, warm, trustworthy Indian commercial advisor — never robotic, never using disclaimers like "As an AI model...".

Client Profile (Live Data):
- Name: ${memory.preferredName || pattern.userName}
- Role: ${pattern.userRole}
- Business: ${pattern.businessName || 'Vyapar Kendra'} (GSTIN: ${pattern.businessGstin || 'Unregistered / Composite'})
- Business Type: ${pattern.businessType}
- Today Sales: ₹${pattern.todaySales.toLocaleString('en-IN')} (${pattern.todayInvoiceCount} bills)
- Month Sales: ₹${pattern.monthSales.toLocaleString('en-IN')}
- Outstanding Receivables (Udhaar): ₹${pattern.totalReceivables.toLocaleString('en-IN')} (${pattern.debtorCount} debtors)
- Payables to Suppliers: ₹${pattern.totalPayables.toLocaleString('en-IN')}
- Low Stock Items (${pattern.lowStockCount}): ${pattern.lowStockItems.join(', ') || 'All stock healthy'}
${pattern.hasHousehold ? `- Household: ${pattern.householdName}, Budget: ₹${pattern.monthlyBudget}, Spent: ₹${pattern.monthExpenses}, Left: ₹${pattern.budgetRemaining}` : ''}

Your Current Upgrade Level: Level ${memory.upgradeLevel} - ${memory.levelTitle}
Facts you have learned about this client over time:
${learnedFactsStr}

Pakka Chittha Page Links (Always provide exact markdown links when relevant):
- Create Quotation / Estimate: [👉 नया कोटेशन बनाएं](/quotations/new)
- View Quotations: [कोटेशन सूची](/quotations)
- Create GST Invoice: [👉 नया बिल बनाएं](/invoices/new)
- View Invoices: [सभी बिल देखें](/invoices)
- Smart Voice Billing: [🎙️ Smart Voice Entry] (Click top mic or Ctrl+K)
- Customer Udhaar Ledger: [ग्राहक सूची](/customers)
- Supplier & Purchase: [सप्लायर सूची](/suppliers) | [खरीद दर्ज करें](/purchases/new) | [बिल स्कैन करें](/purchases/scan)
- Inventory / Stock: [इन्वेंट्री स्टॉक](/inventory)
- Ghar Kharcha (Household Budget): [घर खर्चा डैशबोर्ड](/ghar-kharcha) | [खर्चा रजिस्टर](/ghar-kharcha/transactions)
- Tax & Financial Reports: [फाइनेंशियल रिपोर्ट्स](/reports)
- Security PIN Settings: [सेटिंग्स](/settings)
- Printer Settings: [प्रिंटर सेटिंग्स](/settings/printer)

Persona & Tone Rules:
1. Speak in warm, conversational, sharp Indian business tone. Address user respectfully as "${memory.preferredName}".
2. Directly answer what the user asked! If user asks about quotation, answer about quotation! If about purchase, answer about purchase! Never provide irrelevant links.
3. If the user asks in Hindi or Hinglish, answer in fluent, natural Hindi/Hinglish. If in English, answer in English.
4. Keep answers practical, actionable, and under 150 words.
`;
}

/**
 * Master High-IQ Autonomous Human-Brain Engine
 * Combines Math, Live Pattern, Exhaustive Platform Knowledge, and Knowledge Hub Search.
 */
export async function getAutonomousHumanAnswer(
  query: string,
  pattern: ClientPatternProfile,
  memory: PakkuLearnedMemory
): Promise<PakkuResponse> {
  const q = query.toLowerCase().trim();
  const name = memory.preferredName || pattern.userName.split(' ')[0] + ' जी';

  // 1. Math solver (e.g. 50000 ka 18% gst)
  const mathAnswer = solveNaturalMath(query);
  if (mathAnswer) {
    return { reply: mathAnswer, source: 'math_engine' };
  }

  // 2. Client Live Business & Household Pattern (e.g. aaj ka sale, udhaar kitna hai, stock)
  const patternAnswer = answerFromClientPattern(query, pattern, memory);
  if (patternAnswer) {
    return { reply: patternAnswer, source: 'live_data' };
  }

  // 3. Exhaustive Platform Feature Engine (Quotations, Invoices, Purchases, Voice, Printers, etc.)
  const featureAnswer = answerPlatformFeature(query, name);
  if (featureAnswer) {
    return { reply: featureAnswer, source: 'pakku_human_brain' };
  }

  // 4. Live Knowledge Hub Search in Database (Articles & FAQs)
  const khAnswer = await searchKnowledgeHub(query, name);
  if (khAnswer) {
    return { reply: khAnswer, source: 'knowledge_hub' };
  }

  // 5. GST Rules & Regulations
  if (q.includes('gst rate') || q.includes('gst slab') || q.includes('kitna gst')) {
    return {
      reply: `नमस्ते ${name}! भारत में GST के 4 मुख्य स्लैब हैं:\n\n` +
        `• **0% (छूट):** अनाज, ताज़ा फल, सब्जियां, दूध, अनब्रांडेड आटा/चावल।\n` +
        `• **5%:** पैकेज्ड फूड, जीवनरक्षक दवाएं, चाय/कॉफी, परिधान (<₹1000)।\n` +
        `• **12%:** प्रोसेस्ड फूड, मेडिकल उपकरण, परिधान (>₹1000)।\n` +
        `• **18%:** अधिकांश इलेक्ट्रॉनिक्स, साबुन, सॉफ्टवेयर, कैपिटल गुड्स व व्यावसायिक सेवाएं।\n` +
        `• **28%:** लग्जरी कारें, वातानुकूलित सामान, सीमेंट, तंबाकू।\n\n` +
        `💡 नया इनवॉइस बनाते समय आप प्रत्येक आइटम पर उपयुक्त GST दर [👉 नया बिल बनाएं](/invoices/new) में चुन सकते हैं!`,
      source: 'pakku_human_brain',
    };
  }

  if (q.includes('e-way bill') || q.includes('eway bill') || q.includes('eway')) {
    return {
      reply: `नमस्ते ${name}! 🚛 **E-Way Bill (ई-वे बिल) के मुख्य नियम:**\n\n` +
        `1. जब भी ₹50,000 (कुछ राज्यों में अंतर-राज्य ₹1,00,000) से अधिक मूल्य का माल 10 किमी से अधिक दूरी पर भेजा जाता है, तो ई-वे बिल अनिवार्य होता है।\n` +
        `2. इसके लिए GST इनवॉइस नंबर, वाहन नंबर (Vehicle No) और ट्रांसपोर्टर ID आवश्यक होती है।\n` +
        `3. पक्का चिट्ठा में आप बिल बनाते समय ट्रांसपोर्ट विवरण भरकर तुरंत इनवॉइस निकाल सकते हैं: [👉 बिल देखें](/invoices)।`,
      source: 'pakku_human_brain',
    };
  }

  if (q.includes('composition scheme') || q.includes('composite')) {
    return {
      reply: `नमस्ते ${name}! **GST कंपोजिशन स्कीम (Composition Scheme):**\n\n` +
        `• ₹1.5 करोड़ तक टर्नओवर वाले छोटे व्यापारी/दुकानदार इसे चुन सकते हैं (रेस्टोरेंट के लिए ₹1.5 करोड़, सर्विस प्रोवाइडर्स के लिए ₹50 लाख)।\n` +
        `• **टैक्स दरें:** व्यापारी 1% (0.5% CGST + 0.5% SGST), रेस्टोरेंट 5%, सर्विस 6%।\n` +
        `• इसमें ग्राहकों से टैक्स नहीं वसूला जाता और इनपुट टैक्स क्रेडिट (ITC) नहीं मिलता। तिमाही टैक्स चालान (CMP-08) भरा जाता है।\n\n` +
        `पक्का चिट्ठा कंपोजिशन व रेगुलर दोनों व्यापारियों के लिए अनुकूलित है!`,
      source: 'pakku_human_brain',
    };
  }

  // 6. Who is Pakku?
  if (q.includes('who are you') || q.includes('kaun ho') || q.includes('tum kaun') || q.includes('aap kaun') || q.includes('pakku kaun')) {
    return {
      reply: `नमस्ते ${name}! 😊 मैं **पक्कू (Pakku)** हूँ — पक्का चिट्ठा का आपका निजी AI बिजनेस पार्टनर व मुनीम जी!\n\n` +
        `मैं बिलिंग, कोटेशन, खरीद, उधारी खाता, स्टॉक, घर खर्चा और किसी भी व्यापारिक समस्या में आपकी तुरंत मदद के लिए 24/7 हाजिर हूँ। आप मुझसे वेबसाइट या अपने कारोबार से जुड़ा कोई भी सवाल बेझिझक पूछ सकते हैं!`,
      source: 'pakku_human_brain',
    };
  }

  // 7. Relatable, genuine fallback tailored to the question
  return {
    reply: `नमस्ते ${name}! 😊 आपके सवाल **"${query}"** के बारे में:\n\n` +
      `मैं पक्का चिट्ठा में आपके व्यापार और हिसाब को आसान बनाने के लिए हमेशा उपस्थित हूँ।\n\n` +
      `आप मुझसे निम्न में से कुछ भी पूछ सकते हैं:\n` +
      `• **बिल या कोटेशन बनाना:** [👉 नया बिल बनाएं](/invoices/new) | [👉 नया कोटेशन](/quotations/new)\n` +
      `• **खरीद व सप्लायर:** [👉 खरीद दर्ज करें](/purchases/new) | [👉 बिल स्कैन करें](/purchases/scan)\n` +
      `• **उधारी व ग्राहक:** [👉 ग्राहक सूची](/customers)\n` +
      `• **स्टॉक व सामान:** [👉 इन्वेंट्री](/inventory)\n` +
      `• **घर खर्चा व पारिवारिक बजट:** [👉 घर खर्चा](/ghar-kharcha)\n\n` +
      `यदि आपका कोई विशेष सवाल, दर, हिसाब या परेशानी है, तो सीधे विस्तार से पूछिए — मैं तुरंत हल बताऊँगा!`,
    source: 'pakku_human_brain',
  };
}
