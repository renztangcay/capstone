<?php
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json');

include __DIR__ . '/../includes/db.php';

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

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;

$otp             = trim($input['otp'] ?? '');
$newPassword     = $input['new_password'] ?? '';
$confirmPassword = $input['confirm_password'] ?? '';

$storedOtp      = $_SESSION['forgot_otp']      ?? '';
$storedUsername = $_SESSION['forgot_username'] ?? '';
$storedEmail    = $_SESSION['forgot_email']    ?? '';
$storedExpiry   = $_SESSION['forgot_expiry']   ?? 0;

if (empty($storedOtp) || empty($storedUsername)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No active password recovery session found. Please request a new code.']);
    exit;
}

if (time() > $storedExpiry) {
    unset($_SESSION['forgot_otp'], $_SESSION['forgot_username'], $_SESSION['forgot_email'], $_SESSION['forgot_expiry']);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Verification code has expired. Please request a new one.']);
    exit;
}

if (empty($otp)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter the 6-digit OTP code.']);
    exit;
}

if ($otp !== $storedOtp) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Incorrect OTP code. Please check your inbox.']);
    exit;
}

if (strlen($newPassword) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'New password must be at least 6 characters.']);
    exit;
}

if ($newPassword !== $confirmPassword) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Passwords do not match.']);
    exit;
}

// Hash password
$hashed = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);

// Update database in Supabase
$encodedUsername = urlencode($storedUsername);
$patchRes = supabase_patch("/rest/v1/users?username=eq.{$encodedUsername}", ['password_hash' => $hashed], SUPABASE_ANON_KEY);

if ($patchRes['status'] < 200 || $patchRes['status'] >= 300) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to update password in database.']);
    exit;
}

// Clear recovery session
unset($_SESSION['forgot_otp'], $_SESSION['forgot_username'], $_SESSION['forgot_email'], $_SESSION['forgot_expiry']);

echo json_encode(['success' => true, 'message' => 'Password reset successfully! You can now log in with your new password.']);
