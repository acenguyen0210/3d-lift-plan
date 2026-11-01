import React from 'react';
import { X, ShieldCheck, Award, FileText, CheckCircle2, Truck, User, Phone } from 'lucide-react';

export default function CopyrightModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-amber-500 flex items-center justify-center shadow-md shadow-sky-500/20">
              <Truck className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider bg-gradient-to-r from-sky-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
                3D LIFT PLAN PRO
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Phiên bản Kỹ thuật V2.0 • Crane Engineering Software
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Author & Creator Information Card */}
          <div className="bg-gradient-to-br from-sky-950/60 via-slate-950/70 to-slate-900 border border-sky-500/40 p-4 rounded-xl space-y-2.5 shadow-lg shadow-sky-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-[11px]">
                <User size={16} />
                <span>Tác giả Phát triển & Bản quyền</span>
              </div>
              <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
                Chủ sở hữu
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <div className="text-base font-black text-white tracking-wide">
                  NGUYỄN ĐỨC THẮNG
                </div>
              </div>
              <a
                href="tel:0962228783"
                className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all w-fit cursor-pointer shadow-sm hover:shadow-emerald-500/20"
                title="Gọi điện hoặc liên hệ qua Zalo: 0962.228.783"
              >
                <Phone size={14} className="text-emerald-400 shrink-0" />
                <span>0962.228.783</span>
              </a>
            </div>
          </div>

          {/* Copyright Notice Box */}
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-[11px]">
              <ShieldCheck size={16} />
              <span>Phạm vi Bảo hộ Bản quyền</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
              <b>© 2026 3D LIFT PLAN PRO.</b> Bản quyền thuộc về tác giả <b>Nguyễn Đức Thắng</b>. Mọi quyền được bảo lưu (All Rights Reserved).
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Hệ thống chuyên dụng tính toán động học cần cẩu, kiểm toán sức nâng SWL, phản lực chân chống và mô phỏng quỹ đạo đa điểm 3D chuẩn xác.
            </p>
          </div>

          {/* Standards Compliance */}
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
              <Award size={16} />
              <span>Quy chuẩn & Tiêu chuẩn Kỹ thuật Áp dụng</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><b>ASME B30.5</b> – Mobile and Locomotive Cranes (Quy chuẩn Cần cẩu Mỹ)</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><b>OSHA 29 CFR 1926.1400</b> – Cranes & Derricks in Construction</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><b>TCVN 4244:2005</b> – Quy phạm kỹ thuật an toàn thiết bị nâng hạ Việt Nam</span>
              </div>
            </div>
          </div>

          {/* Engineering Disclaimer */}
          <div className="bg-slate-950/60 border border-amber-500/20 p-3.5 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
              <FileText size={16} />
              <span>Khuyến cáo Kỹ thuật & Trách nhiệm Pháp lý</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Phần mềm được phát triển nhằm hỗ trợ các kỹ sư lập biện pháp, tính toán tải trọng cẩu, bán kính, góc cần, áp lực tiếp đất và mô phỏng quỹ đạo đa điểm 3D.
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Mọi biện pháp thi công nâng hạ thực tế tại công trường cần được Kỹ sư an toàn (HSE) và Chỉ huy trưởng dự án kiểm tra, ký duyệt theo đúng điều kiện địa chất và quy trình an toàn lao động hiện hành.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Hệ thống Bản quyền phần mềm 3D Lift Plan</span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

