<?php
session_start();
include __DIR__ . '/../includes/db.php';

header('Content-Type: application/json');

if (empty($_SESSION['is_logged_in'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in first.']);
    exit;
}

define('SUPABASE_URL',        'https://tkizkixcpfndytpkgfrd.supabase.co');
define('SUPABASE_ANON_KEY',   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0');

// ── Helpers ───────────────────────────────────────────────────────────────────
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
                "Prefer: return=representation",
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
if (!is_array($input)) {
    $input = $_POST;
}

$username        = trim($input['username'] ?? '');
$currentPassword = (string)($input['currentPassword'] ?? '');
$newPassword     = (string)($input['newPassword'] ?? '');
$confirmPassword = (string)($input['confirmPassword'] ?? '');

$sessionUser = $_SESSION['username'] ?? '';

if ($username === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username is required.']);
    exit;
}

if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'All password fields are required to update account details.']);
    exit;
}

if (strlen($newPassword) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'New password must be at least 6 characters.']);
    exit;
}

if ($newPassword !== $confirmPassword) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'New password and confirmation do not match.']);
    exit;
}

// 1. Fetch current user from Supabase to verify password
$encodedUser = urlencode($sessionUser);
$userRes = supabase_get(
    "/rest/v1/users?select=username,password_hash,role&username=eq.{$encodedUser}&limit=1",
    SUPABASE_ANON_KEY
);

if ($userRes['status'] !== 200 || empty($userRes['data'][0])) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Active user not found in the database.']);
    exit;
}

$userData = $userRes['data'][0];

if (!password_verify($currentPassword, $userData['password_hash'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Current password is incorrect.']);
    exit;
}

// 2. Check if username is being changed, and if so, check if new username is unique
$payload = [];
if ($username !== $sessionUser) {
    $encodedNew = urlencode($username);
    $checkRes = supabase_get(
        "/rest/v1/users?select=username&username=eq.{$encodedNew}&limit=1",
        SUPABASE_ANON_KEY
    );
    if ($checkRes['status'] === 200 && !empty($checkRes['data'][0])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username is already taken by another user.']);
        exit;
    }
    $payload['username'] = $username;
}

// 3. Hash the new password and update in Supabase
$payload['password_hash'] = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);

$patchRes = supabase_patch(
    "/rest/v1/users?username=eq.{$encodedUser}",
    $payload,
    SUPABASE_ANON_KEY
);

if ($patchRes['status'] >= 200 && $patchRes['status'] < 300) {
    $_SESSION['username'] = $username;
    echo json_encode(['success' => true, 'message' => 'Account details updated successfully.', 'username' => $username]);
    exit;
}

http_response_code(500);
echo json_encode(['success' => false, 'message' => 'Failed to save changes to the database. Ensure UPDATE policy is configured in Supabase.']);
