"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FileText,
  Sparkles,
  Download,
  Palette,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Zap,
  Eye,
  Layers,
  Layout,
  Star,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 text-white overflow-hidden selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/30 via-indigo-600/20 to-purple-600/30 blur-[130px] pointer-events-none rounded-full" />

          <div className="relative z-10 max-w-4xl mx-auto">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-semibold text-blue-300 mb-6 shadow-inner animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Next-Gen Full-Stack CV & Resume Generator</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-tight md:leading-none">
              Craft Resumes That <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                Land Dream Interviews.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mt-6 leading-relaxed">
              Create ATS-friendly, beautifully designed resumes in minutes. Customize colors, fonts, layouts, and export crystal-clear PDFs with live real-time preview.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href={session ? "/dashboard" : "/register"}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/30 transition transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>{session ? "Go to Dashboard" : "Build Your Resume Free"}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>

              <Link
                href="#templates"
                className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm rounded-2xl backdrop-blur-md transition flex items-center justify-center gap-2"
              >
                <Layout className="w-4 h-4 text-blue-400" />
                <span>Explore Templates</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>100% Free & Open Starter</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ATS Compatible Formats</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>High-Resolution Vector PDF</span>
              </div>
            </div>
          </div>

          {/* Interactive Preview Mockup Card */}
          <div className="mt-14 relative max-w-5xl mx-auto rounded-3xl p-2 sm:p-4 bg-gradient-to-b from-white/15 to-white/5 border border-white/20 backdrop-blur-xl shadow-2xl">
            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 p-4 sm:p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="text-left flex-1 space-y-4">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Live Studio Preview
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Real-time Customization with Instant Feedback
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Tweak colors, switch layouts, reorder experiences, and see every keystroke immediately update the A4 print canvas.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-400" /> Curated Palettes
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" /> 4 Layouts
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-emerald-400" /> A4 PDF Export
                  </span>
                </div>
              </div>

              <div className="w-full md:w-1/2 bg-white text-slate-900 rounded-xl p-5 shadow-2xl text-left border border-slate-200">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                    AM
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-blue-600">Alex Morgan</h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Senior Software Architect
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mt-3 text-[11px]">
                  <p className="text-slate-600 line-clamp-2 leading-relaxed">
                    Lead engineer specializing in Next.js, Node.js, and cloud systems with a track record of scaling high-throughput applications.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                      TypeScript
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                      React
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                      MongoDB
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                      Docker
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Templates Showcase Section */}
        <section id="templates" className="py-20 bg-slate-950/80 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 block">
                Tailored for Every Career Path
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Handcrafted Professional Templates
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                Choose a design tested for readability and ATS scanning compatibility.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  id: "modern",
                  name: "Modern Executive",
                  desc: "Two-column layout with sidebar and timeline accents. Perfect for senior engineers & managers.",
                  accent: "#2563eb",
                  tag: "Most Popular",
                },
                {
                  id: "classic",
                  name: "Classic Corporate",
                  desc: "Traditional, elegant single-column format optimized for corporate and banking roles.",
                  accent: "#0f172a",
                  tag: "ATS Standard",
                },
                {
                  id: "creative",
                  name: "Creative Minimal",
                  desc: "Vibrant top banner with skill pills and project showcases. Ideal for designers and creators.",
                  accent: "#7c3aed",
                  tag: "High Visual",
                },
                {
                  id: "tech",
                  name: "Tech & Developer",
                  desc: "Terminal accents, code block styling, and GitHub repository highlights.",
                  accent: "#059669",
                  tag: "Developer Choice",
                },
              ].map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tmpl.accent }}
                      />
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                        {tmpl.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition">
                      {tmpl.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {tmpl.desc}
                    </p>
                  </div>

                  <Link
                    href={session ? "/dashboard" : "/register"}
                    className="mt-6 w-full py-2 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold text-center transition"
                  >
                    Use This Template
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 block">
              Packed with Powerful Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Everything You Need in One Resume Builder
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Live Real-Time Studio</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Watch your modifications update in real time with side-by-side split editing, zoom controls, and section reordering.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Custom Color & Font Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select curated harmonious color schemes, or dial in your own custom hex codes and Google Fonts (Inter, Roboto, Playfair).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">High-Resolution PDF Download</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Export pixel-perfect A4 PDFs ready to submit to job applications, with clean page breaks and print optimization.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Secure Auth & MongoDB Sync</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your data is securely stored in MongoDB Atlas with bcrypt password encryption, password recovery, and NextAuth JWT tokens.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Cloudinary Image Storage</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload and crop professional avatar headshots stored on Cloudinary CDN or stored with local base64 fallback.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Layout className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Role-Based Admin Panel</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Administrators can inspect all created resumes, manage platform users, and view platform metrics in a protected control center.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Ready to Build Your Standout Resume?
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Join thousands of candidates who create clean, modern, and effective CVs using CV Studio.
              </p>
              <div className="pt-4">
                <Link
                  href={session ? "/dashboard" : "/register"}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-sm rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95"
                >
                  <span>{session ? "Open CV Studio" : "Get Started For Free"}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
