import { useState } from 'react';
import { Link } from 'react-router-dom';

interface HelpSection {
  id: string;
  question: string;
  answer: string;
}

const SECTIONS: HelpSection[] = [
  {
    id: 'estimate',
    question: 'What does "Generate Estimate" actually do?',
    answer: 'It runs a calculation for your season, one category at a time. For any category you\'ve already recorded a real cost for, it uses that real number and checks it against the standard MoFA-derived benchmark rate for your crop and acreage — if it\'s more than 30% above standard, it\'s flagged, with the exact percentage, a possible saving in cedis, and a specific suggestion. For any category you haven\'t recorded yet, it predicts a figure instead: your own average from a previous completed season of the same crop if you have one, otherwise the standard benchmark. A predicted category is never flagged, since there\'s nothing real yet to compare.',
  },
  {
    id: 'recorded-vs-predicted',
    question: 'What\'s the difference between "Recorded" and "Predicted"?',
    answer: '"Recorded" means the number is exactly what you entered — real money you spent. "Predicted" means nothing has been entered for that category yet, so the app is estimating it for you from history or the benchmark. The moment you record a real cost for that category, it switches from Predicted to Recorded and the real figure replaces the prediction.',
  },
  {
    id: 'high-flag',
    question: 'What does the orange "High" flag mean?',
    answer: 'It means a category you\'ve actually recorded a cost for came in more than 30% above the standard benchmark rate for your crop and acreage — real overspending, not a guess or a prediction. Every flagged category comes with a specific suggestion for reducing it, not generic advice.',
  },
  {
    id: 'benchmark',
    question: 'Where does the "standard rate" or "benchmark" come from?',
    answer: 'It\'s built from Ghana\'s Ministry of Food and Agriculture (MoFA) published data — national average input prices and how much of each input (seeds, fertiliser, labour, etc.) an acre of a given crop typically needs. It\'s never based on any individual farmer\'s own numbers, which is what makes it possible to actually detect overspending: comparing yourself only to your own past records can never catch it, because your numbers would always equal your own baseline.',
  },
  {
    id: 'history-vs-benchmark',
    question: 'When does the app use my own history instead of the benchmark?',
    answer: 'Only once you have at least one fully completed prior season of the same crop. From then on, predictions for that crop use your own recorded average instead of the generic benchmark — a more accurate starting point since it reflects your actual farm. You can also back-fill up to three previous years of real figures when starting a new season, so a returning farmer doesn\'t have to start from the benchmark at all.',
  },
  {
    id: 'quantity-vs-total',
    question: 'Should I enter a flat total or a quantity × rate?',
    answer: 'Whichever you actually know. If you just know you spent GHS 4,800 on fertiliser total, enter that as a flat total. If you know specifics — like "3 bags at GHS 461.25 each" — entering quantity and rate is more useful later (Cost Lab and category detail pages can show you the breakdown). If you don\'t know the cost at all yet, the add-cost form has a "Don\'t know this cost?" option that fills in the standard benchmark rate for you, scaled to your acreage, so you\'re never stuck guessing.',
  },
  {
    id: 'cost-lab',
    question: 'What is Cost Lab for?',
    answer: 'It answers "what would this actually cost me?" before you spend anything real. Pick a crop, season, and acreage; every input starts at its real standard quantity and rate (e.g. "20 person-days of labour at GHS 90/day"). Drag any slider to try a different quantity, and the total updates live. Nothing in Cost Lab is ever saved to a real season — it\'s a pure sandbox for planning ahead.',
  },
  {
    id: 'category-budgets',
    question: 'What\'s the difference between Category Budgets and the benchmark?',
    answer: 'The benchmark asks "is this above the national standard rate." Category Budgets ask a completely different question: "is this above what I personally decided to spend." You set your own cap per category per season (e.g. "no more than GHS 500 on labour"), and the app warns you live, before you save a cost, if it would push you over. A category can be within the benchmark and still over your own budget, or the other way round — they\'re independent.',
  },
  {
    id: 'compare',
    question: 'What are the three tabs on the Compare page?',
    answer: '"Season vs Season" puts two or more of your own seasons side by side, category by category. "Crop vs Crop" compares the crops you grow against each other on cost per acre — you can pick exactly which crops (up to 4) and which specific seasons (like "Minor 2025" vs "Major 2026"), and switch to a radar/spider-chart view to see the category shape of each crop\'s spending, not just the total. "Me vs Standard" compares your own recorded spend for one season directly against the benchmark, independent of whether you\'ve generated a formal estimate.',
  },
  {
    id: 'weekly-checkin',
    question: 'What is the Weekly Check-in?',
    answer: 'A standing prompt on your dashboard that asks, per category across your active seasons, "did you spend anything on this in the past week?" It\'s there because the recording habit — not the math — is usually the real barrier to keeping useful records. If a cost applies to more than one season (say, one land-clearing bill covering two fields), it splits the amount proportionally by how many acres each season actually covers, not evenly.',
  },
  {
    id: 'offline',
    question: 'What happens if I record a cost with no signal?',
    answer: 'It\'s saved locally on your device straight away and queued to sync automatically the moment you\'re back online — you\'ll see a "Saved offline" notice. It won\'t be lost, and it won\'t be double-recorded even if the sync has to retry after a dropped connection.',
  },
  {
    id: 'twi',
    question: 'How does the Twi language feature work?',
    answer: 'In Profile, "Advice Language" lets you switch to Twi (Akan). Once set, any flagged category\'s advice on your Estimate Report shows in Twi text, with a speaker button to hear it read aloud, and FarmBot (the AI assistant) will chat with you in Twi too. It doesn\'t translate the rest of the app yet — menus, buttons, and guide articles stay in English for now. The Twi advice text and audio are prepared ahead of time by the FarmPilot team, not generated live while you use the app, and every one is marked as not-yet-reviewed by a native speaker until someone confirms it\'s accurate.',
  },
  {
    id: 'category-detail',
    question: 'How do I see exactly what made up a category\'s total?',
    answer: 'Tap any category — on your season page, the farm-wide Costs page, or the Estimate Report itself — and you\'ll land on a detail page listing every individual entry behind that number, with a search box if there are a lot of them. The farm-wide Costs page\'s version spans every season; the one reached from a season page or the Estimate Report is just that one season.',
  },
  {
    id: 'guides',
    question: 'What are the Guides for?',
    answer: 'In-depth, practical how-to articles matched to whatever category is currently flagged on your farm — deeper reading than the one-line advice on your report, for the categories where you\'re actually overspending right now.',
  },
  {
    id: 'privacy',
    question: 'Can anyone else see my farm data?',
    answer: 'No. Every record is scoped to your own account by the database itself, not just by the app\'s screens — a rule enforced no matter which part of the code or which request is asking. This has been directly tested using two completely independent accounts to confirm one farmer\'s data is genuinely unreachable by another.',
  },
];

