type FetchTreeInput = {
  owner: string;
  repo: string;
  branch: string;
};

type GitHubTreeItem = {
  path: string;
  type: "blob" | "tree";
};

export async function fetchRepoTree({
  owner,
  repo,
  branch,
}: FetchTreeInput): Promise<string[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch repository tree (${response.status})`);
  }

  const data = await response.json();

  if (!Array.isArray(data.tree)) {
    throw new Error("Invalid GitHub tree response");
  }

  const binaryExtensions =
    /\.(png|jpe?g|gif|ico|pdf|zip|tar|gz|exe|dll|so|woff2?|eot|ttf|mp4|mp3)$/i;
  const files = data.tree
    .filter(
      (item: GitHubTreeItem) =>
        item.type === "blob" && !binaryExtensions.test(item.path)
    )
    .map((item: GitHubTreeItem) => item.path)
    .slice(0, 300); // hard safety limit

  return files;
}
