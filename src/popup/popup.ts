const startBtn = document.getElementById('start') as HTMLButtonElement;
const stopBtn = document.getElementById('stop') as HTMLButtonElement;
const statusDiv = document.getElementById('status')!;

// Ask Chrome for tabCapture permission
function requestTabCapturePermission(): Promise<boolean> {
    return new Promise((resolve) => {
        chrome.permissions.request({ permissions: ['tabCapture'] }, (granted) => {
            resolve(Boolean(granted));
        });
    });
}

startBtn.onclick = async () => {
    startBtn.disabled = true;
    statusDiv.textContent = 'Requesting permissions...';

    const ok = await requestTabCapturePermission();
    if (!ok) {
        statusDiv.textContent = 'Permission denied.';
        startBtn.disabled = false;
        return;
    }

    // Create offscreen document (needed to run persistent audio processing)
    try {
        await chrome.offscreen.createDocument({
            url: 'offscreen/offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Process audio in background'
        });
    } catch (e) {
        // If already created, Chrome throws — totally normal
        console.warn('offscreen already exists or cannot be created', e);
    }

    chrome.runtime.sendMessage({ type: 'start' });
    statusDiv.textContent = 'Started.';
    stopBtn.disabled = false;
};

stopBtn.onclick = () => {
    chrome.runtime.sendMessage({ type: 'stop' });
    statusDiv.textContent = 'Stopping...';
    stopBtn.disabled = true;
    startBtn.disabled = false;
};
