// Pure helpers shared by server and client (no imports).

const ONES = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN",
  "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const out: string[] = [];
  if (h) out.push(`${ONES[h]} HUNDRED`);
  if (r) {
    if (h) out.push("AND");
    out.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : ""));
  }
  return out.join(" ");
}

function intWords(n: number): string {
  if (n === 0) return "ZERO";
  const parts: string[] = [];
  let rest = n;
  for (const [size, name] of [[1e9, "BILLION"], [1e6, "MILLION"], [1e3, "THOUSAND"]] as const) {
    const q = Math.floor(rest / size);
    if (q) { parts.push(`${below1000(q)} ${name}`); rest -= q * size; }
  }
  if (rest) parts.push(parts.length && rest < 100 ? `AND ${below1000(rest)}` : below1000(rest));
  return parts.join(" ");
}

/** 516000 -> "FIVE HUNDRED AND SIXTEEN THOUSAND NAIRA" (kobo appended when present). */
export function amountInWords(amount: number): string {
  const total = Math.round(Math.abs(amount) * 100);
  const naira = Math.floor(total / 100);
  const kobo = total % 100;
  return `${intWords(naira)} NAIRA${kobo ? `, ${intWords(kobo)} KOBO` : ""}`;
}

const MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

function lagosParts(d: Date) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" });
  const [y, m, day] = f.format(d).split("-").map(Number);
  return { y, m, day };
}

/** "Sept. 29, 2026" in Lagos time, matching the existing invoices. */
export function formatInvoiceDate(iso: string): string {
  const { y, m, day } = lagosParts(new Date(iso));
  return `${MONTHS[m - 1]} ${String(day).padStart(2, "0")}, ${y}`;
}

/** "20260929" — today's date in Lagos, the prefix of invoice numbers. */
export function lagosDayCompact(d: Date = new Date()): string {
  const { y, m, day } = lagosParts(d);
  return `${y}${String(m).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

export const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
