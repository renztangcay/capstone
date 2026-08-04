<?php
/**
 * Update Certificate API Endpoint
 * Allows updating certificate records only if the certificate type
 * is Certificate of Residency. Rejects updates to other certificate types.
 * Expects JSON POST: { id: <id>, payload: { ...fields to update... } }
 */

// Buffer output to keep JSON responses clean
ob_start();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_clean();
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = file_get_contents('php://input');
$data  = json_decode($input, true);
if (!is_array($data) || empty($data['id']) || !isset($data['payload'])) {
    ob_clean();
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input. Expecting JSON with "id" and "payload".']);
    exit;
}

$id = $data['id'];
$payload = $data['payload'];

$SUPABASE_URL     = 'https://tkizkixcpfndytpkgfrd.supabase.co/rest/v1/';
$SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0';

function supabase_get_fg(string $url, string $apiKey): array {
    $headers = implode("\r\n", [
        'apikey: '         . $apiKey,
        'Authorization: Bearer ' . $apiKey,
        'Accept: application/json',
    ]);

    $context = stream_context_create([
        'http' => [
            'method'        => 'GET',
            'header'        => $headers,
            'timeout'       => 15,
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

function supabase_patch_fg(string $url, array $payload, string $apiKey): array {
    $headers = implode("\r\n", [
        'apikey: '         . $apiKey,
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
        'Prefer: return=representation',
    ]);

    $context = stream_context_create([
        'http' => [
            'method'        => 'PATCH',
            'header'        => $headers,
            'content'       => json_encode($payload),
            'timeout'       => 15,
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
    // Fetch the existing certificate to check its type
    $getUrl = $SUPABASE_URL . 'certificates?id=eq.' . urlencode($id) . '&select=certificate_type';
    $getRes = supabase_get_fg($getUrl, $SUPABASE_ANON_KEY);
    if ($getRes['code'] < 200 || $getRes['code'] >= 300) {
        ob_clean();
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch certificate (HTTP ' . $getRes['code'] . ')', 'detail' => $getRes['body']]);
        exit;
    }

    $rows = json_decode($getRes['body'], true);
    if (!is_array($rows) || count($rows) === 0) {
        ob_clean();
        http_response_code(404);
        echo json_encode(['error' => 'Certificate not found']);
        exit;
    }

    $certType = strtolower((string)($rows[0]['certificate_type'] ?? ''));

    // Allow issuance updates (control_number/status/issued_date) plus common issuance fields
    // (resident_name, purpose, bc_number, ctc_number, ctc_amount, amount_paid, or_number, address, cert_extra)
    // for any certificate type. Other arbitrary updates remain restricted to Residency certificates.
    $payloadKeys = array_keys($payload);
    $allowedIssueKeys = [
        'control_number', 'status', 'issued_date', 'issued_by',
        'resident_name', 'purpose', 'bc_number', 'ctc_number', 'ctc_amount', 'amount_paid', 'or_number', 'address', 'cert_extra'
    ];

    // Check that every provided payload key is in the allowedIssueKeys set
    $isIssueOnly = true;
    foreach ($payloadKeys as $k) {
        if (!in_array($k, $allowedIssueKeys, true)) { $isIssueOnly = false; break; }
    }

    if (!$isIssueOnly) {
        if (strpos($certType, 'residency') === false && strpos($certType, 'residenc') === false) {
            ob_clean();
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: only Certificate of Residency may be updated via this endpoint']);
            exit;
        }
    }

    // Proceed to PATCH the certificate
    $patchUrl = $SUPABASE_URL . 'certificates?id=eq.' . urlencode($id);
    $patchRes = supabase_patch_fg($patchUrl, $payload, $SUPABASE_ANON_KEY);
    if ($patchRes['code'] < 200 || $patchRes['code'] >= 300) {
        ob_clean();
        http_response_code(500);
        echo json_encode(['error' => 'Update failed (HTTP ' . $patchRes['code'] . ')', 'detail' => $patchRes['body']]);
        exit;
    }

    $updated = json_decode($patchRes['body'], true);
    ob_clean();
    echo json_encode(['success' => true, 'updated' => $updated]);
    exit;

} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit;
}

?>
