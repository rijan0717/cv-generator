"use client";

import React, { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Check,
  Eye,
  Edit3,
  Palette,
  User,
  Sparkles,
  Briefcase,
  GraduationCap,
  Cpu,
  FolderGit2,
  Award,
  Loader2,
  LayoutDashboard,
} from "lucide-react";
import { CVData } from "@/types/cv";
import PersonalInfoForm from "@/components/editor/PersonalInfoForm";
import SummaryForm from "@/components/editor/SummaryForm";
import ExperienceForm from "@/components/editor/ExperienceForm";
import EducationForm from "@/components/editor/EducationForm";
import SkillsForm from "@/components/editor/SkillsForm";
import ProjectsForm from "@/components/editor/ProjectsForm";
import CustomSectionsForm from "@/components/editor/CustomSectionsForm";
import CustomizerDrawer from "@/components/editor/CustomizerDrawer";
import CVPreview from "@/components/editor/CVPreview";

type TabType =
  | "personal"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "extras"
  | "design";

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [cvData, setCvData] = useState<CVData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchCV();
    }
  }, [status, id]);

  const fetchCV = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cv/${id}`);
      const data = await res.json();
      if (res.ok && data.cv) {
        setCvData(data.cv);
        setLastSavedTime(new Date());
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Failed to load CV:", err);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCV = (updates: Partial<CVData>) => {
    if (!cvData) return;
    setCvData((prev) => (prev ? { ...prev, ...updates } : null));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!cvData) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/cv/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cvData),
      });
      if (res.ok) {
        setHasUnsavedChanges(false);
        setLastSavedTime(new Date());
      } else {
        alert("Failed to save changes. Please try again.");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut for Cmd/Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cvData]);

  if (status === "loading" || loading || !cvData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading CV Studio...</p>
      </div>
    );
  }

  const TABS = [
    { id: "personal", label: "Personal", icon: User },
    { id: "summary", label: "Summary", icon: Sparkles },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "skills", label: "Skills", icon: Cpu },
    { id: "projects", label: "Projects", icon: FolderGit2 },
    { id: "extras", label: "Extras", icon: Award },
    { id: "design", label: "Design", icon: Palette },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Studio Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          {/* Editable CV Title */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={cvData.title || ""}
              onChange={(e) => handleUpdateCV({ title: e.target.value })}
              placeholder="Resume Title"
              className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-none px-1 py-0.5 max-w-[200px] sm:max-w-xs transition"
            />
          </div>
        </div>

        {/* Center Save Status */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          {saving ? (
            <span className="flex items-center gap-1.5 text-blue-400 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving changes...
            </span>
          ) : hasUnsavedChanges ? (
            <span className="text-amber-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Unsaved changes
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Mobile view switch toggle */}
          <div className="flex lg:hidden bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setMobileView("edit")}
              className={`p-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                mobileView === "edit"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() => setMobileView("preview")}
              className={`p-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                mobileView === "preview"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/30 transition disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save</span>
          </button>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Form Editor & Tab Navigator */}
        <div
          className={`w-full lg:w-1/2 flex flex-col bg-slate-900 border-r border-slate-800 h-[calc(100vh-64px)] overflow-hidden ${
            mobileView === "preview" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1 px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 overflow-x-auto custom-scrollbar shrink-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900 custom-scrollbar">
            <div className="max-w-2xl mx-auto bg-white text-slate-900 p-6 rounded-2xl border border-slate-200 shadow-xl">
              {activeTab === "personal" && (
                <PersonalInfoForm data={cvData} onChange={handleUpdateCV} />
              )}
              {activeTab === "summary" && (
                <SummaryForm data={cvData} onChange={handleUpdateCV} />
              )}
              {activeTab === "experience" && (
                <ExperienceForm data={cvData} onChange={handleUpdateCV} />
              )}
              {activeTab === "education" && (
                <EducationForm data={cvData} onChange={handleUpdateCV} />
              )}
              {activeTab === "skills" && (
                <SkillsForm data={cvData} onChange={handleUpdateCV} />
              )}
              {activeTab === "projects" && (
                <ProjectsForm data={cvData} onChange={handleUpdateCV} />
              )}
              {activeTab === "extras" && (
                <CustomSectionsForm data={cvData} onChange={handleUpdateCV} />
              )}
              {activeTab === "design" && (
                <CustomizerDrawer data={cvData} onChange={handleUpdateCV} />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Live Interactive Preview */}
        <div
          className={`w-full lg:w-1/2 p-3 sm:p-6 bg-slate-950 h-[calc(100vh-64px)] overflow-hidden ${
            mobileView === "edit" ? "hidden lg:flex" : "flex"
          }`}
        >
          <CVPreview
            data={cvData}
            onChangeTemplate={(tmpl) => handleUpdateCV({ templateId: tmpl })}
          />
        </div>
      </div>
    </div>
  );
}
