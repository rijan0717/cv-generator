"use client";

import React, { useState } from "react";
import { CVData, SkillItem } from "@/types/cv";
import { Cpu, Plus, Trash2, Tag } from "lucide-react";

interface Props {
  data: CVData;
  onChange: (updates: Partial<CVData>) => void;
}

const POPULAR_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "MongoDB",
  "PostgreSQL",
  "Prisma",
  "Tailwind CSS",
  "Docker",
  "AWS",
  "GraphQL",
  "REST APIs",
  "Git & GitHub",
  "Communication",
  "Problem Solving",
  "Team Leadership",
];

export default function SkillsForm({ data, onChange }: Props) {
  const skills = data.skills || [];
  const [newSkillName, setNewSkillName] = useState("");
  const [newCategory, setNewCategory] = useState("Technical");
  const [newLevel, setNewLevel] = useState(4);

  const handleAddSkill = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newSkillName.trim()) return;

    const newSkill: SkillItem = {
      name: newSkillName.trim(),
      category: newCategory,
      level: newLevel,
      order: skills.length,
    };

    onChange({ skills: [...skills, newSkill] });
    setNewSkillName("");
  };

  const handleQuickAdd = (skillName: string) => {
    if (skills.some((s) => s.name.toLowerCase() === skillName.toLowerCase())) {
      return;
    }
    const newSkill: SkillItem = {
      name: skillName,
      category: "Technical",
      level: 4,
      order: skills.length,
    };
    onChange({ skills: [...skills, newSkill] });
  };

  const handleUpdate = (index: number, updates: Partial<SkillItem>) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], ...updates };
    onChange({ skills: updated });
  };

  const handleRemove = (index: number) => {
    const updated = skills.filter((_, idx) => idx !== index);
    onChange({ skills: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          Skills & Core Competencies
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          List your technical proficiencies, tools, and interpersonal skills.
        </p>
      </div>

      {/* Add Skill Input Form */}
      <form
        onSubmit={handleAddSkill}
        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap sm:flex-nowrap items-center gap-2"
      >
        <input
          type="text"
          value={newSkillName}
          onChange={(e) => setNewSkillName(e.target.value)}
          placeholder="Skill name (e.g. Next.js, System Design)"
          className="flex-1 min-w-[160px] px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="Technical">Technical</option>
          <option value="Soft Skills">Soft Skills</option>
          <option value="Tools">Tools</option>
          <option value="Languages">Languages</option>
        </select>

        <div className="flex items-center gap-1.5 text-xs text-slate-600 px-2">
          <span>Lvl:</span>
          <select
            value={newLevel}
            onChange={(e) => setNewLevel(parseInt(e.target.value))}
            className="p-1 text-xs border border-slate-300 rounded bg-white"
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={!newSkillName.trim()}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </form>

      {/* Suggested Popular Skills */}
      <div>
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-2">
          <Tag className="w-3.5 h-3.5 text-blue-500" />
          Popular Suggestions (Click to add):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_SKILLS.map((item, idx) => {
            const isAdded = skills.some(
              (s) => s.name.toLowerCase() === item.toLowerCase()
            );
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickAdd(item)}
                disabled={isAdded}
                className={`px-2.5 py-1 text-xs rounded-lg transition border font-medium ${
                  isAdded
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-default"
                    : "bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 border-slate-200"
                }`}
              >
                + {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Added Skills List */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-700">
          Added Skills ({skills.length}):
        </span>
        {skills.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No skills added yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {skills.map((skill, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white shadow-xs"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {skill.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {skill.category || "Technical"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400">Level:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => handleUpdate(index, { level: lvl })}
                          className={`w-3.5 h-3.5 rounded-full transition-all ${
                            (skill.level || 4) >= lvl
                              ? "bg-blue-600 scale-105"
                              : "bg-slate-200 hover:bg-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
