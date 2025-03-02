import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Pages
import Landing from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/PatientDashboard';
import Doctor from './pages/Docter';
// import NewUserForm from './pages/NewUserForm';
// import DailyCheckin from './pages/DailyCheckin';
// import Appointments from './pages/Appointments';
// import Messages from './pages/Messages';
import Chatbot from './pages/Chatbot';

// Components
import Navbar from './components/Navbar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);
  
  const login = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setIsAuthenticated(true);
    setUser(user);
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };
  
  return (
    <Router>
      <div className="App">
        {isAuthenticated && <Navbar user={user} logout={logout} />}
        <Routes>
          <Route path="/" element={!isAuthenticated ? <Landing /> : <Navigate to="/dashboard" />} />
          <Route path="/login" element={!isAuthenticated ? <Login login={login} /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!isAuthenticated ? <Register login={login} /> : <Navigate to="/dashboard" />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard user={user} /> : <Navigate to="/login" />} /> 
          <Route path="/doctor" element={<Doctor/>} /> 
          {/* <Route path="/profile" element={isAuthenticated ? <Profile user={user} setUser={setUser} /> : <Navigate to="/login" />} />
          <Route path="/new-user-form" element={isAuthenticated ? <NewUserForm user={user} /> : <Navigate to="/login" />} />
          <Route path="/daily-checkin" element={isAuthenticated ? <DailyCheckin user={user} /> : <Navigate to="/login" />} />
          <Route path="/appointments" element={isAuthenticated ? <Appointments user={user} /> : <Navigate to="/login" />} />
          <Route path="/messages" element={isAuthenticated ? <Messages user={user} /> : <Navigate to="/login" />} />  */}
          <Route path="/chatbot" element={isAuthenticated ? <Chatbot user={user} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;