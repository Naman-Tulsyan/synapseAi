const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE = API_BASE.replace(/^http/, "ws");

export interface CameraAnalysisFrame {
  type: "analysis";
  frame: number;
  risk: number;
  severity: "HIGH" | "MEDIUM" | "LOW" | "CRITICAL";
  breakdown: Record<string, number>;
  avgRisk: number;
  peakRisk: number;
  fps: number;
  elapsed: number;
  annotatedFrame: string;
}

export interface CameraSessionStart {
  type: "session_start";
  sessionId: string;
}

export interface RiskEntry {
  timestamp: string;
  frame: number;
  risk: number;
  part: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "CRITICAL";
  description: string;
  angle?: number;
}

export interface TimestampFactor {
  factor: string;
  risk: number;
  part: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "CRITICAL";
  description: string;
  angle?: number | null;
}

export interface TimestampSnapshot {
  timestamp: string;
  second: number;
  frame: number;
  compositeRisk: number;
  severity: "HIGH" | "MEDIUM" | "LOW" | "CRITICAL";
  factors: TimestampFactor[];
}

export interface PoseKeypoint {
  x: number;
  y: number;
  confidence: number;
  name: string;
}

export interface AnalysisData {
  status: "processing" | "done" | "error";
  videoId: string;
  sport?: string;
  playerName?: string;
  overallRisk?: number;
  overallSeverity?: string;
  duration?: string;
  fps?: number;
  risks?: RiskEntry[];
  pose_keypoints?: PoseKeypoint[][];
  suggestions?: string[];
  riskTimeline?: number[];
  timestampedAnalysis?: TimestampSnapshot[];
  annotatedVideoUrl?: string;
  totalFrames?: number;
  peakRisk?: number;
  error?: string;
}

export interface ChatResponse {
  reply: string;
  confidence: number;
  relatedTimestamp?: string;
}

export interface PlayerProfile {
  playerId: number;
  name: string;
  sport: string;
  team: string;
  age: number;
  position: string;
  riskHistory: { date: string; risk: number; label: string }[];
  pastMatches: {
    date: string;
    opponent: string;
    riskScore: number;
    status: string;
    highlights: string;
  }[];
  drills: {
    id: number;
    name: string;
    description: string;
    duration: string;
    frequency: string;
    targetArea: string;
    difficulty: string;
    riskReduction: number;
  }[];
  injuryZones: { part: string; risk: number; trend: string }[];
}

export async function uploadVideo(
  file: File,
): Promise<{ videoId: string; filename: string; status: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function getAnalysis(
  videoId: string,
  sport = "general",
): Promise<AnalysisData> {
  const res = await fetch(`${API_BASE}/analysis/${videoId}?sport=${sport}`);
  if (!res.ok) throw new Error("Analysis not found");
  return res.json();
}

export async function sendChat(
  videoId: string,
  message: string,
  history?: { role: "user" | "ai"; text: string }[],
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat/${videoId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, videoId, history: history || [] }),
  });
  return res.json();
}

export async function getPlayer(playerId: number): Promise<PlayerProfile> {
  const res = await fetch(`${API_BASE}/players/${playerId}`);
  return res.json();
}

export function getAnnotatedVideoUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function getOriginalVideoUrl(videoId: string): string {
  return `${API_BASE}/video/${videoId}`;
}

export function getCameraWebSocketUrl(): string {
  return `${WS_BASE}/ws/camera`;
}

export async function saveCameraSession(session: {
  sessionId: string;
  riskScores: number[];
  riskTimeline: number[];
  events: Array<{
    timestamp: string;
    frame: number;
    risk: number;
    part: string;
    severity: string;
    description: string;
  }>;
  duration: number;
  totalFrames: number;
}): Promise<{ status: string; videoId: string }> {
  const res = await fetch(`${API_BASE}/camera/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error("Failed to save camera session");
  return res.json();
}
