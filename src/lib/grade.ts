export const GRADE_POINTS_MAP: Record<string, number> = {
  "A+": 10,
  A: 9,
  B: 8,
  C: 7,
  D: 6,
  E: 5,
  F: 0,
  AB: 0,
};

export function computeGradePoints(grade: string): number | "" {
  const g = grade?.toUpperCase().trim();
  return (GRADE_POINTS_MAP as any)[g] ?? "";
}
