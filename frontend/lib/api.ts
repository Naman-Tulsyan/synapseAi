const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface RiskEntry {
  timestamp: string;
  frame: number;
  risk: number;
  part: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "CRITICAL";
  description: string;
  angle?: number;
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
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat/${videoId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, videoId }),
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
