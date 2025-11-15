chrome.runtime.onMessage.addListener((msg, _sender) => {
    if (msg?.type === 'start') {
        ensureOffscreenAndForward(msg);
    } else if (msg?.type === 'stop') {
        ensureOffscreenAndForward(msg); // Also ensure offscreen for stop
    }
    return false;
});

async function ensureOffscreenAndForward(msg: any) {
    if (!chrome.offscreen) {
        console.error("Offscreen API unavailable");
        return;
    }

    // Check if offscreen already exists before creating
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

    // Forward message to offscreen
    chrome.runtime.sendMessage(msg);
}