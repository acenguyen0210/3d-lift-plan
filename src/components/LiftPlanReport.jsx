import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  CheckSquare,
  Square,
  Shield,
  Award,
  Calendar,
  FileText,
  X,
  Camera,
  RotateCw,
  MapPin,
  Maximize2,
  Navigation,
  AlertTriangle,
  Layers,
  ChevronRight,
  Eye,
  Compass,
  CheckCircle,
  AlertCircle,
  Move,
  Upload,
  Sun,
  Moon,
  Plus,
  Trash2
} from 'lucide-react';
import {
  getRatedCapacity,
  calculateOutriggerReactions,
  calculateBoomKinematics
} from '../utils/craneMath';
import Report3DAdjustModal from './Report3DAdjustModal';

const DEFAULT_DRAWING_VIEWS = [
  {
    id: 'topView',
    title: 'Hình 1: Mặt bằng Bố trí Cẩu (Top Plan View)',
    desc: 'Bình đồ bố trí cẩu, bán kính làm việc, ranh giới an toàn và vị trí các điểm Pick - Set.',
    preset: 'top',
    iconType: 'compass',
  },
  {
    id: 'isoView',
    title: 'Hình 2: Phối cảnh Không gian 3D (3D Isometric)',
    desc: 'Phối cảnh không gian 3D toàn cảnh thi công, quỹ đạo đường bay tải cẩu và vật cản xung quanh.',
    preset: '3d',
    iconType: 'layers',
  },
  {
    id: 'sideView',
    title: 'Hình 3: Mặt đứng Nâng hạ (Side Elevation)',
    desc: 'Mặt đứng công tác nâng hạ, tầm với cần cẩu, cao độ móc cẩu và khoảng hở tĩnh không an toàn.',
    preset: 'side',
    iconType: 'eye',
  },
  {
    id: 'customView',
    title: 'Hình 4: Góc nhìn Chi tiết Tùy chọn (Custom View)',
    desc: 'Chi tiết vị trí cẩu then chốt, cận cảnh móc cẩu/vật nâng hoặc khoảng hở chướng ngại vật đặc biệt.',
    preset: 'load',
    iconType: 'maximize',
  },
];

