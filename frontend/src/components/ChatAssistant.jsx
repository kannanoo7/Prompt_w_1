import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, setDoc } from 'firebase/firestore';

export default function ChatAssistant({ language }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load all sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'chats'));
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
  }, []);

  // Initialize Session ID on mount
  useEffect(() => {
    let currentSessionId = localStorage.getItem('chatSessionId');
    if (!currentSessionId) {
      currentSessionId = 'session_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('chatSessionId', currentSessionId);
      setDoc(doc(db, 'chats', currentSessionId), { createdAt: serverTimestamp() }).catch(console.error);
    }
    setSessionId(currentSessionId);
    setSessions(prev => prev.includes(currentSessionId) ? prev : [...prev, currentSessionId]);
  }, []);

  // Fetch messages whenever sessionId changes
  useEffect(() => {
    if (!sessionId) return;

    const fetchMessages = async () => {
      try {
        const q = query(
          collection(db, `chats/${sessionId}/messages`),
          orderBy('createdAt', 'asc')
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const loadedMessages = [];
          querySnapshot.forEach((docSnap) => {
            loadedMessages.push({ id: docSnap.id, ...docSnap.data() });
          });
          setMessages(loadedMessages);
        } else {
          setMessages([{
            id: 'welcome',
            role: 'model',
            parts: [{ text: 'Namaste! I am your Election Assistant. Ask me anything about the election process, voting, or concepts like NOTA.' }],
          }]);
        }
      } catch (error) {
        console.error('Error fetching messages from Firestore:', error);
        setMessages([{
          id: 'welcome-fallback',
          role: 'model',
          parts: [{ text: 'Namaste! I am your Election Assistant. Ask me anything about the election process, voting, or concepts like NOTA.' }],
        }]);
      }
    };

    fetchMessages();
  }, [sessionId]);

  const handleSend = useCallback(async (textInput) => {
    const text = textInput || input;
    if (!text.trim() || loading) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      parts: [{ text }],
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

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

      // Trim history to last 10 messages to limit token usage
      const history = messages
        .slice(-10)
        .map(msg => ({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: msg.parts,
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, targetLanguage: language }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

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

  // Create a new chat session
  const startNewSession = useCallback(() => {
    const newId = 'session_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('chatSessionId', newId);
    setSessionId(newId);
    setMessages([]);
    setSessions(prev => [...prev, newId]);
    setDoc(doc(db, 'chats', newId), { createdAt: serverTimestamp() }).catch(console.error);
  }, []);

  // Switch to an existing session
  const selectSession = useCallback((id) => {
    localStorage.setItem('chatSessionId', id);
    setSessionId(id);
  }, []);

  return (
    <div className="chat-container glass" style={{ display: 'flex', flexDirection: 'row', height: '100%', overflow: 'hidden', padding: 0 }}>

      {/* Sidebar for Session History */}
      <div
        className="chat-sidebar"
        style={{
          width: '250px',
          borderRight: '1px solid var(--surface-border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(0,0,0,0.1)',
          borderTopLeftRadius: '16px',
          borderBottomLeftRadius: '16px',
        }}
      >
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <button className="btn-primary" onClick={startNewSession} style={{ width: '100%' }}>
            + New Session
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
            Past Sessions
          </h3>
          <ul role="listbox" aria-label="Chat sessions" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {sessions.map(id => (
              <li key={id} style={{ marginBottom: '0.25rem' }}>
                <button
                  role="option"
                  aria-selected={id === sessionId}
                  style={{
                    background: id === sessionId ? 'var(--primary)' : 'transparent',
                    color: id === sessionId ? 'white' : 'var(--text-color)',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => selectSession(id)}
                >
                  {id.replace('session_', 'Session ')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Election Assistant</h2>
          <span style={{ fontSize: '0.8rem', color: '#888' }}>{sessionId}</span>
        </div>

        {/* Messages */}
        <div
          role="log"
          className="chat-messages"
          aria-live="polite"
          aria-label="Chat messages"
          style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role === 'user' ? 'user' : 'bot'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
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
          ))}
          {loading && (
            <div className="message bot" role="status" aria-label="Assistant is typing">
              <Loader2 className="animate-spin" size={20} aria-hidden="true" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-area" style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)' }}>
          <div className="quick-prompts" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
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

          <div className="chat-form" aria-busy={loading} style={{ display: 'flex', gap: '0.5rem' }}>
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
