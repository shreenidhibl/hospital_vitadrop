import React, { useState, useEffect } from "react";
import "./AnalyticsDashboard.css";

const StatsCard = ({ title, total, data, isHorizontal = false }) => {
  const maxValue = Math.max(...data.map(item => item.value));
  return (
    <div className="stats-card">
      <div className="stats-header">
        <h3>{title}</h3>
      </div>
      <div className="stats-total">
        <span className="total-label">Total</span>
        <span className="total-value">{total.toLocaleString()}</span>
      </div>
      <div className={`stats-chart ${isHorizontal ? 'horizontal' : 'vertical'}`}>
        {data.map((item, index) => (
          <div key={index} className="chart-item">
            <div className="chart-label">{item.type}</div>
            <div className="chart-bar-container">
              <div
                className="chart-bar"
                style={{
                  [isHorizontal ? 'width' : 'height']: `${(item.value / maxValue) * 100}%`
                }}
              ></div>
              <span className="chart-value">{item.value.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};



const AnalyticsDashboard = () => {
  // Blood group filter state
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("All");

  // Inventory state
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // Fetch inventory from backend
  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
  const res = await fetch("http://127.0.0.1:5050/api/inventory");
        const data = await res.json();
        if (data.status === "success") {
          setInventory(data.inventory);
          setError("");
        } else {
          setError(data.message || "Failed to load inventory");
        }
      } catch (err) {
        setError("Could not connect to backend");
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  // Extract blood groups and components from inventory
  const bloodGroups = ["All", ...Array.from(new Set(inventory.map(row => row.blood_group)))];
  const components = Array.from(new Set(inventory.map(row => row.component)));

  // Filtered data
  const filteredBloodData = bloodGroups.slice(1).map(bg => {
    const total = inventory
      .filter(row => row.blood_group === bg)
      .reduce((sum, row) => sum + parseInt(row.units_available), 0);
    return { type: bg, value: total };
  });
  const filteredComponentData = components.map(comp => {
    const total = inventory
      .filter(row => (selectedBloodGroup === "All" || row.blood_group === selectedBloodGroup) && row.component === comp)
      .reduce((sum, row) => sum + parseInt(row.units_available), 0);
    return { type: comp, value: total };
  });

  const totalBloodAvailability = selectedBloodGroup === "All"
    ? filteredBloodData.reduce((sum, item) => sum + item.value, 0)
    : filteredBloodData.find(item => item.type === selectedBloodGroup)?.value || 0;
  const totalComponentAvailability = filteredComponentData.reduce((sum, item) => sum + item.value, 0);

  if (loading) return <div className="analytics-dashboard"><p>Loading inventory...</p></div>;
  if (error) return <div className="analytics-dashboard"><p style={{color:'#e52d27'}}>{error}</p></div>;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2 className="analytics-heading">Today's Stats</h2>
        <div className="analytics-underline"></div>
        <p className="analytics-subhead">Real-time blood stock and component availability</p>
      </div>
      <div className="analytics-date-filter-row analytics-filter-gap">
        <span className="analytics-date-label">Blood Group:</span>
        <select
          className="analytics-date-input"
          value={selectedBloodGroup}
          onChange={e => setSelectedBloodGroup(e.target.value)}
        >
          {bloodGroups.map(bg => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>
      </div>
      <div className="analytics-summary-row">
        <div className="analytics-summary-card">
          <div className="analytics-summary-label">Units Collected Today</div>
          <div className="analytics-summary-value">18</div>
        </div>
        <div className="analytics-summary-card">
          <div className="analytics-summary-label">Units Given Away Today</div>
          <div className="analytics-summary-value">12</div>
        </div>
        <div className="analytics-summary-card">
          <div className="analytics-summary-label">Donors Donated Today</div>
          <div className="analytics-summary-value">7</div>
        </div>
        <div className="analytics-summary-card">
          <div className="analytics-summary-label">Donors Registered Today</div>
          <div className="analytics-summary-value">5</div>
        </div>
      </div>
      <div className="analytics-grid analytics-grid-center">
        <StatsCard 
          title="Today's Blood Availability"
          total={totalBloodAvailability}
          data={selectedBloodGroup === "All" ? filteredBloodData : filteredBloodData.filter(item => item.type === selectedBloodGroup)}
          isHorizontal={true}
        />
        <StatsCard 
          title="Today's Blood Component Availability"
          total={totalComponentAvailability}
          data={filteredComponentData}
          isHorizontal={true}
        />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
