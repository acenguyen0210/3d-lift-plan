// Real-world Crane Configurations and Load Charts for 3D Lift Plan
export const DEFAULT_CRANES = [
  {
    id: 'liebherr-ltm-1050',
    name: 'Liebherr LTM 1050-3.1',
    manufacturer: 'Liebherr (Đức)',
    type: 'mobile',
    description: 'Cẩu bánh lốp 50 tấn, 3 trục, cần viễn vọng 11.3m - 38.0m, rất thông dụng tại công trường',
    specs: {
      tareWeight: 36.0, // tấn (tổng trọng lượng xe chưa tải)
      hasCounterweight: true,
      counterweightOptions: [0, 3.2, 5.0, 7.0, 9.0],
      defaultCounterweight: 9.0,
      outriggerLength: 7.15, // m (trục dọc)
      outriggerWidth: 6.40,  // m (trục ngang 100% full span)
      outriggerSpreads: [
        { label: '100% (6.40 m)', ratio: 1.0, width: 6.40 },
        { label: '75% (5.40 m)', ratio: 0.84, width: 5.40 },
        { label: '50% (4.40 m)', ratio: 0.68, width: 4.40 },
        { label: '0% / Bánh lốp (2.55 m)', ratio: 0.40, width: 2.55 }
      ],
      minBoomLength: 11.3,
      maxBoomLength: 38.0,
      boomSteps: [11.3, 15.0, 19.0, 23.0, 27.0, 31.0, 35.0, 38.0],
      boomOffsetPivotY: 2.45,
      tailSwingRadius: 3.53,
      maxPartsOfLine: 8,
      ropeCapacityPerLine: 4.8, // tấn/nhánh
      defaultHookWeight: 0.45,  // tấn
      maxWindSpeed: 11.0,       // m/s
      colorScheme: {
        body: '#eab308', // Vàng Liebherr
        boom: '#ca8a04',
        cabin: '#1e293b',
        chassis: '#334155'
      }
    },
    // Load chart matrix: counterweight 9.0t, 360 degree, 100% outriggers
    loadCharts: {
      '9.0t_100%': {
        radii: [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34],
        boomLengths: [11.3, 15.0, 19.0, 23.0, 27.0, 31.0, 35.0, 38.0],
        chart: {
          // [radius]: [cap for 11.3, 15.0, 19.0, 23.0, 27.0, 31.0, 35.0, 38.0]
          3:  [50.0, 42.0, 35.0, 28.0, 22.0, null, null, null],
          4:  [43.0, 38.0, 33.0, 26.5, 21.0, 17.0, null, null],
          5:  [35.0, 33.0, 29.5, 24.5, 19.5, 16.0, 12.8, 10.5],
          6:  [29.0, 28.0, 26.0, 22.5, 18.0, 15.0, 12.0, 10.0],
          7:  [24.0, 23.5, 22.5, 20.0, 16.5, 14.0, 11.2, 9.5],
          8:  [19.5, 19.5, 19.0, 17.8, 15.2, 13.0, 10.5, 9.0],
          9:  [16.0, 16.0, 15.8, 15.5, 14.0, 12.0, 9.8, 8.5],
          10: [null, 13.2, 13.0, 12.8, 12.5, 11.2, 9.2, 8.0],
          12: [null, 9.5,  9.3,  9.1,  9.0,  9.0,  8.1, 7.1],
          14: [null, null, 7.0,  6.8,  6.7,  6.7,  6.5, 6.2],
          16: [null, null, 5.4,  5.2,  5.1,  5.1,  5.0, 4.9],
          18: [null, null, null, 4.1,  4.0,  4.0,  3.9, 3.8],
          20: [null, null, null, 3.2,  3.1,  3.1,  3.0, 2.9],
          22: [null, null, null, null, 2.5,  2.5,  2.4, 2.3],
          24: [null, null, null, null, 2.0,  2.0,  1.9, 1.8],
          26: [null, null, null, null, null, 1.6,  1.5, 1.4],
          28: [null, null, null, null, null, 1.3,  1.2, 1.1],
          30: [null, null, null, null, null, null, 0.9, 0.8],
          32: [null, null, null, null, null, null, null, 0.6],
          34: [null, null, null, null, null, null, null, 0.4]
        }
      }
    }
  },
  {
    id: 'liebherr-ltm-1250',
    name: 'Liebherr LTM 1250-5.1',
    manufacturer: 'Liebherr (Đức)',
    type: 'mobile',
    description: 'Cẩu hạng nặng 250 tấn, 5 trục, cần viễn vọng 13.1m - 60.0m, đối trọng max 88 tấn',
    specs: {
      tareWeight: 60.0,
      hasCounterweight: true,
      counterweightOptions: [0, 18, 36, 54, 72, 88],
      defaultCounterweight: 54.0,
      outriggerLength: 9.35,
      outriggerWidth: 8.30,
      outriggerSpreads: [
        { label: '100% (8.30 m)', ratio: 1.0, width: 8.30 },
        { label: '75% (7.00 m)', ratio: 0.84, width: 7.00 },
        { label: '50% (5.50 m)', ratio: 0.66, width: 5.50 },
        { label: '0% / Bánh lốp (3.00 m)', ratio: 0.36, width: 3.00 }
      ],
      minBoomLength: 13.1,
      maxBoomLength: 60.0,
      boomSteps: [13.1, 20.0, 27.0, 34.0, 41.0, 48.0, 54.0, 60.0],
      boomOffsetPivotY: 3.10,
      tailSwingRadius: 5.58,
      maxPartsOfLine: 16,
      ropeCapacityPerLine: 9.5,
      defaultHookWeight: 1.80,
      maxWindSpeed: 12.0,
      colorScheme: {
        body: '#eab308',
        boom: '#ca8a04',
        cabin: '#0f172a',
        chassis: '#1e293b'
      }
    },
    loadCharts: {
      '54.0t_100%': {
        radii: [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 34, 38, 42, 46, 50, 54],
        boomLengths: [13.1, 20.0, 27.0, 34.0, 41.0, 48.0, 54.0, 60.0],
        chart: {
          3:  [250.0, 180.0, null,  null,  null,  null,  null,  null],
          4:  [195.0, 165.0, 130.0, null,  null,  null,  null,  null],
          5:  [160.0, 145.0, 120.0, 95.0,  null,  null,  null,  null],
          6:  [135.0, 128.0, 110.0, 88.0,  70.0,  null,  null,  null],
          7:  [112.0, 110.0, 100.0, 80.0,  65.0,  52.0,  null,  null],
          8:  [95.0,  94.0,  90.0,  74.0,  60.0,  49.0,  40.0,  null],
          9:  [82.0,  81.0,  79.0,  68.0,  56.0,  46.0,  38.0,  30.0],
          10: [70.0,  70.0,  68.0,  62.0,  52.0,  43.0,  35.5,  28.5],
          12: [null,  54.0,  53.0,  51.0,  45.0,  38.0,  31.5,  25.5],
          14: [null,  42.0,  41.5,  40.5,  38.0,  33.5,  28.0,  23.0],
          16: [null,  33.0,  32.5,  32.0,  31.0,  29.0,  25.0,  20.5],
          18: [null,  null,  26.0,  25.5,  25.0,  24.5,  22.5,  18.5],
          20: [null,  null,  21.0,  20.8,  20.5,  20.0,  19.5,  16.8],
          22: [null,  null,  17.5,  17.2,  17.0,  16.8,  16.5,  15.2],
          24: [null,  null,  null,  14.5,  14.2,  14.0,  13.8,  13.6],
          26: [null,  null,  null,  12.2,  12.0,  11.8,  11.6,  11.4],
          28: [null,  null,  null,  10.4,  10.2,  10.0,  9.8,   9.6],
          30: [null,  null,  null,  null,  8.8,   8.6,   8.4,   8.2],
          34: [null,  null,  null,  null,  6.5,   6.3,   6.1,   5.9],
          38: [null,  null,  null,  null,  null,  4.7,   4.5,   4.3],
          42: [null,  null,  null,  null,  null,  3.4,   3.2,   3.0],
          46: [null,  null,  null,  null,  null,  null,  2.2,   2.0],
          50: [null,  null,  null,  null,  null,  null,  1.4,   1.2],
          54: [null,  null,  null,  null,  null,  null,  null,  0.8]
        }
      }
    }
  },
  {
    id: 'tadano-gr-700ex',
    name: 'Tadano GR-700EX',
    manufacturer: 'Tadano (Nhật Bản)',
    type: 'rough_terrain',
    description: 'Cẩu địa hình bánh lốp 70 tấn, 2 cầu chủ động, di chuyển linh hoạt trên công trường phức tạp',
    specs: {
      tareWeight: 44.5,
      hasCounterweight: true,
      counterweightOptions: [0, 4.5, 9.8],
      defaultCounterweight: 9.8,
      outriggerLength: 7.30,
      outriggerWidth: 7.20,
      outriggerSpreads: [
        { label: '100% (7.20 m)', ratio: 1.0, width: 7.20 },
        { label: '75% (6.50 m)', ratio: 0.90, width: 6.50 },
        { label: '50% (5.00 m)', ratio: 0.69, width: 5.00 },
        { label: '0% / Bánh lốp (2.79 m)', ratio: 0.38, width: 2.79 }
      ],
      minBoomLength: 11.5,
      maxBoomLength: 44.0,
      boomSteps: [11.5, 17.5, 23.5, 29.5, 35.5, 44.0],
      boomOffsetPivotY: 2.65,
      tailSwingRadius: 4.15,
      maxPartsOfLine: 10,
      ropeCapacityPerLine: 5.6,
      defaultHookWeight: 0.65,
      maxWindSpeed: 10.0,
      colorScheme: {
        body: '#0284c7', // Xanh Tadano dương
        boom: '#bae6fd',
        cabin: '#0f172a',
        chassis: '#334155'
      }
    },
    loadCharts: {
      '9.8t_100%': {
        radii: [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 34, 38],
        boomLengths: [11.5, 17.5, 23.5, 29.5, 35.5, 44.0],
        chart: {
          3:  [70.0, 45.0, null,  null,  null,  null],
          4:  [58.0, 42.0, 32.0, null,  null,  null],
          5:  [48.0, 39.0, 30.0, 24.0, null,  null],
          6:  [39.0, 34.0, 28.0, 22.0, 16.5, null],
          7:  [31.0, 29.0, 25.5, 20.0, 15.0, 11.0],
          8:  [24.5, 24.0, 22.5, 18.2, 14.0, 10.2],
          9:  [19.5, 19.5, 19.0, 16.5, 12.8, 9.5],
          10: [null, 16.0, 15.8, 15.0, 11.8, 8.8],
          12: [null, 11.2, 11.0, 11.5, 10.0, 7.6],
          14: [null, 8.2,  8.0,  8.2,  8.4,  6.6],
          16: [null, null, 6.0,  6.1,  6.3,  5.8],
          18: [null, null, 4.6,  4.7,  4.8,  5.0],
          20: [null, null, null, 3.6,  3.7,  4.1],
          22: [null, null, null, 2.8,  2.9,  3.3],
          24: [null, null, null, null, 2.2,  2.6],
          26: [null, null, null, null, 1.7,  2.0],
          28: [null, null, null, null, 1.2,  1.5],
          30: [null, null, null, null, null, 1.1],
          34: [null, null, null, null, null, 0.6]
        }
      }
    }
  },
  {
    id: 'kobelco-cke2500',
    name: 'Kobelco CKE2500-2',
    manufacturer: 'Kobelco (Nhật Bản)',
    type: 'crawler',
    description: 'Cẩu bánh xích hạng nặng 250 tấn, cần giàn Lattice Boom 15.2m - 73.2m, áp lực di chuyển trên dải xích',
    specs: {
      tareWeight: 213.0, // Tổng tự trọng thân cẩu với đối trọng cơ sở
      hasCounterweight: true,
      counterweightOptions: [55, 75, 90, 110],
      defaultCounterweight: 90.0,
      crawlerLength: 8.97, // Chiều dài dải xích tiếp đất
      crawlerWidth: 7.52,  // Chiều rộng dải xích vệt ngoài
      shoeWidth: 1.22,     // Chiều rộng bản xích
      minBoomLength: 15.2,
      maxBoomLength: 73.2,
      boomSteps: [15.2, 21.3, 27.4, 33.5, 42.7, 51.8, 61.0, 73.2],
      boomOffsetPivotY: 2.15,
      tailSwingRadius: 6.00,
      maxPartsOfLine: 16,
      ropeCapacityPerLine: 13.5,
      defaultHookWeight: 2.50,
      maxWindSpeed: 10.0,
      colorScheme: {
        body: '#059669', // Xanh lá Kobelco
        boom: '#10b981',
        cabin: '#1e293b',
        chassis: '#1e293b'
      }
    },
    loadCharts: {
      '90.0t_100%': {
        radii: [5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64],
        boomLengths: [15.2, 21.3, 27.4, 33.5, 42.7, 51.8, 61.0, 73.2],
        chart: {
          5:  [250.0, 200.0, null,  null,  null,  null,  null,  null],
          6:  [205.0, 185.0, 150.0, null,  null,  null,  null,  null],
          7:  [168.0, 160.0, 138.0, 115.0, null,  null,  null,  null],
          8:  [140.0, 138.0, 125.0, 105.0, 85.0,  null,  null,  null],
          9:  [118.0, 116.0, 110.0, 95.0,  78.0,  62.0,  null,  null],
          10: [102.0, 100.0, 98.0,  88.0,  72.0,  58.0,  46.0,  null],
          12: [78.0,  77.0,  76.0,  74.0,  62.0,  50.0,  41.0,  28.0],
          14: [62.0,  61.5,  60.5,  59.5,  54.0,  44.0,  36.5,  25.0],
          16: [null,  50.0,  49.5,  48.5,  47.0,  39.0,  32.5,  22.5],
          18: [null,  41.0,  40.5,  40.0,  39.5,  35.0,  29.5,  20.5],
          20: [null,  null,  34.0,  33.5,  33.0,  31.5,  26.5,  18.5],
          24: [null,  null,  null,  24.5,  24.0,  23.5,  22.0,  15.5],
          28: [null,  null,  null,  null,  18.2,  17.8,  17.2,  13.2],
          32: [null,  null,  null,  null,  14.1,  13.8,  13.4,  11.2],
          36: [null,  null,  null,  null,  null,  10.9,  10.5,  9.5],
          40: [null,  null,  null,  null,  null,  8.7,   8.3,   7.9],
          48: [null,  null,  null,  null,  null,  null,  5.1,   5.2],
          56: [null,  null,  null,  null,  null,  null,  null,  3.3],
          64: [null,  null,  null,  null,  null,  null,  null,  1.8]
        }
      }
    }
  },
  {
    id: 'zoomlion-zmc25',
    name: 'Zoomlion ZMC25',
    manufacturer: 'Zoomlion (Trung Quốc)',
    type: 'mobile',
    description: 'Cẩu bánh lốp chassis tải 25 tấn, 3 trục, cần viễn vọng 10.4m - 39.5m, đối trọng 6.2 tấn',
    specs: {
      tareWeight: 31.7,
      hasCounterweight: true,
      counterweightOptions: [0, 5.0, 6.2],
      defaultCounterweight: 6.2,
      outriggerLength: 5.40,
      outriggerWidth: 6.20,
      outriggerSpreads: [
        { label: '100% (6.20 m)', ratio: 1.0, width: 6.20 },
        { label: '50% (4.25 m)', ratio: 0.68, width: 4.25 },
        { label: '0% / Bánh lốp (2.50 m)', ratio: 0.40, width: 2.50 }
      ],
      minBoomLength: 10.4,
      maxBoomLength: 39.5,
      boomSteps: [10.4, 17.5, 24.5, 32.0, 39.5],
      boomOffsetPivotY: 2.30,
      tailSwingRadius: 3.25,
      maxPartsOfLine: 6,
      ropeCapacityPerLine: 4.2,
      defaultHookWeight: 0.32,
      maxWindSpeed: 10.5,
      colorScheme: {
        body: '#16a34a', // Xanh Zoomlion
        boom: '#86efac',
        cabin: '#0f172a',
        chassis: '#334155'
      }
    },
    loadCharts: {
      '6.2t_100%': {
        radii: [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30],
        boomLengths: [10.4, 17.5, 24.5, 32.0, 39.5],
        chart: {
          3:  [25.0, 18.0, null,  null,  null],
          4:  [22.0, 16.5, 12.0, null,  null],
          5:  [18.0, 15.0, 11.2, 8.5,   null],
          6:  [14.5, 13.5, 10.5, 8.0,   5.8],
          7:  [11.5, 11.2, 9.8,  7.4,   5.5],
          8:  [9.2,  9.0,  8.8,  6.8,   5.2],
          9:  [null, 7.5,  7.4,  6.2,   4.8],
          10: [null, 6.2,  6.1,  5.7,   4.5],
          12: [null, 4.3,  4.2,  4.3,   3.9],
          14: [null, 3.0,  3.0,  3.2,   3.2],
          16: [null, null, 2.2,  2.4,   2.5],
          18: [null, null, 1.6,  1.8,   1.9],
          20: [null, null, null, 1.3,  1.4],
          22: [null, null, null, 0.9,  1.0],
          24: [null, null, null, null, 0.7],
          26: [null, null, null, null, 0.5]
        }
      }
    }
  },
  {
    id: 'hyundai-hd320-soosan1015',
    name: 'Hyundai HD320 - Cẩu Thùng Soosan SCS1015LS',
    manufacturer: 'Hyundai & Soosan (Hàn Quốc)',
    type: 'truck',
    description: 'Xe tải cẩu thùng tự hành 4 chân (8x4), cẩu Soosan 12 tấn 5 đoạn (5.6m - 20.7m), thùng hàng 8.2m',
    specs: {
      tareWeight: 18.8,
      hasCounterweight: false,
      counterweightOptions: [0],
      defaultCounterweight: 0,
      outriggerLength: 6.80,
      outriggerWidth: 6.18,
      outriggerSpreads: [
        { label: '100% (6.18 m)', ratio: 1.0, width: 6.18 },
        { label: '70% (4.50 m)', ratio: 0.73, width: 4.50 },
        { label: '0% / Bánh lốp (2.45 m)', ratio: 0.40, width: 2.45 }
      ],
      minBoomLength: 5.6,
      maxBoomLength: 20.7,
      boomSteps: [5.6, 9.4, 13.2, 17.0, 20.7],
      boomOffsetPivotY: 2.25,
      boomOffsetPivotX: 0.35,
      tailSwingRadius: 1.45,
      maxPartsOfLine: 4,
      ropeCapacityPerLine: 3.2,
      defaultHookWeight: 0.18,
      maxWindSpeed: 10.0,
      colorScheme: {
        body: '#0284c7', // Xanh Hyundai
        boom: '#f59e0b', // Vàng cam Soosan
        cabin: '#ffffff',
        chassis: '#1e293b',
        cargoBed: '#94a3b8'
      }
    },
    loadCharts: {
      '0t_100%': {
        radii: [2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0],
        boomLengths: [5.6, 9.4, 13.2, 17.0, 20.7],
        chart: {
          2.0:  [12.0, 7.8,  null, null, null],
          2.5:  [10.0, 7.5,  null, null, null],
          3.0:  [8.6,  6.8,  5.2,  null, null],
          4.0:  [6.3,  5.5,  4.4,  3.4,  null],
          5.0:  [4.8,  4.5,  3.7,  3.0,  2.3],
          6.0:  [null, 3.7,  3.1,  2.6,  2.1],
          7.0:  [null, 3.0,  2.65, 2.25, 1.85],
          8.0:  [null, 2.5,  2.25, 1.95, 1.65],
          9.0:  [null, 2.1,  1.95, 1.7,  1.45],
          10.0: [null, null, 1.65, 1.48, 1.3],
          12.0: [null, null, 1.25, 1.15, 1.05],
          14.0: [null, null, null, 0.88, 0.82],
          16.0: [null, null, null, 0.65, 0.62],
          18.0: [null, null, null, null, 0.48],
          20.0: [null, null, null, null, 0.35]
        }
      }
    }
  },
  {
    id: 'hino-500-kanglim2056',
    name: 'Hino 500 FL - Cẩu Thùng Kanglim KS2056',
    manufacturer: 'Hino & Kanglim (Nhật Bản / Hàn Quốc)',
    type: 'truck',
    description: 'Xe tải cẩu thùng tự hành 3 chân (6x2), cẩu Kanglim 8 tấn 6 đoạn (4.3m - 20.3m), thùng hàng 8.5m',
    specs: {
      tareWeight: 14.5,
      hasCounterweight: false,
      counterweightOptions: [0],
      defaultCounterweight: 0,
      outriggerLength: 6.20,
      outriggerWidth: 5.80,
      outriggerSpreads: [
        { label: '100% (5.80 m)', ratio: 1.0, width: 5.80 },
        { label: '70% (4.20 m)', ratio: 0.72, width: 4.20 },
        { label: '0% / Bánh lốp (2.40 m)', ratio: 0.41, width: 2.40 }
      ],
      minBoomLength: 4.3,
      maxBoomLength: 20.3,
      boomSteps: [4.3, 7.5, 10.7, 13.9, 17.1, 20.3],
      boomOffsetPivotY: 2.10,
      boomOffsetPivotX: 0.30,
      tailSwingRadius: 1.30,
      maxPartsOfLine: 4,
      ropeCapacityPerLine: 2.5,
      defaultHookWeight: 0.15,
      maxWindSpeed: 10.0,
      colorScheme: {
        body: '#16a34a', // Xanh lá Kanglim
        boom: '#22c55e',
        cabin: '#ffffff',
        chassis: '#1e293b',
        cargoBed: '#94a3b8'
      }
    },
    loadCharts: {
      '0t_100%': {
        radii: [2.0, 2.4, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0],
        boomLengths: [4.3, 7.5, 10.7, 13.9, 17.1, 20.3],
        chart: {
          2.0:  [8.0,  null, null, null, null, null],
          2.4:  [7.1,  5.5,  null, null, null, null],
          3.0:  [5.8,  4.8,  3.8,  null, null, null],
          4.0:  [4.1,  3.8,  3.2,  2.4,  null, null],
          5.0:  [null, 2.9,  2.6,  2.1,  1.65, null],
          6.0:  [null, 2.3,  2.1,  1.8,  1.45, 1.15],
          7.0:  [null, 1.85, 1.7,  1.5,  1.25, 1.0],
          8.0:  [null, null, 1.4,  1.3,  1.1,  0.88],
          9.0:  [null, null, 1.18, 1.1,  0.95, 0.78],
          10.0: [null, null, 0.98, 0.95, 0.82, 0.68],
          12.0: [null, null, null, 0.72, 0.65, 0.54],
          14.0: [null, null, null, 0.54, 0.50, 0.42],
          16.0: [null, null, null, null, 0.38, 0.32],
          18.0: [null, null, null, null, 0.28, 0.25],
          20.0: [null, null, null, null, null, 0.18]
        }
      }
    }
  },
  {
    id: 'tower-liebherr-280',
    name: 'Liebherr 280 EC-H 12',
    manufacturer: 'Liebherr (Đức)',
    type: 'tower',
    description: 'Cẩu tháp cố định có xe con (Trolley Jib), tải max 12 tấn, tầm với cần chính tới 70m',
    specs: {
      tareWeight: 85.0,
      hasCounterweight: true,
      counterweightOptions: [18, 22.5],
      defaultCounterweight: 22.5,
      outriggerLength: 6.0, // Chân đế móng cẩu tháp
      outriggerWidth: 6.0,
      outriggerSpreads: [
        { label: 'Móng Cố Định (6.0m x 6.0m)', ratio: 1.0, width: 6.0 }
      ],
      minBoomLength: 30.0,
      maxBoomLength: 70.0,
      boomSteps: [30.0, 40.0, 50.0, 60.0, 70.0],
      boomOffsetPivotY: 35.0, // Chiều cao dưới móc cẩu / tháp
      tailSwingRadius: 15.5,  // Cần đuôi đối trọng
      maxPartsOfLine: 4,
      ropeCapacityPerLine: 3.5,
      defaultHookWeight: 0.50,
      maxWindSpeed: 14.0,
      colorScheme: {
        body: '#eab308',
        boom: '#ca8a04',
        cabin: '#ffffff',
        chassis: '#1e293b'
      }
    },
    loadCharts: {
      '22.5t_100%': {
        radii: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
        boomLengths: [70.0],
        chart: {
          10: [12.0],
          15: [12.0],
          20: [11.2],
          25: [8.8],
          30: [7.1],
          35: [5.9],
          40: [5.0],
          45: [4.3],
          50: [3.8],
          55: [3.3],
          60: [2.9],
          65: [2.6],
          70: [2.3]
        }
      }
    }
  }
];

