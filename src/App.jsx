import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Truck,
  Package,
  Layers,
  Building2,
  FileText,
  Save,
  FolderOpen,
  Wind,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Maximize2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Cpu,
  Info,
  Video,
  Sliders,
  Menu,
  X,
  MoreVertical,
  ChevronDown,
  Eye,
  Camera,
  Sun,
  Moon
} from 'lucide-react';

import { DEFAULT_CRANES } from './data/defaultCranes';
import { DEFAULT_OBSTACLES, DEFAULT_LIFT_POINTS } from './data/defaultObstacles';
import { SOIL_BEARING_CAPACITIES } from './data/soilTypes';
import {
  getRatedCapacity,
  calculateBoomKinematics,
  calculateOutriggerReactions,
  calculateWindEffect,
  getLiftCategory
} from './utils/craneMath';

import ThreeViewport from './components/ThreeViewport';
import CraneSelector from './components/CraneSelector';
import LoadConfigurator from './components/LoadConfigurator';
import OutriggerMatCalc from './components/OutriggerMatCalc';
import ObstacleManager from './components/ObstacleManager';
import PickSetTrajectoryManager from './components/PickSetTrajectoryManager';
import CustomCraneModal from './components/CustomCraneModal';
import LiftPlanReport from './components/LiftPlanReport';
import CopyrightModal from './components/CopyrightModal';
import VideoExportModal from './components/VideoExportModal';

