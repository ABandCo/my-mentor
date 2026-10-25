// Crisis detection. If a message suggests self-harm, the mentor drops accountability mode, does NOT call the AI,
// and answers with care and real help lines. Same file lives in src/lib/ai/crisis.ts (a test keeps them identical).

const PATTERNS: RegExp[] = [
  /\b(kill(ing)?\s+myself|end(ing)?\s+(my\s+life|it\s+all)|take\s+my\s+own\s+life)\b/i,
  /\bsuicid(e|al)\b/i,
  /\b(want|wanna|going)\s+to\s+die\b(?!\s+(laughing|laughter|of\s+(laughter|embarrassment|shame|boredom|hunger)))/i,
  /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist)\b/i,
  /\b(hurt|harm|cut)(ting)?\s+myself\b/i,
  /\bself[\s-]?harm\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  // Hinglish (Roman script)
  /\b(mar\s*jana|mar\s*jaun|mar\s*jaoon|marna)\s+(chahta|chahti|chahte)\b/i,
  /\bmar\s*jaane\s+ka\s+man\b/i,
  /\b(jeena|jina)\s+nahi\s+(chahta|chahti)\b/i,
  /\bsuicide\s+(karna|kar\s*lu|kar\s*loon)\b/i,
  /\b(khud\s+ko|apne\s+aap\s+ko)\s+(khatam|nuksan)\b/i,
  /\bjaan\s+de\s*(dena|du|doon)\b/i,
  // Hindi (Devanagari)
  /आत्महत्या/,
  /(मरना|मर\s*जाना)\s*(चाहता|चाहती)/,
  /(जीना|जीने)\s*नहीं\s*(चाहता|चाहती)/,
  /खुद\s*को\s*(खत्म|नुकसान|चोट)/,
  /अपनी\s*जान\s*(दे|ले)/,
];

export function detectCrisis(text: string): boolean {
  return PATTERNS.some((re) => re.test(text));
}

export const CRISIS_REPLY: Record<'en' | 'hi' | 'hinglish', string> = {
  en:
    "I'm really glad you told me. I'm setting aside plans and habits right now. What you're feeling matters more than any task.\n\n" +
    "If you might act on these thoughts, please call 112 (emergency) now, or reach Tele-MANAS, India's free 24x7 mental-health helpline, on 14416. If you can, tell someone close to you where you are and stay with them.\n\n" +
    "You don't have to handle this alone or fix anything tonight. I'm here. Would you like to tell me what's been happening?",
  hi:
    'आपने मुझे बताया, यह अच्छा किया। अभी मैं योजनाएँ और आदतें एक तरफ़ रख रहा हूँ। आप जो महसूस कर रहे हैं वह किसी भी काम से ज़्यादा ज़रूरी है।\n\n' +
    'अगर आपको लगता है कि आप ख़ुद को नुकसान पहुँचा सकते हैं, तो कृपया अभी 112 (आपातकाल) पर कॉल करें, या Tele-MANAS (भारत की निःशुल्क 24x7 मानसिक स्वास्थ्य हेल्पलाइन) 14416 पर बात करें। हो सके तो किसी अपने को बताएँ कि आप कहाँ हैं और उनके साथ रहें।\n\n' +
    'आपको यह अकेले नहीं सँभालना है। मैं यहीं हूँ। क्या आप बताना चाहेंगे कि क्या चल रहा है?',
  hinglish:
    "Aapne mujhe bataya, yeh achha kiya. Abhi main plans aur habits ek taraf rakh raha hoon. Aap jo mehsoos kar rahe hain woh kisi bhi kaam se zyada zaroori hai.\n\n" +
    "Agar aapko lagta hai ki aap khud ko nuksan pahuncha sakte hain, toh please abhi 112 (emergency) par call karein, ya Tele-MANAS (India ki free 24x7 mental-health helpline) 14416 par baat karein. Ho sake toh kisi apne ko batayein ki aap kahan hain aur unke saath rahein.\n\n" +
    'Aapko yeh akele nahi sambhalna hai. Main yahin hoon. Kya aap batana chahenge ki kya chal raha hai?',
};
