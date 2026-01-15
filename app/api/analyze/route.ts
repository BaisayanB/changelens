import { NextResponse } from "next/server";
import { parseRepoUrl } from "@/lib/github/parseRepo";
import { fetchRepoTree } from "@/lib/github/fetchTree";
import { generateHypotheses } from "@/lib/agent/Hypothesis";
import { verifyHypothesis } from "@/lib/agent/Verifier";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { repoUrl, changeRequest } = body;

    if (!repoUrl || !changeRequest) {
      return NextResponse.json(
        { error: "repoUrl and changeRequest are required" },
        { status: 400 }
      );
    }

    const { owner, repo, branch } = parseRepoUrl(repoUrl);
    const allFiles = await fetchRepoTree({ owner, repo, branch });
    const analysis = await generateHypotheses({
      files: allFiles,
      changeRequest,
    });
    const verificationResults = await Promise.all(
      analysis.hypotheses.map((hypothesis) =>
        verifyHypothesis({
          hypothesis,
          techStack: analysis.techStack,
          owner,
          repo,
          branch,
          changeRequest,
          allFiles,
        })
      )
    );

    return NextResponse.json({
      repo: `${owner}/${repo}`,
      branch,
      techStack: analysis.techStack,
      change_request: changeRequest,
      hypotheses: analysis.hypotheses,
      verifications: verificationResults,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}