export function Help() {
  const [openId, setOpenId] = useState<string | null>(SECTIONS[0].id);

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 lg:px-8 animate-fade-in pb-24">
      <Link to="/" className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center mb-6 group w-max">
        <span className="w-8 h-8 rounded-full bg-white dark:bg-white/5 shadow-sm flex items-center justify-center mr-3 group-hover:bg-gray-50 dark:group-hover:bg-white/10 transition-colors border border-gray-100 dark:border-white/10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </span>
        Back to Dashboard
      </Link>

      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Help</h1>
      <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">
        How everything in FarmPilot actually works. Can't find your answer here? FarmBot (the chat button in the corner) knows all of this too — ask it directly.
      </p>

      <div className="space-y-3">
        {SECTIONS.map((s) => {
          const isOpen = openId === s.id;
          return (
            <div key={s.id} className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : s.id)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <span className="font-bold text-gray-900 dark:text-gray-100">{s.question}</span>
                <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 animate-fade-in">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{s.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The same content above, condensed to one string — injected into
 * FarmBot's system prompt so it can answer "how does X work" questions
 * accurately instead of guessing, without shipping the full page's HTML
 * in every request.
 */
export function getHelpKnowledgeForFarmBot(): string {
  return SECTIONS.map((s) => `Q: ${s.question}\nA: ${s.answer}`).join('\n\n');
}
