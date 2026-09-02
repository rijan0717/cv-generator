"use client";

import React, { useState } from "react";
import { CVData } from "@/types/cv";
import ModernTemplate from "@/components/templates/ModernTemplate";
import ClassicTemplate from "@/components/templates/ClassicTemplate";
import CreativeTemplate from "@/components/templates/CreativeTemplate";
import TechTemplate from "@/components/templates/TechTemplate";
import { exportCVToPDF, printCV } from "@/lib/pdf-export";
import {
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Layout,
  Loader2,
} from "lucide-react";

interface Props {
  data: CVData;
  onChangeTemplate?: (templateId: "modern" | "classic" | "creative" | "tech") => void;
}

export default function CVPreview({ data, onChangeTemplate }: Props) {
  const [scale, setScale] = useState<number>(0.85);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string>("");

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 1.3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  const handleFit = () => setScale(0.85);

  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);
      const filename = `${data.fullName || "Resume"}_CV.pdf`.replace(/\s+/g, "_");
      await exportCVToPDF("cv-render-canvas", filename, (status) => {
        setExportStatus(status);
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to generate PDF. Please try again or use the print option.");
    } finally {
      setIsExporting(false);
      setExportStatus("");
    }
  };

  const renderSelectedTemplate = () => {
    switch (data.templateId) {
      case "classic":
        return <ClassicTemplate data={data} />;
      case "creative":
        return <CreativeTemplate data={data} />;
      case "tech":
        return <TechTemplate data={data} />;
      case "modern":
      default:
        return <ModernTemplate data={data} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Preview Toolbar */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Template Quick Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Layout className="w-3.5 h-3.5 text-blue-400" />
            Template:
          </span>
          {(
            [
              { id: "modern", label: "Executive" },
              { id: "classic", label: "Classic" },
              { id: "creative", label: "Creative" },
              { id: "tech", label: "Tech" },
            ] as const
          ).map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => onChangeTemplate?.(tmpl.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                data.templateId === tmpl.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {tmpl.label}
            </button>
          ))}
        </div>

        {/* Action Controls: Zoom, Print, PDF Download */}
        <div className="flex items-center gap-2">
          {/* Zoom buttons */}
          <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={handleZoomOut}
              title="Zoom out"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-400">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              title="Zoom in"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFit}
              title="Reset Zoom"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Print button */}
          <button
            onClick={printCV}
            title="Print CV"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-600/30 transition transform active:scale-95 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{exportStatus || "Exporting..."}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Preview Viewport */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-slate-950/60 custom-scrollbar">
        <div
          className="transition-transform duration-150 origin-top shadow-2xl rounded-sm"
          style={{ transform: `scale(${scale})` }}
        >
          {renderSelectedTemplate()}
        </div>
      </div>
    </div>
  );
}
