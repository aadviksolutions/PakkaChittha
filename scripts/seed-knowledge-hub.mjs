import { PrismaClient, KhStatus, KhLanguage } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES_DATA = [
  {
    slug: 'domestic-home-knowledge',
    nameEn: 'Domestic & Home Knowledge',
    nameHi: 'घरेलू एवं गृह प्रबंधन',
    descriptionEn: 'Smart domestic management, monthly household budgets, utility savings, and kitchen organization.',
    descriptionHi: 'स्मार्ट गृह प्रबंधन, मासिक घरेलू बजट, बिजली-पानी बचत और रसोई प्रबंधन।',
    icon: 'Home',
    displayOrder: 1,
    subcategories: [
      { slug: 'home-management', nameEn: 'Home Management', nameHi: 'गृह प्रबंधन' },
      { slug: 'household-budget', nameEn: 'Household Budget', nameHi: 'घरेलू बजट' },
      { slug: 'kitchen-food', nameEn: 'Kitchen & Food', nameHi: 'रसोई और खाद्य' },
      { slug: 'electricity-utilities', nameEn: 'Electricity & Utilities', nameHi: 'बिजली एवं जनोपयोगी सेवाएं' },
      { slug: 'home-appliances', nameEn: 'Home Appliances', nameHi: 'घरेलू उपकरण' },
      { slug: 'home-savings', nameEn: 'Home Savings', nameHi: 'घरेलू बचत' },
    ],
  },
  {
    slug: 'personal-finance-banking',
    nameEn: 'Personal Finance & Banking',
    nameHi: 'व्यक्तिगत वित्त एवं बैंकिंग',
    descriptionEn: 'Practical guidance on savings, bank accounts, FD/RD, loans, credit scores, and insurance.',
    descriptionHi: 'बचत, बैंक खाते, एफडी/आरडी, ऋण, सिबिल स्कोर और बीमा पर व्यावहारिक मार्गदर्शन।',
    icon: 'Landmark',
    displayOrder: 2,
    subcategories: [
      { slug: 'savings', nameEn: 'Savings', nameHi: 'बचत' },
      { slug: 'banking', nameEn: 'Banking', nameHi: 'बैंकिंग' },
      { slug: 'fixed-deposits', nameEn: 'Fixed Deposits (FD)', nameHi: 'सावधि जमा (FD)' },
      { slug: 'recurring-deposits', nameEn: 'Recurring Deposits (RD)', nameHi: 'आवर्ती जमा (RD)' },
      { slug: 'loans-emi', nameEn: 'Loans & EMI', nameHi: 'लोन और ईएमआई' },
      { slug: 'credit-score', nameEn: 'Credit Score', nameHi: 'क्रेडिट/सिबिल स्कोर' },
      { slug: 'digital-payments', nameEn: 'Digital Payments', nameHi: 'डिजिटल भुगतान' },
      { slug: 'insurance', nameEn: 'Insurance', nameHi: 'बीमा सुरक्षा' },
    ],
  },
  {
    slug: 'small-business-shop',
    nameEn: 'Small Business & Shop',
    nameHi: 'छोटा व्यवसाय एवं दुकान प्रबंधन',
    descriptionEn: 'Daily store operations, customer credit ledger (Udhaari), inventory tracking, and profitability.',
    descriptionHi: 'दुकान का दैनिक संचालन, उधारी बहीखाता, स्टॉक ट्रैकिंग और मुनाफा प्रबंधन।',
    icon: 'Store',
    displayOrder: 3,
    subcategories: [
      { slug: 'retail-business', nameEn: 'Retail Business', nameHi: 'खुदरा व्यापार' },
      { slug: 'shop-management', nameEn: 'Shop Management', nameHi: 'दुकान प्रबंधन' },
      { slug: 'billing-invoicing', nameEn: 'Billing & Invoicing', nameHi: 'बिलिंग एवं चालान' },
      { slug: 'inventory', nameEn: 'Inventory & Stock', nameHi: 'स्टॉक एवं इन्वेंट्री' },
      { slug: 'customer-management', nameEn: 'Customer Management', nameHi: 'ग्राहक संबंध' },
      { slug: 'credit-udhaari', nameEn: 'Credit & Udhaari', nameHi: 'उधारी एवं तकादा' },
      { slug: 'profit-loss', nameEn: 'Profit & Loss', nameHi: 'लाभ-हानि' },
    ],
  },
  {
    slug: 'business-entrepreneurship',
    nameEn: 'Business & Entrepreneurship',
    nameHi: 'व्यापार एवं उद्यमिता',
    descriptionEn: 'Starting new ventures, business registration, branding, growth strategies, and partnerships.',
    descriptionHi: 'नया व्यापार शुरू करना, पंजीकरण, ब्रांडिंग, विकास रणनीतियां और साझेदारी।',
    icon: 'TrendingUp',
    displayOrder: 4,
    subcategories: [
      { slug: 'startup-guide', nameEn: 'Startup Guide', nameHi: 'स्टार्टअप गाइड' },
      { slug: 'business-planning', nameEn: 'Business Planning', nameHi: 'बिजनेस प्लानिंग' },
      { slug: 'business-registration', nameEn: 'Business Registration', nameHi: 'व्यापार पंजीकरण' },
      { slug: 'marketing-branding', nameEn: 'Marketing & Branding', nameHi: 'मार्केटिंग और ब्रांडिंग' },
      { slug: 'partnership', nameEn: 'Partnership', nameHi: 'साझेदारी' },
      { slug: 'business-expansion', nameEn: 'Business Expansion', nameHi: 'व्यापार विस्तार' },
    ],
  },
  {
    slug: 'accounting-gst-taxation',
    nameEn: 'Accounting, GST & Taxation',
    nameHi: 'लेखांकन, जीएसटी एवं टैक्स',
    descriptionEn: 'Fundamentals of double-entry bookkeeping, GST return compliance, input tax credit, and ITR.',
    descriptionHi: 'बहीखाता सिद्धांत, डेबिट-क्रेडिट, जीएसटी रिटर्न, इनपुट टैक्स क्रेडिट और आयकर।',
    icon: 'Calculator',
    displayOrder: 5,
    subcategories: [
      { slug: 'basic-accounting', nameEn: 'Basic Accounting', nameHi: 'बुनियादी लेखांकन' },
      { slug: 'debit-credit', nameEn: 'Debit & Credit', nameHi: 'डेबिट और क्रेडिट' },
      { slug: 'ledger-trial-balance', nameEn: 'Ledger & Trial Balance', nameHi: 'खाताबही एवं तलपट' },
      { slug: 'balance-sheet', nameEn: 'Balance Sheet', nameHi: 'तुलन पत्र (बैलेंस शीट)' },
      { slug: 'gst-registration', nameEn: 'GST Registration', nameHi: 'जीएसटी पंजीकरण' },
      { slug: 'gst-returns', nameEn: 'GST Returns (GSTR-1, 3B)', nameHi: 'जीएसटी रिटर्न' },
      { slug: 'input-tax-credit', nameEn: 'Input Tax Credit (ITC)', nameHi: 'आईटीसी (ITC)' },
      { slug: 'income-tax-itr', nameEn: 'Income Tax & ITR', nameHi: 'आयकर एवं आईटीआर' },
    ],
  },
  {
    slug: 'commercial-industrial-knowledge',
    nameEn: 'Commercial & Industrial Knowledge',
    nameHi: 'व्यावसायिक एवं औद्योगिक ज्ञान',
    descriptionEn: 'Manufacturing workflows, wholesale trading, supply chain management, and warehousing.',
    descriptionHi: 'उत्पादन प्रक्रियाएं, थोक व्यापार, आपूर्ति श्रृंखला और गोदाम प्रबंधन।',
    icon: 'Factory',
    displayOrder: 6,
    subcategories: [
      { slug: 'manufacturing', nameEn: 'Manufacturing', nameHi: 'विनिर्माण' },
      { slug: 'wholesale-trading', nameEn: 'Wholesale Trading', nameHi: 'थोक व्यापार' },
      { slug: 'supply-chain', nameEn: 'Supply Chain', nameHi: 'सप्लाई चेन' },
      { slug: 'warehousing', nameEn: 'Warehousing', nameHi: 'गोदाम प्रबंधन' },
      { slug: 'procurement', nameEn: 'Procurement', nameHi: 'खरीददारी प्रबंधन' },
    ],
  },
  {
    slug: 'education-career',
    nameEn: 'Education & Career',
    nameHi: 'शिक्षा एवं करियर मार्गदर्शन',
    descriptionEn: 'Higher studies, scholarships, interview preparation, competitive exams, and job skills.',
    descriptionHi: 'उच्च शिक्षा, छात्रवृत्तियां, साक्षात्कार तैयारी, प्रतियोगी परीक्षाएं और नौकरी कौशल।',
    icon: 'GraduationCap',
    displayOrder: 7,
    subcategories: [
      { slug: 'school-education', nameEn: 'School Education', nameHi: 'स्कूली शिक्षा' },
      { slug: 'higher-education', nameEn: 'Higher Education', nameHi: 'उच्च शिक्षा' },
      { slug: 'scholarships', nameEn: 'Scholarships', nameHi: 'छात्रवृत्तियां' },
      { slug: 'career-guidance', nameEn: 'Career Guidance', nameHi: 'करियर मार्गदर्शन' },
      { slug: 'job-preparation', nameEn: 'Job Preparation', nameHi: 'नौकरी तैयारी' },
    ],
  },
  {
    slug: 'health-hygiene-awareness',
    nameEn: 'Health & Hygiene Awareness',
    nameHi: 'स्वास्थ्य एवं स्वच्छता जागरूकता',
    descriptionEn: 'Daily nutrition, hygiene practices, first aid essentials, and preventive healthcare awareness.',
    descriptionHi: 'दैनिक पोषण, स्वच्छता की आदतें, प्राथमिक चिकित्सा और निवारक स्वास्थ्य देखभाल।',
    icon: 'HeartPulse',
    displayOrder: 8,
    subcategories: [
      { slug: 'general-health', nameEn: 'General Health Awareness', nameHi: 'सामान्य स्वास्थ्य' },
      { slug: 'nutrition', nameEn: 'Nutrition & Diet', nameHi: 'पोषण एवं आहार' },
      { slug: 'hygiene', nameEn: 'Hygiene & Cleanliness', nameHi: 'स्वच्छता' },
      { slug: 'first-aid', nameEn: 'First Aid Essentials', nameHi: 'प्राथमिक चिकित्सा' },
      { slug: 'food-safety', nameEn: 'Food Safety', nameHi: 'खाद्य सुरक्षा' },
    ],
  },
  {
    slug: 'government-schemes-public-services',
    nameEn: 'Government Schemes & Public Services',
    nameHi: 'सरकारी योजनाएं एवं जनसेवाएं',
    descriptionEn: 'Central and state welfare schemes, pensions, subsidies, citizen services, and digital documents.',
    descriptionHi: 'केंद्र व राज्य सरकार की कल्याणकारी योजनाएं, पेंशन, सब्सिडी और डिजिटल सरकारी सेवाएं।',
    icon: 'Building2',
    displayOrder: 9,
    subcategories: [
      { slug: 'central-schemes', nameEn: 'Central Government Schemes', nameHi: 'केंद्रीय योजनाएं' },
      { slug: 'state-schemes', nameEn: 'State Government Schemes', nameHi: 'राज्य योजनाएं' },
      { slug: 'banking-schemes', nameEn: 'Banking & Mudra Schemes', nameHi: 'बैंकिंग एवं मुद्रा योजना' },
      { slug: 'pension-schemes', nameEn: 'Pension & Social Security', nameHi: 'पेंशन एवं सामाजिक सुरक्षा' },
      { slug: 'citizen-services', nameEn: 'Citizen Documents & Services', nameHi: 'नागरिक दस्तावेज व सेवाएं' },
    ],
  },
  {
    slug: 'legal-awareness',
    nameEn: 'Legal Awareness & Rights',
    nameHi: 'कानूनी जागरूकता एवं अधिकार',
    descriptionEn: 'Consumer rights, rental agreements, basic contract terms, labour laws, and cyber law awareness.',
    descriptionHi: 'उपभोक्ता अधिकार, किरायानामा, अनुबंध के मूल नियम, श्रम कानून और साइबर सुरक्षा कानून।',
    icon: 'Scale',
    displayOrder: 10,
    subcategories: [
      { slug: 'consumer-rights', nameEn: 'Consumer Rights', nameHi: 'उपभोक्ता अधिकार' },
      { slug: 'business-laws', nameEn: 'Business Laws', nameHi: 'व्यापारिक कानून' },
      { slug: 'rental-agreements', nameEn: 'Rental & Lease Agreements', nameHi: 'किराया अनुबंध' },
      { slug: 'cyber-laws', nameEn: 'Cyber Laws & Safety', nameHi: 'साइबर कानून' },
      { slug: 'general-legal-rights', nameEn: 'General Legal Rights', nameHi: 'सामान्य कानूनी अधिकार' },
    ],
  },
  {
    slug: 'technology-digital-awareness',
    nameEn: 'Technology & Digital Awareness',
    nameHi: 'तकनीक एवं डिजिटल जागरूकता',
    descriptionEn: 'Smartphones, internet safety, UPI security, artificial intelligence, and preventing online fraud.',
    descriptionHi: 'स्मार्टफोन, इंटरनेट सुरक्षा, यूपीआई सुरक्षा, एआई तकनीक और ऑनलाइन फ्रॉड से बचाव।',
    icon: 'Cpu',
    displayOrder: 11,
    subcategories: [
      { slug: 'internet-basics', nameEn: 'Internet Basics', nameHi: 'इंटरनेट की समझ' },
      { slug: 'cyber-security', nameEn: 'Cyber Security', nameHi: 'साइबर सुरक्षा' },
      { slug: 'online-fraud-safety', nameEn: 'Online Fraud Prevention', nameHi: 'ऑनलाइन धोखाधड़ी से बचाव' },
      { slug: 'ai-awareness', nameEn: 'Artificial Intelligence', nameHi: 'आर्टिफिशियल इंटेलिजेंस (AI)' },
      { slug: 'digital-tools', nameEn: 'Productivity & Digital Tools', nameHi: 'डिजिटल टूल्स' },
    ],
  },
  {
    slug: 'agriculture-rural-development',
    nameEn: 'Agriculture & Rural Development',
    nameHi: 'कृषि एवं ग्रामीण विकास',
    descriptionEn: 'Modern farming techniques, soil health, crop management, Kisan schemes, and dairy business.',
    descriptionHi: 'आधुनिक खेती, उन्नत बीज, सिंचाई तकनीक, किसान योजनाएं और डेयरी व्यवसाय।',
    icon: 'Sprout',
    displayOrder: 12,
    subcategories: [
      { slug: 'farming-practices', nameEn: 'Farming Practices', nameHi: 'उन्नत खेती' },
      { slug: 'seeds-fertilizers', nameEn: 'Seeds & Fertilizers', nameHi: 'बीज एवं उर्वरक' },
      { slug: 'kisan-schemes', nameEn: 'Kisan Schemes & Subsidies', nameHi: 'किसान योजनाएं' },
      { slug: 'dairy-animal-husbandry', nameEn: 'Dairy & Animal Husbandry', nameHi: 'डेयरी एवं पशुपालन' },
      { slug: 'rural-business', nameEn: 'Rural Business Ideas', nameHi: 'ग्रामीण उद्योग' },
    ],
  },
  {
    slug: 'hospitality-service-industry',
    nameEn: 'Hospitality & Service Industry',
    nameHi: 'आतिथ्य एवं सेवा उद्योग',
    descriptionEn: 'Running restaurants, cafes, food stalls, guest service standards, and staff management.',
    descriptionHi: 'रेस्टोरेंट, कैफे, खानपान व्यवसाय, ग्राहक सेवा मानक और स्टाफ प्रबंधन।',
    icon: 'Coffee',
    displayOrder: 13,
    subcategories: [
      { slug: 'restaurant-cafe', nameEn: 'Restaurant & Cafe Business', nameHi: 'रेस्टोरेंट एवं कैफे' },
      { slug: 'food-hygiene-standards', nameEn: 'Food Hygiene Standards', nameHi: 'खाद्य स्वच्छता मानक' },
      { slug: 'customer-service-excellence', nameEn: 'Customer Service Excellence', nameHi: 'उत्कृष्ट ग्राहक सेवा' },
      { slug: 'staff-management', nameEn: 'Staff Management', nameHi: 'स्टाफ प्रबंधन' },
    ],
  },
  {
    slug: 'environment-social-awareness',
    nameEn: 'Environment & Social Awareness',
    nameHi: 'पर्यावरण एवं सामाजिक जागरूकता',
    descriptionEn: 'Water conservation, plastic waste reduction, solar energy, and community civic responsibilities.',
    descriptionHi: 'जल संरक्षण, प्लास्टिक मुक्ति, सौर ऊर्जा और सामुदायिक सामाजिक उत्तरदायित्व।',
    icon: 'Leaf',
    displayOrder: 14,
    subcategories: [
      { slug: 'water-conservation', nameEn: 'Water Conservation', nameHi: 'जल संरक्षण' },
      { slug: 'waste-management', nameEn: 'Waste Management', nameHi: 'कचरा प्रबंधन' },
      { slug: 'solar-energy', nameEn: 'Solar & Renewable Energy', nameHi: 'सौर ऊर्जा' },
      { slug: 'social-responsibility', nameEn: 'Social Responsibility', nameHi: 'सामाजिक उत्तरदायित्व' },
    ],
  },
  {
    slug: 'general-knowledge-lifestyle',
    nameEn: 'General Knowledge & Lifestyle',
    nameHi: 'सामान्य ज्ञान एवं जीवन कौशल',
    descriptionEn: 'Everyday life skills, important public awareness facts, and practical decision-making.',
    descriptionHi: 'दैनिक जीवन के व्यावहारिक कौशल, सामान्य जागरूकता तथ्य और निर्णय क्षमता।',
    icon: 'Lightbulb',
    displayOrder: 15,
    subcategories: [
      { slug: 'daily-knowledge', nameEn: 'Daily Knowledge Facts', nameHi: 'रोजमर्रा का ज्ञान' },
      { slug: 'life-skills', nameEn: 'Practical Life Skills', nameHi: 'जीवन कौशल' },
      { slug: 'important-days', nameEn: 'Important Days & Events', nameHi: 'महत्वपूर्ण दिवस' },
    ],
  },
];

