import { MONTH_NAMES, SHORT_MONTHS, formatMoney, formatDateToISO, formatDateForSheet } from "../domain/bucksLogic";

export { formatMoney, formatDateToISO, formatDateForSheet, MONTH_NAMES, SHORT_MONTHS };

/** Formatea el timestamp de creación como hora local (HH:MM:SS) */
export function formatCreatedTime(createdAt?: string): string {
  if (!createdAt) return "-";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

/** Etiqueta de agrupación por día: "HOY", "AYER" o fecha formateada */
export function formatDateGroupLabel(rawDate: string): string {
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

/** Abrevia nombres de tipo de transacción para UI compacta */
export function abbrev(type: string): string {
  return type
    .replace("INGRESO", "Ing.")
    .replace("GASTO", "G.")
    .replace("NO FRECUENTE", "No Frec.")
    .replace("FRECUENTE", "Frec.");
}

/** Convierte tipo a Title Case (ej: "GASTO NO FRECUENTE" → "Gasto No Frecuente") */
export function titleCaseType(type: string): string {
  return type
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Color asociado al tipo de transacción (verde = ingreso, rojo/amarillo = gasto) */
export function typeColor(type: string, colors: Record<string, string>): string {
  if (type === "INGRESO NO FRECUENTE" || type === "INGRESO FRECUENTE") return colors.green;
  if (type === "GASTO FRECUENTE") return colors.red;
  return colors.yellow;
}

/** Color de fondo suave asociado al tipo de transacción */
export function typeFill(type: string, colors: Record<string, string>): string {
  if (type === "INGRESO NO FRECUENTE" || type === "INGRESO FRECUENTE") return colors.incomeSoft;
  if (type === "GASTO FRECUENTE") return colors.expenseSoft;
  return colors.warnSoft;
}
