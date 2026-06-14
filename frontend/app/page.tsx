"use client";

import { ArrowRight, Cpu, Gauge, Layers3, Sparkles, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Brand } from "@/components/Brand";

const EXAMPLES = [
  "Design a futuristic 4-seater electric sports sedan with aggressive styling.",
  "Create a luxury black 7-seater electric SUV with air suspension.",
  "Build a rugged off-road SUV with large wheels and high ground clearance.",
  "Engineer a compact hybrid sports car with a low stance and chrome trim.",
];

const FEATURES = [
  {
    Icon: Cpu,
    title: "AI Understanding",
    text: "Gemini converts natural language into constrained engineering parameters — vehicle class, powertrain, dimensions, and styling.",
  },
  {
    Icon: Layers3,
    title: "Asset Assembly",
    text: "The compatible 3D model and component system is selected deterministically from a curated catalog.",
  },
  {
    Icon: Gauge,
    title: "Engineering State",
    text: "Dimensions, performance specs, and cost estimates stay connected in real time as you configure.",
  },
  {
    Icon: Zap,
    title: "Live Twin",
    text: "Every configuration change updates the 3D model and price estimate instantly — no page reloads.",
  },
];

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(EXAMPLES[0]);
  const [focused, setFocused] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (prompt.trim()) router.push(`/generate?prompt=${encodeURIComponent(prompt.trim())}`);
  }

  return (
    <main className="aurora-bg grid-bg min-h-screen">
      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Brand />
        <div className="flex items-center gap-6">
          <span className="hidden text-[10px] uppercase tracking-[.22em] text-white/30 sm:block">
            MVP 01 · Digital Twin Studio
          </span>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] tracking-[.18em] text-emerald-400 uppercase">Live</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.1fr_.9fr] lg:gap-20 lg:py-20">
        <div className="fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.04] px-4 py-2 text-xs">
            <Sparkles size={11} className="text-[#ff5a3c]" />
            <span className="text-white/55">Powered by Gemini structured extraction</span>
          </div>

          <h1 className="max-w-2xl text-5xl font-semibold leading-[.96] tracking-[-0.055em] md:text-6xl lg:text-7xl">
            Describe a vehicle.{" "}
            <span className="gradient-text">Build an editable digital twin.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-8 text-white/45">
            AutoForge translates natural language into validated vehicle parameters, selects the
            right engineering platform, and opens a live 3D configuration workspace.
          </p>

          {/* Prompt form */}
          <form onSubmit={submit} className="mt-10 max-w-2xl">
            <div
              className={`glass rounded-2xl p-3 transition-all duration-300 ${
                focused ? "border-[#ff5a3c]/40 shadow-[0_0_40px_rgba(255,90,60,.08)]" : ""
              }`}
            >
              <textarea
                id="vehicle-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="min-h-28 w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-7 text-white outline-none placeholder:text-white/20"
                placeholder="Describe your vehicle…"
              />
              <div className="flex items-center justify-between border-t border-white/[.07] pt-3">
                <span className="px-4 text-[10px] tracking-[.16em] uppercase text-white/30">
                  Gemini · Structured JSON extraction
                </span>
                <button
                  id="generate-btn"
                  type="submit"
                  className="flex items-center gap-2.5 rounded-xl bg-[#ff5a3c] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#ff7d64] active:scale-[.97]"
                >
                  Generate vehicle
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </form>

          {/* Example chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="rounded-full border border-white/[.08] bg-white/[.03] px-4 py-2 text-left text-xs text-white/40 transition-all hover:border-white/20 hover:text-white/65 hover:bg-white/[.05]"
              >
                {ex.split(" ").slice(0, 7).join(" ")}…
              </button>
            ))}
          </div>
        </div>

        {/* Right panel — spec card */}
        <div className="relative hidden min-h-[580px] lg:block">
          <div className="absolute inset-10 rotate-3 rounded-[2rem] border border-white/[.06] bg-gradient-to-br from-white/[.06] to-transparent" />
          <div className="glass absolute inset-0 -rotate-2 rounded-[2rem] p-8 transition-transform hover:rotate-0 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow">Vehicle specification</div>
                <div className="mt-2 text-xl font-medium">AF / Concept 01</div>
              </div>
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_#34d399] animate-pulse" />
            </div>

            <div className="my-8 h-px bg-white/[.07]" />

            {/* Pipeline steps */}
            <div className="space-y-6">
              {[
                [Cpu,     "AI Understanding",  "Prompt converted into constrained parameters"],
                [Layers3, "Asset Assembly",     "Compatible model and component system selected"],
                [Gauge,   "Engineering State",  "Dimensions, performance, and cost stay connected"],
              ].map(([Icon, title, text]) => {
                const I = Icon as typeof Cpu;
                return (
                  <div key={String(title)} className="flex gap-4">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#ff5a3c]/10 border border-[#ff5a3c]/20">
                      <I size={14} className="text-[#ff5a3c]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{String(title)}</div>
                      <div className="mt-1 text-xs leading-5 text-white/38">{String(text)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* JSON preview */}
            <div className="mt-8 rounded-xl bg-black/40 p-4 font-mono text-[10px] leading-5 text-green-400">
              <div className="text-white/25 mb-1">// Gemini output</div>
              {`{`}<br />
              {`  "vehicle_type": "Sedan",`}<br />
              {`  "powertrain": "EV",`}<br />
              {`  "engine_power": 580,`}<br />
              {`  "color": "#192c46",`}<br />
              {`  "suspension": "air"`}<br />
              {`}`}
            </div>

            {/* Badges */}
            <div className="absolute bottom-8 left-8 right-8 grid grid-cols-3 gap-2">
              {["JSON", "3D TWIN", "LIVE EDIT"].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/[.07] bg-white/[.02] p-3.5 text-center text-[10px] tracking-[.18em] text-white/35"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8 text-center">
          <div className="eyebrow mb-3">Platform capabilities</div>
          <h2 className="text-2xl font-medium tracking-[-0.04em]">Engineering at the speed of thought</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, title, text }) => (
            <div
              key={title}
              className="glass-subtle rounded-2xl p-6 transition-all duration-300 hover:bg-white/[.05] hover:-translate-y-0.5"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5a3c]/10 border border-[#ff5a3c]/20">
                <Icon size={18} className="text-[#ff5a3c]" />
              </div>
              <div className="mb-2 text-sm font-medium text-white">{title}</div>
              <p className="text-xs leading-5 text-white/38">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
