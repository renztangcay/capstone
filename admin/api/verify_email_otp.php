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

$submitted = trim($input['otp'] ?? '');

if (empty($submitted) || !preg_match('/^\d{6}$/', $submitted)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid 6-digit code.']);
    exit;
}

$storedOtp    = $_SESSION['email_otp']        ?? '';
$storedExpiry = $_SESSION['email_otp_expiry'] ?? 0;

if (empty($storedOtp)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No OTP found. Please request a new code.']);
    exit;
}

if (time() > $storedExpiry) {
    unset($_SESSION['email_otp'], $_SESSION['email_otp_target'], $_SESSION['email_otp_expiry']);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'OTP has expired. Please request a new code.']);
    exit;
}

if (!hash_equals($storedOtp, $submitted)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Incorrect verification code. Please try again.']);
    exit;
}

// OTP is valid — clear it and mark 2FA as enabled
unset($_SESSION['email_otp'], $_SESSION['email_otp_expiry']);
$_SESSION['2fa_verified'] = true;
$email = $_SESSION['email_otp_target'] ?? '';
$_SESSION['2fa_email']    = $email;
unset($_SESSION['email_otp_target']);

// Write verified email to Supabase database
define('SUPABASE_URL',        'https://tkizkixcpfndytpkgfrd.supabase.co');
define('SUPABASE_ANON_KEY',   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0');

function supabase_patch(string $path, array $payload, string $key): array {
    $url  = SUPABASE_URL . $path;
    $body = json_encode($payload);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'PATCH',
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER     => [
                "apikey: $key",
                "Authorization: Bearer $key",
                "Content-Type: application/json",
                "Prefer: return=representation"
            ],
        ]);
        $resp   = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $ctx  = stream_context_create(['http' => [
            'method'        => 'PATCH',
            'header'        => "apikey: $key\r\nAuthorization: Bearer $key\r\nContent-Type: application/json\r\nPrefer: return=representation",
            'content'       => $body,
            'timeout'       => 15,
            'ignore_errors' => true,
        ], 'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
        $resp   = @file_get_contents($url, false, $ctx);
        $status = 0;
        foreach ($http_response_header ?? [] as $h) {
            if (preg_match('/HTTP\/\S+\s+(\d+)/', $h, $m)) { $status = (int)$m[1]; break; }
        }
    }
    return ['status' => $status, 'data' => json_decode($resp ?: '{}', true)];
}

$username = $_SESSION['username'] ?? '';
$recoveryCodes = [];

if (!empty($username) && !empty($email)) {
    // Generate 4 new recovery codes
    for ($i = 0; $i < 4; $i++) {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $part1 = '';
        $part2 = '';
        for ($j = 0; $j < 4; $j++) {
            $part1 .= $chars[rand(0, strlen($chars) - 1)];
            $part2 .= $chars[rand(0, strlen($chars) - 1)];
        }
        $recoveryCodes[] = $part1 . '-' . $part2;
    }
    
    $recoveryCodesStr = implode(',', $recoveryCodes);
    $encoded = urlencode($username);
    supabase_patch("/rest/v1/users?username=eq.{$encoded}", [
        'email' => $email,
        'recovery_codes' => $recoveryCodesStr
    ], SUPABASE_ANON_KEY);
}

echo json_encode([
    'success' => true,
    'message' => 'Email verified successfully. Two-Factor Authentication is now enabled.',
    'recovery_codes' => $recoveryCodes
]);
