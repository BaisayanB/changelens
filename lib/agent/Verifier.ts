import { gemini } from "@/lib/geminiClient";
import { fetchFileContent } from "@/lib/github/fetchFileContent";
import type { Hypothesis } from "./Hypothesis";
import { extractJson } from "../extractJson";

export type VerificationResult = {
  area: string;
  confirmedFiles: string[];
  rejectedFiles: string[];
  newlyDiscoveredFiles: string[];
  reasoning: string;
};

type VerifyInput = {
  hypotheses: Hypothesis[];
  techStack: string;
  owner: string;
  repo: string;
  branch: string;
  changeRequest: string;
  allFiles: string[];
};

export async function verifyHypothesis({
  hypotheses,
  techStack,
  owner,
  repo,
  branch,
  changeRequest,
  allFiles,
}: VerifyInput): Promise<VerificationResult[]> {
  if (hypotheses.length === 0) return [];

  const uniqueFiles = Array.from(
    new Set(hypotheses.flatMap((h) => h.likelyFiles))
  );

  const fetchResults = await Promise.all(
    uniqueFiles.map(async (path) => {
      try {
        const content = await fetchFileContent({ owner, repo, branch, path });
        return { path, content, status: "success" as const };
      } catch {
        return { path, content: "", status: "error" as const };
      }
    })
  );

  const successFiles = fetchResults.filter((f) => f.status === "success");
  const failedFiles = fetchResults
    .filter((f) => f.status === "error")
    .map((f) => f.path);

  if (successFiles.length === 0) {
    return hypotheses.map((h) => ({
      area: h.area,
      confirmedFiles: [],
      rejectedFiles: [],
      newlyDiscoveredFiles: [],
      reasoning:
        "None of the candidate files could be loaded; verification could not be performed.",
    }));
  }

  const model = gemini.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const prompt = `
You are a Senior Software Architect verifying the real impact of a proposed code change.

### GLOBAL CONTEXT
- Project Tech Stack: ${techStack}
- Code change requested by user: ${changeRequest}

### DATA
<hypotheses>
Each hypothesis below represents a SEPARATE impact area.
You MUST return exactly ONE verification result per hypothesis, in the SAME ORDER.

${hypotheses
  .map(
    (h, i) => `[${i + 1}] Area: ${h.area}
Confidence: ${h.confidence}
Reasoning: ${h.reasoning}
Candidate Files: ${h.likelyFiles.join("\n")}`
  )
  .join("\n\n")}
</hypotheses>

<failed_to_load>
These files could not be fetched and therefore cannot be verified:
${failedFiles.join("\n")}
</failed_to_load>

<full_file_tree>
Authoritative list of valid file paths.
You may ONLY reference files that appear EXACTLY in this list.
${allFiles.slice(0, 300).join("\n")}
</full_file_tree>

<file_contents>
Verified source code. Do NOT assume anything about files not shown here.
${successFiles.map((f) => `--- FILE: ${f.path} ---\n${f.content}`).join("\n\n")}
</file_contents>

### YOUR TASK
For EACH hypothesis:
1. **Confirm** files that clearly require changes based on their code shown in <file_contents>
2. **Reject** files that do NOT appear relevant after reading the code
3. **Discover** additional required files ONLY IF:
- They are directly referenced via imports, calls, or shared state
- Their paths exist EXACTLY in <full_file_tree>

### RULES
- Base decisions ONLY on the provided file contents and do not assume framework conventions
- Do NOT assume the existence of files not listed in <full_file_tree>
- If evidence is insufficient, explicitly say so in the reasoning
- Prefer correctness and explainability over completeness
- For EVERY hypothesis, you MUST return one result object, if verification is inconclusive, return empty arrays for that hypothesis with reasoning explaining why.

### OUTPUT FORMAT (STRICT JSON ONLY)
Return EXACTLY this structure:
{
  "results" : [
    {
      "area": "string",
      "confirmedFiles": ["string"],
      "rejectedFiles": ["string"],
      "newlyDiscoveredFiles": ["string"],
      "reasoning": "Concrete, code-based explanation. Mention imports, functions, or logic that justify each decision."
    }
  ]
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = extractJson<{ results: VerificationResult[] }>(text);

  if (!Array.isArray(parsed.results)) {
    throw new Error("Verifier returned invalid results structure");
  }
  if (parsed.results.length !== hypotheses.length) {
    throw new Error(
      `Result count mismatch: expected ${hypotheses.length}, got ${parsed.results.length}`
    );
  }
  return parsed.results;
}
