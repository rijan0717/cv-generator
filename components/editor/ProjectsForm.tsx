"use client";

import React from "react";
import { CVData, ProjectItem } from "@/types/cv";
import { FolderGit2, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface Props {
  data: CVData;
  onChange: (updates: Partial<CVData>) => void;
}

export default function ProjectsForm({ data, onChange }: Props) {
  const projects = data.projects || [];

  const handleAddProject = () => {
    const newProj: ProjectItem = {
      title: "",
      link: "",
      github: "",
      techStack: "",
      description: "• ",
      order: projects.length,
    };
    onChange({ projects: [...projects, newProj] });
  };

  const handleUpdate = (index: number, updates: Partial<ProjectItem>) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], ...updates };
    onChange({ projects: updated });
  };

  const handleRemove = (index: number) => {
    const updated = projects.filter((_, idx) => idx !== index);
    onChange({ projects: updated });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === projects.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...projects];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChange({ projects: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-blue-600" />
            Projects & Highlights
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Showcase your best open-source, personal, or commercial projects.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddProject}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <FolderGit2 className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-slate-600">No projects added yet.</p>
          <p className="text-xs text-slate-400 mt-1 mb-3">
            Add applications, open-source repos, or case studies.
          </p>
          <button
            type="button"
            onClick={handleAddProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            Add First Project
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((proj, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 shadow-sm"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  #{index + 1} {proj.title || "Untitled Project"}
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
                    disabled={index === projects.length - 1}
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
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={proj.title}
                    onChange={(e) => handleUpdate(index, { title: e.target.value })}
                    placeholder="e.g. AI Resume Generator"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Live Demo Link
                  </label>
                  <input
                    type="url"
                    value={proj.link || ""}
                    onChange={(e) => handleUpdate(index, { link: e.target.value })}
                    placeholder="e.g. https://myproject.com"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GitHub / Source Link
                  </label>
                  <input
                    type="url"
                    value={proj.github || ""}
                    onChange={(e) => handleUpdate(index, { github: e.target.value })}
                    placeholder="e.g. https://github.com/user/project"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Technologies Used (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={proj.techStack || ""}
                    onChange={(e) => handleUpdate(index, { techStack: e.target.value })}
                    placeholder="e.g. Next.js, TypeScript, Tailwind, MongoDB"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Description (Bullet points)
                  </label>
                  <textarea
                    rows={3}
                    value={proj.description}
                    onChange={(e) => handleUpdate(index, { description: e.target.value })}
                    placeholder="• Built a full-stack SaaS platform...&#10;• Integrated Stripe checkout..."
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
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
