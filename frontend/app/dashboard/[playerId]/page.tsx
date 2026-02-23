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
  CheckCircle2,
  ChevronRight,
  Activity,
  Flame,
  Shield,
  Zap,
  User,
  MapPin,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/navbar";
import { getPlayer } from "@/lib/api";
import type { PlayerProfile } from "@/lib/api";

// ── Custom Tooltip ──────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const risk = payload[0].value;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs">
      <p className="text-white/60 mb-1">{label}</p>
      <p
        className={`font-bold text-sm ${
          risk >= 70
            ? "text-red-400"
            : risk >= 40
              ? "text-amber-400"
              : "text-emerald-400"
        }`}
      >
        {risk}% Risk
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
      <TrendingUp className="w-3.5 h-3.5 text-red-400" />
    ) : trend === "decreasing" ? (
      <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
    ) : (
      <Minus className="w-3.5 h-3.5 text-amber-400" />
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
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
            <h2 className="text-xl font-semibold text-white mb-2">
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
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Upload a Video
              </Button>
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                <User className="w-8 h-8 text-blue-400" />
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
                  <Badge
                    variant="outline"
                    className="text-[10px] text-blue-400 border-blue-500/30 ml-1"
                  >
                    {player.sport}
                  </Badge>
                </div>
              </div>
            </div>
            <Link href="/">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                <Activity className="w-4 h-4" />
                New Analysis
              </Button>
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
              color:
                latestRisk >= 70
                  ? "text-red-400"
                  : latestRisk >= 40
                    ? "text-amber-400"
                    : "text-emerald-400",
              bg:
                latestRisk >= 70
                  ? "bg-red-500/10 border-red-500/20"
                  : latestRisk >= 40
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-emerald-500/10 border-emerald-500/20",
            },
            {
              label: "Sessions Tracked",
              value: `${player.riskHistory.length}`,
              sub: "Total",
              icon: Activity,
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-500/20",
            },
            {
              label: "Risk Zones",
              value: `${highZones}`,
              sub: "Active alerts",
              icon: AlertTriangle,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-500/20",
            },
            {
              label: "Best Session",
              value: `${bestSession}%`,
              sub: "Lowest risk",
              icon: Shield,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/20",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className={`glass-card rounded-xl p-4 border ${stat.bg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40 uppercase tracking-wider">
                  {stat.label}
                </span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-white/30 mt-0.5">{stat.sub}</p>
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
            className="lg:col-span-2 glass-card rounded-xl p-6 border border-white/5"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Injury Risk Trend
                </h2>
                <p className="text-xs text-white/30 mt-0.5">
                  Risk score progression over {player.riskHistory.length}{" "}
                  sessions
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-white/30">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" /> High
                  (&gt;70%)
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500/50" />{" "}
                  Medium
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500/50" /> Low
                  (&lt;40%)
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={player.riskHistory}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={70}
                  stroke="rgba(239,68,68,0.3)"
                  strokeDasharray="5 5"
                  label={{
                    value: "High Risk",
                    fill: "rgba(239,68,68,0.4)",
                    fontSize: 10,
                    position: "right",
                  }}
                />
                <ReferenceLine
                  y={40}
                  stroke="rgba(16,185,129,0.3)"
                  strokeDasharray="5 5"
                  label={{
                    value: "Safe Zone",
                    fill: "rgba(16,185,129,0.4)",
                    fontSize: 10,
                    position: "right",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="risk"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#riskGradient)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const color =
                      payload.risk >= 70
                        ? "#ef4444"
                        : payload.risk >= 40
                          ? "#f59e0b"
                          : "#10b981";
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={color}
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 7, stroke: "#3b82f6", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Injury Zones (1 col) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card rounded-xl p-6 border border-white/5"
          >
            <h2 className="text-sm font-semibold text-white mb-1">
              Body Risk Map
            </h2>
            <p className="text-xs text-white/30 mb-4">
              Current risk by body zone
            </p>
            <div className="space-y-4">
              {player.injuryZones.map((zone) => {
                const color =
                  zone.risk >= 70
                    ? "text-red-400"
                    : zone.risk >= 40
                      ? "text-amber-400"
                      : "text-emerald-400";
                const barColor =
                  zone.risk >= 70
                    ? "bg-red-500"
                    : zone.risk >= 40
                      ? "bg-amber-500"
                      : "bg-emerald-500";
                return (
                  <div key={zone.part}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/70 capitalize">
                          {zone.part}
                        </span>
                        <TrendIcon trend={zone.trend} />
                      </div>
                      <span className={`text-sm font-bold ${color}`}>
                        {zone.risk}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${zone.risk}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </div>
                  </div>
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
            className="glass-card rounded-xl p-6 border border-white/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Past Matches
                </h2>
                <p className="text-xs text-white/30 mt-0.5">
                  Session history & highlights
                </p>
              </div>
              <Calendar className="w-4 h-4 text-white/20" />
            </div>
            <div className="space-y-3">
              {player.pastMatches.map((match, i) => {
                const riskColor =
                  match.riskScore >= 70
                    ? "text-red-400 bg-red-500/10 border-red-500/20"
                    : match.riskScore >= 40
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors group cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center ${riskColor}`}
                    >
                      <span className="text-xs font-bold">
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
                      <Badge
                        variant="outline"
                        className="text-[10px] text-white/30 border-white/10 mt-0.5"
                      >
                        {match.status}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors" />
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
            className="glass-card rounded-xl p-6 border border-white/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Recommended Drills
                </h2>
                <p className="text-xs text-white/30 mt-0.5">
                  AI-curated exercises for injury prevention
                </p>
              </div>
              <Dumbbell className="w-4 h-4 text-white/20" />
            </div>
            <div className="space-y-4">
              {player.drills.map((drill, i) => {
                const targetColor =
                  drill.targetArea === "Knee"
                    ? "text-red-400 border-red-500/30 bg-red-500/10"
                    : drill.targetArea === "Shoulder"
                      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                      : "text-blue-400 border-blue-500/30 bg-blue-500/10";
                return (
                  <motion.div
                    key={drill.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="p-4 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-white/90">
                          {drill.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${targetColor}`}
                          >
                            <Target className="w-2.5 h-2.5 mr-1" />
                            {drill.targetArea}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] text-white/30 border-white/10"
                          >
                            {drill.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-emerald-400">
                          <TrendingDown className="w-3 h-3" />
                          <span className="text-sm font-bold">
                            -{drill.riskReduction}%
                          </span>
                        </div>
                        <span className="text-[10px] text-white/20">
                          risk reduction
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed mb-3">
                      {drill.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-white/30">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {drill.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {drill.frequency}
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
