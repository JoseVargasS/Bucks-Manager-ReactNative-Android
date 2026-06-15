import { MONTH_NAMES, SHORT_MONTHS, formatMoney, formatDateToISO, formatDateForSheet } from "../domain/bucksLogic";

export { formatMoney, formatDateToISO, formatDateForSheet };

export function formatCreatedTime(createdAt?: string) {
  if (!createdAt) return "-";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function formatDateGroupLabel(rawDate: string) {
  const date = new Date(rawDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (formatDateToISO(date) === formatDateToISO(today))
    return `HOY · ${date.toLocaleDateString("es-PE", { month: "short", day: "2-digit" }).toUpperCase()}`;
  if (formatDateToISO(date) === formatDateToISO(yesterday))
    return `AYER · ${date.toLocaleDateString("es-PE", { month: "short", day: "2-digit" }).toUpperCase()}`;
  return date.toLocaleDateString("es-PE", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
}

export function abbrev(type: string) {
  return type
    .replace("INGRESO", "Ing.")
    .replace("GASTO", "G.")
    .replace("NO FRECUENTE", "No Frec.")
    .replace("FRECUENTE", "Frec.");
}

export function titleCaseType(type: string) {
  return type
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function typeColor(type: string, colors: Record<string, string>) {
  if (type === "INGRESO NO FRECUENTE") return colors.green;
  if (type === "INGRESO FRECUENTE") return colors.green;
  if (type === "GASTO FRECUENTE") return colors.red;
  return colors.yellow;
}

export function typeFill(type: string, colors: Record<string, string>) {
  if (type === "INGRESO NO FRECUENTE" || type === "INGRESO FRECUENTE") return colors.incomeSoft;
  if (type === "GASTO FRECUENTE") return colors.expenseSoft;
  return colors.warnSoft;
}

export { MONTH_NAMES, SHORT_MONTHS };
