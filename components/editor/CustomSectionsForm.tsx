"use client";

import React from "react";
import { CVData, CustomSectionItem } from "@/types/cv";
import { Award, Plus, Trash2, Globe2 } from "lucide-react";

interface Props {
  data: CVData;
  onChange: (updates: Partial<CVData>) => void;
}

export default function CustomSectionsForm({ data, onChange }: Props) {
  const customSections = data.customSections || [];

  const handleAddSection = (title = "Certifications") => {
    const newSec: CustomSectionItem = {
      title,
      items: "",
      order: customSections.length,
    };
    onChange({ customSections: [...customSections, newSec] });
  };

  const handleUpdate = (index: number, updates: Partial<CustomSectionItem>) => {
    const updated = [...customSections];
    updated[index] = { ...updated[index], ...updates };
    onChange({ customSections: updated });
  };

  const handleRemove = (index: number) => {
    const updated = customSections.filter((_, idx) => idx !== index);
    onChange({ customSections: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            Custom Sections & Extras
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add Languages, Certifications, Awards, Volunteering, or Publications.
          </p>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleAddSection("Languages")}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition flex items-center gap-1.5"
        >
          <Globe2 className="w-3.5 h-3.5 text-blue-600" />
          + Add Languages
        </button>
        <button
          type="button"
          onClick={() => handleAddSection("Certifications")}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition flex items-center gap-1.5"
        >
          <Award className="w-3.5 h-3.5 text-blue-600" />
          + Add Certifications
        </button>
        <button
          type="button"
          onClick={() => handleAddSection("Honors & Awards")}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5 text-blue-600" />
          + Add Custom Section
        </button>
      </div>

      {customSections.length === 0 ? (
        <div className="text-center py-6 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-400">
          No extra sections added yet. Click one of the buttons above to add languages or certifications.
        </div>
      ) : (
        <div className="space-y-4">
          {customSections.map((sec, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <input
                  type="text"
                  value={sec.title}
                  onChange={(e) => handleUpdate(index, { title: e.target.value })}
                  placeholder="Section Title (e.g. Languages, Certifications)"
                  className="font-bold text-xs text-slate-800 bg-transparent border-b border-blue-400 focus:outline-none px-1"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  title="Delete Section"
                  className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Content / Items (Supports multiline text or bullet points)
                </label>
                <textarea
                  rows={3}
                  value={sec.items}
                  onChange={(e) => handleUpdate(index, { items: e.target.value })}
                  placeholder="• AWS Certified Solutions Architect (2023)&#10;• Certified Kubernetes Administrator"
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
