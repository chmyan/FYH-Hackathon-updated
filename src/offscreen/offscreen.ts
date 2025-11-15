console.log('Offscreen script loaded and ready');

let currentStream: MediaStream | null = null;
let recordingLoop: boolean = false;

chrome.runtime.onMessage.addListener((msg) => {
    console.log('Offscreen received message:', msg);

    if (msg.type === 'start-recording') {
        console.log('Processing START-RECORDING message with streamId:', msg.streamId);
        startRecordingLoop(msg.streamId);
    } else if (msg.type === 'stop-recording') {
        console.log('Processing STOP-RECORDING message');
        stopRecordingLoop();
    }
});

async function startRecordingLoop(streamId: string) {
    console.log('startRecordingLoop() called with streamId:', streamId);

    if (recordingLoop) {
        console.log('Already recording, skipping');
        return;
    }
    recordingLoop = true;

    try {
        // Get the stream using the streamId from background
        console.log('Getting user media with streamId...');
        currentStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            } as any,
            video: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            } as any
        });

        console.log('Stream obtained, tracks:', currentStream.getTracks().length);

        // Start the recording loop
        while (recordingLoop) {
            await recordSingleChunk();
        }

        console.log('Recording loop ended');
    } catch (err) {
        console.error('Failed to start recording:', err);
        recordingLoop = false;
    }
}

async function recordSingleChunk(): Promise<void> {
    if (!currentStream) {
        console.error('No stream available for recording');
        return;
    }

    return new Promise<void>((resolve, reject) => {
        console.log('Starting new 5-second chunk recording...');

        const mediaRecorder = new MediaRecorder(currentStream!, {
            mimeType: 'video/webm; codecs=vp8,opus'
        });

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                console.log('Data chunk received, size:', event.data.size, 'bytes');
                chunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            console.log('Chunk recording stopped, collected', chunks.length, 'blob(s)');

            if (chunks.length > 0) {
                // Combine all blobs into one complete video
                const completeBlob = new Blob(chunks, { type: 'video/webm' });
                console.log('Complete chunk size:', completeBlob.size, 'bytes');

                const base64Chunk = await blobToBase64(completeBlob);
                console.log('Converted to base64, length:', base64Chunk.length);

                const filename = `chunk_${Date.now()}.webm`;
                chrome.runtime.sendMessage({
                    type: 'save-chunk',
                    base64: base64Chunk,
                    filename: filename
                });
                console.log('Sent chunk to background:', filename);
            }

            resolve();
        };

        mediaRecorder.onerror = (e) => {
            console.error('MediaRecorder error:', e);
            reject(e);
        };

        // Start recording with 5-second timeslice
        const TIMESLICE = 5000;
        mediaRecorder.start(TIMESLICE);
        console.log('Chunk recorder started, will stop after 5 seconds');

        // Stop after 5 seconds
        setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
        }, TIMESLICE);
    });
}

function stopRecordingLoop() {
    console.log('stopRecordingLoop() called');

    // Stop the loop
    recordingLoop = false;

    // Stop the stream
    if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
        currentStream = null;
        console.log('Stream tracks stopped');
    }
    chrome.runtime.sendMessage({ type: 'recording-finished' });
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            // Split on the LAST comma to get actual base64 data
            // Format: data:video/webm;codecs=vp8,opus;base64,ACTUALDATA
            const base64Index = dataUrl.lastIndexOf(',');
            const base64 = dataUrl.substring(base64Index + 1);
            console.log('Blob to base64 conversion complete, length:', base64.length);
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}