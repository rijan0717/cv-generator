"use client";

import React from "react";
import { CVData } from "@/types/cv";
import { Mail, Phone, MapPin, Globe } from "lucide-react";
import { LinkedinIcon, GithubIcon } from "@/components/icons/BrandIcons";

interface Props {
  data: CVData;
}

export default function ClassicTemplate({ data }: Props) {
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
    textColor = "#1e293b",
    accentColor = "#0f172a",
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
      className={`w-full min-h-[1122px] max-w-[794px] mx-auto p-10 shadow-2xl transition-all duration-200 ${fontClass} ${sizeMultiplier}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: `${font}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
      }}
    >
      {/* Header */}
      <div className="text-center pb-5 border-b-2" style={{ borderColor: accentColor }}>
        <h1 className="text-3xl font-bold uppercase tracking-widest" style={{ color: accentColor }}>
          {fullName || "Your Full Name"}
        </h1>
        <p className="text-base font-medium opacity-90 mt-1 uppercase tracking-wider">
          {jobTitle || "Professional Title"}
        </p>

        {/* Contact info bar */}
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs opacity-90 mt-3 font-medium">
          {email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>{phone}</span>
            </div>
          )}
          {address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>{address}</span>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>{website.replace(/^https?:\/\//, "")}</span>
            </div>
          )}
          {linkedin && (
            <div className="flex items-center gap-1.5">
              <LinkedinIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>{linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}</span>
            </div>
          )}
          {github && (
            <div className="flex items-center gap-1.5">
              <GithubIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>{github.replace(/^https?:\/\/(www\.)?github\.com\//, "")}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6 mt-6">
        {/* Professional Summary */}
        {summary && (
          <div>
            <h2
              className="text-xs font-bold uppercase tracking-wider pb-1 border-b mb-2"
              style={{ color: accentColor, borderColor: `${accentColor}40` }}
            >
              Professional Summary
            </h2>
            <p className="text-xs text-justify leading-relaxed opacity-90 whitespace-pre-line">
              {summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {experiences.length > 0 && (
          <div>
            <h2
              className="text-xs font-bold uppercase tracking-wider pb-1 border-b mb-3"
              style={{ color: accentColor, borderColor: `${accentColor}40` }}
            >
              Professional Experience
            </h2>
            <div className="space-y-4">
              {experiences.map((exp, idx) => (
                <div key={exp.id || idx}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xs font-bold text-slate-900">{exp.position}</h3>
                    <span className="text-[11px] font-medium opacity-75">
                      {exp.startDate} — {exp.current ? "Present" : exp.endDate || ""}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs opacity-90 mb-1">
                    <span className="font-semibold" style={{ color: accentColor }}>
                      {exp.company}
                    </span>
                    {exp.location && <span className="opacity-75 italic">{exp.location}</span>}
                  </div>
                  <p className="text-xs opacity-90 whitespace-pre-line leading-relaxed">
                    {exp.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {educations.length > 0 && (
          <div>
            <h2
              className="text-xs font-bold uppercase tracking-wider pb-1 border-b mb-3"
              style={{ color: accentColor, borderColor: `${accentColor}40` }}
            >
              Education
            </h2>
            <div className="space-y-3">
              {educations.map((edu, idx) => (
                <div key={edu.id || idx}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xs font-bold">
                      {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
                    </h3>
                    <span className="text-[11px] font-medium opacity-75">
                      {edu.startDate} — {edu.current ? "Present" : edu.endDate || ""}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs opacity-90">
                    <span className="font-semibold" style={{ color: accentColor }}>
                      {edu.institution}
                    </span>
                    {edu.grade && <span className="font-medium">{edu.grade}</span>}
                  </div>
                  {edu.description && (
                    <p className="text-xs opacity-80 mt-1">{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Skills */}
        {skills.length > 0 && (
          <div>
            <h2
              className="text-xs font-bold uppercase tracking-wider pb-1 border-b mb-2"
              style={{ color: accentColor, borderColor: `${accentColor}40` }}
            >
              Core Competencies & Skills
            </h2>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {skills.map((skill, idx) => (
                <span
                  key={skill.id || idx}
                  className="px-2 py-0.5 rounded border text-[11px] font-medium"
                  style={{
                    borderColor: `${accentColor}30`,
                    backgroundColor: `${accentColor}08`,
                    color: textColor,
                  }}
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div>
            <h2
              className="text-xs font-bold uppercase tracking-wider pb-1 border-b mb-3"
              style={{ color: accentColor, borderColor: `${accentColor}40` }}
            >
              Projects & Achievements
            </h2>
            <div className="space-y-3">
              {projects.map((proj, idx) => (
                <div key={proj.id || idx}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold">{proj.title}</h3>
                    {proj.link && (
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-medium hover:underline"
                        style={{ color: accentColor }}
                      >
                        {proj.link.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                  {proj.techStack && (
                    <p className="text-[10px] opacity-75 font-mono mb-1">
                      {proj.techStack}
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

        {/* Custom Sections */}
        {customSections.map((sec, idx) => (
          <div key={sec.id || idx}>
            <h2
              className="text-xs font-bold uppercase tracking-wider pb-1 border-b mb-2"
              style={{ color: accentColor, borderColor: `${accentColor}40` }}
            >
              {sec.title}
            </h2>
            <p className="text-xs opacity-90 whitespace-pre-line leading-relaxed">
              {sec.items}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
