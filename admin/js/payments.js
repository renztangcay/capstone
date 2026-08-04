// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// (Payments module removed)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let payments = [
  {id:'PAY-003', resident:'Ana Dela Cruz', purpose:'Residency Certificate', amount:30, date:'2025-02-23', collector:'Fernando Cruz', status:'paid', proof:'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=600&fit=crop'},
  {id:'PAY-007', resident:'Pedro Gomez', purpose:'Business Clearance', amount:150, date:'2025-02-22', collector:'Fernando Cruz', status:'paid', proof:'https://picsum.photos/seed/receipt1/400/600'},
  {id:'PAY-001', resident:'Jose Reyes', purpose:'Barangay Clearance', amount:50, date:'2025-02-21', collector:'Noel Mendoza', status:'paid', proof:'https://picsum.photos/seed/receipt2/400/600'},
  {id:'PAY-002', resident:'Luisa Ramos', purpose:'Barangay Clearance', amount:50, date:'2025-02-20', collector:'â€”', status:'unpaid', proof:'https://picsum.photos/seed/receipt3/400/600'},
  {id:'PAY-006', resident:'Maria Santos', purpose:'Barangay Clearance', amount:50, date:'2025-02-19', collector:'Fernando Cruz', status:'paid', proof:'https://picsum.photos/seed/receipt4/400/600'},
  {id:'PAY-008', resident:'Ricardo Lim', purpose:'Residency Certificate', amount:30, date:'2025-02-18', collector:'Arlene Bautista', status:'paid', proof:'https://picsum.photos/seed/receipt5/400/600'},
];

function renderPayments() {
  const tb = document.getElementById('paymentsBody');
  if(!tb) return;
  const search = (document.getElementById('paySearch')?.value||'').toLowerCase();
  const statusF = document.getElementById('payStatusFilter')?.value||'';
  const dateFrom = document.getElementById('payDateFrom')?.value||'';
  const dateTo = document.getElementById('payDateTo')?.value||'';
  let list = payments;
  if(search) list = list.filter(p=>p.resident.toLowerCase().includes(search)||p.id.toLowerCase().includes(search)||p.purpose.toLowerCase().includes(search));
  if(statusF) list = list.filter(p=>p.status===statusF);
  if(dateFrom) list = list.filter(p=>p.date>=dateFrom);
  if(dateTo) list = list.filter(p=>p.date<=dateTo);
  tb.innerHTML = list.map(p=>`
    <tr>
      <td data-label="Receipt No."><code style="color:${p.status==='paid'?'var(--gold)':'var(--amber)'};font-weight:600;font-size:12px">${p.id}</code></td>
      <td data-label="Resident">${p.resident}</td>
      <td data-label="Purpose">${p.purpose}</td>
      <td data-label="Amount"><strong style="color:${p.status==='paid'?'var(--green)':'var(--amber)'}">â‚±${p.amount}${p.status==='unpaid'?' (Unpaid)':''}</strong></td>
      <td data-label="Date">${formatPayDate(p.date)}</td>
      <td data-label="Received By">${p.collector}</td>
      <td data-label="Status"><span class="badge badge-${p.status==='paid'?'approved':'pending'}">${p.status==='paid'?'Paid':'Unpaid'}</span></td>
    </tr>
  `).join('')||`<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">No records found.</td></tr>`;
  updatePaymentStats();
}

