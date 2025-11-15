import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Square, Settings, Video } from "lucide-react";

export default function ScreenRecorderUI() {
    const [apiKey, setApiKey] = useState("");
    const [model, setModel] = useState("");
    const [recording, setRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showSettings, setShowSettings] = useState(false);

    // Load saved values on mount
    useEffect(() => {
        chrome.storage.local.get(["apiKey", "model"], (res: { apiKey?: string; model?: string }) => {
            if (res.apiKey) setApiKey(res.apiKey);
            if (res.model) setModel(res.model);
        });
    }, []);

    // Timer for recording
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (recording) {
            interval = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [recording]);

    const saveSettings = () => {
        chrome.storage.local.set({ apiKey, model });
        alert("Settings saved!");
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Start/Stop recording
    const startRecording = () => {
        if (!apiKey || !model) {
            alert("Please fill in all AI settings before recording.");
            return;
        }
        saveSettings();
        chrome.runtime.sendMessage({ type: "start", apiKey, model });
        setRecording(true);
        setRecordingTime(0);
    };

    const stopRecording = () => {
        chrome.runtime.sendMessage({ type: "stop" });
        setRecording(false);
        setRecordingTime(0);
    };

    return (
        <div className="w-80 p-4 bg-slate-900 text-white font-sans">
            <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Video size={20} /> Screen Recorder
            </h1>

            <div className="mb-3">
                <button
                    className="bg-slate-700 hover:bg-slate-600 p-2 rounded flex items-center gap-2"
                    onClick={() => setShowSettings(!showSettings)}
                >
                    <Settings size={16} /> {showSettings ? "Hide" : "Show"} Settings
                </button>
            </div>

            {showSettings && (
                <div className="p-3 bg-slate-800 rounded-lg">
                    <input
                        className="w-full mb-2 p-2 rounded bg-slate-700"
                        placeholder="API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                    <input
                        className="w-full mb-2 p-2 rounded bg-slate-700"
                        placeholder="Model Name"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                    />
                    <button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded mt-2"
                        onClick={saveSettings}
                    >
                        Save Settings
                    </button>
                </div>
            )}

            {recording && (
                <div className="bg-slate-800 rounded-lg p-4 my-3 text-center">
                    <div className="text-3xl font-mono font-bold mb-2">{formatTime(recordingTime)}</div>
                    <div className="text-sm text-slate-300">Recording...</div>
                </div>
            )}

            <div className="flex flex-col gap-2">
                {!recording ? (
                    <button
                        className="bg-green-600 px-3 py-2 rounded w-full"
                        onClick={startRecording}
                    >
                        Start Recording
                    </button>
                ) : (
                    <button
                        className="bg-red-600 px-3 py-2 rounded w-full"
                        onClick={stopRecording}
                    >
                        <Square size={16} /> Stop Recording
                    </button>
                )}
            </div>
        </div>
    );
}

// Render the UI
const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(<ScreenRecorderUI />);
}
