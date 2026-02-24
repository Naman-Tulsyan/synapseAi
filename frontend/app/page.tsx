"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Play,
  Activity,
  Zap,
  Brain,
  Eye,
  TrendingUp,
  FileVideo,
  X,
  Camera,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { uploadVideo } from "@/lib/api";
import LiveCamera from "@/components/live-camera";

const DEMO_SPORTS = [
  {
    id: "cricket",
    label: "Cricket",
    emoji: "🏏",
    desc: "Bowling & batting mechanics",
    accent: "#05F3FF",
    bg: "rgba(5,243,255,0.06)",
    border: "rgba(5,243,255,0.20)",
  },
  {
    id: "basketball",
    label: "Basketball",
    emoji: "🏀",
    desc: "Jump shot & sprint analysis",
    accent: "#EAFF00",
    bg: "rgba(234,255,0,0.06)",
    border: "rgba(234,255,0,0.20)",
  },
  {
    id: "football",
    label: "Football",
    emoji: "⚽",
    desc: "Tackle form & sprint biomechanics",
    accent: "#00FF87",
    bg: "rgba(0,255,135,0.06)",
    border: "rgba(0,255,135,0.20)",
  },
];

const FEATURES = [
  {
    icon: Eye,
    title: "Pose Estimation",
    desc: "MediaPipe 33-point skeletal tracking at 60fps",
    color: "#05F3FF",
    bg: "rgba(5,243,255,0.07)",
  },
  {
    icon: Brain,
    title: "AI Risk Engine",
    desc: "Real-time injury probability scoring",
    color: "#5D3C81",
    bg: "rgba(93,60,129,0.12)",
  },
  {
    icon: TrendingUp,
    title: "Trend Analysis",
    desc: "Session-over-session risk progression",
    color: "#00FF87",
    bg: "rgba(0,255,135,0.07)",
  },
  {
    icon: Zap,
    title: "Instant Feedback",
    desc: "Sub-second biomechanics assessment",
    color: "#EAFF00",
    bg: "rgba(234,255,0,0.07)",
  },
];

const PROCESSING_STEPS = [
  "Extracting frames...",
  "Detecting pose landmarks...",
  "Analyzing biomechanics...",
  "Generating risk report...",
];

