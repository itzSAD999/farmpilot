import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFarm } from '../../hooks/useFarm';
import { listSeasons } from '../../api/seasons';
import { getFarmSummary } from '../../api/dashboard';
import { chatWithFarmBot, Message } from '../../api/ai';

export function FarmBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { farm } = useFarm();
  
  // Fetch context data for the bot
  const { data: seasons } = useQuery({
    queryKey: ['seasons', farm?.id],
    queryFn: () => listSeasons(farm!.id as number),
    enabled: !!farm?.id,
  });

  const { data: summary } = useQuery({
    queryKey: ['farm_summary', farm?.id],
    queryFn: () => getFarmSummary(farm!.id as number),
    enabled: !!farm?.id,
  });

  // Construct system prompt when context loads
  const systemPrompt = React.useMemo(() => {
    let prompt = `You are FarmBot, an expert agronomist AI assistant for FarmPilot. You advise Ghanaian smallholder farmers on how to reduce costs and improve yields.\n\n`;
    
    if (farm && summary) {
      prompt += `Current User Context:\n`;
      prompt += `- Farm Name: ${farm.name} (${farm.district}, ${farm.region})\n`;
      prompt += `- Total Farm Size: ${farm.total_area_acres} acres\n`;
      prompt += `- Total Recorded Spend: GHS ${(Number(summary.total_recorded_pesewas) / 100).toFixed(2)}\n`;
      prompt += `- Total Estimated Cost: GHS ${(Number(summary.total_estimated_pesewas) / 100).toFixed(2)}\n`;
    }

    if (seasons && seasons.length > 0) {
      prompt += `\nSeasons tracked:\n`;
      seasons.forEach((s: any) => {
        prompt += `- ${s.crop_name} (${s.season_window} ${s.year}), ${s.area_planted_acres} acres. ${s.is_complete ? 'Completed.' : 'Active.'} Recorded cost: GHS ${(s.total_cost_pesewas / 100).toFixed(2)}\n`;
      });
    }

    prompt += `\nGuidelines for your responses:
- Keep answers concise and extremely practical.
- Speak in plain English, avoiding overly technical jargon.
- If they ask about costs, reference their actual data provided above.
- Mention Ghanaian agricultural context (e.g., MoFA subsidy, two seasons, specific local practices).
- Format using simple markdown for readability.`;

    return prompt;
  }, [farm, summary, seasons]);

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { role: 'assistant', content: "Hello! I'm FarmBot. I can analyze your farm's spending and give you practical advice on how to reduce costs. What would you like to know?" }
      ]);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: inputValue.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build full conversation history + system prompt
      const conversation: Message[] = [
        { role: 'system', content: systemPrompt },
        ...messages,
        userMsg
      ];

      const replyContent = await chatWithFarmBot(conversation);
      setMessages(prev => [...prev, { role: 'assistant', content: replyContent }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I'm having trouble connecting right now. Please try again later." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 w-16 h-16 bg-[#1B5E20] hover:bg-[#144718] text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 z-40 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Open FarmBot"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-8 md:right-8 md:w-[400px] md:h-[600px] bg-white dark:bg-[#1a1a1a] md:rounded-[24px] shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-200 dark:border-white/10 animate-fade-in-up">
          {/* Header */}
          <div className="bg-[#1B5E20] p-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-bold">FarmBot</h3>
                <p className="text-xs text-white/70">AI Agronomist</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black/20">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-br-sm' 
                    : 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-white/5 shadow-sm rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0" dangerouslySetInnerHTML={{ 
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br/>') 
                    }} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-white/10 border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-[#1a1a1a] border-t border-gray-100 dark:border-white/10 shrink-0">
            <div className="relative flex items-end">
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask for advice..."
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3 pl-4 pr-12 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none max-h-32 min-h-[48px]"
                rows={1}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 bottom-2 w-8 h-8 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 disabled:dark:bg-white/10 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>
              </button>
            </div>
            <div className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-2">
              FarmBot can make mistakes. Verify important advice.
            </div>
          </form>
        </div>
      )}
    </>
  );
}
