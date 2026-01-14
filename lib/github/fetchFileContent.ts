type FetchFileInput = {
  owner: string;
  repo: string;
  branch: string;
  path: string;
};

export async function fetchFileContent({
  owner,
  repo,
  branch,
  path,
}: FetchFileInput): Promise<string> {
  const encodedPath = encodeURIComponent(path);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${branch}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch file content: ${path} (${response.status})`
    );
  }

  const data = await response.json();

  if (Array.isArray(data)) {
    throw new Error(`Path "${path}" is a directory, not a file.`);
  }  

  if (data.size > 1000000) {
    throw new Error(`File ${path} is too large (>1MB) to be processed.`);
  }

  if (data.encoding !== "base64" || !data.content) {
    throw new Error(`File ${path} is empty or uses an unsupported encoding.`);
  }

  const buffer = Buffer.from(data.content.replace(/\n/g, ""), "base64");
  return buffer.toString("utf-8");
}