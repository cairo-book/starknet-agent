import { posthog } from 'posthog-js';

/**
 * Utility functions for tracking user feedback with PostHog
 */

/**
 * Track feedback on an LLM answer
 * @param messageId - The ID of the message
 * @param chatId - The chat ID
 * @param rating - Whether the feedback is positive or negative
 * @param content - The content of the message (will be truncated)
 * @param sources - Optional sources used in the response
 */
export const trackAnswerFeedback = (
  messageId: string,
  chatId: string,
  rating: 'positive' | 'negative',
  content: string,
  sources?: any[],
) => {
  if (typeof window === 'undefined') return;

  try {
    posthog.capture('llm_answer_feedback', {
      messageId,
      chatId,
      rating,
      content: content.substring(0, 500), // Limit content length
      hasSources: sources && sources.length > 0,
      sourceCount: sources?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking feedback:', error);
  }
};

/**
 * Track detailed feedback comments for negative ratings
 * @param messageId - The ID of the message
 * @param chatId - The chat ID
 * @param comment - The user's comment about what was wrong
 */
export const trackDetailedFeedback = (
  messageId: string,
  chatId: string,
  comment: string,
) => {
  if (typeof window === 'undefined' || !comment.trim()) return;

  try {
    posthog.capture('llm_answer_feedback_comment', {
      messageId,
      chatId,
      comment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking detailed feedback:', error);
  }
};

/**
 * Track when a conversation starts
 * @param chatId - The ID of the chat
 * @param focusMode - The current focus mode
 */
export const trackConversationStart = (chatId: string, focusMode: string) => {
  if (typeof window === 'undefined') return;

  try {
    posthog.capture('conversation_started', {
      chatId,
      focusMode,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking conversation start:', error);
  }
};

/**
 * Track when a user message is sent
 * @param chatId - The ID of the chat
 * @param messageId - The ID of the message
 * @param messageLength - The length of the message
 */
export const trackUserMessage = (
  chatId: string,
  messageId: string,
  messageLength: number,
) => {
  if (typeof window === 'undefined') return;

  try {
    posthog.capture('user_message_sent', {
      chatId,
      messageId,
      messageLength,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking user message:', error);
  }
};

/**
 * Initialize a PostHog user property for tracking feedback statistics
 */
export const initUserFeedbackStats = () => {
  if (typeof window === 'undefined') return;

  try {
    // Set initial feedback statistics if they don't exist
    posthog.people.set_once({
      feedback_given_count: 0,
      positive_feedback_count: 0,
      negative_feedback_count: 0,
    });
  } catch (error) {
    console.error('Error initializing user feedback stats:', error);
  }
};

/**
 * Update user properties when feedback is given
 * @param rating - Whether the feedback was positive or negative
 */
export const updateUserFeedbackStats = (rating: 'positive' | 'negative') => {
  if (typeof window === 'undefined') return;

  try {
    // Increment the total feedback count
    posthog.setPersonProperties({
      feedback_given_count: (prevCount: number) => prevCount + 1,
    });

    // Increment the appropriate counter based on rating
    if (rating === 'positive') {
      posthog.setPersonProperties({
        positive_feedback_count: (prevCount: number) => prevCount + 1,
      });
    } else {
      posthog.setPersonProperties({
        negative_feedback_count: (prevCount: number) => prevCount + 1,
      });
    }
  } catch (error) {
    console.error('Error updating user feedback stats:', error);
  }
};
