import React, { useState, useEffect } from 'react';
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

const ScreenRecorderUI: React.FC = () => {
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

  // Load saved settings
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

  // Timer for recording
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
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

  // Settings panel
  const renderSettingsPanel = (
    settingsObj: SettingsState, 
    setSettingsObj: React.Dispatch<React.SetStateAction<SettingsState>>, 
    onSave: () => void, 
    isChat = false
  ) => (
    <div className="mt-3 p-3 bg-slate-800 border border-slate-700 rounded-lg max-h-80 overflow-y-auto">
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Settings size={16} /> {isChat ? 'Chat ' : ''}Configuration
      </h2>

      {/* Provider selector */}
      <div className="mb-3">
        <label className="text-xs text-slate-300 block mb-1">AI Provider</label>
        <input
          type="text"
          placeholder="Search providers..."
          value={providerSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProviderSearch(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
        />
        {providerSearch && (
          <div className="mt-1 bg-slate-700 border border-slate-600 rounded-lg max-h-32 overflow-y-auto">
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
                className="w-full text-left px-2 py-1.5 hover:bg-slate-600 text-sm"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        {!providerSearch && (
          <div className="text-xs text-slate-400 mt-1">
            Current: {allProviders.find(p => p.value === settingsObj.provider)?.label}
          </div>
        )}
      </div>

      {/* Model selector */}
      <div className="mb-3">
        <label className="text-xs text-slate-300 block mb-1">Model</label>
        <input
          type="text"
          placeholder="Search models..."
          value={modelSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModelSearch(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
        />
        {modelSearch && (
          <div className="mt-1 bg-slate-700 border border-slate-600 rounded-lg max-h-32 overflow-y-auto">
            {filteredModels(settingsObj).map((m: string) => (
              <button
                key={m}
                onClick={() => { 
                  setSettingsObj({ ...settingsObj, model: m }); 
                  setModelSearch(''); 
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-slate-600 text-sm"
              >
                {m}
              </button>
            ))}
          </div>
        )}
        {!modelSearch && (
          <div className="text-xs text-slate-400 mt-1">
            Current: {settingsObj.model}
          </div>
        )}
      </div>

      {/* API Key input */}
      <div className="mb-3">
        <label className="text-xs text-slate-300 block mb-1">API Key</label>
        <input
          type="password"
          placeholder="sk-... or your API key"
          value={settingsObj.apiKey}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettingsObj({ ...settingsObj, apiKey: e.target.value })}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      <button
        onClick={onSave}
        disabled={!settingsObj.apiKey}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {settingsSaved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );

  return (
    <div className="w-80 min-h-96 bg-slate-900 text-white font-sans">
      {mode === 'selection' && (
        <div className="p-4">
          <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Video size={20} />
            Screen Recorder
          </h1>
          
          <button
            onClick={handleStartRecording}
            className="w-full bg-indigo-600 hover:bg-indigo-700 p-3 rounded-lg mb-3 flex items-center justify-center gap-2 transition-colors font-medium"
          >
            <Video size={18} /> Start Recording
          </button>
          
          <button
            onClick={() => setMode('chat')}
            className="w-full bg-purple-600 hover:bg-purple-700 p-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
          >
            <MessageSquare size={18} /> Chat with AI
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full mt-3 bg-slate-700 hover:bg-slate-600 p-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <Settings size={16} /> {showSettings ? 'Hide' : 'Show'} Settings
          </button>
          
          {showSettings && renderSettingsPanel(settings, setSettings, saveSettings)}
        </div>
      )}

      {mode === 'recording' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackToSelection}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Back to menu"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold">Recording...</h1>
            <div className="w-8" /> {/* Spacer for alignment */}
          </div>

          <div className="bg-slate-800 rounded-lg p-4 mb-4 text-center">
            <div className="text-3xl font-mono font-bold mb-2">{formatTime(recordingTime)}</div>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${recordingState === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
              <span className="text-sm text-slate-300">
                {recordingState === 'recording' ? 'Recording' : 'Paused'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {recordingState === 'recording' && (
              <>
                <button 
                  onClick={handlePauseRecording} 
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 p-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                >
                  <Pause size={18} /> Pause
                </button>
                <button 
                  onClick={handleStopRecording} 
                  className="flex-1 bg-red-600 hover:bg-red-700 p-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                >
                  <Square size={18} /> Stop
                </button>
              </>
            )}
            {recordingState === 'paused' && (
              <>
                <button 
                  onClick={handleResumeRecording} 
                  className="flex-1 bg-green-600 hover:bg-green-700 p-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                >
                  <Play size={18} /> Resume
                </button>
                <button 
                  onClick={handleStopRecording} 
                  className="flex-1 bg-red-600 hover:bg-red-700 p-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                >
                  <Square size={18} /> Stop
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {mode === 'chat' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackToSelection}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Back to menu"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold">AI Chat</h1>
            <button
              onClick={() => setShowChatSettings(!showChatSettings)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Chat settings"
            >
              <Settings size={18} />
            </button>
          </div>

          {showChatSettings && renderSettingsPanel(chatSettings, setChatSettings, saveChatSettings, true)}

          <div className="bg-slate-800 rounded-lg p-3 mb-3 h-64 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-slate-400 text-sm text-center mt-20">
                Start a conversation with AI
              </div>
            ) : (
              messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`mb-3 ${m.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div 
                    className={`inline-block p-2 rounded-lg text-sm max-w-[85%] ${
                      m.role === 'user' 
                        ? 'bg-indigo-600' 
                        : 'bg-slate-700'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {isLoadingResponse && (
              <div className="text-left mb-3">
                <div className="inline-block p-2 rounded-lg text-sm bg-slate-700">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentMessage(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              disabled={!chatSettings.apiKey}
              className="flex-1 p-2 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:border-indigo-500 text-sm disabled:opacity-50"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || !chatSettings.apiKey}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed p-2 rounded-lg transition-colors"
            >
              <Send size={18} />
            </button>
          </div>

          {!chatSettings.apiKey && (
            <div className="mt-2 text-xs text-yellow-500 flex items-center gap-1">
              <Settings size={12} /> Configure API key to enable chat
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScreenRecorderUI;