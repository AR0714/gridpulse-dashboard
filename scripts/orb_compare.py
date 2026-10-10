"""Close-up of the Health orb: reference vs ours, same scale.
Usage: python3 scripts/orb_compare.py <ours.png> <out.png> [reference-name]"""
import sys
from PIL import Image

ours_path, out_path = sys.argv[1], sys.argv[2]
ref_name = sys.argv[3] if len(sys.argv) > 3 else '01-hero'
ref = Image.open(f'reference/{ref_name}.png').convert('RGB').crop((228, 225, 688, 685))   # orb centre ≈ (458, 455)
ours = Image.open(ours_path).convert('RGB').crop((144, 231, 620, 707))               # orb centre ≈ (382, 469)
size = 520
ref, ours = ref.resize((size, size), Image.LANCZOS), ours.resize((size, size), Image.LANCZOS)
out = Image.new('RGB', (size * 2 + 24, size + 16), '#111')
out.paste(ref, (8, 8)); out.paste(ours, (size + 16, 8))
out.save(out_path)
print(out_path)
