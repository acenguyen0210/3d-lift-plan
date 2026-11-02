import React, { useState } from 'react';
import {
  ArrowRight,
  Play,
  Pause,
  Plus,
  Trash2,
  MapPin,
  Compass,
  Navigation,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  Eye,
  Sliders,
  Sparkles
} from 'lucide-react';
import WheelNumberInput from './WheelNumberInput';
import { getRatedCapacity } from '../utils/craneMath';

export default function PickSetTrajectoryManager({
  liftPoints,
  setLiftPoints,
  currentRadius,
  currentSlew,
  currentElevation,
  currentLoadRotation = 0,
  setLoadRotation,
  craneHeading = 0,
  onApplyPointToCrane,
  selectedCrane,
  boomLength,
  counterweight,
  outriggerRatio,
  grossLoad,
  isSimulating,
  setIsSimulating
}) {
  const [activePointId, setActivePointId] = useState(liftPoints[0]?.id || null);

  // Add intermediate waypoint
  const handleAddWaypoint = () => {
    const newIdx = liftPoints.length;
    const prevPt = liftPoints[liftPoints.length - 2] || liftPoints[0];
    const lastPt = liftPoints[liftPoints.length - 1];

    // Midpoint between previous and last point
    const midRadius = Math.round(((prevPt.radius + lastPt.radius) * 0.5) * 10) / 10;
    let midSlew = Math.round((prevPt.slew + lastPt.slew) * 0.5);
    const midElev = Math.round((Math.max(prevPt.elevation, lastPt.elevation) + 3.0) * 10) / 10;
    const rotA = prevPt.loadRotation !== undefined ? prevPt.loadRotation : 0;
    const rotB = lastPt.loadRotation !== undefined ? lastPt.loadRotation : 90;
    const midRot = Math.round((rotA + rotB) * 0.5);

    const newPt = {
      id: `pt-${Date.now()}`,
      name: `Điểm ${newIdx}: Trung gian (Waypoint ${newIdx - 1})`,
      radius: midRadius,
      slew: midSlew,
      elevation: midElev,
      loadRotation: midRot
    };

    // Insert right before the last point (Set point)
    const updated = [...liftPoints];
    updated.splice(updated.length - 1, 0, newPt);
    setLiftPoints(updated);
    setActivePointId(newPt.id);
  };

  // Add waypoint from current crane position
  const handleCaptureCurrentAsNewWaypoint = () => {
    const newIdx = liftPoints.length;
    const newPt = {
      id: `pt-${Date.now()}`,
      name: `Điểm ${newIdx}: Tọa độ hiện tại (Waypoint ${newIdx - 1})`,
      radius: currentRadius,
      slew: currentSlew,
      elevation: currentElevation,
      loadRotation: currentLoadRotation
    };
    const updated = [...liftPoints];
    updated.splice(updated.length - 1, 0, newPt);
    setLiftPoints(updated);
    setActivePointId(newPt.id);
  };

  // Update a field of a waypoint
  const handleUpdate = (id, field, val) => {
    setLiftPoints(
      liftPoints.map((pt) => (pt.id === id ? { ...pt, [field]: val } : pt))
    );
    if (field === 'loadRotation' && setLoadRotation) {
      setLoadRotation(val);
    }
  };

  // Delete an intermediate waypoint
  const handleDelete = (id) => {
    if (liftPoints.length <= 2) {
      alert('Đường cẩu cần tối thiểu 2 điểm (Điểm đón & Điểm đặt)!');
      return;
    }
    setLiftPoints(liftPoints.filter((pt) => pt.id !== id));
  };

  // Set point coords to current crane position
  const handleAssignCurrentPos = (id) => {
    setLiftPoints(
      liftPoints.map((pt) =>
        pt.id === id
          ? {
              ...pt,
              radius: currentRadius,
              slew: currentSlew,
              elevation: currentElevation,
              loadRotation: currentLoadRotation
            }
          : pt
      )
    );
  };

  // Calculate capacities for all points
  const evaluatedPoints = liftPoints.map((pt, idx) => {
    const capRes = getRatedCapacity(
      selectedCrane,
      boomLength,
      pt.radius,
      counterweight,
      outriggerRatio
    );
    const cap = capRes.capacity || 0;
    const pct = cap > 0 ? (grossLoad / cap) * 100 : 999;
    return {
      ...pt,
      index: idx,
      capacity: cap,
      percentage: pct,
      isStart: idx === 0,
      isEnd: idx === liftPoints.length - 1,
      isMid: idx > 0 && idx < liftPoints.length - 1
    };
  });

  // Find critical point (highest percentage)
  let criticalPoint = evaluatedPoints[0];
  evaluatedPoints.forEach((p) => {
    if (p.percentage > criticalPoint.percentage) {
      criticalPoint = p;
    }
  });

  // Calculate effective load rotation for any point (either custom or linearly interpolated from Start to End)
  const getLinearRotation = (pointIndex) => {
    if (!liftPoints || liftPoints.length === 0) return 0;
    const startPt = liftPoints[0];
    const endPt = liftPoints[liftPoints.length - 1];
    const startRot = startPt?.loadRotation !== undefined && startPt?.loadRotation !== null ? startPt.loadRotation : 0;
    const endRot = (endPt?.hasCustomRotation !== false && endPt?.loadRotation !== undefined && endPt?.loadRotation !== null)
      ? endPt.loadRotation
      : startRot;

    const numSegs = Math.max(1, liftPoints.length - 1);
    const t = Math.max(0, Math.min(1, pointIndex / numSegs));
    let rotDiff = endRot - startRot;
    if (rotDiff > 180) rotDiff -= 360;
    if (rotDiff < -180) rotDiff += 360;
    return Math.round(((startRot + rotDiff * t) % 360 + 360) % 360);
  };

  const getEffectivePointRotation = (pt, idx) => {
    if (!pt) return 0;
    if (pt.isStart || idx === 0) {
      return pt.loadRotation !== undefined && pt.loadRotation !== null ? pt.loadRotation : 0;
    }
    if (pt.isEnd || idx === liftPoints.length - 1) {
      if (pt.hasCustomRotation === false) {
        const startPt = liftPoints[0];
        return startPt?.loadRotation !== undefined && startPt?.loadRotation !== null ? startPt.loadRotation : 0;
      }
      return pt.loadRotation !== undefined && pt.loadRotation !== null ? pt.loadRotation : 90;
    }
    // Intermediate waypoint
    if (pt.hasCustomRotation === true && pt.loadRotation !== null && pt.loadRotation !== undefined) {
      return pt.loadRotation;
    }
    // Auto linear rotation
    return getLinearRotation(idx);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="border-b border-slate-800 pb-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Navigation className="text-rose-400 shrink-0" size={16} />
            <h2 className="text-xs xl:text-sm font-bold text-slate-100 uppercase tracking-tight whitespace-nowrap">
              Quỹ đạo cẩu ({liftPoints.length} Điểm)
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleAddWaypoint}
              className="bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 px-2 py-0.5 xl:px-2.5 xl:py-1 rounded-md text-[11px] xl:text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
              title="Thêm điểm né vật cản / chuyển hướng ở giữa"
            >
              <Plus size={12} className="shrink-0" />
              <span className="hidden sm:inline">+ Điểm giữa</span>
              <span className="sm:hidden">+ Điểm</span>
            </button>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow whitespace-nowrap shrink-0 cursor-pointer ${
                isSimulating
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isSimulating ? <Pause size={12} className="shrink-0" /> : <Play size={12} className="shrink-0" />}
              {isSimulating ? 'Dừng' : 'Mô phỏng'}
            </button>
          </div>
        </div>
        <div className="text-[10px] xl:text-[11px] text-slate-400 truncate">
          Đón tải → Điểm né trung gian → Đặt tải
        </div>
      </div>

      {/* Critical Stage Summary Banner */}
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5">
        <div className="flex items-center justify-between font-bold">
          <span className="text-slate-300 flex items-center gap-1.5">
            <AlertTriangle
              size={15}
              className={criticalPoint.percentage > 85 ? 'text-amber-400' : 'text-emerald-400'}
            />
            Điểm quyết định an toàn (Critical Waypoint):
          </span>
          <span
            className={`font-mono text-sm ${
              criticalPoint.percentage > 100
                ? 'text-rose-400'
                : criticalPoint.percentage > 85
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {criticalPoint.name} ({criticalPoint.percentage.toFixed(1)}%)
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Tại bán kính R = <b className="text-slate-200">{criticalPoint.radius}m</b>, góc quay S ={' '}
          <b className="text-slate-200">{criticalPoint.slew}°</b>, sức nâng cho phép là{' '}
          <b className="text-sky-300">{criticalPoint.capacity.toFixed(2)}t</b> (Tổng tải {grossLoad.toFixed(2)}t).
        </div>
      </div>

      {/* Waypoints List */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {evaluatedPoints.map((pt, idx) => {
          const isCrit = pt.id === criticalPoint.id;
          const badgeBg = pt.isStart
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : pt.isEnd
            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            : 'bg-amber-500/15 text-amber-300 border-amber-500/30';

          return (
            <div
              key={pt.id}
              className={`bg-slate-950 p-3 rounded-lg border transition-all space-y-2.5 ${
                isCrit
                  ? 'border-amber-500/60 shadow-md shadow-amber-500/5'
                  : 'border-slate-800'
              }`}
            >
              {/* Point Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 mr-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${badgeBg}`}
                  >
                    {pt.isStart
                      ? '1. Điểm đón (Pick)'
                      : pt.isEnd
                      ? `${idx + 1}. Điểm đặt (Set)`
                      : `${idx + 1}. Điểm giữa (Waypoint)`}
                  </span>

                  <input
                    type="text"
                    value={pt.name}
                    onChange={(e) => handleUpdate(pt.id, 'name', e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none flex-1 truncate"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleAssignCurrentPos(pt.id)}
                    className="text-[10px] bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 px-2 py-0.5 rounded font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Lấy tọa độ hiện tại của cần cẩu đưa vào điểm này"
                  >
                    Lấy tọa độ
                  </button>

                  <button
                    onClick={() => {
                      const effRot = getEffectivePointRotation(pt, idx);
                      onApplyPointToCrane({ ...pt, loadRotation: effRot });
                    }}
                    className="text-[10px] bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-800 px-2 py-0.5 rounded font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Di chuyển cần cẩu tới điểm này ngay lập tức để quan sát 3D"
                  >
                    Xem điểm
                  </button>

                  {pt.isMid && (
                    <button
                      onClick={() => handleDelete(pt.id)}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors shrink-0 cursor-pointer"
                      title="Xóa điểm trung gian này"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Coordinate Inputs (Radius, Slew, Elevation) */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Bán kính R:</span>
                  <WheelNumberInput
                    value={pt.radius}
                    onChange={(v) => handleUpdate(pt.id, 'radius', Math.max(3.0, v))}
                    min={3.0}
                    max={boomLength}
                    step={0.5}
                    unit="m"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono font-bold focus:border-sky-500"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Góc quay S:</span>
                  <WheelNumberInput
                    value={pt.slew}
                    onChange={(v) => handleUpdate(pt.id, 'slew', Math.round(v))}
                    min={0}
                    max={360}
                    step={2}
                    wrapAround={true}
                    unit="°"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono font-bold focus:border-amber-500"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Cao độ H:</span>
                  <WheelNumberInput
                    value={pt.elevation}
                    onChange={(v) => handleUpdate(pt.id, 'elevation', Math.max(0.2, v))}
                    min={0.2}
                    max={60}
                    step={0.5}
                    unit="m"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono font-bold focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Cartesian Coordinates X, Z (cho phép toạ độ âm) */}
              {(() => {
                const worldSlewRad = (((pt.slew || 0) + (craneHeading || 0)) * Math.PI) / 180;
                const r = pt.radius || 3;
                const coordX = Math.round(r * Math.cos(worldSlewRad) * 10) / 10;
                const coordZ = Math.round(r * Math.sin(worldSlewRad) * 10) / 10;

                const handleUpdateX = (newX) => {
                  const newR = Math.hypot(newX, coordZ);
                  let worldS = (Math.atan2(coordZ, newX) * 180) / Math.PI;
                  let relS = worldS - (craneHeading || 0);
                  while (relS < 0) relS += 360;
                  while (relS >= 360) relS -= 360;
                  handleUpdate(pt.id, 'radius', Math.max(3.0, Math.min(boomLength, Math.round(newR * 10) / 10)));
                  handleUpdate(pt.id, 'slew', Math.round(relS));
                };

                const handleUpdateZ = (newZ) => {
                  const newR = Math.hypot(coordX, newZ);
                  let worldS = (Math.atan2(newZ, coordX) * 180) / Math.PI;
                  let relS = worldS - (craneHeading || 0);
                  while (relS < 0) relS += 360;
                  while (relS >= 360) relS -= 360;
                  handleUpdate(pt.id, 'radius', Math.max(3.0, Math.min(boomLength, Math.round(newR * 10) / 10)));
                  handleUpdate(pt.id, 'slew', Math.round(relS));
                };

                return (
                  <div className="flex items-center justify-between text-[11px] bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80 font-mono">
                    <span className="text-slate-400 text-[10px] flex items-center gap-1 font-sans">
                      <Compass size={12} className="text-cyan-400" /> Tọa độ mặt bằng (X, Z):
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 text-[10px]">X:</span>
                        <WheelNumberInput
                          value={coordX}
                          onChange={handleUpdateX}
                          min={-boomLength}
                          max={boomLength}
                          step={0.5}
                          unit="m"
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-cyan-300 font-bold text-center focus:border-cyan-500"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 text-[10px]">Z:</span>
                        <WheelNumberInput
                          value={coordZ}
                          onChange={handleUpdateZ}
                          min={-boomLength}
                          max={boomLength}
                          step={0.5}
                          unit="m"
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-cyan-300 font-bold text-center focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Load Rotation for this waypoint */}
              {pt.isStart && (
                <div className="flex items-center justify-between bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-800/80 text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <RotateCw size={13} className="text-emerald-400 shrink-0" />
                    <span>Hướng đón tải:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      value={pt.loadRotation !== undefined && pt.loadRotation !== null ? pt.loadRotation : 0}
                      onChange={(e) => handleUpdate(pt.id, 'loadRotation', parseFloat(e.target.value))}
                      className="w-20 accent-emerald-500 h-1 bg-slate-800 rounded cursor-pointer"
                    />
                    <WheelNumberInput
                      value={pt.loadRotation !== undefined && pt.loadRotation !== null ? pt.loadRotation : 0}
                      onChange={(v) => handleUpdate(pt.id, 'loadRotation', Math.round(v))}
                      min={0}
                      max={360}
                      step={5}
                      wrapAround={true}
                      unit="°"
                      className="w-16 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-emerald-400 font-mono font-bold text-center focus:border-emerald-500"
                    />
                    <div className="flex items-center gap-1">
                      {[0, 45, 90, 180].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => handleUpdate(pt.id, 'loadRotation', deg)}
                          className={`text-[9px] font-mono px-1 py-0.5 rounded border transition-colors ${
                            (pt.loadRotation !== undefined && pt.loadRotation !== null ? pt.loadRotation : 0) === deg
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                          }`}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {pt.isMid && (
                <div className="flex items-center justify-between bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-800/80 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-medium select-none whitespace-nowrap shrink-0">
                    <input
                      type="checkbox"
                      checked={pt.hasCustomRotation === true}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleUpdate(pt.id, 'hasCustomRotation', checked);
                        if (checked) {
                          const rot = (pt.loadRotation !== undefined && pt.loadRotation !== null) ? pt.loadRotation : getLinearRotation(idx);
                          handleUpdate(pt.id, 'loadRotation', rot);
                        } else {
                          const lin = getLinearRotation(idx);
                          if (setLoadRotation) setLoadRotation(lin);
                        }
                      }}
                      className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                    />
                    <RotateCw
                      size={13}
                      className={pt.hasCustomRotation === true ? 'text-emerald-400 shrink-0' : 'text-slate-500 shrink-0'}
                    />
                    <span>Tùy chỉnh góc xoay:</span>
                  </label>

                  {pt.hasCustomRotation === true ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={5}
                        value={pt.loadRotation !== undefined && pt.loadRotation !== null ? pt.loadRotation : getLinearRotation(idx)}
                        onChange={(e) => handleUpdate(pt.id, 'loadRotation', parseFloat(e.target.value))}
                        className="w-20 accent-emerald-500 h-1 bg-slate-800 rounded cursor-pointer"
                      />
                      <WheelNumberInput
                        value={pt.loadRotation !== undefined && pt.loadRotation !== null ? pt.loadRotation : getLinearRotation(idx)}
                        onChange={(v) => handleUpdate(pt.id, 'loadRotation', Math.round(v))}
                        min={0}
                        max={360}
                        step={5}
                        wrapAround={true}
                        unit="°"
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-emerald-400 font-mono font-bold text-center focus:border-emerald-500"
                      />
                      <div className="flex items-center gap-1">
                        {[0, 45, 90, 180].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => handleUpdate(pt.id, 'loadRotation', deg)}
                            className={`text-[9px] font-mono px-1 py-0.5 rounded border transition-colors ${
                              (pt.loadRotation !== undefined && pt.loadRotation !== null ? pt.loadRotation : getLinearRotation(idx)) === deg
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
                        <span className="text-[10px] text-slate-400 font-sans">Tự động xoay tuyến tính:</span>
                        <b className="font-bold text-emerald-300">{getLinearRotation(idx)}°</b>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {pt.isEnd && (
                <div className="flex items-center justify-between bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-800/80 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-medium select-none whitespace-nowrap shrink-0">
                    <input
                      type="checkbox"
                      checked={pt.hasCustomRotation !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleUpdate(pt.id, 'hasCustomRotation', checked);
                        if (checked) {
                          const rot = (pt.loadRotation !== undefined && pt.loadRotation !== null) ? pt.loadRotation : 90;
                          handleUpdate(pt.id, 'loadRotation', rot);
                        } else {
                          const startRot = liftPoints[0]?.loadRotation || 0;
                          if (setLoadRotation) setLoadRotation(startRot);
                        }
                      }}
                      className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                    />
                    <RotateCw
                      size={13}
                      className={pt.hasCustomRotation !== false ? 'text-emerald-400 shrink-0' : 'text-slate-500 shrink-0'}
                    />
                    <span>Xoay kiện khi hạ đặt:</span>
                  </label>

                  {pt.hasCustomRotation !== false ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={5}
                        value={pt.loadRotation !== undefined && pt.loadRotation !== null ? pt.loadRotation : 90}
                        onChange={(e) => handleUpdate(pt.id, 'loadRotation', parseFloat(e.target.value))}
                        className="w-20 accent-emerald-500 h-1 bg-slate-800 rounded cursor-pointer"
                      />
                      <WheelNumberInput
                        value={pt.loadRotation !== undefined && pt.loadRotation !== null ? pt.loadRotation : 90}
                        onChange={(v) => handleUpdate(pt.id, 'loadRotation', Math.round(v))}
                        min={0}
                        max={360}
                        step={5}
                        wrapAround={true}
                        unit="°"
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-emerald-400 font-mono font-bold text-center focus:border-emerald-500"
                      />
                      <div className="flex items-center gap-1">
                        {[0, 45, 90, 180].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => handleUpdate(pt.id, 'loadRotation', deg)}
                            className={`text-[9px] font-mono px-1 py-0.5 rounded border transition-colors ${
                              (pt.loadRotation !== undefined && pt.loadRotation !== null ? pt.loadRotation : 90) === deg
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                      Giữ nguyên hướng đón tải ({liftPoints[0]?.loadRotation || 0}°)
                    </span>
                  )}
                </div>
              )}

              {/* Point Safety Assessment */}
              <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-900/90 font-mono">
                <span className="text-slate-400">
                  Tải cho phép: <b className="text-slate-200">{pt.capacity.toFixed(2)}t</b>
                </span>
                <span
                  className={`font-bold ${
                    pt.percentage > 100
                      ? 'text-rose-400'
                      : pt.percentage > 85
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  % Tải: {pt.capacity > 0 ? `${pt.percentage.toFixed(1)}%` : 'NGOÀI BẢNG TẢI'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add at bottom */}
      <div className="pt-2.5 border-t border-slate-800 flex justify-between items-center gap-2">
        <button
          onClick={handleCaptureCurrentAsNewWaypoint}
          className="text-xs text-slate-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors font-medium cursor-pointer whitespace-nowrap"
        >
          <Sparkles size={14} className="text-sky-400 shrink-0" />
          <span className="truncate">Ghi lại vị trí cẩu hiện tại</span>
        </button>

        <button
          onClick={handleAddWaypoint}
          className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus size={14} className="shrink-0" /> Thêm điểm giữa
        </button>
      </div>
    </div>
  );
}

