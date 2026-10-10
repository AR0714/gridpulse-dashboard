"""Contact sheet of burst frames.  Usage: python3 scripts/sheet.py <out.png> <frame1.png> <frame2.png> ..."""
import sys
from PIL import Image, ImageDraw

out_path, frames = sys.argv[1], sys.argv[2:]
cols = 3 if len(frames) > 4 else 2
w, h = 720, 405
rows = (len(frames) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w + (cols + 1) * 8, rows * h + (rows + 1) * 8), '#111')
for k, f in enumerate(frames):
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
    x, y = 8 + (k % cols) * (w + 8), 8 + (k // cols) * (h + 8)
    sheet.paste(im, (x, y))
    ImageDraw.Draw(sheet).text((x + 8, y + h - 18), f.split('/')[-1], fill='#ddd')
sheet.save(out_path)
print(out_path)
