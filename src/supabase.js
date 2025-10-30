import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET || "videos";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Upload will fail.");
}

const sb = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_ROLE_KEY || "");

export async function uploadToSupabase(localPath, destPath) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase env not configured");
  }
  const data = await fs.readFile(localPath);
  const { data: up, error } = await sb.storage.from(OUTPUT_BUCKET)
    .upload(destPath, data, {
      contentType: "video/mp4",
      upsert: true
    });
  if (error) throw error;

  const dirPath = destPath.split("/").slice(0, -1).join("/") || "";
  const baseName = destPath.split("/").pop();
  const { data: list } = await sb.storage.from(OUTPUT_BUCKET).list(dirPath, { search: baseName });
  const size = list?.[0]?.metadata?.size ?? data.length;
  return { ...up, size };
}

export async function postCallback(callbackUrl, callbackSecret, payload) {
  const res = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Callback-Secret": callbackSecret
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Callback failed: ${res.status} ${text}`);
  }
  return true;
}
