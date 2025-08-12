"use client"

import { useState, useEffect } from "react"
import "./BloodTransactionHistory.css"

function formatDate(dateStr) {
  if (!dateStr) return ""
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/")
    return `${day}/${month}/${year}`
  }
  if (dateStr.includes("-")) {
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}/${year}`
  }
  return dateStr
}

const BloodTransactionHistory = () => {
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [bloodGroupFilter, setBloodGroupFilter] = useState("All")
  const [sourceFilter, setSourceFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("date")
  const [sortDirection, setSortDirection] = useState("desc")

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        console.log("Connecting to Flask backend...")
        setLoading(true)

        const response = await fetch("http://localhost:5050/api/transactions", {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
        })

        console.log("Flask response status:", response.status)

        if (!response.ok) {
          throw new Error(`Flask server responded with status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Successfully loaded", data.length, "transactions from Flask")
        console.log("Sample transactions:", data.slice(0, 3))

        setTransactions(data)
        setFilteredTransactions(data)
        setLoading(false)
      } catch (error) {
        console.error("Error connecting to Flask backend:", error)

        const fallbackData = [
          {
            date: "2025-07-15",
            blood_group: "O+",
            units: "8",
            source_type: "Blood Bank",
            source_name: "Central Blood Bank",
            urgency: "Critical",
            status: "Fulfilled",
          },
          {
            date: "2025-07-14",
            blood_group: "A-",
            units: "1",
            source_type: "Donor",
            source_name: "John Smith",
            urgency: "Urgent",
            status: "Fulfilled",
          },
          {
            date: "2025-05-30",
            blood_group: "B-",
            units: "13",
            source_type: "Blood Bank",
            source_name: "Central Blood Bank",
            urgency: "Normal",
            status: "Pending",
          },
        ]
        console.log("Using fallback data due to Flask connection error")
        setTransactions(fallbackData)
        setFilteredTransactions(fallbackData)
        setLoading(false)
      }
    }

    loadTransactions()
  }, [])

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split("\n")
    if (lines.length < 2) {
      throw new Error("CSV file has insufficient data")
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
    console.log("CSV headers found:", headers)

    const data = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue // Skip empty lines

      const values = []
      let current = ""
      let inQuotes = false

      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          values.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      values.push(current.trim()) // Add the last value

      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })

      if (row.date && row.blood_group && row.source_type) {
        data.push(row)
      } else {
        console.warn("Skipping invalid row:", row)
      }
    }

    console.log("Parsed", data.length, "valid transactions")
    return data
  }

  useEffect(() => {
    const filtered = transactions.filter((transaction) => {
      const matchesBloodGroup = bloodGroupFilter === "All" || transaction.blood_group === bloodGroupFilter
      const matchesSource = sourceFilter === "All" || transaction.source_type === sourceFilter
      const matchesStatus = statusFilter === "All" || transaction.status === statusFilter
      const matchesSearch =
        searchTerm === "" ||
        transaction.source_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.blood_group?.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesBloodGroup && matchesSource && matchesStatus && matchesSearch
    })

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      if (sortField === "date") {
        // Parse DD/MM/YYYY or YYYY-MM-DD to Date object
        const parseDate = (str) => {
          if (!str) return new Date(0)
          if (str.includes("/")) {
            const [day, month, year] = str.split("/")
            return new Date(`${year}-${month}-${day}`)
          }
          return new Date(str)
        }
        aValue = parseDate(aValue)
        bValue = parseDate(bValue)
      } else if (sortField === "units") {
        aValue = Number.parseInt(aValue)
        bValue = Number.parseInt(bValue)
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredTransactions(filtered)
  }, [transactions, bloodGroupFilter, sourceFilter, statusFilter, searchTerm, sortField, sortDirection])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getStats = () => {
    const fromDonors = transactions.filter((t) => t.source_type === "Donor").length
    const fromBloodBanks = transactions.filter((t) => t.source_type === "Blood Bank").length
    const pending = transactions.filter((t) => t.status === "Pending").length
    const fulfilled = transactions.filter((t) => t.status === "Fulfilled").length

    return { fromDonors, fromBloodBanks, pending, fulfilled }
  }

  const stats = getStats()

  if (loading) {
    return <div className="loading">Loading blood transaction history...</div>
  }

  return (
    <div className="transaction-dashboard">
      <div className="inventory-header" style={{marginBottom: '2.5rem'}}>
        <div className="title-section">
          <h2 className="inventory-title">Blood Transaction History</h2>
          <div className="title-underline"></div>
          <p className="heading-subtitle">All blood transactions and their sources</p>
        </div>
      </div>
      <div className="summary-cards">
        <div className="summary-card">
          <h3>From Donors</h3>
          <div className="summary-value total">{stats.fromDonors}</div>
          <p className="summary-label">All donor sources</p>
        </div>
        <div className="summary-card">
          <h3>From Blood Banks</h3>
          <div className="summary-value plasma">{stats.fromBloodBanks}</div>
          <p className="summary-label">All blood bank sources</p>
        </div>
        <div className="summary-card">
          <h3>Pending</h3>
          <div className="summary-value rbcs">{stats.pending}</div>
          <p className="summary-label">Unfulfilled transactions</p>
        </div>
        <div className="summary-card">
          <h3>Fulfilled</h3>
          <div className="summary-value platelets">{stats.fulfilled}</div>
          <p className="summary-label">Completed transactions</p>
        </div>
      </div>

      <div className="filters-section">
        <div className="filters-row" style={{ width: '100%', display: 'flex', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div className="search-box" style={{ width: '100%' }}>
            <input
              type="text"
              placeholder="Search by source name or blood group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div className="filters-row" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'nowrap', justifyContent: 'flex-start' }}>
          <select
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
            className="filter-select"
            style={{ flex: '0 0 180px', minWidth: 160, maxWidth: 220 }}
          >
            <option value="All">All Blood Groups</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="filter-select" style={{ flex: '0 0 180px', minWidth: 160, maxWidth: 220 }}>
            <option value="All">All Sources</option>
            <option value="Donor">Donors</option>
            <option value="Blood Bank">Blood Banks</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select" style={{ flex: '0 0 180px', minWidth: 160, maxWidth: 220 }}>
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Fulfilled">Fulfilled</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="transactions-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("date")} className="sortable">
                Date {sortField === "date" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("source_name")} className="sortable">
                Source {sortField === "source_name" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("blood_group")} className="sortable">
                Blood Group {sortField === "blood_group" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("units")} className="sortable">
                Units {sortField === "units" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th>Source Type</th>
              <th>Urgency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((transaction, index) => (
              <tr key={index} className="transaction-row">
                <td>{formatDate(transaction.date)}</td>
                <td>{transaction.source_name}</td>
                <td>
                  <span className="blood-group-badge">{transaction.blood_group}</span>
                </td>
                <td>{transaction.units}</td>
                <td>
                  <span className={`source-badge ${transaction.source_type.toLowerCase().replace(" ", "-")}`}>
                    {transaction.source_type}
                  </span>
                </td>
                <td>
                  <span className={`urgency-badge ${transaction.urgency.toLowerCase()}`}>{transaction.urgency}</span>
                </td>
                <td>
                  <span className={`status-badge ${transaction.status.toLowerCase()}`}>{transaction.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="no-results">No transactions found matching your criteria.</div>
      )}
    </div>
  )
}

export default BloodTransactionHistory
