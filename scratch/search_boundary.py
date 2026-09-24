import json, sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\csc\.gemini\antigravity-ide\brain\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'boundary' in line:
            obj = json.loads(line)
            t = obj.get('type')
            txt = str(obj.get('content', ''))
            idx = txt.find('boundary')
            while idx != -1:
                start = max(0, idx - 80)
                end = min(len(txt), idx + 80)
                snippet = txt[start:end].replace('\n', ' ')
                print(f'Line {i} ({t}): ...{snippet}...')
                idx = txt.find('boundary', idx + 1)
