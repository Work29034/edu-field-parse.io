export const TARGET_HEADERS = [
  "Roll Number",
  "Student Name",
  "Class",
  "Section",
  "Department",
  "Year",
  "Semester",
  "Subject Code",
  "Subject Name",
  "Grade",
  "Grade Points",
  "Credits",
] as const;

export type TargetHeader = typeof TARGET_HEADERS[number];
