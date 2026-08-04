<?php 
include __DIR__ . '/../includes/db.php'; 

// Fetch current user details from Supabase to check 2FA status
define('SUPABASE_URL',        'https://tkizkixcpfndytpkgfrd.supabase.co');
define('SUPABASE_ANON_KEY',   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0');

$sessionUser = $_SESSION['username'] ?? '';
$userEmail = '';
$is2faActive = false;

$userRecoveryCodes = '';

if (!empty($sessionUser)) {
    $url = SUPABASE_URL . "/rest/v1/users?select=email,recovery_codes&username=eq." . urlencode($sessionUser) . "&limit=1";
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER     => [
                "apikey: " . SUPABASE_ANON_KEY,
                "Authorization: Bearer " . SUPABASE_ANON_KEY,
                "Accept: application/json",
            ],
        ]);
        $resp = curl_exec($ch);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => [
            'method'  => 'GET',
            'header'  => "apikey: " . SUPABASE_ANON_KEY . "\r\nAuthorization: Bearer " . SUPABASE_ANON_KEY . "\r\nAccept: application/json",
            'timeout' => 15,
        ], 'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
        $resp = @file_get_contents($url, false, $ctx);
    }
    
    $userData = json_decode($resp ?: '[]', true);
    if (!empty($userData[0]['email'])) {
        $userEmail = $userData[0]['email'];
        $is2faActive = true;
        $userRecoveryCodes = $userData[0]['recovery_codes'] ?? '';
        $_SESSION['2fa_email'] = $userEmail;
        $_SESSION['2fa_verified'] = true;
    } else {
        unset($_SESSION['2fa_email'], $_SESSION['2fa_verified']);
    }
}
?>
<style>

