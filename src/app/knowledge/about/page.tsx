import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { 
  BookOpen, 
  ShieldCheck, 
  Heart, 
  Users, 
  CheckCircle2, 
  Scale, 
  Award, 
  ArrowRight,
  HelpCircle,
  Sparkles
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Knowledge Hub | हमारे बारे में एवं उद्देश्य',
  description: 'The story and public mission behind the PakkaChittha Knowledge Hub: empowering Indian citizens, shopkeepers, and small businesses with free, verified legal and tax knowledge.',
};

export default function AboutKnowledgePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Hero Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>पक्काचिट्ठा जन-जागरूकता मिशन • Free Public Knowledge</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          सीखें • समझें • आगे बढ़ें • जागरूक रहें
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          पक्काचिट्ठा ज्ञान केंद्र का एकमात्र उद्देश्य भारत के आम नागरिकों, खुदरा दुकानदारों और छोटे व्यापारियों को उनके कानूनी व वित्तीय अधिकारों के प्रति सशक्त बनाना है।
        </p>
      </div>

      {/* The Big Problem & Our Vision */}
      <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
          <Scale className="w-6 h-6 text-emerald-600" />
          <span>ज्ञान केंद्र की शुरुआत क्यों हुई? (Our Core Purpose)</span>
        </h2>
        <div className="text-sm sm:text-base text-slate-700 leading-relaxed space-y-3">
          <p>
            भारत में 6.3 करोड़ से अधिक सूक्ष्म और लघु व्यापारी (MSMEs) हैं और करोड़ों परिवार हैं जो प्रतिदिन जीएसटी, बैंकिंग, कच्चे बिल, उधारी और सरकारी योजनाओं के जटिल नियमों से जूझते हैं।
          </p>
          <p>
            अक्सर सही जानकारी के अभाव में छोटे दुकानदार अनुचित पेनल्टी, धोखाधड़ी या ग्राहकों द्वारा उधारी न चुकाए जाने की वजह से भारी नुकसान उठाते हैं। इंटरनेट पर उपलब्ध जानकारी या तो बहुत जटिल कानूनी भाषा में होती है या अधूरी होती है।
          </p>
          <p className="font-semibold text-emerald-900 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/60">
            "पक्काचिट्ठा ज्ञान केंद्र" इस खाई को पाटने के लिए बनाया गया है — ताकि कोई भी व्यक्ति बिना किसी शुल्क या लॉगिन के अपने सवालों का प्रमाणित और सरल उत्तर पा सके।
          </p>
        </div>
      </div>

      {/* 4 Pillars of Knowledge Hub */}
      <div className="space-y-6">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center">
          हमारे 4 मूल सिद्धांत (Our Core Pillars)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">100% निशुल्क एवं खुला (100% Free Access)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ज्ञान केंद्र पर कोई पेवॉल, सब्सक्रिप्शन या अनिवार्य साइनअप नहीं है। सभी प्रश्न, उत्तर और लेख सभी के लिए सदैव खुले हैं।
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">प्रमाणित कानून व नियम (Verified Information)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              प्रत्येक उत्तर सीजीएसटी अधिनियम, आयकर अधिनियम, एमएसएमईडी अधिनियम 2006, और आरबीआई दिशा-निर्देशों के आधार पर तैयार किया जाता है।
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">सरल द्विभाषी भाषा (Bilingual - Hindi & English)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              जटिल कानूनी धाराओं को आम बोलचाल की हिंदी और सरल अंग्रेजी में स्पष्ट किया गया है, साथ ही व्यावहारिक व्यापारिक उदाहरण दिए गए हैं।
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              4
            </div>
            <h3 className="text-base font-bold text-slate-900">जन-सहभागिता (Citizen Q&A Platform)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              कोई भी नागरिक या दुकानदार अपना नया सवाल पोर्टल पर पूछ सकता है। हमारी टीम उसका अध्ययन कर उसका प्रमाणित समाधान प्रकाशित करती है।
            </p>
          </div>
        </div>
      </div>

      {/* Editorial & Verification Standards */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-600" />
          <span>संपादकीय नीति एवं सत्यापन प्रक्रिया (Editorial Policy)</span>
        </h2>
        <ul className="space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
            <span>
              <strong>आधिकारिक स्रोतों पर आधारित:</strong> जानकारी केवल भारत सरकार, सीबीआईसी (CBIC), आयकर विभाग, एमएसएमई मंत्रालय और आरबीआई के आधिकारिक नियमों से ली जाती है।
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
            <span>
              <strong>नियमित समीक्षा:</strong> बजट और नए जीएसटी सर्कुलर जारी होने पर सामग्री को समय-समय पर अपडेट किया जाता है।
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
            <span>
              <strong>निष्पक्षता:</strong> किसी भी निजी उत्पाद या कंपनी का पक्षपात किए बिना केवल सटीक कानूनी व व्यावहारिक मार्गदर्शन प्रस्तुत किया जाता है।
            </span>
          </li>
        </ul>
      </div>

      {/* Legal Disclaimer */}
      <div className="p-6 rounded-2xl bg-slate-900 text-slate-300 space-y-2 text-xs leading-relaxed">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>कानूनी एवं शैक्षणिक अस्वीकरण (Disclaimer)</span>
        </h3>
        <p>
          पक्काचिट्ठा ज्ञान केंद्र एक शैक्षणिक एवं जन-जागरूकता मंच है। यहाँ प्रकाशित सामग्री केवल सामान्य जानकारी के लिए है और इसे किसी भी रूप में औपचारिक कानूनी, वित्तीय या कर संबंधी पेशेवर सलाह नहीं माना जाना चाहिए। अपनी विशिष्ट व्यावसायिक परिस्थितियों के लिए हमेशा किसी योग्य चार्टर्ड अकाउंटेंट (CA) या कानूनी विशेषज्ञ से व्यक्तिगत परामर्श लें।
        </p>
      </div>

      {/* Call to action */}
      <div className="text-center pt-4 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">
          क्या आपके मन में कोई सवाल है?
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/knowledge/ask"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow-md"
          >
            <HelpCircle className="w-4 h-4" />
            <span>निशुल्क सवाल पूछें</span>
          </Link>
          <Link
            href="/knowledge/questions"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
          >
            <span>सभी सवाल-जवाब देखें</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

