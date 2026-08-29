#!/usr/bin/env python
"""
wlasl_word_counts.py — Load the WLASL metadata JSON (NO videos) and report how
many video instances exist for a set of target words. Exact-match first; if a
word isn't found, fall back to close-match aliases and fuzzy substring search.

Usage:
  .venv/Scripts/python scripts/wlasl_word_counts.py
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / 'data' / 'wlasl' / 'WLASL_v0.3.json'

# Target words requested by the user.
TARGETS = ['hello', 'sorry', 'yes', 'no', 'please', 'good', 'help']

# Close-match aliases to check when the exact gloss name is absent.
ALIASES = {
    'hello':   ['hi', 'greet', 'greeting', 'hello-1', 'hello1'],
    'sorry':   ['apologize', 'apology', 'excuse', 'excuse me'],
    'yes':     ['yeah', 'yep', 'correct', 'affirm'],
    'no':      ['nope', 'negative', 'not'],
    'please':  ['thanks', 'thank you', 'thank', 'thanking'],
    'good':    ['great', 'nice', 'fine', 'okay', 'ok', 'well'],
    'help':    ['assist', 'assistance', 'aid'],
}


def load():
    if not JSON_PATH.exists():
        raise SystemExit(f'ERROR: WLASL metadata not found at {JSON_PATH}')
    with open(JSON_PATH, encoding='utf-8') as f:
        data = json.load(f)
    # Build gloss -> instance-count map (case-insensitive key)
    counts = {}
    for entry in data:
        name = (entry.get('gloss') or '').strip().lower()
        n = len(entry.get('instances', []))
        # Some glosses may repeat; sum if so.
        counts[name] = counts.get(name, 0) + n
    return counts


def main():
    counts = load()
    print(f'Loaded {len(counts)} glosses from {JSON_PATH.name}\n')

    # Index of all gloss names for fuzzy substring matching
    all_names = sorted(counts.keys())

    for word in TARGETS:
        w = word.lower()
        print(f'=== {word.upper()} ===')

        exact = counts.get(w)
        if exact is not None:
            print(f'  EXACT "{w}": {exact} video instance(s)')
            # also report any other glosses that are exactly this word
            continue

        # Not found exactly — try aliases
        found_alias = False
        for alias in ALIASES.get(word, []):
            if alias in counts:
                print(f'  exact miss — close match "{alias}": {counts[alias]} video instance(s)')
                found_alias = True

        # Substring fuzzy matches (contains word or word contains gloss)
        subs = [n for n in all_names
                if (w in n.split()) or (n in w.split()) or (w in n) or (n in w)]
        # de-dup and exclude already-printed aliases
        subs = [n for n in subs if n != w and n not in ALIASES.get(word, [])]
        if subs:
            found_alias = True
            print(f'  substring matches:')
            for n in sorted(subs, key=lambda x: -counts[x]):
                print(f'    "{n}": {counts[n]} video instance(s)')

        if not found_alias:
            print('  NOT FOUND (no exact, alias, or substring match)')
        print()

    # Summary table
    print('=== SUMMARY (exact or best match) ===')
    for word in TARGETS:
        w = word.lower()
        if w in counts:
            print(f'  {word:>8}: {counts[w]} (exact)')
            continue
        best = None
        for alias in ALIASES.get(word, []):
            if alias in counts:
                best = (alias, counts[alias], 'alias')
                break
        if best is None:
            subs = [n for n in all_names if (w in n) or (n in w)]
            if subs:
                best = (sorted(subs, key=lambda x: -counts[x])[0],
                        counts[sorted(subs, key=lambda x: -counts[x])[0]], 'substring')
        if best:
            print(f'  {word:>8}: {best[1]} (via {best[0]!r} {best[2]})')
        else:
            print(f'  {word:>8}: NOT FOUND')


if __name__ == '__main__':
    main()