/* Settings & 2FA */
.settings-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.settings-section { background:var(--white); border:1px solid var(--border); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow); }
.toggle-switch { width: 52px; height: 28px; background: var(--border); border-radius: 14px; position: relative; cursor: pointer; transition: background 0.25s; flex-shrink: 0; }
.toggle-switch.on { background: var(--green); }
.toggle-slider { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; background: white; border-radius: 50%; transition: transform 0.25s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.toggle-switch.on .toggle-slider { transform: translateX(24px); }

</style>

      <div class="sec-head">
        <div class="sec-head-left"><h2>System Settings</h2><p>Configuration & account management</p></div>
      </div>
      <div class="settings-grid" style="margin-bottom:16px;">
        <div class="settings-section">
          <h4>👤 Account Details</h4>
          <div class="form-group"><label class="form-label">Username</label><input class="form-input" type="text" id="settingsUsername" value="<?php echo htmlspecialchars($_SESSION['username'] ?? 'admin', ENT_QUOTES, 'UTF-8'); ?>" placeholder="Enter username"></div>
          <div class="form-group"><label class="form-label">Current Password</label><div style="position:relative;"><input class="form-input" type="password" id="settingsCurrentPassword" placeholder="Enter current password" style="padding-right:36px;"><button type="button" onclick="toggleSettingsPw('settingsCurrentPassword','spIcon1')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#6b7280;font-size:1rem;padding:0;"><i class="bi bi-eye-slash" id="spIcon1"></i></button></div></div>
          <div class="form-group"><label class="form-label">New Password</label><div style="position:relative;"><input class="form-input" type="password" id="settingsNewPassword" placeholder="Enter new password" style="padding-right:36px;"><button type="button" onclick="toggleSettingsPw('settingsNewPassword','spIcon2')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#6b7280;font-size:1rem;padding:0;"><i class="bi bi-eye-slash" id="spIcon2"></i></button></div></div>
          <div class="form-group"><label class="form-label">Confirm New Password</label><div style="position:relative;"><input class="form-input" type="password" id="settingsConfirmPassword" placeholder="Re-enter new password" style="padding-right:36px;"><button type="button" onclick="toggleSettingsPw('settingsConfirmPassword','spIcon3')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#6b7280;font-size:1rem;padding:0;"><i class="bi bi-eye-slash" id="spIcon3"></i></button></div></div>
          <button class="btn btn-primary" onclick="updateAccountDetails()">Update Account Details</button>
          <div id="accountDetailsMessage" class="small mt-2"></div>
          
          <hr style="margin: 24px 0; border: none; border-top: 1px solid var(--border);">
          
          <div style="margin-top: 24px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <div>
                <div style="font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px;">🔐 Two-Factor Authentication (Email)</div>
                <div style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5;">Add an extra layer of security via Email OTP verification</div>
              </div>
              <div class="toggle-switch <?php echo $is2faActive ? 'on' : ''; ?>" id="twoFactorToggle" onclick="toggle2FA(this)">
                <div class="toggle-slider"></div>
              </div>
            </div>

            <!-- Setup Panel -->
            <div id="twoFactorSetup" style="display: none; background: var(--gold-dim); border: 1px solid rgba(200,168,75,0.2); border-radius: 8px; padding: 16px; margin-top: 12px;">
              <div style="font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 12px;">✉️ Setup Email Two-Factor Authentication</div>

              <div style="background: var(--white); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="font-size: 12.5px; font-weight: 600; color: var(--text); margin-bottom: 8px;">Step 1: Enter Your Email Address</div>
                <div class="form-group">
                  <label class="form-label">Email Address</label>
                  <div style="display: flex; gap: 8px;">
                    <input class="form-input" id="twoFactorEmail" type="email" placeholder="yourname@gmail.com" style="flex: 1;">
                    <button class="btn btn-primary btn-sm" onclick="sendEmailOTP()" style="white-space: nowrap;">✉ Send OTP</button>
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
                    💡 A 6-digit verification code will be sent to this email address.
                  </div>
                </div>
              </div>

              <div style="background: var(--white); border: 1px solid var(--border); border-radius: 8px; padding: 16px;">
                <div style="font-size: 12.5px; font-weight: 600; color: var(--text); margin-bottom: 8px;">Step 2: Enter Verification Code</div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">6-Digit OTP Code</label>
                  <input class="form-input" id="emailOtpCode" placeholder="Enter 6-digit code from email" maxlength="6" style="text-align: center; font-size: 20px; letter-spacing: 6px; font-weight: 600;">
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px; text-align: center;">
                    Didn't receive the code? <a href="#" onclick="sendEmailOTP(); return false;" style="color: var(--sky); text-decoration: none; font-weight: 600;">Resend Code</a>
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 8px; margin-top: 16px;">
                <button class="btn btn-outline" onclick="cancel2FASetup()" style="flex: 1;">Cancel</button>
                <button class="btn btn-gold" onclick="verifyEmailOTP()" style="flex: 1;">✓ Enable 2FA</button>
              </div>
            </div>

            <!-- Enabled Panel -->
            <div id="twoFactorEnabled" style="display: <?php echo $is2faActive ? 'block' : 'none'; ?>; background: var(--green-dim); border: 1px solid rgba(46,204,135,0.2); border-radius: 8px; padding: 16px; margin-top: 12px;">
              <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--green); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">✓</div>
                <div style="flex: 1;">
                  <div style="font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px;">Email Two-Factor Authentication is Active</div>
                  <div style="font-size: 12px; color: var(--text-mid); line-height: 1.5;">
                    Verification codes will be sent to: <span id="active2FAEmail" style="font-weight: 600; font-family: monospace;"><?php echo htmlspecialchars($userEmail); ?></span>
                  </div>
                </div>
              </div>

              <div style="background: var(--white); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <div style="font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 8px;">🔑 Recovery Codes</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.5;">Save these codes in a safe place. Use them if you lose access to your email.</div>
                <div id="recoveryCodesGrid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-family: monospace; font-size: 11px;">
                  <!-- Dynamically populated -->
                </div>
                <button class="btn btn-outline btn-sm" onclick="downloadRecoveryCodes()" style="width: 100%; margin-top: 8px;">⬇ Download Recovery Codes</button>
              </div>

              <div style="display: flex; gap: 8px;">
                <button class="btn btn-outline btn-sm" onclick="change2FAEmail()" style="flex: 1;">✉ Change Email</button>
                <button class="btn btn-outline btn-sm" onclick="regenerateRecoveryCodes()" style="flex: 1;">🔄 Regenerate Codes</button>
                <button class="btn btn-danger btn-sm" onclick="disable2FA()">✖ Disable 2FA</button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0;">📋 System Logs</h4>
            <div style="display: flex; gap: 8px;">
              <input type="date" id="sysLogDateFilter" class="form-control" style="width: auto; padding: 4px 10px; font-size: 13px;" onchange="renderSystemLogs()">
              <select id="sysLogFilter" class="form-control" style="width: auto; padding: 4px 10px; font-size: 13px;" onchange="renderSystemLogs()">
                <option value="all">All Logs</option>
                <option value="added">Added</option>
                <option value="modified">Modified</option>
                <option value="issued">Issued / Payments</option>
                <option value="system">System (Backup/Restore)</option>
                <option value="login">Login / Logout</option>
              </select>
            </div>
          </div>
          <div class="log-list" id="logList" style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
            <!-- Populated dynamically via JS -->
        </div>
      </div>

<script>
  window.recoveryCodesList = <?php echo json_encode(explode(',', $userRecoveryCodes ?: '')); ?>;
  window.is2faEnabled = <?php echo $is2faActive ? 'true' : 'false'; ?>;
  if (typeof renderRecoveryCodesGrid === 'function') {
    renderRecoveryCodesGrid();
  }

  function toggleSettingsPw(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);
    if (!input || !icon) return;
    const shown = input.type === 'text';
    input.type = shown ? 'password' : 'text';
    icon.className = shown ? 'bi bi-eye-slash' : 'bi bi-eye';
  }
</script>


