"use client";

import { useMemo, useState } from "react";

type MatchResult = {
  match_score: number; // percent (0–100)
  matched_skills: string[];
  missing_skills: string[];
};

function Pill({ text, variant = "default" }: { text: string; variant?: "default" | "missing" }) {
  const cls =
    variant === "missing"
      ? "border border-amber-200 bg-amber-50 text-amber-800"
      : "border border-slate-200 bg-white text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${cls}`}>
      {text}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-slate-200">
      <div className="h-2 rounded-full bg-slate-900" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default function Page() {
  const [jobText, setJobText] = useState("");
  const [resumeText, setResumeText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);

  const jobChars = jobText.length;
  const resumeChars = resumeText.length;

  const canCompare = useMemo(() => {
    return jobText.trim().length > 0 && resumeText.trim().length > 0 && !loading;
  }, [jobText, resumeText, loading]);

  const totalJobSkills = useMemo(() => {
    if (!result) return 0;
    return (result.matched_skills?.length || 0) + (result.missing_skills?.length || 0);
  }, [result]);

  async function onCompare() {
    setError(null);
    setResult(null);

    const job_text = jobText.trim();
    const resume_text = resumeText.trim();

    if (!job_text || !resume_text) {
      setError("Paste both the job description and your resume text.");
      return;
    }

    try {
      setLoading(true);

      const resp = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_text, resume_text }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`API error ${resp.status}: ${txt || "Unknown error"}`);
      }

      const data = (await resp.json()) as MatchResult;

      // Minimal validation so UI doesn't crash if backend returns unexpected shape
      const safe: MatchResult = {
        match_score: typeof data.match_score === "number" ? data.match_score : 0,
        matched_skills: Array.isArray(data.matched_skills) ? data.matched_skills : [],
        missing_skills: Array.isArray(data.missing_skills) ? data.missing_skills : [],
      };

      setResult(safe);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function onClear(which: "job" | "resume" | "all") {
    if (which === "job" || which === "all") setJobText("");
    if (which === "resume" || which === "all") setResumeText("");
    setResult(null);
    setError(null);
  }

  function onSwap() {
    setJobText(resumeText);
    setResumeText(jobText);
    setResult(null);
    setError(null);
  }

  async function copyMissing() {
    if (!result?.missing_skills?.length) return;
    try {
      await navigator.clipboard.writeText(result.missing_skills.join(", "));
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">SkillMatch</h1>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
              FastAPI + Next.js
            </span>
          </div>
          <p className="max-w-2xl text-slate-600">
            Paste a job description and your resume text. Get a quick match score and the skills you’re missing.
          </p>
        </div>

        {/* Inputs */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Job */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Job Description</h2>
                <p className="mt-1 text-sm text-slate-500">Paste from LinkedIn, a company site, or a PDF.</p>
              </div>
              <button
                onClick={() => onClear("job")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>

            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Paste job description here..."
              className="mt-4 h-72 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none ring-0 focus:border-slate-400"
            />
            <div className="mt-2 text-xs text-slate-500">{jobChars.toLocaleString()} characters</div>
          </section>

          {/* Resume */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Resume Text</h2>
                <p className="mt-1 text-sm text-slate-500">Paste your resume content (plain text works best).</p>
              </div>
              <button
                onClick={() => onClear("resume")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste resume text here..."
              className="mt-4 h-72 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none ring-0 focus:border-slate-400"
            />
            <div className="mt-2 text-xs text-slate-500">{resumeChars.toLocaleString()} characters</div>
          </section>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onCompare}
              disabled={!canCompare}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Comparing..." : "Compare"}
            </button>

            <button
              onClick={onSwap}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              Swap
            </button>

            <button
              onClick={() => onClear("all")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              Clear all
            </button>
          </div>

          <div className="text-sm text-slate-600">Tip: paste full postings for the best match.</div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Results</h2>
                <div className="flex items-baseline gap-3">
                  <div className="text-4xl font-semibold text-slate-900">
                    {Math.round(result.match_score)}%
                  </div>
                  <div className="text-sm text-slate-500">match score</div>
                </div>
                <ProgressBar value={result.match_score} />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Matched" value={result.matched_skills?.length || 0} />
                <StatCard label="Missing" value={result.missing_skills?.length || 0} />
                <StatCard label="Job skills detected" value={totalJobSkills} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-2 font-medium text-slate-900">Matched skills</div>
                  <div className="flex flex-wrap gap-2">
                    {(result.matched_skills || []).map((s) => (
                      <Pill key={s} text={s} />
                    ))}
                    {(result.matched_skills || []).length === 0 && (
                      <span className="text-sm text-slate-500">None</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-900">Missing skills</div>
                    <button
                      onClick={copyMissing}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      disabled={!result.missing_skills?.length}
                    >
                      Copy
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(result.missing_skills || []).map((s) => (
                      <Pill key={s} text={s} variant="missing" />
                    ))}
                    {(result.missing_skills || []).length === 0 && (
                      <span className="text-sm text-slate-500">None</span>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Only add keywords you genuinely have experience with.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-slate-500">
          Built for quick keyword matching — not a full ATS.
        </footer>
      </div>
    </main>
  );
}
