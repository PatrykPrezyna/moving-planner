"use client";

import { useMemo, useState } from "react";
import type { SiteConfig } from "@/lib/config";
import type { Item, ItemInput, Status } from "@/lib/types";
import ItemCard, { nextStatus } from "./ItemCard";
import ItemEditor from "./ItemEditor";

type Filter = "all" | Status;

type Props = {
  initialItems: Item[];
  config: SiteConfig;
  initiallyEditing: boolean;
  editingEnabled: boolean;
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "reserved", label: "Reserved" },
  { key: "sold", label: "Sold" },
];

function sortItems(items: Item[]): Item[] {
  const rank = (item: Item) => (item.status === "sold" ? 1 : 0);
  return [...items].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export default function SaleBoard({
  initialItems,
  config,
  initiallyEditing,
  editingEnabled,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState(initiallyEditing);
  const [editorItem, setEditorItem] = useState<Item | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const counts = useMemo(
    () => ({
      all: items.length,
      available: items.filter((i) => i.status === "available").length,
      reserved: items.filter((i) => i.status === "reserved").length,
      sold: items.filter((i) => i.status === "sold").length,
    }),
    [items],
  );

  const visible = filter === "all" ? items : items.filter((i) => i.status === filter);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (response.ok) {
      setEditing(true);
      setPasswordOpen(false);
      setPassword("");
      setLoginError("");
    } else {
      const data = await response.json().catch(() => ({}));
      setLoginError(data.error ?? "Wrong password.");
    }
  }

  async function lock() {
    await fetch("/api/auth", { method: "DELETE" });
    setEditing(false);
  }

  async function save(input: ItemInput) {
    const editingExisting = editorItem !== null;
    const response = await fetch(
      editingExisting ? `/api/items/${editorItem!.id}` : "/api/items",
      {
        method: editingExisting ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Could not save.");

    setItems((current) =>
      sortItems(
        editingExisting
          ? current.map((i) => (i.id === data.item.id ? data.item : i))
          : [...current, data.item],
      ),
    );
    setEditorOpen(false);
    setEditorItem(null);
  }

  async function cycleStatus(item: Item) {
    const updated: ItemInput = { ...item, status: nextStatus(item.status) };
    const response = await fetch(`/api/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (!response.ok) return;
    const data = await response.json();
    setItems((current) => sortItems(current.map((i) => (i.id === item.id ? data.item : i))));
  }

  async function remove(item: Item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const response = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (!response.ok) return;
    setItems((current) => current.filter((i) => i.id !== item.id));
  }

  const whatsappHref = config.whatsappNumber
    ? `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent("Hi! I saw your moving sale.")}`
    : "";

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">{config.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{config.intro}</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white"
          >
            Message us on WhatsApp
          </a>
        )}
        <span className="text-muted">
          {counts.available} {counts.available === 1 ? "item" : "items"} available ·{" "}
          {counts.reserved} reserved · {counts.sold} sold
        </span>
      </div>

      {config.paymentLinks.length > 0 && (
        <p className="mt-4 text-muted">
          We prefer{" "}
          {config.paymentLinks.map((link, index) => (
            <span key={link.url}>
              {index > 0 && (index === config.paymentLinks.length - 1 ? ", or " : ", ")}
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-foreground underline"
              >
                {link.label}
              </a>
            </span>
          ))}{" "}
          for payment.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              filter === option.key
                ? "bg-accent text-white"
                : "bg-surface text-foreground ring-1 ring-line"
            }`}
          >
            {option.label} <span className="opacity-70">{counts[option.key]}</span>
          </button>
        ))}
      </div>

      {editing && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-surface p-4 ring-1 ring-line">
          <span className="text-sm font-medium">Edit mode</span>
          <button
            type="button"
            onClick={() => {
              setEditorItem(null);
              setEditorOpen(true);
            }}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            + Add item
          </button>
          <button type="button" onClick={lock} className="text-sm font-medium underline">
            Lock
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="mt-10 text-muted">Nothing here yet.</p>
      ) : (
        <div className="mt-6 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              currency={config.currency}
              whatsappNumber={config.whatsappNumber}
              editing={editing}
              onEdit={(target) => {
                setEditorItem(target);
                setEditorOpen(true);
              }}
              onCycleStatus={cycleStatus}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      {editingEnabled && !editing && (
        <button
          type="button"
          onClick={() => setPasswordOpen(true)}
          className="mt-12 text-sm text-muted underline"
        >
          Owner login
        </button>
      )}

      {passwordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <form onSubmit={unlock} className="w-full max-w-sm rounded-2xl bg-surface p-5">
            <h2 className="mb-3 font-display text-2xl">Owner login</h2>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-line bg-white px-3 py-3 text-base"
            />
            {loginError && <p className="mt-2 text-sm text-red-700">{loginError}</p>}
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-accent px-4 py-3 font-semibold text-white"
              >
                Unlock
              </button>
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className="rounded-xl bg-stone-200 px-4 py-3 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {editorOpen && (
        <ItemEditor
          item={editorItem}
          onCancel={() => {
            setEditorOpen(false);
            setEditorItem(null);
          }}
          onSave={save}
        />
      )}
    </main>
  );
}
