<?php
/**
 * Get single certificate by id
 * GET param: id
 * Returns: JSON object for the certificate or 404
 */

include __DIR__ . '/../includes/db.php';
header('Content-Type: application/json; charset=utf-8');

define('SUPABASE_URL',      'https://tkizkixcpfndytpkgfrd.supabase.co/rest/v1/');
define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0');

$id = isset($_GET['id']) ? trim($_GET['id']) : '';
if ($id === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing id']);
    exit;
}

$url = SUPABASE_URL . 'certificates?id=eq.' . urlencode($id) . '&select=*';

$headers = implode("\r\n", [
    'apikey: ' . SUPABASE_ANON_KEY,
    'Authorization: Bearer ' . SUPABASE_ANON_KEY,
    'Accept: application/json',
]);

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => $headers,
        'timeout' => 15,
        'ignore_errors' => true,
    ],
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
    ],
]);

$body = @file_get_contents($url, false, $context);
$code = 0;
if (isset($http_response_header) && is_array($http_response_header)) {
    if (preg_match('/HTTP\/\S+\s+(\d{3})/', $http_response_header[0], $m)) {
        $code = (int)$m[1];
    }
}

if ($code < 200 || $code >= 300) {
    http_response_code(502);
    echo json_encode(['error' => 'Upstream fetch failed', 'detail' => $body]);
    exit;
}

$rows = json_decode($body, true);
if (!is_array($rows) || count($rows) === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
    exit;
}

// return the first row as object
echo json_encode($rows[0]);
exit;

?>
