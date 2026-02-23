"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Send,
  Bot,
  User,
  Clock,
  Activity,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize2,
  Volume2,
  Sparkles,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/navbar";
import {
  getAnalysis,
  sendChat,
  getAnnotatedVideoUrl,
  getOriginalVideoUrl,
} from "@/lib/api";
import type { AnalysisData, RiskEntry, ChatResponse } from "@/lib/api";

// ── Pose Skeleton Overlay ───────────────────────────────────────

const SKELETON_CONNECTIONS = [
  ["nose", "left_eye"],
  ["nose", "right_eye"],
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

interface PosePoint {
  x: number;
  y: number;
  name: string;
}

function PoseOverlay({
  activeRisk,
  visible,
}: {
  activeRisk: RiskEntry | null;
  visible: boolean;
}) {
  // Generate pose based on which risk event is shown
  const poses: PosePoint[] = [
    { x: 0.5, y: 0.08, name: "nose" },
    { x: 0.48, y: 0.1, name: "left_eye" },
    { x: 0.52, y: 0.1, name: "right_eye" },
    { x: 0.43, y: 0.22, name: "left_shoulder" },
    { x: 0.57, y: 0.22, name: "right_shoulder" },
    { x: 0.37, y: 0.38, name: "left_elbow" },
    { x: 0.63, y: 0.36, name: "right_elbow" },
    { x: 0.34, y: 0.52, name: "left_wrist" },
    { x: 0.68, y: 0.48, name: "right_wrist" },
    { x: 0.45, y: 0.48, name: "left_hip" },
    { x: 0.55, y: 0.48, name: "right_hip" },
    { x: 0.43, y: 0.68, name: "left_knee" },
    { x: 0.58, y: 0.66, name: "right_knee" },
    { x: 0.42, y: 0.88, name: "left_ankle" },
    { x: 0.59, y: 0.86, name: "right_ankle" },
  ];

  const highlightParts = activeRisk
    ? activeRisk.part === "knee"
      ? ["left_knee", "right_knee", "left_hip", "right_hip"]
      : activeRisk.part === "shoulder"
        ? ["left_shoulder", "right_shoulder", "left_elbow", "right_elbow"]
        : activeRisk.part === "hip"
          ? ["left_hip", "right_hip", "left_knee"]
          : activeRisk.part === "ankle"
            ? ["left_ankle", "right_ankle", "left_knee", "right_knee"]
            : activeRisk.part === "lower_back"
              ? ["left_hip", "right_hip", "left_shoulder", "right_shoulder"]
              : activeRisk.part === "wrist"
                ? ["left_wrist", "right_wrist", "left_elbow", "right_elbow"]
                : []
    : [];

  if (!visible) return null;

  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
    >
      {/* Connections */}
      {SKELETON_CONNECTIONS.map(([from, to]) => {
        const p1 = poses.find((p) => p.name === from);
        const p2 = poses.find((p) => p.name === to);
        if (!p1 || !p2) return null;
        const isHighlighted =
          highlightParts.includes(from) && highlightParts.includes(to);
        return (
          <line
            key={`${from}-${to}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={isHighlighted ? "#ef4444" : "#3b82f6"}
            strokeWidth={isHighlighted ? 0.006 : 0.003}
            strokeOpacity={isHighlighted ? 0.9 : 0.5}
          />
        );
      })}
      {/* Keypoints */}
      {poses.map((p) => {
        const isHighlighted = highlightParts.includes(p.name);
        return (
          <circle
            key={p.name}
            cx={p.x}
            cy={p.y}
            r={isHighlighted ? 0.012 : 0.007}
            fill={isHighlighted ? "#ef4444" : "#3b82f6"}
            opacity={isHighlighted ? 1 : 0.7}
          >
            {isHighlighted && (
              <animate
                attributeName="r"
                values="0.012;0.016;0.012"
                dur="1s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        );
      })}
      {/* Risk label bubble */}
      {activeRisk && (
        <g>
          <rect
            x={0.62}
            y={0.02}
            width={0.35}
            height={0.08}
            rx={0.01}
            fill="rgba(0,0,0,0.7)"
            stroke={
              activeRisk.severity === "HIGH"
                ? "#ef4444"
                : activeRisk.severity === "MEDIUM"
                  ? "#f59e0b"
                  : "#10b981"
            }
            strokeWidth={0.002}
          />
          <text
            x={0.64}
            y={0.055}
            fill="white"
            fontSize={0.022}
            fontFamily="monospace"
          >
            {activeRisk.part.toUpperCase()} {activeRisk.risk}%
          </text>
          <text
            x={0.64}
            y={0.08}
            fill="rgba(255,255,255,0.5)"
            fontSize={0.016}
            fontFamily="monospace"
          >
            {activeRisk.timestamp}
          </text>
        </g>
      )}
    </motion.svg>
  );
}

// ── Chat Message Component ──────────────────────────────────────

interface ChatMsg {
  id: number;
  role: "user" | "ai";
  text: string;
  confidence?: number;
  relatedTimestamp?: string;
}

function ChatBubble({ msg }: { msg: ChatMsg }) {
  const isAI = msg.role === "ai";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
          isAI
            ? "bg-gradient-to-br from-blue-500/30 to-blue-600/20 ring-1 ring-blue-500/20"
            : "bg-gradient-to-br from-white/15 to-white/5 ring-1 ring-white/10"
        }`}
      >
        {isAI ? (
          <Bot className="w-4 h-4 text-blue-400" />
        ) : (
          <User className="w-4 h-4 text-white/70" />
        )}
      </div>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
          isAI
            ? "bg-white/[0.06] text-white/85 border border-white/[0.06] shadow-lg shadow-black/10"
            : "bg-blue-600/20 text-blue-50 border border-blue-500/20"
        }`}
      >
        <div className="whitespace-pre-wrap">{msg.text}</div>
        {isAI && msg.confidence && (
          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/[0.06] text-xs text-white/35">
            <Sparkles className="w-3 h-3 text-blue-400/50" />
            <span>{(msg.confidence * 100).toFixed(0)}% confidence</span>
            {msg.relatedTimestamp && (
              <>
                <span className="text-white/15">|</span>
                <Clock className="w-3 h-3" />
                <span>{msg.relatedTimestamp}</span>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Risk Card Component ─────────────────────────────────────────

function RiskCard({
  risk,
  onClick,
  isActive,
  index,
}: {
  risk: RiskEntry;
  onClick: () => void;
  isActive: boolean;
  index: number;
}) {
  const severityConfig = {
    HIGH: {
      border: "border-red-500/30",
      bg: "bg-red-500/[0.07]",
      activeBg: "bg-red-500/[0.12]",
      text: "text-red-400",
      barColor: "bg-red-500",
      icon: "🔥",
    },
    CRITICAL: {
      border: "border-red-500/30",
      bg: "bg-red-500/[0.10]",
      activeBg: "bg-red-500/[0.15]",
      text: "text-red-400",
      barColor: "bg-red-500",
      icon: "🚨",
    },
    MEDIUM: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/[0.07]",
      activeBg: "bg-amber-500/[0.12]",
      text: "text-amber-400",
      barColor: "bg-amber-500",
      icon: "⚠️",
    },
    LOW: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/[0.07]",
      activeBg: "bg-emerald-500/[0.12]",
      text: "text-emerald-400",
      barColor: "bg-emerald-500",
      icon: "✅",
    },
  };
  const c = severityConfig[risk.severity];

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 ${
        isActive
          ? `${c.border} ${c.activeBg} ring-1 ring-blue-500/40 shadow-lg shadow-black/20`
          : `${c.border} ${c.bg} hover:${c.activeBg}`
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{c.icon}</span>
          <span className="text-sm font-semibold text-white/80 capitalize">
            {risk.part.replace("_", " ")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold tabular-nums ${c.text}`}>
            {risk.risk}%
          </span>
        </div>
      </div>
      <p className="text-xs text-white/50 leading-relaxed mb-2.5 line-clamp-2">
        {risk.description}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-white/30" />
          <span className="text-xs font-mono text-white/40">
            {risk.timestamp}
          </span>
          {risk.angle && (
            <span className="text-xs text-white/25">{risk.angle}° dev</span>
          )}
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${c.text} border-current/30`}
        >
          {risk.severity}
        </Badge>
      </div>
      {/* Mini risk bar */}
      <div className="mt-2.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${risk.risk}%` }}
          transition={{ duration: 0.6, delay: index * 0.05 }}
          className={`h-full rounded-full ${c.barColor}/70`}
        />
      </div>
    </motion.button>
  );
}

