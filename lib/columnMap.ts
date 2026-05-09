export const COLUMNS = [
  { csv: "測定日時",              db: "measured_at" },
  { csv: "体重(kg)",              db: "weight_kg" },
  { csv: "体水分量(L)",           db: "body_water_l" },
  { csv: "タンパク質量(kg)",      db: "protein_kg" },
  { csv: "ミネラル量(kg)",        db: "mineral_kg" },
  { csv: "体脂肪量(kg)",          db: "body_fat_kg" },
  { csv: "筋肉量(kg)",            db: "muscle_mass_kg" },
  { csv: "BMI(kg/m2)",            db: "bmi" },
  { csv: "体脂肪率(%)",           db: "body_fat_pct" },
  { csv: "InBody点数",            db: "inbody_score" },
  { csv: "適正体重(kg)",          db: "ideal_weight_kg" },
  { csv: "体重調節(kg)",          db: "weight_adj_kg" },
  { csv: "脂肪調節(kg)",          db: "fat_adj_kg" },
  { csv: "筋肉調節(kg)",          db: "muscle_adj_kg" },
  { csv: "基礎代謝量(kcal)",      db: "bmr_kcal" },
  { csv: "腹囲(cm)",              db: "waist_cm" },
  { csv: "除脂肪量(kg)",          db: "lean_mass_kg" },
  { csv: "骨格筋量(kg)",          db: "skeletal_muscle_kg" },
  { csv: "骨格筋率(%)",           db: "skeletal_muscle_pct" },
  { csv: "FFMI(kg/m2)",           db: "ffmi" },
  { csv: "FMI(kg/m2)",            db: "fmi" },
  { csv: "SMI(kg/m2)",            db: "smi" },
  { csv: "内臓脂肪レベル",        db: "visceral_fat_level" },
  { csv: "位相角(50kHz)",         db: "phase_angle_50khz" },
  { csv: "部位別筋肉量_右腕(kg)", db: "arm_r_muscle_kg" },
  { csv: "部位別筋肉量_左腕(kg)", db: "arm_l_muscle_kg" },
  { csv: "部位別筋肉量_体幹(kg)", db: "trunk_muscle_kg" },
  { csv: "部位別筋肉量_右脚(kg)", db: "leg_r_muscle_kg" },
  { csv: "部位別筋肉量_左脚(kg)", db: "leg_l_muscle_kg" },
  { csv: "部位別体脂肪量_右腕(kg)", db: "arm_r_fat_kg" },
  { csv: "部位別体脂肪量_左腕(kg)", db: "arm_l_fat_kg" },
  { csv: "部位別体脂肪量_体幹(kg)", db: "trunk_fat_kg" },
  { csv: "部位別体脂肪量_右脚(kg)", db: "leg_r_fat_kg" },
  { csv: "部位別体脂肪量_左脚(kg)", db: "leg_l_fat_kg" },
] as const;

export const CSV_TO_DB: Record<string, string> = Object.fromEntries(
  COLUMNS.map((c) => [c.csv, c.db])
);

export const DB_TO_CSV: Record<string, string> = Object.fromEntries(
  COLUMNS.map((c) => [c.db, c.csv])
);

export const CSV_HEADERS: string[] = COLUMNS.map((c) => c.csv);
export const METRIC_HEADERS: string[] = CSV_HEADERS.slice(1);
