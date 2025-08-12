import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom"

import LoginPage from "./components/LoginPage"
import Dashboard from "./components/Dashboard"
import IncomingAlerts from "./components/IncomingAlerts"
import InventoryManagement from "./components/InventoryManagement"
import DonorAlertMapPage from "./components/DonorAlertMapPage"
import AnalyticsDashboard from "./components/AnalyticsDashboard"
import BloodTransactionHistory from "./components/BloodTransactionHistory"
import BloodBankAlertPage from "./components/BloodBankAlertPage"
import Navbar from "./components/Navbar"

const NavbarWrapper = () => {
  const location = useLocation()
  // Don't show navbar on login page
  if (location.pathname === "/") return null
  return <Navbar />
}

const App = () => {
  return (
    <Router>
      <NavbarWrapper />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/incoming-alerts" element={<IncomingAlerts />} />
        <Route path="/inventory" element={<InventoryManagement />} />
        <Route path="/donor-alert-map" element={<DonorAlertMapPage />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/transaction-history" element={<BloodTransactionHistory />} />
        <Route path="/bloodbank-alerts" element={<BloodBankAlertPage />} />
        {/* Add other routes as needed */}
      </Routes>
    </Router>
  )
}

export default App
