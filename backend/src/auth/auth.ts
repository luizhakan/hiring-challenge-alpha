import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initializeDatabase } from '../db/database';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const SECRET = process.env.JWT_SECRET;

console.log('JWT_SECRET:', SECRET); // Debugging line to check if SECRET is loaded

if (!SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined. Please set this environment variable.');
    process.exit(1);
} // Use a strong secret in production

// Register a new user
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const db = await initializeDatabase();
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const db = await initializeDatabase();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