// ── Main Page Component ─────────────────────────────────────────

export default function AnalysisPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const videoId = params.videoId as string;
  const sport = searchParams.get("sport") || "general";

  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [activeRiskIdx, setActiveRiskIdx] = useState<number | null>(null);
  const [showPose, setShowPose] = useState(true);
  const [rightTab, setRightTab] = useState<"risks" | "chat">("risks");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Poll for analysis results
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval>;
    let cancelled = false;

    async function fetchAnalysis() {
      try {
        const result = await getAnalysis(videoId, sport);
        if (cancelled) return;

        if (result.status === "done") {
          setData(result);
          setIsLoading(false);
          // Add initial chat message
          const riskCount = result.risks?.length || 0;
          const topRisk = result.risks?.length
            ? result.risks.reduce((a, b) => (a.risk > b.risk ? a : b))
            : null;
          setChatMessages([
            {
              id: 1,
              role: "ai",
              text: topRisk
                ? `👋 I'm your PoseGuard AI assistant. I've analyzed the session and found **${riskCount} risk events**. The most critical is **${topRisk.part.replace("_", " ")}** at ${topRisk.timestamp} with ${topRisk.risk}% risk. Ask me anything!`
                : `👋 Analysis complete! I found ${riskCount} risk events in this session. Ask me about any specific body part or for an overall summary.`,
              confidence: 0.95,
            },
          ]);
          if (pollTimer) clearInterval(pollTimer);
        } else if (result.status === "processing") {
          setProcessingProgress((prev) => Math.min(prev + 5, 90));
        } else if (result.status === "error") {
          setData(result);
          setIsLoading(false);
          if (pollTimer) clearInterval(pollTimer);
        }
      } catch {
        // Analysis not found yet, keep polling
      }
    }

    fetchAnalysis();
    pollTimer = setInterval(fetchAnalysis, 2000);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
    };
  }, [videoId, sport]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isTyping]);

  // Sync video state
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  }, []);

  // Auto-detect risk at current time
  useEffect(() => {
    if (!data?.risks) return;
    const timeStr = formatTime(currentTime);
    const idx = data.risks.findIndex((r) => r.timestamp === timeStr);
    if (idx !== -1) {
      setActiveRiskIdx(idx);
    }
  }, [currentTime, data?.risks]);

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMsg = {
      id: Date.now(),
      role: "user",
      text: chatInput.trim(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);
    setRightTab("chat");

    try {
      const aiResponse = await sendChat(videoId, userMsg.text);
      const aiMsg: ChatMsg = {
        id: Date.now() + 1,
        role: "ai",
        text: aiResponse.reply,
        confidence: aiResponse.confidence,
        relatedTimestamp: aiResponse.relatedTimestamp || undefined,
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: "Sorry, I couldn't process your question. Please try again.",
          confidence: 0.5,
        },
      ]);
    }
    setIsTyping(false);
  }, [chatInput, videoId]);

  const jumpToTimestamp = (timestamp: string) => {
    const parts = timestamp.split(":");
    const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
    }
    setCurrentTime(seconds);
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const newTime = pct * totalDuration;
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const totalDuration =
    videoDuration ||
    (data?.duration
      ? (() => {
          const p = data.duration.split(":");
          return parseInt(p[0]) * 60 + parseInt(p[1]);
        })()
      : 45);

  if (isLoading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Analyzing Video with YOLOv8...
            </h2>
            <p className="text-white/40 text-sm">
              Real-time pose estimation & risk analysis in progress
            </p>
            <div className="mt-4 max-w-xs mx-auto">
              <Progress value={processingProgress} className="h-2 bg-white/5" />
              <p className="text-xs text-white/30 mt-2">
                {processingProgress}% — Processing frames...
              </p>
            </div>
            <div className="mt-6 max-w-xs mx-auto space-y-3">
              {[
                "Extracting video frames",
                "Running YOLOv8 Pose model",
                "Computing biomechanical risk",
                "Generating annotated video",
              ].map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm text-white/40">{step}</span>
                  <div className="flex-1 h-1 rounded-full skeleton-shimmer" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  const activeRisk =
    activeRiskIdx !== null && data?.risks ? data.risks[activeRiskIdx] : null;

  if (!data || data.status === "error") {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Analysis Failed
            </h2>
            <p className="text-white/40 text-sm mb-4">
              {data?.error || "Something went wrong"}
            </p>
            <Link href="/">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Upload Another Video
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const risks = data.risks || [];
  const suggestions = data.suggestions || [];
  const annotatedVideoUrl = data.annotatedVideoUrl
    ? getAnnotatedVideoUrl(data.annotatedVideoUrl)
    : null;

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-16 h-screen flex flex-col">
        {/* Top Bar */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-white flex items-center gap-2">
                Analysis: {videoId}
                <Badge
                  variant="outline"
                  className="text-[10px] text-blue-400 border-blue-500/30"
                >
                  {sport.toUpperCase()}
                </Badge>
              </h1>
              <p className="text-xs text-white/30">
                {data.playerName} · {data.duration} duration · {data.fps}fps ·{" "}
                {data.totalFrames} frames
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/10">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-white/10 text-white/60 gap-1.5"
              >
                Player Dashboard <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-sm font-bold text-red-400">
                {data.overallRisk ?? 0}%
              </span>
              <span className="text-xs text-red-400/60">OVERALL RISK</span>
            </div>
          </div>
        </div>

        {/* Split Screen */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Video + Timeline (65%) */}
          <div className="w-[65%] flex flex-col border-r border-white/[0.06]">
            {/* Video Area */}
            <div className="flex-1 relative bg-black/40 flex items-center justify-center overflow-hidden">
              {annotatedVideoUrl ? (
                <video
                  ref={videoRef}
                  src={annotatedVideoUrl}
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-12 h-12 text-blue-500/30" />
                      </div>
                      <p className="text-white/20 text-sm">
                        Video processing...
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Pose Overlay */}
              <AnimatePresence>
                <PoseOverlay activeRisk={activeRisk} visible={showPose} />
              </AnimatePresence>

              {/* Video controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newTime = Math.max(0, currentTime - 5);
                      setCurrentTime(newTime);
                      if (videoRef.current)
                        videoRef.current.currentTime = newTime;
                    }}
                    className="text-white/60 hover:text-white h-8 w-8 p-0"
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={togglePlayback}
                    className="text-white hover:text-white h-10 w-10 p-0 bg-white/10 rounded-full"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newTime = Math.min(totalDuration, currentTime + 5);
                      setCurrentTime(newTime);
                      if (videoRef.current)
                        videoRef.current.currentTime = newTime;
                    }}
                    className="text-white/60 hover:text-white h-8 w-8 p-0"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-white/50 font-mono min-w-[70px]">
                    {formatTime(currentTime)} / {data.duration}
                  </span>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPose(!showPose)}
                    className={`text-xs gap-1 h-7 px-2 ${showPose ? "text-blue-400" : "text-white/40"}`}
                  >
                    <Activity className="w-3 h-3" />
                    Pose
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white/40 hover:text-white h-8 w-8 p-0"
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white/40 hover:text-white h-8 w-8 p-0"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="px-4 py-3 bg-black/30 border-t border-white/5">
              <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                className="relative h-10 cursor-pointer group"
              >
                {/* Timeline background */}
                <div className="absolute top-4 left-0 right-0 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500/40 rounded-full transition-all duration-100"
                    style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                  />
                </div>

                {/* Risk markers on timeline */}
                {risks.map((risk, i) => {
                  const parts = risk.timestamp.split(":");
                  const secs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                  const pct = (secs / totalDuration) * 100;
                  return (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        jumpToTimestamp(risk.timestamp);
                        setActiveRiskIdx(i);
                      }}
                      className="timeline-marker absolute top-2 -translate-x-1/2 z-10"
                      style={{ left: `${pct}%` }}
                      title={`${risk.timestamp} - ${risk.part} (${risk.risk}%)`}
                    >
                      <div
                        className={`w-3 h-6 rounded-sm ${
                          risk.severity === "HIGH"
                            ? "bg-red-500"
                            : risk.severity === "MEDIUM"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        } ${activeRiskIdx === i ? "ring-2 ring-white/50 scale-125" : ""}`}
                      />
                    </button>
                  );
                })}

                {/* Playhead */}
                <div
                  className="absolute top-1 -translate-x-1/2 w-1 h-8 bg-blue-400 rounded-full z-20 shadow-lg shadow-blue-500/30"
                  style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                />
              </div>

              {/* Active risk description */}
              <AnimatePresence mode="wait">
                {activeRisk && (
                  <motion.div
                    key={activeRiskIdx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 flex items-start gap-3"
                  >
                    <AlertTriangle
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        activeRisk.severity === "HIGH"
                          ? "text-red-400"
                          : activeRisk.severity === "MEDIUM"
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-white/40">
                          {activeRisk.timestamp}
                        </span>
                        <span className="text-xs text-white/60 capitalize font-medium">
                          {activeRisk.part.replace("_", " ")}
                        </span>
                        {activeRisk.angle && (
                          <span className="text-xs text-white/30">
                            {activeRisk.angle}° deviation
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40">
                        {activeRisk.description}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT: Tabbed Panel (35%) */}
          <div className="w-[35%] flex flex-col bg-black/20">
            {/* Overall Risk Summary — always visible */}
            <div className="p-4 border-b border-white/[0.06]">
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <span className="text-[11px] text-white/40 uppercase tracking-widest font-medium">
                      Overall Risk Score
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span
                        className={`text-4xl font-bold tabular-nums ${
                          (data.overallRisk ?? 0) >= 70
                            ? "text-red-400"
                            : (data.overallRisk ?? 0) >= 40
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }`}
                      >
                        {data.overallRisk ?? 0}%
                      </span>
                      <Badge
                        className={`${
                          (data.overallRisk ?? 0) >= 70
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : (data.overallRisk ?? 0) >= 40
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        }`}
                        variant="outline"
                      >
                        {data.overallSeverity}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                </div>
                <Progress
                  value={data.overallRisk ?? 0}
                  className="h-1.5 bg-white/5 mt-3"
                />
                <div className="flex items-center justify-between mt-2 text-[11px] text-white/30">
                  <span>{risks.length} risk events detected</span>
                  <span>
                    {
                      risks.filter(
                        (r) =>
                          r.severity === "HIGH" || r.severity === "CRITICAL",
                      ).length
                    }{" "}
                    critical
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="px-4 pt-2 pb-0 border-b border-white/[0.06]">
              <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
                <button
                  onClick={() => setRightTab("risks")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    rightTab === "risks"
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Risk Events
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      rightTab === "risks"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-white/5 text-white/30"
                    }`}
                  >
                    {risks.length}
                  </span>
                </button>
                <button
                  onClick={() => setRightTab("chat")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    rightTab === "chat"
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  AI Chat
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {rightTab === "risks" ? (
                /* ── Risk Events Tab ── */
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <div className="space-y-2.5">
                    {risks
                      .slice()
                      .sort((a, b) => b.risk - a.risk)
                      .map((risk, i) => {
                        const origIdx = risks.indexOf(risk);
                        return (
                          <RiskCard
                            key={origIdx}
                            risk={risk}
                            index={i}
                            isActive={activeRiskIdx === origIdx}
                            onClick={() => {
                              setActiveRiskIdx(origIdx);
                              jumpToTimestamp(risk.timestamp);
                            }}
                          />
                        );
                      })}
                  </div>

                  {/* Suggestions */}
                  <div className="mt-5 mb-3">
                    <h3 className="text-xs text-white/40 uppercase tracking-widest font-medium mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Recommendations
                    </h3>
                    <div className="space-y-2">
                      {suggestions.map((s, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.08 }}
                          className="flex gap-2.5 items-start p-2.5 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/10"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          <span className="text-xs text-white/55 leading-relaxed">
                            {s}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Chat Tab ── */
                <>
                  {/* Chat Messages - native scroll */}
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="space-y-4">
                      {chatMessages.map((msg) => (
                        <ChatBubble key={msg.id} msg={msg} />
                      ))}
                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-3 px-1"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center ring-1 ring-blue-500/20">
                            <Bot className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex gap-1.5 py-3 px-4 rounded-2xl bg-white/[0.06] border border-white/[0.06]">
                            <span
                              className="w-2 h-2 rounded-full bg-blue-400/60 animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="w-2 h-2 rounded-full bg-blue-400/60 animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="w-2 h-2 rounded-full bg-blue-400/60 animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        </motion.div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </div>

                  {/* Chat Input */}
                  <div className="p-3 border-t border-white/[0.06] bg-black/20">
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                        placeholder="Ask about any risk or body part..."
                        className="bg-white/[0.06] border-white/10 text-white text-sm placeholder:text-white/25 focus-visible:ring-blue-500/30 rounded-xl h-10"
                      />
                      <Button
                        size="sm"
                        onClick={handleSendChat}
                        disabled={!chatInput.trim() || isTyping}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-xl h-10 disabled:opacity-30"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex gap-1.5 mt-2.5 flex-wrap">
                      {[
                        "Why knee risk?",
                        "Shoulder analysis",
                        "Hip imbalance",
                        "Back issues",
                        "Overall summary",
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            setChatInput(q);
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] text-white/35 hover:text-white/70 hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
