import streamlit as st
import cv2
import numpy as np
import math
import time
import os
import tempfile
from collections import deque
from ultralytics import YOLO

st.set_page_config(page_title="Injury Risk Monitor", layout="wide", page_icon="🏃")

st.markdown("""
<style>
body, .main, .block-container { background:#0f0f1a !important; color:white; }
.stMetric { background:#1a1a2e; border-radius:8px; padding:10px; }
.stSelectbox label, .stSlider label, .stRadio label { color: #aaa !important; }
h1, h2, h3 { color: white !important; }
</style>
""", unsafe_allow_html=True)

st.title("🏃 Real-Time Injury Risk Prediction")
st.markdown("*Powered by YOLOv8 Pose Estimation + Biomechanical Analysis*")

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Settings")
    model_size   = st.selectbox("Model Size", ["n", "s", "m"], index=0,
                                help="n=fastest, s=balanced, m=most accurate")
    conf_thresh  = st.slider("Confidence Threshold", 0.1, 0.9, 0.5, 0.05)
    frame_skip   = st.slider("Frame Skip", 1, 5, 1,
                             help="Increase if processing is slow")
    alert_thresh = st.slider("Alert Threshold (%)", 30, 90, 70)

    st.markdown("---")
    st.header("📥 Input Source")
    source_type = st.radio("Choose source", ["🎥 Webcam", "📁 Upload Video"])

# ── Model ──────────────────────────────────────────────────────────────────────
@st.cache_resource
def load_model(s):
    return YOLO(f"yolov8{s}-pose.pt")

model = load_model(model_size)

# ── Helpers ────────────────────────────────────────────────────────────────────
def calculate_angle(a, b, c):
    a, b, c = np.array(a, float), np.array(b, float), np.array(c, float)
    ba, bc = a - b, c - b
    n1, n2 = np.linalg.norm(ba), np.linalg.norm(bc)
    if n1 == 0 or n2 == 0:
        return 180.0
    return float(np.degrees(np.arccos(np.clip(np.dot(ba, bc) / (n1 * n2), -1, 1))))

def risk_label(s):
    return "LOW" if s < 30 else "MODERATE" if s < 60 else "HIGH" if s < 80 else "CRITICAL"

def risk_hex(s):
    return "#27ae60" if s < 30 else "#f39c12" if s < 60 else "#e67e22" if s < 80 else "#e74c3c"

def risk_bgr(s):
    return (0, 200, 0) if s < 30 else (0, 200, 255) if s < 60 else (0, 100, 255) if s < 80 else (0, 0, 230)


