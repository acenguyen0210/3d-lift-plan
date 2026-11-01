function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return Math.hypot(px - ax, pz - az);
  let t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/**
 * Multi-Obstacle Clearance & OSHA Power Line Minimum Approach Distance Calculator
 */
export function calculateClearance({
  boomTipX,
  boomTipY,
  boomTipZ,
  loadX,
  loadY,
  loadZ,
  obstacles = []
}) {
  if (!obstacles || obstacles.length === 0) {
    return {
      minDistance: Infinity,
      closestObstacle: null,
      status: 'SAFE',
      isCollisionRisk: false,
      isPowerLineHazard: false,
      message: 'Không có vật cản nào trên hiện trường.'
    };
  }

  let minDistance = Infinity;
  let closestObstacle = null;
  let isPowerLineHazard = false;

  obstacles.forEach((obs) => {
    if (!obs.enabled) return;

    let dist = Infinity;
    const obsX = obs.posX || 0;
    const obsZ = obs.posZ || 0;
    const obsH = obs.height || 10;

    if (obs.type === 'cylinder') {
      const radius = (obs.diameter || obs.width || 6) * 0.5;
      const dHorizontal = Math.hypot(loadX - obsX, loadZ - obsZ) - radius;
      const dVertical = loadY > obsH ? loadY - obsH : 0;
      dist = Math.hypot(Math.max(0, dHorizontal), dVertical);
    } else if (obs.type === 'power_pole') {
      // Check clearance to overhead power lines
      const armW = (obs.width || 8) * 0.5;
      const spanL = (obs.wireSpan || obs.length || 35) * 0.5;
      const dx = Math.max(0, Math.abs(boomTipX - obsX) - armW);
      const dz = Math.max(0, Math.abs(boomTipZ - obsZ) - spanL);
      const dy = Math.max(0, Math.abs(boomTipY - obsH));
      dist = Math.hypot(dx, dy, dz);

      // OSHA Power line rule: Minimum 3.05m (10ft) clearance!
      if (dist < 3.05) {
        isPowerLineHazard = true;
      }
    } else if (obs.type === 'workshop') {
      // Pre-engineered steel workshop / factory
      const halfW = (obs.width || 18) * 0.5;
      const halfL = (obs.length || 30) * 0.5;
      const totalH = (obs.height || 8.5) + (obs.roofPitch || 2.5);
      const dx = Math.max(0, Math.abs(loadX - obsX) - halfW);
      const dz = Math.max(0, Math.abs(loadZ - obsZ) - halfL);
      const dy = loadY > totalH ? loadY - totalH : 0;
      dist = Math.hypot(dx, dz, dy);
    } else if (obs.type === 'wall' && obs.boundaryPoints && obs.boundaryPoints.length >= 2) {
      // Perimeter fence with boundary enclosure points
      const pts = obs.boundaryPoints;
      const isClosed = obs.isClosed !== false;
      let minWallDist = Infinity;

      for (let i = 0; i < pts.length - 1; i++) {
        const d = distToSegment(loadX, loadZ, pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
        if (d < minWallDist) minWallDist = d;
      }
      if (isClosed && pts.length >= 3) {
        const d = distToSegment(loadX, loadZ, pts[pts.length - 1].x, pts[pts.length - 1].z, pts[0].x, pts[0].z);
        if (d < minWallDist) minWallDist = d;
      }

      const wallH = obs.height || 2.8;
      const dy = loadY > wallH ? loadY - wallH : 0;
      dist = Math.hypot(Math.max(0, minWallDist - (obs.thickness || 0.25) * 0.5), dy);
    } else {
      // Building, Wall, Trench (Box perimeter)
      const halfW = (obs.width || 8) * 0.5;
      const halfL = (obs.length || 10) * 0.5;
      const dx = Math.max(0, Math.abs(loadX - obsX) - halfW);
      const dz = Math.max(0, Math.abs(loadZ - obsZ) - halfL);
      const dy = loadY > obsH ? loadY - obsH : 0;
      dist = Math.hypot(dx, dz, dy);
    }

    if (dist < minDistance) {
      minDistance = dist;
      closestObstacle = obs;
    }
  });

  const isCollisionRisk = minDistance < 2.0;
  const isCaution = minDistance >= 2.0 && minDistance < 3.5;

  let status = 'SAFE';
  let message = 'Khoảng cách an toàn đảm bảo quy chuẩn công trường (> 3.5m).';

  if (isPowerLineHazard) {
    status = 'POWER_LINE_DANGER';
    message = `⚡ CỰC KỲ NGUY HIỂM: Vi phạm khoảng cách an toàn điện cao thế OSHA (< 3.05m / 10ft)! Nguy cơ phóng điện chết người!`;
  } else if (isCollisionRisk) {
    status = 'COLLISION_RISK';
    message = `CẢNH BÁO NGUY HIỂM: Cự ly tới "${closestObstacle?.name || 'Vật cản'}" < 2.0m! Nguy cơ va chạm cần cẩu hoặc vật nâng!`;
  } else if (isCaution) {
    status = 'CAUTION';
    message = `CHÚ Ý: Cự ly tới "${closestObstacle?.name || 'Vật cản'}" từ 2.0m - 3.5m. Cần thợ xi-nhan giám sát chặt chẽ.`;
  }

  return {
    minDistance: minDistance === Infinity ? 99 : Math.round(minDistance * 10) / 10,
    closestObstacle,
    status,
    isCollisionRisk,
    isPowerLineHazard,
    message
  };
}

