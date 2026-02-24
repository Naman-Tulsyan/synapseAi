"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Square,
  Activity,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
  Maximize2,
  Minimize,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCameraWebSocketUrl,
  type CameraAnalysisFrame,
  type CameraSessionStart,
} from "@/lib/api";

function severityColor(severity: string) {
  switch (severity) {
    case "LOW":
      return "text-green-400";
    case "MEDIUM":
      return "text-yellow-400";
    case "HIGH":
      return "text-orange-400";
    case "CRITICAL":
      return "text-red-400";
    default:
      return "text-white/50";
  }
}

function riskBarColor(value: number) {
  if (value < 30) return "bg-green-500";
  if (value < 60) return "bg-yellow-500";
  if (value < 80) return "bg-orange-500";
  return "bg-red-500";
}

function riskGlowColor(value: number) {
  if (value < 30) return "rgba(16,185,129,0.3)";
  if (value < 60) return "rgba(245,158,11,0.3)";
  if (value < 80) return "rgba(249,115,22,0.3)";
  return "rgba(239,68,68,0.4)";
}

export default function LiveCamera() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<
    "idle" | "connecting" | "running" | "stopped"
  >("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentRisk, setCurrentRisk] = useState(0);
  const [severity, setSeverity] = useState("LOW");
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [avgRisk, setAvgRisk] = useState(0);
  const [peakRisk, setPeakRisk] = useState(0);
  const [fps, setFps] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [annotatedFrame, setAnnotatedFrame] = useState<string | null>(null);
  const [riskHistory, setRiskHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const stopCamera = useCallback(() => {
    // Stop sending frames
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Send stop message to WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      wsRef.current.close();
    }
    wsRef.current = null;

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setStatus("stopped");
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    setRiskHistory([]);
    setAnnotatedFrame(null);
    setFrameCount(0);
    setCurrentRisk(0);
    setAvgRisk(0);
    setPeakRisk(0);

    try {
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Connect WebSocket
      const ws = new WebSocket(getCameraWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("running");

        // Start capturing frames and sending them
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Send frames at ~8 FPS (balance between real-time feel and server load)
        intervalRef.current = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          if (video.readyState < 2) return;

          canvas.width = 640;
          canvas.height = 480;
          ctx.drawImage(video, 0, 0, 640, 480);

          canvas.toBlob(
            (blob) => {
              if (!blob) return;
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(",")[1];
                ws.send(JSON.stringify({ type: "frame", data: base64 }));
              };
              reader.readAsDataURL(blob);
            },
            "image/jpeg",
            0.7,
          );
        }, 125);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "session_start") {
          const startMsg = msg as CameraSessionStart;
          setSessionId(startMsg.sessionId);
        }

        if (msg.type === "analysis") {
          const data = msg as CameraAnalysisFrame;
          setCurrentRisk(data.risk);
          setSeverity(data.severity);
          setBreakdown(data.breakdown);
          setAvgRisk(data.avgRisk);
          setPeakRisk(data.peakRisk);
          setFps(data.fps);
          setElapsed(data.elapsed);
          setFrameCount(data.frame);
          setAnnotatedFrame(data.annotatedFrame);
          setRiskHistory((prev) => [...prev.slice(-120), data.risk]);
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection failed. Is the backend running?");
        setStatus("idle");
      };

      ws.onclose = () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        "Camera access denied. Please allow camera permissions and try again.",
      );
      setStatus("idle");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (wsRef.current) wsRef.current.close();
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const viewResults = () => {
    if (sessionId) {
      router.push(`/analysis/${sessionId}`);
    }
  };

  // Re-attach stream to video element whenever it mounts/changes
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  // Mini spark line
  const sparkLine = riskHistory.length > 1 ? riskHistory.slice(-60) : [];

  return (
    <div className="space-y-6">
      {/* Always-mounted video & canvas for camera capture — hidden from view */}
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      <canvas ref={canvasRef} className="hidden" />
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 justify-center">
        {status === "idle" || status === "stopped" ? (
          <>
            <Button
              onClick={startCamera}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6"
              size="lg"
            >
              <Camera className="w-5 h-5" />
              {status === "stopped" ? "Restart Camera" : "Start Camera"}
            </Button>
            {status === "stopped" && sessionId && (
              <Button
                onClick={viewResults}
                variant="outline"
                className="border-white/10 text-white/70 hover:text-white gap-2"
                size="lg"
              >
                <TrendingUp className="w-4 h-4" />
                View Full Report
              </Button>
            )}
          </>
        ) : status === "connecting" ? (
          <Button disabled className="gap-2 px-6" size="lg">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Connecting...
          </Button>
        ) : (
          <Button
            onClick={stopCamera}
            variant="destructive"
            className="gap-2 px-6"
            size="lg"
          >
            <Square className="w-4 h-4" />
            Stop Session
          </Button>
        )}
      </div>

      {/* Main content */}
      {(status === "running" || status === "stopped") && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-[2fr_380px] gap-6"
        >
          {/* Video / Annotated frame */}
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black/50 border border-white/5">
              {/* Show annotated frame from backend, or fall back to raw camera feed */}
              {annotatedFrame ? (
                <img
                  src={`data:image/jpeg;base64,${annotatedFrame}`}
                  alt="Annotated feed"
                  className="w-full aspect-video object-contain"
                />
              ) : (
                <video
                  className="w-full aspect-video object-contain"
                  playsInline
                  muted
                  autoPlay
                  ref={(el) => {
                    if (el && streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                />
              )}

              {/* Live indicator & fullscreen button */}
              {status === "running" && (
                <>
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-white/80 font-medium">
                      LIVE
                    </span>
                  </div>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors"
                  >
                    <Maximize2 className="w-4 h-4 text-white/80" />
                  </button>
                </>
              )}

              {/* Stats bar */}
              {status === "running" && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-between text-xs text-white/60">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatElapsed(elapsed)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {fps} FPS
                    </span>
                    <span>Frame {frameCount}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Risk history sparkline */}
            {sparkLine.length > 1 && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40 font-medium">
                    Risk History
                  </span>
                  <span className="text-xs text-white/30">Last 60 frames</span>
                </div>
                <div className="relative h-16">
                  <svg
                    viewBox={`0 0 ${sparkLine.length - 1} 100`}
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    {/* Threshold lines */}
                    <line
                      x1="0"
                      y1="70"
                      x2={sparkLine.length - 1}
                      y2="70"
                      stroke="rgba(16,185,129,0.3)"
                      strokeWidth="0.5"
                    />
                    <line
                      x1="0"
                      y1="40"
                      x2={sparkLine.length - 1}
                      y2="40"
                      stroke="rgba(245,158,11,0.3)"
                      strokeWidth="0.5"
                    />
                    <line
                      x1="0"
                      y1="20"
                      x2={sparkLine.length - 1}
                      y2="20"
                      stroke="rgba(239,68,68,0.3)"
                      strokeWidth="0.5"
                    />

                    {/* Fill */}
                    <polygon
                      points={`0,100 ${sparkLine.map((v, i) => `${i},${100 - v}`).join(" ")} ${sparkLine.length - 1},100`}
                      fill="rgba(59,130,246,0.1)"
                    />
                    {/* Line */}
                    <polyline
                      points={sparkLine
                        .map((v, i) => `${i},${100 - v}`)
                        .join(" ")}
                      fill="none"
                      stroke="rgba(59,130,246,0.8)"
                      strokeWidth="1"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Side panel — live metrics */}
          <div className="space-y-4">
            {/* Risk gauge */}
            <div
              className="glass-card rounded-xl p-6 text-center"
              style={{ boxShadow: `0 0 30px ${riskGlowColor(currentRisk)}` }}
            >
              <p className="text-xs text-white/40 mb-3 font-medium uppercase tracking-wider">
                Injury Risk
              </p>
              <div
                className="text-5xl font-bold mb-1"
                style={{
                  color:
                    currentRisk < 30
                      ? "#10b981"
                      : currentRisk < 60
                        ? "#f59e0b"
                        : currentRisk < 80
                          ? "#f97316"
                          : "#ef4444",
                }}
              >
                {currentRisk}%
              </div>
              <div
                className={`text-sm font-semibold ${severityColor(severity)}`}
              >
                {severity}
              </div>
              <div className="mt-3 flex justify-center gap-4 text-xs text-white/40">
                <span>Avg: {avgRisk}%</span>
                <span>Peak: {peakRisk}%</span>
              </div>
            </div>

            {/* Joint breakdown */}
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-white/40 mb-3 font-medium flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Joint Breakdown
              </p>
              <div className="space-y-2.5">
                {Object.keys(breakdown).length > 0 ? (
                  Object.entries(breakdown).map(([joint, val]) => (
                    <div key={joint}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60">{joint}</span>
                        <span
                          className="font-semibold"
                          style={{
                            color:
                              val < 30
                                ? "#10b981"
                                : val < 60
                                  ? "#f59e0b"
                                  : val < 80
                                    ? "#f97316"
                                    : "#ef4444",
                          }}
                        >
                          {val}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${riskBarColor(val)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${val}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-white/20 text-xs text-center py-2">
                    Waiting for pose detection...
                  </p>
                )}
              </div>
            </div>

            {/* Session stats */}
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-white/40 mb-3 font-medium">
                Session Stats
              </p>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-lg font-semibold text-white">
                    {formatElapsed(elapsed)}
                  </div>
                  <div className="text-[10px] text-white/30">Duration</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    {frameCount}
                  </div>
                  <div className="text-[10px] text-white/30">Frames</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    {avgRisk}%
                  </div>
                  <div className="text-[10px] text-white/30">Avg Risk</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    {peakRisk}%
                  </div>
                  <div className="text-[10px] text-white/30">Peak Risk</div>
                </div>
              </div>
            </div>

            {/* Stopped — view results button */}
            {status === "stopped" && sessionId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Button
                  onClick={viewResults}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <TrendingUp className="w-4 h-4" /> View Full Analysis Report
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Idle state */}
      {status === "idle" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-10 text-center max-w-lg mx-auto"
        >
          <div className="w-14 h-14 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
            <Camera className="w-7 h-7 text-blue-400/70" />
          </div>
          <p className="text-white/70 font-medium mb-1">Live Camera Analysis</p>
          <p className="text-white/30 text-sm mb-4">
            Start your camera to get real-time injury risk predictions with
            AI-powered pose estimation.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-white/30">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" /> Real-time scoring
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" /> Joint-level breakdown
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Session report
            </span>
          </div>
        </motion.div>
      )}

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <div className="relative w-full h-full max-w-6xl max-h-full">
              {/* Close button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Minimize button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-16 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors"
              >
                <Minimize className="w-5 h-5 text-white" />
              </button>

              {/* Fullscreen video */}
              <div className="w-full h-full rounded-xl overflow-hidden bg-black border border-white/10">
                {annotatedFrame ? (
                  <img
                    src={`data:image/jpeg;base64,${annotatedFrame}`}
                    alt="Annotated feed - Fullscreen"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    className="w-full h-full object-contain"
                    playsInline
                    muted
                    autoPlay
                    ref={(el) => {
                      if (el && streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                  />
                )}

                {/* Fullscreen overlay info */}
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div className="flex items-center gap-4 text-white/80">
                    <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm font-medium">LIVE</span>
                    </div>
                    <div className="bg-black/60 rounded-full px-3 py-1 text-sm">
                      Risk: {currentRisk}% - {severity}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Clock className="w-3 h-3" /> {formatElapsed(elapsed)}
                    <Zap className="w-3 h-3" /> {fps} FPS
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
