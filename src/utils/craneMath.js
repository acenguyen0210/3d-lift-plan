// Crane Kinematics, Load Chart Interpolation, Outrigger Reactions & Rigging Physics

/**
 * Bilinear / nearest interpolation for rated crane capacity
 */
export function getRatedCapacity(crane, boomLength, radius, counterweight, outriggerRatio = 1.0) {
  if (!crane || !crane.loadCharts) return { capacity: 0, status: 'NO_CHART', message: 'Không có dữ liệu bảng tải' };

  // Find best matching chart key (e.g. '9.0t_100%')
  const chartKeys = Object.keys(crane.loadCharts);
  if (chartKeys.length === 0) return { capacity: 0, status: 'NO_CHART', message: 'Không có bảng tải' };

  // Prioritize matching counterweight
  let selectedKey = chartKeys[0];
  let minDiff = Infinity;
  for (const key of chartKeys) {
    const parts = key.split('_');
    const cwVal = parseFloat(parts[0]);
    if (!isNaN(cwVal)) {
      const diff = Math.abs(cwVal - counterweight);
      if (diff < minDiff) {
        minDiff = diff;
        selectedKey = key;
      }
    }
  }

  const chartData = crane.loadCharts[selectedKey];
  if (!chartData || !chartData.chart) {
    return { capacity: 0, status: 'NO_DATA', message: 'Dữ liệu cấu hình không khả dụng' };
  }

  const radii = chartData.radii;
  const boomLengths = chartData.boomLengths;

  // Boundary check
  const minRad = radii[0];
  const maxRad = radii[radii.length - 1];
  const minBoom = boomLengths[0];
  const maxBoom = boomLengths[boomLengths.length - 1];

  if (radius < minRad) {
    return {
      capacity: 0,
      status: 'RADIUS_TOO_SMALL',
      message: `Bán kính ${radius.toFixed(1)}m nhỏ hơn bán kính min (${minRad}m)`
    };
  }

  if (radius > maxRad) {
    return {
      capacity: 0,
      status: 'RADIUS_TOO_LARGE',
      message: `Bán kính ${radius.toFixed(1)}m vượt quá bán kính max (${maxRad}m)`
    };
  }

  if (boomLength > maxBoom + 0.1) {
    return {
      capacity: 0,
      status: 'BOOM_TOO_LONG',
      message: `Cần ${boomLength.toFixed(1)}m dài hơn chiều dài cần max (${maxBoom}m)`
    };
  }

  // Find surrounding boom lengths
  let bIdx0 = 0;
  for (let i = 0; i < boomLengths.length; i++) {
    if (boomLengths[i] <= boomLength) bIdx0 = i;
    else break;
  }
  let bIdx1 = Math.min(bIdx0 + 1, boomLengths.length - 1);
  if (bIdx0 === bIdx1 && bIdx0 > 0 && boomLength < boomLengths[bIdx0]) {
    bIdx0--;
  }

  // Find surrounding radii
  let r0 = radii[0];
  let r1 = radii[radii.length - 1];
  for (let i = 0; i < radii.length; i++) {
    if (radii[i] <= radius) r0 = radii[i];
    if (radii[i] >= radius) {
      r1 = radii[i];
      break;
    }
  }

  // Read raw values
  const cap_r0_b0 = chartData.chart[r0]?.[bIdx0] ?? null;
  const cap_r0_b1 = chartData.chart[r0]?.[bIdx1] ?? cap_r0_b0;
  const cap_r1_b0 = chartData.chart[r1]?.[bIdx0] ?? null;
  const cap_r1_b1 = chartData.chart[r1]?.[bIdx1] ?? cap_r1_b0;

  if (cap_r0_b0 === null && cap_r1_b0 === null && cap_r0_b1 === null && cap_r1_b1 === null) {
    return {
      capacity: 0,
      status: 'OUT_OF_CHART',
      message: `Vị trí R=${radius.toFixed(1)}m, L=${boomLength.toFixed(1)}m nằm ngoài phạm vi cho phép`
    };
  }

  // Interpolate along radius first
  const rRatio = (r1 === r0) ? 0 : (radius - r0) / (r1 - r0);
  
  // Safe helper to interpolate or fall back
  const interp1D = (v0, v1, t) => {
    if (v0 !== null && v1 !== null) return v0 + (v1 - v0) * t;
    if (v0 !== null) return v0;
    if (v1 !== null) return v1;
    return null;
  };

  const cap_b0 = interp1D(cap_r0_b0, cap_r1_b0, rRatio);
  const cap_b1 = interp1D(cap_r0_b1, cap_r1_b1, rRatio);

  let rawCapacity = 0;
  const b0 = boomLengths[bIdx0];
  const b1 = boomLengths[bIdx1];
  const bRatio = (b1 === b0) ? 0 : (boomLength - b0) / (b1 - b0);

  if (cap_b0 !== null && cap_b1 !== null) {
    rawCapacity = cap_b0 + (cap_b1 - cap_b0) * bRatio;
  } else if (cap_b0 !== null) {
    rawCapacity = cap_b0;
  } else if (cap_b1 !== null) {
    rawCapacity = cap_b1;
  } else {
    return {
      capacity: 0,
      status: 'OUT_OF_CHART',
      message: 'Không khả dụng tại bán kính này'
    };
  }

  // Apply outrigger spread derating factor if applicable
  let outriggerFactor = 1.0;
  if (outriggerRatio < 0.99) {
    // Standard engineering conservative derating curve for partial outrigger extension
    outriggerFactor = Math.pow(outriggerRatio, 1.25);
  }

  const finalCapacity = Math.round(rawCapacity * outriggerFactor * 100) / 100;

  return {
    capacity: Math.max(0, finalCapacity),
    status: 'VALID',
    message: 'Hợp lệ',
    baseCapacity: rawCapacity,
    outriggerFactor
  };
}