def analyze(frame):
    """Run YOLOv8 + biomechanics on a single frame."""
    results  = model(frame, verbose=False, conf=conf_thresh)
    annotated = frame.copy()
    max_risk, max_risks = 0, {}

    for r in results:
        if r.keypoints is None:
            continue
        annotated = r.plot(img=annotated, kpt_radius=4, line_width=2)
        kpts  = r.keypoints.xy.cpu().numpy()
        confs = r.keypoints.conf.cpu().numpy()

        for pkp, pconf in zip(kpts, confs):
            def kp(i):
                return pkp[i] if (pconf[i] > conf_thresh
                                  and pkp[i][0] > 0 and pkp[i][1] > 0) else None

            ls, rs = kp(5), kp(6)
            lh, rh = kp(11), kp(12)
            lk, rk = kp(13), kp(14)
            la, ra = kp(15), kp(16)
            risks  = {}

            if all(v is not None for v in [lh, lk, la]):
                a = calculate_angle(lh, lk, la)
                risks["L_ACL"] = 90 if a < 120 else 60 if a < 140 else 30 if a < 160 else 0
            if all(v is not None for v in [rh, rk, ra]):
                a = calculate_angle(rh, rk, ra)
                risks["R_ACL"] = 90 if a < 120 else 60 if a < 140 else 30 if a < 160 else 0
            if all(v is not None for v in [ls, lh, lk]):
                a = calculate_angle(ls, lh, lk)
                risks["L_Hip"] = 80 if a < 100 else 45 if a < 130 else 20 if a < 150 else 0
            if all(v is not None for v in [rs, rh, rk]):
                a = calculate_angle(rs, rh, rk)
                risks["R_Hip"] = 80 if a < 100 else 45 if a < 130 else 20 if a < 150 else 0
            if all(v is not None for v in [ls, rs, lh, rh]):
                sm = ((ls[0] + rs[0]) / 2, (ls[1] + rs[1]) / 2)
                hm = ((lh[0] + rh[0]) / 2, (lh[1] + rh[1]) / 2)
                dx, dy = hm[0] - sm[0], hm[1] - sm[1]
                lean = abs(math.degrees(math.atan2(dx, dy))) if dy != 0 else 0
                risks["Trunk"] = 75 if lean > 35 else 50 if lean > 25 else 25 if lean > 15 else 0

            weights = {"L_ACL": 0.25, "R_ACL": 0.25, "L_Hip": 0.10,
                       "R_Hip": 0.10, "Trunk": 0.12}
            tw   = sum(weights[k] for k in risks if k in weights)
            comp = int(sum(risks[k] * weights[k] for k in risks if k in weights) / tw) if tw > 0 else 0
            comp = min(comp, 100)

            # Draw risk on frame
            cv2.putText(annotated, f"Risk: {comp}% [{risk_label(comp)}]",
                        (15, 42), cv2.FONT_HERSHEY_DUPLEX, 1.0, risk_bgr(comp), 2)

            # Alert border
            if comp >= alert_thresh:
                fh, fw = annotated.shape[:2]
                cv2.rectangle(annotated, (0, 0), (fw - 1, fh - 1), (0, 0, 255), 8)
                ov = annotated.copy()
                cv2.rectangle(ov, (0, fh // 2 - 30), (fw, fh // 2 + 30), (0, 0, 160), -1)
                cv2.addWeighted(ov, 0.65, annotated, 0.35, 0, annotated)
                cv2.putText(annotated, f"  ⚠ ALERT: {comp}% — {risk_label(comp)}  ",
                            (fw // 2 - 240, fh // 2 + 12),
                            cv2.FONT_HERSHEY_DUPLEX, 0.9, (255, 255, 255), 2)

            if comp > max_risk:
                max_risk, max_risks = comp, risks

    return annotated, max_risk, max_risks


def render_score_card(comp, all_scores, frame_num=None):
    c = risk_hex(comp)
    extra = f"Frame {frame_num} | " if frame_num else ""
    return f"""
    <div style="background:#1a1a2e;border-radius:12px;padding:20px;text-align:center;margin-bottom:10px;">
        <div style="font-size:56px;font-weight:bold;color:{c};line-height:1.1;">{comp}%</div>
        <div style="font-size:20px;color:{c};margin:4px 0;">{risk_label(comp)}</div>
        <div style="color:#666;font-size:12px;">{extra}Avg: {np.mean(all_scores):.1f}% | Peak: {max(all_scores)}%</div>
    </div>"""


def render_breakdown(risks):
    labels = {"L_ACL": "L Knee (ACL)", "R_ACL": "R Knee (ACL)",
              "L_Hip": "L Hip Flex",   "R_Hip": "R Hip Flex", "Trunk": "Trunk Lean"}
    md = "<div style='background:#1a1a2e;border-radius:10px;padding:14px;'>"
    md += "<p style='color:#aaa;margin:0 0 10px;font-size:13px;'>📐 Joint Breakdown</p>"
    for k, lb in labels.items():
        v  = risks.get(k, 0)
        c2 = risk_hex(v)
        md += f"<div style='margin:6px 0;'>"
        md += f"<div style='display:flex;justify-content:space-between;'>"
        md += f"<span style='color:#ccc;font-size:12px;'>{lb}</span>"
        md += f"<span style='color:{c2};font-size:12px;font-weight:bold;'>{v}%</span></div>"
        md += f"<div style='background:#333;border-radius:4px;height:8px;margin:2px 0;'>"
        md += f"<div style='background:{c2};width:{v}%;height:8px;border-radius:4px;'></div></div></div>"
    md += "</div>"
    return md


# ── Layout ─────────────────────────────────────────────────────────────────────
col1, col2 = st.columns([3, 1])

with col2:
    st.subheader("📊 Live Risk")
    score_ph   = st.empty()
    detail_ph  = st.empty()
    history_ph = st.empty()

risk_history = []

# ══════════════════════════════════════════════════════════════════════════════
#  MODE A — WEBCAM
# ══════════════════════════════════════════════════════════════════════════════
if source_type == "🎥 Webcam":
    with col1:
        st.subheader("🎥 Live Webcam Feed")
        cam_index = st.number_input("Camera index (0=default, try 1 if wrong camera)", 
                                     min_value=0, max_value=5, value=0, step=1)
        
        col_start, col_stop = st.columns(2)
        start_btn = col_start.button("▶ Start Webcam", type="primary", use_container_width=True)
        stop_btn  = col_stop.button("⏹ Stop", use_container_width=True)

        frame_ph = st.empty()
        status_ph = st.empty()

    if start_btn:
        cap = cv2.VideoCapture(int(cam_index))
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        if not cap.isOpened():
            st.error(f"❌ Cannot open camera {cam_index}. Try a different camera index.")
        else:
            all_scores = []
            fc = 0
            fps_times = deque(maxlen=30)
            status_ph.info("🟢 Webcam running — click **Stop** to end session")

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    st.warning("⚠️ Lost webcam feed")
                    break

                fc += 1
                if fc % frame_skip != 0:
                    continue

                fps_times.append(time.time())
                live_fps = (len(fps_times) / (fps_times[-1] - fps_times[0] + 1e-6)
                            if len(fps_times) > 1 else 0)

                annotated, comp, risks = analyze(frame)
                all_scores.append(comp)

                # Show in Streamlit
                rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
                frame_ph.image(rgb, channels="RGB", use_column_width=True,
                               caption=f"Frame {fc} | FPS: {live_fps:.1f}")

                score_ph.markdown(render_score_card(comp, all_scores, fc),
                                  unsafe_allow_html=True)
                detail_ph.markdown(render_breakdown(risks), unsafe_allow_html=True)

                # Mini history chart in sidebar
                if len(all_scores) > 1:
                    history_ph.line_chart(
                        {"Risk %": all_scores[-60:]},
                        height=120
                    )

                # Stop button check
                if stop_btn:
                    break

            cap.release()
            status_ph.success(f"✅ Session ended — {fc} frames | "
                              f"Avg: {np.mean(all_scores):.1f}% | "
                              f"Peak: {max(all_scores) if all_scores else 0}%")


# ══════════════════════════════════════════════════════════════════════════════
#  MODE B — VIDEO FILE
# ══════════════════════════════════════════════════════════════════════════════
elif source_type == "📁 Upload Video":
    with col1:
        st.subheader("📁 Video Analysis")
        uploaded = st.file_uploader("Upload your video", type=["mp4", "mov", "avi", "mkv"])

    if uploaded:
        tfile = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        tfile.write(uploaded.read())
        tfile.close()

        cap = cv2.VideoCapture(tfile.name)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        with col1:
            frame_ph  = st.empty()
            prog_bar  = st.progress(0)
            status_ph = st.empty()

        all_scores = []
        fc = 0

        status_ph.info(f"⏳ Processing {total} frames...")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            fc += 1
            if fc % frame_skip != 0:
                continue

            annotated, comp, risks = analyze(frame)
            all_scores.append(comp)

            rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
            frame_ph.image(rgb, channels="RGB", use_column_width=True,
                           caption=f"Frame {fc}/{total}")

            prog_bar.progress(min(fc / max(total, 1), 1.0))

            score_ph.markdown(render_score_card(comp, all_scores, fc),
                              unsafe_allow_html=True)
            detail_ph.markdown(render_breakdown(risks), unsafe_allow_html=True)

            if len(all_scores) > 1:
                history_ph.line_chart({"Risk %": all_scores[-60:]}, height=120)

        cap.release()
        os.unlink(tfile.name)
        prog_bar.progress(1.0)
        status_ph.success(
            f"✅ Done! {fc} frames processed | "
            f"Avg: {np.mean(all_scores):.1f}% | "
            f"Peak: {max(all_scores) if all_scores else 0}%"
        )
