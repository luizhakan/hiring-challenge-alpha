import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // Added useParams
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Drawer, // For session list sidebar
  List,
  ListItem,
  ListItemButton, // Added ListItemButton
  ListItemText,
  Divider,
  CircularProgress, // For loading indicator
  Dialog, // For confirmation dialog
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu'; // For opening drawer
import DeleteIcon from '@mui/icons-material/Delete'; // For delete button

function Chat() {
  const [messages, setMessages] = useState<any[]>([]); // State for current session messages
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]); // State for list of sessions
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null); // Current active session ID
  const [totalTokens, setTotalTokens] = useState(0); // Token counter for current session
  const [drawerOpen, setDrawerOpen] = useState(false); // State for drawer visibility
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false); // State for delete confirmation dialog
  const [sessionToDeleteId, setSessionToDeleteId] = useState<number | null>(null); // ID of session to delete

  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>(); // Get sessionId from URL
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MAX_TOKENS_PER_SESSION = 100000; // 100k tokens limit

  // Effect to set currentSessionId from URL or navigate to a new session
  useEffect(() => {
    if (urlSessionId) {
      setCurrentSessionId(urlSessionId);
    } else if (sessions.length > 0) {
      // If no session in URL, but sessions exist, navigate to the latest one
      navigate(`/chat/${sessions[0].id}`);
    } else if (sessions.length === 0 && urlSessionId === undefined) {
      // If no session in URL and no sessions exist, create a new one
      handleCreateNewSession();
    }
  }, [urlSessionId, sessions, navigate]); // Depend on urlSessionId, sessions, and navigate

  // Effect to fetch messages and tokens for the current session
  useEffect(() => {
    if (currentSessionId) {
      fetchSessionHistory(currentSessionId);
    }
  }, [currentSessionId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        navigate('/login');
        return;
      }
      const response = await fetch('http://localhost:3000/api/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleCreateNewSession = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        navigate('/login');
        return;
      }
      const response = await fetch('http://localhost:3000/api/sessions/new', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to create new session');
      }
      const data = await response.json();
      // After creating, refetch all sessions to update the list
      await fetchSessions();
      navigate(`/chat/${data.sessionId}`); // Navigate to the new session
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  const fetchSessionHistory = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        navigate('/login');
        return;
      }
      const response = await fetch(`http://localhost:3000/api/sessions/${sessionId}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch session history');
      }
      const data = await response.json();
      setMessages(data.messages);
      setTotalTokens(data.totalTokens);
    } catch (error) {
      console.error('Error fetching session history:', error);
      // If history fails, maybe navigate to a new session or error page
      // For now, just clear messages and tokens
      setMessages([]);
      setTotalTokens(0);
      // Optionally, navigate to create a new session if the current one is invalid
      // navigate('/chat');
    }
  };

  const handleSendMessage = async () => {
    if (input.trim() === '' || !currentSessionId) return;

    const newMessage = { sender: 'user', text: input };
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        setLoading(false);
        navigate('/login');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/sessions/${currentSessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: input })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setMessages(prevMessages => [...prevMessages, { sender: 'bot', text: data.answer }]);
      setTotalTokens(prevTokens => prevTokens + data.tokenUsage.total); // Update token counter

      if (totalTokens + data.tokenUsage.total > MAX_TOKENS_PER_SESSION) {
        alert('Session token limit reached! Please start a new chat.');
        // Optionally, disable input or automatically create a new session
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prevMessages => [...prevMessages, { sender: 'bot', text: 'Error: Could not send message.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDeleteId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        navigate('/login');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/sessions/${sessionToDeleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // After successful deletion, refetch sessions and navigate if current session was deleted
      await fetchSessions();
      if (String(sessionToDeleteId) === currentSessionId) {
        // If the current session was deleted, navigate to the latest session or create new
        if (sessions.length > 1) { // Check if there are other sessions left
          navigate(`/chat/${sessions.filter(s => s.id !== sessionToDeleteId)[0].id}`);
        } else {
          navigate('/chat'); // This will trigger new session creation if no sessions left
        }
      }
      setOpenDeleteDialog(false);
      setSessionToDeleteId(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      setOpenDeleteDialog(false);
      setSessionToDeleteId(null);
      alert('Failed to delete session.');
    }
  };

  // Initial fetch of sessions on component mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (event.type === 'keydown' && ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleOpenDeleteDialog = (sessionId: number) => {
    setSessionToDeleteId(sessionId);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSessionToDeleteId(null);
  };

  const drawerContent = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
      <List>
        <ListItem>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Chats</Typography>
          <Button onClick={handleCreateNewSession} variant="contained" size="small">New Chat</Button>
        </ListItem>
        <Divider />
        {sessions.map((session) => (
          <ListItemButton
            key={session.id}
            onClick={() => navigate(`/chat/${session.id}`)}
            selected={currentSessionId === String(session.id)}
          >
            <ListItemText primary={`Chat ${session.id}`} secondary={`Tokens: ${session.total_tokens}`} />
            <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(session.id); }}>
              <DeleteIcon />
            </IconButton>
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Container maxWidth="sm" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 0 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Chat {currentSessionId ? `(ID: ${currentSessionId})` : ''}
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        {drawerContent}
      </Drawer>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: 'background.default' }}>
        {messages.map((msg, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              mb: 1,
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                maxWidth: '70%',
                borderRadius: '20px',
                bgcolor: msg.sender === 'user' ? 'primary.main' : 'background.paper',
                color: msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                boxShadow: 1,
              }}
            >
              <Typography variant="body1">{msg.text}</Typography>
            </Paper>
          </Box>
        ))}
        {loading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              mb: 1,
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                maxWidth: '70%',
                borderRadius: '20px',
                bgcolor: 'background.paper',
                color: 'text.secondary',
                boxShadow: 1,
              }}
            >
              <Typography variant="body1">Bot is typing...</Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, borderTop: '1px solid #e0e0e0', bgcolor: 'background.paper' }}>
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-end' }}>
          Tokens: {totalTokens} / {MAX_TOKENS_PER_SESSION}
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
          disabled={loading || totalTokens >= MAX_TOKENS_PER_SESSION}
          size="small"
        />
        <Button
          variant="contained"
          onClick={handleSendMessage}
          disabled={loading || totalTokens >= MAX_TOKENS_PER_SESSION}
          endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </Button>
      </Box>
    {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirmar Exclusão"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Tem certeza que deseja excluir esta sessão de chat? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeleteSession} autoFocus color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Chat;
