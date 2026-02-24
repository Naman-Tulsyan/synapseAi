"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, LayoutDashboard, Upload } from "lucide-react";
import { motion } from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Upload", icon: Upload },
    { href: "/dashboard/10", label: "Dashboard", icon: LayoutDashboard },
  ];

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(6,4,15,0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(93,60,129,0.20)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #5D3C81, #05F3FF22)",
              border: "1px solid rgba(5,243,255,0.30)",
              boxShadow: "0 0 18px rgba(5,243,255,0.18)",
            }}
          >
            <Zap className="w-4 h-4" style={{ color: "#05F3FF" }} />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Synapse<span style={{ color: "#05F3FF" }}>AI</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-white/45 hover:text-white/80 hover:bg-white/[0.04]"
                }`}
                style={
                  isActive
                    ? {
                        background: "rgba(5,243,255,0.08)",
                        border: "1px solid rgba(5,243,255,0.20)",
                        color: "#05F3FF",
                      }
                    : {}
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}

          <div className="h-4 w-px bg-white/10 mx-2" />

          {/* Live Status */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(0,255,135,0.07)",
              border: "1px solid rgba(0,255,135,0.20)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#00FF87", boxShadow: "0 0 6px #00FF87" }}
            />
            <span className="text-xs font-medium" style={{ color: "#00FF87" }}>
              AI Online
            </span>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
