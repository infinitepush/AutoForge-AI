"use client";

import { CheckCircle2, CircleDot, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Brand } from "@/components/Brand";
import { generateVehicle } from "@/lib/api";

const STEPS = [
  { label: "Understanding design intent",     detail: "Parsing natural language constraints…" },
  { label: "Extracting engineering parameters", detail: "Running Gemini structured JSON extraction…" },
  { label: "Validating vehicle configuration", detail: "Checking schema, bounds, and class rules…" },
  { label: "Selecting vehicle platform",       detail: "Matching asset catalog by type and tags…" },
  { label: "Preparing digital twin",           detail: "Loading 3D configurator workspace…" },
];

function GenerationInner() {
  const params = useSearchParams();
  const router = useRouter();
  const prompt = params.get("prompt") ?? "";
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone]   = useState(false);
  const [result, setResult] = useState<{ vehicle_type?: string; powertrain?: string; model_name?: string } | null>(null);

  useEffect(() => {
    // Animated step progress (cosmetic)
    const timer = setInterval(
      () => setActive((v) => Math.min(v + 1, STEPS.length - 2)),
      700,
    );

    generateVehicle(prompt)
      .then((project) => {
        clearInterval(timer);
        setResult({
          vehicle_type: project.configuration.vehicle_type,
          powertrain:   project.configuration.powertrain,
          model_name:   project.model_name,
        });
        setActive(STEPS.length - 1);
        setDone(true);
        setTimeout(() => router.replace(`/configurator/${project.id}`), 1200);
      })
      .catch((reason) => {
        clearInterval(timer);
        setError(reason.message);
      });

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="aurora-bg grid-bg min-h-screen">
      <nav className="mx-auto flex max-w-7xl items-center px-6 py-6">
        <Brand />
      </nav>

      <section className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center">
        {/* Spinner / done icon */}
        <div className="relative mb-8">
          {done ? (
            <CheckCircle2 size={52} className="text-emerald-400" />
          ) : (
            <Loader2 size={52} className="animate-spin text-[#ff5a3c]" />
          )}
          {!done && (
            <div className="absolute inset-0 rounded-full bg-[#ff5a3c]/10 animate-ping opacity-50" />
          )}
        </div>

        <div className="eyebrow mb-3">
          {done ? "Twin ready" : "Generating vehicle"}
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">
          {done ? "Opening configurator…" : "Turning intent into an editable platform"}
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/40 italic">
          &ldquo;{prompt}&rdquo;
        </p>

        {/* Step list */}
        <div className="glass mt-12 w-full rounded-2xl p-1">
          {STEPS.map((step, i) => {
            const isDone    = i < active;
            const isActive  = i === active;
            const isPending = i > active;
            return (
              <div
                key={step.label}
                className={`flex items-start gap-4 rounded-xl px-5 py-4 transition-all duration-500 ${
                  isActive ? "bg-white/[.04]" : ""
                } ${i < STEPS.length - 1 ? "border-b border-white/[.05]" : ""}`}
              >
                {/* Icon */}
                <span
                  className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300 ${
                    isDone
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                      : isActive
                      ? "border-[#ff5a3c]/60 bg-[#ff5a3c]/15 text-[#ff5a3c]"
                      : "border-white/10 text-white/20"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={14} />
                  ) : isActive ? (
                    <CircleDot size={14} className="animate-pulse" />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>

                <div className="text-left">
                  <div
                    className={`text-sm font-medium transition-colors ${
                      isDone ? "text-emerald-400/80" : isActive ? "text-white" : "text-white/25"
                    }`}
                  >
                    {step.label}
                  </div>
                  {isActive && (
                    <div className="mt-0.5 text-xs text-white/35">{step.detail}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Result preview */}
        {result && (
          <div className="mt-6 w-full rounded-xl border border-emerald-500/20 bg-emerald-500/[.07] px-5 py-4 text-left">
            <div className="label-sm text-emerald-400/70 mb-2">Extracted configuration</div>
            <div className="font-mono text-xs leading-6 text-emerald-300/70">
              <div>Type: {result.vehicle_type}</div>
              <div>Powertrain: {result.powertrain}</div>
              <div>Model: {result.model_name}</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 w-full rounded-xl border border-red-500/30 bg-red-500/[.07] p-5 text-left">
            <div className="mb-1 text-xs font-semibold text-red-400 uppercase tracking-wide">Backend error</div>
            <div className="text-sm text-red-300/80">{error}</div>
            <div className="mt-3 text-xs text-white/30">
              Make sure the FastAPI backend is running on <code className="text-white/50">{process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}</code>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function GeneratePage() {
  return (
    <Suspense>
      <GenerationInner />
    </Suspense>
  );
}
