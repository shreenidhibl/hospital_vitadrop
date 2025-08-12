"use client"
import { useLocation, useNavigate } from "react-router-dom"
import "./Navbar.css"

const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/incoming-alerts", label: "Hospital Alerts" },
    { path: "/inventory", label: "Inventory Management" },
    { path: "/donor-alert-map", label: "Alert Donors" },
    { path: "/bloodbank-alerts", label: "Alert Blood Banks" },
    { path: "/transaction-history", label: "Transaction History" },
    { path: "/analytics", label: "Analytics Dashboard" },
  ]

  return (
    <div className="navbar-container">
      <div className="navbar-logo" onClick={() => navigate("/dashboard")}>
        🩸 <span>VitaDrop</span>
      </div>
      <div className="navbar-links">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`nav-btn${location.pathname === item.path ? " active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Navbar