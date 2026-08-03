export type PaymentLink = { label: string; url: string };

export type SiteConfig = {
  title: string;
  intro: string;
  currency: string;
  whatsappNumber: string;
  paymentLinks: PaymentLink[];
};

/**
 * PAYMENT_LINKS is a comma-separated list of "Label|https://url" pairs,
 * e.g. "Venmo|https://venmo.com/u/me,Zelle|https://example.com/zelle-qr".
 */
function parsePaymentLinks(raw: string): PaymentLink[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [label, ...rest] = entry.split("|");
      return { label: label.trim(), url: rest.join("|").trim() };
    })
    .filter((link) => link.label && link.url);
}

export function getSiteConfig(): SiteConfig {
  return {
    title: process.env.SALE_TITLE || "Moving sale",
    intro:
      process.env.SALE_INTRO ||
      "We are moving. Everything below is up for grabs — tap WhatsApp to claim an item.",
    currency: process.env.SALE_CURRENCY || "$",
    // Digits only, including country code — e.g. 48123456789.
    whatsappNumber: (process.env.WHATSAPP_NUMBER || "").replace(/\D/g, ""),
    paymentLinks: parsePaymentLinks(process.env.PAYMENT_LINKS || ""),
  };
}

export function formatPrice(value: number | null, currency: string): string {
  if (value === null) return "";
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${currency}${text}`;
}
