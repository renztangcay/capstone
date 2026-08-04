/* Minimal Supabase REST helper using provided REST endpoint and anon key */
(function () {
  const SUPABASE_URL = 'https://tkizkixcpfndytpkgfrd.supabase.co/rest/v1/';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0';

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json'
  };

  async function safeParseJson(res) {
    const txt = await res.text();
    if (!txt) return null;
    try { return JSON.parse(txt); } catch (e) { return txt; }
  }

  // ---- Audit Log Helper ----
  // Saves log to both Supabase (persistent) and localStorage (fast fallback)
  async function saveAuditLog(entry) {
    // Save to localStorage for immediate display
    try {
      const localLogs = JSON.parse(localStorage.getItem('bms_local_logs') || '[]');
      localLogs.push(entry);
      localStorage.setItem('bms_local_logs', JSON.stringify(localLogs.slice(-50)));
    } catch (e) { /* ignore */ }

    // Save to Supabase audit_logs table (persistent across browsers)
    try {
      const url = `${SUPABASE_URL}audit_logs`;
      const h = Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }, headers);
      await fetch(url, {
        method: 'POST', headers: h, body: JSON.stringify({
          record_table: entry.table,
          record_id: String(entry.id || ''),
          action_type: entry.type,
          fields: entry.fields || null,
          record_name: entry.name || null,
          performed_by: entry.user || 'Admin'
        })
      });
    } catch (e) { console.warn('Audit log save failed:', e); }
  }

  async function select(table, params = 'select=*') {
    const url = `${SUPABASE_URL}${encodeURIComponent(table)}?${params}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Supabase select error: ' + res.status + ' ' + await res.text());
    return await safeParseJson(res);
  }

  async function insert(table, payload) {
    const url = `${SUPABASE_URL}${encodeURIComponent(table)}`;
    const h = Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=representation' }, headers);
    const res = await fetch(url, { method: 'POST', headers: h, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Supabase insert error: ' + res.status + ' ' + await res.text());

    const parsedRes = await safeParseJson(res);

    // Track additions for system logs
    try {
      if (['residents', 'households'].includes(table)) {
        const currentUser = (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim();

        // Supabase may return an array or single object
        const inserted = Array.isArray(parsedRes) ? parsedRes[0] : parsedRes;
        const insertedId = inserted?.id || null;

        // Store name for display
        let recordName = '';
        if (table === 'households') recordName = payload.head || '';
        if (table === 'residents') recordName = `${payload.first || ''} ${payload.last || ''}`.trim();

        if (insertedId) {
          await saveAuditLog({
            table: table,
            id: insertedId,
            time: new Date().toISOString(),
            type: 'added',
            user: currentUser,
            name: recordName
          });
        }
      }
    } catch (e) { /* ignore */ }

    return parsedRes;
  }

  async function update(table, idField, idValue, payload) {
    // idField e.g. id, use eq filter
    const url = `${SUPABASE_URL}${encodeURIComponent(table)}?${encodeURIComponent(idField)}=eq.${encodeURIComponent(idValue)}`;
    const h = Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=representation' }, headers);

    // Track modifications for system logs
    try {
      if (['residents', 'households', 'officials'].includes(table)) {
        // Map DB field names to human-readable labels
        const fieldLabels = {
          first: 'First Name', last: 'Last Name', mid: 'Middle Name', suffix: 'Suffix',
          dob: 'Date of Birth', sex: 'Sex', address: 'Address', purok: 'Purok',
          pob: 'Place of Birth', civilstatus: 'Civil Status', civilStatus: 'Civil Status',
          religion: 'Religion', citizenship: 'Citizenship', occupation: 'Occupation',
          contact: 'Contact', email: 'Email', philsys: 'PhilSys ID',
          cats: 'Categories', education: 'Education', status: 'Status',
          head: 'Household Head', household_head: 'Household Head', members: 'Members',
          membercount: 'Member Count', name: 'Name', first_name: 'First Name',
          role: 'Role', position: 'Position', term: 'Term'
        };
        const changedFields = Object.keys(payload)
          .filter(k => k !== 'id' && k !== '_memberChanges')
          .map(k => {
            const label = fieldLabels[k] || k;
            let val = payload[k];

            if (k === 'members') {
              return `${label} - (${payload._memberChanges || 'List Updated'})`;
            }

            // Format arrays nicely
            if (Array.isArray(val)) val = val.join(', ');
            // Truncate long values
            if (typeof val === 'string' && val.length > 40) val = val.substring(0, 40) + '…';
            return `${label} - ${val}`;
          })
          .join(', ');

        // Get current user from sidebar
        const currentUser = (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim();

        // Lookup the actual record name so it persists in the database log
        let recordName = '';
        if (table === 'residents' && window.residents) {
          const r = window.residents.find(x => String(x.id) === String(idValue));
          if (r) recordName = `${r.first || ''} ${r.last || ''}`.trim();
        } else if (table === 'households' && window.households) {
          const h = window.households.find(x => String(x.id) === String(idValue));
          if (h) recordName = h.head || h.household_head || '';
        } else if (table === 'officials' && window.officials) {
          const o = window.officials.find(x => String(x.id) === String(idValue) || String(x.name) === String(idValue));
          if (o) recordName = o.first_name || o.name || '';
        }

        await saveAuditLog({
          table: table,
          id: idValue,
          time: new Date().toISOString(),
          type: 'modified',
          fields: changedFields,
          user: currentUser,
          name: recordName
        });
      }
    } catch (e) { /* ignore */ }

    // Strip custom local logging fields before sending to database
    if (payload && payload.hasOwnProperty('_memberChanges')) {
      delete payload._memberChanges;
    }

    const res = await fetch(url, { method: 'PATCH', headers: h, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Supabase update error: ' + res.status + ' ' + await res.text());
    return await safeParseJson(res);
  }

  async function del(table, idField, idValue) {
    const url = `${SUPABASE_URL}${encodeURIComponent(table)}?${encodeURIComponent(idField)}=eq.${encodeURIComponent(idValue)}`;
    const h = Object.assign({ Prefer: 'return=representation' }, headers);
    const res = await fetch(url, { method: 'DELETE', headers: h });
    if (!res.ok) throw new Error('Supabase delete error: ' + res.status + ' ' + await res.text());
    return await safeParseJson(res);
  }

  window.supabaseClient = { select, insert, update, del };
})();
