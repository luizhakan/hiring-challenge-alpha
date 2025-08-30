import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { TextField, Button, Typography, Container, Box, Paper } from '@mui/material'; // Added Paper

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        username,
        password,
      });
      localStorage.setItem('token', response.data.token);
      setMessage('Login successful!');
      navigate('/chat'); // Redirect to chat after successful login
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Login failed.');
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={6} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '12px' }}> {/* Added Paper */}
        <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
          Login
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Login
          </Button>
          {message && <Typography color={message.includes('successful') ? 'primary' : 'error'} sx={{ mt: 1, mb: 2 }}>{message}</Typography>} {/* Dynamic color */}
          <Typography variant="body2" align="center">
            Don't have an account? <Link to="/register" style={{ color: 'inherit', textDecoration: 'none' }}>Register</Link> {/* Inherit color from theme */}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;
