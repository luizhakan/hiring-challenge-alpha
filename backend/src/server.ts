import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cors from 'cors'; // Import cors
// import { run } from './graph'; // Removed direct import of run
import authRoutes from './auth/auth'; // Import authentication routes
import { initializeDatabase } from './db/database'; // Import database initialization
import whitelist from './config/whitelist'; // Import whitelist
import { createSession, getSessionHistory, handleAgentMessage, getSessionsByUserId, deleteSession } from './sessions/sessions'; // Import session functions

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined. Please set this environment variable.');
  process.exit(1);
}

// Configure CORS
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (origin && whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

app.use(express.json());

// Initialize database
initializeDatabase().then(() => {
  console.log('Database initialized.');
}).catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Middleware to verify JWT token
const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ message: 'Failed to authenticate token.' });
    }
    req.userId = decoded.id;
    req.username = decoded.username;
    next();
  });
};

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Session Management Endpoints - protected by JWT
app.post('/api/sessions/new', verifyToken, async (req: any, res) => {
  try {
    const sessionId = await createSession(req.userId);
    res.status(201).json({ sessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/sessions', verifyToken, async (req: any, res) => {
  try {
    const sessions = await getSessionsByUserId(req.userId);
    res.json(sessions);
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/sessions/:sessionId/history', verifyToken, async (req: any, res) => {
  const { sessionId } = req.params;
  try {
    const history = await getSessionHistory(parseInt(sessionId));
    res.json(history);
  } catch (error) {
    console.error('Error getting session history:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Agent endpoint for messages within a session - protected by JWT
app.post('/api/sessions/:sessionId/message', verifyToken, async (req: any, res) => {
  const { sessionId } = req.params;
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }
  try {
    const result = await handleAgentMessage(parseInt(sessionId), question, req.userId);
    res.json(result);
  } catch (error) {
    console.error('Error processing agent request for session:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.delete('/api/sessions/:sessionId', verifyToken, async (req: any, res) => {
  const { sessionId } = req.params;
  try {
    await deleteSession(parseInt(sessionId), req.userId);
    res.status(204).send(); // No content to send back
  } catch (error: any) {
    console.error('Error deleting session:', error);
    if (error.message === 'Session not found or unauthorized') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});