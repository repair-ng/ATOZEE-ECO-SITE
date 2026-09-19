import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getPresignedUploadUrl, buildUploadKey, publicObjectUrl } from "@/lib/storage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILENAME_LENGTH = 200;

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType } = await req.json().catch(() => ({}));

  if (!filename || typeof filename !== "string" || filename.length > MAX_FILENAME_LENGTH) {
    return NextResponse.json({ error: "A valid filename is required." }, { status: 400 });
  }
  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, or GIF images are allowed." },
      { status: 400 }
    );
  }

  const key = buildUploadKey(filename, "products");

  try {
    const uploadUrl = await getPresignedUploadUrl(key);
    return NextResponse.json({ uploadUrl, key, publicUrl: publicObjectUrl(key) });
  } catch (err) {
    console.error("Failed to create presigned upload URL", err);
    return NextResponse.json(
      { error: "Could not prepare upload. Check MinIO is running and configured." },
      { status: 502 }
    );
  }
}
