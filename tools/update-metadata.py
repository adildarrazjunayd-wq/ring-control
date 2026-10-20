import json, re, warnings
from collections import Counter
from pathlib import Path
import pdfplumber
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
FILES={
 'model catcheur carte.pdf':Path(r'C:\Users\adild\Downloads\model catcheur carte.pdf'),
 'wyatt familly.pdf':Path(r'C:\Users\adild\Downloads\wyatt familly.pdf'),
 '-------.pdf':Path(r'C:\Users\adild\Downloads\-------.pdf'),
 'Votre texte de paragraphe.pdf':Path(r'C:\Users\adild\Downloads\Votre texte de paragraphe.pdf'),
 'model momentum carte .pdf':Path(r'C:\Users\adild\Downloads\model momentum carte .pdf'),
}
warnings.filterwarnings('ignore')
readers={name:PdfReader(str(path)) for name,path in FILES.items()}
plumbers={name:pdfplumber.open(str(path)) for name,path in FILES.items()}
data=json.loads((ROOT/'catalog.json').read_text(encoding='utf-8'))
def compact(s):return re.sub(r'(?<=\w) (?=\w)','',s)
def dedup_words(words):
    best={}
    for w in words:
        text=w['text'].strip()
        if text and text not in best:best[text]=w
    return sorted(best.values(),key=lambda x:x['x0'])
def title_for(page,category):
    words=page.extract_words(extra_attrs=['size'])
    if category=='Catcheur':
        candidates=[w for w in words if w['top'] < -5 and w['x0']<145 and w['size']>=9 and re.search(r'[A-Za-zÀ-ÿ]',w['text'])]
        if candidates:
            y=min(w['top'] for w in candidates)
            candidates=[w for w in candidates if abs(w['top']-y)<1.0]
    else:
        candidates=[w for w in words if 135<=w['top']<=175 and w['size']>=10 and re.search(r'[A-Za-zÀ-ÿ]',w['text'])]
    # The source renders outlined glyphs as duplicate layers. Collapse each x-position to the shortest text run.
    by_x={}
    for w in candidates:
        x=round(w['x0'],1)
        if x not in by_x or len(w['text'])<len(by_x[x]['text']):by_x[x]=w
    chosen=sorted(by_x.values(),key=lambda x:x['x0'])
    title=' '.join(w['text'] for w in chosen)
    title=re.sub(r'\s+',' ',title).strip(' -')
    title=title.replace('�','É')
    return title if len(title)>=3 else None
def rarity_for(page):
    words=page.extract_words(extra_attrs=['size'])
    candidates=[w for w in words if w['top']<10 and w['x0']>130 and w['size']>=10]
    for w in candidates:
        val=re.sub(r'[^A-Za-z]','',w['text']).upper()
        if val in ('SSR','SR','R'):return val
    return None
def stats_for(page):
    words=page.extract_words(extra_attrs=['size'])
    candidates=[w for w in words if w['top']>220 and w['size']>=10 and w['text'].isdigit()]
    by_x={}
    for w in candidates:
        x=round(w['x0'],1)
        if x not in by_x or len(w['text'])<len(by_x[x]['text']):by_x[x]=w
    unique=[]
    for w in sorted(by_x.values(),key=lambda x:x['x0']):
        n=int(w['text'])
        if n not in unique:unique.append(n)
    return unique[:2] if len(unique)>=2 else []
def category_for(c,raw):
    category={'model catcheur carte.pdf':'Catcheur','wyatt familly.pdf':'Catcheur','-------.pdf':'Manager','Votre texte de paragraphe.pdf':'Objet','model momentum carte .pdf':'Momentum'}[c['source']]
    top=' '.join(compact(x) for x in raw.splitlines()[:3]).lower()
    if c['id']=='catcheur-40':return 'Référence'
    if c['source']=='wyatt familly.pdf' and 'momentum' in top:return 'Momentum'
    if c['source']=='wyatt familly.pdf' and 'objet' in top:return 'Objet'
    return category
for c in data:
    pdf=readers[c['source']]; page=plumbers[c['source']].pages[c['page']-1]
    raw=pdf.pages[c['page']-1].extract_text() or ''
    category=category_for(c,raw); c['category']=category
    name=title_for(page,category)
    if c['id']=='catcheur-40':name='Dos de carte WWE TCG'
    if name:c['displayName']=name
    c['rarity']=rarity_for(page)
    c['attack']=c['endurance']=None
    if category=='Catcheur':
        stats=stats_for(page)
        if len(stats)==2:c['attack'],c['endurance']=stats
    c['textSnippet']=re.sub(r'\s+',' ',raw).strip()[:1200]
    c['needsReview']=True
    squashed=re.sub(r'[^a-z]','',c['textSnippet'].lower())
    excluded=(category=='Catcheur' and ('undertaker' in squashed or 'rayback' in squashed)) or category=='Référence'
    c['playable']=not excluded
    c['excludedReason']=('Dos de carte conservé' if category=='Référence' else 'Exclusion demandée') if excluded else None
(ROOT/'catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
for pdf in plumbers.values():pdf.close()
print(f'{len(data)} fiches; {sum("·" in x["displayName"] for x in data)} noms non extraits; toutes restent à vérifier.')
