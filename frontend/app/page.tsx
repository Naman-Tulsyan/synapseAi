"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Play,
  Shield,
  Activity,
  Zap,
  Brain,
  Eye,
  TrendingUp,
  FileVideo,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";

const DEMO_SPORTS = [
  {
    id: "cricket",
    label: "Cricket",
    emoji: "🏏",
    desc: "Fast bowling analysis",
    color: "from-green-500/20 to-emerald-500/20",
    border: "border-green-500/30",
  },
  {
    id: "basketball",
    label: "Basketball",
    emoji: "🏀",
    desc: "Jump shot mechanics",
    color: "from-orange-500/20 to-amber-500/20",
    border: "border-orange-500/30",
  },
  {
    id: "football",
    label: "Football",
    emoji: "⚽",
    desc: "Sprint & tackle form",
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
  },
];

const FEATURES = [
  {
    icon: Eye,
    title: "Pose Estimation",
    desc: "MediaPipe-powered 33-point skeletal tracking",
  },
  {
    icon: Brain,
    title: "AI Risk Engine",
    desc: "Real-time injury probability scoring",
  },
  {
    icon: TrendingUp,
    title: "Trend Analysis",
    desc: "Session-over-session risk progression",
  },
  {
    icon: Zap,
    title: "Instant Feedback",
    desc: "Sub-second biomechanics assessment",
  },
];

export default function Home() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.size <= 50 * 1024 * 1024) {
      setUploadedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.size <= 50 * 1024 * 1024) {
        setUploadedFile(file);
      }
    },
    [],
  );

  const handleUpload = async () => {
    if (!uploadedFile) return;
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));
    const videoId = `upload_${Date.now().toString(36)}`;
    router.push(`/analysis/${videoId}?sport=cricket`);
  };

  const handleDemo = async (sport: string) => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    router.push(`/analysis/demo_${sport}?sport=${sport}`);
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      <Navbar />

      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/3 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20 relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-sm mb-8"
          >
            <Shield className="w-4 h-4" />
            Real-time Injury Risk Prediction
            <Activity className="w-4 h-4" />
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-white">Pose</span>
            <span className="gradient-text">Guard</span>
            <span className="text-white"> AI</span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            AI-powered pose estimation that predicts injury risks in real-time.
            Upload your sports footage and get instant biomechanics analysis.
          </p>
        </motion.div>

        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="max-w-2xl mx-auto mb-16"
        >
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-2xl p-12 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  AI Processing...
                </h3>
                <p className="text-white/40 text-sm">
                  Running pose estimation & risk analysis
                </p>
                <div className="mt-6 space-y-2">
                  {[
                    "Extracting frames...",
                    "Detecting pose landmarks...",
                    "Analyzing biomechanics...",
                  ].map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.5 }}
                      className="flex items-center gap-2 justify-center text-sm text-white/40"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      {step}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
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
                  className={`glass-card rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                    isDragging
                      ? "border-blue-500/50 bg-blue-500/10 scale-[1.02]"
                      : "hover:border-white/15"
                  }`}
                >
                  {uploadedFile ? (
                    <div className="space-y-4">
                      <div className="w-14 h-14 mx-auto rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <FileVideo className="w-7 h-7 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {uploadedFile.name}
                        </p>
                        <p className="text-white/40 text-sm mt-1">
                          {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={handleUpload}
                          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                          <Play className="w-4 h-4" /> Analyze Video
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setUploadedFile(null)}
                          className="border-white/10 text-white/60 hover:text-white gap-2"
                        >
                          <X className="w-4 h-4" /> Remove
                        </Button>
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
                      <div className="w-14 h-14 mx-auto rounded-xl bg-white/5 flex items-center justify-center mb-4">
                        <Upload className="w-7 h-7 text-white/30" />
                      </div>
                      <p className="text-white/70 font-medium mb-1">
                        Drag & drop your sports video
                      </p>
                      <p className="text-white/30 text-sm">
                        MP4, MOV, AVI — Max 50MB
                      </p>
                    </label>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Demo Sport Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="max-w-2xl mx-auto mb-20"
        >
          <p className="text-center text-white/30 text-sm mb-4 uppercase tracking-widest">
            Or try a demo
          </p>
          <div className="grid grid-cols-3 gap-4">
            {DEMO_SPORTS.map((sport, i) => (
              <motion.button
                key={sport.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                onClick={() => handleDemo(sport.id)}
                disabled={isProcessing}
                className={`glass-card glass-card-hover rounded-xl p-5 text-center transition-all duration-300 group disabled:opacity-50 ${sport.border}`}
              >
                <span className="text-3xl block mb-2">{sport.emoji}</span>
                <p className="text-white font-medium text-sm">{sport.label}</p>
                <p className="text-white/30 text-xs mt-1">{sport.desc}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.1 }}
              className="glass-card rounded-xl p-5 text-center"
            >
              <feat.icon className="w-8 h-8 mx-auto mb-3 text-blue-400/70" />
              <p className="text-white/80 text-sm font-medium">{feat.title}</p>
              <p className="text-white/30 text-xs mt-1">{feat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
