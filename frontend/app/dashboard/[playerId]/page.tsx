"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  Target,
  Dumbbell,
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  Activity,
  Flame,
  Shield,
  Zap,
  User,
  MapPin,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import Navbar from "@/components/navbar";
import { getPlayer } from "@/lib/api";
import type { PlayerProfile } from "@/lib/api";

// ── Custom Tooltip ──────────────────────────────────────────────

const C = {
  cyan: "#05F3FF",
  green: "#00FF87",
  yellow: "#EAFF00",
  purple: "#5D3C81",
  red: "#ff4d6d",
} as const;
function riskColor(r: number) {
  return r >= 70 ? C.red : r >= 40 ? C.yellow : C.green;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const risk = payload[0].value;
  const color = riskColor(risk);
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs"
      style={{
        background: "rgba(6,4,15,0.95)",
        border: `1px solid ${color}35`,
        boxShadow: `0 0 20px ${color}18`,
        backdropFilter: "blur(20px)",
      }}
    >
      <p className="text-white/50 mb-1 font-medium">{label}</p>
      <p className="font-bold text-base" style={{ color }}>
        {risk}% <span className="text-xs font-normal opacity-60">Risk</span>
      </p>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function PlayerDashboard() {
  const params = useParams();
  const playerId = params.playerId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    async function fetchPlayer() {
      try {
        const data = await getPlayer(parseInt(playerId) || 1);
        setPlayer(data);
      } catch (err) {
        console.error("Failed to fetch player:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlayer();
  }, [playerId]);

  const TrendIcon = ({ trend }: { trend: string }) =>
    trend === "increasing" ? (
      <TrendingUp className="w-3.5 h-3.5" style={{ color: C.red }} />
    ) : trend === "decreasing" ? (
      <TrendingDown className="w-3.5 h-3.5" style={{ color: C.green }} />
    ) : (
      <Minus className="w-3.5 h-3.5" style={{ color: C.yellow }} />
    );

  if (isLoading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  border: "2px solid rgba(5,243,255,0.15)",
                  borderTopColor: "#05F3FF",
                  boxShadow: "0 0 20px rgba(5,243,255,0.25)",
                }}
              />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Loading Player Profile...
            </h2>
            <p className="text-white/40 text-sm">
              Aggregating performance data
            </p>
          </motion.div>
        </div>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">
              No Data Yet
            </h2>
            <p className="text-white/40 text-sm mb-4">
              Upload and analyze a video first to build your player profile.
            </p>
            <Link href="/">
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #05F3FF, #00FF87)",
                  color: "#06040f",
                  boxShadow: "0 0 24px rgba(5,243,255,0.35)",
                }}
              >
                Upload a Video
              </button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const latestRisk =
    player.riskHistory.length > 0
      ? player.riskHistory[player.riskHistory.length - 1].risk
      : 0;
  const bestSession =
    player.riskHistory.length > 0
      ? Math.min(...player.riskHistory.map((h) => h.risk))
      : 0;
  const highZones = player.injuryZones.filter((z) => z.risk >= 50).length;

  return (
    <main className="min-h-screen pb-12">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Upload
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(93,60,129,0.35), rgba(5,243,255,0.15))",
                  border: "1px solid rgba(5,243,255,0.28)",
                  boxShadow: "0 0 24px rgba(93,60,129,0.25)",
                }}
              >
                <User className="w-8 h-8" style={{ color: "#05F3FF" }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{player.name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-white/40">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {player.team}
                  </span>
                  <span>·</span>
                  <span>{player.position}</span>
                  <span>·</span>
                  <span>Age {player.age}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium ml-1"
                    style={{
                      background: "rgba(93,60,129,0.20)",
                      border: "1px solid rgba(93,60,129,0.40)",
                      color: "#05F3FF",
                    }}
                  >
                    {player.sport}
                  </span>
                </div>
              </div>
            </div>
            <Link href="/">
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(5,243,255,0.18), rgba(0,255,135,0.10))",
                  border: "1px solid rgba(5,243,255,0.30)",
                  color: "#05F3FF",
                  boxShadow: "0 0 20px rgba(5,243,255,0.18)",
                }}
              >
                <Activity className="w-4 h-4" />
                New Analysis
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            {
              label: "Current Risk",
              value: `${latestRisk}%`,
              sub:
                latestRisk >= 70 ? "HIGH" : latestRisk >= 40 ? "MEDIUM" : "LOW",
              icon: Flame,
              color: riskColor(latestRisk),
            },
            {
              label: "Sessions",
              value: `${player.riskHistory.length}`,
              sub: "Tracked",
              icon: Activity,
              color: C.cyan,
            },
            {
              label: "Risk Zones",
              value: `${highZones}`,
              sub: "Active alerts",
              icon: AlertTriangle,
              color: C.yellow,
            },
            {
              label: "Best Session",
              value: `${bestSession}%`,
              sub: "Lowest risk",
              icon: Shield,
              color: C.green,
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className="rounded-xl p-5"
              style={{
                background: `${stat.color}08`,
                border: `1px solid ${stat.color}22`,
                backdropFilter: "blur(16px)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
                  {stat.label}
                </span>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${stat.color}14` }}
                >
                  <stat.icon
                    className="w-3.5 h-3.5"
                    style={{ color: stat.color }}
                  />
                </div>
              </div>
              <p
                className="text-3xl font-extrabold tabular-nums"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
              <p
                className="text-xs mt-1 font-medium"
                style={{ color: `${stat.color}70` }}
              >
                {stat.sub}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Trend Chart (2 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 glass-card rounded-2xl p-6"
            style={{ border: "1px solid rgba(5,243,255,0.14)" }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white">
                  Injury Risk Trend
                </h2>
                <p className="text-xs text-white/30 mt-0.5">
                  Risk score over {player.riskHistory.length} sessions
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/30 flex-wrap justify-end">
                {[
                  { color: C.red, label: "High >70%" },
                  { color: C.yellow, label: "Medium" },
                  { color: C.green, label: "Low <40%" },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: color,
                        boxShadow: `0 0 4px ${color}`,
                      }}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={player.riskHistory}
                margin={{ top: 5, right: 20, bottom: 0, left: -10 }}
              >
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.cyan} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(93,60,129,0.12)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(93,60,129,0.18)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(93,60,129,0.18)" }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={70}
                  stroke="rgba(255,77,109,0.45)"
                  strokeDasharray="6 4"
                  label={{
                    value: "High Risk",
                    fill: "rgba(255,77,109,0.60)",
                    fontSize: 10,
                    position: "right",
                  }}
                />
                <ReferenceLine
                  y={40}
                  stroke="rgba(0,255,135,0.40)"
                  strokeDasharray="6 4"
                  label={{
                    value: "Safe Zone",
                    fill: "rgba(0,255,135,0.55)",
                    fontSize: 10,
                    position: "right",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="risk"
                  stroke={C.cyan}
                  strokeWidth={2.5}
                  fill="url(#riskGradient)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const color = riskColor(payload.risk);
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={color}
                        stroke="rgba(6,4,15,0.6)"
                        strokeWidth={2}
                        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                      />
                    );
                  }}
                  activeDot={{
                    r: 8,
                    stroke: C.cyan,
                    strokeWidth: 2,
                    fill: C.cyan,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Injury Zones (1 col) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card rounded-2xl p-6"
            style={{ border: "1px solid rgba(93,60,129,0.22)" }}
          >
            <h2 className="text-base font-bold text-white mb-1">
              Body Risk Map
            </h2>
            <p className="text-xs text-white/30 mb-5">Current risk by zone</p>
            <div className="space-y-4">
              {player.injuryZones.map((zone, zi) => {
                const color = riskColor(zone.risk);
                return (
                  <motion.div
                    key={zone.part}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + zi * 0.06 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: color,
                            boxShadow: `0 0 5px ${color}`,
                          }}
                        />
                        <span className="text-sm text-white/70 capitalize font-medium">
                          {zone.part}
                        </span>
                        <TrendIcon trend={zone.trend} />
                      </div>
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color }}
                      >
                        {zone.risk}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${zone.risk}%` }}
                        transition={{
                          duration: 1,
                          delay: 0.4 + zi * 0.06,
                          ease: "easeOut",
                        }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${color}cc, ${color})`,
                          boxShadow: `0 0 8px ${color}50`,
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Bottom Grid: Past Matches + Drills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Past Matches */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-6"
            style={{ border: "1px solid rgba(93,60,129,0.18)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">Past Matches</h2>
                <p className="text-xs text-white/30 mt-0.5">
                  Session history & risk scores
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "rgba(93,60,129,0.18)",
                  border: "1px solid rgba(93,60,129,0.30)",
                }}
              >
                <Calendar className="w-4 h-4" style={{ color: "#05F3FF" }} />
              </div>
            </div>
            <div className="space-y-3">
              {player.pastMatches.map((match, i) => {
                const mColor = riskColor(match.riskScore);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer group"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: `${mColor}10`,
                        border: `1px solid ${mColor}28`,
                      }}
                    >
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: mColor }}
                      >
                        {match.riskScore}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 font-medium">
                        vs {match.opponent}
                      </p>
                      <p className="text-xs text-white/30 truncate">
                        {match.highlights}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-white/30">{match.date}</p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          color: "rgba(255,255,255,0.30)",
                        }}
                      >
                        {match.status}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-40 transition-opacity" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Personalized Drills */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card rounded-2xl p-6"
            style={{ border: "1px solid rgba(0,255,135,0.12)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">
                  Recommended Drills
                </h2>
                <p className="text-xs text-white/30 mt-0.5">
                  AI-curated injury prevention
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "rgba(0,255,135,0.12)",
                  border: "1px solid rgba(0,255,135,0.25)",
                }}
              >
                <Dumbbell className="w-4 h-4" style={{ color: "#00FF87" }} />
              </div>
            </div>
            <div className="space-y-4">
              {player.drills.map((drill, i) => {
                const tColors: Record<string, string> = {
                  Knee: C.red,
                  Shoulder: C.yellow,
                  Hip: C.cyan,
                  Ankle: C.purple,
                };
                const tColor = tColors[drill.targetArea] ?? C.cyan;
                return (
                  <motion.div
                    key={drill.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="p-4 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-semibold text-white/90">
                          {drill.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: `${tColor}12`,
                              border: `1px solid ${tColor}28`,
                              color: tColor,
                            }}
                          >
                            <Target className="w-2.5 h-2.5" />
                            {drill.targetArea}
                          </span>
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.35)",
                            }}
                          >
                            {drill.difficulty}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div
                          className="flex items-center gap-1 justify-end"
                          style={{ color: C.green }}
                        >
                          <TrendingDown className="w-3 h-3" />
                          <span className="text-sm font-bold">
                            -{drill.riskReduction}%
                          </span>
                        </div>
                        <span className="text-[10px] text-white/25">
                          risk reduction
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-white/35 leading-relaxed mb-3">
                      {drill.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-white/30">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" style={{ color: C.cyan }} />
                        {drill.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" style={{ color: C.yellow }} />
                        {drill.frequency}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
