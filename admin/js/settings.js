// ══════════════════════════════════════════════════════
// TWO-FACTOR AUTHENTICATION (EMAIL OTP via Gmail SMTP)
// ══════════════════════════════════════════════════════

function toggle2FA(element) {
  element.classList.toggle('on');
  const isOn = element.classList.contains('on');
  localStorage.setItem('admin-2fa-enabled', isOn ? 'true' : 'false');
  const setupPanel = document.getElementById('twoFactorSetup');
  const enabledPanel = document.getElementById('twoFactorEnabled');

  if (isOn) {
    if (window.is2faEnabled) {
      setupPanel.style.display = 'none';
      enabledPanel.style.display = 'block';
    } else {
      setupPanel.style.display = 'block';
      enabledPanel.style.display = 'none';
    }
  } else {
    setupPanel.style.display = 'none';
    enabledPanel.style.display = 'none';
  }
}

function sendEmailOTP() {
  const email = document.getElementById('twoFactorEmail').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  showToast('Sending verification code...', 'info');

  fetch('api/send_email_otp.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP.');
      showToast(data.message || 'OTP sent! Check your inbox.', 'success');
      addLog('2FA OTP sent to ' + email, 'sky');
    })
    .catch((err) => showToast(err.message, 'error'));
}

function renderRecoveryCodesGrid() {
  const grid = document.getElementById('recoveryCodesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const codes = window.recoveryCodesList || [];
  if (codes.length === 0 || (codes.length === 1 && codes[0] === '')) {
    grid.innerHTML = '<div style="grid-column: span 2; text-align: center; color: var(--text-muted);">No codes available.</div>';
    return;
  }

  codes.forEach(code => {
    if (code.trim() === '') return;
    const div = document.createElement('div');
    div.style.cssText = 'background: var(--slate); padding: 6px 10px; border-radius: 4px; text-align: center;';
    div.textContent = code;
    grid.appendChild(div);
  });
}

function verifyEmailOTP() {
  const email = document.getElementById('twoFactorEmail').value.trim();
  const code = document.getElementById('emailOtpCode').value.trim();

  if (!email) { showToast('Email address is missing.', 'error'); return; }
  if (!code || code.length !== 6) { showToast('Please enter a valid 6-digit code.', 'error'); return; }

  fetch('api/verify_email_otp.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp: code })
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Verification failed.');

      window.recoveryCodesList = data.recovery_codes || [];
      renderRecoveryCodesGrid();

      document.getElementById('twoFactorSetup').style.display = 'none';
      document.getElementById('twoFactorEnabled').style.display = 'block';
      document.getElementById('active2FAEmail').textContent = email;
      document.getElementById('emailOtpCode').value = '';
      localStorage.setItem('admin-2fa-enabled', 'true');

      showToast('Email Two-Factor Authentication enabled!', 'success');
      addLog('Email Two-Factor Authentication enabled for ' + email, 'green');
    })
    .catch((err) => showToast(err.message, 'error'));
}

function cancel2FASetup() {
  const toggle = document.getElementById('twoFactorToggle');
  toggle.classList.remove('on');
  localStorage.setItem('admin-2fa-enabled', 'false');
  document.getElementById('twoFactorSetup').style.display = 'none';
  document.getElementById('twoFactorEmail').value = '';
  document.getElementById('emailOtpCode').value = '';
}

function disable2FA() {
  if (confirm('Are you sure you want to disable Email Two-Factor Authentication? This will make your account less secure.')) {
    fetch('api/disable_2fa.php', { method: 'POST' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to disable 2FA.');

        window.recoveryCodesList = [];
        renderRecoveryCodesGrid();

        const toggle = document.getElementById('twoFactorToggle');
        toggle.classList.remove('on');
        localStorage.setItem('admin-2fa-enabled', 'false');
        document.getElementById('twoFactorEnabled').style.display = 'none';
        showToast('Email Two-Factor Authentication disabled', 'info');
        addLog('Email Two-Factor Authentication disabled', 'amber');
      })
      .catch((err) => showToast(err.message, 'error'));
  }
}

