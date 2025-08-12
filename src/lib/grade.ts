export const GRADE_POINTS_MAP: Record<string, number> = {
  "A+": 10,
  "A": 9,
  "B": 8,
  "C": 7,
  "D": 6,
  "E": 5,
  "F": 0,
  "AB": 0,
};

export const VALID_GRADES = ["A+", "A", "B", "C", "D", "E", "F", "AB"];

export function computeGradePoints(grade: string): number | "" {
  const g = grade?.toUpperCase().trim();
  if (!VALID_GRADES.includes(g)) {
    return "";
  }
  return GRADE_POINTS_MAP[g] ?? "";
}
