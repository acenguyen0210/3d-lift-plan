import React from 'react';
import { Truck, Sliders, Shield, PlusCircle, RotateCw, ArrowUpRight, Anchor, Cpu, Compass } from 'lucide-react';
import WheelNumberInput from './WheelNumberInput';

export default function CraneSelector({
  cranes,
  selectedCrane,
  setSelectedCrane,
  boomLength,
  setBoomLength,
  workingRadius,
  setWorkingRadius,
  slewAngle,
  setSlewAngle,
  craneHeading = 0,
  setCraneHeading,
  boomAngle,
  tipHeight = 20,
  loadElevation = 1.5,
  setLoadElevation,
  counterweight,
  setCounterweight,
  outriggerRatio,
  setOutriggerRatio,
  partsOfLine,
  setPartsOfLine,
  onOpenCustomCraneModal
}) {
  const specs = selectedCrane.specs;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header & Crane Dropdown */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Truck className="text-sky-400 shrink-0" size={16} />
          <h2 className="text-xs xl:text-sm font-bold text-slate-100 uppercase tracking-tight whitespace-nowrap">Cấu hình Cần cẩu</h2>
        </div>
        <button
          onClick={onOpenCustomCraneModal}
          className="text-[11px] xl:text-xs shrink-0 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 px-2 py-0.5 xl:px-2.5 xl:py-1 rounded-md font-medium transition-all flex items-center gap-1"
          title="Thêm loại cẩu hoặc nhập bảng tải từ bên ngoài"
        >
          <PlusCircle size={13} />
          <span className="hidden xl:inline">Thêm cẩu ngoài</span>
          <span className="xl:hidden">+ Cẩu ngoài</span>
        </button>
      </div>

      {/* Model Selector */}
      <div>
        <label className="text-xs text-slate-400 block mb-1.5 font-medium">Model Thiết bị cẩu:</label>
        <select
          value={selectedCrane.id}
          onChange={(e) => {
            const found = cranes.find((c) => c.id === e.target.value);
            if (found) {
              setSelectedCrane(found);
              setBoomLength(found.specs.minBoomLength);
              setCounterweight(found.specs.defaultCounterweight !== undefined ? found.specs.defaultCounterweight : (found.specs.counterweightOptions?.[0] ?? 0));
              setOutriggerRatio(1.0);
              if (setPartsOfLine) {
                const maxParts = found.specs.maxPartsOfLine || 8;
                setPartsOfLine((prev) => Math.min(prev || 4, maxParts));
              }
            }
          }}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-semibold focus:outline-none focus:border-sky-500 transition-colors"
        >
          {cranes.filter((c) => c.type === 'truck').length > 0 && (
            <optgroup label="🚛 CẨU THÙNG TỰ HÀNH (TRUCK CRANES)">
              {cranes.filter((c) => c.type === 'truck').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.manufacturer}) - {c.specs.tareWeight}t
                </option>
              ))}
            </optgroup>
          )}
          {cranes.filter((c) => !c.type || c.type === 'mobile' || c.type === 'rough_terrain').length > 0 && (
            <optgroup label="🏗️ CẨU BÁNH LỐP (MOBILE CRANES)">
              {cranes.filter((c) => !c.type || c.type === 'mobile' || c.type === 'rough_terrain').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.manufacturer}) - {c.specs.tareWeight}t
                </option>
              ))}
            </optgroup>
          )}
          {cranes.filter((c) => c.type === 'crawler').length > 0 && (
            <optgroup label="🚜 CẨU BÁNH XÍCH (CRAWLER CRANES)">
              {cranes.filter((c) => c.type === 'crawler').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.manufacturer}) - {c.specs.tareWeight}t
                </option>
              ))}
            </optgroup>
          )}
          {cranes.filter((c) => c.type === 'tower').length > 0 && (
            <optgroup label="🗼 CẨU THÁP (TOWER CRANES)">
              {cranes.filter((c) => c.type === 'tower').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.manufacturer}) - {c.specs.tareWeight}t
                </option>
              ))}
            </optgroup>
          )}
          {cranes.filter((c) => !['truck', 'mobile', 'rough_terrain', 'crawler', 'tower'].includes(c.type)).length > 0 && (
            <optgroup label="⚙️ MODEL CẨU TỰ TẠO">
              {cranes.filter((c) => !['truck', 'mobile', 'rough_terrain', 'crawler', 'tower'].includes(c.type)).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.manufacturer}) - {c.specs.tareWeight}t
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <div className="text-[11px] text-slate-500 mt-1 italic">{selectedCrane.description}</div>
      </div>

      {/* Counterweight & Outrigger Spread */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Đối trọng (Counterweight):</label>
          {specs.hasCounterweight === false || (!specs.counterweightOptions || (specs.counterweightOptions.length === 1 && specs.counterweightOptions[0] === 0)) ? (
            <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between text-slate-400 h-[34px]">
              <span className="italic text-[11px] text-slate-500">Không có đối trọng</span>
              <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px]">0 Tấn</span>
            </div>
          ) : specs.counterweightOptions?.length === 1 ? (
            <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between text-slate-300 h-[34px]">
              <span className="italic text-[11px] text-slate-400">Đối trọng cố định</span>
              <span className="font-mono text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">{counterweight} Tấn</span>
            </div>
          ) : (
            <select
              value={counterweight}
              onChange={(e) => setCounterweight(parseFloat(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 h-[34px]"
            >
              {specs.counterweightOptions?.map((cw) => (
                <option key={cw} value={cw}>
                  {cw} Tấn
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Độ mở chân chống (Outriggers):</label>
          <select
            value={outriggerRatio}
            onChange={(e) => setOutriggerRatio(parseFloat(e.target.value))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 h-[34px]"
          >
            {specs.outriggerSpreads?.map((sp) => (
              <option key={sp.ratio} value={sp.ratio}>
                {sp.label}
              </option>
            )) || <option value={1.0}>100% Tiêu chuẩn</option>}
          </select>
        </div>
      </div>

      {/* Parts of Line (Số nhánh cáp cẩu) */}
      <div className="grid grid-cols-2 gap-3 items-center pt-1 border-t border-slate-800/80">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Số nhánh cáp cẩu (Parts):</label>
          <select
            value={partsOfLine}
            onChange={(e) => setPartsOfLine(parseInt(e.target.value, 10))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 h-[34px]"
          >
            {[1, 2, 4, 6, 8, 10, 12, 14, 16]
              .filter((n) => n <= (specs.maxPartsOfLine || 16))
              .map((n) => (
                <option key={n} value={n}>
                  {n} Nhánh (Max: {(n * (specs.ropeCapacityPerLine || 4.8)).toFixed(1)}t)
                </option>
              ))}
          </select>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-0.5">
          <div className="flex justify-between">
            <span>Sức kéo 1 nhánh:</span>
            <span className="text-slate-200 font-mono font-bold">{specs.ropeCapacityPerLine || 4.8}t</span>
          </div>
          <div className="flex justify-between">
            <span>Móc cẩu cơ sở:</span>
            <span className="text-slate-200 font-mono font-bold">{specs.defaultHookWeight || 0.45}t</span>
          </div>
          <div className="flex justify-between border-t border-slate-800/60 pt-0.5 text-[10px]">
            <span className="text-sky-400">Tổng giới hạn tời cáp:</span>
            <span className="text-sky-300 font-mono font-bold">{(partsOfLine * (specs.ropeCapacityPerLine || 4.8)).toFixed(1)}t</span>
          </div>
        </div>
      </div>

      {/* Boom Length Slider */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-medium">Chiều dài cần chính (Boom Length):</span>
          <div className="flex items-center gap-1.5">
            <WheelNumberInput
              min={specs.minBoomLength}
              max={specs.maxBoomLength}
              step={0.5}
              value={boomLength}
              onChange={(val) => setBoomLength(Math.max(specs.minBoomLength, Math.min(specs.maxBoomLength, val)))}
              unit="m"
              className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-emerald-400 font-mono font-bold text-left focus:border-emerald-500 pr-5"
            />
          </div>
        </div>
        <input
          type="range"
          min={specs.minBoomLength}
          max={specs.maxBoomLength}
          step={0.5}
          value={boomLength}
          onChange={(e) => setBoomLength(parseFloat(e.target.value))}
          className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>Min: {specs.minBoomLength}m</span>
          <span>Max: {specs.maxBoomLength}m</span>
        </div>
      </div>

      {/* Working Radius Slider & Direct Input */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-medium">Bán kính làm việc (Working Radius):</span>
          <div className="flex items-center gap-1.5">
            <WheelNumberInput
              min={3.0}
              max={boomLength}
              step={0.5}
              value={workingRadius}
              onChange={(val) => setWorkingRadius(Math.max(2.5, Math.min(boomLength, val)))}
              unit="m"
              className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-sky-400 font-mono font-bold text-left focus:border-sky-500 pr-5"
            />
          </div>
        </div>
        <input
          type="range"
          min={3.0}
          max={Math.min(specs.maxBoomLength, boomLength)}
          step={0.2}
          value={workingRadius}
          onChange={(e) => setWorkingRadius(parseFloat(e.target.value))}
          className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>Góc nghiêng cần: <span className="text-amber-400 font-bold">{boomAngle.toFixed(1)}°</span></span>
          <span>Tầm với max: {boomLength.toFixed(1)}m</span>
        </div>
      </div>

      {/* Slewing Angle Slider */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-medium">Góc quay toa (Slewing Angle):</span>
          <div className="flex items-center gap-1.5">
            <WheelNumberInput
              min={0}
              max={360}
              step={1}
              value={slewAngle}
              wrapAround={true}
              onChange={(val) => setSlewAngle(Math.round(val))}
              unit="°"
              className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-400 font-mono font-bold text-left focus:border-amber-500 pr-5"
            />
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={slewAngle}
          onChange={(e) => setSlewAngle(parseFloat(e.target.value))}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1 : -1;
            let next = Math.round(slewAngle) + delta;
            if (next < 0) next = 360;
            else if (next > 360) next = 0;
            setSlewAngle(next);
          }}
          className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0° (Thẳng trước)</span>
          <span>90° (Mạn phải)</span>
          <span>180° (Đuôi cẩu)</span>
          <span>270° (Mạn trái)</span>
        </div>
      </div>

      {/* Crane Orientation / Heading (Hướng đỗ xe cẩu & chân chống) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Compass className="text-cyan-400" size={14} />
            <span>Hướng đỗ xe cẩu (Crane Orientation):</span>
          </span>
          <div className="flex items-center gap-1.5">
            <WheelNumberInput
              min={0}
              max={360}
              step={5}
              value={craneHeading}
              wrapAround={true}
              onChange={(val) => setCraneHeading && setCraneHeading(Math.round(val))}
              unit="°"
              className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-cyan-400 font-mono font-bold text-left focus:border-cyan-500 pr-5"
            />
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={craneHeading}
          onChange={(e) => setCraneHeading && setCraneHeading(parseFloat(e.target.value))}
          className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0° (Dọc trục X)</span>
          <span>90° (Dọc trục Z)</span>
          <span>180° (Ngược X)</span>
          <span>270° (Ngược Z)</span>
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          {[0, 45, 90, 135, 180, 270].map((deg) => (
            <button
              key={deg}
              type="button"
              onClick={() => setCraneHeading && setCraneHeading(deg)}
              className={`flex-1 text-[10px] font-mono py-0.5 rounded border transition-colors ${
                craneHeading === deg
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      {/* Lift Height / Load Elevation Slider */}
      {setLoadElevation && (
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium">Cao độ nâng tải (Lift Elevation):</span>
            <div className="flex items-center gap-1.5">
              <WheelNumberInput
                min={0.2}
                max={Math.max(10, tipHeight - 3)}
                step={0.5}
                value={loadElevation}
                onChange={(val) => setLoadElevation(Math.max(0.2, val))}
                unit="m"
                className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-rose-400 font-mono font-bold text-left focus:border-rose-500 pr-5"
              />
            </div>
          </div>
          <input
            type="range"
            min={0.2}
            max={Math.max(10, (tipHeight || 20) - 3)}
            step={0.2}
            value={loadElevation}
            onChange={(e) => setLoadElevation(parseFloat(e.target.value))}
            className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.2m (Mặt đất)</span>
            <span>Đỉnh cần cẩu: {(tipHeight || 20).toFixed(1)}m</span>
          </div>
        </div>
      )}
    </div>
  );
}

