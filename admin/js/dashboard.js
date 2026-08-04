/**
 * DASHBOARD MODULE
 */

function initDashboard() {
  initCharts();
  updateDashboardStats();
}

function initCharts() {
  const gc = document.getElementById('genderChart');
  if (!gc || gc._chart) return;
  
  // Get theme-aware color for chart labels
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const labelColor = theme === 'dark' ? '#e2e8f0' : '#2c3e50';
  
  gc._chart = new Chart(gc.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Female', 'Male'],
      datasets: [{
        data: [0, 0],
        backgroundColor: ['rgba(200,168,75,0.8)', 'rgba(59,130,196,0.8)'],
        borderColor: ['#c8a84b', '#3b82c4'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, cutout: '62%',
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'Poppins', size: 12 }, padding: 14, color: labelColor } } }
    }
  });
}

function updateDashboardStats() {
  const residents = window.residents || [];
  const households = window.households || [];
  const certs = window.certificates || [];

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // Basic counts
  setVal('dash-hh-count', households.length);
  setVal('dash-total-residents', residents.length);
  setVal('dash-voters-count', residents.filter(r => r.cats && r.cats.includes('Voter')).length);
  setVal('dash-nonvoters-count', residents.filter(r => r.cats && r.cats.includes('Non-Voter')).length);
  setVal('dash-seniors-count', residents.filter(r => r.cats && r.cats.includes('Senior')).length);
  setVal('dash-pwd-count', residents.filter(r => r.cats && r.cats.includes('PWD')).length);
  setVal('dash-solo-count', residents.filter(r => r.cats && r.cats.includes('Single Parent')).length);

  // Certificate counts — show total issued certificates
  setVal('dash-issued-certs', certs.filter(c => c.status === 'issued').length);
}

function updateDashboardResidents() {
  // Ensure charts are initialized before attempting to update them
  try { initCharts(); } catch (e) { /* ignore if charts already initialized or init unavailable */ }
  const residents = window.residents || [];
  const female = residents.filter(r => (r.sex || '').toUpperCase() === 'F' || (r.sex || '').toLowerCase() === 'female').length;
  const male = residents.filter(r => (r.sex || '').toUpperCase() === 'M' || (r.sex || '').toLowerCase() === 'male').length;
  const gc = document.getElementById('genderChart');
  if (gc && gc._chart) {
    gc._chart.data.datasets[0].data = [female, male];
    gc._chart.update();
  }
  // also refresh other stats
  updateDashboardStats();
}

// Export for other modules
window.updateDashboardHouseholds = updateDashboardStats;
window.updateDashboardStats = updateDashboardStats;
window.updateDashboardResidents = updateDashboardResidents;

async function refreshDashboard() {
  const btn = document.getElementById('btn-refresh-dashboard');
  const originalHtml = btn ? btn.innerHTML : '🔄 Refresh';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '🔄 Refreshing...';
  }

  if (typeof showToast === 'function') showToast('Refreshing data...', 'info');

  try {
    const promises = [];
    if (typeof loadPaidCertificates === 'function') promises.push(loadPaidCertificates(true));
    if (typeof initResidents === 'function') promises.push(initResidents());
    if (typeof initHousehold === 'function') promises.push(initHousehold());

    await Promise.all(promises);

    updateDashboardResidents();
    if (typeof showToast === 'function') showToast('Dashboard updated!', 'success');
  } catch (e) {
    console.error('Error refreshing dashboard:', e);
    if (typeof showToast === 'function') showToast('Failed to refresh data.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}
window.refreshDashboard = refreshDashboard;
