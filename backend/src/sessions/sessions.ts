import { initializeDatabase } from '../db/database';
import { run as runAgent } from '../agent/agent';

export async function createSession(userId: number) {
  const db = await initializeDatabase();
  const result = await db.run(
    'INSERT INTO sessions (user_id) VALUES (?)',
    userId
  );
  return result.lastID;
}

export async function getSessionHistory(sessionId: number) {
  const db = await initializeDatabase();
  const messages = await db.all(
    'SELECT sender, text, tokens_used FROM messages WHERE session_id = ? ORDER BY created_at ASC',
    sessionId
  );
  const session = await db.get(
    'SELECT total_tokens FROM sessions WHERE id = ?',
    sessionId
  );
  return { messages, totalTokens: session?.total_tokens || 0 };
}

export async function addMessageToSession(
  sessionId: number,
  sender: string,
  text: string,
  tokensUsed: number
) {
  const db = await initializeDatabase();
  await db.run(
    'INSERT INTO messages (session_id, sender, text, tokens_used) VALUES (?, ?, ?, ?)',
    sessionId,
    sender,
    text,
    tokensUsed
  );
  await db.run(
    'UPDATE sessions SET total_tokens = total_tokens + ? WHERE id = ?',
    tokensUsed,
    sessionId
  );
}

export async function getSessionsByUserId(userId: number) {
  const db = await initializeDatabase();
  const sessions = await db.all(
    'SELECT id, created_at, total_tokens FROM sessions WHERE user_id = ? ORDER BY created_at DESC',
    userId
  );
  return sessions;
}

export async function handleAgentMessage(
  sessionId: number,
  question: string,
  userId: number
) {
  // Retrieve previous messages for context
  const { messages: historyMessages } = await getSessionHistory(sessionId);
  const context = historyMessages.map(msg => `${msg.sender}: ${msg.text}`).join('\n');

  // Combine context with new question
  const fullQuestion = context ? `${context}\nuser: ${question}` : question;

  // Run the agent with the full question
  const { answer, source, tokenUsage } = await runAgent(fullQuestion);

  // Add user message to session
  await addMessageToSession(sessionId, 'user', question, tokenUsage.input);

  // Add bot message to session
  await addMessageToSession(sessionId, 'bot', answer, tokenUsage.output);

  return { answer, source, tokenUsage };
}

export async function deleteSession(sessionId: number, userId: number) {
  const db = await initializeDatabase();
  // Ensure the session belongs to the user before deleting
  const session = await db.get('SELECT user_id FROM sessions WHERE id = ?', sessionId);
  if (!session || session.user_id !== userId) {
    throw new Error('Session not found or unauthorized');
  }
  await db.run('DELETE FROM messages WHERE session_id = ?', sessionId);
  await db.run('DELETE FROM sessions WHERE id = ?', sessionId);
}
