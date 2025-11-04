import http from "node:http";
import { URL } from "node:url";
import { processJob } from "./src/ffmpeg.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true }));
    }

    if (req.method === "POST" && (url.pathname === "/" || url.pathname === "/work")) {
      const body = await readJson(req);
      const required = ["input_url", "output_path", "callback_url", "callback_secret"];
      for (const k of required) {
        if (!body?.[k]) throw new Error(`Missing field: ${k}`);
      }

      const job = {
        inputUrl: body.input_url,
        outputPath: body.output_path,
        videoId: body.video_id ?? null,
        jobId: body.job_id ?? null,
        ffmpegArgs: Array.isArray(body.ffmpeg_args) ? body.ffmpeg_args : null,
        callbackUrl: body.callback_url,
        callbackSecret: body.callback_secret,
        originalPath: body.original_path ?? null
      };

      const result = await processJob(job);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", result }));
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err) {
    console.error(err);
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
});

server.listen(PORT, () => {
  console.log(`Worker listening on :${PORT}`);
});

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}
