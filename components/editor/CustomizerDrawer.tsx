"use client";

import React from "react";
import { CVData } from "@/types/cv";
import {
  Palette,
  Type,
  Maximize2,
  Sparkles,
  Check,
  RotateCcw,
} from "lucide-react";

interface Props {
  data: CVData;
  onChange: (updates: Partial<CVData>) => void;
}

const COLOR_PRESETS = [
  { name: "Ocean Blue", accent: "#2563eb", bg: "#ffffff", text: "#1e293b" },
  { name: "Emerald Pro", accent: "#059669", bg: "#ffffff", text: "#0f172a" },
  { name: "Royal Violet", accent: "#7c3aed", bg: "#ffffff", text: "#0f172a" },
  { name: "Crimson Tech", accent: "#dc2626", bg: "#ffffff", text: "#18181b" },
  { name: "Midnight Gold", accent: "#d97706", bg: "#ffffff", text: "#0f172a" },
  { name: "Slate Mono", accent: "#334155", bg: "#ffffff", text: "#0f172a" },
  { name: "Dark Velvet", accent: "#38bdf8", bg: "#0f172a", text: "#f8fafc" },
];

const FONTS = [
  { id: "Inter", label: "Inter (Modern Sans)" },
  { id: "Roboto", label: "Roboto (Clean Tech)" },
  { id: "Playfair Display", label: "Playfair Display (Executive Serif)" },
  { id: "Montserrat", label: "Montserrat (Geometric Sans)" },
  { id: "Outfit", label: "Outfit (Creative Sans)" },
  { id: "Fira Code", label: "Fira Code (Developer Mono)" },
];

export default function CustomizerDrawer({ data, onChange }: Props) {
  const resetStyles = () => {
    onChange({
      templateId: "modern",
      bgColor: "#ffffff",
      textColor: "#1e293b",
      accentColor: "#2563eb",
      font: "Inter",
      fontSize: "medium",
      spacing: "normal",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-600" />
            Style & Design Studio
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalize your colors, typography, and template layout.
          </p>
        </div>
        <button
          type="button"
          onClick={resetStyles}
          title="Reset to defaults"
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Template Chooser */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Resume Layout Template
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            {
              id: "modern",
              name: "Modern Executive",
              desc: "2-column sidebar, timeline accents",
            },
            {
              id: "classic",
              name: "Classic Corporate",
              desc: "ATS-friendly clean single column",
            },
            {
              id: "creative",
              name: "Creative Minimal",
              desc: "Top gradient banner, bold pills",
            },
            {
              id: "tech",
              name: "Tech / Developer",
              desc: "Terminal style, code tags, GitHub",
            },
          ].map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => onChange({ templateId: tmpl.id as any })}
              className={`p-3 rounded-xl border-2 cursor-pointer transition relative ${
                data.templateId === tmpl.id
                  ? "border-blue-600 bg-blue-50/50 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              {data.templateId === tmpl.id && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
              <h4 className="text-xs font-bold text-slate-800">{tmpl.name}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{tmpl.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Color Themes */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Curated Color Palettes
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COLOR_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() =>
                onChange({
                  accentColor: preset.accent,
                  bgColor: preset.bg,
                  textColor: preset.text,
                })
              }
              className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition ${
                data.accentColor === preset.accent && data.bgColor === preset.bg
                  ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/30"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <span
                className="w-4 h-4 rounded-full shadow-xs shrink-0 border border-black/10"
                style={{ backgroundColor: preset.accent }}
              />
              <span className="truncate text-slate-700 text-[11px]">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Color Pickers */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <label className="block text-xs font-bold text-slate-700">
          Custom Color Pickers
        </label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="block text-[11px] text-slate-600 mb-1">Primary Accent</span>
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1">
              <input
                type="color"
                value={data.accentColor || "#2563eb"}
                onChange={(e) => onChange({ accentColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-[10px] font-mono text-slate-600 truncate uppercase">
                {data.accentColor}
              </span>
            </div>
          </div>

          <div>
            <span className="block text-[11px] text-slate-600 mb-1">Text Color</span>
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1">
              <input
                type="color"
                value={data.textColor || "#1e293b"}
                onChange={(e) => onChange({ textColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-[10px] font-mono text-slate-600 truncate uppercase">
                {data.textColor}
              </span>
            </div>
          </div>

          <div>
            <span className="block text-[11px] text-slate-600 mb-1">Background</span>
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1">
              <input
                type="color"
                value={data.bgColor || "#ffffff"}
                onChange={(e) => onChange({ bgColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-[10px] font-mono text-slate-600 truncate uppercase">
                {data.bgColor}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Typography Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-blue-600" />
          Font Family
        </label>
        <div className="space-y-1.5">
          {FONTS.map((font) => (
            <div
              key={font.id}
              onClick={() => onChange({ font: font.id })}
              className={`p-2.5 rounded-lg border cursor-pointer text-xs transition flex justify-between items-center ${
                data.font === font.id
                  ? "border-blue-600 bg-blue-50/50 font-bold text-blue-800"
                  : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
              }`}
            >
              <span>{font.label}</span>
              {data.font === font.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </div>
          ))}
        </div>
      </div>

      {/* Font Size & Spacing Controls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Font Scaling
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
            {(["compact", "medium", "relaxed"] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => onChange({ fontSize: sz })}
                className={`py-1 text-[11px] font-medium capitalize rounded-md transition ${
                  data.fontSize === sz
                    ? "bg-white text-blue-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Content Density
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
            {(["compact", "normal", "spacious"] as const).map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => onChange({ spacing: sp })}
                className={`py-1 text-[11px] font-medium capitalize rounded-md transition ${
                  data.spacing === sp
                    ? "bg-white text-blue-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {sp}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
