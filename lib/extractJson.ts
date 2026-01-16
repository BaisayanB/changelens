export function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}$/);

  if (!match) {
    throw new Error("Gemini response did not contain a valid JSON object.");
  }
  try {
    return JSON.parse(match[0]);
  } catch {
    console.error("RAW GEMINI OUTPUT:\n", text);
    throw new Error("Failed to parse Gemini JSON output.");
  }
}