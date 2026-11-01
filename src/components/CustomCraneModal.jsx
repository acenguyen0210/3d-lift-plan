import React, { useState } from 'react';
import { X, Plus, Download, Upload, Trash2, Check, RefreshCw, FileText, Cpu } from 'lucide-react';

export default function CustomCraneModal({ isOpen, onClose, onSaveCustomCrane, existingCranes }) {
  if (!isOpen) return null;

  const [craneName, setCraneName] = useState('Sany STC500C');
  const [manufacturer, setManufacturer] = useState('Sany Heavy Industry');
  const [craneType, setCraneType] = useState('mobile');
  const [description, setDescription] = useState('Cẩu bánh lốp 50 tấn, 4 trục, cần chính 11.5m - 43.5m');
  const [tareWeight, setTareWeight] = useState(42.0);
  const [hasCounterweight, setHasCounterweight] = useState(true);
  const [counterweight, setCounterweight] = useState(8.5);
  const [outriggerLength, setOutriggerLength] = useState(7.2);
  const [outriggerWidth, setOutriggerWidth] = useState(6.4);
  const [minBoomLength, setMinBoomLength] = useState(11.5);
  const [maxBoomLength, setMaxBoomLength] = useState(43.5);
  const [maxWindSpeed, setMaxWindSpeed] = useState(11.0);
  const [maxPartsOfLine, setMaxPartsOfLine] = useState(8);
  const [ropeCapacity, setRopeCapacity] = useState(5.0);
  const [hookWeight, setHookWeight] = useState(0.45);
  const [tailSwingRadius, setTailSwingRadius] = useState(3.8);

  // Switch crane presets automatically based on selected type
  const handleCraneTypeChange = (newType) => {
    setCraneType(newType);
    if (newType === 'truck') {
      setHasCounterweight(false);
      setCounterweight(0);
      setMaxPartsOfLine(4);
      setRopeCapacity(3.2);
      setHookWeight(0.18);
      setTailSwingRadius(1.4);
      setMinBoomLength(5.6);
      setMaxBoomLength(20.7);
      setTareWeight(18.0);
      setOutriggerLength(6.8);
      setOutriggerWidth(6.2);
      setBoomLengths([5.6, 9.4, 13.2, 17.0, 20.7]);
      setRadii([2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0]);
      if (craneName === 'Sany STC500C') {
        setCraneName('Xe tải cẩu thùng tự hành 12 tấn');
        setManufacturer('Soosan / Kanglim');
        setDescription('Xe tải gắn cẩu thùng tự hành, cần viễn vọng 5.6m - 20.7m, thùng chở hàng');
      }
    } else if (newType === 'crawler') {
      setHasCounterweight(true);
      setCounterweight(90.0);
      setMaxPartsOfLine(16);
      setRopeCapacity(13.5);
      setHookWeight(2.5);
      setTailSwingRadius(6.0);
      setMinBoomLength(15.2);
      setMaxBoomLength(73.2);
      setTareWeight(210.0);
      setBoomLengths([15.2, 27.4, 42.7, 51.8, 73.2]);
      setRadii([5, 8, 10, 14, 18, 24, 30, 40, 50, 60]);
    } else if (newType === 'tower') {
      setHasCounterweight(true);
      setCounterweight(22.5);
      setMaxPartsOfLine(4);
      setRopeCapacity(3.5);
      setHookWeight(0.5);
      setTailSwingRadius(15.5);
      setMinBoomLength(30.0);
      setMaxBoomLength(70.0);
      setTareWeight(85.0);
      setOutriggerLength(6.0);
      setOutriggerWidth(6.0);
      setBoomLengths([70.0]);
      setRadii([10, 15, 20, 25, 30, 35, 40, 50, 60, 70]);
    } else if (newType === 'rough_terrain') {
      setHasCounterweight(true);
      setCounterweight(9.8);
      setMaxPartsOfLine(10);
      setRopeCapacity(5.6);
      setHookWeight(0.65);
      setTailSwingRadius(3.9);
      setMinBoomLength(10.0);
      setMaxBoomLength(44.0);
      setTareWeight(44.5);
      setOutriggerLength(7.3);
      setOutriggerWidth(7.0);
    } else {
      setHasCounterweight(true);
      setCounterweight(8.5);
      setMaxPartsOfLine(8);
      setRopeCapacity(5.0);
      setHookWeight(0.45);
      setTailSwingRadius(3.8);
      setMinBoomLength(11.5);
      setMaxBoomLength(43.5);
      setTareWeight(42.0);
      setOutriggerLength(7.2);
      setOutriggerWidth(6.4);
    }
  };

  // Load chart radii & boom lengths
  const [radii, setRadii] = useState([3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32]);
  const [boomLengths, setBoomLengths] = useState([11.5, 19.5, 27.5, 35.5, 43.5]);

  // Load chart table: { [radius]: [cap0, cap1, ...] }
  const [chartData, setChartData] = useState({
    3:  [50.0, 36.0, null,  null,  null],
    4:  [44.0, 34.0, 26.0, null,  null],
    5:  [36.0, 30.0, 23.5, 18.0, null],
    6:  [30.0, 26.0, 21.0, 16.5, 12.0],
    8:  [21.0, 20.0, 17.5, 14.0, 10.5],
    10: [14.5, 14.5, 14.0, 12.0, 9.2],
    12: [null, 10.5, 10.2, 10.0, 8.0],
    14: [null, 7.8,  7.6,  7.8,  7.0],
    16: [null, null, 5.8,  6.0,  5.9],
    18: [null, null, 4.4,  4.6,  4.7],
    20: [null, null, null, 3.5,  3.7],
    24: [null, null, null, 2.1,  2.3],
    28: [null, null, null, null, 1.4],
    32: [null, null, null, null, 0.8]
  });

  // Handle cell value change
  const handleCellChange = (r, bIdx, val) => {
    const num = val === '' ? null : parseFloat(val);
    setChartData((prev) => {
      const row = [...(prev[r] || [])];
      row[bIdx] = isNaN(num) ? null : num;
      return { ...prev, [r]: row };
    });
  };

  // Quick auto-populate formula estimate
  const handleAutoEstimate = () => {
    const newChart = {};
    radii.forEach((r) => {
      const row = [];
      boomLengths.forEach((b) => {
        if (r > b) {
          row.push(null);
        } else {
          // Physics moment decay approximation
          const maxRated = 50.0;
          const factor = Math.max(0.1, 1 - (r / (b + 2)) * 0.7);
          const cap = Math.max(0.5, Math.round(((maxRated * 3) / r) * factor * 10) / 10);
          row.push(r === 3 ? 50.0 : Math.min(50.0, cap));
        }
      });
      newChart[r] = row;
    });
    setChartData(newChart);
  };

  // Export JSON file
  const handleExportJSON = () => {
    const finalCW = hasCounterweight && counterweight > 0 ? counterweight : 0;
    const exportCrane = {
      id: `custom-${Date.now()}`,
      name: craneName,
      manufacturer,
      type: craneType,
      description,
      specs: {
        tareWeight,
        hasCounterweight: hasCounterweight && counterweight > 0,
        counterweightOptions: hasCounterweight && counterweight > 0
          ? [0, Math.round(counterweight * 0.5 * 10) / 10, counterweight]
          : [0],
        defaultCounterweight: finalCW,
        outriggerLength,
        outriggerWidth,
        outriggerSpreads: [
          { label: `100% (${outriggerWidth}m)`, ratio: 1.0, width: outriggerWidth },
          { label: `75% (${(outriggerWidth * 0.8).toFixed(2)}m)`, ratio: 0.8, width: outriggerWidth * 0.8 },
          { label: `50% (${(outriggerWidth * 0.6).toFixed(2)}m)`, ratio: 0.6, width: outriggerWidth * 0.6 },
          { label: '0% / Bánh lốp (2.50m)', ratio: 0.38, width: 2.50 }
        ],
        minBoomLength,
        maxBoomLength,
        boomSteps: boomLengths,
        boomOffsetPivotY: craneType === 'tower' ? 35.0 : craneType === 'truck' ? 2.25 : 2.5,
        boomOffsetPivotX: craneType === 'truck' ? 0.35 : 1.0,
        tailSwingRadius: parseFloat(tailSwingRadius) || (craneType === 'truck' ? 1.4 : 3.8),
        maxPartsOfLine: parseInt(maxPartsOfLine, 10) || (craneType === 'truck' ? 4 : 8),
        ropeCapacityPerLine: parseFloat(ropeCapacity) || 4.8,
        defaultHookWeight: parseFloat(hookWeight) || (craneType === 'truck' ? 0.18 : 0.45),
        maxWindSpeed,
        colorScheme: craneType === 'truck' ? {
          body: '#0284c7',
          boom: '#f59e0b',
          cabin: '#ffffff',
          chassis: '#1e293b',
          cargoBed: '#94a3b8'
        } : {
          body: '#f97316',
          boom: '#ea580c',
          cabin: '#0f172a',
          chassis: '#1e293b'
        }
      },
      loadCharts: {
        [`${finalCW.toFixed(1)}t_100%`]: {
          radii,
          boomLengths,
          chart: chartData
        }
      }
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportCrane, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${craneName.replace(/\s+/g, '_')}_profile.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON file
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.name && parsed.specs) {
          setCraneName(parsed.name);
          setManufacturer(parsed.manufacturer || 'Custom');
          setCraneType(parsed.type || 'mobile');
          setDescription(parsed.description || '');
          setTareWeight(parsed.specs.tareWeight || 40);

          const cw = parsed.specs.defaultCounterweight || 0;
          const cwOpts = parsed.specs.counterweightOptions || [];
          const hasCW = parsed.specs.hasCounterweight !== undefined
            ? parsed.specs.hasCounterweight
            : (cw > 0 || (cwOpts.length > 1 && cwOpts.some((v) => v > 0)));
          setHasCounterweight(hasCW);
          setCounterweight(hasCW ? cw : 0);

          setMaxPartsOfLine(parsed.specs.maxPartsOfLine || (parsed.type === 'truck' ? 4 : 8));
          setRopeCapacity(parsed.specs.ropeCapacityPerLine || 5.0);
          setHookWeight(parsed.specs.defaultHookWeight || (parsed.type === 'truck' ? 0.18 : 0.45));
          setTailSwingRadius(parsed.specs.tailSwingRadius || (parsed.type === 'truck' ? 1.4 : 3.8));

          setMinBoomLength(parsed.specs.minBoomLength || 10);
          setMaxBoomLength(parsed.specs.maxBoomLength || 40);

          if (parsed.loadCharts) {
            const firstChartKey = Object.keys(parsed.loadCharts)[0];
            const cData = parsed.loadCharts[firstChartKey];
            if (cData && cData.radii && cData.boomLengths) {
              setRadii(cData.radii);
              setBoomLengths(cData.boomLengths);
              setChartData(cData.chart);
            }
          }
          alert(`Đã nhập thành công hồ sơ cẩu: ${parsed.name}`);
        } else {
          alert('File JSON không đúng định dạng thông số cẩu!');
        }
      } catch (err) {
        alert('Lỗi đọc file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Submit and save
  const handleSave = () => {
    if (!craneName.trim()) {
      alert('Vui lòng nhập tên loại cẩu!');
      return;
    }

    const finalCW = hasCounterweight && counterweight > 0 ? counterweight : 0;
    const newCrane = {
      id: `custom-${Date.now()}`,
      name: craneName,
      manufacturer,
      type: craneType,
      description,
      specs: {
        tareWeight,
        hasCounterweight: hasCounterweight && counterweight > 0,
        counterweightOptions: hasCounterweight && counterweight > 0
          ? [0, Math.round(counterweight * 0.5 * 10) / 10, counterweight]
          : [0],
        defaultCounterweight: finalCW,
        outriggerLength,
        outriggerWidth,
        outriggerSpreads: [
          { label: `100% (${outriggerWidth}m)`, ratio: 1.0, width: outriggerWidth },
          { label: `75% (${(outriggerWidth * 0.8).toFixed(2)}m)`, ratio: 0.8, width: outriggerWidth * 0.8 },
          { label: `50% (${(outriggerWidth * 0.6).toFixed(2)}m)`, ratio: 0.6, width: outriggerWidth * 0.6 },
          { label: '0% / Bánh lốp (2.50m)', ratio: 0.38, width: 2.50 }
        ],
        minBoomLength,
        maxBoomLength,
        boomSteps: boomLengths,
        boomOffsetPivotY: craneType === 'tower' ? 35.0 : craneType === 'truck' ? 2.25 : 2.5,
        boomOffsetPivotX: craneType === 'truck' ? 0.35 : 1.0,
        tailSwingRadius: parseFloat(tailSwingRadius) || (craneType === 'truck' ? 1.4 : 3.8),
        maxPartsOfLine: parseInt(maxPartsOfLine, 10) || (craneType === 'truck' ? 4 : 8),
        ropeCapacityPerLine: parseFloat(ropeCapacity) || 4.8,
        defaultHookWeight: parseFloat(hookWeight) || (craneType === 'truck' ? 0.18 : 0.45),
        maxWindSpeed,
        colorScheme: craneType === 'truck' ? {
          body: '#0284c7',
          boom: '#f59e0b',
          cabin: '#ffffff',
          chassis: '#1e293b',
          cargoBed: '#94a3b8'
        } : {
          body: '#f97316',
          boom: '#ea580c',
          cabin: '#0f172a',
          chassis: '#1e293b'
        }
      },
      loadCharts: {
        [`${finalCW.toFixed(1)}t_100%`]: {
          radii,
          boomLengths,
          chart: chartData
        }
      }
    };

    onSaveCustomCrane(newCrane);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Cpu className="text-sky-400" size={20} />
            <div>
              <h3 className="text-base font-bold text-slate-100">Khai báo & Nhập thông số Cần cẩu bên ngoài</h3>
              <p className="text-xs text-slate-400">
                Cho phép thêm bất kỳ hãng cẩu thực tế nào (Sany, Zoomlion, XCMG, Kato, Tadano, Demag, Kobelco...)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Quick Actions (Import / Export JSON) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-300 font-medium">Hồ sơ cẩu (Crane Profile JSON):</div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0">
                <Upload size={14} className="text-sky-400 shrink-0" /> Nhập từ file JSON
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
              <button
                onClick={handleExportJSON}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download size={14} className="text-emerald-400 shrink-0" /> Xuất file JSON
              </button>
            </div>
          </div>

          {/* General Crane Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">Tên Model cẩu:</label>
              <input
                type="text"
                value={craneName}
                onChange={(e) => setCraneName(e.target.value)}
                placeholder="VD: Sany STC500C"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-semibold focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">Hãng sản xuất:</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="VD: Sany, Liebherr, Kato..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">Kiểu loại hình cẩu:</label>
              <select
                value={craneType}
                onChange={(e) => handleCraneTypeChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-semibold"
              >
                <option value="mobile">Cẩu bánh lốp (All-Terrain / Mobile Crane)</option>
                <option value="truck">Cẩu thùng tự hành chở hàng (Truck-Mounted Cargo Crane)</option>
                <option value="rough_terrain">Cẩu địa hình bánh béo (Rough Terrain Crane)</option>
                <option value="crawler">Cẩu bánh xích hạng nặng (Crawler Crane)</option>
                <option value="tower">Cẩu tháp xây dựng (Tower Crane)</option>
              </select>
            </div>
          </div>

          {/* 1. Counterweight Configuration Block */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  1. Cấu hình Đối trọng (Counterweight)
                </span>
                <span className={`text-[10.5px] px-2 py-0.5 rounded font-mono font-bold ${
                  hasCounterweight && counterweight > 0
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {hasCounterweight && counterweight > 0 ? `${counterweight} Tấn` : '0 Tấn (Không dùng đối trọng rời)'}
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={hasCounterweight}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasCounterweight(checked);
                    if (!checked) setCounterweight(0);
                    else if (counterweight === 0) setCounterweight(craneType === 'truck' ? 0 : 8.5);
                  }}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Trang bị khối đối trọng tháo rời</span>
              </label>
            </div>

            {hasCounterweight ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1 font-medium">Khối lượng đối trọng tối đa:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      value={counterweight}
                      onChange={(e) => setCounterweight(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-center font-bold focus:outline-none focus:border-amber-500"
                      placeholder="VD: 9.0"
                    />
                    <span className="text-slate-400 font-semibold">Tấn</span>
                  </div>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex flex-col justify-center text-[11px] text-slate-400">
                  <div className="text-slate-300 font-medium mb-0.5">Các mức đối trọng tự động phân bổ:</div>
                  <div className="font-mono text-amber-300 font-semibold">
                    0t &nbsp;➔&nbsp; {(counterweight * 0.5).toFixed(1)}t &nbsp;➔&nbsp; {counterweight.toFixed(1)}t
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                <span className="text-base leading-none">✓</span>
                <span className="leading-relaxed">
                  <b>Cẩu không trang bị đối trọng tháo rời (0 Tấn)</b> — Phù hợp với cẩu thùng tự hành (truck crane có thùng chở hàng), cẩu bánh lốp địa hình nhỏ hoặc cẩu có đối trọng đúc liền. Tránh việc thêm sai đối trọng không thực tế.
                </span>
              </div>
            )}
          </div>

          {/* 2. Hoist Cable & Hook Block Configuration Block */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                2. Cấu hình Cáp cẩu & Bộ móc puly (Hoist Cable & Hook)
              </span>
              <div className="text-[11px] text-sky-400 font-mono">
                Tổng sức nâng dàn cáp: <b className="text-sky-300 font-bold">{(maxPartsOfLine * ropeCapacity).toFixed(1)} Tấn</b>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1 font-medium">Số nhánh cáp tối đa (Max Parts):</span>
                <select
                  value={maxPartsOfLine}
                  onChange={(e) => setMaxPartsOfLine(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-semibold focus:outline-none focus:border-sky-500"
                >
                  {[1, 2, 4, 6, 8, 10, 12, 14, 16].map((n) => (
                    <option key={n} value={n}>
                      {n} Nhánh cáp {n === 4 && craneType === 'truck' ? '(Khuyên dùng Cẩu thùng)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-slate-400 block mb-1 font-medium">Sức kéo 1 nhánh cáp (Rope Capacity):</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step={0.1}
                    min={0.5}
                    value={ropeCapacity}
                    onChange={(e) => setRopeCapacity(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-center font-bold focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-slate-400 font-semibold">t/nhánh</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1 font-medium">Tự trọng cụm móc cẩu (Hook Weight):</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step={0.05}
                    min={0.05}
                    value={hookWeight}
                    onChange={(e) => setHookWeight(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-center font-bold focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-slate-400 font-semibold">Tấn</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
              <span>💡 Khối lượng móc cẩu sẽ tự động cộng vào tổng tải nâng (Gross Load) theo tiêu chuẩn ASME B30.5.</span>
              <span className="text-slate-300 font-mono">
                Dàn cáp: {maxPartsOfLine} nhánh × {ropeCapacity}t = <b className="text-sky-300">{(maxPartsOfLine * ropeCapacity).toFixed(1)}t</b>
              </span>
            </div>
          </div>

          {/* 3. Mechanical & Dimension Specs */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
              3. Kích thước Cơ học, Cần cẩu & Chân chống (Chassis & Boom)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Tự trọng xe (Tare Weight):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.5}
                    value={tareWeight}
                    onChange={(e) => setTareWeight(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-center font-mono"
                  />
                  <span className="text-slate-400">t</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Bán kính đuôi (Tail Swing):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={tailSwingRadius}
                    onChange={(e) => setTailSwingRadius(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-center font-mono"
                  />
                  <span className="text-slate-400">m</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Cần min (Min Boom):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={minBoomLength}
                    onChange={(e) => setMinBoomLength(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-center font-mono"
                  />
                  <span className="text-slate-400">m</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Cần max (Max Boom):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.5}
                    value={maxBoomLength}
                    onChange={(e) => setMaxBoomLength(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-center font-mono"
                  />
                  <span className="text-slate-400">m</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400 block mb-1">Dài chân chống (Outrigger L):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={outriggerLength}
                    onChange={(e) => setOutriggerLength(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-center font-mono"
                  />
                  <span className="text-slate-400">m</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Rộng chân chống (Outrigger W):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    value={outriggerWidth}
                    onChange={(e) => setOutriggerWidth(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-center font-mono"
                  />
                  <span className="text-slate-400">m</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Giới hạn gió max:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.5}
                    value={maxWindSpeed}
                    onChange={(e) => setMaxWindSpeed(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-center font-mono"
                  />
                  <span className="text-slate-400">m/s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Load Chart Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Bảng tra tải trọng (Load Chart Matrix - Tấn)
                </div>
                <div className="text-[11px] text-slate-400">
                  Nhập sức nâng định mức ứng với từng Bán kính R (hàng) và Chiều dài cần L (cột)
                </div>
              </div>
              <button
                onClick={handleAutoEstimate}
                className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Tự động tính toán bảng tải mẫu xấp xỉ"
              >
                <RefreshCw size={14} className="shrink-0" /> Tự tạo bảng tải mẫu
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950 p-2">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="p-2 text-left bg-slate-900/60 rounded-l">R (m) \ Cần (m)</th>
                    {boomLengths.map((b, idx) => (
                      <th key={idx} className="p-2 font-mono text-sky-400">
                        {b}m
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {radii.map((r) => (
                    <tr key={r} className="hover:bg-slate-900/40">
                      <td className="p-1.5 text-left font-bold text-slate-300 bg-slate-900/30">{r} m</td>
                      {boomLengths.map((b, bIdx) => {
                        const val = chartData[r]?.[bIdx];
                        return (
                          <td key={bIdx} className="p-1">
                            <input
                              type="number"
                              step={0.1}
                              value={val !== null && val !== undefined ? val : ''}
                              onChange={(e) => handleCellChange(r, bIdx, e.target.value)}
                              placeholder="-"
                              className={`w-16 py-1 px-1 text-center rounded border text-xs focus:outline-none focus:border-sky-500 transition-colors ${
                                val !== null && val !== undefined
                                  ? 'bg-slate-900 border-slate-700 text-slate-100 font-bold'
                                  : 'bg-slate-950 border-slate-800/80 text-slate-600'
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-lg flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Check size={16} className="shrink-0" /> Lưu & Áp dụng Model cẩu này
          </button>
        </div>
      </div>
    </div>
  );
}