/**
 * Rigging Sling Tension Calculation
 * @param {number} grossLoad Total weight (tons)
 * @param {number} slingLegs Number of legs (1, 2, 3, 4)
 * @param {number} slingAngleDeg Angle from horizontal (degrees, typically 45-60)
 */
export function calculateSlingTension(grossLoad, slingLegs = 2, slingAngleDeg = 60) {
  const rad = (slingAngleDeg * Math.PI) / 180;
  const sinAlpha = Math.sin(rad);
  
  // Safe check
  if (sinAlpha <= 0.05 || slingLegs < 1) {
    return { tensionPerLeg: 0, safetyStatus: 'INVALID', loadFactor: 0 };
  }

  // Load factor L/H = 1 / sin(angle)
  const loadFactor = 1 / sinAlpha;
  // In a 4-leg sling, standard rigging practice assumes 2 legs carry the primary diagonal load
  const effectiveLegs = slingLegs >= 4 ? 3 : slingLegs;
  const tensionPerLeg = (grossLoad / effectiveLegs) * loadFactor;

  let warning = null;
  if (slingAngleDeg < 45) {
    warning = 'Góc chằng buộc < 45°: Lực kéo căng dây tăng cao đột biến, nguy cơ đứt cáp và gãy xà kẹp!';
  } else if (slingAngleDeg < 60) {
    warning = 'Góc chằng buộc < 60°: Khuyến nghị tăng chiều dài cáp để đạt góc 60° tiêu chuẩn';
  }

  return {
    tensionPerLeg: Math.round(tensionPerLeg * 100) / 100,
    loadFactor: Math.round(loadFactor * 100) / 100,
    effectiveLegs,
    warning
  };
}

/**
 * Boom Kinematics: Calculate boom angle, tip height, clearance
 */
export function calculateBoomKinematics(boomLength, radius, pivotY = 2.45, pivotOffsetForward = 1.0) {
  const effectiveRadius = Math.max(0.5, radius - pivotOffsetForward);
  
  if (effectiveRadius > boomLength) {
    return {
      boomAngleDeg: 0,
      tipHeight: pivotY,
      isValid: false,
      message: 'Bán kính lớn hơn chiều dài cần!'
    };
  }

  const cosTheta = effectiveRadius / boomLength;
  const thetaRad = Math.acos(Math.min(1.0, Math.max(0.0, cosTheta)));
  const boomAngleDeg = (thetaRad * 180) / Math.PI;
  const tipHeight = pivotY + boomLength * Math.sin(thetaRad);

  return {
    boomAngleDeg: Math.round(boomAngleDeg * 10) / 10,
    tipHeight: Math.round(tipHeight * 10) / 10,
    isValid: true,
    message: 'Hợp lệ'
  };
}