export default function LiftPlanReport({
  isOpen,
  onClose,
  crane,
  boomLength,
  workingRadius,
  slewAngle,
  craneHeading = 0,
  boomAngle,
  counterweight,
  outriggerRatio,
  partsOfLine,
  hookElevation = 6.0,
  loadElevation = 1.5,
  grossLoad,
  netLoad,
  totalRiggingWeight,
  hookWeight,
  ratedCapacity,
  liftPercentage,
  liftCategory,
  outriggerReactions,
  matLength,
  matWidth,
  soilCapacityTonsPerM2,
  windSpeed,
  liftPoints = [],
  capturedViews = null,
  onRefreshViews,
  obstacles = [],
  loadConfig,
  riggingConfig,
  onStartAdjustView,
  onUpdateViewImage
}) {
  if (!isOpen) return null;

  // Theme selector: 'light' (Standard A4 Paper) vs 'dark' (Engineering CAD)
  // Matches 100% between screen preview and PDF print output
  const [reportTheme, setReportTheme] = useState('light');
  const isLight = reportTheme === 'light';

  const [projectName, setProjectName] = useState('DỰ ÁN TỔ HỢP CÔNG NGHIỆP & HẠ TẦNG');
  const [liftItem, setLiftItem] = useState('Cẩu lắp thiết bị bồn bể / Kết cấu thép nặng');
  const [contractor, setContractor] = useState('CÔNG TY CỔ PHẦN CẨU LẮP & XÂY DỰNG CHUYÊN DỤNG');
  const [supervisor, setSupervisor] = useState('Nguyễn Văn An (Kỹ sư trưởng)');
  const [safetyOfficer, setSafetyOfficer] = useState('Trần Quốc Tuấn (HSE Manager)');
  const [operator, setOperator] = useState('Lê Hoàng Nam (Thợ cẩu bậc 7/7)');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRefreshingViews, setIsRefreshingViews] = useState(false);
  const [activeAdjustView, setActiveAdjustView] = useState(null);

  // Dynamic Drawing Views state for Page 2 (supports 1 to 6 custom images)
  const [drawingViews, setDrawingViews] = useState(DEFAULT_DRAWING_VIEWS);
  const [customImages, setCustomImages] = useState({});

  const handleAddView = () => {
    if (drawingViews.length >= 6) return;
    const newNum = drawingViews.length + 1;
    const newId = `customView_${Date.now()}`;
    const defaultPresets = ['current', 'load', 'front', 'side', '3d', 'top'];
    const nextPreset = defaultPresets[(newNum - 1) % defaultPresets.length];
    const newView = {
      id: newId,
      title: `Hình ${newNum}: Chi tiết bổ sung ${newNum}`,
      desc: `Chi tiết góc nhìn kiểm tra an toàn hoặc ảnh hiện trường bổ sung số ${newNum}.`,
      preset: nextPreset,
      iconType: 'camera',
    };
    setDrawingViews((prev) => [...prev, newView]);
  };

  const handleDeleteView = (idToDelete) => {
    if (drawingViews.length <= 1) return;
    setDrawingViews((prev) => {
      const filtered = prev.filter((v) => v.id !== idToDelete);
      return filtered.map((v, idx) => {
        const match = v.title.match(/^Hình\s*\d+\s*:\s*(.*)$/);
        return {
          ...v,
          title: match ? `Hình ${idx + 1}: ${match[1]}` : `Hình ${idx + 1}: ${v.title}`
        };
      });
    });
  };

  const handleUpdateTitle = (id, newTitle) => {
    setDrawingViews((prev) =>
      prev.map((v) => (v.id === id ? { ...v, title: newTitle } : v))
    );
  };

  const handleUpdateDesc = (id, newDesc) => {
    setDrawingViews((prev) =>
      prev.map((v) => (v.id === id ? { ...v, desc: newDesc } : v))
    );
  };

  const handleFileUpload = (viewKey, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        const dataUrl = evt.target.result;
        setCustomImages((prev) => ({ ...prev, [viewKey]: dataUrl }));
        if (onUpdateViewImage) {
          onUpdateViewImage(viewKey, dataUrl);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const getViewImageSrc = (viewId) => {
    if (customImages[viewId]) return customImages[viewId];
    if (capturedViews?.[viewId]) return capturedViews[viewId];
    if (viewId === 'customView' && capturedViews?.currentView) return capturedViews.currentView;
    return null;
  };

  const renderViewIcon = (type, isLightMode) => {
    switch (type) {
      case 'compass':
        return <Compass size={13} className={isLightMode ? 'text-sky-800' : 'text-sky-400'} />;
      case 'layers':
        return <Layers size={13} className={isLightMode ? 'text-emerald-700' : 'text-emerald-400'} />;
      case 'eye':
        return <Eye size={13} className={isLightMode ? 'text-amber-800' : 'text-amber-400'} />;
      case 'maximize':
        return <Maximize2 size={13} className={isLightMode ? 'text-purple-800' : 'text-purple-400'} />;
      default:
        return <Camera size={13} className={isLightMode ? 'text-sky-700' : 'text-sky-400'} />;
    }
  };

  // ASME B30.5 / OSHA Critical Lift Checklist
  const [checklist, setChecklist] = useState({
    groundChecked: true,
    outriggersInspected: true,
    loadChartVerified: true,
    riggingHardwareInspected: true,
    windWithinLimits: true,
    taglinesAssigned: true,
    communicationRadioReady: true,
    exclusionZoneBarricaded: true
  });

  const toggleCheck = (k) => {
    setChecklist((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefreshClick = () => {
    if (onRefreshViews) {
      setIsRefreshingViews(true);
      setTimeout(() => {
        onRefreshViews();
        setIsRefreshingViews(false);
      }, 150);
    }
  };

  const handleDownloadImage = (dataUrl, filename) => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const matArea = (matLength * matWidth).toFixed(2);
  const actualGBP = (outriggerReactions.maxReaction / (matLength * matWidth)).toFixed(2);

  // --- DETAILED EVALUATION AT ALL WAYPOINTS (PICK -> WAYPOINTS -> SET) ---
  const evaluatedPoints = useMemo(() => {
    const rawPts =
      liftPoints && liftPoints.length > 0
        ? liftPoints
        : [
            {
              id: 'pt-1',
              name: 'Điểm 1: Vị trí cẩu hiện tại',
              radius: workingRadius,
              slew: slewAngle,
              elevation: 1.5
            }
          ];

    return rawPts.map((pt, idx) => {
      // 1. Boom kinematics for this point's radius
      const kine = calculateBoomKinematics(boomLength, pt.radius);

      // 2. Rated capacity from crane load chart
      const capRes = getRatedCapacity(crane, boomLength, pt.radius, counterweight, outriggerRatio);
      const cap = capRes.capacity || 0;

      // 3. % Lift Capacity
      const pct = cap > 0 ? (grossLoad / cap) * 100 : 999;

      // 4. Outrigger reactions at this point's slew angle & radius
      const reactions = calculateOutriggerReactions({
        tareWeight: crane?.specs?.tareWeight || 40,
        counterweight,
        grossLoad,
        radius: pt.radius,
        slewAngleDeg: pt.slew,
        outriggerLength: (crane?.specs?.outriggerLength || 7.3) * outriggerRatio,
        outriggerWidth: (crane?.specs?.outriggerWidth || 7.0) * outriggerRatio,
        tailSwingRadius: crane?.specs?.tailSwingRadius || 4.0
      });

      // 5. Ground Bearing Pressure (t/m²)
      const gbp = (reactions.maxReaction / (matLength * matWidth)).toFixed(2);
      const isGroundSafe = parseFloat(gbp) <= soilCapacityTonsPerM2;

      // 6. Safety Status Category
      let statusBadge = {
        label: 'An toàn (<75%)',
        color: isLight ? 'text-emerald-700' : 'text-emerald-400',
        bg: isLight ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-500/10 border-emerald-500/30'
      };
      if (pct > 100) {
        statusBadge = {
          label: 'VƯỢT TẢI (>100%)',
          color: isLight ? 'text-rose-700' : 'text-rose-400',
          bg: isLight ? 'bg-rose-50 border-rose-300' : 'bg-rose-500/20 border-rose-500/40'
        };
      } else if (pct > 85) {
        statusBadge = {
          label: 'Cẩu tới hạn (85-100%)',
          color: isLight ? 'text-amber-800' : 'text-amber-400',
          bg: isLight ? 'bg-amber-50 border-amber-300' : 'bg-amber-500/20 border-amber-500/40'
        };
      } else if (pct > 75) {
        statusBadge = {
          label: 'Cảnh báo (75-85%)',
          color: isLight ? 'text-amber-700' : 'text-yellow-400',
          bg: isLight ? 'bg-yellow-50 border-yellow-300' : 'bg-yellow-500/20 border-yellow-500/40'
        };
      }

      return {
        ...pt,
        index: idx + 1,
        isStart: idx === 0,
        isEnd: idx === rawPts.length - 1,
        boomAngle: kine.boomAngleDeg,
        tipHeight: kine.tipHeight,
        capacity: cap,
        capStatus: capRes.status,
        percentage: pct,
        reactions,
        maxReaction: reactions.maxReaction,
        maxReactionLeg: reactions.maxReactionLeg,
        gbp,
        isGroundSafe,
        statusBadge
      };
    });
  }, [
    liftPoints,
    workingRadius,
    slewAngle,
    boomLength,
    crane,
    counterweight,
    outriggerRatio,
    grossLoad,
    matLength,
    matWidth,
    soilCapacityTonsPerM2,
    isLight
  ]);

  // Critical Points across trajectory
  const critCapacityPoint = useMemo(() => {
    if (!evaluatedPoints || evaluatedPoints.length === 0) return null;
    let worst = evaluatedPoints[0];
    evaluatedPoints.forEach((p) => {
      if (p.percentage > worst.percentage) worst = p;
    });
    return worst;
  }, [evaluatedPoints]);

  const critGroundPoint = useMemo(() => {
    if (!evaluatedPoints || evaluatedPoints.length === 0) return null;
    let worst = evaluatedPoints[0];
    evaluatedPoints.forEach((p) => {
      if (p.maxReaction > worst.maxReaction) worst = p;
    });
    return worst;
  }, [evaluatedPoints]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto report-modal-backdrop">
      <div
        className={`w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden report-modal-container border transition-colors ${
          isLight
            ? 'bg-white text-slate-900 border-slate-300'
            : 'bg-slate-900 text-slate-100 border-slate-700'
        }`}
      >
        {/* Modal Top Bar (Always Hidden in Print) */}
        <div
          className={`px-4 sm:px-6 py-3 border-b flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 shrink-0 print:hidden ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className={isLight ? 'text-sky-700' : 'text-sky-400'} size={20} />
            <div>
              <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                Thuyết minh Tính toán Biện pháp Cẩu & Hồ sơ Bản vẽ 3D
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Xem trước & Xuất file PDF tiêu chuẩn kỹ thuật (WYSIWYG - Chuẩn in A4)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0">
            {/* Theme Toggle (Paper White vs Dark CAD) */}
            <div
              className={`flex items-center rounded-lg p-0.5 border text-xs font-medium shrink-0 ${
                isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-800 border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => setReportTheme('light')}
                className={`px-2 sm:px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'bg-white text-sky-800 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Giao diện Trang giấy trắng in ấn A4 (Khuyên dùng khi xuất file PDF nộp hồ sơ)"
              >
                <Sun size={13} className="shrink-0" />
                <span>Giấy trắng A4</span>
              </button>
              <button
                type="button"
                onClick={() => setReportTheme('dark')}
                className={`px-2 sm:px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  !isLight
                    ? 'bg-slate-900 text-sky-300 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Giao diện Nền tối kỹ thuật (Dark CAD)"
              >
                <Moon size={13} className="shrink-0" />
                <span>Nền tối CAD</span>
              </button>
            </div>

            {onRefreshViews && (
              <button
                type="button"
                onClick={handleRefreshClick}
                disabled={isRefreshingViews}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-slate-700'
                }`}
                title="Chụp lại các góc nhìn từ mô hình 3D"
              >
                <RotateCw size={13} className={`shrink-0 ${isRefreshingViews ? 'animate-spin' : ''}`} />
                <span>Cập nhật ảnh 3D</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="bg-sky-600 hover:bg-sky-500 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-600/25 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer size={14} className="shrink-0" />
              <span className="hidden sm:inline">In / Xuất file PDF Bản tính</span>
              <span className="sm:hidden">In / Xuất PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <X size={18} className="shrink-0" />
            </button>
          </div>
        </div>

        {/* Print Setup Tip Banner (Always Hidden in Print) */}
        <div
          className={`px-4 sm:px-6 py-2 border-b text-[11px] flex items-center justify-between gap-2 shrink-0 print:hidden ${
            isLight ? 'bg-amber-50/90 border-amber-200 text-amber-800' : 'bg-slate-900 border-slate-800 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">💡 Mẹo xuất file PDF chuẩn đẹp:</span>
            <span>
              Trong hộp thoại In, chọn máy in <b>"Lưu dưới dạng PDF" (Save as PDF)</b> • Khổ giấy <b>A4</b> • Bật tùy chọn <b>"Đồ họa nền" (Background graphics)</b>.
            </span>
          </div>
          <span className="font-mono text-[10px] opacity-80 shrink-0 hidden sm:inline">Hồ sơ 2 trang A4 chuẩn</span>
        </div>

        {/* Printable Report Document Body */}
        <div
          id="lift-plan-printable-document"
          className={`p-4 md:p-6 space-y-6 overflow-y-auto flex-1 text-xs report-document-body ${
            isLight ? 'bg-slate-200/60 text-slate-800' : 'bg-slate-950 text-slate-100'
          }`}
        >
          {/* ========================================================================= */}
          {/* TRANG 1 / 2: THUYẾT MINH TÍNH TOÁN AN TOÀN NÂNG HẠ & KIỂM TRA SỨC NÂNG CẨU    */}
          {/* ========================================================================= */}
          <div
            className={`report-page report-page-1 flex flex-col p-4 md:p-5 rounded-xl shadow-lg border gap-2.5 transition-colors ${
              isLight ? 'bg-white text-slate-800 border-slate-300' : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            {/* Header Banner */}
            <div
              className={`border-b-2 pb-1.5 flex flex-row justify-between items-center gap-3 ${
                isLight ? 'border-sky-600' : 'border-sky-500'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm sm:text-base font-black uppercase tracking-wider leading-snug ${
                    isLight ? 'text-sky-900' : 'text-sky-400'
                  }`}
                >
                  BẢN TÍNH TOÁN BIỆN PHÁP THI CÔNG & THUYẾT MINH AN TOÀN NÂNG HẠ CẨU
                </div>
                <div className={`text-[10px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  (CRANE LIFT PLAN & SAFETY CAPACITY VERIFICATION - ASME B30.5 / TCVN 4244:2005)
                </div>
              </div>
              <div className={`text-right font-mono text-[10px] shrink-0 whitespace-nowrap pl-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <div className="whitespace-nowrap">
                  Số hồ sơ: <b className={isLight ? 'text-slate-900' : 'text-slate-200'}>LP-2026-8892</b>
                </div>
                <div className="whitespace-nowrap">
                  Ngày lập: <b className={isLight ? 'text-slate-900' : 'text-slate-200'}>{planDate}</b>
                </div>
                <div className="whitespace-nowrap">
                  Trạng thái: <b className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>ĐÃ DUYỆT</b>
                </div>
              </div>
            </div>

            {/* Project & Administrative Info */}
            <div
              className={`grid grid-cols-3 gap-2.5 p-2 rounded-lg border text-xs ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div>
                <span className={`block text-[9.5px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Tên Dự án:
                </span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={`w-full bg-transparent font-bold focus:outline-none text-[11px] print:hidden ${
                    isLight ? 'text-slate-900' : 'text-slate-100'
                  }`}
                />
                <div className={`hidden print:block font-bold text-[10px] leading-tight break-words ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}>
                  {projectName}
                </div>
              </div>
              <div>
                <span className={`block text-[9.5px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Hạng mục cẩu:
                </span>
                <input
                  type="text"
                  value={liftItem}
                  onChange={(e) => setLiftItem(e.target.value)}
                  className={`w-full bg-transparent font-bold focus:outline-none text-[11px] print:hidden ${
                    isLight ? 'text-slate-900' : 'text-slate-100'
                  }`}
                />
                <div className={`hidden print:block font-bold text-[10px] leading-tight break-words ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}>
                  {liftItem}
                </div>
              </div>
              <div>
                <span className={`block text-[9.5px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Đơn vị thực hiện:
                </span>
                <input
                  type="text"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  className={`w-full bg-transparent font-bold focus:outline-none text-[11px] print:hidden ${
                    isLight ? 'text-slate-900' : 'text-slate-100'
                  }`}
                />
                <div className={`hidden print:block font-bold text-[10px] leading-tight break-words ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}>
                  {contractor}
                </div>
              </div>
            </div>

            {/* MỤC 1: THIẾT BỊ CẨU & PHÂN RÃ TẢI TRỌNG (2 CỘT SONG SONG) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Crane Configuration */}
              <div
                className={`p-2.5 rounded-lg border space-y-1 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div
                  className={`font-bold uppercase tracking-wide border-b pb-0.5 flex items-center justify-between text-[11px] ${
                    isLight ? 'text-sky-900 border-slate-200' : 'text-sky-400 border-slate-800'
                  }`}
                >
                  <span>1. Cấu hình Thiết bị cẩu</span>
                  <span className={`text-[9.5px] font-normal ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Model: {crane?.name || 'Liebherr'}
                  </span>
                </div>
                <div className="space-y-0.5 font-mono text-[10.5px]">
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-600 font-sans' : 'text-slate-400 font-sans'}>
                      Loại hình cẩu:
                    </span>
                    <span className={`font-bold uppercase ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {crane?.type === 'truck' ? 'CẨU THÙNG TỰ HÀNH' :
                       crane?.type === 'crawler' ? 'CẨU BÁNH XÍCH' :
                       crane?.type === 'tower' ? 'CẨU THÁP' :
                       'CẨU BÁNH LỐP'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-600 font-sans' : 'text-slate-400 font-sans'}>
                      Chiều dài cần / Góc nghiêng:
                    </span>
                    <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      {boomLength.toFixed(1)} m / {boomAngle.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-600 font-sans' : 'text-slate-400 font-sans'}>
                      Bán kính cẩu hiện tại:
                    </span>
                    <span className={`font-bold ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>
                      {workingRadius.toFixed(1)} m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-600 font-sans' : 'text-slate-400 font-sans'}>
                      Đối trọng (Counterweight):
                    </span>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {crane?.specs?.hasCounterweight === false || counterweight === 0 ? 'Không có (0t)' : `${counterweight.toFixed(1)} t`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-600 font-sans' : 'text-slate-400 font-sans'}>
                      Số nhánh cáp (Parts of Line):
                    </span>
                    <span className={`font-bold ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>
                      {partsOfLine} nhánh (Max: {(partsOfLine * (crane?.specs?.ropeCapacityPerLine || 4.8)).toFixed(1)}t)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-600 font-sans' : 'text-slate-400 font-sans'}>
                      Hướng đỗ cẩu (Orientation):
                    </span>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {craneHeading}°
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Load Breakdown */}
              <div
                className={`p-2.5 rounded-lg border space-y-1 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div
                  className={`font-bold uppercase tracking-wide border-b pb-0.5 flex items-center justify-between text-[11px] ${
                    isLight ? 'text-amber-800 border-slate-200' : 'text-amber-400 border-slate-800'
                  }`}
                >
                  <span>2. Bảng phân rã Tải trọng nâng</span>
                  <span className={`text-[9.5px] font-normal ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Đơn vị: Tấn
                  </span>
                </div>
                <div className="space-y-0.5 font-mono text-[10.5px]">
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-600 font-sans' : 'text-slate-400 font-sans'}>
                      + Tải trọng vật nâng tịnh (Net Load):
                    </span>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {netLoad.toFixed(2)} t
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-600 font-sans' : 'text-slate-400 font-sans'}>
                      + Dây cẩu & phụ kiện ({riggingConfig?.slingType === 'synthetic' ? 'Cáp vải' : riggingConfig?.slingType === 'chain' ? 'Xích cẩu' : 'Cáp thép'} {riggingConfig?.slingLegs || 4} nhánh, {riggingConfig?.slingAngleDeg || 60}°):
                    </span>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {totalRiggingWeight.toFixed(2)} t
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-600 font-sans' : 'text-slate-400 font-sans'}>
                      + Cụm móc cẩu & puly (Hook Block):
                    </span>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {hookWeight.toFixed(2)} t
                    </span>
                  </div>
                  <div
                    className={`border-t pt-0.5 flex justify-between font-bold text-xs ${
                      isLight ? 'border-slate-300 text-amber-900' : 'border-slate-700 text-amber-300'
                    }`}
                  >
                    <span className="font-sans uppercase">TỔNG TẢI TRỌNG CẨU (GROSS):</span>
                    <span>{grossLoad.toFixed(2)} TẤN</span>
                  </div>
                  <div className={`flex justify-between text-xs ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>
                    <span className="font-sans">Sức nâng định mức vị trí hiện tại (SWL):</span>
                    <span className="font-bold">{ratedCapacity.toFixed(2)} TẤN</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MỤC 3: BẢNG TÍNH TOÁN KỸ THUẬT TẠI CÁC ĐIỂM (PICK - WAYPOINTS - SET) */}
            <div
              className={`p-2.5 rounded-lg border space-y-1.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div
                className={`flex flex-row items-center justify-between border-b pb-1 gap-2 ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Navigation size={14} className={isLight ? 'text-rose-700' : 'text-rose-400'} />
                  <span className={`font-bold uppercase tracking-wide text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    3. Bảng Tính toán Kỹ thuật & Kiểm tra Sức nâng tại các Điểm (Pick - Waypoints - Set)
                  </span>
                </div>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Số điểm kiểm tra: <b className={isLight ? 'text-slate-900' : 'text-slate-200'}>{evaluatedPoints.length} điểm</b>
                </span>
              </div>

              {/* Waypoints Data Table */}
              <div className={`rounded-lg border overflow-hidden ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <table className="w-full text-left border-collapse font-mono text-[10.5px]">
                  <thead>
                    <tr
                      className={`border-b ${
                        isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950/90 border-slate-700 text-slate-300'
                      }`}
                    >
                      <th className="py-1 px-2 font-bold">Vị trí Điểm</th>
                      <th className="py-1 px-1.5 text-center font-bold">Bán kính R</th>
                      <th className="py-1 px-1.5 text-center font-bold">Góc quay S</th>
                      <th className="py-1 px-1.5 text-center font-bold">Cao độ H</th>
                      <th className="py-1 px-1.5 text-center font-bold">Góc cần θ</th>
                      <th className="py-1 px-1.5 text-center font-bold">Đỉnh cần</th>
                      <th className={`py-1 px-1.5 text-center font-bold ${isLight ? 'text-sky-900' : 'text-sky-300'}`}>
                        Sức nâng SWL
                      </th>
                      <th className="py-1 px-1.5 text-center font-bold">% Tải</th>
                      <th className="py-1 px-1.5 text-center font-bold">P chân max</th>
                      <th className="py-1 px-1.5 text-center font-bold">Áp lực P</th>
                      <th className="py-1 px-2 text-center font-bold">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
                    {evaluatedPoints.map((pt, idx) => {
                      const isCritical = critCapacityPoint && critCapacityPoint.id === pt.id;
                      return (
                        <tr
                          key={pt.id || idx}
                          className={`transition-colors ${
                            isCritical
                              ? isLight
                                ? 'bg-amber-50 font-semibold'
                                : 'bg-amber-950/30 font-semibold'
                              : idx % 2 === 0
                              ? isLight ? 'bg-white' : 'bg-slate-900/40'
                              : isLight ? 'bg-slate-50/60' : 'bg-slate-950/40'
                          }`}
                        >
                          <td className="py-1 px-2">
                            <div className={`font-bold flex items-center gap-1 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                              {isCritical && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
                              )}
                              <span>{pt.name}</span>
                            </div>
                            <div className={`text-[9px] ${isLight ? 'text-slate-500 font-sans' : 'text-slate-500 font-sans'}`}>
                              {pt.isStart
                                ? `GĐ 1: Đón tải • Xoay kiện: ${pt.loadRotation ?? 0}°`
                                : pt.isEnd
                                ? pt.hasCustomRotation === false
                                  ? `GĐ cuối: Hạ đặt • Giữ nguyên hướng (${liftPoints[0]?.loadRotation ?? 0}°)`
                                  : `GĐ cuối: Hạ đặt • Xoay kiện: ${pt.loadRotation ?? 90}°`
                                : pt.hasCustomRotation === true
                                ? `Hành trình ${idx} • Xoay: ${pt.loadRotation}°`
                                : `Hành trình ${idx} • Xoay: Tuyến tính`}
                            </div>
                          </td>
                          <td className="py-1 px-1.5 text-center font-bold">{pt.radius.toFixed(1)}m</td>
                          <td className="py-1 px-1.5 text-center">{pt.slew}°</td>
                          <td className="py-1 px-1.5 text-center font-bold">{pt.elevation?.toFixed(1) || 1.5}m</td>
                          <td className="py-1 px-1.5 text-center">{pt.boomAngle.toFixed(1)}°</td>
                          <td className="py-1 px-1.5 text-center">{pt.tipHeight.toFixed(1)}m</td>
                          <td className={`py-1 px-1.5 text-center font-bold ${isLight ? 'text-sky-800' : 'text-sky-300'}`}>
                            {pt.capacity.toFixed(2)}t
                          </td>
                          <td className="py-1 px-1.5 text-center">
                            <span
                              className={`font-black ${
                                pt.percentage > 100
                                  ? isLight ? 'text-rose-700' : 'text-rose-400'
                                  : pt.percentage > 85
                                  ? isLight ? 'text-amber-800' : 'text-amber-400'
                                  : isLight ? 'text-emerald-700' : 'text-emerald-400'
                              }`}
                            >
                              {pt.capacity > 0 ? `${pt.percentage.toFixed(1)}%` : 'NGOÀI TẢI'}
                            </span>
                          </td>
                          <td className={`py-1 px-1.5 text-center ${isLight ? 'text-rose-700 font-bold' : 'text-rose-300 font-bold'}`}>
                            {pt.maxReaction}t
                            <span className={`text-[8.5px] block font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              ({pt.maxReactionLeg})
                            </span>
                          </td>
                          <td className="py-1 px-1.5 text-center font-bold">{pt.gbp} t/m²</td>
                          <td className="py-1 px-2 text-center">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border inline-block ${pt.statusBadge.bg} ${pt.statusBadge.color}`}
                            >
                              {pt.statusBadge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MỤC 4: KIỂM TRA ÁP LỰC TIẾP ĐẤT & TẤM LÓT CHÂN CHỐNG */}
            <div
              className={`p-2.5 rounded-lg border space-y-1 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
              }`}
            >
              <div
                className={`font-bold uppercase tracking-wide border-b pb-0.5 flex items-center justify-between text-xs ${
                  isLight ? 'text-emerald-800 border-slate-200' : 'text-emerald-400 border-slate-800'
                }`}
              >
                <span>4. Kiểm tra Áp lực Tiếp đất Chân chống & Tấm lót (Ground Bearing Pressure)</span>
                <span className={`text-[9.5px] font-normal ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Quy chuẩn nền móng thi công
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 font-mono text-center pt-0.5">
                <div className={`p-1.5 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <span className={`text-[9px] font-sans block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Phản lực max (Pmax):
                  </span>
                  <b className={`text-xs ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                    {outriggerReactions.maxReaction} t
                  </b>
                  <span className={`text-[8.5px] block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    {outriggerReactions.maxReactionLeg}
                  </span>
                </div>
                <div className={`p-1.5 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <span className={`text-[9px] font-sans block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Kích thước tấm lót:
                  </span>
                  <b className={`text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                    {matLength}m x {matWidth}m
                  </b>
                  <span className={`text-[8.5px] block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    Diện tích: {matArea} m²
                  </span>
                </div>
                <div className={`p-1.5 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <span className={`text-[9px] font-sans block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Áp lực thực tế (P):
                  </span>
                  <b className={`text-xs ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>{actualGBP} t/m²</b>
                  <span className={`text-[8.5px] block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    P = Pmax / Amat
                  </span>
                </div>
                <div className={`p-1.5 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <span className={`text-[9px] font-sans block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Sức chịu tải nền đất:
                  </span>
                  <b className={`text-xs ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    {soilCapacityTonsPerM2} t/m²
                  </b>
                  <span className={`text-[8.5px] block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    R_soil cho phép
                  </span>
                </div>
              </div>
              <div className={`text-[10px] pt-0.5 flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {parseFloat(actualGBP) <= soilCapacityTonsPerM2 ? (
                  <>
                    <CheckCircle size={13} className={`shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                    <span>
                      Kết luận kiểm toán nền móng:{' '}
                      <b className={isLight ? 'text-emerald-800 font-bold' : 'text-emerald-400'}>
                        ĐẠT YÊU CẦU - Nền đất đủ khả năng chịu tải, không nguy cơ lún sụt.
                      </b>
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} className={`shrink-0 ${isLight ? 'text-rose-700' : 'text-rose-400'}`} />
                    <span>
                      Kết luận kiểm toán nền móng:{' '}
                      <b className={isLight ? 'text-rose-800 font-bold' : 'text-rose-400'}>
                        CẢNH BÁO LÚN SỤT - Áp lực chân vượt sức chịu tải nền đất! Cần tăng diện tích tấm lót (Mat).
                      </b>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* MỤC 5: CHECKLIST AN TOÀN NÂNG HẠ ASME B30.5 / OSHA */}
            <div
              className={`p-2.5 rounded-lg border space-y-1.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
              }`}
            >
              <div
                className={`font-bold uppercase tracking-wide border-b pb-0.5 flex items-center justify-between text-xs ${
                  isLight ? 'text-slate-900 border-slate-200' : 'text-slate-200 border-slate-800'
                }`}
              >
                <span>5. Danh mục Kiểm tra An toàn Thi công (ASME B30.5 / OSHA Checklist)</span>
                <span className={`text-[9.5px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  HSE Compliance
                </span>
              </div>
              <div className="grid grid-cols-4 gap-x-2 gap-y-1">
                {[
                  { k: 'groundChecked', text: 'Khảo sát nền đất, mặt bằng cứng vững' },
                  { k: 'outriggersInspected', text: 'Chân chống cẩu ra 100%, có lót thép/gỗ' },
                  { k: 'loadChartVerified', text: 'Kiểm tra bảng tải & bán kính với tải cẩu' },
                  { k: 'riggingHardwareInspected', text: 'Cáp cẩu, ma-nê, dây cẩu kiểm định' },
                  { k: 'windWithinLimits', text: 'Tốc độ gió < 11 m/s (cho phép thi công)' },
                  { k: 'taglinesAssigned', text: 'Bố trí 02 dây chằng định hướng (Tagline)' },
                  { k: 'communicationRadioReady', text: 'Bộ đàm, tín hiệu cẩu đã kiểm tra' },
                  { k: 'exclusionZoneBarricaded', text: 'Hàng rào phong tỏa vùng nguy hiểm' }
                ].map((item) => (
                  <div
                    key={item.k}
                    onClick={() => toggleCheck(item.k)}
                    className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
                      isLight ? 'hover:text-black' : 'hover:text-white'
                    }`}
                  >
                    {checklist[item.k] ? (
                      <CheckSquare
                        size={13}
                        className={`shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}
                      />
                    ) : (
                      <Square
                        size={13}
                        className={`shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}
                      />
                    )}
                    <span className={`text-[10px] ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* MỤC 6: CHỮ KÝ PHÊ DUYỆT 4 BÊN */}
            <div
              className={`pt-2 border-t grid grid-cols-4 gap-2 text-center shrink-0 ${
                isLight ? 'border-slate-300 text-slate-800' : 'border-slate-800 text-slate-200'
              }`}
            >
              <div>
                <div className="font-bold text-[9.5px] uppercase">THỢ VẬN HÀNH CẨU</div>
                <div className={`text-[8.5px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  (Ký & ghi rõ họ tên)
                </div>
                <div className="h-7" />
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className={`w-full text-center bg-transparent font-medium text-[10.5px] focus:outline-none print:hidden ${
                    isLight ? 'text-slate-900 border-b border-slate-300' : 'text-slate-200 border-b border-slate-800'
                  }`}
                />
                <div className="hidden print:block font-medium text-[10px] text-center border-b border-slate-300 pb-0.5 truncate">
                  {operator}
                </div>
              </div>
              <div>
                <div className="font-bold text-[9.5px] uppercase">KỸ SƯ AN TOÀN HSE</div>
                <div className={`text-[8.5px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  (Ký & ghi rõ họ tên)
                </div>
                <div className="h-7" />
                <input
                  type="text"
                  value={safetyOfficer}
                  onChange={(e) => setSafetyOfficer(e.target.value)}
                  className={`w-full text-center bg-transparent font-medium text-[10.5px] focus:outline-none print:hidden ${
                    isLight ? 'text-slate-900 border-b border-slate-300' : 'text-slate-200 border-b border-slate-800'
                  }`}
                />
                <div className="hidden print:block font-medium text-[10px] text-center border-b border-slate-300 pb-0.5 truncate">
                  {safetyOfficer}
                </div>
              </div>
              <div>
                <div className="font-bold text-[9.5px] uppercase">CHỈ HUY TRƯỞNG CÔNG TRƯỜNG</div>
                <div className={`text-[8.5px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  (Ký & ghi rõ họ tên)
                </div>
                <div className="h-7" />
                <input
                  type="text"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  className={`w-full text-center bg-transparent font-medium text-[10.5px] focus:outline-none print:hidden ${
                    isLight ? 'text-slate-900 border-b border-slate-300' : 'text-slate-200 border-b border-slate-800'
                  }`}
                />
                <div className="hidden print:block font-medium text-[10px] text-center border-b border-slate-300 pb-0.5 truncate">
                  {supervisor}
                </div>
              </div>
              <div>
                <div className="font-bold text-[9.5px] uppercase">ĐẠI DIỆN TƯ VẤN GIÁM SÁT</div>
                <div className={`text-[8.5px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  (Ký, đóng dấu phê duyệt)
                </div>
                <div className="h-7" />
                <div className={`text-[10.5px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Ký duyệt
                </div>
              </div>
            </div>

            {/* Sheet 1 Footer */}
            <div
              className={`mt-auto pt-1 flex justify-between items-center text-[9.5px] font-mono border-t shrink-0 ${
                isLight ? 'border-slate-300 text-slate-500' : 'border-slate-800 text-slate-500'
              }`}
            >
              <span>3D LIFT PLAN PRO • TÁC GIẢ: NGUYỄN ĐỨC THẮNG (0962.228.783)</span>
              <span>TIÊU CHUẨN ASME B30.5 / TCVN 4244:2005</span>
              <span className="font-bold">Trang 1 / 2</span>
            </div>
          </div>

        {/* Dấu phân cách trang khi xem trước (Ẩn khi in ấn) */}
        <div className="print:hidden my-6 py-2 flex items-center justify-center gap-3 select-none">
          <div className={`h-px flex-1 ${isLight ? 'bg-slate-300' : 'bg-slate-800'}`} />
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono border shadow-sm ${
              isLight
                ? 'bg-slate-100 border-slate-300 text-slate-700 font-semibold'
                : 'bg-slate-800/90 border-slate-700 text-slate-300 font-semibold'
            }`}
          >
            <FileText size={13} className={isLight ? 'text-sky-700' : 'text-sky-400'} />
            <span>HẾT TRANG 1 • CHUYỂN SANG TRANG 2: BẢN VẼ BỐ TRÍ 3D & KHUNG TÊN</span>
          </div>
          <div className={`h-px flex-1 ${isLight ? 'bg-slate-300' : 'bg-slate-800'}`} />
        </div>

        {/* ========================================================================= */}
        {/* TRANG 2 / 2: BỘ BẢN VẼ BỐ TRÍ BIỆN PHÁP THI CÔNG & PHỐI CẢNH 3D (CAD)    */}
        {/* ========================================================================= */}
        <div
          className={`report-page report-page-2 flex flex-col p-4 md:p-5 rounded-xl shadow-lg border gap-2.5 transition-colors print-page-break-before ${
            isLight ? 'bg-white text-slate-800 border-slate-300' : 'bg-slate-900 text-slate-100 border-slate-700'
          }`}
        >
          {/* Page 2 Header Banner */}
          <div
            className={`flex flex-row items-center justify-between border-b pb-1.5 gap-2 shrink-0 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Camera size={15} className={isLight ? 'text-sky-800' : 'text-sky-400'} />
              <span className={`font-bold uppercase tracking-wide text-xs truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                PHẦN II: HÌNH ẢNH MÔ HÌNH 3D & BẢN VẼ BỐ TRÍ BIỆN PHÁP CẨU (CAD & 3D VIEWS)
              </span>
            </div>

            {/* Quick Actions (Print Hidden) */}
            <div className="flex items-center gap-2 print:hidden shrink-0">
              <button
                type="button"
                onClick={handleAddView}
                disabled={drawingViews.length >= 6}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                  drawingViews.length >= 6
                    ? 'bg-slate-700/40 text-slate-400 cursor-not-allowed border border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                }`}
                title={
                  drawingViews.length >= 6
                    ? 'Đã đạt tối đa 6 ảnh cho trang 2'
                    : 'Thêm một khung hình ảnh bản vẽ / góc nhìn 3D mới (Tối đa 6 ảnh)'
                }
              >
                <Plus size={13} />
                <span>Thêm ảnh ({drawingViews.length}/6)</span>
              </button>
            </div>
          </div>

          {/* User Hint Bar (Always Hidden in Print) */}
          <div className="flex items-center justify-between text-[10px] text-amber-500 print:hidden font-medium px-0.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <Move size={12} className="text-amber-500 shrink-0" />
              <span>
                Nhấn <b>"Chỉnh góc"</b> để xoay/zoom căn góc 3D, hoặc <b>icon Tải lên</b> để thêm ảnh từ máy tính (Tối đa 6 ảnh)
              </span>
            </div>
            <span className="text-slate-400 text-[9.5px] hidden sm:inline">
              * Nhấn trực tiếp vào dòng chữ để sửa tiêu đề & chú thích
            </span>
          </div>

          {/* Dynamic Technical Drawings Gallery Grid (1 to 6 cards) */}
          <div
            className={`grid ${drawingViews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2.5`}
          >
            {drawingViews.map((img, idx) => {
              const imgSrc = getViewImageSrc(img.id);
              const count = drawingViews.length;
              // Substantially enlarged image viewport heights for crisp, large technical drawings
              const imgHeightClass =
                count <= 2
                  ? 'h-[360px] sm:h-[440px] md:h-[480px] print:h-[370px]'
                  : count <= 4
                  ? 'h-[270px] sm:h-[320px] md:h-[350px] print:h-[260px]'
                  : 'h-[220px] sm:h-[260px] md:h-[285px] print:h-[195px]';

              return (
                <div
                  key={img.id}
                  className={`rounded-lg border overflow-hidden flex flex-col group transition-all ${
                    isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-900 border-slate-800'
                  } ${count === 5 && idx === 4 ? 'col-span-2 sm:col-span-1 print:col-span-2' : ''}`}
                >
                  {/* Card Header: Icon + Editable Title + Toolbars */}
                  <div
                    className={`px-2.5 py-1.5 border-b flex items-center justify-between gap-1.5 shrink-0 ${
                      isLight
                        ? 'bg-slate-100 border-slate-200 text-slate-800'
                        : 'bg-slate-950/80 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[11px] flex-1 min-w-0">
                      {renderViewIcon(img.iconType, isLight)}
                      {/* Interactive screen edit input */}
                      <input
                        type="text"
                        value={img.title}
                        onChange={(e) => handleUpdateTitle(img.id, e.target.value)}
                        className={`print:hidden bg-transparent border-b border-transparent hover:border-slate-400 focus:border-amber-400 focus:bg-slate-800/10 px-1 py-0.5 rounded outline-none text-[11px] font-bold w-full truncate transition-all ${
                          isLight ? 'text-slate-800' : 'text-slate-200'
                        }`}
                        title="Nhấn để sửa tiêu đề hình vẽ"
                      />
                      {/* Exact print plain text */}
                      <span className="hidden print:inline-block truncate font-bold text-[11px]">
                        {img.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 print:hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveAdjustView({
                            key: img.id,
                            name: img.title,
                            defaultPreset: img.preset || 'current'
                          })
                        }
                        className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-500 dark:text-amber-400 border border-amber-500/50 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Dùng chuột xoay, zoom, kéo để căn chỉnh lại góc nhìn trong không gian 3D"
                      >
                        <Move size={11} />
                        <span className="hidden xs:inline">Chỉnh góc</span>
                      </button>

                      <label
                        className="text-slate-400 hover:text-sky-400 p-1 rounded hover:bg-slate-800/50 transition-colors cursor-pointer"
                        title="Tải ảnh từ máy tính cho hình này"
                      >
                        <Upload size={13} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(img.id, e)}
                          className="hidden"
                        />
                      </label>

                      {imgSrc && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadImage(imgSrc, `${img.id}.jpg`)
                          }
                          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/50 transition-colors"
                          title="Tải ảnh này về máy"
                        >
                          <Download size={13} />
                        </button>
                      )}

                      {drawingViews.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteView(img.id)}
                          className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                          title="Xóa ảnh này khỏi trang bản vẽ"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Image Viewport */}
                  <div
                    onClick={() =>
                      setActiveAdjustView({
                        key: img.id,
                        name: img.title,
                        defaultPreset: img.preset || 'current'
                      })
                    }
                    className={`relative ${imgHeightClass} bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer`}
                    title="Nhấn để dùng chuột căn chỉnh góc 3D này"
                  >
                    {imgSrc ? (
                      <>
                        <img
                          src={imgSrc}
                          alt={img.title}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity print:hidden">
                          <span className="bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xl">
                            <Move size={14} /> Dùng chuột chỉnh góc này
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3 text-slate-400 hover:text-amber-300 font-mono text-[11px] transition-colors">
                        <Camera size={26} className="mx-auto mb-1 text-sky-400 opacity-70" />
                        <span>Nhấn vào đây để căn góc 3D hoặc tải ảnh từ máy tính</span>
                      </div>
                    )}
                  </div>

                  {/* Card Caption */}
                  <div
                    className={`px-2.5 py-1 text-[10px] font-sans border-t shrink-0 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                        : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <b className="shrink-0">Chú thích:</b>
                      <input
                        type="text"
                        value={img.desc}
                        onChange={(e) => handleUpdateDesc(img.id, e.target.value)}
                        className={`print:hidden bg-transparent border-b border-transparent hover:border-slate-400 focus:border-amber-400 focus:bg-slate-800/10 px-1 py-0.5 rounded outline-none text-[10px] w-full transition-all ${
                          isLight ? 'text-slate-600' : 'text-slate-400'
                        }`}
                        title="Nhấn để sửa chú thích hình"
                      />
                      <span className="hidden print:inline-block truncate text-[10px]">
                        {img.desc}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Dashed placeholder for odd count (on screen only, hidden when printing) */}
            {drawingViews.length < 6 && drawingViews.length % 2 === 1 && (
              <div
                onClick={handleAddView}
                className={`rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-4 transition-all cursor-pointer group print:hidden min-h-[140px] ${
                  isLight
                    ? 'border-slate-300 hover:border-sky-500 hover:bg-sky-50/50 text-slate-500'
                    : 'border-slate-800 hover:border-sky-500/60 hover:bg-sky-950/20 text-slate-400'
                }`}
                title="Nhấn để thêm ảnh mới (Tối đa 6 ảnh)"
              >
                <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-400/30 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform text-sky-500">
                  <Plus size={18} />
                </div>
                <span className="font-bold text-[11px] group-hover:text-sky-500 transition-colors">
                  + Thêm ảnh thứ {drawingViews.length + 1}
                </span>
                <span className="text-[9.5px] text-slate-400 mt-0.5 text-center">
                  Căn chỉnh 3D hoặc tải ảnh từ máy tính (Tối đa 6 ảnh)
                </span>
              </div>
            )}
          </div>

          {/* Technical Drawing Title Block (Khung tên bản vẽ chuẩn CAD) */}
          <div
            className={`border-2 rounded-lg p-2.5 grid grid-cols-4 gap-2 text-[9.5px] font-mono shrink-0 ${
              isLight ? 'border-slate-400 bg-white text-slate-800' : 'border-slate-700 bg-slate-900 text-slate-300'
            }`}
          >
            <div className="border-r border-slate-300 pr-1.5">
              <div className="text-[8.5px] text-slate-500 uppercase">Dự án:</div>
              <div className="font-bold truncate">{projectName}</div>
              <div className="text-[8.5px] text-slate-500 mt-0.5 uppercase">Đơn vị thi công:</div>
              <div className="font-semibold truncate">{contractor}</div>
            </div>
            <div className="border-r border-slate-300 pr-1.5">
              <div className="text-[8.5px] text-slate-500 uppercase">Bản vẽ:</div>
              <div className="font-bold text-sky-700 uppercase">TỔNG MẶT BẰNG & PHỐI CẢNH 3D CẨU</div>
              <div className="text-[8.5px] text-slate-500 mt-0.5 uppercase">Số hiệu bản vẽ:</div>
              <div className="font-bold">DWG-01/02</div>
            </div>
            <div className="border-r border-slate-300 pr-1.5">
              <div className="text-[8.5px] text-slate-500 uppercase">Model cẩu:</div>
              <div className="font-bold">{crane?.name || 'Liebherr'}</div>
              <div className="text-[8.5px] text-slate-500 mt-0.5 uppercase">Cần / Bán kính / Tải:</div>
              <div className="font-semibold">{boomLength}m / {workingRadius}m / {grossLoad}t</div>
            </div>
            <div>
              <div className="text-[8.5px] text-slate-500 uppercase">Tỷ lệ: NTS | Ngày: {planDate}</div>
              <div className="text-[8.5px] text-slate-500 mt-0.5 uppercase">Phê duyệt:</div>
              <div className="font-bold text-emerald-700">ĐÃ DUYỆT THI CÔNG</div>
            </div>
          </div>

          {/* Sheet 2 Footer */}
          <div
            className={`mt-auto pt-1.5 flex justify-between items-center text-[9.5px] font-mono border-t shrink-0 ${
              isLight ? 'border-slate-300 text-slate-500' : 'border-slate-800 text-slate-500'
            }`}
          >
            <span>3D LIFT PLAN PRO • TÁC GIẢ: NGUYỄN ĐỨC THẮNG (0962.228.783)</span>
            <span>BẢN VẼ BIỆN PHÁP THI CÔNG NÂNG HẠ</span>
            <span className="font-bold">Trang 2 / 2</span>
          </div>
        </div>
        </div>
      </div>

      {/* Modal Căn chỉnh Góc nhìn 3D Tương tác Bằng Chuột */}
      {activeAdjustView && (
        <Report3DAdjustModal
          isOpen={!!activeAdjustView}
          onClose={() => setActiveAdjustView(null)}
          viewKey={activeAdjustView.key}
          viewName={activeAdjustView.name}
          defaultPreset={activeAdjustView.defaultPreset}
          crane={crane}
          boomLength={boomLength}
          workingRadius={workingRadius}
          slewAngle={slewAngle}
          boomAngle={boomAngle}
          hookElevation={hookElevation}
          loadElevation={loadElevation}
          loadConfig={loadConfig}
          riggingConfig={riggingConfig}
          outriggerReactions={outriggerReactions}
          soilCapacityTonsPerM2={soilCapacityTonsPerM2}
          matLength={matLength}
          matWidth={matWidth}
          obstacles={obstacles}
          onSaveView={(key, dataUrl) => {
            setCustomImages((prev) => ({ ...prev, [key]: dataUrl }));
            if (onUpdateViewImage) {
              onUpdateViewImage(key, dataUrl);
            }
          }}
          onSwitchToExternal={(key, name, preset) => {
            setActiveAdjustView(null);
            if (onStartAdjustView) {
              onStartAdjustView(key, name, preset);
            }
          }}
        />
      )}
    </div>
  );
}
