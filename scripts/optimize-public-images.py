"""Encode the existing artwork for delivery; never redraw or crop the originals."""
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "frontend/src/assets/community-icons"
OUTPUT = ROOT / "frontend/public/app-images/v1"
MANIFEST = ROOT / "frontend/src/shared/assets/publicImages.manifest.json"
ARTWORK = {
    "loginDesktop": ("principal_login.webp", 1536, 88),
    "loginMobile": ("imagen_login_movil.webp", 945, 88),
    "communityFamilies": ("community-families.webp", 640, 90),
    "communityCare": ("community-care.webp", 640, 90),
    "communityParticipation": ("community-participation.webp", 640, 90),
    "communityLearning": ("community-learning.webp", 640, 90),
    "communityGoals": ("community-goals.webp", 640, 90),
    "communityJoy": ("community-joy.webp", 640, 90),
    "communityTree": ("community-tree.webp", 640, 90),
}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    images = {}
    for key, (filename, max_width, quality) in ARTWORK.items():
        source_path = SOURCE / filename
        original_bytes = source_path.read_bytes()
        with Image.open(source_path) as original:
            image = ImageOps.exif_transpose(original).convert("RGBA")
            if image.width > max_width:
                height = round(image.height * max_width / image.width)
                image = image.resize((max_width, height), Image.Resampling.LANCZOS)
            encoded = io.BytesIO()
            image.save(encoded, "WEBP", quality=quality, method=6, exact=True)
            data = encoded.getvalue()
            if len(data) >= len(original_bytes):
                raise ValueError(f"Optimization did not reduce {filename}")
            with Image.open(io.BytesIO(data)) as check:
                check.load()
                if check.size != image.size:
                    raise ValueError(f"Unexpected output dimensions: {filename}")
                if check.convert("RGBA").getchannel("A").tobytes() != image.getchannel("A").tobytes():
                    raise ValueError(f"Transparency changed: {filename}")
            digest = hashlib.sha256(data).hexdigest()[:12]
            output_name = f"{source_path.stem}.{digest}.webp"
            (OUTPUT / output_name).write_bytes(data)
            images[key] = {
                "file": output_name,
                "width": image.width,
                "height": image.height,
                "bytes": len(data),
                "source": source_path.relative_to(ROOT).as_posix(),
                "originalBytes": len(original_bytes),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
            print(f"{filename}: {len(original_bytes):,} -> {len(data):,} bytes ({image.width}x{image.height})")
    manifest = {
        "baseUrl": "https://storage.googleapis.com/treasury-system-app-vivas-email-assets/app/v1",
        "images": images,
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    before = sum(image["originalBytes"] for image in images.values())
    after = sum(image["bytes"] for image in images.values())
    print(f"TOTAL: {before:,} -> {after:,} bytes; reduction {100 * (1 - after / before):.1f}%")


if __name__ == "__main__":
    main()
