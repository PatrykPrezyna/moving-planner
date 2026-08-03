export const STATUSES = ["available", "reserved", "sold"] as const;

export type Status = (typeof STATUSES)[number];

export type Item = {
  id: string;
  name: string;
  description: string;
  price: number | null;
  retailPrice: number | null;
  link: string;
  photos: string[];
  status: Status;
  featured: boolean;
  availableFrom: string;
  createdAt: string;
};

export type ItemInput = Omit<Item, "id" | "createdAt">;

export function isStatus(value: unknown): value is Status {
  return STATUSES.includes(value as Status);
}

/** Coerces arbitrary JSON from the edit form into a well-formed item payload. */
export function parseItemInput(body: unknown): ItemInput | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = body as Record<string, unknown>;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return null;

  const photos = Array.isArray(raw.photos)
    ? raw.photos.filter((p): p is string => typeof p === "string" && p.length > 0)
    : [];

  return {
    name,
    description: typeof raw.description === "string" ? raw.description.trim() : "",
    price: toNumberOrNull(raw.price),
    retailPrice: toNumberOrNull(raw.retailPrice),
    link: typeof raw.link === "string" ? raw.link.trim() : "",
    photos,
    status: isStatus(raw.status) ? raw.status : "available",
    featured: raw.featured === true,
    availableFrom: typeof raw.availableFrom === "string" ? raw.availableFrom.trim() : "",
  };
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function discountPercent(item: Item): number | null {
  if (item.price === null || item.retailPrice === null) return null;
  if (item.retailPrice <= 0 || item.price >= item.retailPrice) return null;
  return Math.round(((item.retailPrice - item.price) / item.retailPrice) * 100);
}
