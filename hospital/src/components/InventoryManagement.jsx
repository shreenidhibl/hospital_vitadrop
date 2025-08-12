import React, { useState, useEffect } from 'react';
import './InventoryManagement.css';

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [editRow, setEditRow] = useState({ bloodGroup: '', type: '' });
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterType, setFilterType] = useState('all');
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


  // Extract blood groups and types from inventory
  const bloodGroups = Array.from(new Set(inventory.map(row => row.blood_group)));
  const bloodTypes = Array.from(new Set(inventory.map(row => row.component)));
  const hospitalIds = Array.from(new Set(inventory.map(row => row.hospital_id)));

  // Summary stats (robust RBC detection)
  const stats = React.useMemo(() => {
    let total = 0, plasma = 0, rbcs = 0, platelets = 0;
    const rbcKeywords = [
      'rbc', 'red blood cell', 'packed red blood cells', 'leukoreduced rbc', 'irradiated rbc', 'sagm packed red blood cells'
    ];
    inventory.forEach(row => {
      const value = parseInt(row.units_available);
      total += value;
      if (row.component.toLowerCase().includes('plasma')) plasma += value;
      if (rbcKeywords.some(k => row.component.toLowerCase().includes(k))) rbcs += value;
      if (row.component.toLowerCase().includes('platelet')) platelets += value;
    });
    return { total, plasma, rbcs, platelets };
  }, [inventory]);

  // Detailed table data (one row per unique blood_group, component, id)
  let tableData = inventory.map(row => ({
    bloodGroup: row.blood_group,
    type: row.component,
    value: parseInt(row.units_available),
    bloodGroupId: row.blood_group_id,
    componentId: row.component_id
  }));
  if (filterGroup !== 'all') tableData = tableData.filter(row => row.bloodGroup === filterGroup);
  if (filterType !== 'all') tableData = tableData.filter(row => row.type === filterType);


  const handleUpdate = (bloodGroup, type, bloodGroupId, componentId) => {
    setEditRow({ bloodGroup, type, bloodGroupId, componentId });
  };

  const handleChangeUnits = async (bloodGroup, type, bloodGroupId, componentId, delta) => {
    // Find the row
    const row = inventory.find(r => r.blood_group === bloodGroup && r.component === type && r.blood_group_id === String(bloodGroupId) && r.component_id === String(componentId));
    if (!row) return;
    const newValue = Math.max(0, parseInt(row.units_available) + delta);
    // Optimistically update UI
    setInventory(prev => prev.map(r =>
      r.blood_group === bloodGroup && r.component === type && r.blood_group_id === String(bloodGroupId) && r.component_id === String(componentId)
        ? { ...r, units_available: newValue.toString() }
        : r
    ));
    // Sync with backend
    try {
  await fetch('http://127.0.0.1:5050/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blood_group: bloodGroup,
          component: type,
          blood_group_id: bloodGroupId,
          component_id: componentId,
          units_available: newValue
        })
      });
      // Re-fetch inventory to sync filters and data
  const res = await fetch("http://127.0.0.1:5050/api/inventory");
      const data = await res.json();
      if (data.status === "success") {
        setInventory(data.inventory);
      }
    } catch (err) {
      // Optionally handle error (e.g., show notification)
    }
  };

  const handleDone = () => {
    setEditRow({ bloodGroup: '', type: '', bloodGroupId: '', componentId: '' });
  };

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <div className="title-section">
          <h1 className="inventory-title">Inventory Management</h1>
          <div className="title-underline"></div>
          <p className="heading-subtitle">Blood component stock levels</p>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Units</h3>
          <div className="summary-value total">{stats.total}</div>
          <p className="summary-label">All blood components</p>
        </div>
        <div className="summary-card">
          <h3>Plasma Units</h3>
          <div className="summary-value plasma">{stats.plasma}</div>
          <p className="summary-label">All plasma types</p>
        </div>
        <div className="summary-card">
          <h3>RBC Units</h3>
          <div className="summary-value rbcs">{stats.rbcs}</div>
          <p className="summary-label">All RBC types</p>
        </div>
        <div className="summary-card">
          <h3>Platelet Units</h3>
          <div className="summary-value platelets">{stats.platelets}</div>
          <p className="summary-label">All platelet types</p>
        </div>
      </div>
      {/* Filters */}
      <div className="filters-section">
        <select className="filter-select" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
          <option value="all">All Blood Groups</option>
          {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
        </select>
        <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Blood Types</option>
          {bloodTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
        </select>
      </div>
      <div className="table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Blood Group</th>
              <th>Component</th>
              <th>Units Available</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map(({ bloodGroup, type, value, bloodGroupId, componentId }) => (
              <tr key={`${bloodGroup}-${type}-${bloodGroupId}-${componentId}`}>
                <td>{bloodGroup}</td>
                <td>{type}</td>
                <td>
                  {editRow.bloodGroup === bloodGroup && editRow.type === type && editRow.bloodGroupId === bloodGroupId && editRow.componentId === componentId ? (
                    <>
                      <button
                        className="inventory-action-btn icon-btn"
                        onClick={() => handleChangeUnits(bloodGroup, type, bloodGroupId, componentId, -1)}
                        disabled={value <= 0}
                        aria-label="Decrease units"
                      >
                        −
                      </button>
                      <span style={{ margin: '0 8px', fontWeight: 600, fontSize: '1.1rem' }}>{value}</span>
                      <button
                        className="inventory-action-btn icon-btn"
                        onClick={() => handleChangeUnits(bloodGroup, type, bloodGroupId, componentId, 1)}
                        aria-label="Increase units"
                      >
                        +
                      </button>
                      <button
                        className="inventory-action-btn"
                        onClick={handleDone}
                        style={{ marginLeft: 8 }}
                      >
                        Done
                      </button>
                    </>
                  ) : (
                    <>
                      {value}
                    </>
                  )}
                </td>
                <td>
                  <span className={`status ${value < 5 ? 'low' : 'normal'}`}>
                    {value < 5 ? 'Low Stock' : 'Normal'}
                  </span>
                </td>
                <td>
                  {editRow.bloodGroup === bloodGroup && editRow.type === type && editRow.bloodGroupId === bloodGroupId && editRow.componentId === componentId ? null : (
                    <button
                      className="inventory-action-btn"
                      onClick={() => handleUpdate(bloodGroup, type, bloodGroupId, componentId)}
                    >
                      Update
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryManagement;