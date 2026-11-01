// Bố trí mặt bằng công trường mẫu chuẩn kỹ thuật & thẩm mỹ cao
// (Standard Civil & Industrial Construction Site Layout)

export const DEFAULT_OBSTACLES = [
  {
    id: 'obs-1',
    name: 'Tòa nhà thi công A',
    type: 'building',
    enabled: true,
    posX: 20.0,
    posZ: 14.0,
    rotationY: 0,
    width: 9.0,
    length: 13.0,
    height: 14.0,
    diameter: 6.0,
    wireSpan: 30.0,
    depth: 3.0
  },
  {
    id: 'obs-2',
    name: 'Đường điện cao thế 110kV',
    type: 'power_pole',
    enabled: true,
    posX: -25.0,
    posZ: -12.0,
    rotationY: 0,
    width: 8.0,
    length: 32.0,
    height: 18.0,
    diameter: 6.0,
    wireSpan: 32.0,
    depth: 3.0
  },
  {
    id: 'obs-3',
    name: 'Bồn chứa dầu / Hóa chất',
    type: 'cylinder',
    enabled: true,
    posX: 16.0,
    posZ: -15.0,
    rotationY: 0,
    width: 7.0,
    length: 7.0,
    height: 9.5,
    diameter: 7.0,
    wireSpan: 30.0,
    depth: 3.0
  },
  {
    id: 'obs-4',
    name: 'Nhà xưởng kết cấu thép (2 mái)',
    type: 'workshop',
    enabled: true,
    posX: -18.0,
    posZ: 8.0,
    rotationY: 0,
    width: 14.0,
    length: 20.0,
    height: 8.5,
    roofPitch: 2.2,
    diameter: 6.0,
    wireSpan: 30.0,
    depth: 3.0
  },
  {
    id: 'obs-5',
    name: 'Hàng rào bảo vệ công trường',
    type: 'wall',
    enabled: true,
    wallMode: 'points',
    height: 2.8,
    thickness: 0.25,
    isClosed: true,
    boundaryPoints: [
      { id: 'bp-1', name: 'Mốc 1 (Trước-Trái)', x: 35, z: -30 },
      { id: 'bp-2', name: 'Mốc 2 (Trước-Phải)', x: 35, z: 30 },
      { id: 'bp-3', name: 'Mốc 3 (Sau-Phải)', x: -35, z: 30 },
      { id: 'bp-4', name: 'Mốc 4 (Sau-Trái)', x: -35, z: -30 }
    ],
    posX: 0,
    posZ: 0,
    rotationY: 0,
    width: 0.3,
    length: 20
  }
];

export const DEFAULT_LIFT_POINTS = [
  { id: 'pt-1', name: 'Điểm 1: Đón tải (Pick Point)', radius: 8.0, slew: 25, elevation: 1.5, loadRotation: 0 },
  { id: 'pt-2', name: 'Điểm 2: Nâng né công trình (Waypoint 1)', radius: 10.5, slew: 85, elevation: 14.5, hasCustomRotation: false, loadRotation: 45 },
  { id: 'pt-3', name: 'Điểm 3: Đặt tải (Set Point)', radius: 13.5, slew: 155, elevation: 6.5, hasCustomRotation: true, loadRotation: 90 }
];

