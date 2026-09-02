"use client";

import React from "react";
import { CVData } from "@/types/cv";
import {
  Terminal,
  Code2,
  GitBranch,
  Cpu,
  Mail,
  Phone,
  MapPin,
  Globe,
  BookOpen,
} from "lucide-react";
import { LinkedinIcon, GithubIcon } from "@/components/icons/BrandIcons";

interface Props {
  data: CVData;
}

export default function TechTemplate({ data }: Props) {
  const {
    fullName,
    jobTitle,
    email,
    phone,
    address,
    website,
    linkedin,
    github,
    summary,
    bgColor = "#ffffff",
    textColor = "#0f172a",
    accentColor = "#059669", // Emerald green default
    font = "Inter",
    fontSize = "medium",
    experiences = [],
    educations = [],
    skills = [],
    projects = [],
    customSections = [],
  } = data;

  const fontClass =
    font === "Playfair Display"
      ? "font-serif"
      : font === "Fira Code"
      ? "font-mono"
      : "font-sans";

  const sizeMultiplier =
    fontSize === "compact"
      ? "text-xs leading-snug"
      : fontSize === "relaxed"
      ? "text-base leading-relaxed"
      : "text-sm leading-normal";

  return (
    <div
      id="cv-render-canvas"
      className={`w-full min-h-[1122px] max-w-[794px] mx-auto p-8 shadow-2xl transition-all duration-200 ${fontClass} ${sizeMultiplier}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: `${font}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
      }}
    >
      {/* Tech Top Header Bar */}
      <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/70 mb-6 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: accentColor }}
        />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5" style={{ color: accentColor }} />
              <h1 className="text-2xl font-black tracking-tight">
                {fullName || "Developer Name"}
              </h1>
            </div>
            <p
              className="text-sm font-semibold tracking-wide font-mono mt-0.5"
              style={{ color: accentColor }}
            >
              $ {jobTitle || "Full Stack Engineer"}
            </p>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
            {email && (
              <div className="flex items-center gap-1.5 opacity-90">
                <Mail className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                <span className="truncate">{email}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1.5 opacity-90">
                <Phone className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                <span>{phone}</span>
              </div>
            )}
            {address && (
              <div className="flex items-center gap-1.5 opacity-90">
                <MapPin className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                <span>{address}</span>
              </div>
            )}
            {github && (
              <div className="flex items-center gap-1.5 opacity-90">
                <GithubIcon className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                <span className="truncate">{github.replace(/^https?:\/\//, "")}</span>
              </div>
            )}
            {website && (
              <div className="flex items-center gap-1.5 opacity-90">
                <Globe className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                <span className="truncate">{website.replace(/^https?:\/\//, "")}</span>
              </div>
            )}
            {linkedin && (
              <div className="flex items-center gap-1.5 opacity-90">
                <LinkedinIcon className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                <span className="truncate">{linkedin.replace(/^https?:\/\//, "")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Summary, Experience, Projects */}
        <div className="col-span-8 space-y-6">
          {/* Summary */}
          {summary && (
            <div>
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
                <Code2 className="w-4 h-4" style={{ color: accentColor }} />
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider">
                  // Overview
                </h2>
              </div>
              <p className="text-xs leading-relaxed opacity-90 whitespace-pre-line text-justify">
                {summary}
              </p>
            </div>
          )}

          {/* Work Experience */}
          {experiences.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
                <GitBranch className="w-4 h-4" style={{ color: accentColor }} />
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider">
                  // Experience
                </h2>
              </div>
              <div className="space-y-4">
                {experiences.map((exp, idx) => (
                  <div key={exp.id || idx} className="text-xs">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-slate-900">{exp.position}</h3>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 opacity-80">
                        {exp.startDate} ~ {exp.current ? "HEAD" : exp.endDate || ""}
                      </span>
                    </div>
                    <div className="font-semibold text-xs mb-1" style={{ color: accentColor }}>
                      @{exp.company} {exp.location && `(${exp.location})`}
                    </div>
                    <p className="opacity-90 whitespace-pre-line leading-relaxed">
                      {exp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
                <Cpu className="w-4 h-4" style={{ color: accentColor }} />
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider">
                  // Open Source & Projects
                </h2>
              </div>
              <div className="space-y-3">
                {projects.map((proj, idx) => (
                  <div
                    key={proj.id || idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/40"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs font-bold">{proj.title}</h4>
                      <div className="flex gap-2 font-mono text-[10px]">
                        {proj.link && (
                          <a
                            href={proj.link}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline font-bold"
                            style={{ color: accentColor }}
                          >
                            [live]
                          </a>
                        )}
                        {proj.github && (
                          <a
                            href={proj.github}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline opacity-80"
                          >
                            [git]
                          </a>
                        )}
                      </div>
                    </div>
                    {proj.techStack && (
                      <p
                        className="text-[10px] font-mono font-semibold mb-1"
                        style={{ color: accentColor }}
                      >
                        stack: [{proj.techStack}]
                      </p>
                    )}
                    <p className="text-xs opacity-90 whitespace-pre-line leading-relaxed">
                      {proj.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Skills, Education, Custom Sections */}
        <div className="col-span-4 space-y-6">
          {/* Tech Skills */}
          {skills.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
                <Terminal className="w-4 h-4" style={{ color: accentColor }} />
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider">
                  // Skills
                </h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, idx) => (
                  <span
                    key={skill.id || idx}
                    className="px-2 py-1 rounded font-mono text-[11px] font-medium border"
                    style={{
                      backgroundColor: `${accentColor}10`,
                      borderColor: `${accentColor}30`,
                      color: textColor,
                    }}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {educations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
                <BookOpen className="w-4 h-4" style={{ color: accentColor }} />
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider">
                  // Education
                </h2>
              </div>
              <div className="space-y-3">
                {educations.map((edu, idx) => (
                  <div key={edu.id || idx} className="text-xs">
                    <p className="font-bold">{edu.degree}</p>
                    <p className="font-medium opacity-90" style={{ color: accentColor }}>
                      {edu.institution}
                    </p>
                    <p className="font-mono text-[10px] opacity-75 mt-0.5">
                      {edu.startDate} - {edu.current ? "Present" : edu.endDate || ""}
                    </p>
                    {edu.grade && (
                      <p className="text-[11px] font-mono mt-0.5">{edu.grade}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Sections */}
          {customSections.map((sec, idx) => (
            <div key={sec.id || idx}>
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider mb-2 pb-1 border-b border-slate-200">
                // {sec.title}
              </h2>
              <div className="text-xs opacity-90 whitespace-pre-line p-2.5 rounded bg-slate-50 border border-slate-100 font-mono text-[11px]">
                {sec.items}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
