"use client";

import React, { useEffect, useRef, useState } from 'react';
import { chatWithConcierge } from './services/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  links?: { uri: string; title: string }[];
}

const AIConcierge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Good day. I am your travel concierge. How may I help you?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);
    const history = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: m.content }));
    const response = await chatWithConcierge(history, currentInput);
    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'assistant', content: response.text, links: response.links }]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <button onClick={() => setIsOpen(!isOpen)} className={`size-14 rounded-full flex items-center justify-center shadow-2xl transition-all ${isOpen ? 'bg-surface-dark-lighter' : 'bg-primary'} text-white`}>
        <span className="material-symbols-outlined text-3xl">{isOpen ? 'close' : 'support_agent'}</span>
      </button>
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[350px] h-[500px] bg-white dark:bg-surface-dark rounded-2xl shadow-3xl flex flex-col overflow-hidden border border-white/5">
          <div className="p-4 bg-primary text-white font-bold text-sm">Rapid Concierge</div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`p-3 rounded-2xl text-xs flex flex-col gap-2 ${m.role === 'user' ? 'bg-primary text-white self-end' : 'bg-gray-100 dark:bg-white/5 self-start'}`}>
                <div>{m.content}</div>
                {/* Fix: Display search grounding links as per guidelines */}
                {m.links && m.links.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 flex flex-col gap-1">
                    <p className="font-bold text-[9px] uppercase tracking-wider opacity-60">Sources:</p>
                    {m.links.map((link, linkIdx) => (
                      <a 
                        key={linkIdx} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-500 dark:text-primary hover:underline truncate max-w-full"
                      >
                        {link.title || link.uri}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isTyping && <div className="text-xs text-text-muted animate-pulse">Typing...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 border-t border-white/5 flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="flex-1 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 text-xs border-none" placeholder="Ask anything..." />
            <button onClick={handleSend} className="size-8 bg-primary text-white rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-sm">send</span></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConcierge;
