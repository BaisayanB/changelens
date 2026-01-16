import { NextResponse } from "next/server";
import { parseRepoUrl } from "@/lib/github/parseRepo";
import { fetchRepoTree } from "@/lib/github/fetchTree";
import { generateHypotheses } from "@/lib/agent/Hypothesis";
import { verifyHypothesis } from "@/lib/agent/Verifier";

export async function POST(req: Request) {
  try {
    const { repoUrl, changeRequest } = await req.json();
    if (!repoUrl || !changeRequest) {
      return NextResponse.json(
        { error: "repoUrl and changeRequest are required" },
        { status: 400 }
      );
    }

    const { owner, repo, branch } = parseRepoUrl(repoUrl);
    const allFiles = await fetchRepoTree({ owner, repo, branch });

    const hypothesisResult = await generateHypotheses({
      files: allFiles,
      changeRequest,
    });

    const verificationResults = await verifyHypothesis({
      hypotheses: hypothesisResult.hypotheses,
      techStack: hypothesisResult.techStack,
      owner,
      repo,
      branch,
      changeRequest,
      allFiles,
    });

    return NextResponse.json({
      repo: `${owner}/${repo}`,
      branch,
      fileCount: allFiles.length,
      techStack: hypothesisResult.techStack,
      agent1: {
        hypotheses: hypothesisResult.hypotheses,
      },
      agent2: {
        verifications: verificationResults,
      },
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
