"use client";

import React, { useRef, useState } from "react";
import { CVData } from "@/types/cv";
import {
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Globe,
  Camera,
  Trash2,
  Loader2,
} from "lucide-react";
import { LinkedinIcon, GithubIcon } from "@/components/icons/BrandIcons";

interface Props {
  data: CVData;
  onChange: (updates: Partial<CVData>) => void;
}

export default function PersonalInfoForm({ data, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        // Upload to Cloudinary API route (or fallback base64)
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Data }),
          });
          const result = await res.json();
          if (res.ok && result.url) {
            onChange({ photoUrl: result.url });
          } else {
            // Fallback to base64 if route error
            onChange({ photoUrl: base64Data });
          }
        } catch {
          onChange({ photoUrl: base64Data });
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error reading file:", err);
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    onChange({ photoUrl: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          Personal Details
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Provide your primary contact info so employers can reach you.
        </p>
      </div>

      {/* Avatar Image Upload Section */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-300 flex items-center justify-center shrink-0">
          {data.photoUrl ? (
            <img
              src={data.photoUrl}
              alt="Avatar Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-slate-400" />
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Profile Photo (Optional)</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 transition"
            >
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              {data.photoUrl ? "Change Photo" : "Upload Photo"}
            </button>
            {data.photoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Full Name *
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={data.fullName || ""}
              onChange={(e) => onChange({ fullName: e.target.value })}
              placeholder="e.g. Alex Morgan"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Professional Job Title *
          </label>
          <div className="relative">
            <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={data.jobTitle || ""}
              onChange={(e) => onChange({ jobTitle: e.target.value })}
              placeholder="e.g. Senior Full-Stack Engineer"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="email"
              value={data.email || ""}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="e.g. alex@example.com"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="tel"
              value={data.phone || ""}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="e.g. +1 (555) 234-5678"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Location / City, Country
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={data.address || ""}
              onChange={(e) => onChange({ address: e.target.value })}
              placeholder="e.g. San Francisco, CA"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Portfolio Website
          </label>
          <div className="relative">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="url"
              value={data.website || ""}
              onChange={(e) => onChange({ website: e.target.value })}
              placeholder="e.g. https://alexmorgan.dev"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            LinkedIn Profile
          </label>
          <div className="relative">
            <LinkedinIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={data.linkedin || ""}
              onChange={(e) => onChange({ linkedin: e.target.value })}
              placeholder="e.g. linkedin.com/in/alexmorgan"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            GitHub / Tech Profile
          </label>
          <div className="relative">
            <GithubIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={data.github || ""}
              onChange={(e) => onChange({ github: e.target.value })}
              placeholder="e.g. github.com/alexmorgan"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
