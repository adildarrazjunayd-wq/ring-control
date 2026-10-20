from pathlib import Path
import pdfplumber, hashlib, logging
logging.disable(logging.CRITICAL)
root=Path(r'C:\Users\adild\Downloads')
for p in sorted(root.glob('*.pdf')):
 with pdfplumber.open(p) as pdf:
  print(f'{p.name}: {len(pdf.pages)} pages, {p.stat().st_size} bytes')
for f in [Path(r'C:\Users\adild\.codex\attachments\0ccff095-b12c-4e66-b8e4-976a57a2d951\Texte collé.txt'),Path(r'C:\Users\adild\.codex\attachments\ed16ec3f-50b1-4112-93e4-5920ed61d31d\Texte collé.txt')]:
 t=f.read_text(encoding='utf-8-sig')
 print(f'\nSOURCE {f.parent.name} chars={len(t)} sha={hashlib.sha256(t.encode()).hexdigest()}')
 for line in t.splitlines():
  if line.startswith('#'):
   print(line[:240])
