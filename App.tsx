import React, { useState, useEffect } from 'react';
import { User, Page } from './types';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Schedule } from './pages/Schedule';
import { Stats } from './pages/Stats';
import { Settings } from './pages/Settings';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('LOGIN');

  // Load user from session if needed, but for this app we'll start at login
  // unless we want to persist session. Let's keep it simple: Login first always.

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentPage('SCHEDULE');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('LOGIN');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'LOGIN':
        return <Login onLogin={handleLogin} />;
      case 'SCHEDULE':
        return currentUser ? <Schedule currentUser={currentUser} /> : null;
      case 'STATS':
        return currentUser ? <Stats currentUser={currentUser} /> : null;
      case 'SETTINGS':
        return currentUser ? <Settings currentUser={currentUser} onUpdateUser={setCurrentUser} /> : null;
      default:
        return <Login onLogin={handleLogin} />;
    }
  };

  // If we are on LOGIN page, we don't wrap in Layout the same way
  if (currentPage === 'LOGIN') {
     return (
       <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
         <Login onLogin={handleLogin} />
       </div>
     );
  }

  return (
    <Layout 
      currentUser={currentUser} 
      currentPage={currentPage} 
      onNavigate={setCurrentPage}
      onLogout={handleLogout}
    >
      {renderPage()}
    </Layout>
  );
};

export default App;