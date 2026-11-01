import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Film,
  Download,
  PlayCircle,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  Camera,
  Play,
  Square,
  Eye,
  Sliders,
  AlertCircle
} from 'lucide-react';

export default function VideoExportModal({
  isOpen,
  onClose,
  viewportRef,
  selectedCrane,
  grossLoad,
  boomLength,
  workingRadius,
  slewAngle,
  boomAngle,
  liftPercentage,
  liftCategory,
  liftPoints,
  isSimulating,
  setIsSimulating,
  startPickSetRecording,
  registerFinishPickSetRecording
}) {
  // Stages: 'config' | 'recording' | 'preview'
  const [stage, setStage] = useState('config');
  const [mode, setMode] = useState('pick_set'); // 'pick_set' | 'orbit' | 'free'
  const [format, setFormat] = useState('mp4'); // 'mp4' | 'webm'
  const [fps, setFps] = useState(60); // 60 | 30
  const [withOverlay, setWithOverlay] = useState(true);

  // Recording State
  const [elapsedSec, setElapsedSec] = useState(0);
  const [targetDuration, setTargetDuration] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);

  // Preview State
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [videoMeta, setVideoMeta] = useState({ sizeMB: '0', durationSec: 0, width: 0, height: 0, mime: '' });

  // Refs for recording session
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const overlayAnimFrameRef = useRef(null);
  const compositeCanvasRef = useRef(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (overlayAnimFrameRef.current) cancelAnimationFrame(overlayAnimFrameRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
      }
      if (viewportRef?.current?.stopOrbit) {
        viewportRef.current.stopOrbit();
      }
    };
  }, []);

  // When modal is reopened, reset to config if not recording
  useEffect(() => {
    if (isOpen && stage !== 'recording' && stage !== 'preview') {
      setStage('config');
      setElapsedSec(0);
    }
  }, [isOpen]);

  // Clean up object URL when closing or re-recording
  const handleClose = () => {
    if (stage === 'recording') {
      const confirmStop = window.confirm('Quá trình ghi hình đang diễn ra. Bạn có muốn hủy bỏ không?');
      if (!confirmStop) return;
      stopRecording(false);
    }
    onClose();
  };

  const handleResetForNewRecord = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    setRecordedBlob(null);
    setElapsedSec(0);
    setStage('config');
  };

  // Start recording workflow
  const startRecording = async () => {
    if (!viewportRef?.current?.getCanvas) {
      alert('Không tìm thấy vùng hiển thị 3D. Vui lòng thử lại!');
      return;
    }

    const webglCanvas = viewportRef.current.getCanvas();
    if (!webglCanvas) {
      alert('Chưa khởi tạo xong khung 3D. Vui lòng chờ giây lát!');
      return;
    }

    // Determine target duration based on mode
    let plannedDuration = 10;
    if (mode === 'pick_set') {
      plannedDuration = 11;
    } else if (mode === 'orbit') {
      plannedDuration = 12;
    } else {
      plannedDuration = 60; // Max limit for free recording
    }
    setTargetDuration(plannedDuration);
    setElapsedSec(0);

    // Prepare stream (either directly from WebGL canvas or via 2D composite overlay canvas)
    let stream;
    let streamCanvas = webglCanvas;

    if (withOverlay) {
      // Create offscreen composite canvas for watermark & telemetry overlay
      const offCanvas = document.createElement('canvas');
      offCanvas.width = webglCanvas.width;
      offCanvas.height = webglCanvas.height;
      const ctx = offCanvas.getContext('2d');
      compositeCanvasRef.current = offCanvas;
      streamCanvas = offCanvas;

      // Animation loop to copy WebGL canvas and draw telemetry banner onto composite canvas
      const drawFrame = () => {
        if (stageRef.current !== 'recording') return;

        const w = offCanvas.width;
        const h = offCanvas.height;

        // 1. Draw 3D scene from WebGL
        ctx.drawImage(webglCanvas, 0, 0);

        // 2. Draw Top-Left Branding Badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(16, 16, 260, 36, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('3D LIFT PLAN PRO', 30, 39);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        ctx.fillText('• ENGINEERING V2.0', 160, 39);

        // 3. Draw Bottom Telemetry Bar
        const barH = 46;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(16, h - barH - 16, w - 32, barH, 10);
        ctx.fill();
        ctx.stroke();

        // Left text: Crane Specs
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(selectedCrane?.name || 'Cần cẩu di động', 32, h - barH + 12);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Cần: ${(boomLength || 0).toFixed(1)}m  |  Bán kính: ${(workingRadius || 0).toFixed(1)}m  |  Góc cần: ${(boomAngle || 0).toFixed(1)}°`, 32, h - barH + 30);

        // Center / Right Status Calculation
        const isSafe = (liftPercentage || 0) <= 85;
        const isWarn = (liftPercentage || 0) > 85 && (liftPercentage || 0) <= 100;
        const badgeColor = isSafe ? '#10b981' : isWarn ? '#f59e0b' : '#ef4444';
        const badgeBg = isSafe ? 'rgba(16, 185, 129, 0.2)' : isWarn ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)';

        if (w >= 860) {
          // Center: Gross Load Block
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px sans-serif';
          ctx.fillText('Tổng tải nâng:', w * 0.5 - 50, h - barH + 12);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 15px monospace';
          ctx.fillText(`${(grossLoad || 0).toFixed(2)} tấn`, w * 0.5 - 50, h - barH + 30);
        }

        // Right badge: Safety Status
        ctx.font = 'bold 11px sans-serif';
        const badgeText = `● ${liftCategory?.label || 'TẢI AN TOÀN'} (${(liftPercentage || 0).toFixed(1)}%) ${w < 860 ? `• ${(grossLoad || 0).toFixed(1)}t` : ''}`;
        const measuredTextW = ctx.measureText(badgeText).width;
        const badgeW = Math.max(160, measuredTextW + 24);
        const badgeX = w - badgeW - 32;

        ctx.fillStyle = badgeBg;
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(badgeX, h - barH - 4, badgeW, 26, 13);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = badgeColor;
        ctx.fillText(badgeText, badgeX + 12, h - barH + 13);

        overlayAnimFrameRef.current = requestAnimationFrame(drawFrame);
      };

      stream = offCanvas.captureStream(fps);
      overlayAnimFrameRef.current = requestAnimationFrame(drawFrame);
    } else {
      stream = webglCanvas.captureStream(fps);
    }

    // Determine Best Mime Type
    let mimeType = 'video/webm';
    if (format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    }

    recordedChunksRef.current = [];
    let recorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000 // 8 Mbps high-quality bitrate
      });
    } catch (err) {
      console.warn('Fallback to standard MediaRecorder:', err);
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      if (overlayAnimFrameRef.current) {
        cancelAnimationFrame(overlayAnimFrameRef.current);
      }
      const actualMime = recorder.mimeType || mimeType;
      const blob = new Blob(recordedChunksRef.current, { type: actualMime });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedVideoUrl(url);

      const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      setVideoMeta({
        sizeMB,
        durationSec: elapsedSec || plannedDuration,
        width: streamCanvas.width,
        height: streamCanvas.height,
        mime: actualMime.includes('mp4') ? 'MP4' : 'WebM'
      });

      setIsProcessing(false);
      setStage('preview');
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setStage('recording');

    // Trigger Mode Action
    if (mode === 'pick_set') {
      if (startPickSetRecording) {
        startPickSetRecording();
      } else {
        setIsSimulating(true);
      }
      if (registerFinishPickSetRecording) {
        registerFinishPickSetRecording(() => {
          setTimeout(() => {
            stopRecording(true);
          }, 600); // 600ms resting pause at set point
        });
      }
    } else if (mode === 'orbit') {
      if (viewportRef?.current?.startOrbit) {
        viewportRef.current.startOrbit(4.5); // Smooth 360 degree rotation
      }
    }

    // Start Timer Interval
    let count = 0;
    timerIntervalRef.current = setInterval(() => {
      count += 1;
      setElapsedSec(count);
      // Auto-stop when reaching max target for orbit or free mode
      if (mode !== 'pick_set' && count >= plannedDuration) {
        stopRecording(true);
      }
    }, 1000);
  };

  // Stop recording
  const stopRecording = (saveResult = true) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (viewportRef?.current?.stopOrbit) {
      viewportRef.current.stopOrbit();
    }

    if (mode === 'pick_set') {
      setIsSimulating(false);
    }

    if (!saveResult) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
      }
      setStage('config');
      return;
    }

    setIsProcessing(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Download the recorded video file
  const handleDownloadVideo = () => {
    if (!recordedVideoUrl || !recordedBlob) return;
    const isMp4 = videoMeta.mime === 'MP4' || recordedBlob.type.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const cleanCraneName = (selectedCrane?.name || 'Crane').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `3D_Lift_Simulation_${cleanCraneName}_${new Date().toISOString().slice(0, 10)}.${ext}`;

    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!isOpen && stage !== 'recording') return null;

  return (
    <>
      {/* 1. FLOATING RECORDING HUD (Displayed over 3D Viewport when recording) */}
      {stage === 'recording' && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border-2 border-rose-500 text-slate-100 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto max-w-[95%]">
          {/* Pulsing Recording Dot */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping inline-block" />
            <span className="w-3.5 h-3.5 rounded-full bg-rose-600 inline-block -ml-5.5" />
            <span className="text-xs font-black text-rose-400 tracking-wider uppercase">REC</span>
          </div>

          <div className="h-6 w-px bg-slate-700" />

          {/* Time & Progress Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono text-white">
                00:{elapsedSec < 10 ? `0${elapsedSec}` : elapsedSec}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                / 00:{targetDuration < 10 ? `0${targetDuration}` : targetDuration}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {mode === 'pick_set' && 'Đang quay chu trình nâng hạ Pick → Set'}
              {mode === 'orbit' && 'Đang quay xoay 360° toàn cảnh công trường'}
              {mode === 'free' && 'Đang ghi hình góc nhìn tự do'}
            </p>
          </div>

          <div className="h-6 w-px bg-slate-700" />

          {/* Stop Button */}
          <button
            onClick={() => stopRecording(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <Square size={13} fill="currentColor" />
            <span>Dừng & Lưu Video</span>
          </button>
        </div>
      )}

      {/* 2. MAIN MODAL (CONFIG & PREVIEW STAGES) */}
      {isOpen && stage !== 'recording' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <Video size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                    Xuất Video Mô Phỏng 3D
                    <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.2 rounded font-bold">
                      FULL HD • 60 FPS
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Ghi hình diễn hoạt nâng hạ 3D phục vụ thuyết minh biện pháp và an toàn
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* === STAGE 1: CONFIGURATION === */}
              {stage === 'config' && (
                <>
                  {/* Section 1: Recording Mode Selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Film size={14} className="text-sky-400" />
                      1. Chọn Chế độ quay diễn hoạt:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Mode A: Pick -> Set */}
                      <button
                        type="button"
                        onClick={() => setMode('pick_set')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          mode === 'pick_set'
                            ? 'bg-sky-950/40 border-sky-500 text-sky-100 shadow-md shadow-sky-500/10'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <PlayCircle size={18} className={mode === 'pick_set' ? 'text-sky-400' : 'text-slate-500'} />
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800/60 text-sky-300 font-bold">
                            Tự động
                          </span>
                        </div>
                        <div className="font-bold text-xs mb-1 text-slate-200">Chu trình Pick → Set</div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Quay trọn vẹn từ lúc đón tải, bay né vật cản tới lúc hạ đặt hoàn tất (~10s).
                        </p>
                      </button>

                      {/* Mode B: 360 Orbit */}
                      <button
                        type="button"
                        onClick={() => setMode('orbit')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          mode === 'orbit'
                            ? 'bg-amber-950/40 border-amber-500 text-amber-100 shadow-md shadow-amber-500/10'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <RotateCw size={18} className={mode === 'orbit' ? 'text-amber-400' : 'text-slate-500'} />
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800/60 text-amber-300 font-bold">
                            12 Giây
                          </span>
                        </div>
                        <div className="font-bold text-xs mb-1 text-slate-200">Xoay 360° Toàn cảnh</div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Camera bay lượn 1 vòng 360° quanh công trường, cần cẩu và vật cản cực đẹp.
                        </p>
                      </button>

                      {/* Mode C: Freecam */}
                      <button
                        type="button"
                        onClick={() => setMode('free')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          mode === 'free'
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-100 shadow-md shadow-emerald-500/10'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Camera size={18} className={mode === 'free' ? 'text-emerald-400' : 'text-slate-500'} />
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800/60 text-emerald-300 font-bold">
                            Tự do
                          </span>
                        </div>
                        <div className="font-bold text-xs mb-1 text-slate-200">Góc nhìn Tự do</div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Bấm quay và tự ý lia chuột, đổi góc nhìn hay thao tác cẩu, bấm dừng bất kỳ lúc nào.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Section 2: Technical Parameters & Overlays */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Sliders size={14} className="text-amber-400" />
                      2. Cấu hình Kỹ thuật & Bản quyền:
                    </label>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 space-y-3">
                      {/* Format and FPS Selection */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-slate-400 block mb-1">Định dạng file xuất:</span>
                          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                            <button
                              type="button"
                              onClick={() => setFormat('mp4')}
                              className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                                format === 'mp4'
                                  ? 'bg-rose-600 text-white shadow'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              MP4 (H.264 / AAC)
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormat('webm')}
                              className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                                format === 'webm'
                                  ? 'bg-rose-600 text-white shadow'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              WebM (VP9)
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs text-slate-400 block mb-1">Tốc độ khung hình (FPS):</span>
                          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                            <button
                              type="button"
                              onClick={() => setFps(60)}
                              className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                                fps === 60
                                  ? 'bg-emerald-600 text-white shadow'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              60 FPS (Siêu mượt)
                            </button>
                            <button
                              type="button"
                              onClick={() => setFps(30)}
                              className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                                fps === 30
                                  ? 'bg-emerald-600 text-white shadow'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              30 FPS (Tiêu chuẩn)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Watermark / Telemetry Toggle */}
                      <label className="flex items-start gap-2.5 pt-2 border-t border-slate-800/80 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={withOverlay}
                          onChange={(e) => setWithOverlay(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">
                            Gắn Khung Thông Số Kỹ Thuật (Engineering Telemetry Watermark)
                          </span>
                          <span className="text-[11px] text-slate-400 block leading-tight">
                            Hiển thị nhãn thiết bị cẩu, bán kính, tổng tải nâng và đánh giá an toàn ngay trên video để gửi chủ đầu tư và đối tác.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-sky-950/20 border border-sky-800/40 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-sky-400 shrink-0" />
                      <span className="text-slate-300">
                        Thời lượng ước tính: <b className="text-sky-300">{mode === 'pick_set' ? '~10 giây' : mode === 'orbit' ? '12 giây' : 'Tùy chọn'}</b>
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Tải nâng: <b className="text-amber-300">{grossLoad.toFixed(2)}t</b> ({selectedCrane?.name})
                    </div>
                  </div>
                </>
              )}

              {/* === STAGE 2: PREVIEW & DOWNLOAD === */}
              {stage === 'preview' && (
                <div className="space-y-4">
                  {/* Embedded HTML5 Video Player */}
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black shadow-inner aspect-video flex items-center justify-center">
                    {recordedVideoUrl ? (
                      <video
                        src={recordedVideoUrl}
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-slate-500 text-xs">Đang tải video...</div>
                    )}
                  </div>

                  {/* Video Specs Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Thời lượng:</span>
                      <b className="text-slate-200 font-mono text-sm">{videoMeta.durationSec.toFixed(1)}s</b>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Định dạng:</span>
                      <b className="text-emerald-400 font-mono text-sm">{videoMeta.mime}</b>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Độ phân giải:</span>
                      <b className="text-sky-400 font-mono text-sm">{videoMeta.width} × {videoMeta.height}</b>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Dung lượng:</span>
                      <b className="text-amber-400 font-mono text-sm">{videoMeta.sizeMB} MB</b>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>Đã tạo video mô phỏng 3D thành công! Nhấn nút tải về bên dưới để lưu file vào máy.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0">
              {stage === 'config' ? (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>

                  <button
                    type="button"
                    onClick={startRecording}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                    <span>Bắt đầu Ghi hình (REC)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleResetForNewRecord}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Quay góc khác</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Đóng
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadVideo}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      <Download size={15} />
                      <span>Tải Video về máy ({videoMeta.mime})</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