/**
 * 4-Point Outrigger Reaction Calculation
 * Computes individual outrigger loads (FL, FR, RL, RR) based on slewing angle & moments
 */
export function calculateOutriggerReactions({
  tareWeight,
  counterweight,
  grossLoad,
  radius,
  slewAngleDeg,
  outriggerLength,
  outriggerWidth,
  tailSwingRadius = 4.0
}) {
  const totalWeight = tareWeight + counterweight + grossLoad;
  const slewRad = (slewAngleDeg * Math.PI) / 180;

  // Longitudinal (X) and Transverse (Z) coordinates of load and counterweight
  // Coordinate convention: 0 deg = boom facing forward (+X)
  const loadX = radius * Math.cos(slewRad);
  const loadZ = radius * Math.sin(slewRad);

  // Counterweight is 180 deg opposite the boom
  const cwX = -tailSwingRadius * Math.cos(slewRad);
  const cwZ = -tailSwingRadius * Math.sin(slewRad);

  // Moments about center of rotation
  const momentX = grossLoad * loadX + counterweight * cwX; // longitudinal moment
  const momentZ = grossLoad * loadZ + counterweight * cwZ; // lateral/transverse moment

  const halfL = outriggerLength / 2;
  const halfW = outriggerWidth / 2;
  const quarterW = totalWeight / 4;

  // Reaction components from moments:
  // FL (+X, -Z or Left), FR (+X, +Z or Right), RL (-X, -Z), RR (-X, +Z)
  const dX_F = (momentX / (2 * halfL)) / 2; // load shift to front
  const dZ_L = (-momentZ / (2 * halfW)) / 2; // load shift to left/right

  let FL = quarterW + dX_F + dZ_L;
  let FR = quarterW + dX_F - dZ_L;
  let RL = quarterW - dX_F + dZ_L;
  let RR = quarterW - dX_F - dZ_L;

  // Physical realism check: Reaction cannot be negative without tipping/anchorage
  FL = Math.max(0, Math.round(FL * 10) / 10);
  FR = Math.max(0, Math.round(FR * 10) / 10);
  RL = Math.max(0, Math.round(RL * 10) / 10);
  RR = Math.max(0, Math.round(RR * 10) / 10);

  const maxReaction = Math.max(FL, FR, RL, RR);
  const maxReactionLeg = FL === maxReaction ? 'FL (Trước - Trái)' :
                         FR === maxReaction ? 'FR (Trước - Phải)' :
                         RL === maxReaction ? 'RL (Sau - Trái)' : 'RR (Sau - Phải)';

  return {
    FL,
    FR,
    RL,
    RR,
    totalWeight: Math.round(totalWeight * 10) / 10,
    maxReaction,
    maxReactionLeg
  };
}

/**
 * Ground Bearing Pressure (GBP) & Mat Sizing Calculation
 */
