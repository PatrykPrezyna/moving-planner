"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/config";
import { discountPercent, type Item } from "@/lib/types";

type Props = {
  item: Item;
  currency: string;
  whatsappNumber: string;
  editing: boolean;
  onEdit: (item: Item) => void;
  onCycleStatus: (item: Item) => void;
  onDelete: (item: Item) => void;
};

const STATUS_BADGE: Record<Item["status"], { label: string; className: string } | null> = {
  available: null,
  reserved: { label: "Reserved", className: "bg-amber-500 text-white" },
  sold: { label: "Sold", className: "bg-stone-700 text-white" },
};

export default function ItemCard({
  item,
  currency,
  whatsappNumber,
  editing,
  onEdit,
  onCycleStatus,
  onDelete,
}: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const discount = discountPercent(item);
  const sold = item.status === "sold";
  const badge = STATUS_BADGE[item.status];
  const longDescription = item.description.length > 120;
  const description =
    expanded || !longDescription ? item.description : `${item.description.slice(0, 120)}…`;

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi! Is "${item.name}" still available?`)}`
    : "";

  const claimLabel = item.availableFrom
    ? `Available ${item.availableFrom} — enquire →`
    : "Claim on WhatsApp →";

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ${
        item.featured ? "ring-2 ring-amber-400" : "ring-line"
      } ${sold ? "opacity-60" : ""}`}
    >
      <div className="relative aspect-4/3 bg-stone-100">
        {item.photos.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photos[photoIndex % item.photos.length]}
            alt={item.name}
            className="h-full w-full object-cover"
            onClick={() => setPhotoIndex((i) => i + 1)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">No photo</div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          {item.featured ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
              ★ Featured
            </span>
          ) : (
            <span />
          )}
          {badge ? (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${badge.className}`}>
              {badge.label}
            </span>
          ) : item.availableFrom ? (
            <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              Available {item.availableFrom}
            </span>
          ) : null}
        </div>

        {item.photos.length > 1 && (
          <span className="absolute right-3 bottom-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
            {(photoIndex % item.photos.length) + 1} / {item.photos.length} photos
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg leading-tight font-semibold">{item.name}</h2>
          <div className="shrink-0 text-right">
            {item.retailPrice !== null && discount !== null && (
              <div className="text-sm text-muted line-through">
                {formatPrice(item.retailPrice, currency)}
              </div>
            )}
            <div className={`text-2xl font-semibold ${sold ? "line-through" : ""}`}>
              {formatPrice(item.price, currency)}
            </div>
          </div>
        </div>

        {discount !== null && (
          <span className="w-fit rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
            {discount}% off retail
          </span>
        )}

        {item.description && (
          <p className="text-sm whitespace-pre-line text-muted">
            {description}{" "}
            {longDescription && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="font-medium text-foreground underline underline-offset-2"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </p>
        )}

        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="text-sm break-all text-sky-700 underline"
          >
            {item.link}
          </a>
        )}

        <div className="mt-auto pt-3">
          {sold ? (
            <span className="text-sm font-medium text-muted">Sold — thank you!</span>
          ) : whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-emerald-700"
            >
              {claimLabel}
            </a>
          ) : (
            <span className="text-sm font-medium text-muted">{claimLabel}</span>
          )}
        </div>

        {editing && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onCycleStatus(item)}
              className="rounded-lg bg-stone-200 px-3 py-2 text-sm font-medium"
            >
              Mark as {nextStatus(item.status)}
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-red-700"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function nextStatus(status: Item["status"]): Item["status"] {
  if (status === "available") return "reserved";
  if (status === "reserved") return "sold";
  return "available";
}
