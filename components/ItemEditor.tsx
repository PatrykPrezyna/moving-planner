"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { STATUSES, type Item, type ItemInput } from "@/lib/types";

type Props = {
  item: Item | null;
  blobEnabled: boolean;
  onCancel: () => void;
  onSave: (input: ItemInput) => Promise<void>;
};

const EMPTY: ItemInput = {
  name: "",
  description: "",
  price: null,
  retailPrice: null,
  link: "",
  photos: [],
  status: "available",
  featured: false,
  availableFrom: "",
};

const MAX_SIDE = 1600;

/** Vercel rejects a serverless request body larger than this before it reaches the route. */
const FUNCTION_BODY_LIMIT = 4 * 1024 * 1024;

/** createImageBitmap rejects some camera formats that an <img> element still decodes. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } catch {
      throw new Error(
        `Your browser cannot read "${file.name}". If this is an iPhone photo, set ` +
          `Settings → Camera → Formats to "Most Compatible", or pick a JPEG.`,
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Always re-encodes to JPEG. Uploading the original risks a format like HEIC that
 * every non-Safari browser refuses to display, and a full-size phone photo is slow
 * to send over mobile data.
 */
async function toDisplayableJpeg(file: File): Promise<File> {
  const source = await decode(file);
  const width = source instanceof ImageBitmap ? source.width : source.naturalWidth;
  const height = source instanceof ImageBitmap ? source.height : source.naturalHeight;
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error(`Could not process "${file.name}".`);

  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, {
    type: "image/jpeg",
  });
}

/** Straight from the browser to Blob storage, so the 4.5 MB function limit doesn't apply. */
async function uploadToBlob(file: File, onProgress: (percentage: number) => void): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const blob = await upload(`sale/${file.name}`, file, {
      access: "public",
      handleUploadUrl: "/api/upload/token",
      abortSignal: controller.signal,
      onUploadProgress: ({ percentage }) => onProgress(percentage),
    });
    return blob.url;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("The upload timed out. Check your connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Posts to our own API, which stores the file. Same-origin, so it works
 * wherever the page itself loads — a browser extension or network that blocks
 * the direct connection to blob.vercel-storage.com cannot stall it.
 * XHR rather than fetch, because fetch cannot report upload progress.
 */
function uploadViaServer(file: File, onProgress: (percentage: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/upload");
    request.timeout = 120_000;

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    });

    request.addEventListener("load", () => {
      let payload: { url?: string; error?: string } | null = null;
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        reject(new Error(`Unexpected ${request.status} response from the server.`));
        return;
      }
      if (request.status >= 200 && request.status < 300 && payload?.url) {
        resolve(payload.url);
      } else {
        reject(new Error(payload?.error || `Upload failed (${request.status}).`));
      }
    });

    request.addEventListener("error", () => reject(new Error("The upload could not reach the server.")));
    request.addEventListener("timeout", () => reject(new Error("The upload timed out. Check your connection and try again.")));

    request.send(body);
  });
}

export default function ItemEditor({ item, blobEnabled, onCancel, onSave }: Props) {
  const [form, setForm] = useState<ItemInput>(item ? { ...item } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  function update<K extends keyof ItemInput>(key: K, value: ItemInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    const list = Array.from(files);

    try {
      for (const [index, original] of list.entries()) {
        const position = list.length > 1 ? `Photo ${index + 1} of ${list.length}: ` : "";
        setProgress(`${position}preparing…`);

        const file = await toDisplayableJpeg(original);
        const report = (percentage: number) =>
          setProgress(`${position}uploading ${Math.round(percentage)}%`);

        // Downscaling puts photos far below the 4.5 MB serverless body limit, so
        // the same-origin route handles them. Only oversized files need the
        // direct-to-Blob path, which bypasses that limit.
        const url =
          file.size > FUNCTION_BODY_LIMIT && blobEnabled
            ? await uploadToBlob(file, report)
            : await uploadViaServer(file, report);

        setForm((current) => ({ ...current, photos: [...current.photos, url] }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setProgress("");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("An item needs a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  const field = "w-full rounded-xl border border-line bg-white px-3 py-3 text-base";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
      >
        <h2 className="mb-4 font-display text-2xl">{item ? "Edit item" : "Add item"}</h2>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Name
            <input
              className={field}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              autoFocus
            />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
              Price
              <input
                className={field}
                inputMode="decimal"
                value={form.price ?? ""}
                onChange={(e) => update("price", e.target.value === "" ? null : Number(e.target.value))}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
              Retail price
              <input
                className={field}
                inputMode="decimal"
                value={form.retailPrice ?? ""}
                onChange={(e) =>
                  update("retailPrice", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Description
            <textarea
              className={field}
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Product link (optional)
            <input
              className={field}
              inputMode="url"
              value={form.link}
              onChange={(e) => update("link", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Available from (optional, e.g. &quot;Sep 12&quot;)
            <input
              className={field}
              value={form.availableFrom}
              onChange={(e) => update("availableFrom", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Status
            <select
              className={field}
              value={form.status}
              onChange={(e) => update("status", e.target.value as ItemInput["status"])}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status[0].toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={form.featured}
              onChange={(e) => update("featured", e.target.checked)}
            />
            Featured (pinned to the top)
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Photos</span>
            {form.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.photos.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          "photos",
                          form.photos.filter((p) => p !== url),
                        )
                      }
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-stone-800 text-sm text-white"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="text-sm"
            />
            {uploading && <span className="text-sm font-medium text-accent">{progress}</span>}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={busy || uploading}
            className="flex-1 rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-stone-200 px-4 py-3 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
