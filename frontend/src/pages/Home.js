import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="landing-page">
      <header className="navbar">
        <div className="navbar-container">
          <Link to="/" className="nav-logo">HEALING HORIZON</Link>
          <ul className="nav-menu">
            <li className="nav-item">
              <Link to="/login" className="nav-link">Login</Link>
            </li>
            <li className="nav-item">
              <Link to="/register" className="nav-link button">Register</Link>
            </li>
          </ul>
        </div>
      </header>
      
      <section className="hero">
        <div className="container">
          <h1>Your Journey to Recovery Starts Here</h1>
          <p>
            Healing horizon provides personalized support for addiction recovery, 
            connecting you with healthcare professionals and resources to help you 
            achieve lasting wellness.
          </p>
          <Link to="/register" className="button">Start Your Recovery Journey</Link>
        </div>
      </section>
      
      <section className="feature-section">
        <div className="container">
          <h2 className="text-center">How Healing Horizon Helps You</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>Daily Check-ins</h3>
              <p>Track your mood, cravings, and progress with simple daily check-ins that help you stay accountable.</p>
            </div>
            <div className="feature-card">
              <h3>Professional Support</h3>
              <p>Connect with counselors and healthcare providers through secure messaging and video appointments.</p>
            </div>
            <div className="feature-card">
              <h3>Recovery Community</h3>
              <p>Join a supportive community of people who understand your journey and can provide encouragement.</p>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="text-center" style={{ padding: '20px', backgroundColor: '#053B50', color: 'white' }}>
        <p>© 2025 ReviveWell - Supporting Your Recovery Journey</p>
      </footer>
    </div>
  );
}

export default Landing;