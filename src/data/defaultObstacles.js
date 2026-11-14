// Bố trí mặt bằng công trường mẫu chuẩn kỹ thuật & thẩm mỹ cao
// (Standard Civil & Industrial Construction Site Layout)

export const DEFAULT_OBSTACLES = [
  {
    id: 'obs-4',
    name: 'Nhà xưởng kết cấu thép (2 mái)',
    type: 'workshop',
    enabled: true,
    posX: -61.6,
    posZ: 12.6,
    rotationY: 90,
    width: 72,
    length: 108,
    height: 7.5,
    roofPitch: 5,
    diameter: 6,
    wireSpan: 30,
    depth: 3
  },
  {
    id: 'obs-1793763296763',
    name: 'Nhà xưởng kết cấu thép',
    type: 'building',
    enabled: true,
    wallMode: 'points',
    height: 11,
    thickness: 0.25,
    isClosed: true,
    boundaryPoints: [
      {
        id: 'bp-1-1793763296763',
        name: 'Mốc 1 (Trước - Trái)',
        x: -22,
        z: -20
      },
      {
        id: 'bp-2-1793763296763',
        name: 'Mốc 2 (Trước - Phải)',
        x: 22,
        z: -20
      },
      {
        id: 'bp-3-1793763296763',
        name: 'Mốc 3 (Sau - Phải)',
        x: 22,
        z: 22
      },
      {
        id: 'bp-4-1793763296763',
        name: 'Mốc 4 (Sau - Trái)',
        x: -22,
        z: 22
      }
    ],
    posX: -6,
    posZ: -6.6,
    rotationY: 0,
    width: 3.2,
    length: 5.1,
    roofPitch: 2.5,
    diameter: 6,
    wireSpan: 35,
    depth: 3.5
  }
];

export const DEFAULT_LIFT_POINTS = [
  {
    id: 'pt-1',
    name: 'Điểm 1: Đón tải (Pick Point)',
    radius: 13.3,
    slew: 177,
    elevation: 0.5,
    loadRotation: 90
  },
  {
    id: 'pt-2',
    name: 'Điểm 2: Nâng né công trình (Waypoint 1)',
    radius: 14.1,
    slew: 160,
    elevation: 12.6,
    hasCustomRotation: false,
    loadRotation: 45
  },
  {
    id: 'pt-3',
    name: 'Điểm 3: Đặt tải (Set Point)',
    radius: 13.1,
    slew: 120,
    elevation: 10.9,
    hasCustomRotation: true,
    loadRotation: 0
  }
];
