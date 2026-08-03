import { isEditor } from "@/lib/auth";
import { getSiteConfig } from "@/lib/config";
import { listItems } from "@/lib/store";
import SaleBoard from "@/components/SaleBoard";

export const dynamic = "force-dynamic";

export default async function SalePage() {
  const [items, canEdit] = await Promise.all([listItems(), isEditor()]);

  return (
    <SaleBoard
      initialItems={items}
      config={getSiteConfig()}
      initiallyEditing={canEdit}
      editingEnabled={Boolean(process.env.EDIT_PASSWORD)}
      blobEnabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
    />
  );
}
