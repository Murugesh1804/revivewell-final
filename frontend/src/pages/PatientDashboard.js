import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './style.css'; // You'll need to create this CSS file

const PatientDashboard = () => {
    const [dashboardStats, setDashboardStats] = useState(null);
    const [checkins, setCheckins] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [aaMeetings, setAaMeetings] = useState([]);
    const [llmInsights, setLlmInsights] = useState(null); // Added state for llmInsights
    const [loading, setLoading] = useState(true);
    const [checkinForm, setCheckinForm] = useState({
        mood: 5,
        cravings: 5,
        challenges: '',
        goals: '',
        needCounselor: false,
        needSupportGroup: false,
        needEmergencyContact: false
    });
    const [showCheckinForm, setShowCheckinForm] = useState(false);
    
    const token = localStorage.getItem('token');
    
    // Configure axios
    const api = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                
                // Get dashboard stats
                const statsResponse = await api.get('/dashboard-stats');
                setDashboardStats(statsResponse.data);
                
                // Get recent check-ins and insights
                const response = await api.get('/daily-checkins');
                const { checkins, llm_insights } = response.data;
        
                setCheckins(checkins);
                setLlmInsights(llm_insights); // Set llm insights

                // Get upcoming appointments
                const appointmentsResponse = await api.get('/appointments');
                setAppointments(appointmentsResponse.data);

                // Get AA meetings near the location
                const aaMeetingsResponse = await api.get('/aa-meetings');
                setAaMeetings(aaMeetingsResponse.data);
                
                setLoading(false);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCheckinForm({
            ...checkinForm,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleCheckinSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            // Submit daily check-in
            const response = await api.post('/daily-checkin', checkinForm);
            
            // Reset form and hide it
            setCheckinForm({
                mood: 5,
                cravings: 5,
                challenges: '',
                goals: '',
                needCounselor: false,
                needSupportGroup: false,
                needEmergencyContact: false
            });
            setShowCheckinForm(false);
            
            // Update check-ins list
            const checkinsResponse = await api.get('/daily-checkins');
            const { checkins, llm_insights } = checkinsResponse.data;
            setCheckins(checkins);
            setLlmInsights(llm_insights); // Update llm insights
            
            setLoading(false);
            
            alert('Check-in submitted successfully!');
        } catch (error) {
            console.error('Error submitting check-in:', error);
            setLoading(false);
            alert('Error submitting check-in. Please try again.');
        }
    };

    // Helper function to format date
    const formatDate = (dateString) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (loading && !dashboardStats) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="patient-dashboard">
            <div className="dashboard-header">
                <h1>Welcome to your Recovery Dashboard</h1>
                <button 
                    className="primary-button"
                    onClick={() => setShowCheckinForm(true)}
                >
                    Daily Check-in
                </button>
            </div>
            
            {showCheckinForm && (
                <div className="modal-overlay">
                    <div className="checkin-form-modal">
                        <h2>Daily Check-in</h2>
                        <form onSubmit={handleCheckinSubmit}>
                            <div className="form-group">
                                <label>How are you feeling today? (1-10)</label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    name="mood"
                                    value={checkinForm.mood}
                                    onChange={handleInputChange}
                                />
                                <div className="range-labels">
                                    <span>Poor</span>
                                    <span>Excellent</span>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>How strong are your cravings today? (1-10)</label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    name="cravings"
                                    value={checkinForm.cravings}
                                    onChange={handleInputChange}
                                />
                                <div className="range-labels">
                                    <span>None</span>
                                    <span>Very Strong</span>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>What challenges are you facing today?</label>
                                <textarea
                                    name="challenges"
                                    value={checkinForm.challenges}
                                    onChange={handleInputChange}
                                    rows="3"
                                ></textarea>
                            </div>
                            
                            <div className="form-group">
                                <label>What are your goals for today?</label>
                                <textarea
                                    name="goals"
                                    value={checkinForm.goals}
                                    onChange={handleInputChange}
                                    rows="3"
                                ></textarea>
                            </div>
                            
                            <div className="form-group checkboxes">
                                <div className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id="needCounselor"
                                        name="needCounselor"
                                        checked={checkinForm.needCounselor}
                                        onChange={handleInputChange}
                                    />
                                    <label htmlFor="needCounselor">I need to speak with my counselor</label>
                                </div>
                                
                                <div className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id="needSupportGroup"
                                        name="needSupportGroup"
                                        checked={checkinForm.needSupportGroup}
                                        onChange={handleInputChange}
                                    />
                                    <label htmlFor="needSupportGroup">I would like to join a support group</label>
                                </div>
                                
                                <div className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id="needEmergencyContact"
                                        name="needEmergencyContact"
                                        checked={checkinForm.needEmergencyContact}
                                        onChange={handleInputChange}
                                    />
                                    <label htmlFor="needEmergencyContact">I need emergency support</label>
                                </div>
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" onClick={() => setShowCheckinForm(false)}>Cancel</button>
                                <button type="submit" className="primary-button">Submit Check-in</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <div className="dashboard-grid">
                <div className="dashboard-card progress-card">
                    <h3>Your Recovery Progress</h3>
                    <div className="progress-container">
                        <div 
                            className="progress-bar" 
                            style={{ width: `${dashboardStats?.progress || 0}%` }}
                        ></div>
                    </div>
                    <p className="progress-value">{dashboardStats?.progress || 0}% complete</p>
                    <p>Keep going! You're making excellent progress.</p>
                </div>
                
                <div className="dashboard-card aa-meetings-card">
                    <h3>AA Meetings Near You</h3>
                    {aaMeetings.length > 0 ? (
                        <div className="meetings-list">
                            <ul>
                                {aaMeetings.map(meeting => (
                                    <li key={meeting.id} className="meeting-item">
                                        <p className="meeting-location">{meeting.location}</p>
                                        <p className="meeting-time">{meeting.time}</p>
                                        <p className="meeting-day">{meeting.day}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p>No AA meetings found near your location.</p>
                    )}
                    <Link to="/aa-meetings" className="card-link">View AA Meetings</Link>
                </div>
                
                <div className="dashboard-card checkins-card">
                    <h3>Recent Check-ins</h3>
                    {checkins.length > 0 ? (
                        <div className="checkin-history">
                            <div className="mood-graph">
                                {checkins.slice(0, 7).reverse().map((checkin) => (
                                    <div key={checkin.id} className="mood-bar-container">
                                        <div 
                                            className="mood-bar" 
                                            style={{ height: `${checkin.mood * 10}%` }}
                                            title={`Mood: ${checkin.mood}/10`}
                                        ></div>
                                        <span className="mood-date">
                                            {new Date(checkin.created_at).toLocaleDateString(undefined, { weekday: 'short' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p>Your mood has been {
                                checkins[0].mood > 7 ? 'positive' : 
                                checkins[0].mood > 4 ? 'stable' : 'challenging'
                            } lately.</p>
                        </div>
                    ) : (
                        <p>No recent check-ins found. Start tracking your progress!</p>
                    )}
                </div>
                
                <div className="dashboard-card upcoming-card">
                    <h3>Upcoming Appointments</h3>
                    {appointments.length > 0 ? (
                        <ul className="appointment-list">
                            {appointments.slice(0, 3).map(appointment => (
                                <li key={appointment.id} className="appointment-item">
                                    <div className="appointment-date-time">
                                        <span className="app-date">{new Date(appointment.date).toLocaleDateString()}</span>
                                        <span className="app-time">{appointment.time}</span>
                                    </div>
                                    <div className="appointment-info">
                                        <span className="app-provider">Dr. {appointment.provider_name}</span>
                                        <span className="app-type">{appointment.type}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No upcoming appointments.</p>
                    )}
                    <Link to="/appointments" className="card-link">Schedule New Appointment</Link>
                </div>
                
                <div className="dashboard-card resources-card">
                    <h3>Recovery Resources</h3>
                    <ul className="resources-list">
                        <li><Link to="/resources/mindfulness">Mindfulness Exercises</Link></li>
                        <li><Link to="/resources/coping">Coping Strategies</Link></li>
                        <li><Link to="/resources/support">Support Groups</Link></li>
                        <li><Link to="/resources/education">Educational Materials</Link></li>
                    </ul>
                </div>
                
                <div className="dashboard-card support-card">
                    <h3>Need Support?</h3>
                    <div className="support-options">
                        <Link to="/chatbot" className="support-option">
                            <span className="icon">💬</span>
                            <span>Chat with Support Bot</span>
                        </Link>
                        <Link to="/messages" className="support-option">
                            <span className="icon">📝</span>
                            <span>Message Your Counselor</span>
                        </Link>
                        <a href="tel:+18001234567" className="support-option emergency">
                            <span className="icon">🆘</span>
                            <span>Crisis Helpline</span>
                        </a>
                    </div>
                </div>
                
                {/* New Insights Card */}
                <div className="dashboard-card insights-card">
                    <h3>Insights</h3>
                    {llmInsights ? (
                        <p>{llmInsights}</p>
                    ) : (
                        <p>No insights available.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientDashboard;