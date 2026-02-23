from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import uuid
import os
import shutil
import math
import cv2
import numpy as np
from ultralytics import YOLO
from collections import deque

# ── App Setup ────────────────────────────────────────────────────

app = FastAPI(title="PoseGuard AI", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Note: annotated videos served via /outputs/{video_id} endpoint below

# ── YOLO Model (loaded once) ────────────────────────────────────

CONF_THRESH = 0.5
MODEL_SIZE = "n"
model = YOLO(f"yolov8{MODEL_SIZE}-pose.pt")
print(f"✅ YOLOv8{MODEL_SIZE.upper()}-Pose model loaded")

# ── In-memory analysis store ────────────────────────────────────

analyses: dict = {}

# ── Pydantic Models ──────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    videoId: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    confidence: float
    relatedTimestamp: Optional[str] = None

class UploadResponse(BaseModel):
    videoId: str
    filename: str
    status: str

# ── YOLOv8 Keypoint Names ───────────────────────────────────────

KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]

FACTOR_TO_PART = {
    "L_ACL": "knee", "R_ACL": "knee",
    "L_Hip": "hip", "R_Hip": "hip",
    "Trunk": "lower_back",
    "Shoulder_Asym": "shoulder",
    "Hip_Asym": "hip",
    "L_Ankle": "ankle", "R_Ankle": "ankle",
}

FACTOR_DESCRIPTIONS = {
    "L_ACL": "Left knee valgus detected — ACL injury risk from inward knee collapse during movement.",
    "R_ACL": "Right knee valgus detected — ACL injury risk from inward knee collapse during movement.",
    "L_Hip": "Left hip flexion exceeds safe range — potential hip flexor strain.",
    "R_Hip": "Right hip flexion exceeds safe range — potential hip flexor strain.",
    "Trunk": "Excessive trunk lean detected — increased spinal load and lower back injury risk.",
    "Shoulder_Asym": "Shoulder asymmetry detected — compensatory strain pattern increasing injury risk.",
    "Hip_Asym": "Hip asymmetry detected — uneven load distribution may lead to overuse injury.",
    "L_Ankle": "Left ankle dorsiflexion concern — poor landing mechanics increasing joint stress.",
    "R_Ankle": "Right ankle dorsiflexion concern — poor landing mechanics increasing joint stress.",
}

# ── Biomechanical Analysis Engine ────────────────────────────────

def calculate_angle(a, b, c):
    """Angle at joint B, formed by A-B-C (in degrees)."""
    a, b, c = np.array(a, float), np.array(b, float), np.array(c, float)
    ba, bc = a - b, c - b
    norm_ba, norm_bc = np.linalg.norm(ba), np.linalg.norm(bc)
    if norm_ba == 0 or norm_bc == 0:
        return 180.0
    cosine = np.dot(ba, bc) / (norm_ba * norm_bc)
    return float(np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0))))


def trunk_lean_angle(shoulder_mid, hip_mid):
    """Angle of the torso line from vertical."""
    dx = hip_mid[0] - shoulder_mid[0]
    dy = hip_mid[1] - shoulder_mid[1]
    if dy == 0:
        return 0.0
    return abs(math.degrees(math.atan2(dx, dy)))


def is_visible(kp):
    return kp[0] > 0 and kp[1] > 0


