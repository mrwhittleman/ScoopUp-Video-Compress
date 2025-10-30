import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { uploadToSupabase, postCallback } from "./supabase.js";
import fs from "node:fs/promises";

export async function processJob(job) {
  const id = job.jobId || randomUUID();
  const tmpOut = join(tmpdir(), `${id}.mp4`);
  const args = buildFfmpegArgs(job.inputUrl, tmpOut, job.ffmpegArgs);

  console.log("Starting FFmpeg", args.join(" "));
  await runFFmpeg(args);

  const uploadRes = await uploadToSupabase(tmpOut, job.outputPath);

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
