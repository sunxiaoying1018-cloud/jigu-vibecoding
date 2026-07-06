from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path

from processor import SplitOptions, split_image


def main() -> None:
    parser = argparse.ArgumentParser(description="Split a dark-background ornament sheet into transparent PNGs.")
    parser.add_argument("image", type=Path)
    parser.add_argument("--out", type=Path, default=Path("output"))
    parser.add_argument("--background-threshold", type=int, default=34)
    parser.add_argument("--min-area", type=int, default=45)
    parser.add_argument("--padding", type=int, default=6)
    parser.add_argument("--merge-gap", type=int, default=10)
    parser.add_argument("--keep-text", action="store_true")
    parser.add_argument("--label-band-height", type=int, default=28)
    parser.add_argument("--left-text-width", type=int, default=190)
    args = parser.parse_args()

    result = split_image(
        args.image.read_bytes(),
        SplitOptions(
            background_threshold=args.background_threshold,
            min_area=args.min_area,
            padding=args.padding,
            merge_gap=args.merge_gap,
            remove_text=not args.keep_text,
            label_band_height=args.label_band_height,
            left_text_width=args.left_text_width,
        ),
    )

    args.out.mkdir(parents=True, exist_ok=True)
    manifest = []
    for element in result["elements"]:
        filename = f"{element['name']}.png"
        (args.out / filename).write_bytes(base64.b64decode(element["png_base64"]))
        manifest.append({key: value for key, value in element.items() if key != "png_base64"} | {"file": filename})

    (args.out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Exported {len(manifest)} elements to {args.out}")


if __name__ == "__main__":
    main()