def analyze_person(person_kp, person_conf):
    """
    Analyze one detected person's pose.
    Returns (risks dict, composite score 0-100, details dict with angles).
    """
    risks = {}
    details = {}

    def kp(idx):
        return person_kp[idx] if (person_conf[idx] > CONF_THRESH and is_visible(person_kp[idx])) else None

    l_shoulder = kp(5);  r_shoulder = kp(6)
    l_hip      = kp(11); r_hip      = kp(12)
    l_knee     = kp(13); r_knee     = kp(14)
    l_ankle    = kp(15); r_ankle    = kp(16)

    # 1. Left Knee ACL
    if all(v is not None for v in [l_hip, l_knee, l_ankle]):
        angle = calculate_angle(l_hip, l_knee, l_ankle)
        details["L_Knee"] = angle
        if angle < 120:   risks["L_ACL"] = 90
        elif angle < 140: risks["L_ACL"] = 60
        elif angle < 160: risks["L_ACL"] = 30
        else:             risks["L_ACL"] = 0

    # 2. Right Knee ACL
    if all(v is not None for v in [r_hip, r_knee, r_ankle]):
        angle = calculate_angle(r_hip, r_knee, r_ankle)
        details["R_Knee"] = angle
        if angle < 120:   risks["R_ACL"] = 90
        elif angle < 140: risks["R_ACL"] = 60
        elif angle < 160: risks["R_ACL"] = 30
        else:             risks["R_ACL"] = 0

    # 3. Left Hip
    if all(v is not None for v in [l_shoulder, l_hip, l_knee]):
        angle = calculate_angle(l_shoulder, l_hip, l_knee)
        details["L_Hip"] = angle
        if angle < 100:   risks["L_Hip"] = 80
        elif angle < 130: risks["L_Hip"] = 45
        elif angle < 150: risks["L_Hip"] = 20
        else:             risks["L_Hip"] = 0

    # 4. Right Hip
    if all(v is not None for v in [r_shoulder, r_hip, r_knee]):
        angle = calculate_angle(r_shoulder, r_hip, r_knee)
        details["R_Hip"] = angle
        if angle < 100:   risks["R_Hip"] = 80
        elif angle < 130: risks["R_Hip"] = 45
        elif angle < 150: risks["R_Hip"] = 20
        else:             risks["R_Hip"] = 0

    # 5. Trunk Lean
    if all(v is not None for v in [l_shoulder, r_shoulder, l_hip, r_hip]):
        shoulder_mid = ((l_shoulder[0] + r_shoulder[0]) / 2,
                        (l_shoulder[1] + r_shoulder[1]) / 2)
        hip_mid = ((l_hip[0] + r_hip[0]) / 2,
                   (l_hip[1] + r_hip[1]) / 2)
        lean = trunk_lean_angle(shoulder_mid, hip_mid)
        details["Trunk"] = lean
        if lean > 35:   risks["Trunk"] = 75
        elif lean > 25: risks["Trunk"] = 50
        elif lean > 15: risks["Trunk"] = 25
        else:           risks["Trunk"] = 0

    # 6. Shoulder Asymmetry
    if all(v is not None for v in [l_shoulder, r_shoulder]):
        diff = abs(l_shoulder[1] - r_shoulder[1])
        if diff > 40:   risks["Shoulder_Asym"] = 70
        elif diff > 25: risks["Shoulder_Asym"] = 40
        elif diff > 15: risks["Shoulder_Asym"] = 20
        else:           risks["Shoulder_Asym"] = 0

    # 7. Hip Asymmetry
    if all(v is not None for v in [l_hip, r_hip]):
        diff = abs(l_hip[1] - r_hip[1])
        if diff > 40:   risks["Hip_Asym"] = 70
        elif diff > 25: risks["Hip_Asym"] = 40
        elif diff > 15: risks["Hip_Asym"] = 20
        else:           risks["Hip_Asym"] = 0

    # 8. Left Ankle
    if all(v is not None for v in [l_knee, l_ankle]):
        virtual_toe = (l_ankle[0] + (l_ankle[0] - l_knee[0]) * 0.3, l_ankle[1] + 30)
        angle = calculate_angle(l_knee, l_ankle, virtual_toe)
        if angle > 120:   risks["L_Ankle"] = 60
        elif angle > 110: risks["L_Ankle"] = 30
        else:             risks["L_Ankle"] = 0

    # 9. Right Ankle
    if all(v is not None for v in [r_knee, r_ankle]):
        virtual_toe = (r_ankle[0] + (r_ankle[0] - r_knee[0]) * 0.3, r_ankle[1] + 30)
        angle = calculate_angle(r_knee, r_ankle, virtual_toe)
        if angle > 120:   risks["R_Ankle"] = 60
        elif angle > 110: risks["R_Ankle"] = 30
        else:             risks["R_Ankle"] = 0

    # Composite weighted score
    weights = {
        "L_ACL": 0.25, "R_ACL": 0.25,
        "L_Hip": 0.10, "R_Hip": 0.10,
        "Trunk": 0.12,
        "Shoulder_Asym": 0.05, "Hip_Asym": 0.05,
        "L_Ankle": 0.04, "R_Ankle": 0.04,
    }
    total_weight = sum(weights[k] for k in risks if k in weights)
    if total_weight > 0:
        composite = sum(risks[k] * weights[k] for k in risks if k in weights) / total_weight
    else:
        composite = 0

    return risks, min(int(composite), 100), details


# ── Helpers ──────────────────────────────────────────────────────

def risk_severity(score: int) -> str:
    if score < 30:  return "LOW"
    if score < 60:  return "MEDIUM"
    if score < 80:  return "HIGH"
    return "CRITICAL"


def risk_color_bgr(score: int):
    if score < 30:  return (0, 200, 0)
    if score < 60:  return (0, 200, 255)
    if score < 80:  return (0, 100, 255)
    return (0, 0, 230)


def frames_to_timestamp(frame: int, fps: float) -> str:
    seconds = frame / fps
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}:{secs:02d}"


def generate_suggestions(events: list, avg_risk: float) -> list[str]:
    suggestions = []
    parts_at_risk = {e["part"] for e in events}

    if "knee" in parts_at_risk:
        suggestions.append("Implement knee valgus correction drills — single-leg squats and knee-over-toe exercises")
    if "hip" in parts_at_risk:
        suggestions.append("Add hip mobility and glute activation warm-up before training sessions")
    if "lower_back" in parts_at_risk:
        suggestions.append("Strengthen core with anti-extension exercises (planks, dead bugs, pallof press)")
    if "shoulder" in parts_at_risk:
        suggestions.append("Include rotator cuff strengthening and shoulder mobility work pre-session")
    if "ankle" in parts_at_risk:
        suggestions.append("Work on ankle mobility and dorsiflexion with banded stretches")

    if avg_risk > 60:
        suggestions.append("Overall risk is HIGH — consider reducing training intensity and scheduling a biomechanics review")
    elif avg_risk > 40:
        suggestions.append("Moderate risk levels detected — monitor form closely during high-intensity phases")

    if not suggestions:
        suggestions.append("Good biomechanics observed — maintain current form and continue injury prevention exercises")

    return suggestions


# ── Video Processing Pipeline ────────────────────────────────────

