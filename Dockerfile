FROM node:20-bullseye
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
RUN useradd -m worker && chown -R worker:worker /app
USER worker
EXPOSE 3000
CMD ["npm", "start"]
