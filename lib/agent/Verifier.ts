import { gemini } from "@/lib/geminiClient";
import { fetchFileContent } from "@/lib/github/fetchFileContent";
import type { Hypothesis } from "./Hypothesis";

export type VerificationResult = {
  area: string;
  confirmedFiles: string[];
  rejectedFiles: string[];
  newlyDiscoveredFiles: string[];
  reasoning: string;
};

type VerifyInput = {
  hypothesis: Hypothesis;
  techStack: string;
  owner: string;
  repo: string;
  branch: string;
  changeRequest: string;
  allFiles: string[];
};

export async function verifyHypothesis({
  hypothesis,
  techStack,
  owner,
  repo,
  branch,
  changeRequest,
  allFiles,
}: VerifyInput): Promise<VerificationResult> {
  const fetchResults = await Promise.all(
    hypothesis.likelyFiles.map(async (path) => {
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
    return {
      area: hypothesis.area,
      confirmedFiles: [],
      rejectedFiles: [],
      newlyDiscoveredFiles: [],
      reasoning:
        "None of the candidate files could be loaded; verification could not be performed.",
    };
  }

  const model = gemini.getGenerativeModel({
    model: "gemini-3-pro-preview",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const prompt = `
You are a Senior Software Architect verifying impact of a proposed code change.

### GLOBAL CONTEXT
- Identified Tech Stack: ${techStack} 

### CONTEXT
- <change_request>: The feature or modification requested by the user
- <hypothesis>: A preliminary impact hypothesis that may be incorrect
- <full_file_tree>: The known file paths in the repository (used to resolve dependencies)
- <file_contents>: Source code for candidate files suggested by the hypothesis
- <failed_to_load>: Files that could not be fetched and therefore could not be verified

Your job is to VERIFY the hypothesis using real code.

### YOUR TASK
Using the evidence provided below:
- **Confirm** files that clearly require changes based on their code
- **Reject** files that are not actually relevant
- **Discover** additional files that MUST be involved, ensuring their paths exist in <full_file_tree>

### RULES
- Base decisions ONLY on the provided file contents
- Do NOT assume the existence of files not listed in <full_file_tree>
- If key evidence is missing, state that uncertainty explicitly
- Prefer correctness and explainability over completeness

### OUTPUT FORMAT (STRICT JSON)
{
  "area": "${hypothesis.area}",
  "confirmedFiles": ["string"],
  "rejectedFiles": ["string"],
  "newlyDiscoveredFiles": ["string"],
  "reasoning": "Explain decisions using specific code-level evidence (imports, function names, responsibilities)."
}

### DATA
<change_request>
${changeRequest}
</change_request>

<hypothesis>
Area: ${hypothesis.area}
Confidence: ${hypothesis.confidence}
Reasoning: ${hypothesis.reasoning}
</hypothesis>

<failed_to_load>
${failedFiles.join("\n")}
</failed_to_load>

<full_file_tree>
${allFiles.slice(0, 300).join("\n")}
</full_file_tree>

<file_contents>
${successFiles.map((f) => `--- FILE: ${f.path} ---\n${f.content}`).join("\n\n")}
</file_contents>
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse Gemini verification response");
  }
}
