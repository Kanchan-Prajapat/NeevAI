export function isValidISODate(dateStr: string): boolean {
  // Check format YYYY-MM-DD
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(dateStr)) return false;
  const date = new Date(dateStr);
  // Invalid dates become "Invalid Date"
  if (isNaN(date.getTime())) return false;
  // Ensure the components match (e.g., 2022-02-30 becomes March 2)
  const [y, m, d] = dateStr.split('-').map(Number);
  return date.getUTCFullYear() === y && date.getUTCMonth() + 1 === m && date.getUTCDate() === d;
}
