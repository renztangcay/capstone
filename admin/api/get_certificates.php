<?php
/**
 * Get Certificates API Endpoint
 * Fetches all certificates with 'paid' or 'issued' status
 * Returns: JSON array of certificates
 */

include __DIR__ . '/../includes/db.php';

header('Content-Type: application/json; charset=utf-8');

define('SUPABASE_URL',      'https://tkizkixcpfndytpkgfrd.supabase.co/rest/v1/');
define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0');

try {
    // Fetch certificates with 'paid' or 'issued' status
    $url = SUPABASE_URL . 'certificates?status=in.(paid,issued)&order=date_created.desc&limit=1000';

    $headers = implode("\r\n", [
        'apikey: '         . SUPABASE_ANON_KEY,
        'Authorization: Bearer ' . SUPABASE_ANON_KEY,
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

    $response = @file_get_contents($url, false, $context);

    // Check HTTP status code
    $httpCode = 0;
    if (isset($http_response_header) && is_array($http_response_header)) {
        if (preg_match('/HTTP\/\S+\s+(\d{3})/', $http_response_header[0], $m)) {
            $httpCode = (int)$m[1];
        }
    }

    if ($httpCode !== 200) {
        echo json_encode(['error' => 'Database query failed (HTTP ' . $httpCode . ')', 'detail' => $response]);
        exit;
    }

    $certificates = json_decode($response, true) ?? [];

    // Format certificates for the admin certificates table
    $formatted = [];
    foreach ($certificates as $cert) {
        $formatted[] = [
            'id'         => $cert['id'],
            'resident'   => $cert['resident_name'],
            'residentId' => $cert['resident_id'],
            'type'       => $cert['certificate_type'],
            'controlNo'  => $cert['control_number'],
            'date'       => $cert['date_created'],
            'status'     => $cert['status'],
            'orNo'       => $cert['or_number'],
            'amount'     => $cert['amount_paid'],
            'bcNo'       => $cert['bc_number'] ?? null,
            'issuedDate' => $cert['issued_date'],
            'paymentId'  => $cert['payment_id'],
        ];
    }

    echo json_encode($formatted);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}
?>
