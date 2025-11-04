import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { uploadToSupabase, postCallback, deleteFromSupabase } from "./supabase.js";
import fs from "node:fs/promises";

export async function processJob(job) {
  const id = job.jobId || randomUUID();
  const tmpOut = join(tmpdir(), `${id}.mp4`);
  const args = buildFfmpegArgs(job.inputUrl, tmpOut, job.ffmpegArgs);

  console.log("Starting FFmpeg", args.join(" "));
  await runFFmpeg(args);

  const uploadRes = await uploadToSupabase(tmpOut, job.outputPath);

// Delete the original video if original_path was provided
if (job.originalPath) {
  try {
    await deleteFromSupabase(job.originalPath);
    console.log(`Original video deleted: ${job.originalPath}`);
  } catch (deleteError) {
    console.error(`Failed to delete original video: ${deleteError.message}`);
    // Don't fail the whole job if deletion fails
  }
}

  const outputs = [
    {
      path: job.outputPath,
      size: uploadRes.size,
      content_type: "video/mp4",
      etag: uploadRes.etag ?? null
    }
  ];

  await postCallback(job.callbackUrl, job.callbackSecret, {
    job_id: id,
    video_id: job.videoId,
    outputs
  });

  try { await fs.unlink(tmpOut); } catch {}

  return { job_id: id, outputs };
}

function buildFfmpegArgs(inputUrl, outPath, customArgs) {
  if (Array.isArray(customArgs) && customArgs.length > 0) {
    return ["-y", "-i", inputUrl, ...customArgs, outPath];
  }
  return [
    "-y",
    "-i", inputUrl,
    "-c:v", "libx265",
    "-preset", "medium",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "128k",
    outPath
  ];
}

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"] });
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}