const SAMPLE_QUESTIONS = [
  {
    categorySlug: 'accounting-gst-taxation',
    subcategorySlug: 'gst-registration',
    slug: 'what-is-gst',
    titleEn: 'What is GST (Goods and Services Tax)?',
    titleHi: 'जीएसटी (GST) क्या है और यह कैसे काम करता है?',
    shortAnswerEn: 'GST (Goods and Services Tax) is a single, comprehensive indirect tax levied on the manufacture, sale, and consumption of goods and services throughout India, replacing multiple earlier taxes like VAT, Service Tax, and Excise Duty.',
    shortAnswerHi: 'जीएसटी (वस्तु एवं सेवा कर) भारत में वस्तुओं और सेवाओं की आपूर्ति पर लगने वाला एक एकल अप्रत्यक्ष कर है। इसने पहले लगने वाले वैट (VAT), सर्विस टैक्स और एक्साइज ड्यूटी जैसे कई पुराने करों को समाप्त कर एक एकीकृत प्रणाली बनाई।',
    detailedAnswerEn: 'Implemented on July 1, 2017, GST operates on a dual model comprising CGST (Central GST), SGST (State GST), and IGST (Integrated GST for inter-state transactions). It functions under a value-added concept where businesses receive Input Tax Credit (ITC) for taxes paid on inputs, avoiding tax cascading.',
    detailedAnswerHi: '1 जुलाई 2017 को लागू जीएसटी प्रणाली केंद्र और राज्य दोनों स्तरों पर संचालित होती है (CGST, SGST और अंतर-राज्यीय व्यापार के लिए IGST)। यह वैल्यू-एडेड सिद्धांत पर कार्य करती है, जिससे व्यापारियों को अपनी खरीद पर चुकाए गए टैक्स का इनपुट टैक्स क्रेडिट (ITC) मिलता है और टैक्स पर टैक्स लगने की समस्या खत्म होती है।',
    simpleExplanationEn: 'Think of GST as one transparent nation-wide tax system where every buyer pays tax only on the actual value added at each step, instead of paying separate hidden taxes to central and state authorities.',
    simpleExplanationHi: 'जीएसटी को "एक देश, एक टैक्स" समझें। पहले जब आप कोई सामान खरीदते थे, तो उस पर केंद्र और राज्य के कई अलग-अलग टैक्स जुड़े होते थे। जीएसटी में केवल एक बिल पर स्पष्ट टैक्स लगता है।',
    practicalExampleEn: 'If a manufacturer buys raw materials for ₹1,000 + 18% GST (₹180) and sells the finished product for ₹1,500 + 18% GST (₹270), they only pay ₹90 net to the government (₹270 output tax minus ₹180 input credit).',
    practicalExampleHi: 'यदि कोई दुकानदार ₹1,000 का सामान 18% जीएसटी (₹180) देकर खरीदता है और उसे ₹1,500 में 18% जीएसटी (₹270) पर बेचता है, तो उसे सरकार को केवल ₹90 का अंतर जमा करना होता है, क्योंकि ₹180 का इनपुट क्रेडिट मिल जाता है।',
    importantPointsEn: '• Four primary tax slabs: 5%, 12%, 18%, and 28%.\n• Seamless flow of Input Tax Credit across state borders.\n• Mandatory for businesses crossing prescribed annual turnover thresholds.',
    importantPointsHi: '• मुख्य चार टैक्स स्लैब: 5%, 12%, 18% और 28%।\n• इनपुट टैक्स क्रेडिट (ITC) का निर्बाध लाभ।\n• निर्धारित वार्षिक टर्नओवर सीमा पार करने पर अनिवार्य पंजीकरण।',
    referencesEn: 'Central Board of Indirect Taxes and Customs (CBIC) — https://www.cbic.gov.in',
    referencesHi: 'केंद्रीय अप्रत्यक्ष कर और सीमा शुल्क बोर्ड (CBIC) — https://www.cbic.gov.in',
    isFeatured: true,
  },
  {
    categorySlug: 'personal-finance-banking',
    subcategorySlug: 'fixed-deposits',
    slug: 'difference-between-fd-and-rd',
    titleEn: 'What is the difference between Fixed Deposit (FD) and Recurring Deposit (RD)?',
    titleHi: 'एफडी (FD) और आरडी (RD) में क्या अंतर है?',
    shortAnswerEn: 'FD requires investing a lump-sum amount once for a fixed tenure, whereas RD allows saving a fixed regular amount every month.',
    shortAnswerHi: 'एफडी (Fixed Deposit) में एकमुश्त रकम एक बार में निश्चित अवधि के लिए जमा की जाती है, जबकि आरडी (Recurring Deposit) में हर महीने एक निश्चित छोटी राशि नियमित रूप से जमा की जाती है।',
    detailedAnswerEn: 'Both FD and RD are low-risk, guaranteed-return banking products insured by DICGC up to ₹5 Lakh per bank. FD suits individuals who have accumulated capital (e.g. ₹1 Lakh) seeking stable interest. RD suits salaried earners or shopkeepers who want to build a corpus by depositing monthly savings (e.g. ₹2,000 every month for 2 years).',
    detailedAnswerHi: 'एफडी और आरडी दोनों सुरक्षित और गारंटीड रिटर्न वाले बैंक निवेश हैं, जो डीआईसीजीसी द्वारा ₹5 लाख तक सुरक्षित होते हैं। एफडी उनके लिए बेहतर है जिनके पास एकमुश्त बचत है (जैसे ₹50,000 या ₹1 लाख)। आरडी उन कर्मचारियों या दुकानदारों के लिए उपयोगी है जो हर महीने अपनी बचत में से ₹1,000 या ₹2,000 जमा करके एक बड़ी पूंजी तैयार करना चाहते हैं।',
    simpleExplanationEn: 'FD is like planting a fully grown tree that yields steady fruit; RD is like planting seeds and watering them monthly until they grow into a tree.',
    simpleExplanationHi: 'एफडी का मतलब है पूरा पैसा एक बार में बैंक में लॉक करना। आरडी का मतलब है गुल्लक की तरह हर महीने निश्चित तारीख को बैंक में थोड़ा-थोड़ा पैसा जमा करना।',
    practicalExampleEn: 'Ramesh has ₹60,000 from an annual bonus and deposits it into an FD for 3 years at 7% p.a. Suresh earns ₹25,000 monthly and starts a ₹2,000 monthly RD for 3 years at 7% p.a. Both build disciplined wealth based on their cash flow.',
    practicalExampleHi: 'रमेश को बोनस में ₹60,000 मिले, उसने 3 साल के लिए 7% ब्याज पर एफडी कर दी। सुरेश की मासिक आय है, इसलिए उसने हर महीने ₹2,000 की 3 साल की आरडी शुरू की। दोनों की बचत सुरक्षित रूप से बढ़ती है।',
    importantPointsEn: '• FD gives compounding on full initial principal from day one.\n• RD gives compounding on incremental monthly installments.\n• TDS applies on interest earned if it exceeds annual statutory limits (Income Tax Act).',
    importantPointsHi: '• एफडी में पहले दिन से पूरी रकम पर ब्याज जुड़ता है।\n• आरडी में हर महीने जमा होने वाली किस्तों पर समय अनुसार ब्याज मिलता है।\n• दोनों में अर्जित ब्याज पर आयकर नियमों के अनुसार टीडीएस कट सकता है।',
    referencesEn: 'Reserve Bank of India (RBI) Financial Education Handbook',
    referencesHi: 'भारतीय रिजर्व बैंक (RBI) वित्तीय साक्षरता प्रभाग',
    isFeatured: true,
  },
  {
    categorySlug: 'personal-finance-banking',
    subcategorySlug: 'credit-score',
    slug: 'what-is-cibil-credit-score',
    titleEn: 'What is a CIBIL Credit Score and why is it important?',
    titleHi: 'सिबिल (CIBIL) क्रेडिट स्कोर क्या होता है और यह क्यों जरूरी है?',
    shortAnswerEn: 'A CIBIL credit score is a 3-digit number ranging from 300 to 900 that reflects an individual’s creditworthiness and repayment history. A score of 750 or above is considered excellent by banks.',
    shortAnswerHi: 'सिबिल स्कोर 300 से 900 के बीच का 3 अंकों का एक नंबर होता है जो आपके पुराने कर्ज और क्रेडिट कार्ड बिल चुकाने के रिकॉर्ड को दर्शाता है। 750 या उससे अधिक का स्कोर बैंकों द्वारा बहुत अच्छा माना जाता है।',
    detailedAnswerEn: 'Credit information companies licensed by the RBI (such as TransUnion CIBIL, Experian, Equifax, and CRIF High Mark) compile data reported by banks and NBFCs. The score evaluates repayment timeliness, credit utilization ratio, credit mix (secured vs unsecured), and recent loan inquiries.',
    detailedAnswerHi: 'आरबीआई द्वारा अधिकृत क्रेडिट ब्यूरो (जैसे CIBIL, Experian) बैंकों और वित्तीय संस्थानों से आपके लोन और ईएमआई भुगतान का डेटा एकत्र करते हैं। समय पर भुगतान, क्रेडिट कार्ड सीमा का उपयोग और नए लोन के लिए बार-बार आवेदन करना इस स्कोर को प्रभावित करता है।',
    simpleExplanationEn: 'It is like your financial report card. When you ask a bank for a business or home loan, the score immediately tells them if you repay your commitments on time.',
    simpleExplanationHi: 'सिबिल स्कोर आपकी वित्तीय साख की मार्कशीट है। जब आप बैंक से दुकान, घर या गाड़ी का लोन मांगते हैं, तो बैंक सबसे पहले यह देखता है कि आपका पुराना हिसाब-किताब कितना ईमानदार और समयबद्ध रहा है।',
    practicalExampleEn: 'A shopkeeper who always pays their supplier loan EMI on the 5th of every month achieves a 780 CIBIL score and gets a business loan approved at 9.5% interest, while someone with defaults might be rejected or charged 14%.',
    practicalExampleHi: 'एक व्यापारी जो हर महीने समय पर अपनी ईएमआई चुकाता है, उसका स्कोर 780 रहता है और उसे बैंक से 9% की कम ब्याज दर पर बिजनेस लोन मिल जाता है।',
    importantPointsEn: '• Always pay credit card bills and loan EMIs before the due date.\n• Keep credit card balance utilization below 30% of your total limit.\n• Checking your own score does not lower it.',
    importantPointsHi: '• हमेशा बिल और ईएमआई की अंतिम तारीख से पहले भुगतान करें।\n• क्रेडिट कार्ड की कुल लिमिट का 30% से अधिक उपयोग करने से बचें।\n• अपना स्कोर खुद चेक करने से स्कोर कम नहीं होता।',
    referencesEn: 'TransUnion CIBIL & RBI Credit Information Companies Regulations',
    referencesHi: 'ट्रांसयूनियन सिबिल एवं भारतीय रिजर्व बैंक',
    isFeatured: true,
  },
  {
    categorySlug: 'small-business-shop',
    subcategorySlug: 'profit-loss',
    slug: 'how-to-calculate-shop-profit',
    titleEn: 'How to calculate gross and net profit for a retail shop?',
    titleHi: 'दुकान का शुद्ध मुनाफा (Net Profit) कैसे निकालें?',
    shortAnswerEn: 'Gross Profit = Total Sales minus Cost of Goods Sold (Purchase Cost). Net Profit = Gross Profit minus All Operating Expenses (Rent, Electricity, Staff Salary, Transport, Packaging).',
    shortAnswerHi: 'सकल लाभ (Gross Profit) = कुल बिक्री में से माल की खरीद लागत घटाएं। शुद्ध मुनाफा (Net Profit) = सकल लाभ में से दुकान के सभी खर्चे (दुकान किराया, बिजली, स्टाफ सैलरी, उधारी नुकसान) घटाने के बाद जो बचता है।',
    detailedAnswerEn: 'Many shopkeepers mistake daily cash in the drawer for profit. True net profit requires tracking monthly inventory costs, direct supplier purchase costs, shrinkage or damages, and overheads. Only after subtracting all running costs does the actual owner takeaway emerge.',
    detailedAnswerHi: 'अक्सर दुकानदार गल्ले में आने वाले पूरे कैश को मुनाफा समझ लेते हैं। सही मुनाफा जानने के लिए बिके हुए सामान की खरीद लागत, दुकान का किराया, स्टाफ का वेतन, बिजली बिल और उधारी के बट्टे खाते को घटाना आवश्यक है।',
    simpleExplanationEn: 'Just because you sold ₹10,000 worth of groceries today does not mean you made ₹10,000 profit. If the goods cost ₹8,500 and daily shop expenses are ₹500, your actual profit is ₹1,000.',
    simpleExplanationHi: 'यदि आज आपकी दुकान पर ₹10,000 का माल बिका, तो वह पूरा मुनाफा नहीं है। यदि वह माल ₹8,000 में खरीदा गया था और दिन का किराया-बिजली ₹500 बनता है, तो आपका वास्तविक शुद्ध लाभ केवल ₹1,500 है।',
    practicalExampleEn: 'Monthly Sales: ₹3,00,000. Purchase Cost of Sold Stock: ₹2,40,000. Gross Profit: ₹60,000. Shop Rent: ₹15,000. Staff Salary: ₹12,000. Electricity & Misc: ₹5,000. True Monthly Net Profit = ₹28,000.',
    practicalExampleHi: 'मासिक बिक्री: ₹3,00,000। बिके माल की लागत: ₹2,40,000। सकल लाभ: ₹60,000। दुकान किराया: ₹15,000। कर्मचारी वेतन: ₹12,000। बिजली व अन्य: ₹5,000। वास्तविक शुद्ध मुनाफा = ₹28,000।',
    importantPointsEn: '• Always record daily purchases and sales accurately.\n• Deduct family personal withdrawals separately from business expenses.\n• Maintain an updated inventory register.',
    importantPointsHi: '• रोजाना की बिक्री और खरीद का पक्का रिकॉर्ड रखें।\n• घर के निजी खर्चों को दुकान के खर्चों से बिल्कुल अलग रखें।\n• महीने के अंत में बचे हुए स्टॉक का मिलान जरूर करें।',
    referencesEn: 'Institute of Cost Accountants of India (ICMAI) SME Guidance',
    referencesHi: 'इंस्टीट्यूट ऑफ कॉस्ट अकाउंटेंट्स ऑफ इंडिया (ICMAI)',
    isFeatured: true,
  },
  {
    categorySlug: 'accounting-gst-taxation',
    subcategorySlug: 'debit-credit',
    slug: 'what-is-debit-and-credit-in-accounting',
    titleEn: 'What is Debit and Credit in double-entry bookkeeping?',
    titleHi: 'लेखांकन में डेबit और क्रेडिट क्या होते हैं?',
    shortAnswerEn: 'Debit and Credit are the two foundational pillars of double-entry bookkeeping. Every financial transaction has two equal and opposite sides: one account is debited and another is credited.',
    shortAnswerHi: 'डेबिट (Debit) और क्रेडिट (Credit) दोहरे लेखांकन प्रणाली (Double Entry System) के दो मुख्य आधार हैं। प्रत्येक लेन-देन के दो पहलू होते हैं: एक खाता डेबिट होता है और दूसरा क्रेडिट, जिससे दोनों तरफ का हिसाब हमेशा बराबर रहता है।',
    detailedAnswerEn: 'The Golden Rules of Accounting govern Debits and Credits:\n1. Real Accounts: Debit what comes in, Credit what goes out.\n2. Personal Accounts: Debit the receiver, Credit the giver.\n3. Nominal Accounts: Debit all expenses and losses, Credit all incomes and gains.',
    detailedAnswerHi: 'लेखांकन के तीन सुनहरे नियम (Golden Rules):\n1. वास्तविक खाते (Real): जो संपत्ति व्यापार में आए उसे डेबिट, जो जाए उसे क्रेडिट करें।\n2. व्यक्तिगत खाते (Personal): पाने वाले को डेबिट, देने वाले को क्रेडिट करें।\n3. नाममात्र खाते (Nominal): सभी खर्चों व हानियों को डेबिट, सभी आय व लाभ को क्रेडिट करें।',
    simpleExplanationEn: 'Debit simply marks the receiving side of value (assets/expenses), while Credit marks the giving side of value (liabilities/income).',
    simpleExplanationHi: 'डेबिट का अर्थ है संपत्ति या खर्चे का बढ़ना, जबकि क्रेडिट का अर्थ है आमदनी या देनदारी का बढ़ना। बैंक में पैसा आने पर बैंक आपके खाते को क्रेडिट करता है क्योंकि बैंक की आप पर देनदारी बढ़ती है।',
    practicalExampleEn: 'When you buy furniture for cash worth ₹10,000: Furniture Account is debited by ₹10,000 (asset incoming), and Cash Account is credited by ₹10,000 (asset outgoing). Total balance remains balanced.',
    practicalExampleHi: 'जब आप ₹10,000 नकद देकर दुकान के लिए फर्नीचर खरीदते हैं: फर्नीचर खाता ₹10,000 से डेबिट (संपत्ति आई) और कैश खाता ₹10,000 से क्रेडिट (कैश गया) होता है।',
    importantPointsEn: '• Total Debits must always equal Total Credits in a Trial Balance.\n• Debit does not automatically mean "good" and Credit does not mean "bad".',
    importantPointsHi: '• तलपट (Trial Balance) में कुल डेबिट हमेशा कुल क्रेडिट के बराबर होना चाहिए।\n• खाता बही के सटीक रख-रखाव से सीए और ऑडिट में कोई परेशानी नहीं आती।',
    referencesEn: 'Institute of Chartered Accountants of India (ICAI) Accounting Standards',
    referencesHi: 'द इंस्टीट्यूट ऑफ चार्टर्ड अकाउंटेंट्स ऑफ इंडिया (ICAI)',
    isFeatured: false,
  },
  {
    categorySlug: 'technology-digital-awareness',
    subcategorySlug: 'online-fraud-safety',
    slug: 'what-to-do-in-case-of-online-financial-fraud',
    titleEn: 'What should you do immediately if you become a victim of online financial fraud?',
    titleHi: 'ऑनलाइन वित्तीय धोखाधड़ी (Online Fraud) होने पर तुरंत क्या करें?',
    shortAnswerEn: 'Immediately call National Cyber Crime Helpline 1930, report the incident at cybercrime.gov.in, and request your bank to freeze the compromised account/card within the golden hour.',
    shortAnswerHi: 'तुरंत राष्ट्रीय साइबर हेल्पलाइन नंबर 1930 पर कॉल करें, cybercrime.gov.in पर शिकायत दर्ज करें, और अपने बैंक को तुरंत कॉल करके खाता या क्रेडिट/डेबिट कार्ड ब्लॉक करवाएं।',
    detailedAnswerEn: 'The first 2 to 3 hours after unauthorized debit are termed the "Golden Hour". The 1930 Citizen Financial Cyber Fraud Reporting System connects directly with major banks and payment gateways to freeze funds before scammers withdraw them through ATMs or money mules.',
    detailedAnswerHi: 'धोखाधड़ी के पहले 2-3 घंटों को "गोल्डन आवर" कहा जाता है। 1930 पर तुरंत कॉल करने से नोडल अधिकारी बैंक और पेमेंट गेटवे से संपर्क करके फ्रॉड वाले पैसों को दूसरे खाते या एटीएम से निकाले जाने से पहले ही फ्रीज (हॉल्ट) करवा देते हैं।',
    simpleExplanationEn: 'Act fast without panicking. The quicker you inform 1930 and your bank, the higher the chance your lost money will be stopped in transit.',
    simpleExplanationHi: 'घबराएं नहीं, तुरंत एक्शन लें। जितनी जल्दी आप 1930 पर कॉल करेंगे और बैंक को सूचित करेंगे, आपके पैसे वापस मिलने की संभावना उतनी ही अधिक होगी।',
    practicalExampleEn: 'If ₹25,000 is debited via a fake APK or link, immediately dial 1930, share transaction UTR, beneficiary account details, and send an official dispute email to your bank manager within 24 hours.',
    practicalExampleHi: 'यदि किसी फर्जी लिंक या ऐप के जरिए खाते से ₹25,000 कट जाएं, तो तुरंत 1930 मिलाएं, बैंक कस्टमर केयर को फोन कर कार्ड ब्लॉक करवाएं और नजदीकी थाने या साइबर सेल में लिखित शिकायत दर्ज करें।',
    importantPointsEn: '• Never share OTP, UPI PIN, or bank passwords with anyone.\n• Banks never ask for your PIN or screen sharing apps like AnyDesk/TeamViewer.\n• Report within 24 hours to enforce zero customer liability under RBI guidelines.',
    importantPointsHi: '• किसी को भी ओटीपी (OTP) या यूपीआई पिन (PIN) न बताएं।\n• बैंक कभी भी फोन पर पिन या स्क्रीन शेयरिंग ऐप (AnyDesk) डाउनलोड करने को नहीं कहता।\n• आरबीआई के अनुसार अनधिकृत लेन-देन की सूचना 3 दिन के भीतर देने पर ग्राहक की कोई देनदारी नहीं होती।',
    referencesEn: 'Ministry of Home Affairs (MHA) Cyber Crime Division & RBI Circular on Unauthorized Electronic Banking Transactions',
    referencesHi: 'गृह मंत्रालय भारत सरकार (MHA) साइबर सुरक्षा प्रभाग एवं भारतीय रिजर्व बैंक',
    isFeatured: true,
  },
  {
    categorySlug: 'domestic-home-knowledge',
    subcategorySlug: 'household-budget',
    slug: 'how-to-create-monthly-home-budget',
    titleEn: 'How to create a balanced monthly household budget using the 50/30/20 rule?',
    titleHi: 'घर का संतुलित मासिक बजट (50/30/20 नियम) कैसे बनाएं?',
    shortAnswerEn: 'Divide total monthly in-hand family income into 3 parts: 50% for Needs (Groceries, Rent, School Fees), 30% for Wants (Dining out, Entertainment), and 20% for Savings & Debt repayment.',
    shortAnswerHi: 'अपनी कुल मासिक पारिवारिक आय को 3 हिस्सों में बांटें: 50% बुनियादी जरूरतें (राशन, किराया, फीस), 30% जीवनशैली व इच्छाएं (घूमना, खरीदारी), और 20% बचत एवं निवेश (इमरजेंसी फंड, आरडी/एफडी)।',
    detailedAnswerEn: 'Budgeting prevents end-of-month financial stress. Fixed needs must be budgeted first. Discretionary expenses can be calibrated. The 20% savings component builds an emergency fund covering 6 months of living expenses.',
    detailedAnswerHi: 'बजट बनाने से महीने के अंत में पैसे खत्म होने का तनाव नहीं होता। सबसे पहले जरूरी खर्चे तय करें, फिर बचत अलग निकालें, और बचे हुए पैसों से जीवनशैली के खर्चे पूरे करें।',
    simpleExplanationEn: 'Pay your future self first by saving 20% as soon as your salary or earnings arrive, rather than trying to save whatever is left over at the end of the month.',
    simpleExplanationHi: 'महीने की शुरुआत में ही बचत का 20% अलग कर लें। महीने के अंत में जो बचेगा उसे बचाने की कोशिश करने से कभी बचत नहीं हो पाती।',
    practicalExampleEn: 'With a household income of ₹40,000: Needs (Ration, Rent, Bills) = ₹20,000 (50%). Wants (Outing, Shopping) = ₹12,000 (30%). Savings (RD, Emergency Fund) = ₹8,000 (20%).',
    practicalExampleHi: 'यदि घर की कुल आमदनी ₹40,000 है: जरूरतें (राशन, किराया, बिजली बिल) = ₹20,000 (50%)। इच्छाएं (घूमना-फिरना) = ₹12,000 (30%)। बचत (आरडी या सोने में निवेश) = ₹8,000 (20%)।',
    importantPointsEn: '• Track daily small expenses using a simple diary or PakkaChittha Ghar Kharcha.\n• Build an emergency contingency fund before taking major non-essential loans.\n• Involve all family members in budgeting decisions.',
    importantPointsHi: '• रोजाना के छोटे खर्चों को पक्काचिट्ठा घर खर्चा में नोट करें।\n• किसी भी बड़े लोन से पहले 3 से 6 महीने का इमरजेंसी फंड बनाएं।\n• बजट में परिवार के सभी सदस्यों को शामिल करें।',
    referencesEn: 'National Institute of Securities Markets (NISM) Personal Finance Guide',
    referencesHi: 'राष्ट्रीय प्रतिभूति बाजार संस्थान (NISM) व्यक्तिगत वित्त दिशानिर्देश',
    isFeatured: true,
  },
  {
    categorySlug: 'legal-awareness',
    subcategorySlug: 'consumer-rights',
    slug: 'what-are-consumer-rights-in-india',
    titleEn: 'What are the essential consumer rights in India under the Consumer Protection Act, 2019?',
    titleHi: 'भारत में उपभोक्ता संरक्षण कानून के तहत मुख्य अधिकार क्या हैं?',
    shortAnswerEn: 'Indian consumers have 6 statutory rights: Right to Safety, Right to Information, Right to Choose, Right to be Heard, Right to Seek Redressal, and Right to Consumer Education.',
    shortAnswerHi: 'उपभोक्ता संरक्षण अधिनियम 2019 के तहत भारतीय नागरिकों को 6 मुख्य अधिकार प्राप्त हैं: सुरक्षा का अधिकार, सूचना का अधिकार, चयन का अधिकार, सुनवाई का अधिकार, निवारण का अधिकार और उपभोक्ता शिक्षा का अधिकार।',
    detailedAnswerEn: 'Under CPA 2019, consumers can file grievances online via the e-Daakhil portal (edaakhil.nic.in). The act covers e-commerce platforms, penalizes misleading advertisements, introduces product liability for defective goods, and simplifies territorial jurisdiction.',
    detailedAnswerHi: 'नए कानून के तहत उपभोक्ता ई-दाखिल पोर्टल पर घर बैठे ऑनलाइन शिकायत दर्ज कर सकते हैं। यह ई-कॉमर्स कंपनियों, भ्रामक विज्ञापनों और घटिया सामान बेचने वालों पर कड़ी पेनाल्टी और क्षतिपूर्ति का प्रावधान करता है।',
    simpleExplanationEn: 'If a seller gives you expired goods, charges above MRP, or refuses to honor a valid warranty, you have the legal right to free replacement, full refund, or compensation.',
    simpleExplanationHi: 'यदि कोई दुकानदार एमआरपी से अधिक दाम लेता है, एक्सपायरी सामान देता है या वारंटी होने पर भी सामान ठीक नहीं करता, तो आप उपभोक्ता आयोग में हर्जाने का दावा कर सकते हैं।',
    practicalExampleEn: 'A customer bought an electric geyser that short-circuited within warranty and the manufacturer refused repair. The consumer filed an e-Daakhil complaint and received a full refund plus ₹5,000 compensation.',
    practicalExampleHi: 'यदि किसी ने नया मोबाइल खरीदा और वह 2 दिन में खराब हो गया, और सर्विस सेंटर ने मना कर दिया, तो उपभोक्ता हेल्पलाइन 1915 पर कॉल करके शिकायत दर्ज कर सकते हैं।',
    importantPointsEn: '• Always demand and preserve a valid GST tax invoice or purchase bill.\n• National Consumer Helpline number: 1915 or SMS to 8800001915.\n• e-Daakhil portal enables filing complaints without hiring a lawyer.',
    importantPointsHi: '• खरीद का पक्का बिल हमेशा संभाल कर रखें।\n• राष्ट्रीय उपभोक्ता हेल्पलाइन: 1915 पर कॉल करें।\n• उपभोक्ता आयोग में शिकायत के लिए वकील की आवश्यकता नहीं होती, आप खुद पक्ष रख सकते हैं।',
    referencesEn: 'Department of Consumer Affairs, Government of India — https://consumeraffairs.nic.in',
    referencesHi: 'उपभोक्ता मामले विभाग, भारत सरकार',
    isFeatured: false,
  },
  {
    categorySlug: 'government-schemes-public-services',
    subcategorySlug: 'banking-schemes',
    slug: 'what-is-pm-mudra-yojana-loan',
    titleEn: 'What is PM Mudra Yojana and how can small shopkeepers get loans under it?',
    titleHi: 'प्रधानमंत्री मुद्रा योजना (PMMY) क्या है और छोटा व्यापारी लोन कैसे ले सकता है?',
    shortAnswerEn: 'PM Mudra Yojana provides collateral-free loans up to ₹20 Lakhs to non-corporate, non-farm small and micro enterprises across three categories: Shishu (up to ₹50,000), Kishore (₹50,000 to ₹5 Lakh), and Tarun (₹5 Lakh to ₹20 Lakh).',
    shortAnswerHi: 'प्रधानमंत्री मुद्रा योजना छोटे कारोबारियों और दुकानदारों को बिना किसी गारंटी (कोलैटरल) के ₹20 लाख तक का लोन देती है। इसके तीन प्रकार हैं: शिशु (₹50,000 तक), किशोर (₹50,000 से ₹5 लाख तक) और तरुण (₹5 लाख से ₹20 लाख तक)।',
    detailedAnswerEn: 'Mudra loans are disbursed by commercial banks, RRBs, Small Finance Banks, and MFIs. The scheme requires no third-party guarantor. Borrowers receive a Mudra RuPay card for working capital credit limits, helping them purchase inventory and equipment.',
    detailedAnswerHi: 'मुद्रा लोन सरकारी, प्राइवेट बैंकों, ग्रामीण बैंकों और एनबीएफसी द्वारा दिए जाते हैं। बजट 2024 में तरुण श्रेणी की सीमा ₹10 लाख से बढ़ाकर ₹20 लाख कर दी गई है। इसमें वर्किंग कैपिटल के लिए मुद्रा रुपे कार्ड भी मिलता है।',
    simpleExplanationEn: 'It is a government-backed bank loan designed for neighborhood shops, tailoring, repair businesses, and food stalls who lack property to mortgage.',
    simpleExplanationHi: 'यह योजना उन दुकानदारों, कारीगरों और छोटे उद्यमियों के लिए है जिनके पास बैंक में गिरवी रखने के लिए कोई जमीन या मकान नहीं है, लेकिन वे अपनी दुकान या धंधा बढ़ाना चाहते हैं।',
    practicalExampleEn: 'A Kirana store owner wanting to buy a commercial deep freezer and restock provisions can apply for a ₹3 Lakh Kishore Mudra loan at their local bank branch with basic quotation and business proof.',
    practicalExampleHi: 'एक किराना दुकानदार जो दुकान में नया डीप-फ्रीजर और राशन का स्टॉक बढ़ाना चाहता है, वह नजदीकी बैंक में आधार, पैन और कोटेशन के साथ ₹2 लाख के मुद्रा किशोर लोन के लिए आवेदन कर सकता है।',
    importantPointsEn: '• No processing fee for Shishu and Kishore loans in most nationalized banks.\n• No collateral security is required.\n• Apply online via UdyamiMitra portal (udyamimitra.in) or directly at bank branches.',
    importantPointsHi: '• किसी भी प्रकार की संपत्ति गिरवी नहीं रखनी होती।\n• उद्यमी मित्र पोर्टल (udyamimitra.in) पर ऑनलाइन या सीधे बैंक शाखा में आवेदन करें।\n• किसी भी दलाल या एजेंट को पैसे न दें, यह सरकारी योजना है।',
    referencesEn: 'Micro Units Development & Refinance Agency (MUDRA) — https://www.mudra.org.in',
    referencesHi: 'मुद्रा (MUDRA) आधिकारिक पोर्टल, वित्त मंत्रालय भारत सरकार',
    isFeatured: true,
  },
  {
    categorySlug: 'accounting-gst-taxation',
    subcategorySlug: 'gst-returns',
    slug: 'difference-between-gstr-1-and-gstr-3b',
    titleEn: 'What is the difference between GSTR-1 and GSTR-3B?',
    titleHi: 'GSTR-1 और GSTR-3B में क्या अंतर होता है?',
    shortAnswerEn: 'GSTR-1 is a monthly/quarterly return containing invoice-wise details of outward sales, while GSTR-3B is a monthly summary return used for self-assessing tax liability and paying GST.',
    shortAnswerHi: 'GSTR-1 में आपकी बिक्री (Outward Supplies) का बिल-वार विवरण भरा जाता है, जबकि GSTR-3B एक मासिक सारांश रिटर्न है जिसमें इनपुट क्रेडिट घटाकर वास्तविक टैक्स का भुगतान सरकार को किया जाता है।',
    detailedAnswerEn: 'In GSTR-1, businesses report B2B invoices, B2C sales, credit notes, and exports. Buyers see these entries in their GSTR-2B to claim Input Tax Credit (ITC). GSTR-3B is the payment return where output liability declared in GSTR-1 and eligible ITC from GSTR-2B are offset, and the balance is paid via cash ledger.',
    detailedAnswerHi: 'GSTR-1 में आपकी हर सेल का बिल नंबर, ग्राहक का जीएसटी नंबर और वैल्यू दर्ज होती है, जिससे आपके खरीदार को GSTR-2B में इनपुट क्रेडिट दिखता है। GSTR-3B में टैक्स चुकाया जाता है। दोनों रिटर्न में अंतर होने पर जीएसटी विभाग से नोटिस आ सकता है।',
    simpleExplanationEn: 'GSTR-1 is your Sales Declaration report; GSTR-3B is your Tax Payment voucher.',
    simpleExplanationHi: 'सरल शब्दों में: GSTR-1 आपकी कुल बिक्री की घोषणा है, और GSTR-3B टैक्स के अंतिम भुगतान की रसीद है।',
    practicalExampleEn: 'A distributor sells goods worth ₹10 Lakhs in April. On May 11, they file GSTR-1 reporting all invoices so buyers get credit. On May 20, they file GSTR-3B, offset their ₹1.2 Lakh input credit, and pay the remaining ₹60,000 cash tax.',
    practicalExampleHi: 'एक थोक व्यापारी अप्रैल में ₹10 लाख का माल बेचता है। 11 मई तक वह GSTR-1 में सभी बिल चढ़ाता है ताकि ग्राहकों को क्रेडिट मिले। फिर 20 मई तक GSTR-3B में इनपुट क्रेडिट घटाकर बाकी टैक्स जमा करता है।',
    importantPointsEn: '• GSTR-1 due date: 11th of every month (monthly) or 13th (QRMP).\n• GSTR-3B due date: 20th of every month (or 22nd/24th under QRMP).\n• ITC in GSTR-3B must strictly match GSTR-2B under Rule 36(4).',
    importantPointsHi: '• GSTR-1 की अंतिम तारीख सामान्यतः हर महीने की 11 तारीख होती है।\n• GSTR-3B की अंतिम तारीख हर महीने की 20 तारीख होती है।\n• दोनों में बिक्री का आंकड़ा बिल्कुल एक समान होना चाहिए।',
    referencesEn: 'GST Portal Guidelines & CBIC Notifications',
    referencesHi: 'जीएसटी नेटवर्क (GSTN) एवं केंद्रीय अप्रत्यक्ष कर बोर्ड',
    isFeatured: false,
  },
];

