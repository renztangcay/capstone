<?php
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json');

if (empty($_SESSION['is_logged_in'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Please sign in first.']);
    exit;
}

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
if (!empty($username)) {
    $encoded = urlencode($username);
    supabase_patch("/rest/v1/users?username=eq.{$encoded}", ['email' => null, 'recovery_codes' => null], SUPABASE_ANON_KEY);
}

// Clear session variables
unset($_SESSION['2fa_verified'], $_SESSION['2fa_email']);

echo json_encode(['success' => true, 'message' => 'Email Two-Factor Authentication disabled.']);
