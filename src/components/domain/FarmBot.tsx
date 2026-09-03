import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFarm } from '../../hooks/useFarm';
import { useAuth } from '../../hooks/useAuth';
import { listSeasons } from '../../api/seasons';
import { getFarmSummary } from '../../api/dashboard';
import { chatWithFarmBot, Message } from '../../api/ai';
import { getDetailedCostsForFarm } from '../../api/costs';
import { getFlaggedInsightsForFarm } from '../../api/estimates';
import { compareCrops } from '../../api/compare';
import { getProfile } from '../../api/auth';
import { getHelpKnowledgeForFarmBot } from '../../pages/Help';
import { getFarmBudget, listFarmCategoryBudgets } from '../../api/farmBudgets';
import { listCropBudgets } from '../../api/cropBudgets';
import { listCropCategoryBudgets } from '../../api/cropCategoryBudgets';

const SUGGESTED_PROMPTS = [
  'Am I overspending anywhere?',
  "What's my cost per acre so far?",
  'Which crop costs me the most to grow?',
  'How do I set up cost history for a crop?',
];

export function FarmBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { farm } = useFarm();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: getProfile,
    enabled: !!user?.id,
  });

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

  const { data: detailedCosts } = useQuery({
    queryKey: ['farm_detailed_costs', farm?.id],
    queryFn: () => getDetailedCostsForFarm(farm!.id as number),
    enabled: !!farm?.id,
  });

  // Real overspend flags from each season's latest estimate (actual
  // recorded costs vs. benchmark — see generate_estimate(), SDD §9.2),
  // so FarmBot can name specific numbers instead of speaking generically.
  const { data: flaggedInsights } = useQuery({
    queryKey: ['flagged_insights', farm?.id],
    queryFn: () => getFlaggedInsightsForFarm(farm!.id as number),
    enabled: !!farm?.id,
  });

  // Aggregated crop-vs-crop cost per acre, so the bot can answer "which
  // crop costs me the most" with the same weighted figure the Compare
  // page shows, instead of trying to eyeball it from itemized costs.
  const { data: cropComparison } = useQuery({
    queryKey: ['compareCrops', farm?.id],
    queryFn: () => compareCrops(farm!.id as number),
    enabled: !!farm?.id,
  });

  // The farmer's own spending caps — separate from the benchmark above
  // (migrations 015, 022, 023) — so FarmBot can answer "am I within
  // budget" using the real numbers instead of only benchmark variance.
  const { data: farmBudget } = useQuery({
    queryKey: ['farmBudget', farm?.id],
    queryFn: () => getFarmBudget(farm!.id as number),
    enabled: !!farm?.id,
  });
  const { data: farmCategoryBudgets } = useQuery({
    queryKey: ['farmCategoryBudgets', farm?.id],
    queryFn: () => listFarmCategoryBudgets(farm!.id as number),
    enabled: !!farm?.id,
  });
  const { data: cropBudgets } = useQuery({
    queryKey: ['cropBudgets', farm?.id],
    queryFn: () => listCropBudgets(farm!.id as number),
    enabled: !!farm?.id,
  });
  const { data: cropCategoryBudgets } = useQuery({
    queryKey: ['cropCategoryBudgets', farm?.id],
    queryFn: () => listCropCategoryBudgets(farm!.id as number),
    enabled: !!farm?.id,
  });

  // Construct system prompt when context loads
  const systemPrompt = React.useMemo(() => {
    let prompt = `You are FarmBot, an expert agronomist AI assistant for FarmPilot. You advise Ghanaian smallholder farmers on how to reduce costs and improve yields.\n\n`;

    if (profile?.preferred_language === 'tw') {
      prompt += `IMPORTANT: This farmer has set their Advice Language preference to Twi (Akan). Respond in Twi throughout this conversation, not English — this is a live request to a general-purpose AI, not a lookup against FarmPilot's own pre-generated advice cache, so use your own best Twi. If a specific technical term (like "acre" or a category name) doesn't translate cleanly, it's fine to keep it in English inside an otherwise-Twi sentence.\n\n`;
    }

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
        prompt += `- ${s.crop_name} (${s.season_window} ${s.year}), ${s.area_planted_acres} acres. ${s.is_complete ? 'Completed.' : 'Active.'} Recorded total cost: GHS ${(s.total_cost_pesewas / 100).toFixed(2)}\n`;
      });
    }

    if (detailedCosts && detailedCosts.length > 0) {
      prompt += `\nDetailed Expense History (Itemized costs):\n`;
      detailedCosts.forEach((season: any) => {
        if (season.costs && season.costs.length > 0) {
          prompt += `[Season: ${season.cropName} - ${season.seasonWindow} ${season.year}]\n`;
          season.costs.forEach((c: any) => {
            prompt += `  - ${c.category}: GHS ${(c.amount_pesewas / 100).toFixed(2)}${c.description ? ` (${c.description})` : ''}\n`;
          });
        }
      });
    }

    if (flaggedInsights && flaggedInsights.length > 0) {
      prompt += `\nOverspend Flags (from the estimation engine — actual recorded spend vs. the standard benchmark rate, only for categories the farmer has actually recorded a cost for this season):\n`;
      flaggedInsights.forEach((f) => {
        prompt += `- [${f.crop_name} ${f.season_window} ${f.year}] ${f.category} is ${f.variance_pct}% above the expected rate`;
        if (f.potential_saving_pesewas) prompt += `, a possible saving of GHS ${(f.potential_saving_pesewas / 100).toFixed(2)}`;
        prompt += `.${f.advice ? ` Suggested fix: ${f.advice}` : ''}\n`;
      });
    }

    if (cropComparison && cropComparison.data.length > 0) {
      prompt += `\nCrop vs Crop (weighted cost per acre across every recorded season of each crop — same figures as the Compare page's "Crop vs Crop" tab):\n`;
      cropComparison.data.forEach((c: any) => {
        prompt += `- ${c.name}: GHS ${(c.cost_per_acre / 100).toFixed(2)}/acre across ${c.season_count} season(s)\n`;
      });
    }

    const hasBudgets = !!farmBudget || (farmCategoryBudgets && farmCategoryBudgets.length > 0) || (cropBudgets && cropBudgets.length > 0) || (cropCategoryBudgets && cropCategoryBudgets.length > 0);
    if (hasBudgets) {
      prompt += `\nBudgets (the farmer's own spending caps, set at /budgets — separate from the benchmark comparisons above; a category or crop can be within benchmark and still over the farmer's own budget, or vice versa):\n`;
      if (farmBudget) {
        prompt += `- Farm Budget (whole farm, every season/crop/category combined): GHS ${(farmBudget.spent_pesewas / 100).toFixed(2)} spent of GHS ${(farmBudget.limit_pesewas / 100).toFixed(2)}${farmBudget.is_over_budget ? ' — OVER BUDGET' : ` (${farmBudget.pct_used ?? 0}% used)`}\n`;
      }
      if (farmCategoryBudgets && farmCategoryBudgets.length > 0) {
        prompt += `- By category (farm-wide, across every crop and season):\n`;
        farmCategoryBudgets.forEach((b) => {
          prompt += `  - ${b.category}: GHS ${(b.spent_pesewas / 100).toFixed(2)} spent of GHS ${(b.limit_pesewas / 100).toFixed(2)}${b.is_over_budget ? ' — OVER BUDGET' : ` (${b.pct_used ?? 0}% used)`}\n`;
        });
      }
      if (cropBudgets && cropBudgets.length > 0) {
        prompt += `- By crop (total, across every season of that crop):\n`;
        cropBudgets.forEach((b) => {
          prompt += `  - ${b.crop_name}: GHS ${(b.spent_pesewas / 100).toFixed(2)} spent of GHS ${(b.limit_pesewas / 100).toFixed(2)}${b.is_over_budget ? ' — OVER BUDGET' : ` (${b.pct_used ?? 0}% used)`}\n`;
        });
      }
      if (cropCategoryBudgets && cropCategoryBudgets.length > 0) {
        prompt += `- By crop AND category together (the most specific tier — e.g. "Maize Labour"), across every season of that crop:\n`;
        cropCategoryBudgets.forEach((b) => {
          prompt += `  - ${b.crop_name} ${b.category}: GHS ${(b.spent_pesewas / 100).toFixed(2)} spent of GHS ${(b.limit_pesewas / 100).toFixed(2)}${b.is_over_budget ? ' — OVER BUDGET' : ` (${b.pct_used ?? 0}% used)`}\n`;
        });
      }
    }

    prompt += `\nOther things you can point the farmer to inside FarmPilot, if relevant to what they ask:
- "Cost Lab" (/lab): a sandbox to try different cost assumptions for a crop and acreage before recording anything for real — nothing there is saved.
- Recording cost history: when starting a new season (Start New Season), after picking a crop there's a "Have you grown this before?" toggle to back-fill up to 3 previous years' costs, so estimates use real history from day one instead of only the benchmark.
- The Weekly Check-in prompt on the Dashboard for quickly logging shared costs across active seasons, split by planted acreage.
- The Compare page (season vs season, crop vs crop, me vs standard benchmark) for the underlying numbers behind whatever you tell them.
- The Budgets page (/budgets) to set or change a Farm Budget, a per-category budget, or a per-crop budget — that's also where the numbers in the "Budgets" section above come from.
- The Help page (/help) has this same reference in one place if they want to browse it themselves.

Reference — how FarmPilot's own features actually work, so you can answer "how does X work" or "what does X mean" questions accurately instead of guessing (this is the same content as the in-app Help page):

${getHelpKnowledgeForFarmBot()}

Guidelines for your responses:
- Keep answers concise and extremely practical.
- Speak in plain English, avoiding overly technical jargon.
- If they ask about costs or where they are overspending, lead with the 'Overspend Flags' above — those are real, computed comparisons against the benchmark, not a guess. Use their exact numbers and categories. If there are no flags, say their recorded spending looks on track rather than inventing a concern.
- If they ask which crop costs more, use 'Crop vs Crop' above rather than estimating from the itemized list.
- If they ask about a budget, or whether they're within budget, use the 'Budgets' section above — it's the farmer's own cap, not the benchmark, so answer that question separately from an 'Overspend Flags' question even if both are true at once. If no budgets are set, say so and mention the Budgets page rather than guessing a number.
- Read 'Detailed Expense History' for anything not covered by a flag.
- Mention Ghanaian agricultural context (e.g., MoFA subsidy, two seasons, specific local practices).
- Format using simple markdown for readability.`;

    return prompt;
  }, [farm, summary, seasons, detailedCosts, flaggedInsights, cropComparison, profile, farmBudget, farmCategoryBudgets, cropBudgets, cropCategoryBudgets]);

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

  // Listen for external open events (e.g. from Dashboard)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-farmbot', handleOpen);
    return () => window.removeEventListener('open-farmbot', handleOpen);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(inputValue);
  };

  const startNewChat = () => {
    setMessages([
      { role: 'assistant', content: "New chat started. What would you like to know?" }
    ]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`print-hide fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-6 md:bottom-8 md:right-8 w-16 h-16 bg-[#1B5E20] hover:bg-[#144718] text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 z-40 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Open FarmBot"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="print-hide fixed inset-0 md:inset-auto md:bottom-8 md:right-8 md:w-[400px] md:h-[500px] bg-white dark:bg-[#1a1a1a] md:rounded-[24px] shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-200 dark:border-white/10 animate-fade-in-up">
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
            <div className="flex items-center gap-1">
              <button
                onClick={startNewChat}
                title="New chat"
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
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
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-col items-start gap-2 pt-2 animate-fade-in">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-xs font-bold text-left text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-2 rounded-xl transition-colors"
                  >
                    {p}
                  </button>
                ))}
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
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="mt-3 w-full py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-colors"
            >
              Close Chat
            </button>
          </form>
        </div>
      )}
    </>
  );
}
