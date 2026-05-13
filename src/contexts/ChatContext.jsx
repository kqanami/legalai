import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { chatApi } from '../services/api';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load chat history from backend
  const loadHistory = useCallback(async () => {
    if (historyLoaded) return;
    try {
      const sessions = await chatApi.listSessions();
      setChatHistory(sessions.map(s => ({
        id: s.id,
        question: s.title,
        segment: s.segment,
        timestamp: s.created_at,
        preview: s.preview || s.title,
      })));
      setHistoryLoaded(true);
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, [historyLoaded]);

  // Load messages for a specific session
  const loadSession = useCallback(async (sid) => {
    try {
      const msgs = await chatApi.getMessages(sid);
      setSessionId(sid);
      setMessages(msgs.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        segment: m.segment,
        references: m.references,
        timestamp: m.timestamp,
      })));
      if (msgs.length > 0) {
        const lastAi = [...msgs].reverse().find(m => m.segment);
        if (lastAi) setCurrentSegment(lastAi.segment);
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    // Add user message to UI immediately
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Create session if needed
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const session = await chatApi.createSession(text.slice(0, 60));
        currentSessionId = session.id;
        setSessionId(currentSessionId);
      }

      let fullContent = '';
      let finalData = {};
      let aiMsgId = null;

      try {
        // Try streaming first
        let lastUpdate = 0;
        const UPDATE_INTERVAL = 40; // Only update UI every 40ms (~25fps)

        await chatApi.streamMessage(currentSessionId, text, (data) => {
          if (data.done) {
            finalData = data;
          } else if (data.content) {
            fullContent += data.content;
            
            const now = Date.now();
            if (now - lastUpdate > UPDATE_INTERVAL || !aiMsgId) {
              lastUpdate = now;
              
              if (!aiMsgId) {
                aiMsgId = (Date.now() + 1).toString();
                setMessages((prev) => [...prev, {
                  id: aiMsgId,
                  role: 'assistant',
                  content: '',
                  timestamp: new Date().toISOString(),
                }]);
                setIsTyping(false);
              }
              
              setMessages((prev) => prev.map(m =>
                m.id === aiMsgId ? { ...m, content: fullContent } : m
              ));
            }
          } else if (data.error) {
            throw new Error(data.error);
          }
        });

        // Update with final data (refs, segment, real ID)
        if (aiMsgId) {
          setMessages((prev) => prev.map(m =>
            m.id === aiMsgId ? {
              ...m,
              id: finalData.id?.toString() || aiMsgId,
              content: finalData.content || fullContent,
              segment: finalData.segment,
              references: finalData.references,
              escalation: finalData.escalation,
            } : m
          ));
        }

        if (finalData.segment) {
          setCurrentSegment(finalData.segment);
        }

      } catch (streamError) {
        // Fallback to non-streaming
        console.warn('Streaming failed, falling back:', streamError);

        const response = await chatApi.sendMessage(currentSessionId, text);
        const fallbackId = (Date.now() + 2).toString();

        if (aiMsgId) {
          setMessages((prev) => prev.map(m =>
            m.id === aiMsgId ? {
              ...m,
              id: response.id?.toString() || fallbackId,
              content: response.content,
              segment: response.segment,
              references: response.references,
              escalation: response.escalation,
              timestamp: response.timestamp || new Date().toISOString(),
            } : m
          ));
        } else {
          setMessages((prev) => [...prev, {
            id: response.id?.toString() || fallbackId,
            role: 'assistant',
            content: response.content,
            segment: response.segment,
            references: response.references,
            escalation: response.escalation,
            timestamp: response.timestamp || new Date().toISOString(),
          }]);
        }

        if (response.segment) {
          setCurrentSegment(response.segment);
        }
      }

      // Update history
      setChatHistory((prev) => {
        const entry = {
          id: currentSessionId,
          question: text,
          segment: currentSegment,
          timestamp: new Date().toISOString(),
          preview: text.slice(0, 80),
        };
        const filtered = prev.filter(h => h.id !== currentSessionId);
        return [entry, ...filtered].slice(0, 50);
      });

    } catch (e) {
      console.error('Send message error:', e);
      setMessages((prev) => {
        // Remove empty placeholder if it exists, add error message
        const filtered = prev.filter(m => m.content !== '');
        return [...filtered, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Ошибка: ${e.message}\n\nУбедитесь, что backend запущен на порту 8000.`,
          timestamp: new Date().toISOString(),
        }];
      });
    } finally {
      setIsTyping(false);
    }
  }, [sessionId, currentSegment]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentSegment(null);
    setSessionId(null);
  }, []);

  const deleteSession = useCallback(async (sid) => {
    try {
      await chatApi.deleteSession(sid);
      setChatHistory(prev => prev.filter(h => h.id !== sid));
      if (sessionId === sid) {
        clearMessages();
      }
    } catch (e) {
      console.error('Delete session error:', e);
    }
  }, [sessionId, clearMessages]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <ChatContext.Provider value={{
      messages, isTyping, currentSegment, chatHistory, sessionId,
      sendMessage, clearMessages, loadHistory, loadSession, deleteSession
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
