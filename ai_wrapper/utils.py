import base64
import subprocess
import tempfile
import os


import base64
import subprocess


import base64
import subprocess
import tempfile
import os
import hashlib
import threading

import base64
import os
import tempfile
import hashlib
import threading
import base64
import subprocess
import numpy as np

def top_k_cosine_sim(query_emb, emb_list, k=5):
    """
    query_emb: 1D array, shape (d,)
    emb_list:  2D array, shape (n, d)
    k:         how many top matches to return

    Returns:
        indices: indices of the top-k most similar embeddings
        scores:  corresponding cosine similarity scores
    """
    query = np.asarray(query_emb)                 # (d,)
    embs = np.asarray(emb_list)                   # (n, d)

    # Normalize query and list of embeddings
    query_norm = query / (np.linalg.norm(query) + 1e-8)
    embs_norm = embs / (np.linalg.norm(embs, axis=1, keepdims=True) + 1e-8)

    # Cosine similarity = dot(normalized vectors)
    sims = embs_norm @ query_norm                 # (n,)

    # Get indices of top-k similarities (sorted descending)
    top_k_idx = np.argsort(-sims)[:k]

    return top_k_idx, sims[top_k_idx]


def webm_b64_to_mp4_b64(webm_b64: str) -> str:
    """
    Convert a base64-encoded WebM clip to a base64-encoded MP4 clip using raw ffmpeg.

    - No temp files are created.
    - Safe for multithreading / async: each call only uses pipes.

    Requirements:
      - ffmpeg installed and available on PATH.
    """

    # Handle data URLs like "data:video/webm;base64,AAAA..."
    if "," in webm_b64 and webm_b64.strip().startswith("data:"):
        webm_b64 = webm_b64.split(",", 1)[1]

    # Decode base64 -> raw WebM bytes
    webm_bytes = base64.b64decode(webm_b64)

    # ffmpeg command:
    #   - reads WebM from stdin (pipe:0)
    #   - writes MP4 to stdout (pipe:1)
    cmd = [
        "ffmpeg",
        "-loglevel", "error",          # only show errors
        "-f", "webm",                  # format of input from pipe
        "-i", "pipe:0",                # stdin
        "-c:v", "libx264",             # H.264 video
        "-c:a", "aac",                 # AAC audio
        "-movflags", "frag_keyframe+empty_moov",  # allow MP4 to non-seekable output
        "-f", "mp4",                   # output format
        "pipe:1",                      # stdout
    ]

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    out_mp4_bytes, err = proc.communicate(input=webm_bytes)

    if proc.returncode != 0:
        # You can log `err.decode()` somewhere server-side
        raise RuntimeError(
            f"ffmpeg failed with code {proc.returncode}: {err.decode(errors='ignore')}"
        )

    # Encode MP4 bytes back to base64
    return base64.b64encode(out_mp4_bytes).decode("ascii")

from typing import List
from pdf2image import convert_from_bytes
from PIL import Image  # just for type hints / clarity

def b64_pdf_to_pil_images(b64_pdf: str) -> List[Image.Image]:
    """
    Convert a base64-encoded PDF into a list of PIL Image objects,
    one per page.

    Args:
        b64_pdf: Base64-encoded string representing the PDF file.

    Returns:
        List of PIL.Image.Image objects, one for each page in the PDF.
    """
    # Decode the base64 string to raw PDF bytes
    pdf_bytes = base64.b64decode(b64_pdf)

    # Convert PDF bytes to a list of PIL Images (one per page)
    images = convert_from_bytes(pdf_bytes)

    return images
import base64
from io import BytesIO
from PIL import Image  # just for type hints / clarity

def pil_image_to_jpeg_b64(img: Image.Image) -> str:
    """
    Convert a PIL Image to a base64-encoded JPEG string.

    Args:
        img: PIL.Image.Image object.

    Returns:
        Base64-encoded JPEG image as a UTF-8 string.
    """
    # JPEG doesn't support transparency, so convert if needed
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGB")

    buffer = BytesIO()
    img.save(buffer, format="JPEG")
    buffer.seek(0)

    jpeg_bytes = buffer.getvalue()
    b64_bytes = base64.b64encode(jpeg_bytes)
    b64_string = b64_bytes.decode("utf-8")

    return b64_string

