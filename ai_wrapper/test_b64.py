import base64

def video_to_base64(path: str = "test.webm") -> str:
    """
    Reads a local video file and returns its Base64-encoded string.
    
    :param path: Path to the video file (default is 'test.webm')
    :return: Base64-encoded string representation of the file
    """
    with open(path, "rb") as video_file:
        video_bytes = video_file.read()
        base64_bytes = base64.b64encode(video_bytes)
        base64_string = base64_bytes.decode("utf-8")
    return base64_string


import subprocess
from pathlib import Path

def convert_mov_to_webm(input_path: str = "test.mov", output_path: str = "test.webm") -> None:
    """
    Convert a .mov video file to .webm using ffmpeg.

    :param input_path: Path to the input .mov file.
    :param output_path: Path for the output .webm file.
    """
    input_path = Path(input_path)
    output_path = Path(output_path)

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    # Basic ffmpeg command for MOV -> WEBM (VP9 video + Opus audio)
    cmd = [
        "/opt/homebrew/bin/ffmpeg",
        "-y",                 # overwrite output file without asking
        "-i", str(input_path),
        "-c:v", "libvpx-vp9", # video codec
        "-b:v", "1M",         # video bitrate (adjust as needed)
        "-c:a", "libopus",    # audio codec
        str(output_path),
    ]

    # Run the command
    completed = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    if completed.returncode != 0:
        # You can print completed.stderr for debugging if needed
        raise RuntimeError(f"ffmpeg failed with error:\n{completed.stderr}")

    print(f"Converted {input_path} -> {output_path}")

import base64
from pathlib import Path

def pdf_file_to_b64(path: str = "test.pdf") -> str:
    """
    Read a PDF file and return a base64-encoded string.

    Args:
        path: Path to the PDF file (default: 'test.pdf' in current directory).

    Returns:
        Base64-encoded string of the PDF contents.
    """
    pdf_path = Path(path)

    # Optional: check that the file exists
    if not pdf_path.is_file():
        raise FileNotFoundError(f"No such file: {pdf_path}")

    with pdf_path.open("rb") as f:
        pdf_bytes = f.read()

    # Encode to base64 and convert bytes -> str
    b64_bytes = base64.b64encode(pdf_bytes)
    b64_string = b64_bytes.decode("utf-8")

    return b64_string

if __name__ == "__main__":
    # Simple CLI usage; just runs on test.mov in the current directory
    convert_mov_to_webm("test.mov", "test.webm")
    #with open("test.webm.b64", "w") as f:
    #    f.write(video_to_base64())


    with open("test.pdf.b64", "w") as f:
        f.write(pdf_file_to_b64("testslides.pdf"))
    
