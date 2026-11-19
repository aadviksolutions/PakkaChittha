import { ClientPatternProfile } from './pakkuPatternAnalyzer';
import { PakkuLearnedMemory } from './pakkuMemory';

export interface PakkuResponse {
  reply: string;
  source: 'live_data' | 'math_engine' | 'gemini_ai' | 'openai_ai' | 'pakku_human_brain';
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
 * Answers questions about the client's own business or household data
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
    q.includes('udhaar') || q.includes('udhari') || q.includes('baki paisa') ||
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
- Create GST Invoice: [नया बिल बनाएं](/invoices/new)
- View Invoices: [सभी बिल देखें](/invoices)
- Smart Voice Billing: [🎙️ Smart Voice Entry] (Click top mic or Ctrl+K)
- Customer Udhaar Ledger: [ग्राहक सूची](/customers)
- Supplier & Purchase: [सप्लायर सूची](/suppliers) | [खरीद दर्ज करें](/purchases/new)
- Inventory / Stock: [इन्वेंट्री स्टॉक](/inventory)
- Ghar Kharcha (Household Budget): [घर खर्चा डैशबोर्ड](/ghar-kharcha) | [खर्चा रजिस्टर](/ghar-kharcha/transactions)
- Tax & Financial Reports: [फाइनेंशियल रिपोर्ट्स](/reports)
- Security PIN Settings: [सेटिंग्स](/settings)

Persona & Tone Rules:
1. Speak in warm, conversational, sharp Indian business tone. Use respectful address like "${memory.preferredName}".
2. You can answer ANY topic accurately: Pakka Chittha features, GST rules, commercial negotiations, retail growth, inventory rotation, debt recovery, household budgeting, math calculations, science, life, or general queries.
3. If the user asks in Hindi or Hinglish, answer in fluent, respectful Hindi/Hinglish. If in English, answer in English.
4. If the user tells you to remember something ("याद रखना", "नोट कर लो"), confirm enthusiastically that you have committed it to memory.
5. Keep answers practical, actionable, and under 150 words unless detail is requested.
`;
}

/**
 * High-IQ Autonomous Human-Brain Engine when no external LLM key is configured
 * Covers broad general knowledge, GST rules, business advice, and platform features.
 */
export function getAutonomousHumanAnswer(
  query: string,
  pattern: ClientPatternProfile,
  memory: PakkuLearnedMemory
): PakkuResponse {
  const q = query.toLowerCase().trim();
  const name = memory.preferredName || pattern.userName.split(' ')[0] + ' जी';

  // 1. Math solver
  const mathAnswer = solveNaturalMath(query);
  if (mathAnswer) {
    return { reply: mathAnswer, source: 'math_engine' };
  }

  // 2. Client Pattern & Live Data
  const patternAnswer = answerFromClientPattern(query, pattern, memory);
  if (patternAnswer) {
    return { reply: patternAnswer, source: 'live_data' };
  }

  // 3. GST & Tax Knowledge
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

  // 4. Retail & Business Growth Advice
  if (
    q.includes('udhaar kaise recover') || q.includes('paisa kaise nikale') ||
    q.includes('udhari recovery') || q.includes('recovery tips')
  ) {
    return {
      reply: `अरे ${name}, उधारी रिकवर करने के ये 4 आज़माए हुए प्रैक्टिकल तरीके अपनाइए:\n\n` +
        `1. **नियमित जेंटल रिमाइंडर:** उधार देने के 15वें दिन और 25वें दिन पक्का चिट्ठा से [ग्राहक सूची](/customers) में जाकर 1-क्लिक व्हाट्सएप पर UPI QR लिंक भेजें।\n` +
        `2. **नकद छूट (Cash Discount):** ग्राहकों को बोलें कि समय पर भुगतान करने पर 2% की नकद छूट मिलेगी। यह बहुत असरदार है!\n` +
        `3. **किस्त का विकल्प:** बड़ा बकाया होने पर एक साथ मांगने के बजाय छोटी साप्ताहिक किस्तों में भुगतान लें।\n` +
        `4. **क्रेडिट लिमिट तय करें:** जब तक पुराना हिसाब 50% चुकता न हो, नया माल उधार न दें।`,
      source: 'pakku_human_brain',
    };
  }

  if (q.includes('batao') || q.includes('help') || q.includes('kya kar sakte ho') || q.includes('features')) {
    return {
      reply: `नमस्ते ${name}! 🙏 मैं आपका अपना **पक्कू (Pakku)** हूँ — पक्का चिट्ठा का AI बिजनेस पार्टनर!\n\n` +
        `मैं इन सभी कामों में आपकी तुरंत सहायता कर सकता हूँ:\n` +
        `• **लाइव दुकान हिसाब:** आज की बिक्री, कुल उधारी, स्टॉक की स्थिति बताना\n` +
        `• **बोलकर बिलिंग:** ऊपर मौजूद [🎙️ Smart Voice Entry] से 2 सेकंड में इनवॉइस बनाना\n` +
        `• **उधारी व तकादा:** [ग्राहक सूची](/customers) से व्हाट्सएप रिमाइंडर व क्यूआर भेजना\n` +
        `• **घर खर्चा व बजट:** [घर खर्चा डैशबोर्ड](/ghar-kharcha) से पारिवारिक बचत ट्रैक करना\n` +
        `• **गणित व टैक्स:** किसी भी राशि का GST निकालना, मार्जिन गणना या बिज़नेस सलाह देना!\n\n` +
        `आप मुझसे जो चाहें बेझिझक पूछिए!`,
      source: 'pakku_human_brain',
    };
  }

  // 5. Default intelligent conversational response
  return {
    reply: `नमस्ते ${name}! 😊 आपके सवाल **"${query}"** के बारे में:\n\n` +
      `मैं पक्का चिट्ठा का आपका साथी हूँ। यदि यह बिलिंग, उधारी, स्टॉक या घर खर्चा से जुड़ा है:\n` +
      `• नया बिल बनाने के लिए: [👉 नया बिल बनाएं](/invoices/new)\n` +
      `• ग्राहकों का हिसाब देखने के लिए: [👉 ग्राहक सूची](/customers)\n` +
      `• घर के खर्चे के लिए: [👉 घर खर्चा](/ghar-kharcha)\n` +
      `• टैक्स व CA ऑडिट के लिए: [👉 फाइनेंशियल रिपोर्ट्स](/reports)\n\n` +
      `यदि आपका कोई विशेष सवाल या हिसाब है, तो सीधे पूछें — मैं तुरंत हल कर दूँगा!`,
    source: 'pakku_human_brain',
  };
}
