import { useState, useEffect } from 'react';
import {
    Play, Pause, Square, Settings, Video, MessageSquare, ArrowLeft, Send
} from 'lucide-react';

type AIProvider = 'openai' | 'anthropic' | 'google' | 'cohere' | 'custom';
type RecordingState = 'idle' | 'recording' | 'paused';
type Mode = 'selection' | 'recording' | 'chat';

interface SettingsState {
    provider: AIProvider;
    apiKey: string;
    model: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const styles = {
    container: {
        width: '320px',
        minHeight: '384px',
        backgroundColor: '#0f172a',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    padding: { padding: '16px' },
    heading: {
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    button: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: '500',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.2s',
        fontSize: '14px'
    },
    buttonPrimary: {
        backgroundColor: '#4f46e5',
        color: 'white'
    },
    buttonPurple: {
        backgroundColor: '#7c3aed',
        color: 'white'
    },
    buttonSecondary: {
        backgroundColor: '#334155',
        color: 'white'
    },
    buttonYellow: {
        backgroundColor: '#ca8a04',
        color: 'white'
    },
    buttonRed: {
        backgroundColor: '#dc2626',
        color: 'white'
    },
    buttonGreen: {
        backgroundColor: '#16a34a',
        color: 'white'
    },
    input: {
        width: '100%',
        padding: '6px 8px',
        backgroundColor: '#334155',
        border: '1px solid #475569',
        borderRadius: '8px',
        color: 'white',
        fontSize: '14px',
        outline: 'none'
    },
    label: {
        fontSize: '12px',
        color: '#cbd5e1',
        display: 'block',
        marginBottom: '4px'
    },
    settingsPanel: {
        marginTop: '12px',
        padding: '12px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        maxHeight: '320px',
        overflowY: 'auto' as const
    },
    dropdown: {
        marginTop: '4px',
        backgroundColor: '#334155',
        border: '1px solid #475569',
        borderRadius: '8px',
        maxHeight: '128px',
        overflowY: 'auto' as const
    },
    dropdownItem: {
        width: '100%',
        padding: '6px 8px',
        textAlign: 'left' as const,
        cursor: 'pointer',
        border: 'none',
        backgroundColor: 'transparent',
        color: 'white',
        fontSize: '14px'
    },
    timer: {
        fontSize: '32px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        marginBottom: '8px'
    },
    statusDot: {
        width: '12px',
        height: '12px',
        borderRadius: '50%'
    },
    chatContainer: {
        backgroundColor: '#1e293b',
        borderRadius: '8px',
        padding: '12px',
        height: '256px',
        overflowY: 'auto' as const,
        marginBottom: '12px'
    },
    message: {
        marginBottom: '12px'
    },
    messageBubble: {
        display: 'inline-block',
        padding: '8px',
        borderRadius: '8px',
        fontSize: '14px',
        maxWidth: '85%'
    }
};

const ScreenRecorderUI = () => {
    const [mode, setMode] = useState<Mode>('selection');
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [showSettings, setShowSettings] = useState(false);
    const [showChatSettings, setShowChatSettings] = useState(false);

    const [settings, setSettings] = useState<SettingsState>({
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4'
    });

    const [chatSettings, setChatSettings] = useState<SettingsState>({
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4'
    });

    const [settingsSaved, setSettingsSaved] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [providerSearch, setProviderSearch] = useState('');
    const [modelSearch, setModelSearch] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isLoadingResponse, setIsLoadingResponse] = useState(false);

    const allProviders = [
        { value: 'openai' as AIProvider, label: 'OpenAI' },
        { value: 'anthropic' as AIProvider, label: 'Anthropic (Claude)' },
        { value: 'google' as AIProvider, label: 'Google (Gemini)' },
        { value: 'cohere' as AIProvider, label: 'Cohere' },
        { value: 'custom' as AIProvider, label: 'Custom API' }
    ];

    const modelOptions: Record<AIProvider, string[]> = {
        openai: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
        anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        google: ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'],
        cohere: ['command', 'command-light', 'command-nightly'],
        custom: ['custom-model']
    };

    const filteredProviders = allProviders.filter(p =>
        p.label.toLowerCase().includes(providerSearch.toLowerCase())
    );

    const filteredModels = (settingsObj: SettingsState): string[] =>
        modelOptions[settingsObj.provider].filter((m: string) =>
            m.toLowerCase().includes(modelSearch.toLowerCase())
        );

    useEffect(() => {
        const stored = localStorage.getItem('recorderSettings');
        if (stored) {
            const parsed = JSON.parse(stored);
            setSettings(parsed);
            setHasApiKey(!!parsed.apiKey);
        }

        const chatStored = localStorage.getItem('chatSettings');
        if (chatStored) setChatSettings(JSON.parse(chatStored));
    }, []);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (recordingState === 'recording') {
            interval = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [recordingState]);

    const saveSettings = () => {
        localStorage.setItem('recorderSettings', JSON.stringify(settings));
        setHasApiKey(!!settings.apiKey);
        setSettingsSaved(true);
        setTimeout(() => {
            setSettingsSaved(false);
            setShowSettings(false);
        }, 1500);
    };

    const saveChatSettings = () => {
        localStorage.setItem('chatSettings', JSON.stringify(chatSettings));
        setSettingsSaved(true);
        setTimeout(() => {
            setSettingsSaved(false);
            setShowChatSettings(false);
        }, 1500);
    };

    const handleStartRecording = () => {
        if (!hasApiKey) {
            setShowSettings(true);
            return;
        }
        setRecordingState('recording');
        setRecordingTime(0);
        setMode('recording');
    };

    const handlePauseRecording = () => setRecordingState('paused');
    const handleResumeRecording = () => setRecordingState('recording');

    const handleStopRecording = () => {
        setRecordingState('idle');
        setRecordingTime(0);
        setMode('selection');
    };

    const handleBackToSelection = () => {
        if (recordingState !== 'idle') {
            if (window.confirm('Stop recording and go back?')) {
                handleStopRecording();
            }
        } else {
            setMode('selection');
        }
    };

    const handleSendMessage = () => {
        if (!currentMessage.trim() || !chatSettings.apiKey) return;

        const userMessage: Message = { role: 'user', content: currentMessage };
        setMessages(prev => [...prev, userMessage]);
        setCurrentMessage('');
        setIsLoadingResponse(true);

        setTimeout(() => {
            const aiMessage: Message = {
                role: 'assistant',
                content: 'Simulated AI response. Connect to real API for actual responses.'
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsLoadingResponse(false);
        }, 1000);
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    };

    const renderSettingsPanel = (
        settingsObj: SettingsState,
        setSettingsObj: React.Dispatch<React.SetStateAction<SettingsState>>,
        onSave: () => void,
        isChat = false
    ) => (
        <div style={styles.settingsPanel}>
            <h2 style={{...styles.label, fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Settings size={16} /> {isChat ? 'Chat ' : ''}Configuration
            </h2>

            <div style={{marginBottom: '12px'}}>
                <label style={styles.label}>AI Provider</label>
                <input
                    type="text"
                    placeholder="Search providers..."
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    style={styles.input}
                />
                {providerSearch && (
                    <div style={styles.dropdown}>
                        {filteredProviders.map(p => (
                            <button
                                key={p.value}
                                onClick={() => {
                                    setSettingsObj({
                                        ...settingsObj,
                                        provider: p.value,
                                        model: modelOptions[p.value][0]
                                    });
                                    setProviderSearch('');
                                }}
                                style={styles.dropdownItem}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                )}
                {!providerSearch && (
                    <div style={{fontSize: '12px', color: '#94a3b8', marginTop: '4px'}}>
                        Current: {allProviders.find(p => p.value === settingsObj.provider)?.label}
                    </div>
                )}
            </div>

            <div style={{marginBottom: '12px'}}>
                <label style={styles.label}>Model</label>
                <input
                    type="text"
                    placeholder="Search models..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    style={styles.input}
                />
                {modelSearch && (
                    <div style={styles.dropdown}>
                        {filteredModels(settingsObj).map((m: string) => (
                            <button
                                key={m}
                                onClick={() => {
                                    setSettingsObj({ ...settingsObj, model: m });
                                    setModelSearch('');
                                }}
                                style={styles.dropdownItem}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                )}
                {!modelSearch && (
                    <div style={{fontSize: '12px', color: '#94a3b8', marginTop: '4px'}}>
                        Current: {settingsObj.model}
                    </div>
                )}
            </div>

            <div style={{marginBottom: '12px'}}>
                <label style={styles.label}>API Key</label>
                <input
                    type="password"
                    placeholder="sk-... or your API key"
                    value={settingsObj.apiKey}
                    onChange={(e) => setSettingsObj({ ...settingsObj, apiKey: e.target.value })}
                    style={styles.input}
                />
            </div>

            <button
                onClick={onSave}
                disabled={!settingsObj.apiKey}
                style={{
                    ...styles.button,
                    ...styles.buttonPrimary,
                    opacity: !settingsObj.apiKey ? 0.5 : 1,
                    cursor: !settingsObj.apiKey ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => !settingsObj.apiKey ? null : e.currentTarget.style.backgroundColor = '#4338ca'}
                onMouseLeave={(e) => !settingsObj.apiKey ? null : e.currentTarget.style.backgroundColor = '#4f46e5'}
            >
                {settingsSaved ? '✓ Saved!' : 'Save Settings'}
            </button>
        </div>
    );

    return (
        <div style={styles.container}>
            {mode === 'selection' && (
                <div style={styles.padding}>
                    <h1 style={styles.heading}>
                        <Video size={20} />
                        Screen Recorder
                    </h1>

                    <button
                        onClick={handleStartRecording}
                        style={{...styles.button, ...styles.buttonPrimary, marginBottom: '12px'}}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
                    >
                        <Video size={18} /> Start Recording
                    </button>

                    <button
                        onClick={() => setMode('chat')}
                        style={{...styles.button, ...styles.buttonPurple}}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                    >
                        <MessageSquare size={18} /> Chat with AI
                    </button>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        style={{...styles.button, ...styles.buttonSecondary, marginTop: '12px', padding: '8px'}}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                    >
                        <Settings size={16} /> {showSettings ? 'Hide' : 'Show'} Settings
                    </button>

                    {showSettings && renderSettingsPanel(settings, setSettings, saveSettings)}
                </div>
            )}

            {mode === 'recording' && (
                <div style={styles.padding}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                        <button
                            onClick={handleBackToSelection}
                            style={{padding: '8px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white'}}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 style={{fontSize: '18px', fontWeight: 'bold'}}>Recording...</h1>
                        <div style={{width: '32px'}} />
                    </div>

                    <div style={{backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', marginBottom: '16px', textAlign: 'center'}}>
                        <div style={styles.timer}>{formatTime(recordingTime)}</div>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                            <div style={{
                                ...styles.statusDot,
                                backgroundColor: recordingState === 'recording' ? '#ef4444' : '#eab308',
                                animation: recordingState === 'recording' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                            }} />
                            <span style={{fontSize: '14px', color: '#cbd5e1'}}>
                                {recordingState === 'recording' ? 'Recording' : 'Paused'}
                            </span>
                        </div>
                    </div>

                    <div style={{display: 'flex', gap: '8px'}}>
                        {recordingState === 'recording' && (
                            <>
                                <button
                                    onClick={handlePauseRecording}
                                    style={{...styles.button, ...styles.buttonYellow, flex: 1}}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a16207'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ca8a04'}
                                >
                                    <Pause size={18} /> Pause
                                </button>
                                <button
                                    onClick={handleStopRecording}
                                    style={{...styles.button, ...styles.buttonRed, flex: 1}}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                >
                                    <Square size={18} /> Stop
                                </button>
                            </>
                        )}
                        {recordingState === 'paused' && (
                            <>
                                <button
                                    onClick={handleResumeRecording}
                                    style={{...styles.button, ...styles.buttonGreen, flex: 1}}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                                >
                                    <Play size={18} /> Resume
                                </button>
                                <button
                                    onClick={handleStopRecording}
                                    style={{...styles.button, ...styles.buttonRed, flex: 1}}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                >
                                    <Square size={18} /> Stop
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {mode === 'chat' && (
                <div style={styles.padding}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                        <button
                            onClick={handleBackToSelection}
                            style={{padding: '8px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white'}}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 style={{fontSize: '18px', fontWeight: 'bold'}}>AI Chat</h1>
                        <button
                            onClick={() => setShowChatSettings(!showChatSettings)}
                            style={{padding: '8px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white'}}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <Settings size={18} />
                        </button>
                    </div>

                    {showChatSettings && renderSettingsPanel(chatSettings, setChatSettings, saveChatSettings, true)}

                    <div style={styles.chatContainer}>
                        {messages.length === 0 ? (
                            <div style={{color: '#94a3b8', fontSize: '14px', textAlign: 'center', marginTop: '80px'}}>
                                Start a conversation with AI
                            </div>
                        ) : (
                            messages.map((m, i) => (
                                <div
                                    key={i}
                                    style={{
                                        ...styles.message,
                                        textAlign: m.role === 'user' ? 'right' : 'left'
                                    }}
                                >
                                    <div
                                        style={{
                                            ...styles.messageBubble,
                                            backgroundColor: m.role === 'user' ? '#4f46e5' : '#334155'
                                        }}
                                    >
                                        {m.content}
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoadingResponse && (
                            <div style={{textAlign: 'left', marginBottom: '12px'}}>
                                <div style={{...styles.messageBubble, backgroundColor: '#334155'}}>
                                    <div style={{display: 'flex', gap: '4px'}}>
                                        <div style={{width: '8px', height: '8px', backgroundColor: '#94a3b8', borderRadius: '50%', animation: 'bounce 1s infinite'}} />
                                        <div style={{width: '8px', height: '8px', backgroundColor: '#94a3b8', borderRadius: '50%', animation: 'bounce 1s infinite 0.15s'}} />
                                        <div style={{width: '8px', height: '8px', backgroundColor: '#94a3b8', borderRadius: '50%', animation: 'bounce 1s infinite 0.3s'}} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{display: 'flex', gap: '8px'}}>
                        <input
                            type="text"
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type your message..."
                            disabled={!chatSettings.apiKey}
                            style={{...styles.input, flex: 1, opacity: !chatSettings.apiKey ? 0.5 : 1}}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!currentMessage.trim() || !chatSettings.apiKey}
                            style={{
                                ...styles.buttonPrimary,
                                padding: '8px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: !currentMessage.trim() || !chatSettings.apiKey ? 'not-allowed' : 'pointer',
                                opacity: !currentMessage.trim() || !chatSettings.apiKey ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => (!currentMessage.trim() || !chatSettings.apiKey) ? null : e.currentTarget.style.backgroundColor = '#4338ca'}
                            onMouseLeave={(e) => (!currentMessage.trim() || !chatSettings.apiKey) ? null : e.currentTarget.style.backgroundColor = '#4f46e5'}
                        >
                            <Send size={18} />
                        </button>
                    </div>

                    {!chatSettings.apiKey && (
                        <div style={{marginTop: '8px', fontSize: '12px', color: '#eab308', display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <Settings size={12} /> Configure API key to enable chat
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ScreenRecorderUI;