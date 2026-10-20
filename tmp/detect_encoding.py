from pathlib import Path
for p in [Path(r'C:\Users\adild\.codex\attachments\0ccff095-b12c-4e66-b8e4-976a57a2d951\Texte collé.txt'),Path(r'C:\Users\adild\.codex\attachments\ed16ec3f-50b1-4112-93e4-5920ed61d31d\Texte collé.txt')]:
 b=p.read_bytes(); print(p, b[:80], 'nulls=',b[:1000].count(b'\0'))
 for enc in ['utf-8','utf-16','utf-16le','cp1252','latin1']:
  try:
   t=b.decode(enc); print(enc,repr(t[:120]));
  except Exception as e: print(enc,type(e).__name__)
