import React, { useState } from 'react';
import {
  Building2,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Trash2,
  Zap,
  Disc,
  Layers,
  Eye,
  EyeOff,
  Copy,
  ChevronDown,
  ChevronUp,
  Ruler,
  Factory,
  Fence,
  MapPin,
  MousePointerClick
} from 'lucide-react';
import WheelNumberInput from './WheelNumberInput';
import { calculateClearance } from '../utils/clearanceMath';

export default function ObstacleManager({
  obstacles,
  setObstacles,
  pickingFencePoint,
  setPickingFencePoint,
  workingRadius,
  slewAngle,
  craneHeading = 0,
  boomAngle,
  boomLength,
  loadElevation,
  hookElevation
}) {
  const [expandedId, setExpandedId] = useState(obstacles[0]?.id || null);

  // Boom tip & Load positions (0° = +X, 90° = +Z)
  const totalSlewRad = (((slewAngle || 0) + (craneHeading || 0)) * Math.PI) / 180;
  const tipX = workingRadius * Math.cos(totalSlewRad);
  const tipZ = workingRadius * Math.sin(totalSlewRad);
  const tipY = 2.45 + boomLength * Math.sin((boomAngle * Math.PI) / 180);

  const clearance = calculateClearance({
    boomTipX: tipX,
    boomTipY: tipY,
    boomTipZ: tipZ,
    loadX: tipX,
    loadY: loadElevation,
    loadZ: tipZ,
    obstacles
  });

  // Add new obstacle
  const handleAddObstacle = (type = 'building') => {
    const id = `obs-${Date.now()}`;
    const newObs = {
      id,
      name:
        type === 'wall'
          ? 'Hàng rào bao quanh công trường'
          : type === 'workshop'
          ? 'Nhà xưởng kết cấu thép'
          : type === 'power_pole'
          ? 'Cột điện cao thế 110kV'
          : type === 'cylinder'
          ? 'Bồn chứa công nghiệp'
          : type === 'trench'
          ? 'Hố móng sâu'
          : 'Công trình / Tòa nhà mới',
      type,
      enabled: true,
      wallMode: 'points',
      height: type === 'wall' ? 2.8 : type === 'workshop' ? 8.5 : type === 'power_pole' ? 18 : 15,
      thickness: 0.25,
      isClosed: true,
      boundaryPoints: [
        { id: `bp-1-${Date.now()}`, name: 'Mốc 1 (Trước - Trái)', x: -22, z: -20 },
        { id: `bp-2-${Date.now()}`, name: 'Mốc 2 (Trước - Phải)', x: 22, z: -20 },
        { id: `bp-3-${Date.now()}`, name: 'Mốc 3 (Sau - Phải)', x: 22, z: 22 },
        { id: `bp-4-${Date.now()}`, name: 'Mốc 4 (Sau - Trái)', x: -22, z: 22 }
      ],
      posX: Math.round((workingRadius + 8) * 10) / 10,
      posZ: 0,
      rotationY: 0,
      width: type === 'workshop' ? 18 : type === 'power_pole' ? 8 : type === 'wall' ? 0.3 : 8,
      length: type === 'workshop' ? 30 : type === 'power_pole' ? 35 : type === 'wall' ? 20 : 10,
      roofPitch: 2.5,
      diameter: 6,
      wireSpan: 35,
      depth: 3.5
    };
    setObstacles([...obstacles, newObs]);
    setExpandedId(id);
  };

  const handleUpdate = (id, field, val) => {
    setObstacles(obstacles.map((o) => (o.id === id ? { ...o, [field]: val } : o)));
  };

  const handleDelete = (id) => {
    setObstacles(obstacles.filter((o) => o.id !== id));
  };

  const handleToggle = (id) => {
    setObstacles(obstacles.map((o) => (o.id === id ? { ...o, enabled: !o.enabled } : o)));
  };

  // Boundary point helpers for Wall / Fence
  const handleAddBoundaryPoint = (obsId) => {
    setObstacles(
      obstacles.map((o) => {
        if (o.id !== obsId) return o;
        const currentPoints = o.boundaryPoints || [];
        const nextIdx = currentPoints.length + 1;
        const lastPt = currentPoints[currentPoints.length - 1];
        const newPt = {
          id: `bp-${Date.now()}-${nextIdx}`,
          name: `Mốc ${nextIdx}`,
          x: lastPt ? Math.round((lastPt.x + 8) * 10) / 10 : Math.round(tipX * 10) / 10,
          z: lastPt ? Math.round(lastPt.z * 10) / 10 : Math.round(tipZ * 10) / 10
        };
        return {
          ...o,
          boundaryPoints: [...currentPoints, newPt]
        };
      })
    );
  };

  const handleUpdateBoundaryPoint = (obsId, ptId, field, val) => {
    setObstacles(
      obstacles.map((o) => {
        if (o.id !== obsId) return o;
        return {
          ...o,
          boundaryPoints: (o.boundaryPoints || []).map((p) =>
            p.id === ptId ? { ...p, [field]: val } : p
          )
        };
      })
    );
  };

  const handleDeleteBoundaryPoint = (obsId, ptId) => {
    setObstacles(
      obstacles.map((o) => {
        if (o.id !== obsId) return o;
        if ((o.boundaryPoints || []).length <= 2) return o;
        return {
          ...o,
          boundaryPoints: (o.boundaryPoints || []).filter((p) => p.id !== ptId)
        };
      })
    );
  };

  const handleSetBoundaryPointToCrane = (obsId, ptId) => {
    setObstacles(
      obstacles.map((o) => {
        if (o.id !== obsId) return o;
        return {
          ...o,
          boundaryPoints: (o.boundaryPoints || []).map((p) =>
            p.id === ptId ? { ...p, x: Math.round(tipX * 10) / 10, z: Math.round(tipZ * 10) / 10 } : p
          )
        };
      })
    );
  };

  const handleApplyPresetCorners = (obsId, sizeX = 70, sizeZ = 60) => {
    const halfX = Math.round((sizeX * 0.5) * 10) / 10;
    const halfZ = Math.round((sizeZ * 0.5) * 10) / 10;
    setObstacles(
      obstacles.map((o) => {
        if (o.id !== obsId) return o;
        return {
          ...o,
          wallMode: 'points',
          isClosed: true,
          boundaryPoints: [
            { id: `bp-1-${Date.now()}`, name: `Mốc 1 (Trước-Trái)`, x: halfX, z: -halfZ },
            { id: `bp-2-${Date.now()}`, name: `Mốc 2 (Trước-Phải)`, x: halfX, z: halfZ },
            { id: `bp-3-${Date.now()}`, name: `Mốc 3 (Sau-Phải)`, x: -halfX, z: halfZ },
            { id: `bp-4-${Date.now()}`, name: `Mốc 4 (Sau-Trái)`, x: -halfX, z: -halfZ }
          ]
        };
      })
    );
  };

  const getPerimeter = (pts = [], isClosed = true) => {
    if (!pts || pts.length < 2) return 0;
    let sum = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      sum += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
    }
    if (isClosed && pts.length >= 3) {
      sum += Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z);
    }
    return Math.round(sum * 10) / 10;
  };

  const getIcon = (type) => {
    switch (type) {
      case 'wall':
        return <Fence size={16} className="text-cyan-400" />;
      case 'workshop':
        return <Factory size={16} className="text-emerald-400" />;
      case 'power_pole':
        return <Zap size={16} className="text-amber-400" />;
      case 'cylinder':
        return <Disc size={16} className="text-sky-400" />;
      case 'trench':
        return <Layers size={16} className="text-rose-400" />;
      default:
        return <Building2 size={16} className="text-indigo-400" />;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <Building2 className="text-amber-400" size={18} />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
            Công trình & Khối vật cản ({obstacles.length})
          </h2>
        </div>

        {/* Balanced Auto-Stretching Action Grid for Adding Obstacles */}
        <div className="grid grid-cols-5 gap-1.5">
          <button
            onClick={() => handleAddObstacle('wall')}
            className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 py-1.5 px-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap cursor-pointer hover:border-cyan-400/50"
            title="Thêm Hàng rào / Tường bao quanh công trường theo các điểm vây"
          >
            <Fence size={13} className="shrink-0" />
            <span className="truncate">Hàng rào</span>
          </button>
          <button
            onClick={() => handleAddObstacle('workshop')}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 py-1.5 px-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all whitespace-nowrap cursor-pointer hover:border-emerald-400/50"
            title="Thêm Nhà xưởng kết cấu thép tiền chế (2 mái)"
          >
            <Factory size={13} className="shrink-0" />
            <span className="truncate">Nhà xưởng</span>
          </button>
          <button
            onClick={() => handleAddObstacle('building')}
            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 py-1.5 px-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all whitespace-nowrap cursor-pointer hover:border-indigo-400/50"
            title="Thêm Tòa nhà văn phòng / Nhà điều hành"
          >
            <Building2 size={13} className="shrink-0" />
            <span className="truncate">Tòa nhà</span>
          </button>
          <button
            onClick={() => handleAddObstacle('power_pole')}
            className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 py-1.5 px-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all whitespace-nowrap cursor-pointer hover:border-amber-400/50"
            title="Thêm Trụ / Cột điện cao thế"
          >
            <Zap size={13} className="shrink-0" />
            <span className="truncate">Cột điện</span>
          </button>
          <button
            onClick={() => handleAddObstacle('cylinder')}
            className="bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 py-1.5 px-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all whitespace-nowrap cursor-pointer hover:border-sky-400/50"
            title="Thêm Bồn tròn / Silo chứa"
          >
            <Disc size={13} className="shrink-0" />
            <span className="truncate">Bồn bể</span>
          </button>
        </div>
      </div>

      {/* Global Real-Time Clearance Alert Card */}
      <div
        className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
          clearance.isPowerLineHazard
            ? 'bg-rose-950/50 border-rose-500 text-rose-200 animate-pulse'
            : clearance.isCollisionRisk
            ? 'bg-rose-950/40 border-rose-500/80 text-rose-200'
            : clearance.status === 'CAUTION'
            ? 'bg-amber-950/30 border-amber-500/70 text-amber-200'
            : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
        }`}
      >
        <div className="flex items-center justify-between font-bold">
          <span className="flex items-center gap-1.5">
            {clearance.isPowerLineHazard ? (
              <Zap size={16} className="text-rose-400 shrink-0" />
            ) : clearance.isCollisionRisk ? (
              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            ) : (
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            )}
            Cự ly gần nhất tới vật cản ({clearance.closestObstacle?.name || 'Hiện trường'}):
          </span>
          <span className="font-mono text-base font-black">
            {clearance.minDistance < 90 ? `${clearance.minDistance} m` : 'AN TOÀN'}
          </span>
        </div>
        <div className="text-[11px] opacity-90 italic">{clearance.message}</div>
      </div>

      {/* List of Obstacles */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {obstacles.map((obs) => {
          const isExp = expandedId === obs.id;
          return (
            <div
              key={obs.id}
              className={`rounded-xl border transition-all ${
                obs.enabled
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              {/* Item Header */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggle(obs.id)}
                    className="text-slate-400 hover:text-white transition-colors"
                    title={obs.enabled ? 'Ẩn vật cản' : 'Bật vật cản'}
                  >
                    {obs.enabled ? <Eye size={15} className="text-emerald-400" /> : <EyeOff size={15} />}
                  </button>
                  <div className="shrink-0">{getIcon(obs.type)}</div>
                  <input
                    type="text"
                    value={obs.name}
                    onChange={(e) => handleUpdate(obs.id, 'name', e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-100 focus:outline-none flex-1 truncate"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <select
                    value={obs.type}
                    onChange={(e) => handleUpdate(obs.id, 'type', e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none"
                  >
                    <option value="wall">Hàng rào vây (Fence)</option>
                    <option value="workshop">Nhà xưởng thép (2 mái)</option>
                    <option value="building">Tòa nhà / Khối hộp</option>
                    <option value="power_pole">Cột điện cao thế</option>
                    <option value="cylinder">Bồn tròn / Silo</option>
                    <option value="trench">Hố móng</option>
                  </select>

                  <button
                    onClick={() => setExpandedId(isExp ? null : obs.id)}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                  >
                    {isExp ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>

                  <button
                    onClick={() => handleDelete(obs.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800"
                    title="Xóa vật cản này"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded Property Controls */}
              {isExp && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 space-y-3 text-xs">
                  {/* Position Coordinates (X, Z, Rotation) - Only when not in multi-point wall mode */}
                  {!(obs.type === 'wall' && obs.wallMode !== 'single') && (
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Tọa độ vị trí & Góc xoay (Ấn Shift và lăn chuột):
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Tọa độ X:</span>
                          <WheelNumberInput
                            value={obs.posX || 0}
                            onChange={(v) => handleUpdate(obs.id, 'posX', v)}
                            min={-500}
                            max={500}
                            step={1}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Tọa độ Z:</span>
                          <WheelNumberInput
                            value={obs.posZ || 0}
                            onChange={(v) => handleUpdate(obs.id, 'posZ', v)}
                            min={-500}
                            max={500}
                            step={1}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Góc xoay Y:</span>
                          <WheelNumberInput
                            value={obs.rotationY || 0}
                            onChange={(v) => handleUpdate(obs.id, 'rotationY', Math.round(v))}
                            min={0}
                            max={360}
                            step={5}
                            wrapAround={true}
                            unit="°"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dimensions based on type */}
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Kích thước hình học 3D (m):
                    </div>

                    {obs.type === 'wall' ? (
                      <div className="space-y-3">
                        {/* Wall Mode Switcher */}
                        <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800 gap-2">
                          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 shrink-0">
                            <Fence size={14} className="text-cyan-400 shrink-0" /> Hình thức rào:
                          </span>
                          <div className="flex gap-1 text-[11px] flex-1 max-w-[240px]">
                            <button
                              type="button"
                              onClick={() => handleUpdate(obs.id, 'wallMode', 'points')}
                              className={`flex-1 text-center py-1 px-1.5 rounded font-medium transition-colors whitespace-nowrap cursor-pointer ${
                                obs.wallMode !== 'single'
                                  ? 'bg-cyan-600 text-white font-bold shadow'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                            >
                              Vây đa giác theo mốc
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdate(obs.id, 'wallMode', 'single')}
                              className={`flex-1 text-center py-1 px-1.5 rounded font-medium transition-colors whitespace-nowrap cursor-pointer ${
                                obs.wallMode === 'single'
                                  ? 'bg-cyan-600 text-white font-bold shadow'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                            >
                              Đoạn thẳng 1 cạnh
                            </button>
                          </div>
                        </div>

                        {/* Height & Thickness */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Chiều cao rào (H):</span>
                            <WheelNumberInput
                              value={obs.height || 2.8}
                              onChange={(v) => handleUpdate(obs.id, 'height', v)}
                              min={1}
                              max={10}
                              step={0.2}
                              unit="m"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-bold text-center font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Độ dày tôn/tường (T):</span>
                            <WheelNumberInput
                              value={obs.thickness || 0.25}
                              onChange={(v) => handleUpdate(obs.id, 'thickness', v)}
                              min={0.1}
                              max={1.0}
                              step={0.05}
                              unit="m"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                            />
                          </div>
                        </div>

                        {obs.wallMode === 'single' ? (
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Chiều dài đoạn rào (L):</span>
                            <WheelNumberInput
                              value={obs.length || 20}
                              onChange={(v) => handleUpdate(obs.id, 'length', v)}
                              min={2}
                              max={100}
                              step={1}
                              unit="m"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {/* Closed Loop & Perimeter Info */}
                            <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                              <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px] font-medium select-none">
                                <input
                                  type="checkbox"
                                  checked={obs.isClosed !== false}
                                  onChange={(e) => handleUpdate(obs.id, 'isClosed', e.target.checked)}
                                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                                />
                                Khép kín chu vi (nối mốc cuối về mốc 1)
                              </label>
                              <div className="text-[11px] font-mono text-cyan-300 font-bold">
                                Chu vi: {getPerimeter(obs.boundaryPoints, obs.isClosed !== false)}m
                              </div>
                            </div>

                            {/* Quick Presets & Add Point */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-medium">Vây nhanh:</span>
                              <button
                                type="button"
                                onClick={() => handleApplyPresetCorners(obs.id, 50, 44)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-[10px] border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                title="Tạo hình chữ nhật 50x44m vây gọn quanh bệ cẩu"
                              >
                                ⚡ 50×44m
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApplyPresetCorners(obs.id, 70, 60)}
                                className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold px-2 py-0.5 rounded text-[10px] border border-cyan-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                title="Tạo hình chữ nhật 70x60m bao trọn toàn bộ các hạng mục công trường"
                              >
                                ⚡ 70×60m (Chuẩn)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddBoundaryPoint(obs.id)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <Plus size={11} className="shrink-0" /> Mốc cọc
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPickingFencePoint &&
                                  setPickingFencePoint(
                                    pickingFencePoint?.mode === 'add' && pickingFencePoint?.obsId === obs.id
                                      ? null
                                      : { obsId: obs.id, mode: 'add' }
                                  )
                                }
                                className={`ml-auto px-2.5 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                                  pickingFencePoint?.mode === 'add' && pickingFencePoint?.obsId === obs.id
                                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 animate-pulse shadow-md'
                                    : 'bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border-cyan-500/40'
                                }`}
                                title="Bật chế độ nhấp chuột trực tiếp trên 3D: Mỗi lần click trên mặt đất sẽ tạo thêm 1 cọc mốc mới"
                              >
                                <MousePointerClick size={12} className="shrink-0" />
                                <span>
                                  {pickingFencePoint?.mode === 'add' && pickingFencePoint?.obsId === obs.id
                                    ? 'Đang chấm 3D...'
                                    : '🖱️ Chấm mốc 3D'}
                                </span>
                              </button>
                            </div>

                            {/* Boundary Points List */}
                            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                              {(obs.boundaryPoints || []).map((pt, idx) => (
                                <div
                                  key={pt.id || idx}
                                  className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-xs transition-colors ${
                                    pickingFencePoint?.pointId === pt.id
                                      ? 'bg-cyan-950/70 border-cyan-400 ring-1 ring-cyan-400'
                                      : 'bg-slate-900/90 border-slate-800'
                                  }`}
                                >
                                  <span className="w-5 h-5 rounded-full bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={pt.name || `Mốc ${idx + 1}`}
                                    onChange={(e) => handleUpdateBoundaryPoint(obs.id, pt.id, 'name', e.target.value)}
                                    className="bg-transparent text-[11px] text-slate-300 font-medium w-28 truncate focus:outline-none"
                                  />
                                  <div className="flex items-center gap-1 flex-1">
                                    <span className="text-[10px] text-slate-500 font-mono">X:</span>
                                    <WheelNumberInput
                                      value={pt.x || 0}
                                      onChange={(v) => handleUpdateBoundaryPoint(obs.id, pt.id, 'x', v)}
                                      min={-500}
                                      max={500}
                                      step={0.5}
                                      unit="m"
                                      className="w-16 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-slate-200 text-center font-mono"
                                    />
                                    <span className="text-[10px] text-slate-500 font-mono ml-1">Z:</span>
                                    <WheelNumberInput
                                      value={pt.z || 0}
                                      onChange={(v) => handleUpdateBoundaryPoint(obs.id, pt.id, 'z', v)}
                                      min={-500}
                                      max={500}
                                      step={0.5}
                                      unit="m"
                                      className="w-16 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-slate-200 text-center font-mono"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPickingFencePoint &&
                                      setPickingFencePoint(
                                        pickingFencePoint?.pointId === pt.id ? null : { obsId: obs.id, pointId: pt.id }
                                      )
                                    }
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 border transition-all flex items-center gap-1 ${
                                      pickingFencePoint?.pointId === pt.id
                                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 animate-pulse shadow-md'
                                        : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border-slate-700'
                                    }`}
                                    title={`Nhấp vào đây rồi click chuột trực tiếp trên mặt đất 3D để định vị lại mốc ${idx + 1}`}
                                  >
                                    <MousePointerClick size={11} />
                                    {pickingFencePoint?.pointId === pt.id ? 'Đang pick...' : 'Pick chuột'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBoundaryPoint(obs.id, pt.id)}
                                    disabled={(obs.boundaryPoints || []).length <= 2}
                                    className="text-slate-500 hover:text-rose-400 disabled:opacity-20 disabled:hover:text-slate-500 p-1 rounded"
                                    title="Xóa mốc này"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : obs.type === 'cylinder' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Đường kính (Ø):</span>
                          <WheelNumberInput
                            value={obs.diameter || 6}
                            onChange={(v) => handleUpdate(obs.id, 'diameter', v)}
                            min={1}
                            max={50}
                            step={0.5}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Chiều cao (H):</span>
                          <WheelNumberInput
                            value={obs.height || 12}
                            onChange={(v) => handleUpdate(obs.id, 'height', v)}
                            min={1}
                            max={80}
                            step={0.5}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                      </div>
                    ) : obs.type === 'power_pole' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Chiều cao trụ:</span>
                          <WheelNumberInput
                            value={obs.height || 18}
                            onChange={(v) => handleUpdate(obs.id, 'height', v)}
                            min={5}
                            max={60}
                            step={1}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Rộng xà sứ:</span>
                          <WheelNumberInput
                            value={obs.width || 8}
                            onChange={(v) => handleUpdate(obs.id, 'width', v)}
                            min={2}
                            max={20}
                            step={0.5}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Nhịp dây cáp:</span>
                          <WheelNumberInput
                            value={obs.wireSpan || 35}
                            onChange={(v) => handleUpdate(obs.id, 'wireSpan', v)}
                            min={10}
                            max={100}
                            step={5}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                      </div>
                    ) : obs.type === 'trench' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Rộng miệng (W):</span>
                          <WheelNumberInput
                            value={obs.width || 6}
                            onChange={(v) => handleUpdate(obs.id, 'width', v)}
                            min={1}
                            max={30}
                            step={0.5}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Dài hố (L):</span>
                          <WheelNumberInput
                            value={obs.length || 8}
                            onChange={(v) => handleUpdate(obs.id, 'length', v)}
                            min={1}
                            max={50}
                            step={0.5}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Độ sâu (Depth):</span>
                          <WheelNumberInput
                            value={obs.depth || 3.5}
                            onChange={(v) => handleUpdate(obs.id, 'depth', v)}
                            min={0.5}
                            max={20}
                            step={0.5}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                      </div>
                    ) : obs.type === 'workshop' ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Khẩu độ (W):</span>
                            <WheelNumberInput
                              value={obs.width || 18}
                              onChange={(v) => handleUpdate(obs.id, 'width', v)}
                              min={6}
                              max={80}
                              step={1}
                              unit="m"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Chiều dài (L):</span>
                            <WheelNumberInput
                              value={obs.length || 30}
                              onChange={(v) => handleUpdate(obs.id, 'length', v)}
                              min={10}
                              max={150}
                              step={2}
                              unit="m"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Cao cột (H):</span>
                            <WheelNumberInput
                              value={obs.height || 8.5}
                              onChange={(v) => handleUpdate(obs.id, 'height', v)}
                              min={4}
                              max={30}
                              step={0.5}
                              unit="m"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Độ dốc mái:</span>
                            <WheelNumberInput
                              value={obs.roofPitch || 2.5}
                              onChange={(v) => handleUpdate(obs.id, 'roofPitch', v)}
                              min={0.5}
                              max={10}
                              step={0.5}
                              unit="m"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-bold text-center font-mono"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono bg-slate-900/60 px-2 py-1 rounded">
                          <span>Cao độ giọt gianh: <b className="text-slate-200">{(obs.height || 8.5).toFixed(1)}m</b></span>
                          <span>Đỉnh nóc (Ridge): <b className="text-emerald-400">{((obs.height || 8.5) + (obs.roofPitch || 2.5)).toFixed(1)}m</b></span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Rộng (W):</span>
                          <WheelNumberInput
                            value={obs.width || 8}
                            onChange={(v) => handleUpdate(obs.id, 'width', v)}
                            min={1}
                            max={60}
                            step={0.5}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Dài (L):</span>
                          <WheelNumberInput
                            value={obs.length || 10}
                            onChange={(v) => handleUpdate(obs.id, 'length', v)}
                            min={1}
                            max={80}
                            step={0.5}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Cao (H):</span>
                          <WheelNumberInput
                            value={obs.height || 15}
                            onChange={(v) => handleUpdate(obs.id, 'height', v)}
                            min={1}
                            max={100}
                            step={0.5}
                            unit="m"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
