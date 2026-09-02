"use client";

import React from "react";
import { CVData } from "@/types/cv";
import { Mail, Phone, MapPin, Globe, Sparkles } from "lucide-react";
import { LinkedinIcon, GithubIcon } from "@/components/icons/BrandIcons";

interface Props {
  data: CVData;
}

export default function CreativeTemplate({ data }: Props) {
  const {
    fullName,
    jobTitle,
    email,
    phone,
    address,
    website,
    linkedin,
    github,
    photoUrl,
    summary,
    bgColor = "#ffffff",
    textColor = "#0f172a",
    accentColor = "#7c3aed",
    font = "Outfit",
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
      className={`w-full min-h-[1122px] max-w-[794px] mx-auto shadow-2xl transition-all duration-200 overflow-hidden ${fontClass} ${sizeMultiplier}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: `${font}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
      }}
    >
      {/* Creative Header Banner */}
      <div
        className="p-8 text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
        }}
      >
        {/* Subtle decorative circles */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-32 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          {photoUrl && (
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/80 shadow-lg shrink-0 bg-white/20">
              <img
                src={photoUrl}
                alt={fullName || "Avatar"}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
              {fullName || "Your Full Name"}
            </h1>
            <p className="text-base font-medium text-white/90 mt-1">
              {jobTitle || "Your Creative Title"}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-xs text-white/85 mt-3">
              {email && (
                <div className="flex items-center gap-1 bg-black/15 px-2.5 py-1 rounded-full backdrop-blur-sm">
                  <Mail className="w-3 h-3" />
                  <span>{email}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-1 bg-black/15 px-2.5 py-1 rounded-full backdrop-blur-sm">
                  <Phone className="w-3 h-3" />
                  <span>{phone}</span>
                </div>
              )}
              {address && (
                <div className="flex items-center gap-1 bg-black/15 px-2.5 py-1 rounded-full backdrop-blur-sm">
                  <MapPin className="w-3 h-3" />
                  <span>{address}</span>
                </div>
              )}
              {website && (
                <div className="flex items-center gap-1 bg-black/15 px-2.5 py-1 rounded-full backdrop-blur-sm">
                  <Globe className="w-3 h-3" />
                  <span>{website.replace(/^https?:\/\//, "")}</span>
                </div>
              )}
              {linkedin && (
                <div className="flex items-center gap-1 bg-black/15 px-2.5 py-1 rounded-full backdrop-blur-sm">
                  <LinkedinIcon className="w-3 h-3" />
                  <span>{linkedin.replace(/^https?:\/\//, "")}</span>
                </div>
              )}
              {github && (
                <div className="flex items-center gap-1 bg-black/15 px-2.5 py-1 rounded-full backdrop-blur-sm">
                  <GithubIcon className="w-3 h-3" />
                  <span>{github.replace(/^https?:\/\//, "")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-12 gap-8">
        {/* Main Left Column */}
        <div className="col-span-7 space-y-6">
          {summary && (
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <h2
                className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                style={{ color: accentColor }}
              >
                <Sparkles className="w-3.5 h-3.5" /> About Me
              </h2>
              <p className="text-xs leading-relaxed opacity-90 whitespace-pre-line text-justify">
                {summary}
              </p>
            </div>
          )}

          {experiences.length > 0 && (
            <div>
              <h2
                className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b-2"
                style={{ color: accentColor, borderColor: accentColor }}
              >
                Experience Timeline
              </h2>
              <div className="space-y-4">
                {experiences.map((exp, idx) => (
                  <div key={exp.id || idx} className="group">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-xs font-bold">{exp.position}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 opacity-80">
                        {exp.startDate} — {exp.current ? "Present" : exp.endDate || ""}
                      </span>
                    </div>
                    <div className="text-xs font-medium mb-1.5" style={{ color: accentColor }}>
                      {exp.company} {exp.location && `• ${exp.location}`}
                    </div>
                    <p className="text-xs opacity-90 whitespace-pre-line leading-relaxed">
                      {exp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <h2
                className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b-2"
                style={{ color: accentColor, borderColor: accentColor }}
              >
                Portfolio Highlights
              </h2>
              <div className="space-y-3">
                {projects.map((proj, idx) => (
                  <div
                    key={proj.id || idx}
                    className="p-3 rounded-lg border border-slate-200/80 bg-white"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs font-bold">{proj.title}</h4>
                      {proj.link && (
                        <a
                          href={proj.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold hover:underline"
                          style={{ color: accentColor }}
                        >
                          View Live ↗
                        </a>
                      )}
                    </div>
                    {proj.techStack && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {proj.techStack.split(",").map((tech, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700"
                          >
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
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

        {/* Right Sidebar Column */}
        <div className="col-span-5 space-y-6">
          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <h2
                className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b-2"
                style={{ color: accentColor, borderColor: accentColor }}
              >
                Skills & Tech Stack
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, idx) => (
                  <div
                    key={skill.id || idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                    style={{
                      backgroundColor: `${accentColor}15`,
                      color: accentColor,
                      border: `1px solid ${accentColor}30`,
                    }}
                  >
                    <span>{skill.name}</span>
                    {skill.level && (
                      <span className="text-[10px] opacity-75">★{skill.level}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {educations.length > 0 && (
            <div>
              <h2
                className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b-2"
                style={{ color: accentColor, borderColor: accentColor }}
              >
                Education
              </h2>
              <div className="space-y-3">
                {educations.map((edu, idx) => (
                  <div
                    key={edu.id || idx}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/50"
                  >
                    <p className="text-xs font-bold">{edu.degree}</p>
                    <p className="text-xs font-medium" style={{ color: accentColor }}>
                      {edu.institution}
                    </p>
                    <p className="text-[11px] opacity-75 mt-0.5">
                      {edu.startDate} — {edu.current ? "Present" : edu.endDate || ""}
                    </p>
                    {edu.grade && <p className="text-[11px] font-medium mt-1">{edu.grade}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Sections */}
          {customSections.map((sec, idx) => (
            <div key={sec.id || idx}>
              <h2
                className="text-xs font-bold uppercase tracking-wider mb-2 pb-1 border-b-2"
                style={{ color: accentColor, borderColor: accentColor }}
              >
                {sec.title}
              </h2>
              <div className="text-xs opacity-90 whitespace-pre-line p-3 rounded-lg bg-slate-50 border border-slate-100">
                {sec.items}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
