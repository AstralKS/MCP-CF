import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Send, Settings, Menu, X, Bot, User, Key, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ChatSession {
  id: number;
  title: string;
  updated_at: string;
  message_count: number;
}

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [cfHandle, setCfHandle] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkKeys();
    loadSessions();
    
    // Auto-refresh sessions every 5 minutes
    const intervalId = setInterval(() => {
      loadSessions();
    }, 300000);
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const checkKeys = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        navigate('/auth');
        return;
    }

    try {
      const res = await fetch('http://localhost:8000/keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Load saved CF handle if it exists
        if (data.cf_handle) {
          setCfHandle(data.cf_handle);
        }
        if (!data.gemini_configured) {
            setShowKeyModal(true);
            toast('Please configure your API keys to start.', { icon: '🔑' });
        }
      } else {
        navigate('/auth');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to check API configuration');
    }
  };

  const saveKeys = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:8000/keys', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          gemini_key: geminiKey,
          cf_handle: cfHandle || undefined
        })
      });
      
      if (res.ok) {
        setShowKeyModal(false);
        toast.success('API Keys saved successfully');
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Failed to save keys');
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error saving keys');
    }
  };


  const loadSessions = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingSessions(true);
    try {
      const res = await fetch('http://localhost:8000/chat/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (sessionId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/chat/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })));
        setCurrentSessionId(sessionId);
        toast.success('Loaded chat session');
      }
    } catch (e) {
      console.error('Failed to load session:', e);
      toast.error('Failed to load session');
    }
  };

  const deleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          setMessages([]);
          setCurrentSessionId(null);
        }
        toast.success('Session deleted');
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
      toast.error('Failed to delete session');
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setInput('');
    setCurrentSessionId(null);
    toast.success('Started a new chat session');
  };


  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    
    const newMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsThinking(true);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: newMessage.content,
          session_id: currentSessionId
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'model', content: data.response }]);
        // Update current session ID if this was a new chat
        if (!currentSessionId && data.session_id) {
          setCurrentSessionId(data.session_id);
        }
        // Reload sessions to update the list
        loadSessions();
      } else {
        const errorMessage = data.detail || 'Error getting response';
        toast.error(errorMessage);
        setMessages(prev => [...prev, { role: 'model', content: `Error: ${errorMessage}` }]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error');
      setMessages(prev => [...prev, { role: 'model', content: "Error: Could not connect to server." }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex h-screen bg-stone-950 overflow-hidden relative">
      {/* Background Ambient Light */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[150px]" />
      </div>

      {/* Sidebar */}
      <motion.div 
        initial={false}
        animate={{ width: showSidebar ? 320 : 0, opacity: showSidebar ? 1 : 0 }}
        className="bg-stone-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-20 relative overflow-hidden"
      >
        <div className="p-4 border-b border-white/5 flex justify-between items-center min-w-[320px]">
          <h2 className="font-bold text-lg font-display flex items-center gap-2">
            <Bot href="/" className="text-orange-500" /> History
          </h2>
          <Button variant="ghost" onClick={() => setShowSidebar(false)} className="p-2 hover:bg-white/5 rounded-lg">
            <X size={20} />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-w-[320px]">
           <button 
             onClick={startNewChat}
             className="w-full p-4 rounded-xl bg-gradient-to-r from-orange-600/10 to-transparent border border-orange-600/20 text-left text-sm text-stone-300 hover:border-orange-600/40 transition-all group"
           >
              <span className="font-semibold text-orange-500 block mb-1 group-hover:translate-x-1 transition-transform">+ New Chat</span>
              <span className="text-xs text-stone-500">Start a new analysis session</span>
           </button>
           
           <div className="mt-6">
             <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 px-2">Recent</h3>
             
             {loadingSessions ? (
               <div className="flex items-center justify-center py-4">
                 <LoadingSpinner size="sm" />
               </div>
             ) : sessions.length === 0 ? (
               <div className="text-center py-8 text-stone-500 text-sm">
                 <p>No chat history yet</p>
                 <p className="text-xs mt-1">Start a conversation to begin</p>
               </div>
             ) : (
               sessions.map((session) => (
                 <div 
                   key={session.id} 
                   onClick={() => loadSession(session.id)}
                   className={`p-3 rounded-lg hover:bg-white/5 cursor-pointer text-sm transition-colors mb-1 group relative ${
                     currentSessionId === session.id ? 'bg-orange-600/10 border border-orange-600/20' : ''
                   }`}
                 >
                   <div className="flex items-start justify-between gap-2">
                     <div className="flex-1 min-w-0">
                       <div className={`truncate font-medium ${
                         currentSessionId === session.id ? 'text-orange-400' : 'text-stone-300'
                       }`}>
                         {session.title}
                       </div>
                       <div className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                         <span>{session.message_count} messages</span>
                         <span>•</span>
                         <span>{new Date(session.updated_at).toLocaleDateString()}</span>
                       </div>
                     </div>
                     <button
                       onClick={(e) => deleteSession(session.id, e)}
                       className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-600/20 rounded text-red-400 hover:text-red-300"
                       title="Delete session"
                     >
                       <Trash2 size={14} />
                     </button>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>

        <div className="p-4 border-t border-white/5 min-w-[320px]">
            <Button variant="secondary" className="w-full flex items-center justify-center gap-2 bg-stone-800/50" onClick={() => setShowKeyModal(true)}>
                <Settings size={16} /> API Configuration
            </Button>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        <div className="p-4 flex items-center gap-4 border-b border-white/5 bg-stone-950/50 backdrop-blur-md z-30">
          {!showSidebar && (
            <Button variant="ghost" onClick={() => setShowSidebar(true)} className="p-2">
              <Menu size={20} />
            </Button>
          )}
          <h1 className="font-bold text-xl font-display tracking-tight">CFanatic AI</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.length === 0 && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex flex-col items-center justify-center h-full text-stone-500 gap-6"
             >
                <div className="w-24 h-24 rounded-3xl bg-stone-900/50 border border-white/5 flex items-center justify-center shadow-2xl shadow-orange-600/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-transparent" />
                    <Bot size={48} className="text-orange-500 relative z-10" />
                </div>
                <div className="text-center max-w-md space-y-2">
                    <h3 className="text-2xl font-bold text-stone-200 font-display">How can I help you today?</h3>
                    <p className="text-stone-400">Ask about your recent contest performance, specific problems, or get a customized training plan.</p>
                </div>
             </motion.div>
          )}
          
          <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-orange-600' : 'bg-stone-800 border border-white/10'
                }`}>
                    {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-orange-500" />}
                </div>
                
                <div className={`p-4 rounded-2xl shadow-lg ${
                  msg.role === 'user' 
                    ? 'bg-orange-600 text-white rounded-tr-none' 
                    : 'bg-stone-900/80 backdrop-blur-sm text-stone-200 rounded-tl-none border border-white/10'
                }`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
          
          {isThinking && (
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
            >
                <div className="flex items-end gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-800 border border-white/10 flex items-center justify-center">
                        <Bot size={14} className="text-orange-500" />
                    </div>
                    <div className="bg-stone-900/80 p-4 rounded-2xl rounded-tl-none border border-white/10 flex items-center gap-3">
                        <LoadingSpinner size="sm" />
                        <span className="text-stone-400 text-sm animate-pulse">Analyzing Codeforces data...</span>
                    </div>
                </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-stone-950/80 backdrop-blur-xl border-t border-white/5 z-30">
          <div className="max-w-4xl mx-auto flex gap-4 relative">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about your rating, submissions, or problems..."
              className="flex-1 bg-stone-900/50 border-white/10 focus:border-orange-500/50 pl-6 py-4 shadow-inner"
              disabled={isThinking}
            />
            <Button 
                onClick={sendMessage} 
                className="px-6 shadow-lg shadow-orange-600/20 hover:shadow-orange-600/40" 
                disabled={isThinking || !input.trim()}
            >
              <Send size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Key Configuration Modal */}
      <AnimatePresence>
      {showKeyModal && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md"
          >
              <Card variant="glass" className="w-full space-y-6 border-orange-500/20 shadow-[0_0_50px_rgba(234,88,12,0.1)]">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-xl bg-orange-600/10 text-orange-500">
                        <Key size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold font-display">API Configuration</h2>
                        <p className="text-stone-400 text-sm">Securely store your keys for AI access</p>
                    </div>
                </div>
                
                <div className="p-4 rounded-xl bg-orange-900/10 border border-orange-500/10 flex gap-3 items-start">
                    <AlertCircle size={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-orange-200/80 leading-relaxed">
                        Your keys are stored locally or encrypted in our database. We use them only to fetch your Codeforces data and communicate with Gemini.
                    </p>
                </div>
                
                <div className="space-y-4">
                  <Input 
                    label="Gemini API Key" 
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    type="password"
                    placeholder="AIza..."
                    className="bg-stone-900/50"
                  />
                  <Input 
                    label="Codeforces Handle" 
                    value={cfHandle}
                    onChange={(e) => setCfHandle(e.target.value)}
                    type="text"
                    placeholder="tourist"
                    className="bg-stone-900/50"
                  />
                </div>

                <div className="flex gap-4 justify-end pt-4 border-t border-white/5">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowKeyModal(false)}
                  >
                    Cancel
                  </Button>

                  <Button 
                    onClick={saveKeys}
                    disabled={!geminiKey || !cfHandle}
                    className="shadow-lg shadow-orange-600/20"
                  >
                    Save & Continue
                  </Button>
                </div>

              </Card>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
