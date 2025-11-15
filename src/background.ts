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

    // Ensure offscreen exists
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
        chrome.runtime.sendMessage({ type: 'stop-recording' });
    }
}

function handleChunkDownload(base64: string, filename: string) {
    console.log('Background: Chunk received:', filename);
    console.log('Base64 length:', base64?.length);

    // Post to Flask backend
    postChunkToBackend(base64, filename);
}

async function postChunkToBackend(base64: string, filename: string) {
    // ===== CONFIGURATION - UPDATE THESE =====
    const FLASK_SERVER_URL = 'http://10.70.121.198:8000/upload_video_clip'; // Your Flask endpoint
    const API_KEY = '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'; // Your API key
    const MODEL_KWARGS = {
        model: 'google/gemini-2.5-flash',

        // Add other model parameters here
    };
    // ========================================

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
        console.log('Posting chunk to backend:', FLASK_SERVER_URL);
        console.log(base64)
        const response = await fetch(FLASK_SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Backend response:', result);
    } catch (error) {
        console.error('Failed to post chunk to backend:', error);
    }
}