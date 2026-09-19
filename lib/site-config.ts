export const siteConfig = {
  name: "AToZEE",
  // Placeholder brand colors — replace once the logo PNG is supplied and
  // exact hex values are sampled from it directly.
  colors: {
    red: "#D62828",
    blue: "#1D3F72",
  },
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
  phoneDisplay: process.env.NEXT_PUBLIC_PHONE_DISPLAY || "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  address: process.env.NEXT_PUBLIC_ADDRESS || "",
  quoteThresholdNGN: Number(process.env.NEXT_PUBLIC_QUOTE_THRESHOLD_NGN || 400000),
};

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
