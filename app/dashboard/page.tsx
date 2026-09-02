"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Edit3,
  Copy,
  Trash2,
  Download,
  Eye,
  Calendar,
  Sparkles,
  Loader2,
  Layout,
  ExternalLink,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CVData } from "@/types/cv";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [cvs, setCvs] = useState<CVData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchCVs();
    }
  }, [status, router]);

  const fetchCVs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cv");
      const data = await res.json();
      if (res.ok && data.cvs) {
        setCvs(data.cvs);
      }
    } catch (err) {
      console.error("Failed to fetch CVs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewCV = async (templateId = "modern") => {
    try {
      setCreating(true);
      const res = await fetch("/api/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "My Professional Resume",
          templateId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.cv?.id) {
        router.push(`/editor/${data.cv.id}`);
      }
    } catch (err) {
      console.error("Error creating CV:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicateCV = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/cv/${id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.cv) {
        setCvs((prev) => [data.cv, ...prev]);
      }
    } catch (err) {
      console.error("Error duplicating CV:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteCV = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this resume? This cannot be undone.")) {
      return;
    }

    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/cv/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCvs((prev) => prev.filter((cv) => cv.id !== id));
      }
    } catch (err) {
      console.error("Error deleting CV:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading your workspace...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Welcome & Action Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-8 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                My Resumes & CVs
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                {cvs.length} {cvs.length === 1 ? "Resume" : "Resumes"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Welcome back, <strong>{session?.user?.name}</strong>! Select a resume to edit or create a new one.
            </p>
          </div>

          <button
            onClick={() => handleCreateNewCV("modern")}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-600/25 transition transform active:scale-98 disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Resume...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create New Resume</span>
              </>
            )}
          </button>
        </div>

        {/* CV Grid */}
        {cvs.length === 0 ? (
          <div className="my-12 p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              You haven&apos;t created any resumes yet
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
              Pick a template to start building your professional CV with live preview and PDF export.
            </p>

            {/* Quick Template Starters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto mb-6">
              {[
                { id: "modern", name: "Modern Executive", color: "#2563eb" },
                { id: "classic", name: "Classic Corporate", color: "#0f172a" },
                { id: "creative", name: "Creative Minimal", color: "#7c3aed" },
                { id: "tech", name: "Tech / Developer", color: "#059669" },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleCreateNewCV(tmpl.id)}
                  disabled={creating}
                  className="p-3 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 border border-slate-200 rounded-xl transition text-left group"
                >
                  <span
                    className="w-3 h-3 rounded-full block mb-2"
                    style={{ backgroundColor: tmpl.color }}
                  />
                  <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                    {tmpl.name}
                  </p>
                  <span className="text-[10px] text-slate-400">Start with this</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleCreateNewCV("modern")}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Sparkles className="w-4 h-4" />
              Create First Resume
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {cvs.map((cv) => (
              <div
                key={cv.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5">
                  {/* Top card bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 capitalize flex items-center gap-1">
                      <Layout className="w-3 h-3 text-blue-600" />
                      {cv.templateId || "Modern"}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {cv.updatedAt
                        ? new Date(cv.updatedAt).toLocaleDateString()
                        : "Recently"}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition truncate">
                    {cv.title || "Untitled Resume"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {cv.fullName || "No name specified"} {cv.jobTitle ? `• ${cv.jobTitle}` : ""}
                  </p>

                  {/* Summary preview snippet */}
                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {cv.summary || "No summary provided. Click edit to start writing."}
                  </p>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1">
                  <Link
                    href={`/editor/${cv.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Open Editor</span>
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDuplicateCV(cv.id!, e)}
                      disabled={actionLoadingId === cv.id}
                      title="Clone Resume"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg transition disabled:opacity-50"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteCV(cv.id!, e)}
                      disabled={actionLoadingId === cv.id}
                      title="Delete Resume"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
