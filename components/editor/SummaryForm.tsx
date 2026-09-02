"use client";

import React from "react";
import { CVData } from "@/types/cv";
import { Sparkles, Lightbulb } from "lucide-react";

interface Props {
  data: CVData;
  onChange: (updates: Partial<CVData>) => void;
}

const SAMPLE_SUMMARIES = [
  {
    role: "Full Stack Engineer",
    text: "Versatile Full-Stack Engineer with 4+ years of experience developing robust web applications using React, Next.js, Node.js, and MongoDB. Passionate about clean architecture, high test coverage, and building smooth user interfaces.",
  },
  {
    role: "Frontend Developer",
    text: "Creative and detail-oriented Frontend Developer with expertise in modern JavaScript (ES6+), React, TypeScript, and responsive CSS frameworks. Proven track record of improving web performance and accessibility (WCAG).",
  },
  {
    role: "Product / Project Manager",
    text: "Strategic Product Manager experienced in leading cross-functional engineering and design teams from ideation to launch. Adept at agile methodologies, data-driven feature prioritization, and user-centric problem solving.",
  },
];

export default function SummaryForm({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Professional Summary & Objective
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Write 2-4 sentences highlighting your background, core strengths, and career objective.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Summary Text
        </label>
        <textarea
          rows={5}
          value={data.summary || ""}
          onChange={(e) => onChange({ summary: e.target.value })}
          placeholder="e.g. Passionate software engineer with 5+ years of experience..."
          className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed"
        />
      </div>

      {/* Suggested Summary Templates */}
      <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 mb-2">
          <Lightbulb className="w-4 h-4 text-blue-600" />
          Need Inspiration? Click a sample to apply:
        </div>
        <div className="space-y-2">
          {SAMPLE_SUMMARIES.map((sample, idx) => (
            <div
              key={idx}
              onClick={() => onChange({ summary: sample.text })}
              className="p-2.5 rounded-lg bg-white border border-blue-200/80 hover:border-blue-500 hover:shadow-sm cursor-pointer transition text-xs text-slate-700"
            >
              <span className="font-semibold text-blue-700 block mb-0.5">
                {sample.role}
              </span>
              <p className="line-clamp-2 opacity-90">{sample.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
