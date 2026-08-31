export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Fallback to the provided key if env var is missing. In a production app, this should
// ideally be proxied through a backend to keep the key secure.
// Use environment variable for the API key to prevent secret leakage
const OPENROUTER_API_KEY = import.meta.env.OPENROUTER_API_KEY;
const MODEL = 'anthropic/claude-3-haiku'; // Fast, cheap, and good for basic reasoning

export async function chatWithFarmBot(messages: Message[]): Promise<string> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://farmpilot.app', // Optional, for OpenRouter rankings
        'X-Title': 'FarmPilot', // Optional, for OpenRouter rankings
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API Error:', errorData);
      throw new Error(`Failed to generate response. Check API key or connection.`);
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }
    
    throw new Error('Unexpected response format from AI');
  } catch (error) {
    console.error('FarmBot Error:', error);
    throw error;
  }
}
