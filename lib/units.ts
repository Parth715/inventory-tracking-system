// Convert a package size + unit into a canonical volume in milliliters
// so products can be sorted smallest -> largest regardless of unit.
const TO_ML: Record<string, number> = {
  oz: 29.5735, // fluid ounce
  "fl oz": 29.5735,
  ml: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  gal: 3785.41,
  gallon: 3785.41,
  pt: 473.176,
  pint: 473.176,
  qt: 946.353,
  quart: 946.353,
}

export const UNIT_OPTIONS = ["oz", "ml", "liter", "gallon", "pint", "quart"] as const

export function packageSizeToMl(size: number, unit: string): number {
  const factor = TO_ML[unit.trim().toLowerCase()] ?? 1
  return size * factor
}

export function formatPackage(size: number, unit: string): string {
  const clean = Number.isInteger(size) ? size.toString() : size.toString()
  return `${clean} ${unit}`
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value + "T00:00:00") : value
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
