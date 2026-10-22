'use server';

import { GoogleGenAI } from '@google/genai';
import { createClient as createServerClient } from '@/lib/supabase/server';

export interface StudyBuddyRequest {
  questionText: string;
  topic: string;
  options: { id: string; text: string }[];
  selectedOption: string;
  correctOption: string;
  explanation: string;
  language?: 'en' | 'hinglish';
}

export interface StudyBuddyResponse {
  success: boolean;
  hint: string;
  language: 'en' | 'hinglish';
  source: 'gemini' | 'pedagogical_engine';
  error?: string;
}

/**
 * Curated pedagogical explanations for common misconceptions across CS topics.
 * Provides instant, zero-latency feedback in English and conversational Hinglish.
 */
function generateFallbackStudyBuddyHint(req: StudyBuddyRequest): string {
  const isHinglish = req.language === 'hinglish';
  const topic = (req.topic || '').toLowerCase();
  const selectedText = req.options.find((o) => o.id === req.selectedOption)?.text || req.selectedOption;
  const correctText = req.options.find((o) => o.id === req.correctOption)?.text || req.correctOption;

  if (isHinglish) {
    if (topic.includes('dynamic') || topic.includes('knapsack') || topic.includes('dp')) {
      return `Dekho dost, aapne "${selectedText}" choose kiya jo common misconception hai. Dynamic Programming mein hum overlapping subproblems ko memoize karte hain taaki recalculation na ho. Sahi approach Option ${req.correctOption} (${correctText}) hai kyunki optimal substructure maintain karna zaroori hai. Fikr mat karo, next try mein phod doge! 🚀`;
    }
    if (topic.includes('binary search') || topic.includes('search')) {
      return `Arre dost, dhyan se socho! Binary Search tabhi chalta hai jab elements already sorted hon, aur middle element se compare karke search space aadhi ho jaati hai. Option ${req.correctOption} (${correctText}) isliye correct hai kyunki boundary conditions aur integer overflow handle karna standard practice hai. Keep going! 💪`;
    }
    if (topic.includes('tree') || topic.includes('bst') || topic.includes('avl')) {
      return `Dekho, Tree structures mein parent aur children ke pointers ka balance rakhna sabse important hai. Option ${req.correctOption} (${correctText}) sahi logic hai kyunki height imbalance ko single ya double rotation se fix kiya jaata hai. Concept clear hai toh agli baar pakka sahi hoga! 🌳`;
    }
    if (topic.includes('graph') || topic.includes('dijkstra') || topic.includes('cycle')) {
      return `Bhai, Graph algorithms mein edge weights aur visited states bohot crucial hote hain! Option ${req.correctOption} (${correctText}) sahi answer hai kyunki greedy choice tabhi valid hoti hai jab negative edges na hon. Agle question par focus karo, you got this! ⚡`;
    }
    return `Dekho dost, aapka answer "${selectedText}" ek understandable mistake hai. Core concept yeh hai ki Option ${req.correctOption} (${correctText}) theoretical invariant satisfy karta hai. Fikr mat karo, mistake se hi learning hoti hai! Agla question attempt karo! ✨`;
  }

  // English fallback
  if (topic.includes('dynamic') || topic.includes('dp')) {
    return `Great effort! Selecting "${selectedText}" is a common pitfall. In Dynamic Programming, we must maintain optimal substructure while avoiding duplicate calculations. Option ${req.correctOption} (${correctText}) correctly handles state memoization. Keep this invariant in mind for the next problem!`;
  }
  if (topic.includes('binary search')) {
    return `Nice try! Remember that Binary Search relies on halving the search space per iteration. Option ${req.correctOption} (${correctText}) is correct because it preserves strict monotonicity and avoids integer overflow during midpoint calculation.`;
  }
  if (topic.includes('tree')) {
    return `Good attempt! In tree structures, traversal orders and subtree invariant properties dictate the balance. Option ${req.correctOption} (${correctText}) correctly guarantees proper subtree height and search efficiency.`;
  }
  return `Good attempt! While "${selectedText}" seems plausible at first, Option ${req.correctOption} (${correctText}) is the intended answer because it directly addresses the underlying algorithmic constraints. Review the hint and tackle the next challenge!`;
}

/**
 * Server Action: AI Study Buddy for Wrong Answers (Stretch Goals #4 & #5).
 * Invokes Gemini 3.8 / 2.5 Flash to generate a friendly pedagogical explanation
 * tailored for regional college students with an English/Hinglish language toggle.
 */
export async function askStudyBuddyAction(
  req: StudyBuddyRequest
): Promise<StudyBuddyResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Permitted for both authenticated students and demo sessions
  const language = req.language || 'en';
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const optionsList = req.options
        .map((o) => `Option ${o.id}: ${o.text}`)
        .join('\n');

      let systemPrompt = '';
      if (language === 'hinglish') {
        systemPrompt = `You are the CODAK AI Study Buddy, a warm, motivating engineering mentor for college students in India.
A student just attempted this Computer Science quiz question and answered INCORRECTLY.
Question: "${req.questionText}"
Topic: "${req.topic}"
Options:
${optionsList}
Student's Chosen Wrong Option: Option ${req.selectedOption}
Correct Option: Option ${req.correctOption}
Reference Explanation: "${req.explanation}"

Task:
Respond in warm, friendly, conversational Indian Hinglish (Hindi written in Roman script mixed with standard English tech terms, e.g. "Dekho dost...", "Bhai, yahan mistake isliye hui kyunki...", "Fikr mat karo...").
Explain in 2-3 punchy, encouraging sentences WHY Option ${req.selectedOption} is mistaken, and give an intuitive mental model for why Option ${req.correctOption} is correct.
Do NOT give away other quiz questions. Keep it encouraging and motivating with 1-2 friendly emojis.`;
      } else {
        systemPrompt = `You are the CODAK AI Study Buddy, an encouraging engineering mentor for computer science students.
A student just attempted this quiz question and answered INCORRECTLY.
Question: "${req.questionText}"
Topic: "${req.topic}"
Options:
${optionsList}
Student's Chosen Wrong Option: Option ${req.selectedOption}
Correct Option: Option ${req.correctOption}
Reference Explanation: "${req.explanation}"

Task:
Provide a clear, pedagogical 2-3 sentence explanation explaining why Option ${req.selectedOption} is mistaken and the intuitive reasoning behind Option ${req.correctOption}.
Be friendly, empathetic, and motivating. Keep it under 60 words.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: systemPrompt,
      });

      if (response && response.text) {
        return {
          success: true,
          hint: response.text.trim(),
          language,
          source: 'gemini',
        };
      }
    } catch (apiErr) {
      console.warn('Gemini Study Buddy API call failed; using fallback engine:', apiErr);
    }
  }

  // Fallback engine
  const fallbackHint = generateFallbackStudyBuddyHint(req);
  return {
    success: true,
    hint: fallbackHint,
    language,
    source: 'pedagogical_engine',
  };
}
