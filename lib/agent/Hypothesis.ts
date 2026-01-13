import { gemini } from "@/lib/geminiClient";

export type Hypothesis = {
  area: string;
  reasoning: string;
  likelyFiles: string[];
  confidence: "low" | "medium" | "high";
};

export type HypothesisResponse = {
  tech_stack_identified: string;
  hypotheses: Hypothesis[];
};

export async function generateHypotheses(input: {
  files: string[];
  changeRequest: string;
}): Promise<HypothesisResponse> {
  const { files, changeRequest } = input;

  if (files.length === 0) {
    return {
      tech_stack_identified: "unknown",
      hypotheses: [],
    };
  }

  const model = gemini.getGenerativeModel({
    model: "gemini-3-pro-preview",
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const prompt = `
You are a Senior Software Architect specializing in code impact analysis. Your goal is to map a user's feature request to a list of file paths.

### CONTEXT
1. <change_request>: The feature or modification requested by the user.
2. <file_paths>: A capped list of file paths from the repository. The list may be incomplete or misleading. Do NOT assume completeness.

### YOUR MISSION
Analyze the file tree to generate hypotheses about which areas of codebase might be impacted by the requested change. You do NOT have file contents yet, so you must rely on file naming conventions, directory structures, and industry-standard patterns.

### INTERNAL REASONING (do not output)
Before generating hypotheses, consider the likely tech stack or framework being used, locate probable entry points or boundaries to identify core logic and how the change request might propagate across layers

### RULES
- Group files by logical "Impact Areas"
- Only reference files that appear in the provided <file_paths> list
- Prefer higher-quality hypotheses over exhaustive lists
- Do NOT attempt to reference or summarize all files
- If no meaningful connection exists, return an empty hypotheses array rather than forcing speculative groupings

### CONFIDENCE GUIDELINES
- "high": Strong structural or semantic alignment with the request
- "medium": Reasonable architectural likelihood
- "low": Indirect or speculative relationship

### OUTPUT FORMAT
Return STRICT JSON ONLY in this format.
{
  "tech_stack_identified": "string",
  "hypotheses": [
    {
      "area": "string",
      "reasoning": "string",
      "likelyFiles": ["string"],
      "confidence": "low" | "medium" | "high"
    }
  ]
}

### DATA
<change_request>
${changeRequest}
</change_request>

<file_paths>
${files.join("\n")}
</file_paths>
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse Gemini hypothesis response");
  }
}
