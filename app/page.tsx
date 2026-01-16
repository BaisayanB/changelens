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

type VerificationResult = {
  area: string;
  confirmedFiles: string[];
  rejectedFiles: string[];
  newlyDiscoveredFiles: string[];
  reasoning: string;
};

type AnalyzeResult =
  | {
      repo: string;
      branch: string;
      techStack: string;
      fileCount: number;
      agent1: {
        hypotheses: Hypothesis[];
      };
      agent2: {
        verifications: VerificationResult[];
      };
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
    setResult(res.ok ? data : { error: data.error });
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

        {result && "agent1" in result && (
          <>
            {/* META */}
            <div className="text-sm text-muted-foreground">
              Repo: {result.repo} · Branch: {result.branch} · Files scanned:{" "}
              {result.fileCount}
            </div>

            <div className="text-sm">
              <strong>Detected Tech Stack:</strong> {result.techStack}
            </div>

            {/* AGENT 1 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Agent 1 — Hypotheses</h2>

              {result.agent1.hypotheses.map((h, i) => (
                <div key={i} className="rounded-md bg-muted p-4 space-y-2">
                  <div className="font-semibold">
                    {h.area}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({h.confidence})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{h.reasoning}</p>
                  <ul className="list-disc pl-5 text-xs font-mono">
                    {h.likelyFiles.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            {/* AGENT 2 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Agent 2 — Verification</h2>

              {result.agent2.verifications.map((v, i) => (
                <div key={i} className="rounded-md border p-4 space-y-3">
                  <div className="font-semibold">{v.area}</div>

                  <div className="text-xs">
                    <strong>Confirmed:</strong>{" "}
                    {v.confirmedFiles.join(", ") || "None"}
                  </div>

                  <div className="text-xs">
                    <strong>Rejected:</strong>{" "}
                    {v.rejectedFiles.join(", ") || "None"}
                  </div>

                  <div className="text-xs">
                    <strong>Unverified deps:</strong>{" "}
                    {v.newlyDiscoveredFiles.join(", ") || "None"}
                  </div>

                  <p className="text-xs text-muted-foreground">{v.reasoning}</p>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
