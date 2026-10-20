from pathlib import Path
import pdfplumber
root=Path(r'C:\Users\adild\Downloads')
out=Path('tmp/pdf_extract'); out.mkdir(parents=True,exist_ok=True)
for p in sorted(root.glob('*.pdf')):
 try:
  with pdfplumber.open(p) as pdf:
   pages=[(page.extract_text() or '') for page in pdf.pages]
   target=out/(p.stem+'.txt'); target.write_text('\n\n'.join(f'--- PAGE {i+1} ---\n{t}' for i,t in enumerate(pages)),encoding='utf-8')
   nonempty=sum(bool(t.strip()) for t in pages)
   print(f'{p.name}\tpages={len(pages)}\ttext_pages={nonempty}\ttext_chars={sum(len(t) for t in pages)}\toutput={target}')
   for i,t in enumerate(pages):
    print(f'PAGE {i+1}: {t[:220].replace(chr(10)," | ")}')
 except Exception as e: print(f'ERROR {p.name}: {e}')