function change2FAEmail() {
  if (confirm('Change your 2FA email? You will need to verify the new address.')) {
    document.getElementById('twoFactorEnabled').style.display = 'none';
    document.getElementById('twoFactorSetup').style.display = 'block';
    document.getElementById('twoFactorEmail').value = '';
    document.getElementById('emailOtpCode').value = '';
  }
}

function downloadRecoveryCodes() {
  const codesList = window.recoveryCodesList || [];
  if (codesList.length === 0 || (codesList.length === 1 && codesList[0] === '')) {
    showToast('No recovery codes to download.', 'error');
    return;
  }
  const codesFormatted = codesList.join('\n');
  const codes = 'Barangay Central - Email Two-Factor Authentication Recovery Codes\n\n' +
    codesFormatted + '\n\n' +
    'Keep these codes safe. Each code can only be used once.\n' +
    'Use these if you lose access to your email.\n' +
    'Generated: ' + new Date().toLocaleString();

  const blob = new Blob([codes], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'brgy-2fa-email-recovery-codes.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Recovery codes downloaded 💾', 'success');
}

function regenerateRecoveryCodes() {
  if (confirm('Generate new recovery codes? Your old codes will no longer work.')) {
    fetch('api/regenerate_recovery_codes.php', { method: 'POST' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to regenerate recovery codes.');

        window.recoveryCodesList = data.recovery_codes || [];
        renderRecoveryCodesGrid();
        showToast('New recovery codes generated! Please download them. 🔑', 'success');
        addLog('2FA Email recovery codes regenerated', 'amber');
      })
      .catch((err) => showToast(err.message, 'error'));
  }
}

// ══════════════════════════════════════════════════════
// ACCOUNT DETAILS
// ══════════════════════════════════════════════════════

function updateAccountDetails() {
  const username = document.getElementById('settingsUsername').value.trim();
  const currentPassword = document.getElementById('settingsCurrentPassword').value;
  const newPassword = document.getElementById('settingsNewPassword').value;
  const confirmPassword = document.getElementById('settingsConfirmPassword').value;
  const messageBox = document.getElementById('accountDetailsMessage');

  if (!username) {
    messageBox.innerHTML = '<span class="text-danger">Username is required.</span>';
    return;
  }

  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword) {
      messageBox.innerHTML = '<span class="text-danger">Current password is required to change your password.</span>';
      return;
    }
    if (newPassword.length < 6) {
      messageBox.innerHTML = '<span class="text-danger">New password must be at least 6 characters.</span>';
      return;
    }
    if (newPassword !== confirmPassword) {
      messageBox.innerHTML = '<span class="text-danger">New password and confirmation do not match.</span>';
      return;
    }
  }

  messageBox.innerHTML = '<span class="text-muted">Saving account details...</span>';

  fetch('api/update_account.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, currentPassword, newPassword, confirmPassword })
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Unable to update account details.');

      messageBox.innerHTML = '<span class="text-success">' + (data.message || 'Account details updated successfully.') + '</span>';
      showToast(data.message || 'Account details updated!', 'success');
      addLog('Account details updated for ' + username, 'green');

      document.getElementById('settingsCurrentPassword').value = '';
      document.getElementById('settingsNewPassword').value = '';
      document.getElementById('settingsConfirmPassword').value = '';
    })
    .catch((err) => {
      messageBox.innerHTML = '<span class="text-danger">' + err.message + '</span>';
      showToast(err.message, 'error');
    });
}

// ══════════════════════════════════════════════════════
// SYSTEM LOGS
// ══════════════════════════════════════════════════════

function addLog(text, color) {
  const ll = document.getElementById('logList'); if (!ll) return;
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<div class="log-dot" style="background:var(--${color})"></div><div><div class="log-text">${text}</div><div class="log-time">Today, ${now}</div></div>`;
  ll.insertBefore(entry, ll.firstChild);
}
