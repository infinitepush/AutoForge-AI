"use client";

import {
  Camera,
  ChevronRight,
  Layers,
  RotateCcw,
  Save,
  Sliders,
  Zap,
  Settings,
  Download,
  Cpu,
  FileText,
} from "lucide-react";
import { useMemo, useState } from "react";
import { updateVehicle } from "@/lib/api";
import { VehicleConfiguration, VehicleProject, CatalogEntry } from "@/lib/types";
import { VehicleScene } from "./VehicleScene";
import { jsPDF } from "jspdf";

// ─── Vehicle catalog (mirrors assets/model-catalog.json) ────────────────────────
const VEHICLE_CATALOG: CatalogEntry[] = [
  { id: "range-rover-suv",  name: "Range Rover Sport",  vehicle_type: "SUV", public_model: "/models/range-rover-suv.glb",  tags: ["luxury", "premium"],    base_price: 74500 },
  { id: "mahindra-thar",   name: "Mahindra Thar",       vehicle_type: "SUV", public_model: "/models/mahindra-thar.glb",   tags: ["offroad", "rugged"],    base_price: 32000 },
  { id: "mercedes-amg",   name: "Mercedes AMG",         vehicle_type: "SUV", public_model: "/models/mercedes-amg.glb",   tags: ["urban", "executive"],   base_price: 82000 },
  { id: "chevy-suv",      name: "Chevrolet SUV",         vehicle_type: "SUV", public_model: "/models/chevy-suv.glb",      tags: ["family", "practical"],  base_price: 48000 },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ["Exterior", "Interior", "Performance", "Scene", "Engineering"] as const;
type Tab = (typeof TABS)[number];

const PRESET_COLORS = [
  { hex: "#192c46", name: "Atlantic Blue" },
  { hex: "#090b0f", name: "Obsidian Black" },
  { hex: "#e9e9e6", name: "Glacier White" },
  { hex: "#7e1018", name: "Carmine Red" },
  { hex: "#34483b", name: "British Racing Green" },
  { hex: "#a9afb8", name: "Silver Mist" },
];

const PERFORMANCE: Record<string, Record<string, [number, number, number, string]>> = {
  SUV: {
    EV:     [500, 800, 4.2, "AWD permanent"],
    Hybrid: [350, 580, 5.8, "AWD"],
    Petrol: [300, 420, 6.4, "AWD"],
    Diesel: [240, 560, 7.1, "AWD"],
  },
  Sedan: {
    EV:     [580, 900, 3.2, "AWD permanent"],
    Hybrid: [320, 450, 5.4, "RWD"],
    Petrol: [280, 380, 5.9, "RWD"],
    Diesel: [200, 400, 7.8, "FWD"],
  },
  "Sports Car": {
    EV:     [750, 1050, 2.4, "AWD permanent"],
    Hybrid: [510, 700, 3.6, "RWD"],
    Petrol: [480, 620, 3.9, "RWD"],
    Diesel: [350, 720, 5.2, "RWD"],
  },
};

const CAMERA_VIEWS = ["3/4", "front", "side", "rear", "top"] as const;

// Base prices in ₹ Lakh
const BASE_PRICES: Record<string, number> = {
  SUV: 45.0,
  Sedan: 38.0,
  "Sports Car": 55.0,
};

// Component price increments in ₹ Lakh
const OPTION_PRICES: Record<string, number> = {
  // Powertrain
  EV: 3.5,
  Hybrid: 1.8,
  Petrol: 0.0,
  Diesel: 0.5,
  // Engine
  V6: 2.5,
  V8: 4.0,
  V12: 6.5,
  "EV Motor": 3.0,
  // Battery
  75: 4.0,
  100: 5.5,
  120: 7.0,
  // Suspension
  standard: 0.0,
  adaptive: 1.5,
  air: 3.0,
  // Styling / Materials
  metallic: 0.8,
  matte: 1.5,
  gloss: 0.0,
  sport: 0.5,
  offroad: 0.7,
  luxury: 1.2,
  aero: 0.0,
  chrome: 0.4,
  body: 0.2,
  black: 0.0,
  signature: 0.6,
  matrix: 1.0,
  classic: 0.0,
  alcantara: 1.2,
  tan: 0.4,
  cream: 0.6,
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-white/[.06] p-6">
      <h2 className="label-sm mb-5">{title}</h2>
      {children}
    </section>
  );
}

function Pills({
  values,
  value,
  setValue,
}: {
  values: string[];
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((item) => (
        <button
          key={item}
          id={`pill-${item}`}
          onClick={() => setValue(item)}
          className={`flex-1 rounded-full border px-3 py-2 text-xs capitalize transition-all duration-150 ${
            value === item ? "pill-active" : "pill-inactive"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  suffix = "",
  setValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  setValue: (v: number) => void;
}) {
  return (
    <label className="mt-5 block">
      <span className="mb-3 flex justify-between text-xs">
        <span className="text-white/40">{label}</span>
        <b className="text-white font-medium">{value}{suffix}</b>
      </span>
      <input
        className="w-full animate-pulse-subtle"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </label>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit: string;
}) {
  return (
    <div className="stat-card border border-white/[0.04] bg-white/[0.02]">
      <div className="label-sm mb-2 text-white/40">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold text-white tracking-tight">{value}</span>
        <span className="text-xs text-white/30">{unit}</span>
      </div>
    </div>
  );
}

// ─── Main Configurator ───────────────────────────────────────────────────────

export function Configurator({ initial }: { initial: VehicleProject }) {
  const [config, setConfig] = useState<VehicleConfiguration>(initial.configuration);
  const [tab,         setTab]         = useState<Tab>("Exterior");
  const [environment, setEnvironment] = useState("studio");
  const [cameraView,  setCameraView]  = useState("3/4");
  const [saved,       setSaved]       = useState(false);
  const [viewMode,    setViewMode]    = useState<"vehicle" | "engineering">("vehicle");
  const [focusedComponent, setFocusedComponent] = useState<string>("");
  // Platform override state – allows user to switch the 3D model
  const [selectedModelUrl, setSelectedModelUrl] = useState<string>(initial.model);
  const [selectedModelName, setSelectedModelName] = useState<string>(initial.model_name);

  // Live performance stats from lookup table
  const perf = useMemo(() => {
    const vt = config.vehicle_type;
    const pt = config.powertrain;
    return PERFORMANCE[vt]?.[pt] ?? [300, 420, 5.1, "AWD"];
  }, [config.vehicle_type, config.powertrain]);

  const [power, torque, z60, drivetrain] = perf;

  // Deterministic Manufacturing Intelligence metrics
  const mIntelligence = useMemo(() => {
    const vt = config.vehicle_type;
    const pt = config.powertrain;
    const engine = config.engine_type;
    const bat = config.battery_capacity;
    const suspension = config.suspension;
    const seats = config.seats;
    const wheelbase = config.wheelbase;

    // Base Costs (in ₹ Lakh)
    const baseCost = BASE_PRICES[vt] ?? 45.0;
    const engineCost = OPTION_PRICES[engine] ?? 3.0;
    const batCost = (pt === "EV" || pt === "Hybrid") ? (OPTION_PRICES[String(bat)] ?? 5.5) : 0.0;
    const suspCost = OPTION_PRICES[suspension] ?? 0.0;
    const seatCost = Math.max(0, seats - 2) * 0.5;
    
    // Add aesthetic option costs
    let optionsCost = 0;
    optionsCost += OPTION_PRICES[config.paint_finish] ?? 0;
    optionsCost += OPTION_PRICES[config.wheel_style] ?? 0;
    optionsCost += OPTION_PRICES[config.trim_finish] ?? 0;
    optionsCost += OPTION_PRICES[config.headlight_style] ?? 0;
    optionsCost += OPTION_PRICES[config.upholstery] ?? 0;
    optionsCost += Math.max(0, config.wheel_size - 20) * 0.2; // ₹0.2 Lakh per inch above 20"

    const totalCost = baseCost + engineCost + batCost + suspCost + seatCost + optionsCost;

    // Weights (kg)
    const baseWeight = vt === "SUV" ? 1800 : vt === "Sedan" ? 1500 : 1300;
    const engineWeight = engine === "V6" ? 180 : engine === "V8" ? 230 : engine === "V12" ? 320 : 80;
    const batWeight = (pt === "EV" || pt === "Hybrid") ? (bat === 75 ? 450 : bat === 100 ? 550 : 650) : 0;
    const seatWeight = seats * 25;
    const wbWeight = (wheelbase - 2700) * 0.5;
    const totalWeight = baseWeight + engineWeight + batWeight + seatWeight + wbWeight;

    // Complexity Score (0 - 100)
    const baseComp = 40;
    const engineComp = engine === "V6" ? 5 : engine === "V8" ? 10 : engine === "V12" ? 20 : 2;
    const batComp = (pt === "EV" || pt === "Hybrid") ? (bat === 75 ? 5 : bat === 100 ? 8 : 12) : 0;
    const suspComp = suspension === "standard" ? 0 : suspension === "adaptive" ? 8 : 15;
    const seatsComp = seats * 2;
    const totalComplexity = Math.min(100, baseComp + engineComp + batComp + suspComp + seatsComp);

    // Range (km)
    let range = 0;
    if (pt === "EV") {
      range = Math.round(bat * 5.8 - (totalWeight - 1800) * 0.12);
    } else if (pt === "Hybrid") {
      range = Math.round(bat * 3.2 + 450);
    }

    return {
      cost: totalCost,
      weight: totalWeight,
      complexity: totalComplexity,
      range,
      base: baseCost,
      options: totalCost - baseCost,
    };
  }, [config]);

  // AI Interpretation decisions summary
  const aiInterpretation = useMemo(() => {
    const decisions = [];
    decisions.push(`Selected ${config.vehicle_type} Platform based on style intent.`);
    decisions.push(`Inferred ${config.powertrain} Powertrain configuration.`);
    decisions.push(`Selected ${config.chassis_length.toUpperCase()} Chassis length (${config.wheelbase}mm wheelbase).`);
    decisions.push(`Assigned ${config.engine_type} powertrain block layout.`);
    if (config.powertrain === "EV" || config.powertrain === "Hybrid") {
      decisions.push(`Assigned ${config.battery_capacity} kWh Energy storage system.`);
    }
    decisions.push(`Configured ${config.seats} seat layout for target occupancy.`);
    decisions.push(`Set ${config.ground_clearance}mm ground clearance with ${config.suspension} suspension.`);
    return decisions;
  }, [config]);

  const set = <K extends keyof VehicleConfiguration>(key: K, value: VehicleConfiguration[K]) => {
    setConfig((old) => {
      const updated = { ...old, [key]: value };
      
      // Auto-adjust engine type if powertrain switches to/from EV
      if (key === "powertrain") {
        if (value === "EV") {
          updated.engine_type = "EV Motor";
        } else if (old.engine_type === "EV Motor") {
          updated.engine_type = "V6";
        }
      }
      return updated;
    });
  };

  function resetConfig() {
    setConfig(initial.configuration);
  }

  async function save() {
    await updateVehicle(initial.id, config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Export Engineering Report PDF using jsPDF
  function generateReport() {
    const doc = new jsPDF();
    doc.setFont("helvetica");

    // Header Band
    doc.setFillColor(10, 14, 23);
    doc.rect(0, 0, 210, 48, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("AUTOFORGE AI — DIGITAL TWIN REPORT", 16, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 90, 60);
    doc.text("ENGINEERING SYNTHESIS & CONFIGURATION DETAILS", 16, 28);
    
    doc.setTextColor(148, 163, 184);
    doc.text(`Digital Twin ID: ${initial.id}`, 16, 38);
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 130, 38);

    // Section 1: Overview
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("1. General Specification", 16, 62);
    doc.setDrawColor(226, 232, 240);
    doc.line(16, 65, 194, 65);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Model Platform: ${initial.model_name}`, 16, 74);
    doc.text(`Vehicle Class: ${config.vehicle_type}`, 16, 82);
    doc.text(`Powertrain Architecture: ${config.powertrain}`, 16, 90);
    doc.text(`Seating Layout: ${config.seats} Seats`, 16, 98);

    doc.text(`Wheelbase: ${config.wheelbase} mm (${config.chassis_length} chassis)`, 110, 74);
    doc.text(`Ground Clearance: ${config.ground_clearance} mm`, 110, 82);
    doc.text(`Drive Configuration: ${drivetrain}`, 110, 90);
    doc.text(`Suspension Type: ${config.suspension} suspension`, 110, 98);

    // Prompt Box
    doc.setFillColor(248, 250, 252);
    doc.rect(16, 106, 178, 24, "F");
    doc.setDrawColor(241, 245, 249);
    doc.rect(16, 106, 178, 24, "S");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Original Ingested Design Prompt:", 20, 113);
    const splitPrompt = doc.splitTextToSize(initial.prompt, 170);
    doc.text(splitPrompt, 20, 120);

    // Section 2: Powertrain & Energy Subsystems
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("2. Subsystem Engineering Parameters", 16, 145);
    doc.setDrawColor(226, 232, 240);
    doc.line(16, 148, 194, 148);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Engine block type: ${config.engine_type}`, 16, 157);
    doc.text(`Engine peak power: ${power} hp`, 16, 165);
    doc.text(`Engine peak torque: ${torque} Nm`, 16, 173);
    
    if (config.powertrain === "EV" || config.powertrain === "Hybrid") {
      doc.text(`Traction battery capacity: ${config.battery_capacity} kWh`, 110, 157);
      doc.text(`Traction battery sizing: ${config.battery_capacity === 75 ? "Compact skateboard" : config.battery_capacity === 100 ? "Medium deck" : "Full deck skateboard"}`, 110, 165);
    } else {
      doc.text("Traction battery capacity: N/A (Internal Combustion Only)", 110, 157);
    }
    doc.text(`0 to 60 mph performance: ${z60} s`, 110, 173);

    // Section 3: Manufacturing Intelligence
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("3. Manufacturing Analytics & Diagnostics", 16, 192);
    doc.setDrawColor(226, 232, 240);
    doc.line(16, 195, 194, 195);

    // Table headers
    doc.setFillColor(241, 245, 249);
    doc.rect(16, 202, 178, 8, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text("ANALYTIC METRIC", 20, 207);
    doc.text("ENGINEERING QUANTITY / ESTIMATE", 110, 207);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.rect(16, 210, 178, 36, "S");
    
    doc.text("Manufacturing cost estimate:", 20, 217);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${mIntelligence.cost.toFixed(2)} Lakh`, 110, 217);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Estimated structural weight:", 20, 225);
    doc.text(`${mIntelligence.weight.toFixed(0)} kg`, 110, 225);
    
    doc.text("Manufacturing complexity index:", 20, 233);
    doc.text(`${mIntelligence.complexity} / 100`, 110, 233);
    
    doc.text("Computed drive range:", 20, 241);
    doc.text(config.powertrain === "EV" || config.powertrain === "Hybrid" ? `${mIntelligence.range} km` : "N/A", 110, 241);

    // Footer signature block
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("AUTOFORGE CAD MODEL SYNTHESIS WORKSPACE DIGITAL TWIN SYSTEM PLATFORM", 40, 275);
    doc.text("CONFIDENTIAL DESIGN SPECIFICATION FOR REVIEW ONLY", 68, 280);

    // Save File
    doc.save(`AutoForge-Report-${initial.id.substring(0, 8)}.pdf`);
  }

  const tabIcon: Record<Tab, React.ReactNode> = {
    Exterior:    <Layers size={12} />,
    Interior:    <Sliders size={12} />,
    Performance: <Zap size={12} />,
    Scene:       <Camera size={12} />,
    Engineering: <Settings size={12} />,
  };

  const COMPONENT_TREE = [
    { id: "Chassis", name: "Chassis Frame", desc: "Ladder-frame rails & members" },
    { id: "Engine", name: "Powertrain / Engine", desc: "Block & cylinder geometry" },
    { id: "Suspension", name: "Suspension struts", desc: "Coils, damper cylinder" },
    { id: "Battery", name: "Skateboard Battery", desc: "Cells & casing deck", evOnly: true },
    { id: "Seating", name: "Interior seat rows", desc: "Seat frames & layouts" },
  ];

  return (
    <main className="h-screen overflow-hidden bg-[#04060a]">
      <div className="grid h-full lg:grid-cols-[1fr_420px]">

        {/* ── 3D Viewport ── */}
        <section className="relative min-h-[45vh]">
          <VehicleScene
            model={selectedModelUrl}
            config={config}
            environment={environment}
            cameraView={cameraView}
            viewMode={viewMode}
            focusedComponent={focusedComponent}
          />

          {/* Top-left overlay */}
          <div className="pointer-events-none absolute left-7 top-7 select-none z-10">
            <div className="eyebrow mb-1.5 text-white/40">AutoForge AI / Digital Twin</div>
            <div className="text-2xl font-semibold tracking-tight text-white">{selectedModelName}</div>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] tracking-widest text-white/60 uppercase">
                {config.vehicle_type}
              </span>
              <span className="rounded-full bg-[#ff5a3c]/15 border border-[#ff5a3c]/30 px-2.5 py-1 text-[10px] tracking-widest text-[#ff5a3c] uppercase">
                {config.powertrain}
              </span>
              {initial.extraction_mode === "gemini" && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] tracking-widest text-emerald-400 uppercase">
                  Gemini Agent
                </span>
              )}
            </div>
          </div>

          {/* Top-right — View Mode switch */}
          <div className="absolute right-7 top-7 z-10">
            <div className="flex rounded-full border border-white/10 bg-black/60 p-0.5 backdrop-blur-md">
              <button
                onClick={() => {
                  setViewMode("vehicle");
                  setFocusedComponent("");
                }}
                className={`rounded-full px-4 py-2 text-[10px] tracking-[.18em] uppercase transition-all duration-200 ${
                  viewMode === "vehicle"
                    ? "bg-[#ff5a3c] text-white font-medium"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                🚗 Vehicle View
              </button>
              <button
                onClick={() => setViewMode("engineering")}
                className={`rounded-full px-4 py-2 text-[10px] tracking-[.18em] uppercase transition-all duration-200 ${
                  viewMode === "engineering"
                    ? "bg-[#ff5a3c] text-white font-medium"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                ⚙️ Engineering View
              </button>
            </div>
          </div>

          {/* Bottom-left hint */}
          <div className="absolute bottom-7 left-7 rounded-full border border-white/[.07] bg-black/50 px-4 py-2 text-xs text-white/35 backdrop-blur-md">
            Drag to rotate · Scroll to zoom · Right-click to pan
          </div>

          {/* Bottom-right — quick camera buttons */}
          <div className="absolute bottom-7 right-7 flex gap-2 z-10">
            {CAMERA_VIEWS.map((v) => (
              <button
                key={v}
                id={`cam-${v}`}
                onClick={() => {
                  setCameraView(v);
                  // Turn off focused component zoom to allow full vehicle preset viewing
                  setFocusedComponent("");
                }}
                className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors backdrop-blur-md ${
                  cameraView === v
                    ? "border-[#ff5a3c]/60 bg-[#ff5a3c]/15 text-[#ff5a3c]"
                    : "border-white/[.07] bg-black/40 text-white/35 hover:text-white/60"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </section>

        {/* ── Config Panel ── */}
        <aside className="flex h-screen flex-col overflow-hidden border-l border-white/[.06] bg-[#090b0f] select-none">

          {/* Sticky header */}
          <header className="border-b border-white/[.06] bg-[#090b0f]/95 px-6 py-5 backdrop-blur-md">
            <div className="eyebrow mb-1 text-white/40">Configuration Platform</div>
            <h1 className="text-xl font-medium text-white tracking-tight">
              Build {selectedModelName}
            </h1>
            <p className="mt-1.5 text-xs leading-5 text-white/35 italic line-clamp-2">&ldquo;{initial.prompt}&rdquo;</p>

            {/* AI Platform Selection banner */}
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">✦ AI Selected Platform</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-emerald-400 text-xs">✓</span>
                <span className="text-white text-xs font-semibold">{initial.model_name}</span>
              </div>
              {initial.selection_reason && (
                <div className="text-[10px] text-white/40 mb-3">{initial.selection_reason}</div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 shrink-0">Override:</span>
                <select
                  id="platform-override"
                  value={selectedModelUrl}
                  onChange={(e) => {
                    const entry = VEHICLE_CATALOG.find(v => v.public_model === e.target.value);
                    if (entry) {
                      setSelectedModelUrl(entry.public_model);
                      setSelectedModelName(entry.name);
                    }
                  }}
                  className="flex-1 rounded-lg border border-white/10 bg-white/[.04] px-2 py-1.5 text-xs text-white/80 focus:border-[#ff5a3c]/50 focus:outline-none transition-colors"
                >
                  {VEHICLE_CATALOG.map((v) => (
                    <option key={v.id} value={v.public_model} style={{ background: "#090b0f" }}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </header>

          {/* Sticky tabs */}
          <div className="flex border-b border-white/[.06] bg-[#090b0f] flex-shrink-0">
            {TABS.map((t) => (
              <button
                key={t}
                id={`tab-${t.toLowerCase()}`}
                onClick={() => setTab(t)}
                className={`flex flex-1 flex-col items-center gap-1 px-1 py-3 text-[9px] uppercase tracking-[.14em] transition-colors ${
                  tab === t ? "tab-active" : "tab-inactive"
                }`}
              >
                {tabIcon[t]}
                <span className="mt-1">{t}</span>
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── EXTERIOR ── */}
            {tab === "Exterior" && (
              <>
                <Section title="Body Colour">
                  <div className="mb-4 grid grid-cols-6 gap-2.5">
                    {PRESET_COLORS.map(({ hex, name }) => (
                      <button
                        key={hex}
                        id={`color-${name.replace(/\s/g,"-").toLowerCase()}`}
                        aria-label={name}
                        title={name}
                        onClick={() => set("color", hex)}
                        style={{ background: hex }}
                        className={`aspect-square rounded-lg border-2 transition-all duration-150 ${
                          config.color === hex
                            ? "border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                            : "border-transparent hover:border-white/30 hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.color}
                      onChange={(e) => set("color", e.target.value)}
                      className="h-10 w-16 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                    />
                    <div className="flex-1 h-10 rounded-lg border border-white/[.08]" style={{ background: config.color }} />
                  </div>
                </Section>

                <Section title="Paint Finish">
                  <Pills
                    values={["gloss", "metallic", "matte"]}
                    value={config.paint_finish}
                    setValue={(v) => set("paint_finish", v as VehicleConfiguration["paint_finish"])}
                  />
                </Section>

                <Section title="Wheel Style">
                  <Pills
                    values={["aero", "sport", "offroad", "luxury"]}
                    value={config.wheel_style}
                    setValue={(v) => set("wheel_style", v as VehicleConfiguration["wheel_style"])}
                  />
                  <SliderField
                    label="Wheel size"
                    value={config.wheel_size}
                    min={18}
                    max={23}
                    suffix={`"`}
                    setValue={(v) => set("wheel_size", v)}
                  />
                </Section>

                <Section title="Glass & Trim">
                  <SliderField
                    label="Window tint"
                    value={config.window_tint}
                    min={0}
                    max={90}
                    suffix="%"
                    setValue={(v) => set("window_tint", v)}
                  />
                  <div className="mt-5">
                    <div className="label-sm mb-3">Trim finish</div>
                    <Pills
                      values={["black", "chrome", "body"]}
                      value={config.trim_finish}
                      setValue={(v) => set("trim_finish", v as VehicleConfiguration["trim_finish"])}
                    />
                  </div>
                </Section>

                <Section title="Headlights">
                  <Pills
                    values={["matrix", "signature", "classic"]}
                    value={config.headlight_style}
                    setValue={(v) => set("headlight_style", v as VehicleConfiguration["headlight_style"])}
                  />
                  <p className="mt-3 text-xs leading-5 text-white/30">
                    {config.headlight_style === "matrix"
                      ? "Adaptive LED matrix — 1,024 individually controlled segments"
                      : config.headlight_style === "signature"
                      ? "Laser signature DRL with blue-tinted beam"
                      : "Classic halogen with chrome reflector housing"}
                  </p>
                </Section>
              </>
            )}

            {/* ── INTERIOR ── */}
            {tab === "Interior" && (
              <>
                <Section title="Upholstery">
                  <Pills
                    values={["black", "tan", "cream", "alcantara"]}
                    value={config.upholstery}
                    setValue={(v) => set("upholstery", v as VehicleConfiguration["upholstery"])}
                  />
                </Section>

                <Section title="Ambient Lighting">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="color"
                      value={config.ambient_color}
                      onChange={(e) => set("ambient_color", e.target.value)}
                      className="h-12 w-20 rounded-lg border border-white/10 cursor-pointer"
                    />
                    <div
                      className="flex-1 h-12 rounded-lg border border-white/[.08]"
                      style={{
                        background: `linear-gradient(135deg, ${config.ambient_color}22, ${config.ambient_color}88)`,
                        boxShadow: `0 0 20px ${config.ambient_color}44 inset`,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["#ff5a3c","#3b82f6","#10b981","#a855f7","#f59e0b","#ffffff"].map((c) => (
                      <button
                        key={c}
                        aria-label={c}
                        onClick={() => set("ambient_color", c)}
                        style={{ background: c }}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${config.ambient_color === c ? "border-white scale-110" : "border-transparent"}`}
                      />
                    ))}
                  </div>
                </Section>

                <Section title="Seating">
                  <SliderField
                    label="Seat count"
                    value={config.seats}
                    min={2}
                    max={7}
                    suffix=" seats"
                    setValue={(v) => set("seats", v)}
                  />
                </Section>
              </>
            )}

            {/* ── PERFORMANCE ── */}
            {tab === "Performance" && (
              <>
                <section className="border-b border-white/[.06] p-6">
                  <h2 className="label-sm mb-4">Live performance stats</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Power"    value={power}  unit="hp" />
                    <StatCard label="Torque"   value={torque} unit="Nm" />
                    <StatCard label="0–60 mph" value={z60}    unit="s" />
                    <StatCard label="Drivetrain" value={drivetrain} unit="" />
                  </div>
                </section>

                <Section title="Powertrain">
                  <div className="grid grid-cols-2 gap-2.5">
                    {["EV", "Hybrid", "Petrol", "Diesel"].map((pt) => {
                      const [pw, tq, z] = PERFORMANCE[config.vehicle_type]?.[pt] ?? [0,0,0];
                      const active = config.powertrain === pt;
                      return (
                        <button
                          key={pt}
                          id={`pt-${pt.toLowerCase()}`}
                          onClick={() => set("powertrain", pt as VehicleConfiguration["powertrain"])}
                          className={`rounded-xl border p-4 text-left transition-all duration-150 ${
                            active
                              ? "border-[#ff5a3c]/60 bg-[#ff5a3c]/10"
                              : "border-white/[.07] bg-white/[.025] hover:border-white/15"
                          }`}
                        >
                          <div className={`text-sm font-semibold ${active ? "text-[#ff5a3c]" : "text-white"}`}>{pt}</div>
                          <div className="mt-1.5 text-[10px] text-white/40">{pw} hp · {tq} Nm</div>
                          <div className="text-[10px] text-white/30">0–60 in {z}s</div>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section title="Chassis & Suspension">
                  <div className="mb-1 text-xs text-white/35">Suspension Type</div>
                  <Pills
                    values={["standard", "adaptive", "air"]}
                    value={config.suspension}
                    setValue={(v) => set("suspension", v as VehicleConfiguration["suspension"])}
                  />
                  <div className="mt-5 mb-1 text-xs text-white/35">Drive Mode / Terrain Response</div>
                  <Pills
                    values={["road", "sport", "offroad"]}
                    value={config.terrain_mode}
                    setValue={(v) => set("terrain_mode", v as VehicleConfiguration["terrain_mode"])}
                  />
                  <SliderField
                    label="Ground clearance"
                    value={config.ground_clearance}
                    min={100}
                    max={300}
                    suffix=" mm"
                    setValue={(v) => set("ground_clearance", v)}
                  />
                </Section>
              </>
            )}

            {/* ── SCENE ── */}
            {tab === "Scene" && (
              <>
                <Section title="Environment">
                  <div className="grid grid-cols-3 gap-2.5">
                    {["studio", "sunset", "night"].map((env) => (
                      <button
                        key={env}
                        id={`env-${env}`}
                        onClick={() => setEnvironment(env)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-xs capitalize transition-all ${
                          environment === env
                            ? "border-[#ff5a3c]/60 bg-[#ff5a3c]/10 text-[#ff5a3c]"
                            : "border-white/[.07] text-white/40 hover:border-white/15 hover:text-white/60"
                        }`}
                      >
                        <span className="text-lg">
                          {env === "studio" ? "🏢" : env === "sunset" ? "🌅" : "🌙"}
                        </span>
                        {env}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Camera View">
                  <div className="grid grid-cols-3 gap-2">
                    {CAMERA_VIEWS.map((v) => (
                      <button
                        key={v}
                        id={`scene-cam-${v}`}
                        onClick={() => {
                          setCameraView(v);
                          setFocusedComponent("");
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-[10px] uppercase tracking-[.12em] transition-all ${
                          cameraView === v
                            ? "border-[#ff5a3c]/60 bg-[#ff5a3c]/10 text-[#ff5a3c]"
                            : "border-white/[.07] text-white/40 hover:border-white/15 hover:text-white/60"
                        }`}
                      >
                        <ChevronRight size={10} />
                        {v}
                      </button>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* ── ENGINEERING TAB ── */}
            {tab === "Engineering" && (
              <>
                {/* View Mode Reminder */}
                {viewMode !== "engineering" && (
                  <div className="mx-6 mt-6 rounded-xl border border-[#ff5a3c]/20 bg-[#ff5a3c]/5 p-4 text-xs text-white/60 leading-5">
                    <p className="font-semibold text-[#ff5a3c] mb-1">⚙️ Activate Engineering View</p>
                    For full procedural internals and autofocus highlights, toggle to <b>Engineering View</b> in the top right.
                  </div>
                )}

                {/* AI Engineering Synthesis */}
                <section className="border-b border-white/[.06] p-6">
                  <div className="flex items-center gap-2 mb-4 text-[#ff5a3c]">
                    <Cpu size={14} />
                    <h2 className="text-xs font-semibold uppercase tracking-wider">AI Engineering Synthesis</h2>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 font-mono text-[10px] leading-5 text-white/60 space-y-2">
                    {aiInterpretation.map((decision, index) => (
                      <div key={index} className="flex gap-2">
                        <span className="text-emerald-500">✓</span>
                        <span>{decision}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Interactive Component Tree */}
                <section className="border-b border-white/[.06] p-6">
                  <h2 className="label-sm mb-4">Interactive Component Tree</h2>
                  <div className="space-y-1.5">
                    {COMPONENT_TREE.map((c) => {
                      if (c.evOnly && config.powertrain !== "EV" && config.powertrain !== "Hybrid") {
                        return null;
                      }
                      const active = focusedComponent === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setViewMode("engineering");
                            setFocusedComponent(active ? "" : c.id);
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition-all duration-150 flex items-center justify-between ${
                            active
                              ? "border-[#ff5a3c]/60 bg-[#ff5a3c]/10"
                              : "border-white/[.05] bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03]"
                          }`}
                        >
                          <div>
                            <div className={`text-xs font-semibold ${active ? "text-[#ff5a3c]" : "text-white/80"}`}>
                              {c.name}
                            </div>
                            <div className="text-[10px] text-white/35 mt-0.5">{c.desc}</div>
                          </div>
                          <ChevronRight size={12} className={active ? "text-[#ff5a3c] rotate-90 transition-transform" : "text-white/20"} />
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Powertrain Blocks Selection */}
                <Section title="Powertrain block geometry">
                  <div className="grid grid-cols-2 gap-2.5">
                    {(config.powertrain === "EV" ? ["EV Motor"] : ["V6", "V8", "V12"]).map((block) => {
                      const active = config.engine_type === block;
                      return (
                        <button
                          key={block}
                          onClick={() => set("engine_type", block as any)}
                          className={`rounded-xl border p-4 text-left transition-all duration-150 ${
                            active
                              ? "border-[#ff5a3c]/60 bg-[#ff5a3c]/10"
                              : "border-white/[.07] bg-white/[.025] hover:border-white/15"
                          }`}
                        >
                          <div className={`text-xs font-semibold ${active ? "text-[#ff5a3c]" : "text-white/80"}`}>{block}</div>
                          <div className="text-[9px] text-white/35 mt-1">
                            {block === "V6" ? "6 cylinders · Short block" :
                             block === "V8" ? "8 cylinders · Medium block" :
                             block === "V12" ? "12 cylinders · Long block" :
                             "Transverse brushless DC motor"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                {/* Battery Sizing (EV/Hybrid only) */}
                {(config.powertrain === "EV" || config.powertrain === "Hybrid") && (
                  <Section title="Energy Storage System">
                    <div className="mb-2 text-xs text-white/35">Skateboard battery capacity</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[75, 100, 120].map((cap) => {
                        const active = config.battery_capacity === cap;
                        return (
                          <button
                            key={cap}
                            onClick={() => set("battery_capacity", cap as any)}
                            className={`rounded-xl border py-2.5 text-center text-xs transition-all ${
                              active
                                ? "border-[#ff5a3c]/60 bg-[#ff5a3c]/10 text-[#ff5a3c] font-semibold"
                                : "border-white/[.07] text-white/40 hover:border-white/15"
                            }`}
                          >
                            {cap} kWh
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* Chassis length */}
                <Section title="Chassis Frame Sizing">
                  <div className="mb-2 text-xs text-white/35">Platform Wheelbase Sizing</div>
                  <div className="flex gap-2">
                    {[
                      { id: "short", label: "Short", wb: 2700 },
                      { id: "standard", label: "Standard", wb: 2900 },
                      { id: "long", label: "Long", wb: 3200 },
                    ].map((item) => {
                      const active = config.chassis_length === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            set("chassis_length", item.id as any);
                            set("wheelbase", item.wb);
                          }}
                          className={`flex-1 rounded-xl border py-2.5 text-xs transition-all ${
                            active
                              ? "border-[#ff5a3c]/60 bg-[#ff5a3c]/10 text-[#ff5a3c] font-semibold"
                              : "border-white/[.07] text-white/40 hover:border-white/15"
                          }`}
                        >
                          {item.label} ({item.wb}mm)
                        </button>
                      );
                    })}
                  </div>
                </Section>

                {/* Deterministic Manufacturing Intelligence metrics */}
                <section className="border-b border-white/[.06] p-6 bg-black/10">
                  <div className="flex items-center gap-2 mb-4">
                    <Sliders size={14} className="text-[#ff5a3c]" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-white">Manufacturing Intelligence</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Manufacturing Cost" value={`₹ ${mIntelligence.cost.toFixed(2)}`} unit="Lakh" />
                    <StatCard label="Total Weight" value={mIntelligence.weight.toFixed(0)} unit="kg" />
                    <StatCard label="Complexity Index" value={`${mIntelligence.complexity}`} unit="/ 100" />
                    <StatCard label="Est. Drive Range" value={config.powertrain === "EV" || config.powertrain === "Hybrid" ? mIntelligence.range : "N/A"} unit={config.powertrain === "EV" || config.powertrain === "Hybrid" ? "km" : ""} />
                  </div>
                  <button
                    onClick={generateReport}
                    className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-white/[.03] py-2.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[.08] hover:text-white"
                  >
                    <Download size={13} />
                    Export Engineering Report (PDF)
                  </button>
                </section>
              </>
            )}
          </div>

          {/* ── Sticky footer ── */}
          <footer className="flex-shrink-0 border-t border-white/[.06] bg-[#090b0f]/95 px-6 py-5 backdrop-blur-md">
            {/* Price breakdown */}
            <div className="mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-white/40">
                <span>Base platform cost</span>
                <span>₹ {mIntelligence.base.toFixed(2)} Lakh</span>
              </div>
              <div className="flex justify-between text-white/40">
                <span>Engineering options</span>
                <span>{mIntelligence.options > 0 ? `+₹ ${mIntelligence.options.toFixed(2)} Lakh` : "₹ 0.00"}</span>
              </div>
              <div className="my-2 h-px bg-white/[.06]" />
              <div className="flex items-end justify-between">
                <span className="text-white/60 font-medium">Estimated cost</span>
                <span className="text-xl font-semibold text-white tracking-tight">₹ {mIntelligence.cost.toFixed(2)} Lakh</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                id="reset-config"
                onClick={resetConfig}
                title="Reset configuration"
                className="flex items-center gap-2 rounded-xl border border-white/[.08] px-4 py-3 text-xs text-white/40 hover:border-white/15 hover:text-white/60 transition-colors"
              >
                <RotateCcw size={13} />
                Reset
              </button>
              <button
                id="save-config"
                onClick={save}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff5a3c] py-3 text-sm font-semibold text-white transition-all hover:bg-[#ff7d64] active:scale-[.98]"
              >
                <Save size={15} />
                {saved ? "Configuration saved ✓" : "Save configuration"}
              </button>
            </div>
          </footer>
        </aside>
      </div>
    </main>
  );
}
