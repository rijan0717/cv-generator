import React from "react";
import Link from "next/link";
import { FileText, Sparkles, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-1">
                CV Studio <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              </span>
            </Link>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Create professional, ATS-friendly resumes and CVs with customizable templates, real-time live preview, and instant high-resolution PDF download.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Features & Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-blue-600 transition">
                  CV Builder Studio
                </Link>
              </li>
              <li>
                <Link href="/#templates" className="hover:text-blue-600 transition">
                  Professional Templates
                </Link>
              </li>
              <li>
                <span className="opacity-75">PDF Export Engine</span>
              </li>
              <li>
                <span className="opacity-75">Role-Based Admin Panel</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Account & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/login" className="hover:text-blue-600 transition">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-blue-600 transition">
                  Create Free Account
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className="hover:text-blue-600 transition">
                  Forgot Password
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>&copy; {new Date().getFullYear()} CV Studio. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with Next.js, Prisma, Tailwind CSS & MongoDB Atlas
          </p>
        </div>
      </div>
    </footer>
  );
}
