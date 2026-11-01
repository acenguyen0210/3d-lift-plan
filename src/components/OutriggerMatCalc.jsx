import React from 'react';
import { Layers, ShieldCheck, AlertOctagon, AlertTriangle, Compass, CheckCircle2 } from 'lucide-react';
import { SOIL_BEARING_CAPACITIES } from '../data/soilTypes';
import { calculateGroundBearingPressure } from '../utils/craneMath';

export default function OutriggerMatCalc({
  outriggerReactions,
  matLength,
  setMatLength,
  matWidth,
  setMatWidth,
  selectedSoilId,
  setSelectedSoilId,
  customSoilCapacity,
  setCustomSoilCapacity
}) {
  const selectedSoil = SOIL_BEARING_CAPACITIES.find((s) => s.id === selectedSoilId) || SOIL_BEARING_CAPACITIES[3];
  const allowableCapacity =
    selectedSoilId === 'custom' ? customSoilCapacity : selectedSoil.capacityTonsPerM2;

  const gbpResult = calculateGroundBearingPressure({
    maxReactionTons: outriggerReactions.maxReaction || 10,
    matLength,
    matWidth,
    allowableSoilCapacityTonsPerM2: allowableCapacity
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="text-emerald-400" size={18} />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Áp lực chân chống & Tấm lót (GBP)</h2>
        </div>
        <div
          className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
            gbpResult.isSafe
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
          }`}
        >
          {gbpResult.isSafe ? 'NỀN ĐẤT ĐẠT' : 'NGUY HIỂM: LÚN SỤT'}
        </div>
      </div>

      {/* 4-Quadrant Reaction Diagram */}
      <div>
        <div className="text-xs text-slate-400 mb-2 font-medium flex justify-between items-center">
          <span>Phản lực chân chống (Outrigger Reactions):</span>
          <span className="text-[11px] text-slate-500 font-mono">
            Tổng tải trọng: <b className="text-slate-300">{outriggerReactions.totalWeight}t</b>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-center">
          {/* FL (Front-Left) */}
          <div
            className={`p-2.5 rounded-md border transition-all ${
              outriggerReactions.maxReactionLeg?.startsWith('FL')
                ? 'bg-rose-950/40 border-rose-500/80 text-rose-200 shadow-sm'
                : 'bg-slate-900/70 border-slate-800 text-slate-300'
            }`}
          >
            <div className="text-[10px] text-slate-400 font-sans">TRƯỚC - TRÁI (FL)</div>
            <div className="text-base font-bold text-sky-400">{outriggerReactions.FL.toFixed(1)} t</div>
            <div className="text-[10px] text-slate-500">{(outriggerReactions.FL * 9.81).toFixed(0)} kN</div>
          </div>

          {/* FR (Front-Right) */}
          <div
            className={`p-2.5 rounded-md border transition-all ${
              outriggerReactions.maxReactionLeg?.startsWith('FR')
                ? 'bg-rose-950/40 border-rose-500/80 text-rose-200 shadow-sm'
                : 'bg-slate-900/70 border-slate-800 text-slate-300'
            }`}
          >
            <div className="text-[10px] text-slate-400 font-sans">TRƯỚC - PHẢI (FR)</div>
            <div className="text-base font-bold text-sky-400">{outriggerReactions.FR.toFixed(1)} t</div>
            <div className="text-[10px] text-slate-500">{(outriggerReactions.FR * 9.81).toFixed(0)} kN</div>
          </div>

          {/* RL (Rear-Left) */}
          <div
            className={`p-2.5 rounded-md border transition-all ${
              outriggerReactions.maxReactionLeg?.startsWith('RL')
                ? 'bg-rose-950/40 border-rose-500/80 text-rose-200 shadow-sm'
                : 'bg-slate-900/70 border-slate-800 text-slate-300'
            }`}
          >
            <div className="text-[10px] text-slate-400 font-sans">SAU - TRÁI (RL)</div>
            <div className="text-base font-bold text-sky-400">{outriggerReactions.RL.toFixed(1)} t</div>
            <div className="text-[10px] text-slate-500">{(outriggerReactions.RL * 9.81).toFixed(0)} kN</div>
          </div>

          {/* RR (Rear-Right) */}
          <div
            className={`p-2.5 rounded-md border transition-all ${
              outriggerReactions.maxReactionLeg?.startsWith('RR')
                ? 'bg-rose-950/40 border-rose-500/80 text-rose-200 shadow-sm'
                : 'bg-slate-900/70 border-slate-800 text-slate-300'
            }`}
          >
            <div className="text-[10px] text-slate-400 font-sans">SAU - PHẢI (RR)</div>
            <div className="text-base font-bold text-sky-400">{outriggerReactions.RR.toFixed(1)} t</div>
            <div className="text-[10px] text-slate-500">{(outriggerReactions.RR * 9.81).toFixed(0)} kN</div>
          </div>
        </div>

        <div className="mt-1.5 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Chân chịu lực max: <b className="text-rose-400">{outriggerReactions.maxReactionLeg}</b></span>
          <span className="font-mono font-bold text-rose-300">{outriggerReactions.maxReaction} Tấn</span>
        </div>
      </div>

      {/* Soil Type Selection */}
      <div className="border-t border-slate-800/80 pt-3 space-y-2">
        <label className="text-xs text-slate-400 block font-medium">Địa chất nền bãi thi công (Soil Type):</label>
        <select
          value={selectedSoilId}
          onChange={(e) => setSelectedSoilId(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          {SOIL_BEARING_CAPACITIES.map((soil) => (
            <option key={soil.id} value={soil.id}>
              {soil.name} ({soil.capacityTonsPerM2} t/m² ~ {soil.capacityKPa} kPa)
            </option>
          ))}
        </select>

        {selectedSoilId === 'custom' && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-400">Sức chịu tải cho phép:</span>
            <input
              type="number"
              min={1}
              max={200}
              value={customSoilCapacity}
              onChange={(e) => setCustomSoilCapacity(parseFloat(e.target.value) || 10)}
              className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono text-center"
            />
            <span className="text-xs text-slate-400 font-mono">t/m²</span>
          </div>
        )}
      </div>

      {/* Crane Mat Sizing */}
      <div className="border-t border-slate-800/80 pt-3 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-medium">Kích thước tấm lót chân chống (Outrigger Mat):</span>
          <span className="font-mono text-emerald-400 font-bold">
            {matLength}m x {matWidth}m ({gbpResult.matArea} m²)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Chiều dài tấm lót (L):</label>
            <input
              type="number"
              step={0.2}
              min={0.5}
              max={6.0}
              value={matLength}
              onChange={(e) => setMatLength(Math.max(0.5, parseFloat(e.target.value) || 1))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 text-center font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Chiều rộng tấm lót (W):</label>
            <input
              type="number"
              step={0.2}
              min={0.5}
              max={6.0}
              value={matWidth}
              onChange={(e) => setMatWidth(Math.max(0.5, parseFloat(e.target.value) || 1))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 text-center font-mono"
            />
          </div>
        </div>
      </div>

      {/* Ground Bearing Pressure Assessment Card */}
      <div
        className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
          gbpResult.isSafe
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
            : 'bg-rose-950/30 border-rose-500/60 text-rose-200'
        }`}
      >
        <div className="flex items-center justify-between font-bold">
          <span className="flex items-center gap-1.5">
            {gbpResult.isSafe ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertOctagon size={16} className="text-rose-400" />}
            {gbpResult.isSafe ? 'KẾT LUẬN NỀN BÃI: AN TOÀN' : 'CẢNH BÁO NGUY HIỂM NỀN YẾU'}
          </span>
          <span className="font-mono">{gbpResult.ratio}% Cho phép</span>
        </div>

        <div className="flex justify-between text-[11px] text-slate-300 font-mono">
          <span>Áp lực thực tế tác dụng (P):</span>
          <b>{gbpResult.actualPressure} t/m² ({gbpResult.actualPressureKPa} kPa)</b>
        </div>

        <div className="flex justify-between text-[11px] text-slate-300 font-mono">
          <span>Sức chịu tải cho phép của đất (Qa):</span>
          <b>{gbpResult.allowableSoilCapacityTonsPerM2} t/m² ({gbpResult.allowablePressureKPa} kPa)</b>
        </div>

        <div className="flex justify-between text-[11px] text-slate-300 font-mono">
          <span>Kích thước tấm lót kiến nghị:</span>
          <b className="text-sky-300">Tối thiểu {gbpResult.recommendedMatDim} (≥ {gbpResult.requiredMatArea} m²)</b>
        </div>

        <div className="pt-1 text-[11px] opacity-90 border-t border-slate-700/50 italic">
          {gbpResult.message}
        </div>
      </div>
    </div>
  );
}

