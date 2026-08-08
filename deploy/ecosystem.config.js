// ── SignSpeak AI · PM2 process file (bare-metal path) ─────────
// Start:   pm2 start deploy/ecosystem.config.js
// Save:    pm2 save && pm2 startup (survives reboot)
// Logs:    pm2 logs gateway --lines 100
// The frontend is NOT here: nginx serves the static build and
// proxies /api — PM2 runs the two Node/Python backends only.
module.exports = {
  apps: [
    {
      name: 'signspeak-gateway',
      cwd: './backend/gateway',
      script: 'src/server.js',
      instances: 'max', // cluster mode on all CPUs (Stateless — JWT, no session)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      max_memory_restart: '512M',
      merge_logs: true,
      time: true, // timestamp every log line
    },
    {
      name: 'signspeak-ai',
      cwd: './backend/ai-service',
      // venv-created by deploy.sh — the global python3 has no uvicorn.
      script: './.venv/bin/uvicorn',
      interpreter: 'none', // shebang in .venv/bin/uvicorn handles the rest
      args: 'app.main:app --host 127.0.0.1 --port 8000',
      instances: 1, // TF keeps streaming state in this process — one only
      max_memory_restart: '2G',
      time: true,
    },
  ],
};