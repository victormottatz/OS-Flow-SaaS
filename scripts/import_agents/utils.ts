export function cleanPhone(phone: string | number | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.toString().replace(/\D/g, '');
  return cleaned.length >= 10 ? cleaned : null;
}

export function generateOSNumber(shOsNumber: string | number): string {
  // Assume we preserve the number and add a standard suffix like 0 if it's 5 digits?
  // Since we saw earlier that OS numbers look like OS-235078
  // SH Oficina outputs maybe 5 or 6 digits. Let's just prefix with OS-
  return `OS-${shOsNumber}`;
}
