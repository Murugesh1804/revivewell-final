import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, MessageSquareIcon } from 'lucide-react';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef(null);
  
  const suggestions = [
    "How do I manage withdrawal symptoms?",
    "What are healthy coping mechanisms?",
    "Tell me about the recovery timeline",
    "Can you suggest relapse prevention strategies?",
    "How can I rebuild relationships?"
  ];

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const userMessage = { content: newMessage, is_bot: false };
    setMessages([...messages, userMessage]);
    setNewMessage('');
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:5000/chat', { message: newMessage });
      setMessages([...messages, userMessage, { content: response.data.reply, is_bot: true }]);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setNewMessage(suggestion);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <MessageSquareIcon size={24} style={{ color: '#90cdf4' }} />
        <h2 style={styles.headerTitle}>ReviveWell Assistant</h2>
      </div>
      
      <div 
        ref={chatContainerRef}
        style={styles.chatArea}
      >
        {messages.length === 0 && (
          <div style={styles.welcomeContainer}>
            <div style={styles.iconContainer}>
              <MessageSquareIcon size={32} style={{ color: '#90cdf4' }} />
            </div>
            <p style={styles.welcomeTitle}>Welcome to ReviveWell</p>
            <p style={styles.welcomeSubtitle}>Your companion on the journey to recovery</p>
            <div style={styles.suggestionsGrid}>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  style={styles.suggestionButton}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div style={styles.messagesContainer}>
          {messages.map((msg, index) => (
            <div 
              key={index} 
              style={{
                display: 'flex',
                justifyContent: msg.is_bot ? 'flex-start' : 'flex-end',
                marginBottom: '16px',
              }}
            >
              <div 
                style={{
                  ...styles.messageBubble,
                  ...(msg.is_bot ? styles.botMessage : styles.userMessage),
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
              <div style={{ ...styles.messageBubble, ...styles.botMessage }}>
                <div style={styles.loadingDots}>
                  <div style={{ ...styles.dot, animationDelay: '0ms' }}></div>
                  <div style={{ ...styles.dot, animationDelay: '150ms' }}></div>
                  <div style={{ ...styles.dot, animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {messages.length > 0 && (
        <div style={styles.quickSuggestions}>
          <div style={styles.suggestionsRow}>
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                style={styles.quickSuggestionButton}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSendMessage} style={styles.inputForm}>
        <input
          type="text"
          style={styles.textInput}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button 
          type="submit" 
          style={styles.sendButton}
          disabled={!newMessage.trim()}
        >
          <Send size={20} />
        </button>
      </form>
      
      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};

// Internal CSS styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: '1080px',
    margin: '0 auto',
    backgroundColor: '#f8f9fa',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
  },
  header: {
    backgroundColor: '#162a43', // Dark navy
    color: 'white',
    padding: '16px',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
  },
  chatArea: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%232a4365' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E")`,
  },
  welcomeContainer: {
    textAlign: 'center',
    padding: '24px',
  },
  iconContainer: {
    width: '64px',
    height: '64px',
    backgroundColor: '#162a43',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
  },
  welcomeTitle: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#162a43',
    marginBottom: '8px',
  },
  welcomeSubtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
  },
  suggestionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '8px',
    marginTop: '16px',
  },
  suggestionButton: {
    backgroundColor: 'white',
    color: '#162a43',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s ease',
    fontWeight: '400',
    outline: 'none',
  },
  messagesContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  messageBubble: {
    maxWidth: '280px',
    padding: '12px 16px',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  botMessage: {
    backgroundColor: '#162a43',
    color: 'white',
    borderBottomLeftRadius: '4px',
    width: '300px',
  },
  userMessage: {
    backgroundColor: '#1e88e5',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  loadingDots: {
    display: 'flex',
    gap: '8px',
  },
  dot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#90cdf4',
    borderRadius: '50%',
    animation: 'bounce 1s infinite',
  },
  quickSuggestions: {
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e0e0e0',
  },
  suggestionsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  quickSuggestionButton: {
    backgroundColor: 'white',
    color: '#162a43',
    fontSize: '13px',
    padding: '6px 12px',
    borderRadius: '16px',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  inputForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: 'white',
    borderTop: '1px solid #e0e0e0',
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px',
  },
  textInput: {
    flexGrow: 1,
    padding: '12px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    fontSize: '14px',
  },
  sendButton: {
    backgroundColor: '#162a43',
    color: 'white',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
};

export default Chatbot;