export function calculateGroundBearingPressure({
  maxReactionTons,
  matLength = 2.0,
  matWidth = 2.0,
  allowableSoilCapacityTonsPerM2 = 25.0
}) {
  const matArea = Math.max(0.1, matLength * matWidth);
  // Actual pressure on soil
  const actualPressure = maxReactionTons / matArea;
  const actualPressureKPa = actualPressure * 9.80665;
  const allowablePressureKPa = allowableSoilCapacityTonsPerM2 * 9.80665;

  const ratio = (actualPressure / allowableSoilCapacityTonsPerM2) * 100;
  const isSafe = actualPressure <= allowableSoilCapacityTonsPerM2;

  // Recommended minimum mat area with a 1.25 safety factor
  const requiredMatArea = (maxReactionTons * 1.25) / allowableSoilCapacityTonsPerM2;
  const recommendedSide = Math.ceil(Math.sqrt(requiredMatArea) * 10) / 10;

  let status = 'SAFE';
  let message = 'Áp lực tiếp đất an toàn (Đạt yêu cầu)';
  if (ratio > 100) {
    status = 'DANGER';
    message = `NGUY HIỂM: Áp lực chân chống vượt quá sức chịu tải nền đất (${ratio.toFixed(0)}%). Nguy cơ lún sụt lật cẩu! Cần tăng kích thước tấm lót!`;
  } else if (ratio > 85) {
    status = 'WARNING';
    message = `CẢNH BÁO: Áp lực tiếp đất gần ngưỡng giới hạn (${ratio.toFixed(0)}%). Khuyến nghị bổ sung tôn lót chống lún.`;
  }

  return {
    matArea: Math.round(matArea * 100) / 100,
    actualPressure: Math.round(actualPressure * 100) / 100,
    actualPressureKPa: Math.round(actualPressureKPa * 10) / 10,
    allowableSoilCapacityTonsPerM2,
    allowablePressureKPa: Math.round(allowablePressureKPa * 10) / 10,
    ratio: Math.round(ratio * 10) / 10,
    isSafe,
    status,
    message,
    requiredMatArea: Math.round(requiredMatArea * 100) / 100,
    recommendedMatDim: `${recommendedSide}m x ${recommendedSide}m`
  };
}

/**
 * Wind Derating & Pressure Calculation
 */
export function calculateWindEffect(windSpeedMs, loadExposedAreaM2 = 5.0, maxCraneWindSpeed = 11.0) {
  // Air density ~ 1.225 kg/m^3
  const q_Pa = 0.5 * 1.225 * Math.pow(windSpeedMs, 2);
  const q_kN = q_Pa / 1000;
  // Drag coefficient Cd ~ 1.2 for structural boxes/containers
  const windForceKN = q_kN * 1.2 * loadExposedAreaM2;
  const windForceTons = windForceKN / 9.80665;

  const isExceeded = windSpeedMs > maxCraneWindSpeed;
  let status = 'NORMAL';
  let warning = null;

  if (isExceeded) {
    status = 'PROHIBITED';
    warning = `CẤM CẨU: Tốc độ gió ${windSpeedMs} m/s vượt quá giới hạn thiết bị (${maxCraneWindSpeed} m/s)!`;
  } else if (windSpeedMs >= maxCraneWindSpeed * 0.8) {
    status = 'CAUTION';
    warning = `GIÓ MẠNH: Tốc độ gió đạt ${windSpeedMs} m/s (gần ngưỡng ${maxCraneWindSpeed} m/s). Cần gắn dây kéo giữ thăng bằng (taglines).`;
  }

  return {
    windSpeedMs,
    windPressurePa: Math.round(q_Pa * 10) / 10,
    windForceTons: Math.round(windForceTons * 100) / 100,
    isExceeded,
    status,
    warning
  };
}

/**
 * Overall Lift Safety Assessment Category
 */
export function getLiftCategory(liftPercentage) {
  if (liftPercentage > 100) {
    return {
      code: 'OVERLOAD',
      label: 'QUÁ TẢI - CẤM NÂNG',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      description: 'Tổng tải trọng vượt quá khả năng chịu tải của cẩu tại bán kính này. Cực kỳ nguy hiểm, nguy cơ gãy cần hoặc lật cẩu!'
    };
  }
  if (liftPercentage >= 85) {
    return {
      code: 'CRITICAL',
      label: 'CẨU NGUY HIỂM (CRITICAL LIFT)',
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.15)',
      description: 'Tải cẩu từ 85% - 100% dung lượng. Bắt buộc lập phương án nâng hạ bằng văn bản, có chữ ký phê duyệt của Giám đốc An toàn & Chỉ huy trưởng.'
    };
  }
  if (liftPercentage >= 75) {
    return {
      code: 'HEAVY',
      label: 'TẢI CAO (HEAVY LIFT)',
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.15)',
      description: 'Tải cẩu từ 75% - 85%. Cần kiểm tra kỹ tốc độ gió, nền đất và giám sát liên tục.'
    };
  }
  return {
    code: 'SAFE',
    label: 'CẨU AN TOÀN (SAFE LIFT)',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    description: 'Tải cẩu dưới 75% sức nâng định mức. Hoạt động an toàn trong điều kiện làm việc tiêu chuẩn.'
  };
}

