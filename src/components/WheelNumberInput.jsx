import React, { useState, useEffect } from 'react';

/**
 * Number input with quick Mouse Wheel scroll adjustment support
 * Supports negative numbers for Cartesian coordinates (X, Z)
 * Supports wrapAround for 360° circular angles (0 -> 360 -> 0)
 */
export default function WheelNumberInput({
  value,
  onChange,
  min = -999,
  max = 999,
  step = 1,
  unit = '',
  className = '',
  precision = 1,
  wrapAround = false
}) {
  const [textVal, setTextVal] = useState(
    value !== undefined && value !== null ? String(value) : ''
  );
  const [isFocused, setIsFocused] = useState(false);

  // Synchronize internal text with incoming value prop
  useEffect(() => {
    if (!isFocused) {
      setTextVal(value !== undefined && value !== null ? String(value) : '');
    } else {
      const parsed = parseFloat(textVal);
      if (isNaN(parsed) || Math.abs(parsed - value) > 1e-6) {
        setTextVal(value !== undefined && value !== null ? String(value) : '');
      }
    }
  }, [value, isFocused]);

  const stepValue = (val, delta, stepAmount) => {
    if (wrapAround && max > min) {
      if (delta < 0) {
        if (val <= min) return max;
        return Math.max(min, val - stepAmount);
      } else {
        if (val >= max) return min;
        return Math.min(max, val + stepAmount);
      }
    } else {
      const next = val + (delta > 0 ? stepAmount : -stepAmount);
      return Math.min(max, Math.max(min, next));
    }
  };

  const wrapInput = (val) => {
    if (!wrapAround || max <= min) {
      return Math.min(max, Math.max(min, val));
    }
    const range = max - min;
    if (val < min) {
      const remainder = (min - val) % range;
      return remainder === 0 ? max : max - remainder;
    } else if (val > max) {
      const remainder = (val - max) % range;
      return remainder === 0 ? min : min + remainder;
    }
    return val;
  };

  const handleWheel = (e) => {
    // Chỉ kích hoạt khi ấn Shift hoặc khi ô nhập liệu đang được focus (click vào)
    // Giúp cuộn danh sách mượt mà, không bị nhảy số nhầm khi lăn chuột lướt qua
    if (!e.shiftKey && !isFocused) return;

    e.preventDefault();
    // Trên Windows Chrome/Edge, Shift + lăn chuột dọc thường sinh ra deltaX thay vì deltaY
    const rawDelta = Math.abs(e.deltaY) > 0 ? e.deltaY : e.deltaX;
    if (rawDelta === 0) return;
    const delta = rawDelta < 0 ? 1 : -1;

    // Giữ Alt hoặc Ctrl để tinh chỉnh nhỏ (0.1) nếu cần
    const actualStep = (e.altKey || e.ctrlKey) ? Math.max(0.1, step * 0.1) : step;
    const current = typeof value === 'number' ? value : parseFloat(textVal) || 0;
    const nextVal = stepValue(current, delta, actualStep);
    const rounded = parseFloat(nextVal.toFixed(precision));
    setTextVal(String(rounded));
    onChange(rounded);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const current = typeof value === 'number' ? value : parseFloat(textVal) || 0;
      const nextVal = stepValue(current, 1, step);
      const rounded = parseFloat(nextVal.toFixed(precision));
      setTextVal(String(rounded));
      onChange(rounded);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const current = typeof value === 'number' ? value : parseFloat(textVal) || 0;
      const nextVal = stepValue(current, -1, step);
      const rounded = parseFloat(nextVal.toFixed(precision));
      setTextVal(String(rounded));
      onChange(rounded);
    }
  };

  const handleChange = (e) => {
    let raw = e.target.value;

    // Filter characters: allow digits, single minus sign at start, single decimal point
    raw = raw.replace(/[^0-9.-]/g, '');
    if (raw.indexOf('-') > 0) {
      raw = raw.charAt(0) + raw.slice(1).replace(/-/g, '');
    }
    if (min >= 0 && raw.includes('-')) {
      raw = raw.replace(/-/g, '');
    }
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }

    setTextVal(raw);

    // Intermediate typing states that shouldn't update parent yet
    if (raw === '' || raw === '-' || raw === '-.' || raw === '.') return;

    const val = parseFloat(raw);
    if (!isNaN(val)) {
      const finalVal = wrapInput(val);
      onChange(parseFloat(finalVal.toFixed(precision)));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (textVal === '' || textVal === '-' || textVal === '-.' || textVal === '.') {
      const fallback = Math.max(min, Math.min(max, 0));
      setTextVal(String(fallback));
      onChange(fallback);
    } else {
      const val = parseFloat(textVal);
      if (isNaN(val)) {
        setTextVal(String(value ?? 0));
      } else {
        const clamped = Math.max(min, Math.min(max, val));
        const formatted = parseFloat(clamped.toFixed(precision));
        setTextVal(String(formatted));
        onChange(formatted);
      }
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <input
        type="text"
        inputMode="decimal"
        value={textVal}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onChange={handleChange}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        title={
          wrapAround
            ? 'Ấn shift và lăn chuột (xoay 0° ↔ 360°)'
            : 'Ấn shift và lăn chuột'
        }
        className={`focus:outline-none transition-colors ${className}`}
      />
      {unit && (
        <span className="absolute right-2 text-xs text-slate-400 font-mono pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  );
}
