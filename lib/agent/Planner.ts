import { gemini } from "@/lib/geminiClient";
import type { HypothesisResponse } from "./Hypothesis";
import type { VerificationResult } from "./Verifier";

export type FinalImpactReport = {
  summary: string;
  techStack: string;
  confirmedChanges: {
    file: string;
    area: string;
    reason: string;
  }[];
  ruledOutFiles: string[];
  unverifiedDependencies: string[];
  confidenceNotes: string;
  recommendedNextSteps: string[];
};

export async function consolidateImpact(input: {
  changeRequest: string;
  hypothesisResult: HypothesisResponse;
  verifications: VerificationResult[];
}): Promise<FinalImpactReport> {
  const model = gemini.getGenerativeModel({
    model: "gemini-3-pro-preview",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const prompt = `
You are a Senior Software Architect producing a FINAL impact assessment for the proposed code change.

### CONTEXT
- <change_request>: The feature or modification requested by the user
- <hypotheses>: High-level impact hypotheses (structural, unverified)
- <verifications>: Verified results based on real file contents

### MISSION
Reconcile the structural hypotheses (Agent 1) with the code-level verifications (Agent 2).
Your goal is to provide a reliable source of truth for a developer about to implement: "${
    input.changeRequest
  }".

### AUDIT RULES
1. **Source of Truth**: Trust the <verifications> more than the <hypotheses>.
2. **Confirmation**: A file is only "confirmed" if it appears in a "confirmedFiles" list from verification.
3. **Rejection**: If a file was in a hypothesis but later appeared in a "rejectedFiles" list, it must be listed in "ruledOutFiles".
4. **Discovery**: Any "newlyDiscoveredFiles" from verifications are "unverifiedDependencies". You must explain that they were identified via imports/logic but their contents were not directly audited.
5. **No Hallucination**: Do not suggest files or risks not explicitly present in the data.
6. **Ordering**: Sort confirmedChanges by implementation priority (core logic first, edge integrations later).

### OUTPUT FORMAT (STRICT JSON ONLY)
{
  "summary": "Concise assessment covering scope of change, risk level (low/medium/high), and primary impacted areas.",
  "techStack": "${input.hypothesisResult.techStack}",
  "confirmedChanges": [
    { "file": "string", "area": "string", "reason": "Specific code level reason from verification" }
  ],
  "ruledOutFiles": ["string"],
  "unverifiedDependencies": ["string"],
  "confidenceNotes": "Explain where the gaps in knowledge are (e.g., failed file loads or unread dependencies)",
  "recommendedNextSteps": "Concrete, implementation-oriented actions. Avoid generic advice."
}

### DATA
<change_request>
${input.changeRequest}
</change_request>

<hypotheses>
${JSON.stringify(input.hypothesisResult, null, 2)}
</hypotheses>

<verifications>
${JSON.stringify(input.verifications, null, 2)}
</verifications>
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse final impact report");
  }
}
