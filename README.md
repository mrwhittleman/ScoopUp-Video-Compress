ScoopUp-Video-Compress (Render Video Worker)

What this service does
- Receives POST /work with:
  - input_url: signed URL to the source video
  - output_path: where to store in Supabase Storage (e.g., videos/123/output.mp4)
  - callback_url: your Supabase Edge Function URL that acknowledges completion
  - callback_secret: shared secret checked by the Edge Function
  - Optional: video_id, job_id, ffmpeg_args[]
- Transcodes with FFmpeg
- Uploads to Supabase Storage using SUPABASE_SERVICE_ROLE_KEY
- Calls the callback with results

Environment variables (Render → your service → Environment)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- OUTPUT_BUCKET (default: videos)
- PORT (Render sets this automatically)

Deploy on Render
1) In Render: New → Web Service → connect this GitHub repo.
2) Region near your users.
3) Render detects the Dockerfile automatically.
4) Set env vars and deploy.
5) When Live, your public URL is shown (e.g., https://your-worker.onrender.com).
   - Your WORKER_URL is that URL or with /work if you prefer that path.

Test locally (optional, if you use Docker)
- docker build -t render-worker .
- docker run -p 3000:3000 --env SUPABASE_URL=... --env SUPABASE_SERVICE_ROLE_KEY=... render-worker
- curl -X POST http://localhost:3000/work -H "Content-Type: application/json" -d '{
    "input_url": "https://signed-url/input.mp4",
    "output_path": "videos/demo/output.mp4",
    "callback_url": "https://YOUR-PROJECT.functions.supabase.co/transcode-callback",
    "callback_secret": "YOUR_SECRET"
  }'
