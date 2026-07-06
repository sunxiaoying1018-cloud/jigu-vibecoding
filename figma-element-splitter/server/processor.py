from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Any

import cv2
import numpy as np


@dataclass
class SplitOptions:
    background_threshold: int = 34
    min_area: int = 45
    padding: int = 6
    merge_gap: int = 10
    remove_text: bool = True
    label_band_height: int = 28
    left_text_width: int = 190
    remove_guides: bool = True


def split_image(image_bytes: bytes, options: SplitOptions | None = None) -> dict[str, Any]:
    """Split bright ornaments from a dark source image into transparent PNG crops."""
    options = options or SplitOptions()
    image = _decode_image(image_bytes)
    height, width = image.shape[:2]

    raw_mask = _foreground_mask(image, options.background_threshold)
    cleaned_mask = _remove_labels_and_guides(raw_mask, options)
    cleaned_mask = _clean_noise(cleaned_mask)

    components = _extract_components(image, cleaned_mask, options)
    return {
        "source_width": width,
        "source_height": height,
        "count": len(components),
        "elements": components,
    }


def _decode_image(image_bytes: bytes) -> np.ndarray:
    data = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError("Could not decode image bytes.")

    if len(image.shape) == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGRA)
    elif image.shape[2] == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
    elif image.shape[2] != 4:
        raise ValueError("Unsupported image format.")

    return image


def _foreground_mask(image: np.ndarray, threshold: int) -> np.ndarray:
    bgr = image[:, :, :3]
    alpha = image[:, :, 3]
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

    value = hsv[:, :, 2]
    saturation = hsv[:, :, 1]

    # Bright/colored pixels are foreground; pure black background stays out.
    mask = ((value > threshold) | ((gray > threshold - 8) & (saturation > 12))) & (alpha > 8)
    return mask.astype(np.uint8) * 255


def _remove_labels_and_guides(mask: np.ndarray, options: SplitOptions) -> np.ndarray:
    cleaned = mask.copy()
    height, width = cleaned.shape
    separators = _find_separator_rows(cleaned) if options.remove_guides else []

    if options.remove_guides:
        for y in separators:
            y1 = max(0, y - 2)
            y2 = min(height, y + 3)
            cleaned[y1:y2, :] = 0

    if options.remove_text:
        band_starts = [0]
        band_starts.extend(min(height - 1, y + 1) for y in separators)
        for start in band_starts:
            y1 = start
            y2 = min(height, start + options.label_band_height)
            x2 = min(width, options.left_text_width)
            cleaned[y1:y2, :x2] = 0

    return cleaned


def _find_separator_rows(mask: np.ndarray) -> list[int]:
    height, width = mask.shape
    row_counts = np.count_nonzero(mask, axis=1)
    candidate_rows = np.where(row_counts > width * 0.28)[0]

    groups: list[list[int]] = []
    for y in candidate_rows:
        if not groups or y > groups[-1][-1] + 2:
            groups.append([int(y)])
        else:
            groups[-1].append(int(y))

    separators: list[int] = []
    for group in groups:
        center = int(round(sum(group) / len(group)))
        if 8 < center < height - 8:
            separators.append(center)
    return separators


def _clean_noise(mask: np.ndarray) -> np.ndarray:
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    opened = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    return cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)


def _extract_components(
    image: np.ndarray,
    mask: np.ndarray,
    options: SplitOptions,
) -> list[dict[str, Any]]:
    height, width = mask.shape
    if options.merge_gap > 0:
        kernel_size = max(1, options.merge_gap * 2 + 1)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
        group_mask = cv2.dilate(mask, kernel, iterations=1)
    else:
        group_mask = mask

    count, labels, _, _ = cv2.connectedComponentsWithStats(group_mask, connectivity=8)
    components: list[dict[str, Any]] = []

    for label in range(1, count):
        group_pixels = labels == label
        object_pixels = group_pixels & (mask > 0)
        ys, xs = np.where(object_pixels)
        area = int(len(xs))
        if area < options.min_area:
            continue

        x1 = max(0, int(xs.min()) - options.padding)
        y1 = max(0, int(ys.min()) - options.padding)
        x2 = min(width, int(xs.max()) + options.padding + 1)
        y2 = min(height, int(ys.max()) + options.padding + 1)
        crop_width = x2 - x1
        crop_height = y2 - y1
        if crop_width <= 1 or crop_height <= 1:
            continue

        crop = image[y1:y2, x1:x2].copy()
        alpha = np.zeros((crop_height, crop_width), dtype=np.uint8)
        alpha[(mask[y1:y2, x1:x2] > 0)] = 255
        crop[:, :, 3] = alpha

        encoded = cv2.imencode(".png", crop)[1]
        components.append(
            {
                "name": f"ornament_{len(components) + 1:03d}",
                "x": x1,
                "y": y1,
                "width": crop_width,
                "height": crop_height,
                "area": area,
                "png_base64": base64.b64encode(encoded.tobytes()).decode("ascii"),
            }
        )

    components.sort(key=lambda item: (item["y"], item["x"]))
    for index, component in enumerate(components, start=1):
        component["name"] = f"ornament_{index:03d}"

    return components
