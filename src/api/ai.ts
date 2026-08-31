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
