"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./Dashboard.css"

const API_BASE_URL = "http://127.0.0.1:5050"

const Dashboard = () => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setError("")
      } else {
        setError("Failed to fetch notifications")
      }
    } catch (err) {
      setError("Backend not reachable")
      setNotifications([
        {
          alert_id: 1,
          type: "Hospital Request",
          message: "Hospital 5 requests 2 units of Whole Blood (A+) [Critical]",
          timestamp: "2025-08-12 14:08:28",
          status: "Pending",
        },
        {
          alert_id: 2,
          type: "Inventory Shortage",
          message: "Low stock alert: O- blood type below minimum threshold",
          timestamp: "2025-08-12 13:45:15",
          status: "Pending",
        },
        {
          alert_id: 3,
          type: "Donor Response",
          message: "John Smith confirmed availability for blood donation",
          timestamp: "2025-08-12 12:30:42",
          status: "Completed",
        },
        {
          alert_id: 4,
          type: "Hospital Request",
          message: "Hospital 15 requests 5 units of Whole Blood (AB-) [Normal]",
          timestamp: "2025-08-12 11:22:18",
          status: "Pending",
        },
        {
          alert_id: 5,
          type: "Hospital Request",
          message: "Hospital 20 requests 3 units of Platelets (B+) [Urgent]",
          timestamp: "2025-08-12 10:15:33",
          status: "Pending",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const AlertIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="icon">
      <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z" />
    </svg>
  )

  const PhoneIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="icon">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  )

  const HospitalIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="icon">
      <path d="M19 8h-2V3H7v5H5c-1.1 0-2 .9-2 2v11h18V10c0-1.1-.9-2-2-2zM9 5h6v3H9V5zm2 8h2v2h-2v-2zm0 4h2v2h-2v-2zm4-4h2v2h-2v-2zm0 4h2v2h-2v-2zm-8-4h2v2H7v-2zm0 4h2v2H7v-2z" />
    </svg>
  )

  return (
    <div className="dashboard-container">
      <div className="dashboard-header summary-header">
        <div className="title-section">
          <h1 className="summary-title">
            Summary
            <div className="summary-accent"></div>
          </h1>
          <p className="summary-subtitle">Overview of today's blood bank activity</p>
        </div>
        <div className="refresh-time">Last updated: {new Date().toLocaleTimeString()}</div>
      </div>

      <div className="dashboard-content">
        <div className="summary-cards">
          <div className="card alert-card">
            <div className="card-icon alert-icon">
              <AlertIcon />
            </div>
            <div className="card-content">
              <h3>ACTIVE ALERTS</h3>
              <span className="card-value">{notifications.filter((n) => n.status === "Pending").length}</span>
              <div className="card-status urgent">
                {notifications.filter((n) => n.type === "Inventory Shortage").length} Shortages
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-icon donor-icon">
              <PhoneIcon />
            </div>
            <div className="card-content">
              <h3>DONOR RESPONSES</h3>
              <span className="card-value">{notifications.filter((n) => n.type === "Donor Response").length}</span>
              <div className="card-status">Today</div>
            </div>
          </div>

          <div className="card">
            <div className="card-icon hospital-icon">
              <HospitalIcon />
            </div>
            <div className="card-content">
              <h3>HOSPITAL REQUESTS</h3>
              <span className="card-value">{notifications.filter((n) => n.type === "Hospital Request").length}</span>
              <div className="card-status urgent">Active</div>
            </div>
          </div>
        </div>

        <div className="notifications-section">
          <h2 className="section-title">Recent Activity</h2>
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading notifications...</span>
            </div>
          ) : error && notifications.length === 0 ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <span>{error}</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <span>No notifications yet.</span>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.slice(0, 5).map((notif, idx) => {
                const type = notif.type || "Alert"
                const message = notif.message || "No message"
                const timestamp = notif.timestamp || ""

                return (
                  <div
                    key={notif.alert_id || idx}
                    className={`notification-item ${type.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <div className="notification-icon">
                      {type === "Hospital Request" && <HospitalIcon />}
                      {type === "Inventory Shortage" && <AlertIcon />}
                      {type === "Donor Response" && <PhoneIcon />}
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <span className="notification-type">{type}</span>
                        <span className="notification-time">{timestamp}</span>
                      </div>
                      <p className="notification-message">{message}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
