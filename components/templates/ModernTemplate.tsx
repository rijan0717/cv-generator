"use client";

import React from "react";
import { CVData } from "@/types/cv";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  GraduationCap,
  Sparkles,
  FolderGit2,
  Award,
} from "lucide-react";
import { LinkedinIcon, GithubIcon } from "@/components/icons/BrandIcons";

interface Props {
  data: CVData;
}

export default function ModernTemplate({ data }: Props) {
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
    textColor = "#1e293b",
    accentColor = "#2563eb",
    font = "Inter",
    fontSize = "medium",
    spacing = "normal",
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
      className={`w-full min-h-[1122px] max-w-[794px] mx-auto shadow-2xl transition-all duration-200 ${fontClass} ${sizeMultiplier}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: `${font}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
      }}
    >
      <div className="grid grid-cols-12 min-h-[1122px]">
        {/* Left Sidebar */}
        <div
          className="col-span-4 p-6 border-r border-slate-200/80 flex flex-col gap-6"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          {/* Profile Photo */}
          {photoUrl ? (
            <div className="flex justify-center">
              <div
                className="w-28 h-28 rounded-full overflow-hidden border-4 shadow-md bg-white"
                style={{ borderColor: accentColor }}
              >
                <img
                  src={photoUrl}
                  alt={fullName || "Profile"}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : null}

          {/* Contact Details */}
          <div>
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b"
              style={{ color: accentColor, borderColor: `${accentColor}40` }}
            >
              Contact
            </h3>
            <div className="space-y-2 text-xs">
              {email && (
                <div className="flex items-center gap-2 break-all">
                  <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                  <span>{email}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                  <span>{phone}</span>
                </div>
              )}
              {address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                  <span>{address}</span>
                </div>
              )}
              {website && (
                <div className="flex items-center gap-2 break-all">
                  <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                  <span>{website.replace(/^https?:\/\//, "")}</span>
                </div>
              )}
              {linkedin && (
                <div className="flex items-center gap-2 break-all">
                  <LinkedinIcon className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                  <span>{linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}</span>
                </div>
              )}
              {github && (
                <div className="flex items-center gap-2 break-all">
                  <GithubIcon className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                  <span>{github.replace(/^https?:\/\/(www\.)?github\.com\//, "")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Education in Sidebar */}
          {educations.length > 0 && (
            <div>
              <h3
                className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b"
                style={{ color: accentColor, borderColor: `${accentColor}40` }}
              >
                Education
              </h3>
              <div className="space-y-3">
                {educations.map((edu, index) => (
                  <div key={edu.id || index} className="text-xs">
                    <p className="font-bold">{edu.degree}</p>
                    <p className="opacity-90">{edu.institution}</p>
                    {edu.fieldOfStudy && (
                      <p className="opacity-75 italic">{edu.fieldOfStudy}</p>
                    )}
                    <p className="text-[11px] opacity-75 mt-0.5">
                      {edu.startDate} — {edu.current ? "Present" : edu.endDate || ""}
                    </p>
                    {edu.grade && (
                      <p className="text-[11px] font-medium" style={{ color: accentColor }}>
                        {edu.grade}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills with Rating Dots/Bars */}
          {skills.length > 0 && (
            <div>
              <h3
                className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b"
                style={{ color: accentColor, borderColor: `${accentColor}40` }}
              >
                Skills
              </h3>
              <div className="space-y-2">
                {skills.map((skill, index) => (
                  <div key={skill.id || index} className="text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{skill.name}</span>
                      {skill.level && (
                        <span className="text-[10px] opacity-75">{skill.level}/5</span>
                      )}
                    </div>
                    {skill.level && (
                      <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(skill.level / 5) * 100}%`,
                            backgroundColor: accentColor,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Sections (e.g. Languages, Certifications) */}
          {customSections.map((section, idx) => (
            <div key={section.id || idx}>
              <h3
                className="text-xs font-bold uppercase tracking-wider mb-2 pb-1 border-b"
                style={{ color: accentColor, borderColor: `${accentColor}40` }}
              >
                {section.title}
              </h3>
              <div className="text-xs whitespace-pre-line opacity-90">
                {section.items}
              </div>
            </div>
          ))}
        </div>

        {/* Right Main Content */}
        <div className="col-span-8 p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="pb-4 border-b border-slate-200">
            <h1
              className="text-3xl font-extrabold tracking-tight"
              style={{ color: accentColor }}
            >
              {fullName || "Your Full Name"}
            </h1>
            <p className="text-lg font-medium opacity-90 mt-1">
              {jobTitle || "Your Professional Title"}
            </p>
          </div>

          {/* Professional Summary */}
          {summary && (
            <div>
              <h2
                className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2"
                style={{ color: accentColor }}
              >
                <Sparkles className="w-4 h-4" />
                Professional Summary
              </h2>
              <p className="text-xs text-justify leading-relaxed opacity-90 whitespace-pre-line">
                {summary}
              </p>
            </div>
          )}

          {/* Work Experience */}
          {experiences.length > 0 && (
            <div>
              <h2
                className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
                style={{ color: accentColor }}
              >
                <Briefcase className="w-4 h-4" />
                Work Experience
              </h2>
              <div className="space-y-4">
                {experiences.map((exp, index) => (
                  <div
                    key={exp.id || index}
                    className="relative pl-4 border-l-2"
                    style={{ borderColor: accentColor }}
                  >
                    <div
                      className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-xs font-bold">{exp.position}</h4>
                      <span className="text-[11px] font-medium opacity-75">
                        {exp.startDate} — {exp.current ? "Present" : exp.endDate || ""}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs opacity-90 mb-1.5 font-medium">
                      <span style={{ color: accentColor }}>{exp.company}</span>
                      {exp.location && <span className="opacity-75">{exp.location}</span>}
                    </div>
                    <p className="text-xs opacity-90 whitespace-pre-line leading-relaxed">
                      {exp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Projects */}
          {projects.length > 0 && (
            <div>
              <h2
                className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: accentColor }}
              >
                <FolderGit2 className="w-4 h-4" />
                Featured Projects
              </h2>
              <div className="space-y-3">
                {projects.map((proj, index) => (
                  <div
                    key={proj.id || index}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs font-bold">{proj.title}</h4>
                      <div className="flex items-center gap-2 text-[11px]">
                        {proj.link && (
                          <a
                            href={proj.link}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium hover:underline"
                            style={{ color: accentColor }}
                          >
                            Live Demo
                          </a>
                        )}
                        {proj.github && (
                          <a
                            href={proj.github}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium opacity-75 hover:underline"
                          >
                            GitHub
                          </a>
                        )}
                      </div>
                    </div>
                    {proj.techStack && (
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                        style={{ color: accentColor }}
                      >
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
        </div>
      </div>
    </div>
  );
}
