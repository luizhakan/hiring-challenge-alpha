import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline'; // For consistent baseline styles

// Define a futuristic theme
const futuristicTheme = createTheme({
  palette: {
    mode: 'dark', // Dark mode for a futuristic feel
    primary: {
      main: '#00bcd4', // Cyan
    },
    secondary: {
      main: '#ff4081', // Pink/Magenta
    },
    background: {
      default: '#1a1a2e', // Dark blue/purple
      paper: '#16213e', // Slightly lighter dark blue/purple
    },
    text: {
      primary: '#e0e0e0', // Light gray
      secondary: '#b0b0b0', // Gray
    },
  },
  typography: {
    fontFamily: '"Roboto Mono", monospace', // A monospace font for futuristic feel
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
    },
    h6: {
      fontSize: '1.2rem',
      fontWeight: 500,
      letterSpacing: '0.05em',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(45deg, #16213e 30%, #0f3460 90%)', // Gradient for AppBar
          boxShadow: '0 3px 5px 2px rgba(0, 0, 0, .3)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={futuristicTheme}>
      <CssBaseline /> {/* Resets CSS to a consistent baseline */}
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
