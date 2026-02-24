"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  VolumeX,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Timer,
  TrendingUp,
  Zap,
  Shield,
  Eye,
  EyeOff,
  Layers,
  MessageSquare,
  Target,
  Flame,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/navbar";
import { getAnalysis, sendChat, getAnnotatedVideoUrl } from "@/lib/api";
import type { AnalysisData, RiskEntry, TimestampSnapshot } from "@/lib/api";

// ── Brand Palette ───────────────────────────────────────────────
const C = {
  cyan: "#05F3FF",
  green: "#00FF87",
  yellow: "#EAFF00",
  purple: "#5D3C81",
  red: "#ff4d6d",
} as const;

function riskHex(r: number) {
  return r >= 70 ? C.red : r >= 40 ? C.yellow : C.green;
}

// ── Circular Risk Gauge ─────────────────────────────────────────

function RiskGauge({
  value,
  size = 120,
  strokeWidth = 10,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color =
    value >= 70
      ? { stroke: C.red, glow: "rgba(255,77,109,0.35)" }
      : value >= 40
        ? { stroke: C.yellow, glow: "rgba(234,255,0,0.30)" }
        : { stroke: C.green, glow: "rgba(0,255,135,0.30)" };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 8px ${color.glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-2xl font-bold tabular-nums"
          style={{ color: color.stroke }}
        >
          {value}%
        </motion.span>
        <span className="text-[10px] text-white/30 uppercase tracking-wider">
          Risk
        </span>
      </div>
    </div>
  );
}

// ── Stat Pill Component ────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
        accent
          ? "bg-cyan-400/[0.08] border-cyan-400/20"
          : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
      }`}
    >
      <Icon
        className={`w-3.5 h-3.5 ${accent ? "text-cyan-400" : "text-white/30"}`}
      />
      <div className="flex flex-col">
        <span className="text-[10px] text-white/30 leading-none">{label}</span>
        <span
          className={`text-xs font-medium leading-tight ${accent ? "text-cyan-300" : "text-white/70"}`}
        >
          {value}
        </span>
      </div>
    </div>
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
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex gap-2.5 ${isAI ? "" : "flex-row-reverse"}`}
    >
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          isAI
            ? "bg-gradient-to-br from-purple-600/20 to-cyan-500/20 ring-1 ring-cyan-500/20"
            : "bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/10"
        }`}
      >
        {isAI ? (
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
        ) : (
          <User className="w-3.5 h-3.5 text-white/60" />
        )}
      </div>
      <div className="max-w-[85%] group">
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
            isAI
              ? "bg-white/[0.04] text-white/80 border border-white/[0.06] rounded-tl-md"
              : "bg-[#5D3C81]/15 text-white/90 border border-[#5D3C81]/20 rounded-tr-md"
          }`}
        >
          <div className="whitespace-pre-wrap">{msg.text}</div>
        </div>
        {isAI && msg.confidence && (
          <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-white/25">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400/40" />
            <span>{(msg.confidence * 100).toFixed(0)}% confidence</span>
            {msg.relatedTimestamp && (
              <>
                <span className="text-white/10">·</span>
                <Clock className="w-2.5 h-2.5" />
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
      gradient: "from-red-500/10 to-red-500/[0.02]",
      border: "border-red-500/20",
      activeBorder: "border-red-500/40",
      text: "text-red-400",
      badge: "bg-red-500/15 text-red-400 border-red-500/25",
      bar: "bg-gradient-to-r from-red-500 to-red-400",
      icon: Flame,
    },
    CRITICAL: {
      gradient: "from-red-500/15 to-red-500/[0.03]",
      border: "border-red-500/25",
      activeBorder: "border-red-500/50",
      text: "text-red-400",
      badge: "bg-red-500/20 text-red-400 border-red-500/30",
      bar: "bg-gradient-to-r from-red-600 to-red-400",
      icon: AlertTriangle,
    },
    MEDIUM: {
      gradient: "from-yellow-400/10 to-yellow-400/[0.02]",
      border: "border-yellow-400/20",
      activeBorder: "border-yellow-400/40",
      text: "text-yellow-300",
      badge: "bg-yellow-400/15 text-yellow-300 border-yellow-400/25",
      bar: "bg-gradient-to-r from-yellow-400 to-yellow-300",
      icon: Target,
    },
    LOW: {
      gradient: "from-green-400/8 to-green-400/[0.01]",
      border: "border-green-400/15",
      activeBorder: "border-green-400/30",
      text: "text-green-400",
      badge: "bg-green-400/15 text-green-400 border-green-400/25",
      bar: "bg-gradient-to-r from-green-400 to-green-300",
      icon: CheckCircle2,
    },
  };
  const c = severityConfig[risk.severity];
  const SeverityIcon = c.icon;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`w-full text-left rounded-xl border transition-all duration-200 overflow-hidden group ${
        isActive
          ? `${c.activeBorder} ring-1 ring-cyan-400/30 shadow-lg shadow-black/30`
          : `${c.border} hover:border-white/15`
      }`}
    >
      <div className={`bg-gradient-to-r ${c.gradient} p-3.5`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.06]">
              <SeverityIcon className={`w-3.5 h-3.5 ${c.text}`} />
            </div>
            <div>
              <span className="text-sm font-semibold text-white/85 capitalize block leading-tight">
                {risk.part.replace("_", " ")}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="w-2.5 h-2.5 text-white/25" />
                <span className="text-[10px] font-mono text-white/30">
                  {risk.timestamp}
                </span>
                {risk.angle && (
                  <>
                    <span className="text-white/10">·</span>
                    <span className="text-[10px] text-white/25">
                      {risk.angle}°
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-xl font-bold tabular-nums ${c.text}`}>
              {risk.risk}
              <span className="text-sm font-normal opacity-60">%</span>
            </span>
          </div>
        </div>

        <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2 mb-3">
          {risk.description}
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${risk.risk}%` }}
              transition={{
                duration: 0.8,
                delay: index * 0.04,
                ease: "easeOut",
              }}
              className={`h-full rounded-full ${c.bar}`}
            />
          </div>
          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 h-4 ${c.badge}`}
          >
            {risk.severity}
          </Badge>
        </div>
      </div>
    </motion.button>
  );
}

// ── Timeline Snapshot Card ──────────────────────────────────────

function TimelineCard({
  snapshot,
  isActive,
  onClick,
  index,
}: {
  snapshot: TimestampSnapshot;
  isActive: boolean;
  onClick: () => void;
  index: number;
}) {
  const riskColor =
    snapshot.compositeRisk >= 60
      ? "text-red-400"
      : snapshot.compositeRisk >= 30
        ? "text-yellow-300"
        : "text-green-400";
  const dotColor =
    snapshot.compositeRisk >= 60
      ? "bg-red-500"
      : snapshot.compositeRisk >= 30
        ? "bg-yellow-400"
        : "bg-green-400";
  const borderColor = isActive
    ? "border-cyan-400/30 ring-1 ring-cyan-400/20"
    : "border-white/[0.05] hover:border-white/10";

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015 }}
      className={`w-full text-left rounded-xl border transition-all duration-200 bg-white/[0.02] hover:bg-white/[0.04] ${borderColor}`}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${dotColor} ${isActive ? "animate-pulse" : ""}`}
            />
            <span className="text-xs font-mono text-white/50 tracking-wide">
              {snapshot.timestamp}
            </span>
            <span className="text-[10px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded">
              F{snapshot.frame}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-base font-bold tabular-nums ${riskColor}`}>
              {snapshot.compositeRisk}%
            </span>
          </div>
        </div>

        {snapshot.factors.length > 0 && (
          <div className="space-y-1">
            {snapshot.factors.slice(0, 3).map((f, fi) => (
              <div key={fi} className="flex items-center gap-2 py-0.5">
                <div
                  className={`w-0.5 h-3.5 rounded-full ${
                    f.risk >= 60
                      ? "bg-red-500/60"
                      : f.risk >= 30
                        ? "bg-yellow-400/50"
                        : "bg-green-400/40"
                  }`}
                />
                <span className="text-[11px] text-white/50 flex-1 truncate capitalize">
                  {f.part.replace("_", " ")}
                </span>
                <span
                  className={`text-[11px] font-semibold tabular-nums ${
                    f.risk >= 60
                      ? "text-red-400/70"
                      : f.risk >= 30
                        ? "text-yellow-300/70"
                        : "text-green-400/60"
                  }`}
                >
                  {f.risk}%
                </span>
              </div>
            ))}
            {snapshot.factors.length > 3 && (
              <span className="text-[10px] text-white/20 pl-2.5">
                +{snapshot.factors.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}

// ── Mini Sparkline Bar Chart ────────────────────────────────────

function RiskSparkline({
  data,
  activeIndex,
  onClickBar,
}: {
  data: TimestampSnapshot[];
  activeIndex: number;
  onClickBar: (timestamp: string) => void;
}) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-white/25" />
          <span className="text-[10px] text-white/35 uppercase tracking-wider font-medium">
            Risk Timeline
          </span>
        </div>
        <span className="text-[10px] text-white/20">
          {data.length} snapshots
        </span>
      </div>
      <div className="flex items-end gap-px h-14">
        {data.map((snap, i) => {
          const isBarActive = i === activeIndex;
          const barColor =
            snap.compositeRisk >= 60
              ? "bg-red-500"
              : snap.compositeRisk >= 30
                ? "bg-yellow-400"
                : "bg-green-400";
          return (
            <button
              key={i}
              onClick={() => onClickBar(snap.timestamp)}
              className="flex-1 group relative cursor-pointer"
              title={`${snap.timestamp} — ${snap.compositeRisk}%`}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(snap.compositeRisk, 4)}%` }}
                transition={{ duration: 0.4, delay: i * 0.01 }}
                className={`w-full rounded-t-sm transition-all duration-150 ${barColor} ${
                  isBarActive
                    ? "opacity-100 ring-1 ring-white/30"
                    : "opacity-40 hover:opacity-70"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Pose Skeleton Overlay ───────────────────────────────────────

const SKELETON_CONNECTIONS: [string, string][] = [
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
            stroke={isHighlighted ? C.red : C.cyan}
            strokeWidth={isHighlighted ? 0.006 : 0.003}
            strokeOpacity={isHighlighted ? 0.9 : 0.5}
          />
        );
      })}
      {poses.map((p) => {
        const isHighlighted = highlightParts.includes(p.name);
        return (
          <circle
            key={p.name}
            cx={p.x}
            cy={p.y}
            r={isHighlighted ? 0.012 : 0.007}
            fill={isHighlighted ? C.red : C.cyan}
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
                ? C.red
                : activeRisk.severity === "MEDIUM"
                  ? C.yellow
                  : C.green
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
  const [isMuted, setIsMuted] = useState(false);
  const [rightTab, setRightTab] = useState<"risks" | "timeline" | "chat">(
    "timeline",
  );
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const activeSnapshotRef = useRef<HTMLDivElement>(null);

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
          const riskCount = result.risks?.length || 0;
          const topRisk = result.risks?.length
            ? result.risks.reduce((a, b) => (a.risk > b.risk ? a : b))
            : null;
          setChatMessages([
            {
              id: 1,
              role: "ai",
              text: topRisk
                ? `Hi! I've analyzed your session and found **${riskCount} risk events**. The highest risk is **${topRisk.part.replace("_", " ")}** at ${topRisk.timestamp} with ${topRisk.risk}% risk score. Ask me anything about the analysis!`
                : `Analysis complete! I found ${riskCount} risk events in this session. Ask me about any body part or for recommendations.`,
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
        // not ready yet
      }
    }

    fetchAnalysis();
    pollTimer = setInterval(fetchAnalysis, 2000);
    return () => {
      cancelled = true;
      clearInterval(pollTimer);
    };
  }, [videoId, sport]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isTyping]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setVideoDuration(videoRef.current.duration);
  }, []);

  useEffect(() => {
    if (!data?.risks) return;
    const timeStr = formatTime(currentTime);
    const idx = data.risks.findIndex((r) => r.timestamp === timeStr);
    if (idx !== -1) setActiveRiskIdx(idx);
  }, [currentTime, data?.risks]);

  const activeSnapshotIdx = useMemo(() => {
    if (!data?.timestampedAnalysis?.length) return -1;
    const sec = Math.floor(currentTime);
    const idx = data.timestampedAnalysis.findIndex((s) => s.second === sec);
    if (idx !== -1) return idx;
    let best = -1;
    for (let i = 0; i < data.timestampedAnalysis.length; i++) {
      if (data.timestampedAnalysis[i].second <= sec) best = i;
    }
    return best;
  }, [currentTime, data?.timestampedAnalysis]);

  useEffect(() => {
    if (rightTab === "timeline" && activeSnapshotRef.current) {
      activeSnapshotRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeSnapshotIdx, rightTab]);

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
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: aiResponse.reply,
          confidence: aiResponse.confidence,
          relatedTimestamp: aiResponse.relatedTimestamp || undefined,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: "Sorry, I couldn't process that. Please try again.",
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
      videoRef.current.pause();
    }
    setCurrentTime(seconds);
    setIsPlaying(false);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const newTime = pct * totalDuration;
    setCurrentTime(newTime);
    if (videoRef.current) videoRef.current.currentTime = newTime;
  };

  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setHoverTime(pct * totalDuration);
  };

  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (videoRef.current) videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
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

  // ── Loading Screen ──────────────────────────────────────────

  if (isLoading) {
    const steps = [
      { label: "Extracting video frames", icon: Layers },
      { label: "Running YOLOv8 pose estimation", icon: Activity },
      { label: "Computing biomechanical risk scores", icon: Shield },
      { label: "Generating annotated output", icon: Zap },
    ];

    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            {/* Spinner */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-white/[0.06]" />
                <motion.div
                  className="absolute inset-0 w-20 h-20 rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400/30"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-7 h-7 text-cyan-400/60" />
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-lg font-semibold text-white mb-1.5">
                Analyzing Your Video
              </h2>
              <p className="text-sm text-white/35">
                AI-powered pose estimation & injury risk prediction
              </p>
            </div>

            {/* Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40">Progress</span>
                <span className="text-xs font-mono" style={{ color: C.cyan }}>
                  {processingProgress}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${C.cyan}, ${C.green})`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${processingProgress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {steps.map((step, i) => {
                const isStepActive = i === Math.floor(processingProgress / 25);
                const isDone = i < Math.floor(processingProgress / 25);
                const StepIcon = step.icon;
                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      isStepActive
                        ? "bg-cyan-400/[0.06] border-cyan-400/20"
                        : isDone
                          ? "bg-green-400/[0.04] border-green-400/10"
                          : "bg-white/[0.02] border-white/[0.04]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isStepActive
                          ? "bg-cyan-400/15"
                          : isDone
                            ? "bg-green-400/15"
                            : "bg-white/[0.04]"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <StepIcon
                          className={`w-4 h-4 ${
                            isStepActive ? "text-cyan-400" : "text-white/20"
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-sm flex-1 ${
                        isStepActive
                          ? "text-white/80"
                          : isDone
                            ? "text-green-400/70"
                            : "text-white/25"
                      }`}
                    >
                      {step.label}
                    </span>
                    {isStepActive && (
                      <div className="flex gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: C.cyan, animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{
                            background: C.cyan,
                            animationDelay: "150ms",
                          }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{
                            background: C.cyan,
                            animationDelay: "300ms",
                          }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  // ── Error Screen ────────────────────────────────────────────

  const activeRisk =
    activeRiskIdx !== null && data?.risks ? data.risks[activeRiskIdx] : null;

  if (!data || data.status === "error") {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm px-4"
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Analysis Failed
            </h2>
            <p className="text-sm text-white/40 mb-6">
              {data?.error || "Something went wrong during processing"}
            </p>
            <Link href="/">
              <Button
                className="text-white rounded-xl px-6"
                style={{
                  background: `linear-gradient(135deg, ${C.cyan}, ${C.green})`,
                  color: "#06040f",
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>
    );
  }

  // ── Main View ───────────────────────────────────────────────

  const risks = data.risks || [];
  const suggestions = data.suggestions || [];
  const annotatedVideoUrl = data.annotatedVideoUrl
    ? getAnnotatedVideoUrl(data.annotatedVideoUrl)
    : null;

  const highRiskCount = risks.filter(
    (r) => r.severity === "HIGH" || r.severity === "CRITICAL",
  ).length;

  const tabs = [
    {
      id: "risks" as const,
      label: "Events",
      icon: Activity,
      count: risks.length,
      countColor: "text-red-400 bg-red-500/15",
    },
    {
      id: "timeline" as const,
      label: "Timeline",
      icon: Timer,
      count: data.timestampedAnalysis?.length || 0,
      countColor: "text-cyan-400 bg-cyan-400/15",
    },
    {
      id: "chat" as const,
      label: "AI Chat",
      icon: MessageSquare,
      count: null,
      countColor: "",
    },
  ];

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-16 h-screen flex flex-col">
        {/* ── Header Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 py-2.5 border-b border-white/[0.06] flex items-center justify-between bg-black/30 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-6 w-px bg-white/[0.06]" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-white/90">
                  Video Analysis
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] border-cyan-400/25 bg-cyan-400/[0.06] px-2 py-0"
                  style={{ color: C.cyan }}
                >
                  {sport.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[11px] text-white/30 mt-0.5">
                {data.playerName && `${data.playerName} · `}
                {data.duration} · {data.fps}fps · {data.totalFrames} frames
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatPill
              icon={Clock}
              label="Duration"
              value={data.duration || "—"}
            />
            <StatPill
              icon={Zap}
              label="Peak Risk"
              value={`${data.peakRisk ?? risks.reduce((max, r) => Math.max(max, r.risk), 0)}%`}
            />
            <StatPill
              icon={AlertTriangle}
              label="Critical"
              value={`${highRiskCount} events`}
            />
            <Link href="/dashboard/10">
              <Button
                size="sm"
                variant="outline"
                className="text-[11px] border-white/[0.08] text-white/50 gap-1.5 h-8 rounded-lg hover:bg-white/[0.04]"
              >
                Dashboard <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* ── Split Layout ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Video + Scrubber (65%) */}
          <div className="w-[65%] flex flex-col border-r border-white/[0.05]">
            {/* Video Area */}
            <div className="flex-1 relative bg-black/60 flex items-center justify-center overflow-hidden">
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
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-10 h-10 text-blue-500/20" />
                    </div>
                    <p className="text-white/20 text-sm">Preparing video...</p>
                  </div>
                </div>
              )}

              {/* Video Controls - Bottom Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-3 px-4">
                {/* Scrubber */}
                <div
                  ref={timelineRef}
                  onClick={handleTimelineClick}
                  onMouseMove={handleTimelineHover}
                  onMouseLeave={() => setHoverTime(null)}
                  className="relative h-8 cursor-pointer group mb-2"
                >
                  {/* Track */}
                  <div className="absolute top-3 left-0 right-0 h-1.5 bg-white/[0.08] rounded-full overflow-hidden group-hover:h-2.5 transition-all duration-200">
                    <div
                      className="h-full rounded-full transition-all duration-100 relative"
                      style={{
                        background: `linear-gradient(90deg, ${C.cyan}aa, ${C.cyan})`,
                        width: `${(currentTime / totalDuration) * 100}%`,
                      }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-blue-400 shadow-lg shadow-blue-500/40 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2" />
                    </div>
                  </div>

                  {/* Risk markers */}
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
                        className="absolute top-1 -translate-x-1/2 z-10"
                        style={{ left: `${pct}%` }}
                        title={`${risk.timestamp} — ${risk.part} (${risk.risk}%)`}
                      >
                        <div
                          className={`w-1.5 h-4 rounded-full transition-transform ${
                            risk.severity === "HIGH" ||
                            risk.severity === "CRITICAL"
                              ? "bg-red-500"
                              : risk.severity === "MEDIUM"
                                ? "bg-yellow-400"
                                : "bg-green-400"
                          } ${activeRiskIdx === i ? "scale-150 ring-1 ring-white/40" : "hover:scale-125"}`}
                        />
                      </button>
                    );
                  })}

                  {/* Hover tooltip */}
                  {hoverTime !== null && (
                    <div
                      className="absolute -top-6 -translate-x-1/2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-white/70 font-mono pointer-events-none"
                      style={{
                        left: `${(hoverTime / totalDuration) * 100}%`,
                      }}
                    >
                      {formatTime(hoverTime)}
                    </div>
                  )}
                </div>

                {/* Controls Row */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const t = Math.max(0, currentTime - 5);
                      setCurrentTime(t);
                      if (videoRef.current) videoRef.current.currentTime = t;
                    }}
                    className="text-white/50 hover:text-white h-8 w-8 p-0 rounded-lg hover:bg-white/10"
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={togglePlayback}
                    className="text-white hover:text-white h-9 w-9 p-0 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const t = Math.min(totalDuration, currentTime + 5);
                      setCurrentTime(t);
                      if (videoRef.current) videoRef.current.currentTime = t;
                    }}
                    className="text-white/50 hover:text-white h-8 w-8 p-0 rounded-lg hover:bg-white/10"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>

                  <span className="text-[11px] text-white/40 font-mono min-w-[80px] ml-1">
                    {formatTime(currentTime)}{" "}
                    <span className="text-white/20">/</span> {data.duration}
                  </span>

                  <div className="flex-1" />

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-white/30 hover:text-white/60 h-7 w-7 p-0 rounded-lg hover:bg-white/10"
                  >
                    {isMuted ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => videoRef.current?.requestFullscreen()}
                    className="text-white/30 hover:text-white/60 h-7 w-7 p-0 rounded-lg hover:bg-white/10"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Risk Banner */}
            <AnimatePresence mode="wait">
              {activeRisk && (
                <motion.div
                  key={activeRiskIdx}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-white/[0.06] overflow-hidden"
                >
                  <div className="px-5 py-2.5 bg-black/30 flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activeRisk.severity === "HIGH" ||
                        activeRisk.severity === "CRITICAL"
                          ? "bg-red-500/10"
                          : activeRisk.severity === "MEDIUM"
                            ? "bg-yellow-400/10"
                            : "bg-green-400/10"
                      }`}
                    >
                      <AlertTriangle
                        className={`w-4 h-4 ${
                          activeRisk.severity === "HIGH" ||
                          activeRisk.severity === "CRITICAL"
                            ? "text-red-400"
                            : activeRisk.severity === "MEDIUM"
                              ? "text-yellow-300"
                              : "text-green-400"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white/70 capitalize">
                          {activeRisk.part.replace("_", " ")}
                        </span>
                        <span className="text-[10px] font-mono text-white/30">
                          {activeRisk.timestamp}
                        </span>
                        {activeRisk.angle && (
                          <span className="text-[10px] text-white/20">
                            {activeRisk.angle}° deviation
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/35 truncate mt-0.5">
                        {activeRisk.description}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        activeRisk.severity === "HIGH" ||
                        activeRisk.severity === "CRITICAL"
                          ? "text-red-400 border-red-500/25"
                          : activeRisk.severity === "MEDIUM"
                            ? "text-yellow-300 border-yellow-400/25"
                            : "text-green-400 border-green-400/25"
                      }`}
                    >
                      {activeRisk.risk}% — {activeRisk.severity}
                    </Badge>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Analysis Panel (35%) */}
          <div className="w-[35%] flex flex-col bg-black/20">
            {/* Risk Gauge Section */}
            <div className="p-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-4">
                <RiskGauge
                  value={data.overallRisk ?? 0}
                  size={100}
                  strokeWidth={8}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      className={`text-[10px] px-2 ${
                        (data.overallRisk ?? 0) >= 70
                          ? "bg-red-500/15 text-red-400 border-red-500/25"
                          : (data.overallRisk ?? 0) >= 40
                            ? "bg-yellow-400/15 text-yellow-300 border-yellow-400/25"
                            : "bg-green-400/15 text-green-400 border-green-400/25"
                      }`}
                      variant="outline"
                    >
                      {data.overallSeverity}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                      <div className="text-[10px] text-white/25">Events</div>
                      <div className="text-sm font-semibold text-white/70">
                        {risks.length}
                      </div>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                      <div className="text-[10px] text-white/25">Critical</div>
                      <div className="text-sm font-semibold text-red-400/80">
                        {highRiskCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="px-4 pt-2 pb-0 border-b border-white/[0.05]">
              <div className="flex">
                {tabs.map((tab) => {
                  const isTabActive = rightTab === tab.id;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setRightTab(tab.id)}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                        isTabActive
                          ? "text-white"
                          : "text-white/35 hover:text-white/55"
                      }`}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      {tab.label}
                      {tab.count !== null && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            isTabActive
                              ? tab.countColor
                              : "bg-white/[0.04] text-white/25"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                      {tab.id === "chat" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      {isTabActive && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                          style={{ background: C.cyan }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <AnimatePresence mode="wait">
                {rightTab === "risks" ? (
                  <motion.div
                    key="risks"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 overflow-y-auto px-4 py-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-white/25 uppercase tracking-wider">
                        Sorted by severity
                      </span>
                      <span className="text-[10px] text-white/20">
                        {risks.length} total
                      </span>
                    </div>

                    <div className="space-y-2">
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

                    {suggestions.length > 0 && (
                      <div className="mt-6 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-green-400/10 flex items-center justify-center">
                            <Heart className="w-3 h-3 text-green-400" />
                          </div>
                          <span className="text-xs text-white/50 font-medium">
                            Recommendations
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {suggestions.map((s, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: 8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + i * 0.06 }}
                              className="flex gap-2 items-start px-3 py-2.5 rounded-xl bg-green-400/[0.04] border border-green-400/[0.08] hover:border-green-400/15 transition-colors"
                            >
                              <ChevronRight className="w-3 h-3 text-green-400/60 mt-0.5 shrink-0" />
                              <span className="text-[11px] text-white/50 leading-relaxed">
                                {s}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : rightTab === "timeline" ? (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    ref={timelineScrollRef}
                    className="flex-1 overflow-y-auto px-4 py-3"
                  >
                    {data.timestampedAnalysis &&
                    data.timestampedAnalysis.length > 0 ? (
                      <>
                        <div className="mb-3">
                          <RiskSparkline
                            data={data.timestampedAnalysis}
                            activeIndex={activeSnapshotIdx}
                            onClickBar={jumpToTimestamp}
                          />
                        </div>

                        <div className="space-y-1.5">
                          {data.timestampedAnalysis.map((snap, i) => (
                            <div
                              key={i}
                              ref={
                                i === activeSnapshotIdx
                                  ? activeSnapshotRef
                                  : undefined
                              }
                            >
                              <TimelineCard
                                snapshot={snap}
                                isActive={i === activeSnapshotIdx}
                                onClick={() => jumpToTimestamp(snap.timestamp)}
                                index={i}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-20">
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                            <Timer className="w-5 h-5 text-white/15" />
                          </div>
                          <p className="text-sm text-white/30">
                            No timestamped data
                          </p>
                          <p className="text-xs text-white/15 mt-1">
                            Process a video to see per-second analysis
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                      <div className="space-y-3">
                        {chatMessages.map((msg) => (
                          <ChatBubble key={msg.id} msg={msg} />
                        ))}
                        {isTyping && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2.5"
                          >
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600/20 to-cyan-500/20 flex items-center justify-center ring-1 ring-cyan-500/20">
                              <Bot className="w-3.5 h-3.5 text-cyan-400" />
                            </div>
                            <div className="flex gap-1 py-2.5 px-3.5 rounded-2xl rounded-tl-md bg-white/[0.04] border border-white/[0.06]">
                              <span
                                className="w-1.5 h-1.5 rounded-full animate-bounce"
                                style={{
                                  background: `${C.cyan}80`,
                                  animationDelay: "0ms",
                                }}
                              />
                              <span
                                className="w-1.5 h-1.5 rounded-full animate-bounce"
                                style={{
                                  background: `${C.cyan}80`,
                                  animationDelay: "150ms",
                                }}
                              />
                              <span
                                className="w-1.5 h-1.5 rounded-full animate-bounce"
                                style={{
                                  background: `${C.cyan}80`,
                                  animationDelay: "300ms",
                                }}
                              />
                            </div>
                          </motion.div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </div>

                    {/* Quick Prompts + Input */}
                    <div className="p-3 border-t border-white/[0.05] bg-black/30">
                      <div className="flex gap-1.5 mb-2.5 flex-wrap">
                        {[
                          "Why is knee risk high?",
                          "Shoulder analysis",
                          "Overall summary",
                          "Recommendations",
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => setChatInput(q)}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all border border-white/[0.04] hover:border-white/10"
                          >
                            {q}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSendChat()
                          }
                          placeholder="Ask about any risk or body part..."
                          className="bg-white/[0.04] border-white/[0.06] text-white text-sm placeholder:text-white/20 focus-visible:ring-cyan-400/25 rounded-xl h-9"
                        />
                        <button
                          onClick={handleSendChat}
                          disabled={!chatInput.trim() || isTyping}
                          className="px-3 rounded-xl h-9 disabled:opacity-20 transition-all flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${C.cyan}, ${C.green})`,
                          }}
                        >
                          <Send
                            className="w-3.5 h-3.5"
                            style={{ color: "#06040f" }}
                          />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
