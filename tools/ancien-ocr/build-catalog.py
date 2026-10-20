import json, re, subprocess
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'cards'
OUT.mkdir(parents=True, exist_ok=True)
PDFBIN = Path(r'C:\Users\adild\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe')
SOURCES = [
    (Path(r'C:\Users\adild\Downloads\model catcheur carte.pdf'), 'Catcheur', 'catcheur'),
    (Path(r'C:\Users\adild\Downloads\wyatt familly.pdf'), 'Catcheur', 'wyatt'),
    (Path(r'C:\Users\adild\Downloads\-------.pdf'), 'Manager', 'managers'),
    (Path(r'C:\Users\adild\Downloads\Votre texte de paragraphe.pdf'), 'Objet', 'objets'),
    (Path(r'C:\Users\adild\Downloads\model momentum carte .pdf'), 'Momentum', 'momentum'),
]
cards=[]
def compact_letters(line):
    return re.sub(r'(?<=\w) (?=\w)', '', line)

def repeated_label(line):
    compact=compact_letters(line)
    letters=''.join(ch for ch in compact if ch.isalpha())
    period=None
    for n in range(len(letters)//2, 3, -1):
        if letters.startswith(letters[:n]*2):
            period=n
            break
    if not period:
        return None
    title=letters[:period]
    boundaries=[]
    for m in re.finditer(r'\s{2,}', compact):
        before=''.join(ch for ch in compact[:m.start()] if ch.isalpha())
        count=len(before)
        if 0<count<period:
            boundaries.append(count)
    for boundary in sorted(set(boundaries),reverse=True):
        title=title[:boundary]+' '+title[boundary:]
    return title.title()

def stat_number(line):
    digits=''.join(ch for ch in line if ch.isdigit())
    while len(digits)>1 and len(digits)%2==0 and digits[:len(digits)//2]==digits[len(digits)//2:]:
        digits=digits[:len(digits)//2]
    return int(digits) if digits else None

for pdf, category, prefix in SOURCES:
    reader=PdfReader(str(pdf))
    for i,page in enumerate(reader.pages,1):
        category={'catcheur':'Catcheur','wyatt':'Catcheur','managers':'Manager','objets':'Objet','momentum':'Momentum'}[prefix]
        stem=f'{prefix}-{i:02d}'
        target=OUT / stem
        subprocess.run([str(PDFBIN), '-f', str(i), '-l', str(i), '-r', '200', '-png', '-singlefile', str(pdf), str(target)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        raw=page.extract_text() or ''
        flat=re.sub(r'\s+', ' ', raw).strip()
        squashed=re.sub(r'[^a-z]', '', flat.lower())
        first_lines=' '.join(compact_letters(x) for x in raw.splitlines()[:3]).lower()
        if prefix=='wyatt' and 'momentum' in first_lines: category='Momentum'
        elif prefix=='wyatt' and 'objet' in first_lines: category='Objet'
        if stem=='catcheur-40':category='Référence'
        excluded=category=='Catcheur' and bool(re.search(r'undertaker|rayback', squashed))
        lines=raw.splitlines()
        name_line={'Catcheur':10,'Manager':1,'Objet':2,'Momentum':1}.get(category,0)
        rarity_line={'Catcheur':8,'Manager':2,'Objet':1,'Momentum':2}.get(category,0)
        name=repeated_label(lines[name_line]) if len(lines)>name_line else None
        rarity_text=compact_letters(lines[rarity_line]).upper() if len(lines)>rarity_line else ''
        rarity=next((r for r in ('SSR','SR','R') if r in rarity_text),None)
        att=stat_number(lines[1]) if category=='Catcheur' and len(lines)>5 else None
        end=stat_number(lines[5]) if category=='Catcheur' and len(lines)>5 else None
        if stem=='catcheur-40':name='Dos de carte WWE TCG'
        cards.append({
            'id': stem, 'displayName': name or f'{category} · {i:02d}', 'category': category,
            'rarity': rarity, 'attack': att, 'endurance': end,
            'source': pdf.name, 'page': i, 'image': f'public/cards/{stem}.png',
            'textSnippet': flat[:1200], 'playable': not excluded and category!='Référence', 'excludedReason': 'Dos de carte conservé' if category=='Référence' else ('Exclusion demandée' if excluded else None),
            'needsReview': True
        })
(ROOT/'catalog.json').write_text(json.dumps(cards,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(cards)} pages cataloguées; {sum(c["playable"] for c in cards)} proposées; {sum(not c["playable"] for c in cards)} exclues; toutes les fiches sont à vérifier.')
