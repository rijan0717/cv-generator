"use client";

import React from "react";
import { CVData, ExperienceItem } from "@/types/cv";
import { Briefcase, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface Props {
  data: CVData;
  onChange: (updates: Partial<CVData>) => void;
}

export default function ExperienceForm({ data, onChange }: Props) {
  const experiences = data.experiences || [];

  const handleAddExperience = () => {
    const newExp: ExperienceItem = {
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "• ",
      order: experiences.length,
    };
    onChange({ experiences: [...experiences, newExp] });
  };

  const handleUpdate = (index: number, updates: Partial<ExperienceItem>) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], ...updates };
    onChange({ experiences: updated });
  };

  const handleRemove = (index: number) => {
    const updated = experiences.filter((_, idx) => idx !== index);
    onChange({ experiences: updated });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === experiences.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...experiences];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChange({ experiences: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            Work Experience
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add your relevant work history starting with your most recent role.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddExperience}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Experience
        </button>
      </div>

      {experiences.length === 0 ? (
        <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-slate-600">No work experience added yet.</p>
          <p className="text-xs text-slate-400 mt-1 mb-3">
            Highlight your past roles, responsibilities, and achievements.
          </p>
          <button
            type="button"
            onClick={handleAddExperience}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            Add First Experience
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {experiences.map((exp, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 shadow-sm"
            >
              {/* Header card toolbar */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  #{index + 1} {exp.position || "Untitled Position"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0}
                    title="Move Up"
                    className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, "down")}
                    disabled={index === experiences.length - 1}
                    title="Move Down"
                    className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    title="Delete"
                    className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Job Title / Position *
                  </label>
                  <input
                    type="text"
                    value={exp.position}
                    onChange={(e) => handleUpdate(index, { position: e.target.value })}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company / Organization *
                  </label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => handleUpdate(index, { company: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={exp.location || ""}
                    onChange={(e) => handleUpdate(index, { location: e.target.value })}
                    placeholder="e.g. New York, NY (or Remote)"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="text"
                      value={exp.startDate}
                      onChange={(e) => handleUpdate(index, { startDate: e.target.value })}
                      placeholder="e.g. 2021-03"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="text"
                      disabled={exp.current}
                      value={exp.current ? "Present" : exp.endDate || ""}
                      onChange={(e) => handleUpdate(index, { endDate: e.target.value })}
                      placeholder="e.g. 2023-11"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`current-job-${index}`}
                  checked={exp.current || false}
                  onChange={(e) =>
                    handleUpdate(index, {
                      current: e.target.checked,
                      endDate: e.target.checked ? "" : exp.endDate,
                    })
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor={`current-job-${index}`}
                  className="text-xs text-slate-700 font-medium cursor-pointer"
                >
                  I currently work here
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Accomplishments / Responsibilities (Use bullet points)
                </label>
                <textarea
                  rows={3}
                  value={exp.description}
                  onChange={(e) => handleUpdate(index, { description: e.target.value })}
                  placeholder="• Developed and deployed scalable microservices...&#10;• Reduced latency by 40%..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