export default function Home() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.size <= 50 * 1024 * 1024) setUploadedFile(file);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.size <= 50 * 1024 * 1024) setUploadedFile(file);
    },
    [],
  );

  const handleUpload = async () => {
    if (!uploadedFile) return;
    setIsProcessing(true);
    try {
      const result = await uploadVideo(uploadedFile);
      router.push(`/analysis/${result.videoId}`);
    } catch (err) {
      console.error("Upload failed:", err);
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      <Navbar />

      {/* Ambient Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(93,60,129,0.35) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(5,243,255,0.3) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, rgba(0,255,135,0.25) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-24 relative z-10">
        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          {/* Pill Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-sm font-medium"
            style={{
              background: "rgba(5,243,255,0.08)",
              border: "1px solid rgba(5,243,255,0.25)",
              color: "#05F3FF",
              boxShadow: "0 0 24px rgba(5,243,255,0.12)",
            }}
          >
            <ShieldCheck className="w-4 h-4" />
            Real-time Injury Risk Prediction
            <Activity className="w-4 h-4" />
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-none">
            <span className="text-white">Protect </span>
            <span className="gradient-text">Athletes.</span>
            <br />
            <span className="text-white">Prevent </span>
            <span className="gradient-text">Injuries.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/45 max-w-2xl mx-auto leading-relaxed">
            AI-powered pose estimation that predicts injury risks in real-time.
            Upload sports footage and get instant biomechanics analysis.
          </p>

          {/* Sport Pills */}
          <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
            {DEMO_SPORTS.map((s) => (
              <span
                key={s.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  color: s.accent,
                }}
              >
                {s.emoji} {s.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── Upload / Camera Zone ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="max-w-3xl mx-auto mb-20"
        >
          {/* Tab Switcher */}
          <div className="flex justify-center mb-6">
            <div
              className="rounded-full p-1 inline-flex gap-1"
              style={{
                background: "rgba(10,8,22,0.8)",
                border: "1px solid rgba(93,60,129,0.25)",
              }}
            >
              {(["upload", "camera"] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300"
                    style={
                      active
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(5,243,255,0.18), rgba(0,255,135,0.12))",
                            border: "1px solid rgba(5,243,255,0.35)",
                            color: "#05F3FF",
                            boxShadow: "0 0 20px rgba(5,243,255,0.15)",
                          }
                        : { color: "rgba(255,255,255,0.35)" }
                    }
                  >
                    {tab === "upload" ? (
                      <Upload className="w-4 h-4" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    {tab === "upload" ? "Upload Video" : "Live Camera"}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "upload" ? (
              <motion.div
                key="upload-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    /* Processing State */
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="glass-card rounded-2xl p-12 text-center"
                      style={{ border: "1px solid rgba(5,243,255,0.18)" }}
                    >
                      {/* Neon Spinner */}
                      <div className="relative w-20 h-20 mx-auto mb-7">
                        <div
                          className="absolute inset-0 rounded-full animate-spin"
                          style={{
                            border: "2px solid rgba(5,243,255,0.12)",
                            borderTopColor: "#05F3FF",
                            boxShadow: "0 0 16px rgba(5,243,255,0.3)",
                          }}
                        />
                        <div className="absolute inset-4 flex items-center justify-center">
                          <Cpu
                            className="w-8 h-8"
                            style={{ color: "#05F3FF" }}
                          />
                        </div>
                      </div>

                      <h3
                        className="text-xl font-bold mb-2"
                        style={{ color: "#05F3FF" }}
                      >
                        AI Processing...
                      </h3>
                      <p className="text-white/40 text-sm mb-7">
                        Running pose estimation & biomechanics analysis
                      </p>

                      <div className="space-y-3 max-w-xs mx-auto">
                        {PROCESSING_STEPS.map((step, i) => (
                          <motion.div
                            key={step}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.6 }}
                            className="flex items-center gap-3 text-sm text-white/40"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                              style={{
                                background: "#00FF87",
                                boxShadow: "0 0 6px #00FF87",
                              }}
                            />
                            {step}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    /* Drop / File Zone */
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className="rounded-2xl p-10 text-center cursor-pointer transition-all duration-300"
                        style={{
                          background: isDragging
                            ? "rgba(5,243,255,0.07)"
                            : "rgba(10,8,22,0.6)",
                          border: isDragging
                            ? "1.5px dashed rgba(5,243,255,0.55)"
                            : "1.5px dashed rgba(93,60,129,0.35)",
                          boxShadow: isDragging
                            ? "0 0 40px rgba(5,243,255,0.12), inset 0 0 40px rgba(5,243,255,0.04)"
                            : "none",
                          transform: isDragging ? "scale(1.015)" : "scale(1)",
                          backdropFilter: "blur(20px)",
                        }}
                      >
                        {uploadedFile ? (
                          <div className="space-y-5">
                            <div
                              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                              style={{
                                background: "rgba(0,255,135,0.10)",
                                border: "1px solid rgba(0,255,135,0.30)",
                                boxShadow: "0 0 20px rgba(0,255,135,0.15)",
                              }}
                            >
                              <FileVideo
                                className="w-8 h-8"
                                style={{ color: "#00FF87" }}
                              />
                            </div>
                            <div>
                              <p className="text-white font-semibold text-lg">
                                {uploadedFile.name}
                              </p>
                              <p className="text-white/35 text-sm mt-1">
                                {(uploadedFile.size / (1024 * 1024)).toFixed(1)}{" "}
                                MB · Ready for analysis
                              </p>
                            </div>
                            <div className="flex gap-3 justify-center">
                              <button
                                onClick={handleUpload}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #05F3FF, #00FF87)",
                                  color: "#06040f",
                                  boxShadow:
                                    "0 0 24px rgba(5,243,255,0.30), 0 4px 16px rgba(0,0,0,0.3)",
                                }}
                              >
                                <Play className="w-4 h-4" />
                                Analyze Video
                              </button>
                              <button
                                onClick={() => setUploadedFile(null)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/5"
                                style={{
                                  border: "1px solid rgba(255,255,255,0.10)",
                                  color: "rgba(255,255,255,0.45)",
                                }}
                              >
                                <X className="w-4 h-4" /> Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="block cursor-pointer">
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={handleFileSelect}
                            />
                            <div
                              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5"
                              style={{
                                background: "rgba(93,60,129,0.15)",
                                border: "1px solid rgba(93,60,129,0.35)",
                              }}
                            >
                              <Upload
                                className="w-7 h-7"
                                style={{ color: "rgba(93,60,129,0.90)" }}
                              />
                            </div>
                            <p className="text-white/75 font-semibold text-lg mb-2">
                              Drag & drop your sports video
                            </p>
                            <p className="text-white/30 text-sm">
                              MP4, MOV, AVI — Max 50 MB
                            </p>
                            <div className="mt-5 inline-flex">
                              <span
                                className="px-4 py-2 rounded-lg text-xs font-medium"
                                style={{
                                  background: "rgba(5,243,255,0.08)",
                                  border: "1px solid rgba(5,243,255,0.20)",
                                  color: "#05F3FF",
                                }}
                              >
                                Browse files
                              </span>
                            </div>
                          </label>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="camera-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <LiveCamera />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Feature Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.6 }}
        >
          <p className="text-center text-xs uppercase tracking-widest text-white/20 mb-6 font-medium">
            Powered by
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 + i * 0.08 }}
                className="rounded-xl p-5 text-center transition-all duration-300 hover:scale-[1.03]"
                style={{
                  background: feat.bg,
                  border: `1px solid ${feat.color}28`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{
                    background: `${feat.color}14`,
                    border: `1px solid ${feat.color}30`,
                    boxShadow: `0 0 16px ${feat.color}18`,
                  }}
                >
                  <feat.icon
                    className="w-5 h-5"
                    style={{ color: feat.color }}
                  />
                </div>
                <p className="text-white/85 text-sm font-semibold mb-1">
                  {feat.title}
                </p>
                <p className="text-white/30 text-xs leading-relaxed">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
