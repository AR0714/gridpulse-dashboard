"""Side-by-side: reference frame (cropped to its hero panel) vs our screenshot (cropped to ours).

Usage:
  python3 scripts/compare.py phase2 [01-hero]        -> docs/progress/phase2-vs-01-hero.png
  python3 scripts/compare.py <reference.png> <ours.png> <out.png>
"""
import sys
from PIL import Image, ImageDraw

a = sys.argv[1:]
if len(a) <= 2:
    name, ref_name = a[0], (a[1] if len(a) > 1 else '01-hero')
    ref_path = f'reference/{ref_name}.png'
    ours_path = f'docs/progress/{name}.png'
    out_path = f'docs/progress/{name}-vs-{ref_name}.png'
else:
    ref_path, ours_path, out_path = a[:3]

ref = Image.open(ref_path).convert('RGB').crop((112, 17, 1457, 725))
ours = Image.open(ours_path).convert('RGB')
ours = ours.crop((24, 16, ours.width - 24, ours.height))
h = 700
ref = ref.resize((round(ref.width * h / ref.height), h), Image.LANCZOS)
ours = ours.resize((round(ours.width * h / ours.height), h), Image.LANCZOS)
gap, top = 16, 40
out = Image.new('RGB', (ref.width + ours.width + gap * 3, h + top + gap), '#111')
out.paste(ref, (gap, top))
out.paste(ours, (ref.width + gap * 2, top))
d = ImageDraw.Draw(out)
d.text((gap, 12), 'REFERENCE  ' + ref_path.split('/')[-1], fill='#ddd')
d.text((ref.width + gap * 2, 12), 'GRIDPULSE  ' + ours_path.split('/')[-1], fill='#ddd')
out.save(out_path)
print(out_path)
