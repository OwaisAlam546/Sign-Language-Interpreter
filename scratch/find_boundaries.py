import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open('c:/Users/csc/OneDrive/Desktop/Sign-Project/frontend/src/sections/SupportedGestures.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

matches = re.finditer(r'className=["`\']([^"`\']+)["`\']', text)
for m in matches:
    c = m.group(1)
    if any(k in c for k in ['border', 'shadow', 'glow', 'ring', 'gradient', 'rounded', 'glass', 'stage', 'carousel', 'wheel']):
        print(c)
