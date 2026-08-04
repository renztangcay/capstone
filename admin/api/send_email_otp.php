<?php
if (session_status() === PHP_SESSION_NONE) session_start();

header('Content-Type: application/json');

if (empty($_SESSION['is_logged_in'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in first.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;

$email = trim($input['email'] ?? '');
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

// Generate 6-digit OTP and store in session
$otp = (string)rand(100000, 999999);
$_SESSION['email_otp']        = $otp;
$_SESSION['email_otp_target'] = $email;
$_SESSION['email_otp_expiry'] = time() + 600; // 10 minutes

// ── Gmail SMTP via cURL (no PHP SSL socket transport needed) ──────────────
define('GMAIL_USER', 'senpairenz556@gmail.com');
define('GMAIL_PASS', 'wdadpdzumekawyea');  // App Password (spaces stripped)
// ─────────────────────────────────────────────────────────────────────────

$fromName = 'Barangay Central Portal';
$subject  = 'Your 2FA Verification Code - Barangay Central';

$htmlBody = '<html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:30px;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:10px;padding:30px;border:1px solid #e0e0e0;">
    <h2 style="color:#1e3d59;text-align:center;margin-bottom:4px;">Barangay Central</h2>
    <p style="text-align:center;color:#888;font-size:13px;margin-top:0;">Admin Portal Security</p>
    <hr style="border:none;border-top:2px solid #c8a84b;margin:20px 0;">
    <p style="color:#333;">Hello,</p>
    <p style="color:#333;">Your Two-Factor Authentication (2FA) verification code is:</p>
    <div style="background:#f9f9f9;border:2px dashed #c8a84b;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
      <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#1e3d59;">' . $otp . '</span>
    </div>
    <p style="color:#666;font-size:13px;">&#9203; This code expires in <strong>10 minutes</strong>.</p>
    <p style="color:#999;font-size:12px;">If you did not request this, please ignore this email.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
    <p style="color:#bbb;font-size:11px;text-align:center;">Barangay Central Admin Portal &mdash; Automated Message</p>
  </div>
</body></html>';

// Build raw RFC 2822 email message for cURL SMTP upload
$date     = date('r');
$boundary = md5(uniqid());
$rawEmail  = "Date: {$date}\r\n";
$rawEmail .= "To: {$email}\r\n";
$rawEmail .= "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <" . GMAIL_USER . ">\r\n";
$rawEmail .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
$rawEmail .= "MIME-Version: 1.0\r\n";
$rawEmail .= "Content-Type: text/html; charset=UTF-8\r\n";
$rawEmail .= "\r\n";
$rawEmail .= $htmlBody;

// Use cURL SMTP (smtps:// = implicit SSL on port 465 — uses cURL's own SSL)
$pos = 0;
$ch  = curl_init('smtps://smtp.gmail.com:465');
curl_setopt_array($ch, [
    CURLOPT_MAIL_FROM      => '<' . GMAIL_USER . '>',
    CURLOPT_MAIL_RCPT      => ['<' . $email . '>'],
    CURLOPT_USERNAME       => GMAIL_USER,
    CURLOPT_PASSWORD       => GMAIL_PASS,
    CURLOPT_USE_SSL        => CURLUSESSL_ALL,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_UPLOAD         => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_VERBOSE        => false,
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_READFUNCTION   => function($ch, $fp, $length) use (&$rawEmail, &$pos) {
        $chunk = substr($rawEmail, $pos, $length);
        $pos  += strlen($chunk);
        return $chunk;
    },
    CURLOPT_INFILESIZE     => strlen($rawEmail),
]);

$result    = curl_exec($ch);
$curlError = curl_error($ch);
$curlErrNo = curl_errno($ch);
curl_close($ch);

if ($curlErrNo !== 0) {
    error_log('[OTP] Gmail SMTP cURL error: ' . $curlError);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to send OTP via Gmail. Error: ' . $curlError]);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Verification code sent to ' . $email . '. Please check your inbox.'
]);
