export function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error("RAW GEMINI OUTPUT:\n", text);
    throw new Error("Gemini response did not contain JSON.");
  }
  const jsonString = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonString);
  } catch {
    console.error("RAW GEMINI OUTPUT:\n", text);
    throw new Error("Failed to parse Gemini JSON output.");
  }
}