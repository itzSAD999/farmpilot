import { supabase } from '../lib/supabase';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatWithFarmBot(messages: Message[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke('farmbot', {
    body: { messages }
  });

  if (error) {
    console.error("Supabase edge function error:", error);
    throw new Error(error.message || "Failed to reach FarmBot backend.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  // The edge function returns the OpenRouter response shape
  return data.choices[0].message.content;
}

export async function generatePersonalizedGuide(
  guideTitle: string, 
  guideSummary: string, 
  guideBody: string, 
  farmDetails: any
): Promise<string> {
  const systemPrompt = `You are an expert agronomist AI assisting a farmer in Ghana.
The farmer is reading a general agricultural guide. Your task is to personalize this guide for their specific farm.
Keep your response concise, actionable, and formatted in Markdown. Focus entirely on how the general advice applies to their specific scale, location, and crops.

Farmer's Profile:
- Farm Size: ${farmDetails.total_area_acres || 'Unknown'} acres
- Region: ${farmDetails.region || 'Unknown'}
- District: ${farmDetails.district || 'Unknown'}
`;

  const userPrompt = `Please give me a personalized action plan based on this guide:
Title: ${guideTitle}
Summary: ${guideSummary}
Body:
${guideBody}`;

  return await chatWithFarmBot([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);
}

export async function generateWeeklyTip(flaggedCategories: string[], farmDetails: any): Promise<string> {
  const systemPrompt = `You are an expert agronomist AI assisting a farmer in Ghana.
Provide a single, highly actionable, concise "Tip of the Week" (max 3 sentences) based on the cost categories where they are currently overspending.
If no categories are flagged, provide a general cost-saving tip for their region/crops.

Farmer's Profile:
- Farm Size: ${farmDetails.total_area_acres || 'Unknown'} acres
- Region: ${farmDetails.region || 'Unknown'}
- District: ${farmDetails.district || 'Unknown'}
`;

  const userPrompt = flaggedCategories && flaggedCategories.length > 0 
    ? `I am currently overspending in these categories: ${flaggedCategories.join(', ')}. What is one specific thing I should focus on this week to reduce these costs?`
    : `Please give me a general cost-saving tip for my farm this week.`;

  return await chatWithFarmBot([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);
}
