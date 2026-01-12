"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [change, setChange] = useState("");
  const [result, setResult] = useState(null);
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
    setResult(data);
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
            {loading ? "Analyzing…" : "Analyze Impact"}
          </Button>
        </div>

        {result && (
          <pre className="mt-8 rounded-md bg-muted p-4 text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}
