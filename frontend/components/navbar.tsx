"use client";

import Link from "next/link";
import { Shield, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
      style={{
        background: "rgba(10, 10, 26, 0.8)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <Shield className="w-7 h-7 text-blue-500" />
            <Activity className="w-3.5 h-3.5 text-blue-400 absolute -bottom-0.5 -right-0.5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            Pose<span className="text-blue-500">Guard</span>{" "}
            <span className="text-blue-400/70 font-normal text-sm">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Upload
          </Link>
          <Link
            href="/dashboard/10"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Player Dashboard
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-white/40">AI Online</span>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
