// Reports & Export Module

function matchesResidentCategory(resident, category) {
  const cats = (resident.cats || []).map(c => String(c || '').trim().toLowerCase());
  const sex = String(resident.sex || '').trim().toLowerCase();

  switch (category) {
    case 'Voter':
      return cats.includes('voter');
    case 'Senior Citizen':
      return cats.includes('senior') || cats.includes('senior citizen');
    case 'PWD':
      return cats.includes('pwd');
    case 'Single Parent':
      return cats.includes('single parent');
    case 'Non-Voter':
      return cats.includes('non-voter');
    case 'Male':
      return sex === 'male' || sex.startsWith('m');
    case 'Female':
      return sex === 'female' || sex.startsWith('f');
    default:
      return true;
  }
}

function refreshResidentCategorySummary() {
  const summaryEl = document.getElementById('residentCategoryLiveSummary');
  if (!summaryEl) return;

  const category = document.getElementById('resReportCategory') ? document.getElementById('resReportCategory').value : '';
  const purok = document.getElementById('resReportPurok') ? document.getElementById('resReportPurok').value : '';
  const residents = (window.residents || []).filter(r => {
    if (purok && String(r.purok || '') !== purok) return false;
    return matchesResidentCategory(r, category);
  });

  const categoryLabel = category ? category : 'All categories';
  const purokLabel = purok ? ` in ${purok}` : '';
  summaryEl.textContent = `${residents.length} resident${residents.length === 1 ? '' : 's'} match ${categoryLabel.toLowerCase()}${purokLabel}`.trim();
}