const SAMPLE_ARTICLES = [
  {
    categorySlug: 'accounting-gst-taxation',
    subcategorySlug: 'gst-registration',
    slug: 'complete-guide-to-gst-for-beginners',
    titleEn: 'Complete Guide to GST for Beginners: Everything a Small Business Must Know',
    titleHi: 'जीएसटी की पूरी गाइड: छोटे व्यापारियों और नए उद्यमियों के लिए सरल मार्गदर्शन',
    summaryEn: 'An exhaustive, clear primer explaining GST thresholds, registration process, tax slabs, input tax credit, and simple compliance tips for Indian business owners.',
    summaryHi: 'छोटे दुकानदारों और नए व्यापारियों के लिए जीएसटी की संपूर्ण जानकारी: पंजीकरण नियम, टर्नओवर सीमाएं, चार प्रमुख स्लैब, इनपुट क्रेडिट और जरूरी रिटर्न।',
    readingTimeMinutes: 7,
    authorName: 'PakkaChittha Financial Editorial Team',
    reviewerName: 'Chartered Accountant Panel',
    seoTitleEn: 'Complete Guide to GST for Beginners in India | PakkaChittha',
    seoTitleHi: 'शुरुआती कारोबारियों के लिए जीएसटी की पूरी गाइड | पक्काचिट्ठा',
    seoDescriptionEn: 'Learn how GST works in India. Understand turnover limits, composition scheme, input tax credit, and invoice requirements simply.',
    seoDescriptionHi: 'भारत में जीएसटी कैसे काम करता है? जानिए पंजीकरण की टर्नओवर सीमा, कंपोजिशन स्कीम, इनपुट टैक्स क्रेडिट और बिलिंग के आवश्यक नियम।',
    isFeatured: true,
    contentEn: `## 1. Introduction to Goods and Services Tax (GST)

Goods and Services Tax (GST) is India's landmark indirect tax reform, introduced on 1st July 2017 with the principle of "One Nation, One Tax". Before GST, Indian businesses struggled with multiple cascading taxes including Central Excise, State VAT, Entry Tax, Luxury Tax, and Service Tax.

Under GST, indirect taxation is unified into a transparent, digital-first system.

---

## 2. Who Needs to Register for GST?

Not every small business is required to register immediately. The government provides threshold exemptions:

- **Goods Suppliers (Intra-state):** Businesses trading exclusively in goods within the same state generally require registration only if annual turnover exceeds **₹40 Lakhs** (₹20 Lakhs in special category states).
- **Service Providers:** Annual turnover exceeding **₹20 Lakhs** (₹10 Lakhs in special states).
- **Inter-State Sellers:** Anyone selling goods outside their home state, or selling through e-commerce platforms (like Amazon/Flipkart), generally requires mandatory registration regardless of turnover.
- **Voluntary Registration:** Small businesses can voluntarily register to claim Input Tax Credit (ITC) and build credibility with corporate buyers.

---

## 3. The Structure of GST: CGST, SGST, IGST

Whenever a taxable sale takes place, GST is divided into:

1. **Intra-State (Within Same State):**
   - **CGST (Central GST):** Goes to the Central Government.
   - **SGST (State GST):** Goes to the State Government.
   - *Example:* For an 18% item sold in Mumbai to a buyer in Pune, 9% is CGST and 9% is SGST.
2. **Inter-State (Between Two Different States):**
   - **IGST (Integrated GST):** Collected by the Centre and shared with the destination state.
   - *Example:* A merchant in Delhi selling to a buyer in Jaipur charges 18% IGST.

---

## 4. Understanding Input Tax Credit (ITC)

Input Tax Credit is the core advantage of GST. When you buy goods or business services for commercial purposes and pay GST to your registered supplier, you can subtract that tax from the tax you collect on your sales.

> **Golden Rule of ITC:** You only pay the difference between Output Tax on Sales and Input Tax on Purchases. Ensure your supplier files GSTR-1 so the purchase appears in your auto-drafted **GSTR-2B**.

---

## 5. Composition Scheme for Small Retailers

Small retailers and restaurant operators with turnover up to **₹1.5 Crores** can opt for the simplified Composition Scheme:
- Pay a low flat rate of tax (typically 1% for traders/manufacturers, 5% for restaurants).
- File simple quarterly statements and an annual return instead of monthly filings.
- *Limitation:* Composition dealers cannot charge GST on their bills and cannot claim Input Tax Credit.

---

## 6. Essential Invoicing Rules

Every GST invoice must clearly mention:
- Supplier business name, address, and GSTIN.
- Consecutive invoice number and date.
- Recipient name, address, and GSTIN (for B2B sales).
- HSN Code / SAC Code of goods/services.
- Taxable value, tax rate, and split of CGST/SGST/IGST.
`,
    contentHi: `## 1. वस्तु एवं सेवा कर (जीएसटी) का परिचय

जीएसटी (GST) भारत का सबसे महत्वपूर्ण अप्रत्यक्ष कर सुधार है, जिसे 1 जुलाई 2017 को "एक राष्ट्र, एक कर" के संकल्प के साथ लागू किया गया था। इससे पहले व्यापारियों को वैट, सर्विस टैक्स, एक्साइज ड्यूटी, चुंगी और एंट्री टैक्स जैसे दर्जनों टैक्स अलग-अलग चुकाने पड़ते थे।

जीएसटी ने इन सभी को हटाकर एक सरल और पारदर्शी व्यवस्था बनाई है।

---

## 2. जीएसटी रजिस्ट्रेशन कब जरूरी होता है?

हर छोटे दुकानदार या गृह उद्योग को तुरंत जीएसटी लेने की आवश्यकता नहीं होती। सरकार ने टर्नओवर की छूट दी हुई है:

- **माल (सामान) बेचने वाले व्यापारी:** यदि आप केवल अपने राज्य के भीतर सामान बेचते हैं, तो **₹40 लाख** तक के सालाना टर्नओवर पर रजिस्ट्रेशन की अनिवार्यता नहीं है (पहाड़ी व विशेष राज्यों में यह सीमा ₹20 लाख है)।
- **सेवा प्रदाता (Service Providers):** यदि आप कोई सर्विस (जैसे कोचिंग, रिपेयरिंग, कंसल्टेंसी) देते हैं, तो सीमा **₹20 लाख** है।
- **अंतर-राज्यीय व्यापार (दूसरे राज्य में बिक्री):** यदि आप अपने राज्य से बाहर सामान बेचते हैं या अमेजन/फ्लिपकार्ट पर बेचते हैं, तो रजिस्ट्रेशन अनिवार्य होता है।
- **स्वैच्छिक (Voluntary) रजिस्ट्रेशन:** कई छोटे व्यापारी इनपुट क्रेडिट का लाभ उठाने और बड़े खरीदारों से जुड़ने के लिए स्वेच्छा से भी रजिस्ट्रेशन लेते हैं।

---

## 3. जीएसटी के घटक: CGST, SGST और IGST

- **राज्य के भीतर बिक्री (Intra-state):** यदि आप अपने ही राज्य के ग्राहक को बेचते हैं, तो टैक्स दो बराबर भागों में बंटता है — **CGST** (केंद्र सरकार) और **SGST** (राज्य सरकार)। जैसे 18% टैक्स में 9% CGST और 9% SGST होगा।
- **राज्य के बाहर बिक्री (Inter-state):** यदि आप दूसरे राज्य में सामान भेजते हैं, तो केवल **IGST** (एकीकृत कर) लगता है।

---

## 4. इनपुट टैक्स क्रेडिट (ITC) का सबसे बड़ा फायदा

इनपुट टैक्स क्रेडिट जीएसटी का सबसे बड़ा लाभ है। जब आप अपनी दुकान के लिए माल खरीदते हैं और पक्के बिल पर जीएसटी देते हैं, तो वह टैक्स आपकी जेब से नहीं जाता।

जब आप ग्राहक को सामान बेचते हैं और उससे टैक्स वसूलते हैं, तो खरीदे गए माल पर चुकाए गए टैक्स को घटाकर बची हुई रकम ही सरकार को जमा करनी होती है।

---

## 5. छोटे व्यापारियों के लिए कंपोजिशन स्कीम

जिन दुकानदारों या छोटे निर्माताओं का सालाना टर्नओवर **₹1.5 करोड़** तक है, वे कंपोजिशन स्कीम चुन सकते हैं:
- इसमें हर महीने के जटिल बिलों के बजाय केवल 1% (ट्रेडर्स के लिए) या 5% (रेस्टोरेंट के लिए) का मामूली फिक्स टैक्स देना होता है।
- रिटर्न हर तिमाही भरना होता है।
- ध्यान रहे: कंपोजिशन व्यापारी ग्राहक से टैक्स नहीं वसूल सकते और न ही इनपुट क्रेडिट ले सकते हैं।
`,
  },
  {
    categorySlug: 'personal-finance-banking',
    subcategorySlug: 'savings',
    slug: 'complete-guide-to-emergency-fund',
    titleEn: 'How to Build an Emergency Fund: The Ultimate Safety Net for Indian Families',
    titleHi: 'इमरजेंसी फंड कैसे बनाएं: हर परिवार के लिए वित्तीय सुरक्षा कवच',
    summaryEn: 'Step-by-step framework to calculate, save, and safely store 3 to 6 months of mandatory living expenses to survive unexpected medical or financial crises.',
    summaryHi: 'अचानक आने वाली बीमारी, नौकरी छूटने या व्यापार में मंदी से बचने के लिए 3 से 6 महीने का आपातकालीन फंड कैसे तैयार करें और इसे कहां रखें।',
    readingTimeMinutes: 5,
    authorName: 'PakkaChittha Financial Editorial Team',
    reviewerName: 'Certified Financial Planner Panel',
    seoTitleEn: 'How to Build an Emergency Fund in India | PakkaChittha Guide',
    seoTitleHi: 'इमरजेंसी फंड बनाने का सही तरीका | पक्काचिट्ठा गाइड',
    seoDescriptionEn: 'Learn how much money to save in an emergency fund, where to invest it safely, and how to avoid taking high-interest personal loans during crises.',
    seoDescriptionHi: 'जानिए इमरजेंसी फंड में कितना पैसा रखना चाहिए, इसे सुरक्षित रखने के सबसे अच्छे विकल्प कौन से हैं और संकट के समय महंगे पर्सनल लोन से कैसे बचें।',
    isFeatured: true,
    contentEn: `## Why Every Household Needs an Emergency Fund

Life is unpredictable. A sudden hospitalization, temporary loss of employment, emergency family travel, or an urgent roof repair can derail family finances if no ready cash is available.

Without an emergency fund, families are often forced to take high-interest loans (24%–36% p.a. from money lenders or credit cards) or sell gold jewellery under distress.

---

## How Much Should Your Emergency Fund Be?

A healthy emergency fund should cover **3 to 6 months of essential living expenses**.

Essential expenses include:
- Monthly grocery and food provisions.
- House rent or home loan EMI.
- Children's school tuition fees.
- Electricity, water, and gas cylinder bills.
- Essential medicines and health insurance premiums.

*Example:* If your family requires ₹25,000 every month for bare essentials, your emergency target is **₹75,000 to ₹1,50,000**.

---

## Where Should You Keep Your Emergency Fund?

The goal of an emergency fund is **Liquidity and Capital Safety**, NOT high returns.

Recommended parking options:
1. **High-yield Savings Bank Account (30%):** Instant access via ATM or UPI at 2:00 AM.
2. **Sweep-in Fixed Deposit or Short-Term FD (50%):** Earns 6.5%–7.5% interest and can be broken instantly online with zero branch visits.
3. **Liquid Mutual Funds (20%):** Ultra-low-risk debt funds with instant redemption up to ₹50,000.
`,
    contentHi: `## इमरजेंसी फंड क्यों जरूरी है?

जीवन में कभी भी अप्रत्याशित संकट आ सकता है — अचानक परिवार में किसी की गंभीर बीमारी, दुकान में नुकसान या नौकरी में रुकावट। ऐसे समय में यदि बचत न हो, तो लोगों को 24% से 36% के भारी ब्याज पर साहूकारों से कर्ज लेना पड़ता है या गहने गिरवी रखने पड़ते हैं।

इमरजेंसी फंड आपके और आपके परिवार के आत्मसम्मान की ढाल है।

---

## कितना इमरजेंसी फंड होना चाहिए?

वित्तीय विशेषज्ञों के अनुसार आपके पास कम से कम **3 से 6 महीने के बुनियादी खर्चों** के बराबर रकम होनी चाहिए।

बुनियादी खर्चों में शामिल हैं:
- घर का राशन और दूध-सब्जी।
- मकान का किराया या होम लोन ईएमआई।
- बच्चों की स्कूल फीस।
- बिजली, पानी और गैस सिलेंडर का बिल।
- जरूरी दवाइयां।

*उदाहरण:* यदि आपके घर का बुनियादी मासिक खर्च ₹20,000 है, तो आपका इमरजेंसी फंड **₹60,000 से ₹1,20,000** होना चाहिए।

---

## इमरजेंसी फंड का पैसा कहां रखें?

इमरजेंसी फंड का मुख्य उद्देश्य मुनाफा कमाना नहीं, बल्कि जरूरत पड़ने पर 10 मिनट में पैसा हाथ में होना है:

1. **सेविंग्स बैंक खाता (30% हिस्सा):** जिसे रात 2 बजे भी यूपीआई या एटीएम से निकाला जा सके।
2. **स्वीप-इन एफडी या बैंक एफडी (70% हिस्सा):** जिस पर 7% तक ब्याज भी मिलता रहे और नेट बैंकिंग से तुरंत तोड़ा भी जा सके।
`,
  },
  {
    categorySlug: 'small-business-shop',
    subcategorySlug: 'shop-management',
    slug: 'how-to-manage-shop-inventory-and-prevent-losses',
    titleEn: 'How to Manage Retail Shop Inventory and Stop Stock Leakage',
    titleHi: 'दुकान का स्टॉक कैसे संभालें और नुकसान से कैसे बचें?',
    summaryEn: 'Proven techniques for shopkeepers to track fast-moving stock, avoid over-purchasing, identify expired goods, and improve inventory turnover.',
    summaryHi: 'खुदरा दुकानदारों के लिए स्टॉक प्रबंधन के व्यावहारिक नियम: बिकने वाले सामान की पहचान, एक्सपायरी नुकसान की रोकथाम और डेड स्टॉक को कैश में बदलना।',
    readingTimeMinutes: 6,
    authorName: 'PakkaChittha Retail Practice Team',
    reviewerName: 'Retail Operations Specialist',
    seoTitleEn: 'Retail Shop Inventory Management Guide | PakkaChittha',
    seoTitleHi: 'दुकान स्टॉक प्रबंधन गाइड | पक्काचिट्ठा',
    seoDescriptionEn: 'Learn how to manage inventory in grocery, apparel, and hardware stores. Prevent dead stock and optimize store working capital.',
    seoDescriptionHi: 'किराना, कपड़ा और हार्डवेयर दुकानों के लिए स्टॉक प्रबंधन के टिप्स। डेड स्टॉक को रोकें और दुकान की पूंजी को सुरक्षित रखें।',
    isFeatured: true,
    contentEn: `## The Hidden Cost of Mismanaged Stock

In any retail business, **unsold stock is your cash locked on shelves**. Many shopkeepers complain of having no cash in hand despite good daily footfall. The reason is almost always excess inventory or slow-moving stock.

### Common Inventory Mistakes:
1. Ordering based on guesswork instead of past sales data.
2. Stocking seasonal or perishable goods without expiry tracking.
3. Not doing a physical stock audit at least once a month.
4. Letting distributor bulk discounts entice you into buying 6 months of inventory.

---

## The ABC Classification Technique for Retailers

Categorize your shop items into three groups:

- **Category A (Fast Moving - 20% items generating 80% sales):** Atta, sugar, oil, popular soaps. Never let these run out. Maintain 1 to 2 weeks buffer.
- **Category B (Medium Moving - 30% items generating 15% sales):** Specialty snacks, branded condiments. Reorder as sold.
- **Category C (Slow Moving - 50% items generating 5% sales):** Expensive gift packs, rarely requested hardware tools. Order only in minimal quantities.
`,
    contentHi: `## स्टॉक में पैसा फंसना: दुकानदारों की सबसे बड़ी समस्या

किसी भी दुकान में अलमारियों पर रखा अनबिका माल वास्तव में आपकी पूंजी (कैश) है जो बंधक बन चुकी है। कई दुकानदार कहते हैं कि "बिक्री तो रोज अच्छी होती है, लेकिन हाथ में पैसा नहीं बचता"। इसका मुख्य कारण यह होता है कि मुनाफा नई खरीद और गैर-जरूरी स्टॉक में उलझ जाता है।

---

## इन्वेंट्री संभालने के 4 अचूक नियम

1. **अंदाजे से नहीं, बिक्री रिकॉर्ड देखकर माल मंगाएं:** जो सामान तेजी से बिकता है (जैसे आटा, तेल, चीनी), उसका हमेशा 10 दिन का स्टॉक रखें।
2. **सप्लायर के डिस्काउंट के लालच में ज्यादा माल न भरें:** 2% अतिरिक्त छूट के चक्कर में 6 महीने का माल खरीद लेना समझदारी नहीं है। वह पैसा बैंक में या दूसरे माल में ज्यादा मुनाफा दे सकता है।
3. **एक्सपायरी डेट वाले सामान को आगे रखें (FIFO नियम):** जो माल पहले आया है, उसे दुकान की रैक पर आगे रखें ताकि वह पहले बिके (First In, First Out)।
4. **हर महीने स्टॉक का मिलान करें:** महीने में एक दिन दुकान के वास्तविक स्टॉक की गिनती करें। इससे चोरी और टूट-फूट का तुरंत पता चल जाता है।
`,
  },
];

