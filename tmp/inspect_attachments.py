from pathlib import Path
import hashlib
root=Path(r'C:\Users\adild\.codex\attachments')
seen={}
for p in sorted(root.rglob('Texte collé.txt')):
    data=p.read_bytes(); digest=hashlib.sha256(data).hexdigest()
    print(f'{p.parent.name} | bytes={len(data)} | sha256={digest}')
    if digest not in seen:
        seen[digest]=p
        print('--- UNIQUE TEXT START ---')
        print(data.decode('utf-8-sig', errors='replace')[:22000])
        print('--- UNIQUE TEXT END ---')
