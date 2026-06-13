import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });
const model = "gemini-2.5-flash";

async function generateFeedback({ subject, maxMarks, questionText, markScheme, studentAnswer }) {
  try {
    if (!apiKey) {
      return "Error occurred: Missing VITE_GEMINI_API_KEY.";
    }

    const prompt = `
You are a strict but helpful teacher marking a student's answer.

Subject: ${subject || "General"}
Maximum marks: ${maxMarks || "Not provided"}
Question:
${questionText}

Mark scheme:
${markScheme}

Student answer:
${studentAnswer}

Give concise, custom feedback for this exact answer.
Include:
1. A score in the format "Score: X/${maxMarks || "total"}".
2. A short overall judgement.
3. What the student did well.
4. What is missing or incorrect compared with the mark scheme.
5. Clear next steps to improve.

The score must be a realistic integer based on the mark scheme and must not exceed ${maxMarks || "the maximum available marks"}.

Do not mention that you are an AI.
`.trim();

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "No response content was returned.";
  } catch (error) {
    console.error("Error generating content:", error);
    return "Error occurred: " + error.message;
  }
}

export { generateFeedback };
