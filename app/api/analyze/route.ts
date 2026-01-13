import { NextResponse } from "next/server";
import { parseRepoUrl } from "@/lib/github/parseRepo";
import { fetchRepoTree } from "@/lib/github/fetchTree";

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
    const files = await fetchRepoTree({ owner, repo, branch });

    return NextResponse.json({
      owner,
      repo,
      branch,
      fileCount: files.length,
      files,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}