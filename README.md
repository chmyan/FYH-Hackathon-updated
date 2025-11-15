# Tab Transcriber Chrome Extension

This repository contains a Chrome extension that records the current tab, streams 5-second video chunks to an OpenRouter-powered FastAPI backend, and downloads AI-generated lecture notes once the recording stops. The backend lives in `./ai_wrapper` and exposes REST endpoints that the extension calls during recording.

## Architecture Overview

- **Chrome extension (`src/`)**
  - Background service worker (`background.ts`) coordinates recording, uploads video chunks, and requests generated notes.
  - Offscreen document (`src/offscreen/`) captures media from the active tab using `chrome.tabCapture` and turns it into Base64 WebM segments.
  - Popup UI (`popup.tsx`) lets the user start/stop recording and persist their OpenRouter API key and model in Chrome storage.
- **FastAPI backend (`ai_wrapper/`)**
  - `server.py` defines the `/upload_video_clip` and `/generate_notes` endpoints.
  - `backend.py` converts uploaded clips to MP4, embeds transcriptions, and requests lecture notes from OpenRouter.
  - `utils.py` provides helpers for PDF/page handling, cosine similarity, and media conversion.

The extension communicates with the backend hosted at `http://139.84.201.117:8000` by default. If you run the backend locally for development, keep the same API contract so the extension continues to work.

## Prerequisites

### Extension
- Node.js 18+
- npm 9+

### Backend
- Python 3.10+
- `pip` for dependency installation
- [ffmpeg](https://ffmpeg.org/download.html) (required for WebM → MP4 conversion)
- [poppler-utils](https://poppler.freedesktop.org/) (required by `pdf2image` if you process PDFs)

Python packages (install with `pip install ...`):
```
fastapi uvicorn[standard] openai numpy pillow pdf2image
```

## Setup & Compilation

### 1. Install JavaScript dependencies
```bash
npm install
```

### 2. Build the extension bundle
```bash
npm run build:extension
```
This produces the distributable extension in the `dist/` directory, including the background service worker, popup UI, offscreen document, and `manifest.json`.

### 3. (Optional) Run the FastAPI backend locally
If you are not using the hosted backend at `http://139.84.201.117:8000`, start a local server with matching endpoints:
```bash
cd ai_wrapper
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```
Keep your OpenRouter API key handy for authenticating with the OpenRouter API.

## Usage

1. Load the extension in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Choose **Load unpacked** and select the `dist/` folder generated in step 2
2. Click the *Tab Transcriber* extension icon to open the popup.
3. Enter your OpenRouter API key and preferred model (e.g., `google/gemini-2.5-pro`), then save the settings.
4. Navigate to the tab you want to capture and click **Start Recording**.
   - The offscreen document records 5-second chunks and the background worker uploads them to `http://139.84.201.117:8000/upload_video_clip`.
5. Click **Stop Recording** when finished.
   - The background worker requests notes from `http://139.84.201.117:8000/generate_notes` using your saved OpenRouter credentials.
6. A Markdown file (`notes_<timestamp>.md`) automatically downloads with the generated lecture notes.

## Development Tips

- Use `npm run dev` to iterate on the popup UI with Vite's dev server.
- Logs from the background service worker and offscreen document appear in `chrome://extensions` → *Service Worker* console and the offscreen document's DevTools respectively.
- Ensure your OpenRouter API key has sufficient quota and the requested model is available under your account.
- When running the backend locally, confirm ffmpeg is installed and available on `PATH`; otherwise video conversion will fail.

## Troubleshooting

- **Missing API key/model**: The popup prevents recording until both fields are provided and stored.
- **Backend errors**: Check the background service worker console for HTTP status codes or detailed exceptions returned by the FastAPI server.
- **Note generation failures**: Ensure at least one transcription file exists under `ai_wrapper/transcriptions/` and that the OpenRouter request succeeds.

## License

See individual package licenses in the `node_modules` directory and the `ai_wrapper` codebase. This project itself does not currently specify an explicit license.
