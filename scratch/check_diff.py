import subprocess

res = subprocess.run(['git', 'diff', '--', 'frontend/src/sections/SupportedGestures.jsx'], capture_output=True, text=True, encoding='utf-8')
lines = res.stdout.splitlines()
for l in lines:
    if l.startswith('+') and any(k in l.lower() for k in ['stage', 'relative mx-auto', 'overflow', 'border', 'container']):
        print(l[:120])
