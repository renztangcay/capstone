<?php
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json');

include __DIR__ . '/../includes/db.php';

define('SUPABASE_URL',        'https://tkizkixcpfndytpkgfrd.supabase.co');
define('SUPABASE_ANON_KEY',   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0');

function supabase_get(string $path, string $key): array {
    $url = SUPABASE_URL . $path;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER     => [
                "apikey: $key",
                "Authorization: Bearer $key",
                "Accept: application/json",
            ],
        ]);
        $resp   = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $ctx  = stream_context_create(['http' => [
            'method'        => 'GET',
            'header'        => "apikey: $key\r\nAuthorization: Bearer $key\r\nAccept: application/json",
            'timeout'       => 15,
            'ignore_errors' => true,
        ], 'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
        $resp   = @file_get_contents($url, false, $ctx);
        $status = 0;
        foreach ($http_response_header ?? [] as $h) {
            if (preg_match('/HTTP\/\S+\s+(\d+)/', $h, $m)) { $status = (int)$m[1]; break; }
        }
    }
    return ['status' => $status, 'data' => json_decode($resp ?: '[]', true)];
}

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

$username        = trim($input['username'] ?? '');
$recoveryCode    = strtoupper(trim($input['recovery_code'] ?? ''));
$newPassword     = $input['new_password'] ?? '';
$confirmPassword = $input['confirm_password'] ?? '';

if (empty($username) || empty($recoveryCode)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username and recovery code are required.']);
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

// Check database for recovery codes
$encodedUsername = urlencode($username);
$res = supabase_get("/rest/v1/users?select=recovery_codes&username=eq.{$encodedUsername}&limit=1", SUPABASE_ANON_KEY);

if ($res['status'] !== 200 || empty($res['data'])) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Username not found.']);
    exit;
}

$dbCodesStr = $res['data'][0]['recovery_codes'] ?? '';
$dbCodes = array_filter(array_map('trim', explode(',', $dbCodesStr)));

// Search for matching recovery code
$foundIndex = array_search($recoveryCode, $dbCodes);

if ($foundIndex === false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid recovery code. Please try again.']);
    exit;
}

// Remove matched code
unset($dbCodes[$foundIndex]);
$updatedCodesStr = implode(',', $dbCodes);

// Hash new password
$hashed = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);

// Update database: save hashed password and updated recovery codes list
$patchRes = supabase_patch("/rest/v1/users?username=eq.{$encodedUsername}", [
    'password_hash' => $hashed,
    'recovery_codes' => $updatedCodesStr
], SUPABASE_ANON_KEY);

if ($patchRes['status'] < 200 || $patchRes['status'] >= 300) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to update database.']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Password reset successfully! Recovery code has been consumed. You can now log in.']);
