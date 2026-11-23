# The 5-letter English words of the system's Hunspell dictionaries (US, GB, CA, AU), the words and their
# forms (plurals, verb forms...), without proper nouns: the extra valid guesses of /wordle.
# Run by hand: python3 scripts/wordle-guesses.py  ->  scripts/wordle-guesses.txt
import re, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'wordle-guesses.txt')

def load_aff(path):
    rules = {}  # flag -> (cross, [(strip, add, cond)])
    flagtype = None
    for line in open(path, encoding='utf-8', errors='replace'):
        p = line.split()
        if len(p) >= 4 and p[0] == 'SFX' and p[3].isdigit() or (len(p) == 4 and p[0] == 'SFX' and p[2] in 'YN' and p[3].isdigit()):
            rules[p[1]] = [p[2] == 'Y', []]
        elif len(p) >= 5 and p[0] == 'SFX':
            strip = '' if p[2] == '0' else p[2]
            add = '' if p[3] == '0' else p[3].split('/')[0]
            rules[p[1]][1].append((strip, add, re.compile(('.' if p[4] == '.' else p[4]) + '$')))
    return rules

def expand(dic, aff):
    rules = load_aff(aff)
    out = set()
    lines = open(dic, encoding='utf-8', errors='replace').read().split('\n')[1:]
    for l in lines:
        if not l.strip():
            continue
        word, _, flags = l.strip().partition('/')
        flags = flags.split()[0] if flags else ''
        if not word.islower():
            continue
        out.add(word)
        for f in flags:
            if f in rules:
                for strip, add, cond in rules[f][1]:
                    if cond.search(word) and word.endswith(strip):
                        out.add(word[:len(word) - len(strip)] + add)
    return out

words = set()
for lang in ['en_US', 'en_GB', 'en_CA', 'en_AU']:
    w = expand(f'/usr/share/hunspell/{lang}.dic', f'/usr/share/hunspell/{lang}.aff')
    five = {x for x in w if re.fullmatch(r'[a-z]{5}', x)}
    print(lang, len(w), len(five))
    words |= five
print(len(words))
open(OUT, 'w').write('\n'.join(sorted(words)))
