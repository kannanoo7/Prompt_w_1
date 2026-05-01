import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, limitToLast, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import './ChatAssistant.css';

const CHAT_HISTORY_LIMIT = 10;
const SESSION_MESSAGE_LIMIT = 50;
const REQUEST_TIMEOUT_MS = 20000;
const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'model',
  parts: [{ text: 'Namaste! I am your Election Assistant. Ask me anything about the election process, voting, or concepts like NOTA.' }],
};

// --- Utilities ---
function createSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return `session_${globalThis.crypto.randomUUID()}`;
  }
  return `session_${Math.random().toString(36).substring(2, 15)}`;
}

function getInitialSession() {
  let id = localStorage.getItem('chatSessionId');
  let isNew = false;
  if (!id) {
    id = createSessionId();
    localStorage.setItem('chatSessionId', id);
    isNew = true;
  }
  return { id, isNew };
}

function toChatHistory(messages) {
  return messages
    .slice(-CHAT_HISTORY_LIMIT)
    .map((msg) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: msg.parts,
    }));
}

// --- Sub-components ---

const ChatSidebar = React.memo(({ sessions, sessionId, onNewSession, onSelectSession }) => (
  <div className="chat-sidebar">
    <div className="chat-sidebar-header">
      <button className="btn-primary" onClick={onNewSession} style={{ width: '100%' }}>
        + New Session
      </button>
    </div>
    <div className="chat-sidebar-content">
      <h3 className="chat-sidebar-title">Past Sessions</h3>
      <ul className="session-list" role="listbox" aria-label="Chat sessions">
        {sessions.map(id => (
          <li key={id} className="session-item">
            <button
              role="option"
              aria-selected={id === sessionId}
              className={`session-button ${id === sessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(id)}
            >
              {id.replace('session_', 'Session ')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  </div>
));

const MessageItem = React.memo(({ msg }) => (
  <div className={`message ${msg.role === 'user' ? 'user' : 'bot'}`}>
    <div className="message-header">
      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
      {msg.role === 'user' ? 'You' : 'Assistant'}
    </div>
    <div className={msg.role === 'model' ? 'markdown-body' : ''}>
      {msg.role === 'model' ? (
        <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
      ) : (
        <p>{msg.parts[0].text}</p>
      )}
    </div>
  </div>
));

// --- Main Component ---

export default function ChatAssistant({ language }) {
  const [initialSession] = useState(getInitialSession);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(initialSession.id);
  const [sessions, setSessions] = useState([initialSession.id]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load all sessions on mount
  useEffect(() => {
    let isMounted = true;
    const fetchSessions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'chats'));
        if (!isMounted) return;
        const loadedSessions = [];
        querySnapshot.forEach((docSnap) => {
          loadedSessions.push(docSnap.id);
        });
        setSessions(loadedSessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };
    fetchSessions();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (initialSession.isNew) {
      setDoc(doc(db, 'chats', sessionId), { createdAt: serverTimestamp() }).catch(console.error);
    }
  }, [initialSession.isNew, sessionId]);

  // Fetch messages whenever sessionId changes
  useEffect(() => {
    if (!sessionId) return;
    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const q = query(
          collection(db, `chats/${sessionId}/messages`),
          orderBy('createdAt', 'asc'),
          limitToLast(SESSION_MESSAGE_LIMIT)
        );
        const querySnapshot = await getDocs(q);
        if (!isMounted) return;

        if (!querySnapshot.empty) {
          const loadedMessages = [];
          querySnapshot.forEach((docSnap) => {
            loadedMessages.push({ id: docSnap.id, ...docSnap.data() });
          });
          setMessages(loadedMessages);
        } else {
          setMessages([{ id: 'welcome', ...WELCOME_MESSAGE }]);
        }
      } catch (error) {
        console.error('Error fetching messages from Firestore:', error);
        if (isMounted) setMessages([{ ...WELCOME_MESSAGE, id: 'welcome-fallback' }]);
      }
    };

    fetchMessages();
    return () => { isMounted = false; };
  }, [sessionId]);

  const handleSend = useCallback(async (textInput) => {
    const text = textInput || input;
    if (!text.trim() || loading) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      parts: [{ text }],
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    let timeoutId;

    try {
      // Save user message to Firestore
      try {
        await addDoc(collection(db, `chats/${sessionId}/messages`), {
          role: userMessage.role,
          parts: userMessage.parts,
          createdAt: serverTimestamp(),
        });
      } catch (fsError) {
        console.error('Firestore write error (user msg):', fsError);
      }

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: toChatHistory(messages), targetLanguage: language }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      if (data.text) {
        const botMessage = {
          id: `bot_${Date.now()}`,
          role: 'model',
          parts: [{ text: data.text }],
        };
        setMessages(prev => [...prev, botMessage]);

        // Save bot response to Firestore
        try {
          await addDoc(collection(db, `chats/${sessionId}/messages`), {
            role: botMessage.role,
            parts: botMessage.parts,
            createdAt: serverTimestamp(),
          });
        } catch (fsError) {
          console.error('Firestore write error (bot msg):', fsError);
        }
      } else {
        throw new Error('No text in response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'model',
        parts: [{ text: 'Sorry, I am having trouble connecting right now. Please try again later.' }],
      }]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [input, messages, sessionId, language, loading]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const quickPrompts = useMemo(() => [
    'What is NOTA?',
    'How does EVM work?',
    'Am I eligible to vote?',
    'What ID do I need to vote?',
  ], []);

  const startNewSession = useCallback(() => {
    const newId = createSessionId();
    localStorage.setItem('chatSessionId', newId);
    setSessionId(newId);
    setMessages([]);
    setSessions(prev => [...prev, newId]);
    setDoc(doc(db, 'chats', newId), { createdAt: serverTimestamp() }).catch(console.error);
  }, []);

  const selectSession = useCallback((id) => {
    localStorage.setItem('chatSessionId', id);
    setSessionId(id);
  }, []);

  return (
    <div className="chat-container glass">
      <ChatSidebar 
        sessions={sessions} 
        sessionId={sessionId} 
        onNewSession={startNewSession} 
        onSelectSession={selectSession} 
      />

      <div className="chat-main">
        <div className="chat-header">
          <h2>Election Assistant</h2>
          <span className="chat-header-session">{sessionId}</span>
        </div>

        <div role="log" className="chat-messages" aria-live="polite" aria-label="Chat messages">
          {messages.map((msg) => (
            <MessageItem key={msg.id} msg={msg} />
          ))}
          {loading && (
            <div className="message bot" role="status" aria-label="Assistant is typing">
              <Loader2 className="animate-spin" size={20} aria-hidden="true" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="quick-prompts">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                className="quick-prompt-btn"
                onClick={() => handleSend(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="chat-form" aria-busy={loading}>
            <input
              type="text"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about elections..."
              aria-label="Chat input"
              disabled={loading}
              maxLength={2000}
            />
            <button
              className="btn-primary"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
