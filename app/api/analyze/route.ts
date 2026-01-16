import { NextResponse } from "next/server";
import { parseRepoUrl } from "@/lib/github/parseRepo";
import { fetchRepoTree } from "@/lib/github/fetchTree";
import { generateHypotheses } from "@/lib/agent/Hypothesis";

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
    
    const hypothesisResult = await generateHypotheses({
      files: allFiles,
      changeRequest,
    });

    return NextResponse.json({
      repo: `${owner}/${repo}`,
      branch,
      techStack: hypothesisResult.techStack,
      hypotheses: hypothesisResult.hypotheses,
      fileCount: allFiles.length,
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