function formatPayDate(d) {
  if(!d) return 'â€”';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

function updatePaymentStats() {
  const paid = payments.filter(p=>p.status==='paid');
  const unpaid = payments.filter(p=>p.status==='unpaid');
  const total = paid.reduce((s,p)=>s+p.amount,0);
  const outstanding = unpaid.reduce((s,p)=>s+p.amount,0);
  const el1=document.getElementById('payTotalAmt'); if(el1) el1.textContent='â‚±'+total.toLocaleString();
  const el2=document.getElementById('payUnpaidAmt'); if(el2) el2.textContent='â‚±'+outstanding.toLocaleString();
  const el3=document.getElementById('payReceiptsAmt'); if(el3) el3.textContent=paid.length;
  const el4=document.getElementById('payTotalNote'); if(el4) el4.textContent=paid.length+' receipts issued';
  const el5=document.getElementById('payUnpaidNote'); if(el5) el5.textContent=unpaid.length+' unpaid requests';
}

function filterPaymentsBy(type) {
  const sf = document.getElementById('payStatusFilter');
  if(sf) sf.value = type==='unpaid'?'unpaid':'';
  renderPayments();
}

function printReceipt(id) { showToast(`Printing receipt ${id}â€¦`,'info'); }

function collectPayment(id) {
  const p = payments.find(x=>x.id===id);
  if(!p) return;
  if(confirm(`Mark â‚±${p.amount} from ${p.resident} as paid?`)) {
    p.status='paid'; p.collector='Fernando Cruz';
    renderPayments();
    showToast(`Payment collected for ${p.resident}!`,'success');
  }
}

function deletePayment(id) {
  if(confirm('Delete this payment record?')) {
    const i = payments.findIndex(x=>x.id===id);
    if(i>-1) payments.splice(i,1);
    renderPayments();
    showToast('Payment record deleted.','info');
  }
}

function viewProofOfPayment(id) {
  const p = payments.find(x => x.id === id);
  if (!p) return;
  
  // Populate payment details with grid layout
  const details = document.getElementById('proofPaymentDetails');
  details.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Receipt Number</div>
        <div style="font-weight:600;color:var(--text)">${p.id}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Resident</div>
        <div style="font-weight:600;color:var(--text)">${p.resident}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Purpose</div>
        <div style="font-weight:500;color:var(--text)">${p.purpose}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Amount</div>
        <div style="font-weight:700;color:var(--green);font-size:16px">â‚±${p.amount.toLocaleString()}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Received By</div>
        <div style="font-weight:600;color:var(--text)">${p.collector}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Date</div>
        <div style="font-weight:500;color:var(--text)">${formatPayDate(p.date)}</div>
      </div>
    </div>
  `;
  
  // Show or hide proof image
  const proofImg = document.getElementById('proofImg');
  const noProofMsg = document.getElementById('noProofMessage');
  const proofImgContainer = document.getElementById('proofPaymentImage');
  
  if (p.proof) {
    proofImg.src = p.proof;
    proofImg.alt = `Payment proof for ${p.id}`;
    proofImgContainer.style.display = 'inline-block';
    noProofMsg.style.display = 'none';
  } else {
    proofImgContainer.style.display = 'none';
    noProofMsg.style.display = 'block';
  }
  
  // Store current payment ID for download function
  window.currentProofPaymentId = id;
  
  openModal('modal-proof-payment');
}

function downloadProof() {
  const id = window.currentProofPaymentId;
  if (!id) return;
  const p = payments.find(x => x.id === id);
  if (!p || !p.proof) {
    showToast('No proof of payment available to download', 'error');
    return;
  }
  
  // Download the proof image
  const link = document.createElement('a');
  link.href = p.proof;
  link.download = `proof_${id}_${p.resident.replace(/\s+/g,'_')}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast(`Downloading proof of payment for ${id}...`, 'success');
}

function exportPayments() { showToast('Exporting payment ledgerâ€¦','info'); }

function saveGcashNumber() {
  const num = document.getElementById('gcashNumber').value.trim();
  const conf = document.getElementById('gcashNumberConfirm').value.trim();
  const name = document.getElementById('gcashName').value.trim()||gcashAccountName;
  if(!num||num.length<10) { showToast('Please enter a valid GCash number.','error'); return; }
  if(num!==conf) { showToast('GCash numbers do not match.','error'); return; }
  gcashNumber=num; gcashAccountName=name;
  const disp=document.getElementById('gcashDisplay');
  if(disp) disp.innerHTML=`<strong>${gcashNumber}</strong> &nbsp;<span style="font-size:12px;color:var(--text-muted);font-weight:400;">(${gcashAccountName})</span>`;
  const curDisp=document.getElementById('currentGcashDisplay');
  if(curDisp) curDisp.textContent=gcashNumber;
  closeModal('modal-gcash');
  showToast('GCash number updated successfully!','success');
  document.getElementById('gcashNumber').value='';
  document.getElementById('gcashNumberConfirm').value='';
}

