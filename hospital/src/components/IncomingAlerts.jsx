
import React, { useState, useEffect } from "react";
import "./IncomingAlerts.css";

function formatDate(dateStr) {
  if (!dateStr) return "";
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/");
    return `${day}/${month}/${year}`;
  }
  if (dateStr.includes("-")) {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  // Expecting HH:MM:SS or HH:MM
  return timeStr.slice(0, 5);
}

const getUrgencyClass = (urgency) => {
  switch ((urgency || "").toLowerCase()) {
    case "critical":
      return "urgency-critical";
    case "urgent":
      return "urgency-urgent";
    case "normal":
      return "urgency-normal";
    default:
      return "";
  }
};

const IncomingAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmationMsg, setConfirmationMsg] = useState("");

  // Fetch alerts on mount
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5050/api/alerts");
        const data = await res.json();
        if (data.status === "success" && Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        } else {
          setAlerts([]);
        }
      } catch (err) {
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  // Compute summary stats
  const stats = React.useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter(a => (a.urgency || '').toLowerCase() === 'critical' && (a.status || '').toLowerCase() !== 'resolved' && (a.status || '').toLowerCase() !== 'completed').length;
    const urgent = alerts.filter(a => (a.urgency || '').toLowerCase() === 'urgent' && (a.status || '').toLowerCase() !== 'resolved' && (a.status || '').toLowerCase() !== 'completed').length;
    const pending = alerts.filter(a => (a.status || '').toLowerCase() === 'pending').length;
    const completed = alerts.filter(a => (a.status || '').toLowerCase() === 'resolved' || (a.status || '').toLowerCase() === 'completed').length;
    return { total, critical, urgent, pending, completed };
  }, [alerts]);

  // Get all unique types/components
  const allTypes = React.useMemo(() => {
    const types = alerts.map(a => a.component).filter(Boolean);
    return Array.from(new Set(types));
  }, [alerts]);

  // Filtered alerts based on search and filters
  const filteredAlerts = React.useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch =
        (alert.hospital_name && alert.hospital_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (alert.blood_group && alert.blood_group.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesUrgency = urgencyFilter === 'all' || (alert.urgency && alert.urgency.toLowerCase() === urgencyFilter);
      const matchesType = typeFilter === 'all' || (alert.component && alert.component.toLowerCase() === typeFilter);
      const matchesStatus = statusFilter === 'all' || (alert.status && alert.status.toLowerCase() === statusFilter);
      return matchesSearch && matchesUrgency && matchesType && matchesStatus;
    });
  }, [alerts, searchTerm, urgencyFilter, typeFilter, statusFilter]);

  // Complete task: call backend to resolve alert and update inventory
  const handleCompleteTask = async (alert, idx) => {
    const confirmed = window.confirm(`Mark this alert for ${alert.hospital_name} (${alert.blood_group}, ${alert.component}) as completed? This will update inventory management.`);
    if (!confirmed) return;
    try {
      const res = await fetch('http://127.0.0.1:5050/api/alerts/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: alert.alert_id,
          units_used: alert.units_needed,
          blood_group: alert.blood_group,
          component: alert.component
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        // Re-fetch alerts to update status
        const res2 = await fetch("http://127.0.0.1:5050/api/alerts");
        const data2 = await res2.json();
        if (data2.status === "success") {
          setAlerts(data2.alerts);
        }
        setConfirmationMsg("Task completed and inventory updated!");
        setTimeout(() => setConfirmationMsg(""), 2500);
      } else {
        setConfirmationMsg(data.message || "Failed to complete task");
        setTimeout(() => setConfirmationMsg(""), 2500);
      }
    } catch (err) {
      setConfirmationMsg("Could not connect to backend");
      setTimeout(() => setConfirmationMsg(""), 2500);
    }
  };

  if (loading) {
    return <div className="loading">Loading hospital alerts...</div>;
  }

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <div className="title-section" style={{marginBottom: '2rem'}}>
          <h2 className="alerts-heading" style={{fontSize: '2.8rem', fontWeight: 800, color: '#b31217', marginBottom: '0.5rem'}}>
            Hospital Alerts
            <div className="heading-accent"></div>
          </h2>
          <p className="heading-subtitle" style={{fontSize: '1.15rem', color: '#6b7280', marginTop: 0}}>Real-time blood requirement updates</p>
        </div>
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-label">Total Alerts</div>
            <div className="summary-card-value" style={{color: '#222'}}>{stats.total}</div>
            <div className="summary-card-description">All hospital alerts</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Critical</div>
            <div className="summary-card-value" style={{color: '#e53935'}}>{stats.critical}</div>
            <div className="summary-card-description">Critical & pending</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Urgent</div>
            <div className="summary-card-value" style={{color: '#f59e0b'}}>{stats.urgent}</div>
            <div className="summary-card-description">Urgent & pending</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Pending</div>
            <div className="summary-card-value" style={{color: '#f59e0b'}}>{stats.pending}</div>
            <div className="summary-card-description">All pending alerts</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Completed</div>
            <div className="summary-card-value" style={{color: '#7c3aed'}}>{stats.completed}</div>
            <div className="summary-card-description">Resolved alerts</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-row" style={{ width: '100%', display: 'flex', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div className="search-box" style={{ width: '100%' }}>
            <input
              type="text"
              placeholder="Search by hospital name or blood group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div className="filters-row" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'nowrap', justifyContent: 'flex-start' }}>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="urgency-filter"
            style={{ flex: '0 0 180px', minWidth: 160, maxWidth: 220 }}
          >
            <option value="all">All Urgency Levels</option>
            <option value="critical">Critical</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="type-filter"
            style={{ flex: '0 0 180px', minWidth: 160, maxWidth: 220 }}
          >
            <option value="all">All Types</option>
            {allTypes.map(type => (
              <option key={type} value={type.toLowerCase()}>{type}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="type-filter"
            style={{ flex: '0 0 180px', minWidth: 160, maxWidth: 220 }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="resolved">Completed</option>
          </select>
        </div>
      </div>

      <div className="alerts-table-wrapper">
        {confirmationMsg && (
          <div style={{ color: '#218838', fontWeight: 600, marginBottom: 12, fontSize: '1.1rem', textAlign: 'center' }}>
            {confirmationMsg}
          </div>
        )}
        <table className="alerts-table" cellPadding="8" cellSpacing="0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Hospital Name</th>
              <th>Blood Group</th>
              <th>Type</th>
              <th>Units</th>
              <th>Urgency</th>
              <th>Status</th>
              <th>Complete Task</th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.map((alert, idx) => (
              <tr key={idx}>
                <td>{formatDate(alert.date)}</td>
                <td>{formatTime(alert.time)}</td>
                <td>{alert.hospital_name}</td>
                <td>{alert.blood_group}</td>
                <td>{alert.component}</td>
                <td>{alert.units_needed}</td>
                <td>
                  <span className={`urgency-badge ${getUrgencyClass(alert.urgency)}`}>
                    {alert.urgency}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${(alert.status || '').toLowerCase()}`}>
                    {alert.status}
                  </span>
                </td>
                <td>
                  {(alert.status || '').toLowerCase() === "resolved" || (alert.status || '').toLowerCase() === "completed" ? (
                    <span style={{ color: '#218838', fontWeight: 600 }}>Completed</span>
                  ) : (
                    <button
                      style={{
                        background: '#e52d27',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '7px 16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '1rem',
                        transition: 'background 0.2s',
                      }}
                      onClick={() => handleCompleteTask(alert, idx)}
                    >
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAlerts.length === 0 && (
          <div className="no-results">No alerts found matching your criteria.</div>
        )}
      </div>
    </div>
  );
};

export default IncomingAlerts;