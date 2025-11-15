const API_BASE_URL = "http://139.84.201.117:8000";


let currentStreamId: string | null = null;
let currentTabUrl: string = 'unknown';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'start') {
        handleStart();
    } else if (msg?.type === 'stop') {
        handleStop();
    } else if (msg?.type === 'save-chunk') {
        // Handle chunk from offscreen and post to backend
        handleChunkDownload(msg.base64, msg.filename);
    } else if (msg?.type === 'get-stream') {
        // Offscreen requests the stream
        if (currentStreamId) {
            sendResponse({ streamId: currentStreamId });
        } else {
            sendResponse({ error: 'No stream available' });
        }
        return false;
    }
    return false;
});

async function handleStart() {
    console.log('Background: Starting capture');

    // Get the active tab URL for metadata
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabUrl = tabs[0]?.url || 'unknown';
    console.log('Current tab URL:', currentTabUrl);

    // Ensure offscreen exists
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length === 0) {
        try {
            await chrome.offscreen.createDocument({
                url: 'src/offscreen/offscreen.html',
                reasons: ['AUDIO_PLAYBACK'],
                justification: 'Record tab video/audio for transcription pipeline'
            });
            console.log('Offscreen created');
            await new Promise(resolve => setTimeout(resolve, 150));
        } catch (e: any) {
            console.error('Failed to create offscreen:', e);
            return;
        }
    }

    // Capture the tab stream
    try {
        const streamId = await new Promise<string>((resolve, reject) => {
            chrome.tabCapture.getMediaStreamId({ targetTabId: undefined }, (id) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(id);
                }
            });
        });

        console.log('Got streamId:', streamId);
        currentStreamId = streamId;

        // Tell offscreen to start recording with this streamId
        chrome.runtime.sendMessage({ type: 'start-recording', streamId });
    } catch (err) {
        console.error('Failed to get stream:', err);
    }
}

async function handleStop() {
    console.log('Background: Stopping capture');
    currentStreamId = null;

    // Tell offscreen to stop recording
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
        chrome.runtime.sendMessage({ type: 'stop-recording' });
    }

    // ======== Request generated notes from server ========
    try {
        const endpoint = `${API_BASE_URL}/generate_notes`;

        // Load user settings from storage
        const { apiKey, model } = await chrome.storage.local.get(["apiKey", "model"]);
        const modelKwargs = { model };
        const openrouterApiKey = apiKey;

        if (!openrouterApiKey || !modelKwargs.model) {
            throw new Error('Missing OpenRouter settings in local storage.');
        }

        const payload = {
            query: "Summarize the recorded video into notes.",
            model_kwargs: modelKwargs,
            openrouter_api_key: openrouterApiKey
        };

        console.log('Posting query to generate_notes endpoint...', endpoint);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data: { result?: string } = await response.json();
        if (!data.result) {
            throw new Error('Backend response missing "result" field.');
        }

        // Convert to Blob and download
        const blob = new Blob([data.result], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({
            url,
            filename: `notes_${Date.now()}.md`,
            saveAs: true
        });

        console.log('Markdown notes downloaded!');
    } catch (err) {
        console.error('Failed to generate notes:', err);
    }
}



function handleChunkDownload(base64: string, filename: string) {
    console.log('Background: Chunk received:', filename);
    console.log('Base64 length:', base64?.length);

    // Post to Flask backend
    postChunkToBackend(base64, filename);
}

async function postChunkToBackend(base64: string, filename: string) {

    // Load user settings from storage
    const { apiKey, model } = await chrome.storage.local.get([
        "apiKey",
        "model"
    ]);
    const endpoint = `${API_BASE_URL}/upload_video_clip`;
    const API_KEY = apiKey;
    const MODEL_KWARGS = { model };

    if (!API_KEY || !MODEL_KWARGS.model) {
        console.warn('Skipping upload: missing OpenRouter settings.');
        return;
    }

    const payload = {
        video_base64: base64,
        model_kwargs: MODEL_KWARGS,
        openrouter_api_key: API_KEY,
        metadata: {
            url: currentTabUrl,
            timestamp: Date.now(),
            chunk_id: filename
        }
    };

    try {
        console.log('Posting chunk to backend:', endpoint);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data: { result?: unknown } = await response.json();
        console.log("Backend:", data);
    } catch (err) {
        console.error("Failed to post:", err);
    }
}
