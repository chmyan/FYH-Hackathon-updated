console.log('Offscreen script loaded and ready');

let mediaRecorder: MediaRecorder | null = null;
let isRecording = false;

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((msg, sender) => {
    console.log('Offscreen received message:', msg, 'from:', sender);

    if (msg.type === 'start') {
        console.log('Processing START message');
        startCapture();
    } else if (msg.type === 'stop') {
        console.log('Processing STOP message');
        stopCapture();
    }
});

async function startCapture() {
    console.log('startCapture() called, isRecording:', isRecording);

    if (isRecording) {
        console.log('Already recording, skipping');
        return;
    }
    isRecording = true;

    console.log('Offscreen: starting tab video+audio capture');

    try {
        const stream: MediaStream = await new Promise((resolve, reject) => {
            console.log('Calling chrome.tabCapture.capture...');
            try {
                chrome.tabCapture.capture({ audio: true, video: true }, (s) => {
                    console.log('tabCapture callback, stream:', s);
                    if (!s) {
                        const err = chrome.runtime.lastError?.message || 'tabCapture failed';
                        console.error('tabCapture error:', err);
                        reject(new Error(err));
                    } else {
                        console.log('Stream obtained successfully');
                        resolve(s);
                    }
                });
            } catch (e) {
                console.error('tabCapture exception:', e);
                reject(e);
            }
        });

        console.log('Creating MediaRecorder...');
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8,opus' });

        mediaRecorder.ondataavailable = async (event) => {
            console.log('ondataavailable fired');
            if (event.data && event.data.size > 0) {
                console.log('New chunk captured, size:', event.data.size, 'bytes');

                // Convert blob to base64
                const base64Chunk = await blobToBase64(event.data);
                console.log('Converted to base64, length:', base64Chunk.length);

                // "Upload" or store — here we save it using Chrome downloads for testing
                const filename = `chunk_${Date.now()}.txt`;
                chrome.downloads.download({
                    url: `data:text/plain;base64,${base64Chunk}`,
                    filename: filename,
                    conflictAction: 'uniquify'
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        console.error('Download error:', chrome.runtime.lastError);
                    } else {
                        console.log('Saved chunk as file:', filename, 'downloadId:', downloadId);
                    }
                });
            } else {
                console.log('ondataavailable: no data or size is 0');
            }
        };

        mediaRecorder.onstop = () => {
            console.log('Offscreen: mediaRecorder stopped');
            stream.getTracks().forEach((t) => t.stop());
            isRecording = false;
            chrome.runtime.sendMessage({ type: 'recording-finished' });
        };

        mediaRecorder.onerror = (e) => {
            console.error('MediaRecorder error:', e);
        };

        const TIMESLICE = 5000; // 5 seconds
        mediaRecorder.start(TIMESLICE);
        console.log('Offscreen: MediaRecorder started, chunk size ~5s, state:', mediaRecorder.state);
    } catch (err) {
        console.error('Failed to start capture:', err);
        isRecording = false;
    }
}

function stopCapture() {
    console.log('stopCapture() called, mediaRecorder state:', mediaRecorder?.state);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        console.log('Offscreen: stopping recording...');
        mediaRecorder.stop();
    }
    isRecording = false;
}

// Helper: Convert Blob to Base64 string
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}