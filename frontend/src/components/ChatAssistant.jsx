import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';

export default function ChatAssistant({ language }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize Session ID
    let currentSessionId = localStorage.getItem('chatSessionId');
    if (!currentSessionId) {
      currentSessionId = 'session_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('chatSessionId', currentSessionId);
    }
    setSessionId(currentSessionId);

    // Fetch existing messages
    const fetchMessages = async () => {
      try {
        const q = query(
          collection(db, `chats/${currentSessionId}/messages`), 
          orderBy('createdAt', 'asc')
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const loadedMessages = [];
          querySnapshot.forEach((doc) => {
            loadedMessages.push(doc.data());
          });
          setMessages(loadedMessages);
        } else {
          // Default welcome message
          setMessages([
            { role: 'model', parts: [{ text: 'Namaste! I am your Election Assistant. Ask me anything about the election process, voting, or concepts like NOTA.' }] }
          ]);
        }
      } catch (error) {
        console.error("Error fetching messages from Firestore:", error);
        // Fallback to default if Firestore fails (e.g., config not set yet)
        setMessages([
          { role: 'model', parts: [{ text: 'Namaste! I am your Election Assistant. Ask me anything about the election process, voting, or concepts like NOTA.' }] }
        ]);
      }
    };

    fetchMessages();
  }, []);

  const handleSend = async (textInput) => {
    const text = textInput || input;
    if (!text.trim()) return;

    const userMessage = { role: 'user', parts: [{ text }] };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Save user message to Firestore
      try {
        await addDoc(collection(db, `chats/${sessionId}/messages`), {
          ...userMessage,
          createdAt: serverTimestamp()
        });
      } catch (fsError) {
        console.error("Firestore write error (user msg):", fsError);
      }

      // Format history for Gemini API
      const history = messages.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: msg.parts
      }));

      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, targetLanguage: language })
      });

      const data = await response.json();
      if (data.text) {
        const botMessage = { role: 'model', parts: [{ text: data.text }] };
        setMessages(prev => [...prev, botMessage]);

        // Save bot response to Firestore
        try {
          await addDoc(collection(db, `chats/${sessionId}/messages`), {
            ...botMessage,
            createdAt: serverTimestamp()
          });
        } catch (fsError) {
          console.error("Firestore write error (bot msg):", fsError);
        }
      } else {
        throw new Error('No text in response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: 'Sorry, I am having trouble connecting right now. Please try again later.' }] }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "What is NOTA?",
    "How does EVM work?",
    "Am I eligible to vote?",
    "What ID do I need to vote?"
  ];

  return (
    <div className="chat-container glass">
      <div className="chat-messages" aria-live="polite">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role === 'user' ? 'user' : 'bot'}`}>
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
          <div className="message bot">
            <Loader2 className="animate-spin" size={20} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="quick-prompts">
          {quickPrompts.map((prompt, i) => (
            <button 
              key={i} 
              className="quick-prompt-btn"
              onClick={() => handleSend(prompt)}
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </div>
        
        <div className="chat-form">
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about elections..."
            aria-label="Chat input"
            disabled={loading}
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
  );
}