async function main() {
  console.log('Seeding PakkaChittha Knowledge Hub categories, subcategories, questions and articles...');

  // 1. Seed Categories & Subcategories
  for (const catData of CATEGORIES_DATA) {
    const { subcategories, ...catFields } = catData;

    const category = await prisma.khCategory.upsert({
      where: { slug: catFields.slug },
      update: {
        nameEn: catFields.nameEn,
        nameHi: catFields.nameHi,
        descriptionEn: catFields.descriptionEn,
        descriptionHi: catFields.descriptionHi,
        icon: catFields.icon,
        displayOrder: catFields.displayOrder,
        isActive: true,
      },
      create: {
        ...catFields,
        isActive: true,
      },
    });

    for (let i = 0; i < subcategories.length; i++) {
      const sub = subcategories[i];
      await prisma.khSubcategory.upsert({
        where: {
          categoryId_slug: {
            categoryId: category.id,
            slug: sub.slug,
          },
        },
        update: {
          nameEn: sub.nameEn,
          nameHi: sub.nameHi,
          displayOrder: i + 1,
          isActive: true,
        },
        create: {
          categoryId: category.id,
          slug: sub.slug,
          nameEn: sub.nameEn,
          nameHi: sub.nameHi,
          displayOrder: i + 1,
          isActive: true,
        },
      });
    }
  }

  console.log(`✓ 15 Categories and their subcategories seeded successfully.`);

  // 2. Seed Sample Questions
  for (const q of SAMPLE_QUESTIONS) {
    const cat = await prisma.khCategory.findUnique({ where: { slug: q.categorySlug } });
    if (!cat) continue;

    let subcatId = null;
    if (q.subcategorySlug) {
      const sub = await prisma.khSubcategory.findUnique({
        where: { categoryId_slug: { categoryId: cat.id, slug: q.subcategorySlug } },
      });
      if (sub) subcatId = sub.id;
    }

    await prisma.khQuestion.upsert({
      where: { slug: q.slug },
      update: {
        titleEn: q.titleEn,
        titleHi: q.titleHi,
        shortAnswerEn: q.shortAnswerEn,
        shortAnswerHi: q.shortAnswerHi,
        detailedAnswerEn: q.detailedAnswerEn,
        detailedAnswerHi: q.detailedAnswerHi,
        simpleExplanationEn: q.simpleExplanationEn,
        simpleExplanationHi: q.simpleExplanationHi,
        practicalExampleEn: q.practicalExampleEn,
        practicalExampleHi: q.practicalExampleHi,
        importantPointsEn: q.importantPointsEn,
        importantPointsHi: q.importantPointsHi,
        referencesEn: q.referencesEn,
        referencesHi: q.referencesHi,
        status: KhStatus.PUBLISHED,
        isFeatured: q.isFeatured ?? false,
        publishedAt: new Date(),
      },
      create: {
        slug: q.slug,
        categoryId: cat.id,
        subcategoryId: subcatId,
        language: KhLanguage.BOTH,
        status: KhStatus.PUBLISHED,
        titleEn: q.titleEn,
        titleHi: q.titleHi,
        shortAnswerEn: q.shortAnswerEn,
        shortAnswerHi: q.shortAnswerHi,
        detailedAnswerEn: q.detailedAnswerEn,
        detailedAnswerHi: q.detailedAnswerHi,
        simpleExplanationEn: q.simpleExplanationEn,
        simpleExplanationHi: q.simpleExplanationHi,
        practicalExampleEn: q.practicalExampleEn,
        practicalExampleHi: q.practicalExampleHi,
        importantPointsEn: q.importantPointsEn,
        importantPointsHi: q.importantPointsHi,
        referencesEn: q.referencesEn,
        referencesHi: q.referencesHi,
        isFeatured: q.isFeatured ?? false,
        publishedAt: new Date(),
        viewCount: Math.floor(Math.random() * 120) + 15,
        helpfulCount: Math.floor(Math.random() * 40) + 5,
      },
    });
  }

  console.log(`✓ Sample Questions seeded successfully.`);

  // 3. Seed Sample Articles
  for (const art of SAMPLE_ARTICLES) {
    const cat = await prisma.khCategory.findUnique({ where: { slug: art.categorySlug } });
    if (!cat) continue;

    let subcatId = null;
    if (art.subcategorySlug) {
      const sub = await prisma.khSubcategory.findUnique({
        where: { categoryId_slug: { categoryId: cat.id, slug: art.subcategorySlug } },
      });
      if (sub) subcatId = sub.id;
    }

    await prisma.khArticle.upsert({
      where: { slug: art.slug },
      update: {
        titleEn: art.titleEn,
        titleHi: art.titleHi,
        summaryEn: art.summaryEn,
        summaryHi: art.summaryHi,
        contentEn: art.contentEn,
        contentHi: art.contentHi,
        readingTimeMinutes: art.readingTimeMinutes,
        authorName: art.authorName,
        reviewerName: art.reviewerName,
        seoTitleEn: art.seoTitleEn,
        seoTitleHi: art.seoTitleHi,
        seoDescriptionEn: art.seoDescriptionEn,
        seoDescriptionHi: art.seoDescriptionHi,
        status: KhStatus.PUBLISHED,
        isFeatured: art.isFeatured ?? false,
        publishedAt: new Date(),
      },
      create: {
        slug: art.slug,
        categoryId: cat.id,
        subcategoryId: subcatId,
        language: KhLanguage.BOTH,
        status: KhStatus.PUBLISHED,
        titleEn: art.titleEn,
        titleHi: art.titleHi,
        summaryEn: art.summaryEn,
        summaryHi: art.summaryHi,
        contentEn: art.contentEn,
        contentHi: art.contentHi,
        readingTimeMinutes: art.readingTimeMinutes,
        authorName: art.authorName,
        reviewerName: art.reviewerName,
        seoTitleEn: art.seoTitleEn,
        seoTitleHi: art.seoTitleHi,
        seoDescriptionEn: art.seoDescriptionEn,
        seoDescriptionHi: art.seoDescriptionHi,
        isFeatured: art.isFeatured ?? false,
        publishedAt: new Date(),
        viewCount: Math.floor(Math.random() * 250) + 40,
        helpfulCount: Math.floor(Math.random() * 80) + 12,
      },
    });
  }

  // Update question and article counts on categories
  const allCategories = await prisma.khCategory.findMany();
  for (const c of allCategories) {
    const [qCount, aCount] = await Promise.all([
      prisma.khQuestion.count({ where: { categoryId: c.id, status: KhStatus.PUBLISHED } }),
      prisma.khArticle.count({ where: { categoryId: c.id, status: KhStatus.PUBLISHED } }),
    ]);
    await prisma.khCategory.update({
      where: { id: c.id },
      data: { questionCount: qCount, articleCount: aCount },
    });
  }

  console.log(`✓ Sample Articles seeded and category counts refreshed.`);
  console.log('✓ Knowledge Hub database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding Knowledge Hub:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

