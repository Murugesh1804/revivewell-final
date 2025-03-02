import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ user, logout }) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="nav-logo">ReviveWell</Link>
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
          </li>
          <li className="nav-item">
            <Link to="/appointments" className="nav-link">Appointments</Link>
          </li>
          {user && user.userType === 'patient' && (
            <li className="nav-item">
              <Link to="/daily-checkin" className="nav-link">Daily Check-in</Link>
            </li>
          )}
          <li className="nav-item">
            <Link to="/messages" className="nav-link">Messages</Link>
          </li>
          <li className="nav-item">
            <Link to="/profile" className="nav-link">Profile</Link>
          </li>
          <li className="nav-item">
            <button onClick={logout} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;