import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { NavigationProvider } from './context/NavigationContext.jsx';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* ThemeProvider is outermost: it only touches <html> and has no
        dependency on routing or the session. */}
    <ThemeProvider>
      <BrowserRouter>
        {/* ToastProvider wraps the session, because logging in and out are
            themselves events the user is told about in a toast. */}
        <ToastProvider>
          {/* AuthProvider sits inside the router so its children can navigate. */}
          <AuthProvider>
            {/* The admin's header and footer links, fetched once for the
                whole application rather than per page. */}
            <NavigationProvider>
              <App />
            </NavigationProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
