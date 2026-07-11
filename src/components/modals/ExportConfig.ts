import type { ExportFormat } from "@/types";

export type ExportConfig = {
  format: ExportFormat;
  rangeMode: "dates" | "months";
  startDate: string;
  endDate: string;
};
