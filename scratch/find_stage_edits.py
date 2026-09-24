import json, sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\csc\.gemini\antigravity-ide\brain\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'stageRef' in line and ('replace_file_content' in line or 'write_to_file' in line):
            obj = json.loads(line)
            tool_calls = obj.get('tool_calls', [])
            for tc in tool_calls:
                fn = tc.get('function', {})
                if 'stageRef' in str(fn.get('arguments', '')):
                    print(f"Step {i}: {fn.get('name')}")
                    args = fn.get('arguments', {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    if isinstance(args, dict):
                        print('TargetFile:', args.get('TargetFile'))
                        print('Instruction:', args.get('Instruction'))
                        rc = args.get('ReplacementContent', '')
                        for l in rc.splitlines():
                            if any(k in l for k in ['stageRef', 'cursor-grab', 'h-[', 'rounded-', 'border']):
                                print('  ', l.strip()[:100])
