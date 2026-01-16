"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Hypothesis = {
  area: string;
  reasoning: string;
  likelyFiles: string[];
  confidence: "low" | "medium" | "high";
};

type AnalyzeResult =
  | {
      repo: string;
      branch: string;
      techStack: string;
      fileCount: number;
      hypotheses: Hypothesis[];
    }
  | { error: string }
  | null;

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [change, setChange] = useState("");
  const [result, setResult] = useState<AnalyzeResult>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoUrl,
        changeRequest: change,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setResult({ error: data.error });
    } else {
      setResult(data);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">ChangeLens</h1>
          <p className="text-sm text-muted-foreground">
            Analyze the downstream impact of code changes using a multi-step
            Gemini 3 reasoning agent.
          </p>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />

          <Textarea
            placeholder="Describe the change you want to make (e.g. add refresh tokens to auth)"
            value={change}
            onChange={(e) => setChange(e.target.value)}
            rows={4}
          />

          <Button onClick={analyze} disabled={loading}>
            {loading ? "Analyzing…" : "Generate Hypotheses"}
          </Button>
        </div>

        {result && "error" in result && (
          <div className="mt-8 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {result.error}
          </div>
        )}

        {result && "hypotheses" in result && (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              Repo: {result.repo} · Branch: {result.branch} · Files scanned:{" "}
              {result.fileCount}
            </div>

            <div className="text-sm">
              <strong>Detected Tech Stack:</strong> {result.techStack}
            </div>

            {result.hypotheses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No meaningful impact areas detected.
              </p>
            ) : (
              <ul className="space-y-4">
                {result.hypotheses.map((h, i) => (
                  <li key={i} className="rounded-md bg-muted p-4 space-y-2">
                    <div className="font-semibold">
                      {h.area}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({h.confidence})
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {h.reasoning}
                    </div>
                    <ul className="list-disc pl-5 text-xs">
                      {h.likelyFiles.map((f) => (
                        <li key={f} className="font-mono">
                          {f}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
      </div>
    </main>
  );
}
