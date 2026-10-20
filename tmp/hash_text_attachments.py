from pathlib import Path
import hashlib
for p in sorted(Path(r'C:\Users\adild\.codex\attachments').rglob('Texte collé.txt')):
 b=p.read_bytes();print(p.parent.name,len(b),hashlib.sha256(b).hexdigest())
