export type ParsedRepo = {
  owner: string;
  repo: string;
  branch: string;
};

export function parseRepoUrl(input: string): ParsedRepo {
  if (!input?.trim()) {
    throw new Error("Repository URL is required");
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["github.com", "www.github.com"].includes(url.hostname)) {
    throw new Error("Only github.com repos are supported");
  }

  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error("Invalid GitHub repository URL");
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  const restrictedKeywords = [
    "pulls",
    "pull",
    "issues",
    "issue",
    "actions",
    "projects",
    "security",
    "insights",
    "settings",
    "wiki",
  ];
  if (restrictedKeywords.includes(parts[2])) {
    throw new Error(
      `URLs for ${parts[2]} are not supported. Please provide a repository root or branch URL.`
    );
  }

  let branch = "main";
  if ((parts[2] === "tree" || parts[2] === "blob") && parts[3]) {
    branch = parts[3];
  }

  return { owner, repo, branch };
}
