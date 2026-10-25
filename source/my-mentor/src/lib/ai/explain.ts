// Plain-language explanations for every way an AI call can fail. Pure (no imports) so it is tested in Node.
// Principle: the app keeps working without AI; say honestly why the mentor is limited and what still works.

export type AiCode =
  | 'offline'
  | 'not_signed_in'
  | 'consent_required'
  | 'ai_unconfigured'
  | 'daily_cap'
  | 'ai_quota'
  | 'ai_unavailable'
  | 'ai_bad_format'
  | 'slow_down'
  | 'unauthorized'
  | 'bad_request'
  | 'too_large';

type Lang = 'en' | 'hi' | 'hinglish';

const EN: Record<AiCode, string> = {
  offline: "I can't reach the internet right now, so I can't think with AI. Your plans, habits and check-ins still work, and I can still coach from your records.",
  not_signed_in: 'Sign in to use the AI mentor. Your habits and plans still work without it.',
  consent_required: 'AI is switched off for you. Turn it on in Me → Settings → Privacy if you want me to think with AI. Nothing has been sent.',
  ai_unconfigured: "The AI isn't connected yet (the free Gemini key isn't set up). Everything else works, and I can still coach from your records.",
  daily_cap: "You've used today's AI allowance (a cap I set to stay inside the free limit). It resets at midnight. Check-ins, habits and plans still work, and I can coach from your records.",
  ai_quota: "Google's free AI limit is used up for now, so I can't think with AI. Try again later today. Everything else keeps working and I can still coach from your records.",
  ai_unavailable: "The AI service isn't answering right now. Try again in a minute. Everything else keeps working.",
  ai_bad_format: "I couldn't turn that into a clean answer this time. Please try again.",
  slow_down: "That's a lot of messages in a minute. Give me a few seconds and try again.",
  unauthorized: 'Your sign-in has expired. Sign in again to use the AI mentor.',
  bad_request: "Something was wrong with that request. Please try again.",
  too_large: 'That message is too long. Please shorten it.',
};

const HI: Record<AiCode, string> = {
  offline: 'अभी इंटरनेट नहीं है, इसलिए मैं AI से नहीं सोच सकता। आपकी योजनाएँ, आदतें और चेक-इन चलते रहेंगे, और मैं आपके रिकॉर्ड से कोचिंग दे सकता हूँ।',
  not_signed_in: 'AI मेंटर के लिए साइन इन करें। आपकी आदतें और योजनाएँ इसके बिना भी चलेंगी।',
  consent_required: 'आपके लिए AI बंद है। चालू करने के लिए Me → Settings → Privacy में जाएँ। कुछ भी भेजा नहीं गया है।',
  ai_unconfigured: 'AI अभी जुड़ा नहीं है (मुफ़्त Gemini कुंजी सेट नहीं है)। बाकी सब चलता है, और मैं आपके रिकॉर्ड से कोचिंग दे सकता हूँ।',
  daily_cap: 'आज का AI कोटा पूरा हो गया (मुफ़्त सीमा में रहने के लिए तय किया हुआ)। आधी रात को रीसेट होगा। बाकी सब चलता है।',
  ai_quota: 'Google की मुफ़्त AI सीमा अभी पूरी है। थोड़ी देर बाद फिर कोशिश करें। बाकी सब चलता है।',
  ai_unavailable: 'AI सेवा अभी जवाब नहीं दे रही। एक मिनट बाद फिर कोशिश करें।',
  ai_bad_format: 'इस बार मैं साफ़ जवाब नहीं बना पाया। कृपया फिर कोशिश करें।',
  slow_down: 'एक मिनट में बहुत संदेश हो गए। कुछ सेकंड रुककर फिर भेजें।',
  unauthorized: 'आपका साइन-इन समाप्त हो गया है। दोबारा साइन इन करें।',
  bad_request: 'अनुरोध में कुछ गड़बड़ थी। फिर कोशिश करें।',
  too_large: 'संदेश बहुत लंबा है। कृपया छोटा करें।',
};

const HINGLISH: Record<AiCode, string> = {
  offline: 'Abhi internet nahi hai, isliye main AI se nahi soch sakta. Aapke plans, habits aur check-ins chalte rahenge, aur main aapke records se coaching de sakta hoon.',
  not_signed_in: 'AI mentor ke liye sign in karein. Habits aur plans uske bina bhi chalte hain.',
  consent_required: 'Aapke liye AI band hai. Chalu karne ke liye Me → Settings → Privacy mein jaayein. Kuch bhi bheja nahi gaya.',
  ai_unconfigured: 'AI abhi connected nahi hai (free Gemini key set nahi hai). Baaki sab chalta hai, aur main records se coaching de sakta hoon.',
  daily_cap: 'Aaj ka AI quota khatam ho gaya (free limit mein rehne ke liye). Raat 12 baje reset hoga. Baaki sab chalta hai.',
  ai_quota: "Google ki free AI limit abhi poori hai. Thodi der baad try karein. Baaki sab chalta hai.",
  ai_unavailable: 'AI service abhi jawab nahi de rahi. Ek minute baad try karein.',
  ai_bad_format: 'Is baar main saaf jawab nahi bana paya. Please phir try karein.',
  slow_down: 'Ek minute mein bahut messages ho gaye. Kuch seconds ruk kar bhejein.',
  unauthorized: 'Aapka sign-in expire ho gaya hai. Dobara sign in karein.',
  bad_request: 'Request mein kuch gadbad thi. Phir try karein.',
  too_large: 'Message bahut lamba hai. Chhota karein.',
};

export function explain(code: AiCode, lang: Lang = 'en'): string {
  return (lang === 'hi' ? HI : lang === 'hinglish' ? HINGLISH : EN)[code] ?? EN.ai_unavailable;
}

/** Codes where retrying right away is pointless: show the explanation and fall back to the rules-based coach. */
export const FALLBACK_CODES: AiCode[] = ['offline', 'not_signed_in', 'consent_required', 'ai_unconfigured', 'daily_cap', 'ai_quota', 'ai_unavailable', 'unauthorized'];
