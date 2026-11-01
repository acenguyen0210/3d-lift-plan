import React from 'react';
import { Package, ShieldAlert, AlertTriangle, Layers, Disc, Scale, HelpCircle } from 'lucide-react';
import WheelNumberInput from './WheelNumberInput';
import { calculateSlingTension } from '../utils/craneMath';

export default function LoadConfigurator({
  loadConfig,
  setLoadConfig,
  loadRotation = 0,
  setLoadRotation,
  riggingConfig,
  setRiggingConfig,
  grossLoad,
  netLoad,
  totalRiggingWeight,
  hookWeight
}) {
  const halfSpan = Math.hypot(
    (loadConfig.dims?.l || 4) / 2,
    (loadConfig.dims?.w || 2.4) / 2
  );
  const currentAngle = riggingConfig.slingAngleDeg || 60;
  const slingAngleRad = (currentAngle * Math.PI) / 180;
  const calculatedSlingLength = halfSpan / Math.cos(slingAngleRad);
  const slingApexHeight = halfSpan * Math.tan(slingAngleRad);

  const slingCalc = calculateSlingTension(
    grossLoad,
    riggingConfig.slingLegs || 4,
    currentAngle
  );

  const handleSlingLengthChange = (newLen) => {
    // Clamp so length is greater than halfSpan
    const clampedLen = Math.max(halfSpan + 0.1, newLen);
    const cosVal = Math.min(0.99, halfSpan / clampedLen);
    const newAngleDeg = Math.round((Math.acos(cosVal) * 180) / Math.PI);
    setRiggingConfig({
      ...riggingConfig,
      slingAngleDeg: Math.max(15, Math.min(85, newAngleDeg))
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Package className="text-amber-400" size={18} />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Tải trọng & Thiết bị chằng buộc</h2>
        </div>
        <div className="text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
          Tổng tải: {grossLoad.toFixed(2)} tấn
        </div>
      </div>

      {/* Net Load Input & Shape */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1 font-medium">Khối lượng vật nâng (Net Load):</label>
          <WheelNumberInput
            step={0.5}
            min={0.1}
            max={500}
            value={loadConfig.netWeight}
            onChange={(val) => setLoadConfig({ ...loadConfig, netWeight: Math.max(0.1, val) })}
            unit="Tấn"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold focus:border-amber-500 pr-12"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1 font-medium">Hình dạng hình học 3D:</label>
          <select
            value={loadConfig.type}
            onChange={(e) => setLoadConfig({ ...loadConfig, type: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="box">Khối hộp / Container / Máy móc</option>
            <option value="tank">Bồn trụ nằm ngang (Horizontal Tank)</option>
            <option value="vessel">Bình áp lực chỏm cầu (Pressure Vessel)</option>
            <option value="cylinder">Ống thép công nghiệp (Pipe Spool)</option>
          </select>
        </div>
      </div>

      {/* Load Dimensions (Length, Width, Height) */}
      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2">
        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Kích thước vật thể (m):</div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-[10px] text-slate-400 block">Dài (L):</span>
            <WheelNumberInput
              step={0.5}
              min={0.5}
              max={50}
              value={loadConfig.dims.l}
              onChange={(val) => setLoadConfig({ ...loadConfig, dims: { ...loadConfig.dims, l: val } })}
              unit="m"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono pr-5"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Rộng (W / Ø):</span>
            <WheelNumberInput
              step={0.5}
              min={0.5}
              max={30}
              value={loadConfig.dims.w}
              onChange={(val) => setLoadConfig({ ...loadConfig, dims: { ...loadConfig.dims, w: val } })}
              unit="m"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono pr-5"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Cao (H):</span>
            <WheelNumberInput
              step={0.5}
              min={0.5}
              max={30}
              value={loadConfig.dims.h}
              onChange={(val) => setLoadConfig({ ...loadConfig, dims: { ...loadConfig.dims, h: val } })}
              unit="m"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 text-center font-mono pr-5"
            />
          </div>
        </div>
      </div>

      {/* Rigging Equipment Specs */}
      <div className="border-t border-slate-800/80 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Layers size={14} className="text-sky-400" /> Thiết bị nâng & Dây chằng (Rigging)
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Phụ kiện: <b className="text-slate-200">{totalRiggingWeight.toFixed(2)}t</b>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Loại cáp cẩu (Sling Type):</label>
            <select
              value={riggingConfig.slingType}
              onChange={(e) => setRiggingConfig({ ...riggingConfig, slingType: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="wire_rope">Cáp thép (Steel Wire Rope)</option>
              <option value="synthetic">Cáp vải cẩu hàng (Synthetic Webbing)</option>
              <option value="chain">Xích cẩu hợp kim (Alloy Chain G80/G100)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Số nhánh cáp cẩu:</label>
            <select
              value={riggingConfig.slingLegs}
              onChange={(e) => setRiggingConfig({ ...riggingConfig, slingLegs: parseInt(e.target.value, 10) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value={1}>1 Nhánh (Đơn)</option>
              <option value={2}>2 Nhánh (Cặp)</option>
              <option value={4}>4 Nhánh (Tiêu chuẩn 4 góc)</option>
            </select>
          </div>
        </div>

        {/* Cable Angle & Length with Mouse Wheel */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-slate-400 font-medium">Góc nghiêng cáp (α):</label>
              <WheelNumberInput
                min={15}
                max={85}
                step={1}
                value={currentAngle}
                onChange={(val) => setRiggingConfig({ ...riggingConfig, slingAngleDeg: Math.max(15, Math.min(85, val)) })}
                unit="°"
                className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-amber-400 font-mono font-bold text-left focus:border-amber-500 pr-4"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {[60, 45, 30].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setRiggingConfig({ ...riggingConfig, slingAngleDeg: deg })}
                  className={`flex-1 py-1 rounded text-[11px] font-mono font-semibold border transition-all ${
                    currentAngle === deg
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-slate-400 font-medium">Chiều dài nhánh cáp:</label>
              <WheelNumberInput
                min={halfSpan + 0.1}
                max={50}
                step={0.2}
                value={parseFloat(calculatedSlingLength.toFixed(2))}
                onChange={handleSlingLengthChange}
                unit="m"
                className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-sky-400 font-mono font-bold text-left focus:border-sky-500 pr-5"
              />
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Độ cao đỉnh tam giác cáp: <span className="text-slate-300 font-bold">{slingApexHeight.toFixed(2)}m</span>
            </div>
          </div>
        </div>

        {/* Rigging Weight & Spreader Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Cáp & Ma-nê (Rigging Weight):</label>
            <WheelNumberInput
              step={0.05}
              min={0}
              max={10}
              value={riggingConfig.slingWeight || 0.1}
              onChange={(val) => setRiggingConfig({ ...riggingConfig, slingWeight: Math.max(0, val) })}
              unit="t"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-sky-500 pr-6"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Xà cẩu / Đòn gánh (Spreader):</label>
            <WheelNumberInput
              step={0.1}
              min={0}
              max={25}
              value={riggingConfig.spreaderWeight || 0}
              onChange={(val) => setRiggingConfig({ ...riggingConfig, spreaderWeight: Math.max(0, val) })}
              unit="t"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-sky-500 pr-6"
            />
          </div>
        </div>

        {/* Sling Tension Analysis */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Hệ số góc kẹp (1/sin α):</span>
            <span className="font-mono text-slate-200 font-bold">{slingCalc.loadFactor}x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Lực căng tính toán mỗi nhánh:</span>
            <span className="font-mono text-amber-400 font-bold">{slingCalc.tensionPerLeg} tấn / nhánh</span>
          </div>
          {slingCalc.warning && (
            <div className="mt-1 text-[11px] text-amber-400 flex items-start gap-1">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>{slingCalc.warning}</span>
            </div>
          )}
        </div>
      </div>

      {/* Gross Load Summary Breakdown Table */}
      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide border-b border-slate-800 pb-1">
          Bảng cộng dồn Tổng tải trọng nâng (Gross Load)
        </div>
        <div className="flex justify-between text-slate-400 text-[11px]">
          <span>+ Tải trọng vật thể (Net Weight):</span>
          <span className="font-mono text-slate-200">{loadConfig.netWeight.toFixed(2)} t</span>
        </div>
        <div className="flex justify-between text-slate-400 text-[11px]">
          <span>+ Dây cáp, ma-nê, xích cẩu:</span>
          <span className="font-mono text-slate-200">{(riggingConfig.slingWeight || 0.1).toFixed(2)} t</span>
        </div>
        <div className="flex justify-between text-slate-400 text-[11px]">
          <span>+ Xà nâng / Khung giằng (Spreader Beam):</span>
          <span className="font-mono text-slate-200">{(riggingConfig.spreaderWeight || 0).toFixed(2)} t</span>
        </div>
        <div className="flex justify-between text-slate-400 text-[11px]">
          <span>+ Khối móc cẩu & cụm puly (Hook Block):</span>
          <span className="font-mono text-slate-200">{hookWeight.toFixed(2)} t</span>
        </div>
        <div className="border-t border-slate-700/80 pt-1 flex justify-between font-bold text-slate-100 text-xs">
          <span className="text-amber-400 uppercase tracking-wider">TỔNG TẢI TRỌNG CẨU (GROSS LOAD):</span>
          <span className="font-mono text-amber-300 text-sm">{grossLoad.toFixed(2)} TẤN</span>
        </div>
      </div>
    </div>
  );
}

