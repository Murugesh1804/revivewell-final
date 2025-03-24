import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './docter.css'; 
import ReactMarkdown from 'react-markdown';

const DoctorDashboard = () => {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [criticalCheckins, setCriticalCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userCheckins, setUserCheckins] = useState([]);
  const [llmInsights, setLlmInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  const token = localStorage.getItem('token');
  
  // Configure axios
  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  // Fetch dashboard data (without LLM insights)
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get dashboard stats
        const statsResponse = await api.get('/dashboard-stats');
        setDashboardStats(statsResponse.data);
        setPatients(statsResponse.data.patients || []);
        
        // Get upcoming appointments
        const appointmentsResponse = await api.get('/appointments');
        setAppointments(appointmentsResponse.data);
        
        // Get critical check-ins (those with emergency flags)
        const checkinsResponse = await api.get('/user-checkins');
        const critical = checkinsResponse.data;
        setCriticalCheckins(critical);
        
        // Get basic user check-ins data without LLM insights
        const userCheckinsResponse = await api.get('/user-checkins'); 
        setUserCheckins(userCheckinsResponse.data.users || []);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Function to fetch LLM insights specifically
  const fetchLlmInsights = async () => {
    try {
      setLoadingInsights(true);
      
      const userCheckinsResponse = await api.get('/user-checkins');
      console.log(userCheckinsResponse.data);
      setLlmInsights(userCheckinsResponse.data.llm_insights || 'No Response from API');
      
      setLoadingInsights(false);
    } catch (error) {
      console.error('Error fetching LLM insights:', error);
      setLoadingInsights(false);
      setLlmInsights('Error fetching insights. Please try again.');
    }
  };

  // Function to refresh specific sections
  const refreshSection = async (section) => {
    try {
      setLoading(true);
      switch(section) {
        case 'stats':
          const statsResponse = await api.get('/dashboard-stats');
          setDashboardStats(statsResponse.data);
          setPatients(statsResponse.data.patients || []);
          break;
        case 'appointments':
          const appointmentsResponse = await api.get('/appointments');
          setAppointments(appointmentsResponse.data);
          break;
        case 'checkins':
          const checkinsResponse = await api.get('/user-checkins');
          setCriticalCheckins(checkinsResponse.data);
          break;
        case 'insights':
          // Only fetch user checkins without LLM insights
          const userCheckinsResponse = await api.get('/user-checkins');
          setUserCheckins(userCheckinsResponse.data.users || []);
          break;
        default:
          // Fetch all data except LLM insights
          const fullStatsResponse = await api.get('/dashboard-stats');
          setDashboardStats(fullStatsResponse.data);
          setPatients(fullStatsResponse.data.patients || []);
          
          const fullAppointmentsResponse = await api.get('/appointments');
          setAppointments(fullAppointmentsResponse.data);
          
          const fullCheckinsResponse = await api.get('/user-checkins');
          setCriticalCheckins(fullCheckinsResponse.data);
          setUserCheckins(fullCheckinsResponse.data.users || []);
          break;
      }
      setLoading(false);
    } catch (error) {
      console.error('Error refreshing section:', error);
      setLoading(false);
    }
  };

  // Function to determine risk level color
  const getRiskLevelColor = (riskLevel) => {
    if (riskLevel === 'High') return 'red';
    if (riskLevel === 'Medium') return 'orange';
    return 'green';
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Helper function to format timestamp
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  // Group check-ins by user for better organization
  const groupedCheckins = userCheckins.reduce((acc, checkin) => {
    if (!checkin.name) return acc; // Skip entries without a name
    
    if (!acc[checkin.name]) {
      acc[checkin.name] = [];
    }
    acc[checkin.name].push(checkin);
    return acc;
  }, {});

  if (loading && !dashboardStats) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading provider dashboard...</p>
      </div>
    );
  }

  return (
    <div className="doctor-dashboard">
      <div className="dashboard-header">
        <h1>Provider Dashboard</h1>
        <div className="action-buttons">
          <Link to="/appointments/schedule" className="primary-button">
            Schedule Appointment
          </Link>
          <Link to="/patients/add" className="secondary-button">
            Add New Patient
          </Link>
        </div>
      </div>
      
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-value">{dashboardStats?.totalPatients || 0}</div>
          <div className="stat-label">Total Patients</div>
        </div>
        
        <div className="stat-card alert">
          <div className="stat-value">{dashboardStats?.criticalCases || 0}</div>
          <div className="stat-label">Critical Cases</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{dashboardStats?.todayAppointments || 0}</div>
          <div className="stat-label">Today's Appointments</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{criticalCheckins.length}</div>
          <div className="stat-label">Urgent Check-ins</div>
        </div>
      </div>
      
      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
        >
          Patient List
        </button>
        <button 
          className={`tab-button ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments
        </button>
        <button 
          className={`tab-button ${activeTab === 'checkins' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkins')}
        >
          Recent Check-ins
        </button>
        <button 
          className={`tab-button ${activeTab === 'patient-insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('patient-insights')}
        >
          Patient Insights
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="dashboard-grid">
              <div className="dashboard-card critical-patients">
                <h3>Critical Patients</h3>
                {criticalCheckins.length > 0 ? (
                  <ul className="critical-list">
                    {criticalCheckins.slice(0, 5).map((checkin, index) => (
                      <li key={index} className="critical-item">
                        <div className="patient-info">
                          <span className="patient-name">{checkin.patient_name}</span>
                          <span className="flag-indicators">
                            {checkin.need_emergency_contact === 1 && 
                              <span className="flag emergency" title="Needs emergency contact">🚨</span>
                            }
                            {checkin.need_counselor === 1 && 
                              <span className="flag counselor" title="Needs counselor">👨‍⚕️</span>
                            }
                            {checkin.mood < 3 && 
                              <span className="flag mood" title="Low mood">😞</span>
                            }
                            {checkin.cravings > 8 && 
                              <span className="flag cravings" title="Strong cravings">🔥</span>
                            }
                          </span>
                        </div>
                        <div className="patient-action">
                          <Link to={`/messages?partnerId=${checkin.user_id}`} className="action-link">Message</Link>
                          <Link to={`/patients/${checkin.user_id}`} className="action-link">Profile</Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No critical patients at this time.</p>
                )}
              </div>
              
              <div className="dashboard-card today-appointments">
                <h3>Today's Appointments</h3>
                {appointments.filter(app => new Date(app.date).toDateString() === new Date().toDateString()).length > 0 ? (
                  <ul className="today-list">
                    {appointments
                      .filter(app => new Date(app.date).toDateString() === new Date().toDateString())
                      .map((appointment, index) => (
                        <li key={index} className="appointment-item">
                          <div className="time-slot">{appointment.time}</div>
                          <div className="appointment-details">
                            <span className="patient-name">{appointment.patient_name}</span>
                            <span className="appointment-type">{appointment.type}</span>
                          </div>
                          <div className="appointment-actions">
                            <Link to={`/appointments/${appointment.id}`} className="action-btn">
                              View
                            </Link>
                          </div>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>No appointments scheduled for today.</p>
                )}
              </div>
              
              <div className="dashboard-card patient-distribution">
                <h3>Patient Distribution</h3>
                <div className="distribution-chart">
                  <div className="chart-bar">
                    <div className="bar-label">Alcohol</div>
                    <div className="bar-value" style={{ width: '65%' }}>65%</div>
                  </div>
                  <div className="chart-bar">
                    <div className="bar-label">Opioids</div>
                    <div className="bar-value" style={{ width: '20%' }}>20%</div>
                  </div>
                  <div className="chart-bar">
                    <div className="bar-label">Stimulants</div>
                    <div className="bar-value" style={{ width: '10%' }}>10%</div>
                  </div>
                  <div className="chart-bar">
                    <div className="bar-label">Other</div>
                    <div className="bar-value" style={{ width: '5%' }}>5%</div>
                  </div>
                </div>
              </div>
              
              <div className="dashboard-card recent-activity">
                <h3>Recent Activity</h3>
                <ul className="activity-list">
                  <li className="activity-item">
                    <span className="activity-time">10:15 AM</span>
                    <span className="activity-description">New check-in from <Link to="/patients/123">John D.</Link></span>
                  </li>
                  <li className="activity-item">
                    <span className="activity-time">09:30 AM</span>
                    <span className="activity-description">Appointment completed with <Link to="/patients/456">Sarah M.</Link></span>
                  </li>
                  <li className="activity-item">
                    <span className="activity-time">Yesterday</span>
                    <span className="activity-description">New message from <Link to="/patients/789">Robert J.</Link></span>
                  </li>
                  <li className="activity-item">
                    <span className="activity-time">Yesterday</span>
                    <span className="activity-description">Treatment plan updated for <Link to="/patients/101">Emily S.</Link></span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'patients' && (
          <div className="patients-tab">
            <div className="table-actions">
              <input type="text" placeholder="Search patients..." className="search-input" />
              <div className="filter-controls">
                <select className="filter-select">
                  <option value="">All Risk Levels</option>
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </select>
                <select className="filter-select">
                  <option value="">All Substances</option>
                  <option value="alcohol">Alcohol</option>
                  <option value="opioids">Opioids</option>
                  <option value="stimulants">Stimulants</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="patients-table-container">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Last Check-in</th>
                    <th>Risk Level</th>
                    <th>Next Appointment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient, index) => (
                    <tr key={index}>
                      <td>{patient.name}</td>
                      <td>{patient.last_checkin ? new Date(patient.last_checkin).toLocaleDateString() : 'Never'}</td>
                      <td>
                        <span 
                          className="risk-level" 
                          style={{ backgroundColor: getRiskLevelColor(patient.risk_level) }}
                        >
                          {patient.risk_level}
                        </span>
                      </td>
                      <td>{formatDate(patient.next_appointment)}</td>
                      <td className="action-cell">
                        <Link to={`/patients/${patient.id}`} className="action-link">View</Link>
                        <Link to={`/messages?partnerId=${patient.id}`} className="action-link">Message</Link>
                        <Link to={`/appointments/schedule?patientId=${patient.id}`} className="action-link">Schedule</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'appointments' && (
          <div className="appointments-tab">
            <div className="table-actions">
              <input type="text" placeholder="Search appointments..." className="search-input" />
              <div className="filter-controls">
                <select className="filter-select">
                  <option value="">All Appointments</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <select className="filter-select">
                  <option value="">All Types</option>
                  <option value="initial">Initial Consultation</option>
                  <option value="followup">Follow-up</option>
                  <option value="therapy">Therapy Session</option>
                  <option value="medication">Medication Review</option>
                </select>
              </div>
            </div>
            
            <div className="appointments-table-container">
              <table className="appointments-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Patient</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment, index) => (
                    <tr key={index}>
                      <td>{formatDate(appointment.date)} at {appointment.time}</td>
                      <td>{appointment.patient_name}</td>
                      <td>{appointment.type}</td>
                      <td>
                        <span className={`status-badge status-${appointment.status.toLowerCase()}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="action-cell">
                        <Link to={`/appointments/${appointment.id}`} className="action-link">View</Link>
                        <Link to={`/appointments/${appointment.id}/edit`} className="action-link">Edit</Link>
                        <button className="action-link text-button">Cancel</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'checkins' && (
          <div className="checkins-tab">
            <div className="table-actions">
              <input type="text" placeholder="Search check-ins..." className="search-input" />
              <div className="filter-controls">
                <select className="filter-select">
                  <option value="">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">This Week</option>
                </select>
                <select className="filter-select">
                  <option value="">All Statuses</option>
                  <option value="critical">Critical</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
            </div>
            
            <div className="checkins-table-container">
              <table className="checkins-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Patient</th>
                    <th>Mood</th>
                    <th>Cravings</th>
                    <th>Flags</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalCheckins.map((checkin, index) => (
                    <tr key={index} className={checkin.need_emergency_contact === 1 ? "critical-row" : ""}>
                      <td>{new Date(checkin.created_at).toLocaleString()}</td>
                      <td>{checkin.patient_name}</td>
                      <td>
                        <span className={`mood-indicator mood-${checkin.mood < 3 ? 'low' : checkin.mood > 7 ? 'high' : 'medium'}`}>
                          {checkin.mood}/10
                        </span>
                      </td>
                      <td>
                        <span className={`cravings-indicator cravings-${checkin.cravings > 8 ? 'high' : checkin.cravings > 5 ? 'medium' : 'low'}`}>
                          {checkin.cravings}/10
                        </span>
                      </td>
                      <td className="flags-cell">
                        {checkin.need_emergency_contact === 1 && 
                          <span className="flag emergency" title="Needs emergency contact">🚨</span>
                        }
                        {checkin.need_counselor === 1 && 
                          <span className="flag counselor" title="Needs counselor">👨‍⚕️</span>
                        }
                        {checkin.mood < 3 && 
                          <span className="flag mood" title="Low mood">😞</span>
                        }
                        {checkin.cravings > 8 && 
                          <span className="flag cravings" title="Strong cravings">🔥</span>
                        }
                      </td>
                      <td className="action-cell">
                        <Link to={`/checkins/${checkin.id}`} className="action-link">View</Link>
                        <Link to={`/messages?partnerId=${checkin.user_id}`} className="action-link">Message</Link>
                        <Link to={`/patients/${checkin.user_id}`} className="action-link">Profile</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'patient-insights' && (
          <div className="patient-insights-tab">
            <div className="insights-container">
              <div className="insights-section">
                <div className="insights-card llm-insights">
                  <div className="insights-header">
                    <h3>AI-Generated Insights</h3>
                    <button 
                      className="fetch-insights-btn primary-button"
                      onClick={fetchLlmInsights}
                      disabled={loadingInsights}
                    >
                      {loadingInsights ? 'Loading Insights...' : 'Generate AI Insights'}
                    </button>
                  </div>
                  <div className="insights-content">
                    {loadingInsights ? (
                      <div className="loading-spinner-small"></div>
                    ) : llmInsights ? (
                      <ReactMarkdown>{llmInsights}</ReactMarkdown>
                    ) : (
                      <p>Click the button above to generate AI insights based on patient check-ins.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="insights-section">
                <div className="insights-card user-checkins">
                  <h3>Patient Check-ins</h3>
                  <div className="checkins-by-patient">
                    {Object.entries(groupedCheckins).map(([patientName, checkins]) => (
                      <div key={patientName} className="patient-checkins-group">
                        <h4 className="patient-name">{patientName}</h4>
                        <div className="checkins-timeline">
                          {checkins.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((checkin, index) => (
                            <div key={index} className="checkin-card">
                              <div className="checkin-header">
                                <span className="checkin-time">{formatDateTime(checkin.created_at)}</span>
                                <div className="checkin-indicators">
                                  <span className={`mood-indicator mood-${checkin.mood < 3 ? 'low' : checkin.mood > 7 ? 'high' : 'medium'}`}>
                                    Mood: {checkin.mood}/10
                                  </span>
                                  <span className={`cravings-indicator cravings-${checkin.cravings > 8 ? 'high' : checkin.cravings > 5 ? 'medium' : 'low'}`}>
                                    Cravings: {checkin.cravings}/10
                                  </span>
                                </div>
                              </div>
                              <div className="checkin-details">
                                {checkin.goals && (
                                  <div className="checkin-field">
                                    <strong>Goals:</strong> {checkin.goals}
                                  </div>
                                )}
                                {checkin.challenges && (
                                  <div className="checkin-field">
                                    <strong>Challenges:</strong> {checkin.challenges}
                                  </div>
                                )}
                              </div>
                              <div className="checkin-actions">
                                <Link to={`/messages?partnerId=${checkin.id}`} className="action-link">Message</Link>
                                <Link to={`/patients/${checkin.id}`} className="action-link">Profile</Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;