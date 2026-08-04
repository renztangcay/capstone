<?php
/**
 * Backup Export API
 * Fetches all data from Supabase tables and returns as a single JSON payload
 * for client-side download.
 */

ob_start();
header('Content-Type: application/json; charset=utf-8');

$SUPABASE_URL     = 'https://tkizkixcpfndytpkgfrd.supabase.co/rest/v1/';
$SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0';

// Tables to back up
$tables = ['residents', 'households', 'certificates', 'treasurer_transactions', 'audit_logs'];

function supabase_fetch(string $table, string $baseUrl, string $apiKey): array {
    $url = $baseUrl . urlencode($table) . '?select=*';
    $headers = implode("\r\n", [
        'apikey: '         . $apiKey,
        'Authorization: Bearer ' . $apiKey,
        'Accept: application/json',
    ]);

    $context = stream_context_create([
        'http' => [
            'method'        => 'GET',
            'header'        => $headers,
            'timeout'       => 30,
            'ignore_errors' => true,
        ],
        'ssl'  => [
            'verify_peer'      => false,
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
    return ['code' => $code, 'body' => (string)$body];
}

try {
    $backup = [
        'meta' => [
            'barangay'   => 'Barangay Central',
            'created'    => date('c'),
            'version'    => '2.0',
            'label'      => isset($_GET['label']) ? $_GET['label'] : 'Manual Backup',
        ],
        'data' => [],
    ];

    foreach ($tables as $table) {
        $result = supabase_fetch($table, $SUPABASE_URL, $SUPABASE_ANON_KEY);
        if ($result['code'] >= 200 && $result['code'] < 300) {
            $rows = json_decode($result['body'], true);
            $backup['data'][$table] = is_array($rows) ? $rows : [];
        } else {
            $backup['data'][$table] = [];
            $backup['warnings'][] = "Failed to fetch table '$table': HTTP {$result['code']}";
        }
    }

    // Summary counts
    foreach ($tables as $table) {
        $backup['meta']['counts'][$table] = count($backup['data'][$table]);
    }

    ob_clean();
    echo json_encode($backup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;

} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['error' => 'Backup failed: ' . $e->getMessage()]);
    exit;
}
?>