export default function App() {
  // --- STATE ---
  const [cranes, setCranes] = useState(() => {
    const saved = localStorage.getItem('3d_lift_plan_custom_cranes');
    if (saved) {
      try {
        const custom = JSON.parse(saved);
        return [...DEFAULT_CRANES, ...custom];
      } catch (e) {
        return DEFAULT_CRANES;
      }
    }
    return DEFAULT_CRANES;
  });

  const [selectedCrane, setSelectedCrane] = useState(cranes[0]);
  const [activeTab, setActiveTab] = useState('crane'); // 'crane', 'load', 'mat', 'obstacle', 'dual_point'
  const [mobileViewMode, setMobileViewMode] = useState('split'); // '3d', 'split', 'panel'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Crane Kinematics & Config
  const [boomLength, setBoomLength] = useState(23.0);
  const [workingRadius, setWorkingRadius] = useState(8.0);
  const [slewAngle, setSlewAngle] = useState(25);
  const [craneHeading, setCraneHeading] = useState(0); // 0 to 360 deg (Hướng đỗ xe cẩu trên công trường)
  const [counterweight, setCounterweight] = useState(selectedCrane.specs.defaultCounterweight || 9.0);
  const [outriggerRatio, setOutriggerRatio] = useState(1.0);
  const [partsOfLine, setPartsOfLine] = useState(4);
  const [hookElevation, setHookElevation] = useState(6.0);
  const [loadElevation, setLoadElevation] = useState(1.5);
  const [loadRotation, setLoadRotation] = useState(0); // 0 to 360 deg (Hướng xoay kiện hàng)

  // Load & Rigging
  const [loadConfig, setLoadConfig] = useState({
    netWeight: 14.5,
    type: 'tank',
    dims: { l: 5.5, w: 2.6, h: 2.6 }
  });

  const [riggingConfig, setRiggingConfig] = useState({
    slingType: 'wire_rope',
    slingLegs: 4,
    slingAngleDeg: 60,
    slingWeight: 0.25,
    spreaderWeight: 0.5
  });

  // Outrigger Mat & Soil
  const [matLength, setMatLength] = useState(2.2);
  const [matWidth, setMatWidth] = useState(2.2);
  const [selectedSoilId, setSelectedSoilId] = useState('stiff_clay');
  const [customSoilCapacity, setCustomSoilCapacity] = useState(25.0);

  // Environment & Wind
  const [windSpeed, setWindSpeed] = useState(6.0); // m/s

  // Obstacles (Multi-obstacle 3D array)
  const [obstacles, setObstacles] = useState(DEFAULT_OBSTACLES);

  // Multi-Waypoint Pick & Set Planning
  const [liftPoints, setLiftPoints] = useState(DEFAULT_LIFT_POINTS);
  const pickPoint = liftPoints[0] || { radius: 8.0, slew: 25, elevation: 1.5, loadRotation: 0 };
  const setPoint = liftPoints[liftPoints.length - 1] || { radius: 13.5, slew: 155, elevation: 6.5, loadRotation: 90 };

  // Mouse Picking for Fence Boundary Points on 3D ground plane
  const [pickingFencePoint, setPickingFencePoint] = useState(null); // { obsId, pointId } or { obsId, mode: 'add' }

  const [isSimulating, setIsSimulating] = useState(false);
  const simDirectionRef = useRef(1); // 1 = Forward, -1 = Backward
  const simProgressRef = useRef(0);

  const handleApplyPointToCrane = (pt) => {
    if (!pt) return;
    // Auto-extend boom length if current boom is too short for this point's radius or height
    const minRequiredBoom = Math.max(
      pt.radius + 1.5,
      Math.hypot(pt.radius - 1.0, (pt.elevation || 1.5) + (loadConfig?.dims?.h || 2.6) + 4.5 - 2.45)
    );
    if (boomLength < minRequiredBoom) {
      const suitableStep = (selectedCrane.specs.boomSteps || []).find((s) => s >= minRequiredBoom);
      if (suitableStep) {
        setBoomLength(suitableStep);
      } else {
        setBoomLength(Math.min(selectedCrane.specs.maxBoomLength, Math.ceil(minRequiredBoom)));
      }
    }

    setWorkingRadius(pt.radius);
    setSlewAngle(pt.slew);
    setLoadElevation(pt.elevation);
    setHookElevation(Math.round((pt.elevation + 4.5) * 10) / 10);
    if (pt.loadRotation !== undefined) {
      setLoadRotation(pt.loadRotation);
    }
  };

  // 3D Viewport Theme ('dark' = CAD Dark, 'light' = Daylight White)
  const [viewportTheme, setViewportTheme] = useState(() => {
    try {
      return localStorage.getItem('3d_lift_plan_viewport_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  const handleToggleViewportTheme = () => {
    setViewportTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('3d_lift_plan_viewport_theme', next);
      } catch (e) {}
      return next;
    });
  };

  // Modals
  const [isCustomCraneModalOpen, setIsCustomCraneModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCopyrightModalOpen, setIsCopyrightModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const isRecordingPickSetRef = useRef(false);
  const onFinishPickSetRecordingRef = useRef(null);

  const handleStartPickSetRecording = () => {
    simProgressRef.current = 0;
    simDirectionRef.current = 1;
    isRecordingPickSetRef.current = true;
    setIsSimulating(true);
  };

  const handleRegisterFinishPickSetRecording = (cb) => {
    onFinishPickSetRecordingRef.current = cb;
  };
  const viewportRef = useRef(null);
  const [capturedViews, setCapturedViews] = useState(null);
  const [adjustingViewConfig, setAdjustingViewConfig] = useState(null);

  const handleOpenReport = () => {
    if (viewportRef.current && viewportRef.current.captureAllViews) {
      try {
        const views = viewportRef.current.captureAllViews();
        if (views) setCapturedViews(views);
      } catch (err) {
        console.warn('Error capturing views:', err);
      }
    }
    setIsReportOpen(true);
  };

  const handleRefreshViews = () => {
    if (viewportRef.current && viewportRef.current.captureAllViews) {
      try {
        const views = viewportRef.current.captureAllViews();
        if (views) {
          setCapturedViews(views);
          return views;
        }
      } catch (err) {
        console.warn('Error refreshing views:', err);
      }
    }
    return null;
  };

  const handleStartAdjustView = (viewKey, viewName, defaultPreset) => {
    setIsReportOpen(false);
    setAdjustingViewConfig({ key: viewKey, name: viewName, defaultPreset });
    if (viewportRef.current && viewportRef.current.setPreset && defaultPreset) {
      viewportRef.current.setPreset(defaultPreset);
    }
  };

  const handleConfirmAdjustView = () => {
    if (viewportRef.current && viewportRef.current.captureCurrentView && adjustingViewConfig) {
      const dataUrl = viewportRef.current.captureCurrentView();
      if (dataUrl) {
        setCapturedViews((prev) => ({
          ...(prev || {}),
          [adjustingViewConfig.key]: dataUrl
        }));
      }
    }
    setAdjustingViewConfig(null);
    setIsReportOpen(true);
  };

  const handleCancelAdjustView = () => {
    setAdjustingViewConfig(null);
    setIsReportOpen(true);
  };

  // File Upload Ref
  const fileInputRef = useRef(null);

  // --- CALCULATIONS ---
  const hookWeight = selectedCrane.specs.defaultHookWeight || 0.5;
  const totalRiggingWeight = (riggingConfig.slingWeight || 0.1) + (riggingConfig.spreaderWeight || 0);
  const grossLoad = loadConfig.netWeight + totalRiggingWeight + hookWeight;

  // Boom Angle Kinematics
  const boomKinematics = useMemo(() => {
    return calculateBoomKinematics(
      boomLength,
      workingRadius,
      selectedCrane.specs.boomOffsetPivotY || 2.45
    );
  }, [boomLength, workingRadius, selectedCrane]);

  const boomAngle = boomKinematics.boomAngleDeg;

  // Rated Capacity
  const ratedCapResult = useMemo(() => {
    return getRatedCapacity(selectedCrane, boomLength, workingRadius, counterweight, outriggerRatio);
  }, [selectedCrane, boomLength, workingRadius, counterweight, outriggerRatio]);

  const ratedCapacity = ratedCapResult.capacity || 0;
  const liftPercentage = ratedCapacity > 0 ? (grossLoad / ratedCapacity) * 100 : 999;
  const liftCategory = getLiftCategory(liftPercentage);

  // Capacity at Pick & Set Points for comparison
  const pickCapResult = useMemo(() => {
    return getRatedCapacity(selectedCrane, boomLength, pickPoint.radius, counterweight, outriggerRatio);
  }, [selectedCrane, boomLength, pickPoint.radius, counterweight, outriggerRatio]);

  const setCapResult = useMemo(() => {
    return getRatedCapacity(selectedCrane, boomLength, setPoint.radius, counterweight, outriggerRatio);
  }, [selectedCrane, boomLength, setPoint.radius, counterweight, outriggerRatio]);

  const pickPercentage = pickCapResult.capacity > 0 ? (grossLoad / pickCapResult.capacity) * 100 : 999;
  const setPercentage = setCapResult.capacity > 0 ? (grossLoad / setCapResult.capacity) * 100 : 999;

  // Outrigger Reactions
  const outriggerReactions = useMemo(() => {
    return calculateOutriggerReactions({
      tareWeight: selectedCrane.specs.tareWeight || 40,
      counterweight,
      grossLoad,
      radius: workingRadius,
      slewAngleDeg: slewAngle,
      outriggerLength: selectedCrane.specs.outriggerLength || 7.2,
      outriggerWidth: (selectedCrane.specs.outriggerWidth || 6.4) * outriggerRatio,
      tailSwingRadius: selectedCrane.specs.tailSwingRadius || 4.0
    });
  }, [selectedCrane, counterweight, grossLoad, workingRadius, slewAngle, outriggerRatio]);

  // Wind Effect
  const windEffect = useMemo(() => {
    return calculateWindEffect(
      windSpeed,
      loadConfig.dims.l * loadConfig.dims.h,
      selectedCrane.specs.maxWindSpeed || 11.0
    );
  }, [windSpeed, loadConfig.dims, selectedCrane]);

  const allowableSoilCapacity =
    selectedSoilId === 'custom'
      ? customSoilCapacity
      : SOIL_BEARING_CAPACITIES.find((s) => s.id === selectedSoilId)?.capacityTonsPerM2 || 25.0;

  // --- MULTI-WAYPOINT TRAJECTORY SIMULATION LOOP ---
  useEffect(() => {
    if (!isSimulating || liftPoints.length < 2) return;

    // Ensure boom length is sufficient for the entire trajectory
    const maxRadius = Math.max(...liftPoints.map((p) => p.radius || 0));
    const maxHeight = Math.max(...liftPoints.map((p) => p.elevation || 0));
    const minRequiredBoom = Math.max(
      maxRadius + 1.5,
      Math.hypot(maxRadius - 1.0, maxHeight + (loadConfig?.dims?.h || 2.6) + 4.5 - 2.45)
    );
    if (boomLength < minRequiredBoom) {
      const suitableStep = (selectedCrane.specs.boomSteps || []).find((s) => s >= minRequiredBoom);
      if (suitableStep) {
        setBoomLength(suitableStep);
      } else {
        setBoomLength(Math.min(selectedCrane.specs.maxBoomLength, Math.ceil(minRequiredBoom)));
      }
    }

    let animId;
    const step = () => {
      const numSegments = liftPoints.length - 1;
      const speed = 0.0035 / numSegments;
      simProgressRef.current += speed * simDirectionRef.current;

      if (simProgressRef.current >= 1.0) {
        simProgressRef.current = 1.0;
        if (isRecordingPickSetRef.current) {
          isRecordingPickSetRef.current = false;
          setIsSimulating(false);
          if (onFinishPickSetRecordingRef.current) {
            onFinishPickSetRecordingRef.current();
          }
          return;
        }
        simDirectionRef.current = -1; // Reverse back
      } else if (simProgressRef.current <= 0) {
        simProgressRef.current = 0;
        simDirectionRef.current = 1;
      }

      const u = Math.max(0, Math.min(1, simProgressRef.current));
      const segFloat = u * numSegments;
      const segIndex = Math.min(Math.floor(segFloat), numSegments - 1);
      const localT = segFloat - segIndex;

      // Smooth cosine easing
      const easeT = 0.5 - 0.5 * Math.cos(localT * Math.PI);

      const pA = liftPoints[segIndex];
      const pB = liftPoints[segIndex + 1];

      // Shortest circular slew angle traversal
      let slewDiff = pB.slew - pA.slew;
      if (slewDiff > 180) slewDiff -= 360;
      if (slewDiff < -180) slewDiff += 360;

      // Shortest circular load rotation traversal
      // If intermediate waypoints have rotation unselected, rotate linearly from Start to End
      const startPt = liftPoints[0] || {};
      const endPt = liftPoints[numSegments] || {};
      const startRot = startPt.loadRotation !== undefined && startPt.loadRotation !== null ? startPt.loadRotation : 0;
      const endRot = (endPt.hasCustomRotation !== false && endPt.loadRotation !== undefined && endPt.loadRotation !== null)
        ? endPt.loadRotation
        : startRot;

      const hasIntermediateCustom = liftPoints.slice(1, -1).some(
        (p) => p.hasCustomRotation === true && p.loadRotation !== null && p.loadRotation !== undefined
      );

      let curLoadRotation;
      if (!hasIntermediateCustom) {
        // Continuous linear rotation from start point to end point across the whole trajectory
        let globalRotDiff = endRot - startRot;
        if (globalRotDiff > 180) globalRotDiff -= 360;
        if (globalRotDiff < -180) globalRotDiff += 360;
        curLoadRotation = (startRot + globalRotDiff * u + 360) % 360;
      } else {
        const getPointRot = (p, idx) => {
          if (idx === 0) return startRot;
          if (idx === numSegments) return endRot;
          if (p.hasCustomRotation === true && p.loadRotation !== null && p.loadRotation !== undefined) {
            return p.loadRotation;
          }
          const t = idx / numSegments;
          let diff = endRot - startRot;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          return Math.round(((startRot + diff * t) % 360 + 360) % 360);
        };
        const rotA = getPointRot(pA, segIndex);
        const rotB = getPointRot(pB, segIndex + 1);
        let rotDiff = rotB - rotA;
        if (rotDiff > 180) rotDiff -= 360;
        if (rotDiff < -180) rotDiff += 360;
        curLoadRotation = (rotA + rotDiff * easeT + 360) % 360;
      }

      const curRadius = pA.radius + (pB.radius - pA.radius) * easeT;
      const curSlew = (pA.slew + slewDiff * easeT + 360) % 360;
      const curElevation = pA.elevation + (pB.elevation - pA.elevation) * easeT;

      setWorkingRadius(Math.round(curRadius * 10) / 10);
      setSlewAngle(Math.round(curSlew));
      setLoadElevation(Math.round(curElevation * 10) / 10);
      setHookElevation(Math.round((curElevation + 4.5) * 10) / 10);
      setLoadRotation(Math.round(curLoadRotation));

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, liftPoints]);

  // --- HANDLERS ---
  const handleSaveCustomCrane = (newCrane) => {
    const updated = [...cranes, newCrane];
    setCranes(updated);
    setSelectedCrane(newCrane);
    setBoomLength(newCrane.specs.minBoomLength);
    setCounterweight(newCrane.specs.defaultCounterweight || newCrane.specs.counterweightOptions[0]);

    // Persist custom cranes to localStorage
    const customOnly = updated.filter((c) => c.id.startsWith('custom-'));
    localStorage.setItem('3d_lift_plan_custom_cranes', JSON.stringify(customOnly));
  };

  const handleExportProjectJSON = () => {
    const project = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      craneId: selectedCrane.id,
      boomLength,
      workingRadius,
      slewAngle,
      craneHeading,
      counterweight,
      outriggerRatio,
      partsOfLine,
      loadConfig,
      loadRotation,
      riggingConfig,
      matLength,
      matWidth,
      selectedSoilId,
      customSoilCapacity,
      windSpeed,
      obstacles,
      obstacleConfig: obstacles[0] || null,
      liftPoints,
      pickPoint,
      setPoint
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `3D_Lift_Plan_${selectedCrane.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImportProjectJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.craneId) {
          const match = cranes.find((c) => c.id === data.craneId);
          if (match) setSelectedCrane(match);
        }
        if (data.boomLength) setBoomLength(data.boomLength);
        if (data.workingRadius) setWorkingRadius(data.workingRadius);
        if (data.slewAngle !== undefined) setSlewAngle(data.slewAngle);
        if (data.craneHeading !== undefined) setCraneHeading(data.craneHeading);
        if (data.counterweight !== undefined) setCounterweight(data.counterweight);
        if (data.outriggerRatio !== undefined) setOutriggerRatio(data.outriggerRatio);
        if (data.loadConfig) setLoadConfig(data.loadConfig);
        if (data.loadRotation !== undefined) setLoadRotation(data.loadRotation);
        if (data.riggingConfig) setRiggingConfig(data.riggingConfig);
        if (data.matLength) setMatLength(data.matLength);
        if (data.matWidth) setMatWidth(data.matWidth);
        if (data.selectedSoilId) setSelectedSoilId(data.selectedSoilId);
        if (data.windSpeed) setWindSpeed(data.windSpeed);
        if (data.obstacles && Array.isArray(data.obstacles)) {
          setObstacles(data.obstacles);
        } else if (data.obstacleConfig) {
          setObstacles([
            {
              id: 'obs-imported-1',
              name: 'Vật cản nhập từ file',
              type: 'building',
              enabled: data.obstacleConfig.enabled !== false,
              posX: data.obstacleConfig.posX || 14.0,
              posZ: data.obstacleConfig.posZ || 6.0,
              rotationY: 0,
              width: data.obstacleConfig.width || 8.0,
              length: data.obstacleConfig.length || 12.0,
              height: data.obstacleConfig.height || 16.0,
              diameter: 6.0,
              wireSpan: 30.0,
              depth: 3.0
            }
          ]);
        }
        if (data.liftPoints && Array.isArray(data.liftPoints)) {
          setLiftPoints(data.liftPoints);
        } else if (data.pickPoint && data.setPoint) {
          setLiftPoints([
            { id: 'pt-1', name: 'Điểm 1: Đón tải (Pick Point)', ...data.pickPoint },
            { id: 'pt-2', name: 'Điểm 2: Đặt tải (Set Point)', ...data.setPoint }
          ]);
        }

        alert('Đã tải thành công dữ liệu phương án cẩu!');
      } catch (err) {
        alert('Lỗi khi mở file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Navigation Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between z-30 shrink-0 print:hidden relative">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-amber-500 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <Truck className="text-white" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-sky-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent whitespace-nowrap">
                3D LIFT PLAN PRO
              </h1>
              <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.2 rounded font-bold shrink-0 hidden sm:inline-block">
                ENGINEERING V2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Hệ thống Tính toán & Mô phỏng Nâng hạ 3D
            </p>
          </div>
        </div>

        {/* Global Safety Status Badge & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Safety Status Badge */}
          {/* Mobile version: compact percentage badge */}
          <div
            className="sm:hidden px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 shadow-sm shrink-0 whitespace-nowrap"
            style={{
              backgroundColor: liftCategory.bgColor,
              borderColor: liftCategory.color,
              color: liftCategory.color
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-ping shrink-0" style={{ backgroundColor: liftCategory.color }} />
            <span>{liftPercentage > 0 ? `${liftPercentage.toFixed(0)}%` : 'NGOÀI'}</span>
          </div>

          {/* Desktop/Tablet version: full text */}
          <div
            className="hidden sm:flex px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold border items-center gap-1.5 sm:gap-2 shadow-sm shrink-0 whitespace-nowrap"
            style={{
              backgroundColor: liftCategory.bgColor,
              borderColor: liftCategory.color,
              color: liftCategory.color
            }}
          >
            <span className="w-2 h-2 rounded-full animate-ping shrink-0" style={{ backgroundColor: liftCategory.color }} />
            <span>{liftCategory.label} ({liftPercentage > 0 ? `${liftPercentage.toFixed(1)}%` : 'NGOÀI TẢI'})</span>
          </div>

          {/* Desktop Secondary Action Buttons */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsCustomCraneModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Khai báo loại cẩu mới hoặc tải bảng tải ngoài"
            >
              <Cpu size={14} className="text-sky-400 shrink-0" />
              <span>Thêm Cẩu Ngoài</span>
            </button>

            <button
              onClick={handleExportProjectJSON}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Lưu phương án cẩu (.json)"
            >
              <Save size={14} className="text-emerald-400 shrink-0" />
              <span>Lưu file</span>
            </button>

            <label
              className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              title="Mở phương án cẩu đã lưu (.json)"
            >
              <FolderOpen size={14} className="text-amber-400 shrink-0" />
              <span>Mở file</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportProjectJSON}
                className="hidden"
              />
            </label>

            {/* 3D Viewport Theme Quick Toggle (Light / Dark) */}
            <button
              onClick={handleToggleViewportTheme}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title={viewportTheme === 'light' ? 'Chuyển sang 3D Nền Tối CAD (Dark Mode)' : 'Chuyển sang 3D Nền Sáng Ban ngày (Light Mode)'}
            >
              {viewportTheme === 'light' ? (
                <>
                  <Moon size={14} className="text-sky-400 shrink-0" />
                  <span className="hidden xl:inline">3D: Nền Tối</span>
                </>
              ) : (
                <>
                  <Sun size={14} className="text-amber-400 shrink-0" />
                  <span className="hidden xl:inline">3D: Nền Sáng</span>
                </>
              )}
            </button>
          </div>

          {/* Primary Action Buttons */}
          <button
            onClick={() => setIsVideoModalOpen(true)}
            className="hidden sm:flex bg-rose-600 hover:bg-rose-500 text-white px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold items-center gap-1.5 shadow-md shadow-rose-600/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Xuất video ngắn mô phỏng nâng hạ 3D (MP4 / Full HD)"
          >
            <Video size={14} className="shrink-0" />
            <span>Xuất Video 3D</span>
          </button>

          <button
            onClick={handleOpenReport}
            className="bg-sky-600 hover:bg-sky-500 text-white px-2 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-md shadow-sky-600/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Xuất thuyết minh & Biện pháp cẩu PDF"
          >
            <FileText size={13} className="shrink-0" />
            <span className="hidden sm:inline">Xuất Thuyết Minh Cẩu</span>
            <span className="sm:hidden text-[11px]">Thuyết Minh</span>
          </button>

          {/* Mobile Secondary Menu Toggle (⋮) */}
          <div className="relative md:hidden shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Menu mở rộng"
            >
              {isMobileMenuOpen ? <X size={16} /> : <MoreVertical size={16} />}
            </button>

            {/* Mobile Dropdown Popover */}
            {isMobileMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 bg-slate-900/95 border border-slate-700/90 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-50 min-w-[170px] backdrop-blur-md animate-in fade-in duration-150">
                <button
                  onClick={() => {
                    setIsVideoModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-left text-rose-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer font-bold"
                >
                  <Video size={14} className="text-rose-400 shrink-0" />
                  <span>Xuất Video 3D</span>
                </button>
                <button
                  onClick={() => {
                    setIsCustomCraneModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Cpu size={14} className="text-sky-400 shrink-0" />
                  <span>Thêm Cẩu Ngoài</span>
                </button>
                <button
                  onClick={() => {
                    handleExportProjectJSON();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Save size={14} className="text-emerald-400 shrink-0" />
                  <span>Lưu File (.json)</span>
                </button>
                <label className="px-2.5 py-1.5 rounded-lg text-xs text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer">
                  <FolderOpen size={14} className="text-amber-400 shrink-0" />
                  <span>Mở File (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      handleImportProjectJSON(e);
                      setIsMobileMenuOpen(false);
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => {
                    handleToggleViewportTheme();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  {viewportTheme === 'light' ? (
                    <Moon size={14} className="text-sky-400 shrink-0" />
                  ) : (
                    <Sun size={14} className="text-amber-400 shrink-0" />
                  )}
                  <span>3D: {viewportTheme === 'light' ? 'Nền Tối CAD' : 'Nền Sáng Ban ngày'}</span>
                </button>
                <div className="h-px bg-slate-800 my-0.5" />
                <button
                  onClick={() => {
                    setIsCopyrightModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-left text-slate-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Info size={14} className="text-sky-400 shrink-0" />
                  <span>Thông tin tác giả</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile View Mode Switcher Bar (Visible on mobile/tablet under lg, always hidden in print) */}
      <div className="lg:hidden print:hidden flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs shrink-0 select-none">
        <span className="text-[11px] font-medium text-slate-400 hidden xs:inline">Chế độ xem:</span>
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 shadow-inner w-full xs:w-auto justify-between xs:justify-start">
          <button
            type="button"
            onClick={() => setMobileViewMode('3d')}
            className={`flex-1 xs:flex-initial px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              mobileViewMode === '3d'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye size={12} />
            <span>3D Toàn cảnh</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileViewMode('split')}
            className={`flex-1 xs:flex-initial px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              mobileViewMode === 'split'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={12} />
            <span>Chia đôi</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileViewMode('panel')}
            className={`flex-1 xs:flex-initial px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              mobileViewMode === 'panel'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={12} />
            <span>Thông số</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: 3D Viewport on Left, Control Inspector Tabs on Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative print:hidden">
        {/* Left Side: 3D Viewport Simulation Window */}
        <div
          className={`
            relative overflow-hidden transition-all duration-200 lg:flex-1 lg:min-w-0 lg:h-full
            ${mobileViewMode === 'panel' ? 'hidden lg:block' : ''}
            ${mobileViewMode === '3d' ? 'flex-1 h-full' : ''}
            ${mobileViewMode === 'split' ? 'h-[44vh] lg:h-full' : ''}
            p-1.5 sm:p-2 lg:p-3
          `}
        >
          {/* Floating Camera Framing Banner when adjusting report view angles */}
          {adjustingViewConfig && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border-2 border-amber-400 text-slate-100 px-5 py-3 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto max-w-[95%]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
                  <Camera size={16} className="text-amber-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 flex-wrap">
                    <span>ĐANG CHỈNH GÓC BẰNG CHUỘT:</span>
                    <span className="text-white underline">{adjustingViewConfig.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans">
                    Chuột trái: <b>Xoay</b> | Chuột phải: <b>Kéo</b> | Con lăn: <b>Zoom phóng to/thu nhỏ</b>
                  </div>
                </div>
              </div>

              {/* Quick Angle Presets */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] shrink-0">
                <span className="text-[10px] text-slate-500 px-1 font-mono shrink-0">Góc mẫu:</span>
                <button
                  type="button"
                  onClick={() => viewportRef.current?.setPreset('top')}
                  className="px-2 py-0.5 rounded hover:bg-slate-800 text-sky-300 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Mặt bằng
                </button>
                <button
                  type="button"
                  onClick={() => viewportRef.current?.setPreset('3d')}
                  className="px-2 py-0.5 rounded hover:bg-slate-800 text-emerald-300 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  3D Phối cảnh
                </button>
                <button
                  type="button"
                  onClick={() => viewportRef.current?.setPreset('side')}
                  className="px-2 py-0.5 rounded hover:bg-slate-800 text-amber-300 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Mặt đứng
                </button>
                <button
                  type="button"
                  onClick={() => viewportRef.current?.setPreset('load')}
                  className="px-2 py-0.5 rounded hover:bg-slate-800 text-purple-300 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Tải cẩu
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleConfirmAdjustView}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CheckCircle size={14} className="shrink-0" /> Chụp & Lưu góc này
                </button>
                <button
                  type="button"
                  onClick={handleCancelAdjustView}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Hủy / Quay lại
                </button>
              </div>
            </div>
          )}

          <ThreeViewport
            crane={selectedCrane}
            boomLength={boomLength}
            setBoomLength={setBoomLength}
            workingRadius={workingRadius}
            setWorkingRadius={setWorkingRadius}
            slewAngle={slewAngle}
            setSlewAngle={setSlewAngle}
            craneHeading={craneHeading}
            setCraneHeading={setCraneHeading}
            boomAngle={boomAngle}
            hookElevation={hookElevation}
            loadElevation={loadElevation}
            setLoadElevation={setLoadElevation}
            loadRotation={loadRotation}
            setLoadRotation={setLoadRotation}
            liftPercentage={liftPercentage}
            liftCategory={liftCategory}
            ratedCapacity={ratedCapacity}
            grossLoad={grossLoad}
            outriggerReactions={outriggerReactions}
            soilCapacityTonsPerM2={allowableSoilCapacity}
            matLength={matLength}
            matWidth={matWidth}
            loadConfig={loadConfig}
            riggingConfig={riggingConfig}
            obstacles={obstacles}
            setObstacles={setObstacles}
            pickingFencePoint={pickingFencePoint}
            setPickingFencePoint={setPickingFencePoint}
            liftPoints={liftPoints}
            pickPoint={pickPoint}
            setPoint={setPoint}
            isSimulating={isSimulating}
            setIsSimulating={setIsSimulating}
            captureRef={viewportRef}
            onOpenVideoModal={() => setIsVideoModalOpen(true)}
            viewportTheme={viewportTheme}
            onToggleViewportTheme={handleToggleViewportTheme}
          />
        </div>

        {/* Right Side: Engineering Inspector & Control Panels (Không quá 1/4 khung hình trên Desktop) */}
        <div
          className={`
            w-full lg:w-1/4 lg:max-w-[25%] lg:flex-none border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950 flex flex-col z-20 shrink-0 transition-all duration-200
            ${mobileViewMode === '3d' ? 'hidden lg:flex' : ''}
            ${mobileViewMode === 'panel' ? 'flex-1 h-full lg:flex-none' : ''}
            ${mobileViewMode === 'split' ? 'flex-1 h-[56vh] lg:h-full lg:flex-none' : ''}
          `}
        >
          {/* Quick Banner when in full parameter panel mode on mobile */}
          {mobileViewMode === 'panel' && (
            <div className="lg:hidden flex items-center justify-between px-3 py-1.5 bg-sky-950/60 border-b border-sky-800/40 text-xs shrink-0">
              <span className="text-[11px] text-sky-300 font-semibold flex items-center gap-1.5">
                <Sliders size={13} /> Chế độ Toàn màn hình Thông số
              </span>
              <button
                type="button"
                onClick={() => setMobileViewMode('3d')}
                className="px-2.5 py-0.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
              >
                <Eye size={12} /> Xem 3D
              </button>
            </div>
          )}

          {/* Navigation Tabs Bar */}
          <div id="desktop-inspector-tabs" className="flex items-center border-b border-slate-800 bg-slate-900/80 px-1 pt-1.5 gap-0.5 shrink-0 select-none overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => setActiveTab('crane')}
              title="Cần cẩu"
              className={`flex-1 min-w-0 py-1.5 2xl:py-2 px-0.5 2xl:px-1 text-[10px] xl:text-[11px] 2xl:text-xs font-semibold rounded-t-lg transition-all flex flex-col 2xl:flex-row items-center justify-center gap-0.5 2xl:gap-1 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'crane'
                  ? 'border-sky-500 bg-slate-950 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck size={13} className="shrink-0" />
              <span className="truncate">Cần cẩu</span>
            </button>

            <button
              onClick={() => setActiveTab('load')}
              title="Tải trọng & Thiết bị chằng buộc"
              className={`flex-1 min-w-0 py-1.5 2xl:py-2 px-0.5 2xl:px-1 text-[10px] xl:text-[11px] 2xl:text-xs font-semibold rounded-t-lg transition-all flex flex-col 2xl:flex-row items-center justify-center gap-0.5 2xl:gap-1 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'load'
                  ? 'border-amber-500 bg-slate-950 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package size={13} className="shrink-0" />
              <span className="truncate">Tải & Dây</span>
            </button>

            <button
              onClick={() => setActiveTab('mat')}
              title="Áp lực chân chống & Tấm lót"
              className={`flex-1 min-w-0 py-1.5 2xl:py-2 px-0.5 2xl:px-1 text-[10px] xl:text-[11px] 2xl:text-xs font-semibold rounded-t-lg transition-all flex flex-col 2xl:flex-row items-center justify-center gap-0.5 2xl:gap-1 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'mat'
                  ? 'border-emerald-500 bg-slate-950 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={13} className="shrink-0" />
              <span className="truncate">Chân chống</span>
            </button>

            <button
              onClick={() => setActiveTab('dual_point')}
              title="Mô phỏng đường cẩu Pick - Set"
              className={`flex-1 min-w-0 py-1.5 2xl:py-2 px-0.5 2xl:px-1 text-[10px] xl:text-[11px] 2xl:text-xs font-semibold rounded-t-lg transition-all flex flex-col 2xl:flex-row items-center justify-center gap-0.5 2xl:gap-1 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'dual_point'
                  ? 'border-rose-500 bg-slate-950 text-rose-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowRight size={13} className="shrink-0" />
              <span className="truncate">Pick → Set</span>
            </button>

            <button
              onClick={() => setActiveTab('obstacle')}
              title="Vật cản công trình & Vận tốc gió"
              className={`flex-1 min-w-0 py-1.5 2xl:py-2 px-0.5 2xl:px-1 text-[10px] xl:text-[11px] 2xl:text-xs font-semibold rounded-t-lg transition-all flex flex-col 2xl:flex-row items-center justify-center gap-0.5 2xl:gap-1 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'obstacle'
                  ? 'border-purple-500 bg-slate-950 text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 size={13} className="shrink-0" />
              <span className="truncate">Vật cản</span>
            </button>
          </div>

          {/* Active Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Tab 1: Crane Selector */}
            {activeTab === 'crane' && (
              <CraneSelector
                cranes={cranes}
                selectedCrane={selectedCrane}
                setSelectedCrane={setSelectedCrane}
                boomLength={boomLength}
                setBoomLength={setBoomLength}
                workingRadius={workingRadius}
                setWorkingRadius={setWorkingRadius}
                slewAngle={slewAngle}
                setSlewAngle={setSlewAngle}
                craneHeading={craneHeading}
                setCraneHeading={setCraneHeading}
                boomAngle={boomAngle}
                tipHeight={boomKinematics.tipHeight}
                loadElevation={loadElevation}
                setLoadElevation={setLoadElevation}
                counterweight={counterweight}
                setCounterweight={setCounterweight}
                outriggerRatio={outriggerRatio}
                setOutriggerRatio={setOutriggerRatio}
                partsOfLine={partsOfLine}
                setPartsOfLine={setPartsOfLine}
                onOpenCustomCraneModal={() => setIsCustomCraneModalOpen(true)}
              />
            )}

            {/* Tab 2: Load & Rigging */}
            {activeTab === 'load' && (
              <LoadConfigurator
                loadConfig={loadConfig}
                setLoadConfig={setLoadConfig}
                riggingConfig={riggingConfig}
                setRiggingConfig={setRiggingConfig}
                grossLoad={grossLoad}
                netLoad={loadConfig.netWeight}
                totalRiggingWeight={totalRiggingWeight}
                hookWeight={hookWeight}
              />
            )}

            {/* Tab 3: Outrigger & Mat GBP */}
            {activeTab === 'mat' && (
              <OutriggerMatCalc
                outriggerReactions={outriggerReactions}
                matLength={matLength}
                setMatLength={setMatLength}
                matWidth={matWidth}
                setMatWidth={setMatWidth}
                selectedSoilId={selectedSoilId}
                setSelectedSoilId={setSelectedSoilId}
                customSoilCapacity={customSoilCapacity}
                setCustomSoilCapacity={setCustomSoilCapacity}
              />
            )}

            {/* Tab 4: Multi-Waypoint Lift Trajectory (Pick -> Waypoints -> Set) */}
            {activeTab === 'dual_point' && (
              <PickSetTrajectoryManager
                liftPoints={liftPoints}
                setLiftPoints={setLiftPoints}
                currentRadius={workingRadius}
                currentSlew={slewAngle}
                currentElevation={loadElevation}
                currentLoadRotation={loadRotation}
                setLoadRotation={setLoadRotation}
                craneHeading={craneHeading}
                onApplyPointToCrane={handleApplyPointToCrane}
                selectedCrane={selectedCrane}
                boomLength={boomLength}
                counterweight={counterweight}
                outriggerRatio={outriggerRatio}
                grossLoad={grossLoad}
                isSimulating={isSimulating}
                setIsSimulating={setIsSimulating}
              />
            )}

            {/* Tab 5: Obstacle & Wind Environment */}
            {activeTab === 'obstacle' && (
              <div className="space-y-4">
                <ObstacleManager
                  obstacles={obstacles}
                  setObstacles={setObstacles}
                  pickingFencePoint={pickingFencePoint}
                  setPickingFencePoint={setPickingFencePoint}
                  workingRadius={workingRadius}
                  slewAngle={slewAngle}
                  craneHeading={craneHeading}
                  boomAngle={boomAngle}
                  boomLength={boomLength}
                  loadElevation={loadElevation}
                  hookElevation={hookElevation}
                />

                {/* Wind Speed Derating Card */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Wind className="text-sky-400" size={18} />
                      <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                        Vận tốc gió & Tải trọng gió
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        windEffect.isExceeded
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {windSpeed} m/s ({((windSpeed * 3600) / 1000).toFixed(0)} km/h)
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                      <span>Tốc độ gió đo tại hiện trường:</span>
                      <span className="font-mono font-bold text-sky-400">{windSpeed} m/s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={0.5}
                      value={windSpeed}
                      onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
                      className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>0 m/s (Lặng gió)</span>
                      <span>Giới hạn cẩu: {selectedCrane.specs.maxWindSpeed || 11} m/s</span>
                      <span>20 m/s (Bão)</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1 font-mono">
                    <div className="flex justify-between text-slate-400 font-sans">
                      <span>Áp lực gió động (q):</span>
                      <span className="text-slate-200">{windEffect.windPressurePa} Pa</span>
                    </div>
                    <div className="flex justify-between text-slate-400 font-sans">
                      <span>Lực đẩy gió tác dụng lên vật cẩu:</span>
                      <span className="text-amber-400 font-bold">{windEffect.windForceTons} Tấn</span>
                    </div>
                  </div>

                  {windEffect.warning && (
                    <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-1.5">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <span>{windEffect.warning}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Crane Modal */}
      <CustomCraneModal
        isOpen={isCustomCraneModalOpen}
        onClose={() => setIsCustomCraneModalOpen(false)}
        onSaveCustomCrane={handleSaveCustomCrane}
        existingCranes={cranes}
      />

      {/* Lift Plan Report Modal */}
      <LiftPlanReport
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        crane={selectedCrane}
        boomLength={boomLength}
        workingRadius={workingRadius}
        slewAngle={slewAngle}
        craneHeading={craneHeading}
        boomAngle={boomAngle}
        counterweight={counterweight}
        outriggerRatio={outriggerRatio}
        partsOfLine={partsOfLine}
        hookElevation={hookElevation}
        loadElevation={loadElevation}
        grossLoad={grossLoad}
        netLoad={loadConfig.netWeight}
        totalRiggingWeight={totalRiggingWeight}
        hookWeight={hookWeight}
        ratedCapacity={ratedCapacity}
        liftPercentage={liftPercentage}
        liftCategory={liftCategory}
        outriggerReactions={outriggerReactions}
        matLength={matLength}
        matWidth={matWidth}
        soilCapacityTonsPerM2={allowableSoilCapacity}
        windSpeed={windSpeed}
        liftPoints={liftPoints}
        capturedViews={capturedViews}
        onRefreshViews={handleRefreshViews}
        obstacles={obstacles}
        loadConfig={loadConfig}
        riggingConfig={riggingConfig}
        onStartAdjustView={handleStartAdjustView}
        onUpdateViewImage={(viewKey, dataUrl) =>
          setCapturedViews((prev) => ({ ...(prev || {}), [viewKey]: dataUrl }))
        }
      />

      {/* App Footer: Standards & Author Bar */}
      <footer className="h-7 border-t border-slate-800 bg-slate-950/95 px-4 flex items-center justify-between text-[11px] text-slate-400 select-none z-20 shrink-0 print:hidden font-mono">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 font-semibold">3D LIFT PLAN PRO</span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline font-sans">
            Hệ thống Mô phỏng & Bản vẽ Biện pháp Cẩu 3D
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-slate-500">Tiêu chuẩn: ASME B30.5 | OSHA 1926.1400 | TCVN 4244:2005</span>
          <span className="hidden md:inline text-slate-700">|</span>
          <button
            type="button"
            onClick={() => setIsCopyrightModalOpen(true)}
            className="hover:text-sky-300 transition-colors cursor-pointer text-slate-400 hover:underline flex items-center gap-1.5 font-sans"
            title="Tác giả: Nguyễn Đức Thắng | 0962.228.783 • Xem thông tin tác giả & bản quyền"
          >
            <Info size={12} className="text-sky-400" />
            <span>Thông tin tác giả</span>
          </button>
        </div>
      </footer>

      {/* Copyright & Technical License Modal */}
      <CopyrightModal
        isOpen={isCopyrightModalOpen}
        onClose={() => setIsCopyrightModalOpen(false)}
      />

      {/* Short Video Export Modal */}
      <VideoExportModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        viewportRef={viewportRef}
        selectedCrane={selectedCrane}
        grossLoad={grossLoad}
        boomLength={boomLength}
        workingRadius={workingRadius}
        slewAngle={slewAngle}
        boomAngle={boomAngle}
        liftPercentage={liftPercentage}
        liftCategory={liftCategory}
        liftPoints={liftPoints}
        isSimulating={isSimulating}
        setIsSimulating={setIsSimulating}
        startPickSetRecording={handleStartPickSetRecording}
        registerFinishPickSetRecording={handleRegisterFinishPickSetRecording}
      />
    </div>
  );
}

