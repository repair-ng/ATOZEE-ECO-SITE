export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { inv } from "@/lib/inv-guard";
import { buildInventoryTemplate } from "@/lib/inv-import";

// Every signed-in staff role (Yuchai, Atozee, global admin) can download the upload template.
export const GET = inv({}, async () => {
  const buf = buildInventoryTemplate();
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="inventory-upload-template.xlsx"',
      "Content-Length": String(buf.length),
      "Cache-Control": "no-store",
    },
  });
});
