"use client";

import React from "react";
import { CVData, EducationItem } from "@/types/cv";
import { GraduationCap, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface Props {
  data: CVData;
  onChange: (updates: Partial<CVData>) => void;
}

export default function EducationForm({ data, onChange }: Props) {
  const educations = data.educations || [];

  const handleAddEducation = () => {
    const newEdu: EducationItem = {
      institution: "",
      degree: "",
      fieldOfStudy: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      grade: "",
      description: "",
      order: educations.length,
    };
    onChange({ educations: [...educations, newEdu] });
  };

  const handleUpdate = (index: number, updates: Partial<EducationItem>) => {
    const updated = [...educations];
    updated[index] = { ...updated[index], ...updates };
    onChange({ educations: updated });
  };

  const handleRemove = (index: number) => {
    const updated = educations.filter((_, idx) => idx !== index);
    onChange({ educations: updated });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === educations.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...educations];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChange({ educations: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            Education & Qualifications
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add your degrees, certifications, or academic background.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddEducation}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Education
        </button>
      </div>

      {educations.length === 0 ? (
        <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <GraduationCap className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-slate-600">No education entries yet.</p>
          <p className="text-xs text-slate-400 mt-1 mb-3">
            Add your university, college, or bootcamp qualifications.
          </p>
          <button
            type="button"
            onClick={handleAddEducation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            Add First Education
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {educations.map((edu, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 shadow-sm"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  #{index + 1} {edu.degree || "Degree"} — {edu.institution || "Institution"}
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
                    disabled={index === educations.length - 1}
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
                    Degree / Certificate *
                  </label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => handleUpdate(index, { degree: e.target.value })}
                    placeholder="e.g. B.S. in Computer Science"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    School / University *
                  </label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => handleUpdate(index, { institution: e.target.value })}
                    placeholder="e.g. UC Berkeley"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Field of Study / Major
                  </label>
                  <input
                    type="text"
                    value={edu.fieldOfStudy || ""}
                    onChange={(e) => handleUpdate(index, { fieldOfStudy: e.target.value })}
                    placeholder="e.g. Software Engineering"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GPA / Honors (Optional)
                  </label>
                  <input
                    type="text"
                    value={edu.grade || ""}
                    onChange={(e) => handleUpdate(index, { grade: e.target.value })}
                    placeholder="e.g. GPA 3.9, Magna Cum Laude"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="text"
                    value={edu.startDate}
                    onChange={(e) => handleUpdate(index, { startDate: e.target.value })}
                    placeholder="e.g. 2016-09"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date (or Expected)
                  </label>
                  <input
                    type="text"
                    value={edu.endDate || ""}
                    onChange={(e) => handleUpdate(index, { endDate: e.target.value })}
                    placeholder="e.g. 2020-05"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
