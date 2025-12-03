import { Message } from '@/components/ChatWindow';
import { getUserId } from '@/lib/userId';

export const getSuggestions = async (chatHistory: Message[]) => {
  const res = await fetch(`/api/cairo-coder/v1/suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
    },
    body: JSON.stringify({
      chat_history: chatHistory,
    }),
  });

  const data = (await res.json()) as { suggestions: string[] };

  return data.suggestions;
};