def process_video(video_id: str, filepath: str, sport: str = "general"):
    """Run YOLOv8 Pose estimation + biomechanical risk analysis on uploaded video."""
    try:
        cap = cv2.VideoCapture(filepath)
        if not cap.isOpened():
            analyses[video_id] = {"status": "error", "videoId": video_id, "error": "Could not open video file"}
            return

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_secs = total_frames / fps if fps > 0 else 0

        # Annotated output
        output_raw = os.path.join(OUTPUT_DIR, f"{video_id}_raw.mp4")
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(output_raw, fourcc, fps, (width, height))

        frame_count = 0
        all_risk_scores: list[int] = []
        all_keypoints: list[list[dict]] = []

        # Event detection state per risk factor
        factor_states: dict = {}

        risk_events: list[dict] = []

        print(f"📹 Processing video {video_id}: {width}x{height} @ {fps:.0f}fps, {total_frames} frames")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            results = model(frame, verbose=False)
            annotated = frame.copy()
            frame_max_risk = 0
            frame_risks_all: dict = {}
            frame_details_all: dict = {}

            for r in results:
                if r.keypoints is None or r.keypoints.xy is None:
                    continue

                annotated = r.plot(img=annotated, kpt_radius=3, line_width=1)
                keypoints_np = r.keypoints.xy.cpu().numpy()
                confs_np = r.keypoints.conf.cpu().numpy()

                for person_idx, (person_kp, person_conf) in enumerate(zip(keypoints_np, confs_np)):
                    risks, composite, details = analyze_person(person_kp, person_conf)
                    frame_max_risk = max(frame_max_risk, composite)
                    frame_risks_all = risks
                    frame_details_all = details

                    # Sample keypoints every 10 frames (first person only)
                    if frame_count % 10 == 1 and person_idx == 0:
                        kp_list = []
                        for ki in range(min(len(person_kp), len(KEYPOINT_NAMES))):
                            kp_list.append({
                                "x": round(float(person_kp[ki][0]) / width, 4),
                                "y": round(float(person_kp[ki][1]) / height, 4),
                                "confidence": round(float(person_conf[ki]), 3),
                                "name": KEYPOINT_NAMES[ki],
                            })
                        all_keypoints.append(kp_list)

            all_risk_scores.append(frame_max_risk)

            # ── Event detection: track when risk factors activate/deactivate ──
            for factor, risk_val in frame_risks_all.items():
                if factor not in factor_states:
                    factor_states[factor] = {
                        "active": False, "start_frame": 0,
                        "peak_risk": 0, "peak_frame": 0, "peak_angle": None,
                    }
                state = factor_states[factor]
                detail_key = {
                    "L_ACL": "L_Knee", "R_ACL": "R_Knee",
                    "L_Hip": "L_Hip", "R_Hip": "R_Hip", "Trunk": "Trunk",
                }.get(factor)

                if risk_val >= 30 and not state["active"]:
                    state["active"] = True
                    state["start_frame"] = frame_count
                    state["peak_risk"] = risk_val
                    state["peak_frame"] = frame_count
                    state["peak_angle"] = frame_details_all.get(detail_key)
                elif risk_val >= 30 and state["active"]:
                    if risk_val > state["peak_risk"]:
                        state["peak_risk"] = risk_val
                        state["peak_frame"] = frame_count
                        state["peak_angle"] = frame_details_all.get(detail_key)
                elif risk_val < 30 and state["active"]:
                    state["active"] = False
                    risk_events.append({
                        "timestamp": frames_to_timestamp(state["peak_frame"], fps),
                        "frame": state["peak_frame"],
                        "risk": state["peak_risk"],
                        "part": FACTOR_TO_PART.get(factor, factor),
                        "severity": risk_severity(state["peak_risk"]),
                        "description": FACTOR_DESCRIPTIONS.get(factor, f"Risk detected in {factor}"),
                        "angle": round(state["peak_angle"], 1) if state["peak_angle"] is not None else None,
                    })

            # ── Draw HUD overlay on annotated frame ──
            overlay = annotated.copy()
            cv2.rectangle(overlay, (10, 10), (280, 65), (20, 20, 20), -1)
            cv2.addWeighted(overlay, 0.6, annotated, 0.4, 0, annotated)
            color = risk_color_bgr(frame_max_risk)
            cv2.putText(annotated, f"Risk: {frame_max_risk}% — {risk_severity(frame_max_risk)}",
                        (18, 42), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            cv2.putText(annotated, f"Frame {frame_count}",
                        (width - 130, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (160, 160, 160), 1)

            out.write(annotated)

            if frame_count % 100 == 0:
                avg_so_far = np.mean(all_risk_scores)
                print(f"  Frame {frame_count:5d}/{total_frames}  |  avg risk: {avg_so_far:.1f}%  |  current: {frame_max_risk}%")

        cap.release()
        out.release()

        # Flush any still-active events
        for factor, state in factor_states.items():
            if state["active"] and state["peak_risk"] >= 30:
                risk_events.append({
                    "timestamp": frames_to_timestamp(state["peak_frame"], fps),
                    "frame": state["peak_frame"],
                    "risk": state["peak_risk"],
                    "part": FACTOR_TO_PART.get(factor, factor),
                    "severity": risk_severity(state["peak_risk"]),
                    "description": FACTOR_DESCRIPTIONS.get(factor, f"Risk detected in {factor}"),
                    "angle": round(state["peak_angle"], 1) if state["peak_angle"] is not None else None,
                })

        # Deduplicate events by (timestamp, part), keep highest risk
        seen: set = set()
        unique_events: list[dict] = []
        for e in sorted(risk_events, key=lambda x: -x["risk"]):
            key = (e["timestamp"], e["part"])
            if key not in seen:
                seen.add(key)
                unique_events.append(e)

        # Stats
        scores_arr = np.array(all_risk_scores) if all_risk_scores else np.array([0])
        overall_risk = int(scores_arr.mean())
        peak_risk = int(scores_arr.max())
        overall_severity = risk_severity(overall_risk)

        mins = int(duration_secs // 60)
        secs = int(duration_secs % 60)
        duration_str = f"{mins}:{secs:02d}"

        suggestions = generate_suggestions(unique_events, float(scores_arr.mean()))

        # Re-encode to H.264 for browser playback
        h264_path = os.path.join(OUTPUT_DIR, f"{video_id}.mp4")
        import subprocess
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", output_raw,
                 "-vcodec", "libx264", "-crf", "23", "-preset", "fast",
                 "-pix_fmt", "yuv420p",  # Ensure compatibility with all browsers
                 "-movflags", "+faststart",  # Enable streaming / progressive playback
                 "-an", h264_path],
                check=True, capture_output=True, timeout=600
            )
            ffmpeg_ok = os.path.exists(h264_path) and os.path.getsize(h264_path) > 0
        except Exception as e:
            print(f"⚠️ ffmpeg re-encode failed: {e}")
            ffmpeg_ok = False

        if ffmpeg_ok:
            os.remove(output_raw)
        else:
            # Fallback: rename raw file (mp4v — may not play in all browsers)
            print("⚠️ Using mp4v fallback — install ffmpeg for best browser compatibility")
            if os.path.exists(output_raw):
                os.rename(output_raw, h264_path)
        video_url = f"/outputs/{video_id}.mp4"

        print(f"✅ Video {video_id} processed: {frame_count} frames, overall risk {overall_risk}%, {len(unique_events)} events")

        analyses[video_id] = {
            "status": "done",
            "videoId": video_id,
            "sport": sport,
            "playerName": "Athlete",
            "overallRisk": overall_risk,
            "overallSeverity": overall_severity,
            "duration": duration_str,
            "fps": int(fps),
            "risks": unique_events[:20],
            "pose_keypoints": all_keypoints,
            "suggestions": suggestions,
            "riskTimeline": [int(s) for s in all_risk_scores],
            "annotatedVideoUrl": video_url,
            "totalFrames": frame_count,
            "peakRisk": peak_risk,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        analyses[video_id] = {"status": "error", "videoId": video_id, "error": str(e)}


# ── Endpoints ────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "🛡️ PoseGuard AI API v2.0 — Real YOLOv8 Pose Analysis"}


@app.post("/upload", response_model=UploadResponse)
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Upload a video file and start real YOLO pose analysis in the background."""
    video_id = uuid.uuid4().hex[:8]
    filepath = os.path.join(UPLOAD_DIR, f"{video_id}.mp4")

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    analyses[video_id] = {"status": "processing", "videoId": video_id}
    background_tasks.add_task(process_video, video_id, filepath)

    return UploadResponse(
        videoId=video_id,
        filename=file.filename or "uploaded_video.mp4",
        status="processing",
    )


@app.get("/analysis/{video_id}")
def get_analysis(video_id: str, sport: str = "general"):
    """Return analysis results. Returns status=processing while YOLO is still running."""
    data = analyses.get(video_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Analysis not found. Upload a video first.")
    return data


@app.post("/chat/{video_id}", response_model=ChatResponse)
def chat_with_ai(video_id: str, msg: ChatMessage):
    """Context-aware chat powered by actual analysis results."""
    data = analyses.get(video_id)
    if not data or data.get("status") != "done":
        return ChatResponse(
            reply="⏳ The analysis is still processing. Please wait for it to complete before asking questions.",
            confidence=0.5,
        )

    text = msg.message.lower()
    risks = data.get("risks", [])

    # Find risks matching the user's query by body part keywords
    part_keywords = {
        "knee": ["knee", "acl", "valgus"],
        "hip": ["hip"],
        "lower_back": ["back", "lumbar", "spine", "trunk"],
        "shoulder": ["shoulder", "rotation"],
        "ankle": ["ankle", "dorsiflexion"],
    }

    matched_risks = []
    for risk in risks:
        for part, keywords in part_keywords.items():
            if risk["part"] == part and any(kw in text for kw in keywords):
                matched_risks.append(risk)
                break

    if matched_risks:
        top = max(matched_risks, key=lambda x: x["risk"])
        part_name = top["part"].replace("_", " ").title()
        reply = (
            f"🔍 **{part_name} Analysis** — At {top['timestamp']}, I detected a risk level of "
            f"**{top['risk']}% ({top['severity']})**.\n\n{top['description']}"
        )
        if top.get("angle"):
            reply += f"\n\nMeasured angle deviation: **{top['angle']}°**."
        related = [r for r in risks if r["part"] == top["part"] and r != top]
        if related:
            reply += f"\n\nAdditionally found {len(related)} other {part_name.lower()} event(s) in this session."
        return ChatResponse(reply=reply, confidence=0.92, relatedTimestamp=top["timestamp"])

    if "overall" in text or "summary" in text or "assessment" in text:
        overall = data["overallRisk"]
        total_events = len(risks)
        high_events = sum(1 for r in risks if r["severity"] in ("HIGH", "CRITICAL"))
        reply = (
            f"📊 **Overall Assessment** — Session risk score: **{overall}% ({data['overallSeverity']})**.\n\n"
            f"Detected **{total_events} risk events**, of which **{high_events}** are high/critical severity."
        )
        if risks:
            top = max(risks, key=lambda x: x["risk"])
            reply += f"\n\nHighest risk: **{top['part'].replace('_', ' ').title()}** at {top['timestamp']} ({top['risk']}%)."
        if data.get("suggestions"):
            reply += "\n\n**Top Recommendations:**\n" + "\n".join(f"• {s}" for s in data["suggestions"][:3])
        return ChatResponse(reply=reply, confidence=0.93)

    # Default response with session context
    if risks:
        top = max(risks, key=lambda x: x["risk"])
        reply = (
            f"🤖 I analyzed this session and found **{len(risks)} risk events**. "
            f"The highest priority is **{top['part'].replace('_', ' ')}** at {top['timestamp']} "
            f"({top['risk']}% risk).\n\nAsk me about any specific body part — knee, hip, shoulder, back, or ankle!"
        )
    else:
        reply = "✅ No significant risks were detected in this session. The biomechanics look good! Keep up the great form."

    return ChatResponse(reply=reply, confidence=0.85)


@app.get("/players/{player_id}")
def get_player(player_id: int):
    """Build player profile from actual analysis history."""
    # Aggregate across all completed analyses
    completed = [a for a in analyses.values() if a.get("status") == "done"]

    if not completed:
        return {
            "playerId": player_id,
            "name": "Athlete",
            "sport": "General",
            "team": "—",
            "age": 0,
            "position": "—",
            "riskHistory": [],
            "pastMatches": [],
            "drills": [],
            "injuryZones": [],
        }

    risk_history = []
    past_matches = []
    injury_counts: dict = {}

    for i, a in enumerate(completed):
        risk_history.append({
            "date": f"Session {i + 1}",
            "risk": a["overallRisk"],
            "label": f"Session {i + 1}",
        })
        top_risk_desc = ""
        if a.get("risks"):
            top = max(a["risks"], key=lambda x: x["risk"])
            top_risk_desc = f"{top['part'].replace('_', ' ').title()} risk {top['risk']}%"
        past_matches.append({
            "date": f"Session {i + 1}",
            "opponent": a.get("sport", "General"),
            "riskScore": a["overallRisk"],
            "status": "Completed",
            "highlights": top_risk_desc or "Analysis complete",
        })
        for r in a.get("risks", []):
            part = r["part"]
            if part not in injury_counts:
                injury_counts[part] = {"total_risk": 0, "count": 0}
            injury_counts[part]["total_risk"] += r["risk"]
            injury_counts[part]["count"] += 1

    injury_zones = []
    for part, data_val in injury_counts.items():
        avg = data_val["total_risk"] // data_val["count"]
        trend = "increasing" if avg > 50 else "stable" if avg > 30 else "decreasing"
        injury_zones.append({"part": part, "risk": avg, "trend": trend})

    # Generate drills based on actual injury zones
    drills = []
    drill_id = 1
    if any(z["part"] == "knee" for z in injury_zones):
        drills.append({"id": drill_id, "name": "Single-Leg Squat Stabilizer",
                       "description": "Strengthen VMO and glute medius to correct knee valgus pattern.",
                       "duration": "15 min", "frequency": "Daily", "targetArea": "Knee",
                       "difficulty": "Intermediate", "riskReduction": 23})
        drill_id += 1
    if any(z["part"] == "shoulder" for z in injury_zones):
        drills.append({"id": drill_id, "name": "Rotator Cuff Band Series",
                       "description": "External/internal rotation with resistance band for shoulder stability.",
                       "duration": "10 min", "frequency": "Pre-session", "targetArea": "Shoulder",
                       "difficulty": "Beginner", "riskReduction": 15})
        drill_id += 1
    if any(z["part"] == "lower_back" for z in injury_zones):
        drills.append({"id": drill_id, "name": "Anti-Extension Core Circuit",
                       "description": "Dead bugs, pallof press, and bird-dogs for lumbar stability.",
                       "duration": "20 min", "frequency": "3x/week", "targetArea": "Lower Back",
                       "difficulty": "Advanced", "riskReduction": 19})
        drill_id += 1
    if any(z["part"] == "hip" for z in injury_zones):
        drills.append({"id": drill_id, "name": "Hip Mobility & Activation",
                       "description": "Banded hip circles, clamshells, and hip flexor stretches.",
                       "duration": "12 min", "frequency": "Daily", "targetArea": "Hip",
                       "difficulty": "Beginner", "riskReduction": 18})
        drill_id += 1

    latest = completed[-1]
    return {
        "playerId": player_id,
        "name": latest.get("playerName", "Athlete"),
        "sport": latest.get("sport", "General"),
        "team": "—",
        "age": 0,
        "position": "—",
        "riskHistory": risk_history[-10:],
        "pastMatches": past_matches[-10:],
        "drills": drills,
        "injuryZones": injury_zones,
    }


@app.get("/outputs/{video_id}.mp4")
def get_annotated_video(video_id: str):
    """Serve the annotated/processed video with proper headers."""
    path = os.path.join(OUTPUT_DIR, f"{video_id}.mp4")
    if not os.path.exists(path):
        raise HTTPException(404, "Annotated video not found")
    return FileResponse(
        path,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
        },
    )


@app.get("/video/{video_id}")
def get_video(video_id: str):
    """Serve the original uploaded video."""
    path = os.path.join(UPLOAD_DIR, f"{video_id}.mp4")
    if not os.path.exists(path):
        raise HTTPException(404, "Video not found")
    return FileResponse(path, media_type="video/mp4")