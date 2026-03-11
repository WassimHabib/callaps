/**
 * Format centimes to euros string (e.g., 29900 → "299,00 €")
 * Safe for use in client components.
 */
export function formatCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2).replace(".", ",") + " €";
}