function initResidentCategoryLiveUpdates() {
  const categorySelect = document.getElementById('resReportCategory');
  const purokSelect = document.getElementById('resReportPurok');

  if (!categorySelect && !purokSelect) return;

  if (window.__residentCategoryRefreshInterval) {
    clearInterval(window.__residentCategoryRefreshInterval);
  }

  const update = () => refreshResidentCategorySummary();
  update();
  window.__residentCategoryRefreshInterval = setInterval(update, 1000);

  [categorySelect, purokSelect].forEach(el => {
    if (el) {
      el.removeEventListener('change', update);
      el.addEventListener('change', update);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initResidentCategoryLiveUpdates);
} else {
  initResidentCategoryLiveUpdates();
}

function exportReportData(reportName, format, data, headers) {
  if (format === 'excel') {
    const csv = [headers.join(','), ...data.map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))].join('\n');
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    safeShowToast(`Generated ${reportName} Excel file.`, 'success');
  } else if (format === 'pdf') {
    // Generate an HTML table and use the browser's native print-to-PDF feature
    const printWindow = window.open('', '_blank');
    let tableHtml = `
      <html>
      <head>
        <title>${reportName}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; }
          h2 { text-align: center; color: #1a2a40; text-transform: uppercase; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
          th { background-color: #f4f6f9; color: #1a2a40; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #777; }
        </style>
      </head>
      <body>
        <h2>${reportName}</h2>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => `<tr>${row.map(cell => `<td>${cell !== null && cell !== undefined ? String(cell).replace(/\n/g, '<br>') : ''}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">Generated on ${new Date().toLocaleString()} &copy; Barangay Management System</div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(tableHtml);
    printWindow.document.close();
    safeShowToast(`Opening ${reportName} for PDF printing.`, 'success');
  } else {
    safeShowToast('Unsupported format: ' + format, 'error');
  }
}

function generateResidentsReport(format) {
  let resData = window.residents || [];
  const purokFilter = document.getElementById('resReportPurok') ? document.getElementById('resReportPurok').value : '';
  const reportName = purokFilter ? `Residents Report - ${purokFilter}` : 'Residents Report';

  if (purokFilter) {
    resData = resData.filter(r => r.purok === purokFilter);
  }

  const headers = ['Last', 'First', 'Middle', 'Suffix', 'DOB', 'Age', 'Sex', 'Purok', 'Categories', 'Registered', 'Status', 'Occupation', 'Contact'];
  const data = resData.map(r => {
    let registered = r.registered || '';
    if (registered) {
      try {
        const dt = new Date(registered);
        if (!isNaN(dt.getTime())) {
          registered = dt.toLocaleString('en-PH', {
            timeZone: 'Asia/Manila',
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true
          });
        }
      } catch (e) { }
    }
    return [r.last, r.first, r.mid, r.suffix, r.dob, r.age, r.sex, r.purok, (r.cats || []).join('|'), registered, r.status, r.occupation, r.contact];
  });

  exportReportData(reportName, format, data, headers);
}

function generateResidentCategoryReport(format) {
  let resData = window.residents || [];
  const categoryFilter = document.getElementById('resReportCategory') ? document.getElementById('resReportCategory').value : '';
  const reportName = categoryFilter ? `Resident Category Report - ${categoryFilter}` : 'Resident Category Report';

  if (categoryFilter) {
    resData = resData.filter(r => matchesResidentCategory(r, categoryFilter));
  }

  const headers = ['Last', 'First', 'Middle', 'Suffix', 'DOB', 'Age', 'Sex', 'Purok', 'Categories', 'Registered', 'Status', 'Occupation', 'Contact'];
  const data = resData.map(r => {
    let registered = r.registered || '';
    if (registered) {
      try {
        const dt = new Date(registered);
        if (!isNaN(dt.getTime())) {
          registered = dt.toLocaleString('en-PH', {
            timeZone: 'Asia/Manila',
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true
          });
        }
      } catch (e) { }
    }
    return [r.last, r.first, r.mid, r.suffix, r.dob, r.age, r.sex, r.purok, (r.cats || []).join('|'), registered, r.status, r.occupation, r.contact];
  });

  exportReportData(reportName, format, data, headers);
}

function generateReport(reportName, format) {
  // Determine which dataset to export based on report name
  let data = [];
  let headers = [];
  const name = reportName.toLowerCase();
  if (name.includes('population')) {
    // Population Report — demographic summary with toggles
    const residents = window.residents || [];
    const total = residents.length;

    const male = residents.filter(r => (r.sex || '').toLowerCase().startsWith('m')).length;
    const female = residents.filter(r => (r.sex || '').toLowerCase().startsWith('f')).length;
    const other = total - male - female;

    const ageGroup = (min, max) => residents.filter(r => {
      const a = parseInt(r.age, 10);
      return !isNaN(a) && a >= min && (max === null ? true : a <= max);
    }).length;

    const pwd = residents.filter(r => (r.cats || []).includes('PWD')).length;
    const solo = residents.filter(r => (r.cats || []).includes('Single Parent')).length;
    const voters = residents.filter(r => (r.cats || []).includes('Voter')).length;
    const nonVoters = residents.filter(r => (r.cats || []).includes('Non-Voter')).length;

    const incGender = document.getElementById('chkPopGender') ? document.getElementById('chkPopGender').checked : true;
    const incAge = document.getElementById('chkPopAge') ? document.getElementById('chkPopAge').checked : true;
    const incPWD = document.getElementById('chkPopPWD') ? document.getElementById('chkPopPWD').checked : true;
    const incSolo = document.getElementById('chkPopSolo') ? document.getElementById('chkPopSolo').checked : true;
    const incVoters = document.getElementById('chkPopVoters') ? document.getElementById('chkPopVoters').checked : true;
    const incNonVoters = document.getElementById('chkPopNonVoters') ? document.getElementById('chkPopNonVoters').checked : true;

    headers = ['Category', 'Count'];
    data = [];
    data.push(['Total Population', total]);

    if (incGender) {
      data.push(['', '']);
      data.push(['By Gender', '']);
      data.push(['Male', male]);
      data.push(['Female', female]);
      data.push(['Other / Unspecified', other]);
    }

    if (incAge) {
      data.push(['', '']);
      data.push(['By Age Group', '']);
      data.push(['Children (0-12)', ageGroup(0, 12)]);
      data.push(['Teenagers (13-17)', ageGroup(13, 17)]);
      data.push(['Adults (18-59)', ageGroup(18, 59)]);
      data.push(['Senior Citizens (60+)', ageGroup(60, null)]);
    }

    if (incPWD || incSolo || incVoters || incNonVoters) {
      data.push(['', '']);
      data.push(['Special Categories', '']);
      if (incPWD) data.push(['PWD', pwd]);
      if (incSolo) data.push(['Solo / Single Parent', solo]);
      if (incVoters) data.push(['Voters', voters]);
      if (incNonVoters) data.push(['Non-Voters', nonVoters]);
    }

  } else if (name.includes('resident') && name.includes('category')) {
    generateResidentCategoryReport(format);
    return;
  } else if (name.includes('resident')) {
    generateResidentsReport(format);
    return;
  } else if (name.includes('household')) {
    let hhData = window.households || [];
    const hhPurokFilter = document.getElementById('hhReportPurok') ? document.getElementById('hhReportPurok').value : '';
    if (hhPurokFilter) {
      hhData = hhData.filter(h => h.purok === hhPurokFilter);
      reportName += ` - ${hhPurokFilter}`;
    }
    data = hhData;
    headers = ['Head of Family', 'Address / Purok', 'Total Members', 'Member Names'];
    data = data.map(h => {
      let memberNames = [];
      try {
        const members = Array.isArray(h.members) ? h.members : JSON.parse(h.members || '[]');
        memberNames = members.map(m => {
          if (m.firstName || m.lastName) {
            return `${m.firstName || ''} ${m.lastName || ''}`.trim();
          }
          return '';
        }).filter(n => n.length > 0);
      } catch (e) { }

      const addressStr = [h.address, h.purok].filter(Boolean).join(', ');

      return [
        h.head || '—',
        addressStr,
        h.memberCount || memberNames.length || 0,
        memberNames.length > 0 ? memberNames.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'None listed'
      ];
    });
  } else if (name.includes('certificate') || name.includes('clearance')) {
    data = (window.certificates || []).filter(c => c.status === 'issued');

    const filterType = document.getElementById('certFilterTypeSelect') ? document.getElementById('certFilterTypeSelect').value : '';
    if (filterType) {
      // Match using keyword to handle different type string variants in the DB
      const ft = filterType.toLowerCase();
      if (ft.includes('clearance')) {
        data = data.filter(c => (c.type || '').toLowerCase().includes('clearance'));
        reportName = 'Barangay Clearance';
      } else if (ft.includes('residency')) {
        data = data.filter(c => (c.type || '').toLowerCase().includes('residency'));
        reportName = 'Certificate of Residency';
      } else if (ft.includes('indigency')) {
        data = data.filter(c => (c.type || '').toLowerCase().includes('indigency'));
        reportName = 'Certificate of Indigency';
      } else {
        data = data.filter(c => c.type === filterType);
        reportName = filterType;
      }
    }

    // Check which columns to include
    const incType = document.getElementById('chkCertType') ? document.getElementById('chkCertType').checked : true;
    const incDate = document.getElementById('chkCertDate') ? document.getElementById('chkCertDate').checked : true;
    const incTime = document.getElementById('chkCertTime') ? document.getElementById('chkCertTime').checked : true;
    const incPurpose = document.getElementById('chkCertPurpose') ? document.getElementById('chkCertPurpose').checked : true;

    headers = ['Control No'];
    if (incType) headers.push('Type');
    headers.push('Resident');
    if (incDate) headers.push('Date Issued');
    if (incTime) headers.push('Time Issued');
    headers.push('O.R. No', 'Amount', 'Status');
    if (incPurpose) headers.push('Purpose'); // Adding Purpose column

    data = data.map(c => {
      let savedPurpose = '';
      // Try parsing notes as JSON (new format)
      if (c.notes) {
        try {
          const nd = JSON.parse(c.notes);
          if (nd.purpose) savedPurpose = nd.purpose;
        } catch (e) {
          // Plain text notes (old format)
          savedPurpose = c.notes;
        }
      }
      if (!savedPurpose) savedPurpose = c.purpose || '';
      // Fallback to localStorage for old certificates
      if (!savedPurpose || savedPurpose.trim() === '') {
        savedPurpose = 'General';
        try {
          const saved = localStorage.getItem(`barangay_clearance_data_${c.id}`) || localStorage.getItem(`barangay_clearance_data_${c.controlNo}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.purpose) savedPurpose = parsed.purpose;
          }
        } catch (e) { }
      }

      const row = [c.controlNo || ''];
      if (incType) row.push(c.type || '');
      row.push(c.resident || '');
      if (incDate) row.push(c.issuedDate || c.date || '');

      if (incTime) {
        let timeStr = '—';
        const dateVal = c.date || c.issuedDate;
        if (dateVal) {
          try {
            const dt = new Date(dateVal);
            if (!isNaN(dt.getTime())) {
              timeStr = dt.toLocaleTimeString('en-PH', {
                timeZone: 'Asia/Manila',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              });
            }
          } catch (e) { }
        }
        row.push(timeStr);
      }

      row.push(c.orNo || '', c.amount || 0, c.status || '');
      if (incPurpose) row.push(savedPurpose); // Pull from localStorage if available
      return row;
    });
  } else {
    // Fallback: empty data
    data = [];
    headers = [];
  }

  exportReportData(reportName, format, data, headers);
}

function downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// Safe toast helper: uses existing global showToast if available, otherwise falls back to alert
function safeShowToast(message, type) {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}



function safeShowToast(message, type) {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}



