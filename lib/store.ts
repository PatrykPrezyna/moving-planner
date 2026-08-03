import { randomUUID } from "node:crypto";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { Item, ItemInput } from "./types";

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";

/**
 * Postgres in production; a JSON file under .data/ when no connection string is
 * configured, so the app runs locally with `npm run dev` and nothing else set up.
 */
const usePostgres = connectionString.length > 0;

type Row = {
  id: string;
  name: string;
  description: string | null;
  price: string | number | null;
  retail_price: string | number | null;
  link: string | null;
  photos: unknown;
  status: string;
  featured: boolean;
  available_from: string | null;
  created_at: string | Date;
};

function rowToItem(row: Row): Item {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: row.price === null ? null : Number(row.price),
    retailPrice: row.retail_price === null ? null : Number(row.retail_price),
    link: row.link ?? "",
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
    status: row.status as Item["status"],
    featured: row.featured,
    availableFrom: row.available_from ?? "",
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function sortItems(items: Item[]): Item[] {
  const rank = (item: Item) => (item.status === "sold" ? 1 : 0);
  return [...items].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/* ---------------------------------------------------------------- postgres */

const sql = usePostgres ? neon(connectionString) : null;

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!sql) return Promise.resolve();
  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS items (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name           text NOT NULL,
        description    text NOT NULL DEFAULT '',
        price          numeric,
        retail_price   numeric,
        link           text NOT NULL DEFAULT '',
        photos         jsonb NOT NULL DEFAULT '[]'::jsonb,
        status         text NOT NULL DEFAULT 'available',
        featured       boolean NOT NULL DEFAULT false,
        available_from text NOT NULL DEFAULT '',
        created_at     timestamptz NOT NULL DEFAULT now()
      )
    `;
  })().catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}

/* -------------------------------------------------------------- json file */

const dataFile = () => path.join(process.cwd(), ".data", "items.json");

async function readFileItems(): Promise<Item[]> {
  const fs = await import("node:fs/promises");
  try {
    return JSON.parse(await fs.readFile(dataFile(), "utf8")) as Item[];
  } catch {
    return [];
  }
}

async function writeFileItems(items: Item[]): Promise<void> {
  const fs = await import("node:fs/promises");
  await fs.mkdir(path.dirname(dataFile()), { recursive: true });
  await fs.writeFile(dataFile(), JSON.stringify(items, null, 2), "utf8");
}

/* ------------------------------------------------------------------- api */

export async function listItems(): Promise<Item[]> {
  if (sql) {
    await ensureSchema();
    const rows = (await sql`SELECT * FROM items`) as Row[];
    return sortItems(rows.map(rowToItem));
  }
  return sortItems(await readFileItems());
}

export async function createItem(input: ItemInput): Promise<Item> {
  if (sql) {
    await ensureSchema();
    const rows = (await sql`
      INSERT INTO items (name, description, price, retail_price, link, photos, status, featured, available_from)
      VALUES (${input.name}, ${input.description}, ${input.price}, ${input.retailPrice}, ${input.link},
              ${JSON.stringify(input.photos)}::jsonb, ${input.status}, ${input.featured}, ${input.availableFrom})
      RETURNING *
    `) as Row[];
    return rowToItem(rows[0]);
  }

  const item: Item = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  const items = await readFileItems();
  items.push(item);
  await writeFileItems(items);
  return item;
}

export async function updateItem(id: string, input: ItemInput): Promise<Item | null> {
  if (sql) {
    await ensureSchema();
    const rows = (await sql`
      UPDATE items SET
        name = ${input.name},
        description = ${input.description},
        price = ${input.price},
        retail_price = ${input.retailPrice},
        link = ${input.link},
        photos = ${JSON.stringify(input.photos)}::jsonb,
        status = ${input.status},
        featured = ${input.featured},
        available_from = ${input.availableFrom}
      WHERE id = ${id}
      RETURNING *
    `) as Row[];
    return rows.length ? rowToItem(rows[0]) : null;
  }

  const items = await readFileItems();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...input };
  await writeFileItems(items);
  return items[index];
}

export async function deleteItem(id: string): Promise<boolean> {
  if (sql) {
    await ensureSchema();
    const rows = (await sql`DELETE FROM items WHERE id = ${id} RETURNING id`) as { id: string }[];
    return rows.length > 0;
  }

  const items = await readFileItems();
  const remaining = items.filter((i) => i.id !== id);
  if (remaining.length === items.length) return false;
  await writeFileItems(remaining);
  return true;
}
