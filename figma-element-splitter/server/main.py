from __future__ import annotations

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from processor import SplitOptions, split_image


app = FastAPI(title="Figma Element Splitter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/split")
async def split(
    file: UploadFile = File(...),
    background_threshold: int = Form(34),
    min_area: int = Form(45),
    padding: int = Form(6),
    merge_gap: int = Form(10),
    remove_text: bool = Form(True),
    label_band_height: int = Form(28),
    left_text_width: int = Form(190),
    remove_guides: bool = Form(True),
) -> dict:
    try:
        image_bytes = await file.read()
        options = SplitOptions(
            background_threshold=background_threshold,
            min_area=min_area,
            padding=padding,
            merge_gap=merge_gap,
            remove_text=remove_text,
            label_band_height=label_band_height,
            left_text_width=left_text_width,
            remove_guides=remove_guides,
        )
        return split_image(image_bytes, options)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Split failed: {error}") from error
