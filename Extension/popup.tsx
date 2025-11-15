import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Settings, Check, AlertCircle, ChevronDown, ChevronUp, Search, Video, MessageSquare, Upload, X, Send } from 'lucide-react';

type AIProvider = 'openai' | 'anthropic' | 'google' | 'cohere' | 'custom';
type RecordingState = 'idle' | 'recording' | 'paused';
type Mode = 'selection' | 'recording' | 'chat';

interface Settings {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ScreenRecorderUI = () => {
  const [mode, setMode] = useState<Mode>('selection');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4'
  });
  const [chatSettings, setChatSettings] = useState<Settings>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4'
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [customProvider, setCustomProvider] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [isAddingCustomProvider, setIsAddingCustomProvider] = useState(false);
  const [isAddingCustomModel, setIsAddingCustomModel] = useState(false);
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingState === 'recording') {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  const loadSettings = async () => {
    const stored = localStorage.getItem('recorderSettings');
    if (stored) {
      const parsed = JSON.parse(stored);
      setSettings(parsed);
      setHasApiKey(!!parsed.apiKey);
    }
    const chatStored = localStorage.getItem('chatSettings');
    if (chatStored) {
      setChatSettings(JSON.parse(chatStored));
    }
  };

  const saveSettings = async () => {
    localStorage.setItem('recorderSettings', JSON.stringify(settings));
    setHasApiKey(!!settings.apiKey);
    setSettingsSaved(true);
    setTimeout(() => {
      setSettingsSaved(false);
      setShowSettings(false);
    }, 1500);
  };

  const saveChatSettings = async () => {
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
    setIsMinimized(true);
    setMode('recording');
  };

  const handlePauseRecording = () => {
    setRecordingState('paused');
  };

  const handleResumeRecording = () => {
    setRecordingState('recording');
  };

  const handleStopRecording = () => {
    setRecordingState('idle');
    setRecordingTime(0);
    setIsMinimized(false);
    setMode('selection');
    setUploadedPDF(null);
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !chatSettings.apiKey) return;
    
    const userMessage: Message = { role: 'user', content: currentMessage };
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoadingResponse(true);
    
    setTimeout(() => {
      const aiMessage: Message = { 
        role: 'assistant', 
        content: 'This is a simulated response. Connect to your AI API for real responses.' 
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoadingResponse(false);
    }, 1000);
  };

  const handleFileUpload = (file: File) => {
    if (file.type === 'application/pdf') {
      setUploadedPDF(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const allProviders = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic (Claude)' },
    { value: 'google', label: 'Google (Gemini)' },
    { value: 'cohere', label: 'Cohere' },
    { value: 'custom', label: 'Custom API' }
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

  const filteredModels = (settingsObj: Settings) => 
    modelOptions[settingsObj.provider].filter(m =>
      m.toLowerCase().includes(modelSearch.toLowerCase())
    );

  const renderSettingsPanel = (settingsObj: Settings, setSettingsObj: (s: Settings) => void, onSave: () => void, isChat: boolean = false) => (
    <div className="p-4 bg-slate-800 border-b border-slate-700 max-h-96 overflow-y-auto">
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Settings size={16} />
        {isChat ? 'Chat ' : ''}Configuration
      </h2>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-300 block mb-1">AI Provider</label>
          {!isAddingCustomProvider ? (
            <div className="relative">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={providerSearch}
                  autoComplete="off"
                  data-form-type="other"
                  onChange={(e) => {
                    setProviderSearch(e.target.value);
                    setShowProviderDropdown(true);
                  }}
                  onFocus={() => setShowProviderDropdown(true)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              {showProviderDropdown && providerSearch && (
                <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredProviders.length > 0 ? (
                    filteredProviders.map(provider => (
                      <button
                        key={provider.value}
                        onClick={() => {
                          const newProvider = provider.value as AIProvider;
                          setSettingsObj({
                            ...settingsObj,
                            provider: newProvider,
                            model: modelOptions[newProvider][0]
                          });
                          setProviderSearch('');
                          setShowProviderDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-600 transition-colors"
                      >
                        {provider.label}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400">No providers found</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter custom provider name"
                value={customProvider}
                autoComplete="off"
                data-form-type="other"
                onChange={(e) => setCustomProvider(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (customProvider.trim()) {
                      setSettingsObj({
                        ...settingsObj,
                        provider: 'custom',
                        model: 'custom-model'
                      });
                      setIsAddingCustomProvider(false);
                      setCustomProvider('');
                    }
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-1.5 rounded text-xs font-medium"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingCustomProvider(false);
                    setCustomProvider('');
                  }}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 py-1.5 rounded text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {!providerSearch && !isAddingCustomProvider && (
            <div className="mt-2 space-y-2">
              <div className="px-3 py-2 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-300">
                  Current: <span className="font-medium text-indigo-400">
                    {allProviders.find(p => p.value === settingsObj.provider)?.label || settingsObj.provider}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsAddingCustomProvider(true)}
                className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1"
              >
                + Add Custom Provider
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-slate-300 block mb-1">Model</label>
          {!isAddingCustomModel ? (
            <div className="relative">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={modelSearch}
                  autoComplete="off"
                  data-form-type="other"
                  onChange={(e) => {
                    setModelSearch(e.target.value);
                    setShowModelDropdown(true);
                  }}
                  onFocus={() => setShowModelDropdown(true)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              {showModelDropdown && modelSearch && (
                <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredModels(settingsObj).length > 0 ? (
                    filteredModels(settingsObj).map(model => (
                      <button
                        key={model}
                        onClick={() => {
                          setSettingsObj({ ...settingsObj, model });
                          setModelSearch('');
                          setShowModelDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-600 transition-colors"
                      >
                        {model}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400">No models found</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter custom model name"
                value={customModel}
                autoComplete="off"
                data-form-type="other"
                onChange={(e) => setCustomModel(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (customModel.trim()) {
                      setSettingsObj({ ...settingsObj, model: customModel.trim() });
                      setIsAddingCustomModel(false);
                      setCustomModel('');
                    }
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-1.5 rounded text-xs font-medium"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingCustomModel(false);
                    setCustomModel('');
                  }}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 py-1.5 rounded text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {!modelSearch && !isAddingCustomModel && (
            <div className="mt-2 space-y-2">
              <div className="px-3 py-2 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-300">
                  Current: <span className="font-medium text-indigo-400">{settingsObj.model}</span>
                </p>
              </div>
              <button
                onClick={() => setIsAddingCustomModel(true)}
                className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1"
              >
                + Add Custom Model
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-slate-300 block mb-1">API Key</label>
          <input
            type="password"
            value={settingsObj.apiKey}
            onChange={(e) => setSettingsObj({ ...settingsObj, apiKey: e.target.value })}
            placeholder="sk-... or your API key"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={onSave}
          disabled={!settingsObj.apiKey}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {settingsSaved ? (
            <>
              <Check size={16} />
              Saved!
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );

  if (isMinimized && recordingState !== 'idle') {
    return (
      <div className="w-80 bg-gradient-to-br from-slate-900 to-slate-800 text-white font-sans">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                recordingState === 'recording' ? 'bg-red-500 animate-pulse' :
                'bg-yellow-500'
              }`}></div>
              <span className="text-2xl font-bold tabular-nums">{formatTime(recordingTime)}</span>
            </div>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
        
        <div className="p-3 flex items-center justify-center gap-2">
          {recordingState === 'recording' ? (
            <>
              <button
                onClick={handlePauseRecording}
                className="flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Pause size={16} />
                Pause
              </button>
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Square size={16} fill="currentColor" />
                Stop
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleResumeRecording}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Play size={16} fill="currentColor" />
                Resume
              </button>
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Square size={16} fill="currentColor" />
                Stop
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'chat') {
    return (
      <div className="w-80 bg-gradient-to-br from-slate-900 to-slate-800 text-white font-sans flex flex-col" style={{ height: '500px' }}>
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} />
            <div>
              <h1 className="text-lg font-bold">AI Chat</h1>
              <p className="text-xs text-indigo-100">{chatSettings.model}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChatSettings(!showChatSettings)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={() => {
                setMode('selection');
                setMessages([]);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {showChatSettings && renderSettingsPanel(chatSettings, setChatSettings, saveChatSettings, true)}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Start a conversation with AI
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-700 text-slate-100'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isLoadingResponse && (
            <div className="flex justify-start">
              <div className="bg-slate-700 rounded-lg px-3 py-2 text-sm">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              disabled={isLoadingResponse || !chatSettings.apiKey}
            />
            <button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || isLoadingResponse || !chatSettings.apiKey}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed p-2 rounded-lg transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          {!chatSettings.apiKey && (
            <p className="text-xs text-amber-400 mt-2">Configure API key in settings</p>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'selection') {
    return (
      <div className="w-80 bg-gradient-to-br from-slate-900 to-slate-800 text-white font-sans">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
          <h1 className="text-lg font-bold">Screen Recorder</h1>
          <p className="text-xs text-indigo-100">Choose your mode</p>
        </div>

        <div className="p-6 space-y-4">
          <button
            onClick={() => {
              if (!hasApiKey) {
                setShowSettings(true);
              } else {
                setMode('recording');
              }
            }}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 p-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            <Video size={24} className="mx-auto mb-2" />
            <p className="font-semibold">Start Recording</p>
            <p className="text-xs text-indigo-100 mt-1">Record screen and generate notes</p>
          </button>

          <button
            onClick={() => setMode('chat')}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 p-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            <MessageSquare size={24} className="mx-auto mb-2" />
            <p className="font-semibold">Chat with AI</p>
            <p className="text-xs text-purple-100 mt-1">Have a conversation with your AI model</p>
          </button>

          {!hasApiKey && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-200">Configure your API settings</p>
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 underline mt-1"
                >
                  Open Settings
                </button>
              </div>
            </div>
          )}
        </div>

        {showSettings && renderSettingsPanel(settings, setSettings, saveSettings)}
      </div>
    );
  }

  return (
    <div className="w-80 bg-gradient-to-br from-slate-900 to-slate-800 text-white font-sans">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Screen Recorder</h1>
          <p className="text-xs text-indigo-100">AI-Powered Notes</p>
        </div>
        <div className="flex items-center gap-2">
          {recordingState !== 'idle' && (
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Minimize"
            >
              <ChevronUp size={20} />
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {showSettings && renderSettingsPanel(settings, setSettings, saveSettings)}

      {!showSettings && (
        <div className="p-6">
          {!hasApiKey && (
            <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-200">
                Configure your API settings before recording
              </p>
            </div>
          )}

          {/* PDF Upload Area */}
          {recordingState === 'idle' && (
            <div className="mb-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isDragging 
                    ? 'border-indigo-400 bg-indigo-500/10' 
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                {uploadedPDF ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload size={16} className="text-green-400" />
                      <span className="text-sm text-slate-300 truncate">{uploadedPDF.name}</span>
                    </div>
                    <button
                      onClick={() => setUploadedPDF(null)}
                      className="p-1 hover:bg-slate-700 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={24} className="mx-auto mb-2 text-slate-400" />
                    <p className="text-xs text-slate-400 mb-1">Upload PDF (Optional)</p>
                    <p className="text-xs text-slate-500">Drag & drop or click to select</p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="inline-block mt-2 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      Browse files
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-slate-700/50 mb-4 relative">
              {recordingState === 'recording' && (
                <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-20"></div>
              )}
              <div className={`text-3xl font-bold tabular-nums ${
                recordingState === 'recording' ? 'text-red-400' :
                recordingState === 'paused' ? 'text-yellow-400' :
                'text-slate-400'
              }`}>
                {formatTime(recordingTime)}
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                recordingState === 'recording' ? 'bg-red-500 animate-pulse' :
                recordingState === 'paused' ? 'bg-yellow-500' :
                'bg-slate-500'
              }`}></div>
              <span className="text-sm text-slate-300 capitalize">
                {recordingState === 'idle' ? 'Ready' : recordingState}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            {recordingState === 'idle' && (
              <button
                onClick={handleStartRecording}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
              >
                <Play size={20} fill="currentColor" />
                Start Recording
              </button>
            )}

            {recordingState === 'recording' && (
              <>
                <button
                  onClick={handlePauseRecording}
                  className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-5 py-3 rounded-xl font-medium transition-all"
                >
                  <Pause size={20} />
                  Pause
                </button>
                <button
                  onClick={handleStopRecording}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-medium transition-all"
                >
                  <Square size={20} fill="currentColor" />
                  Stop
                </button>
              </>
            )}

            {recordingState === 'paused' && (
              <>
                <button
                  onClick={handleResumeRecording}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-5 py-3 rounded-xl font-medium transition-all"
                >
                  <Play size={20} fill="currentColor" />
                  Resume
                </button>
                <button
                  onClick={handleStopRecording}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-medium transition-all"
                >
                  <Square size={20} fill="currentColor" />
                  Stop
                </button>
              </>
            )}
          </div>

          {recordingState !== 'idle' && (
            <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-300 text-center">
                Notes will be generated using <span className="text-indigo-400 font-medium">{settings.model}</span> when recording stops
              </p>
            </div>
          )}

          {uploadedPDF && recordingState !== 'idle' && (
            <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
              <p className="text-xs text-indigo-200 text-center">
                PDF attached: {uploadedPDF.name}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScreenRecorderUI;