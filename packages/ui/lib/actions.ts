import { Message } from '@/components/ChatWindow';

export const getSuggestions = async (chatHisory: Message[]) => {
  const res = await fetch(`/api/cairo-coder/v1/suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_history: chatHisory,
    }),
  });

  const data = (await res.json()) as { suggestions: string[] };

  return data.suggestions;
};
