// Soil bearing capacity presets according to international civil engineering standards
export const SOIL_BEARING_CAPACITIES = [
  { id: 'hard_rock', name: 'Đá gốc cứng chắc (Hard Rock)', capacityTonsPerM2: 100, capacityKPa: 980 },
  { id: 'compact_gravel', name: 'Sỏi cuội đầm chặt (Compacted Gravel/Crushed Stone)', capacityTonsPerM2: 40, capacityKPa: 390 },
  { id: 'concrete_slab', name: 'Bê tông cốt thép cứng (Concrete Pavement/Slab)', capacityTonsPerM2: 50, capacityKPa: 490 },
  { id: 'stiff_clay', name: 'Sét dẻo cứng / Đất đầm kỹ (Very Stiff Clay / Compacted Sand)', capacityTonsPerM2: 25, capacityKPa: 245 },
  { id: 'medium_sand', name: 'Cát hạt trung đầm vừa (Medium Dense Sand)', capacityTonsPerM2: 18, capacityKPa: 175 },
  { id: 'soft_clay', name: 'Sét mềm / Đất pha cát tự nhiên (Soft Clay / Silty Sand)', capacityTonsPerM2: 10, capacityKPa: 98 },
  { id: 'very_soft_soil', name: 'Đất yếu / Bùn san lấp (Very Soft Soil / Uncompacted Fill)', capacityTonsPerM2: 5, capacityKPa: 49 },
  { id: 'custom', name: 'Tự nhập thông số thực tế (Custom Allowable Capacity)', capacityTonsPerM2: 20, capacityKPa: 196 }
];

