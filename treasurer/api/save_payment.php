<?php
/**
 * Save Payment API Endpoint
 * Saves payment details and automatically creates a certificate record
 * Returns: JSON with success/error status and payment ID
 */

// Buffer all output so PHP warnings/notices don't corrupt the JSON response
ob_start();

// Catch fatal errors and always return JSON
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        ob_clean();
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'PHP fatal error: ' . $err['message']]);
    }
});

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_clean();
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Read and decode JSON body
$input = file_get_contents('php://input');
$data  = json_decode($input, true);

if (!$data) {
    ob_clean();
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit;
}

// Validate required fields
$required = ['resident_id', 'resident_name', 'certificate_type', 'or_number'];
foreach ($required as $field) {
    if (!isset($data[$field]) || trim((string)$data[$field]) === '') {
        ob_clean();
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit;
    }
}

$SUPABASE_URL     = 'https://tkizkixcpfndytpkgfrd.supabase.co/rest/v1/';
$SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0';

/**
 * POST data to Supabase using file_get_contents.
 * Returns ['code' => int, 'body' => string].
 */
function supabase_post_fg(string $url, array $payload, string $apiKey): array {
    $headers = implode("\r\n", [
        'apikey: '         . $apiKey,
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
        'Prefer: return=representation',
    ]);

    $context = stream_context_create([
        'http' => [
            'method'        => 'POST',
            'header'        => $headers,
            'content'       => json_encode($payload),
            'timeout'       => 15,
            'ignore_errors' => true,   // don't throw on 4xx/5xx; still returns body
        ],
        'ssl'  => [
            'verify_peer'      => false,
            'verify_peer_name' => false,
        ],
    ]);

    $body = @file_get_contents($url, false, $context);

    // Parse HTTP status code from the response headers PHP sets automatically
    $code = 0;
    if (isset($http_response_header) && is_array($http_response_header)) {
        if (preg_match('/HTTP\/\S+\s+(\d{3})/', $http_response_header[0], $m)) {
            $code = (int)$m[1];
        }
    }

    return ['code' => $code, 'body' => (string)$body];
}

try {
    $certType = $data['certificate_type'];

    // Map short form values to full display names stored in DB
    $certTypeMap = [
        'Clearance' => 'Barangay Clearance',
        'Residency' => 'Certificate of Residency',
        'Indigency' => 'Certificate of Indigency',
    ];
    $certTypeDisplay = $certTypeMap[$certType] ?? $certType;

    // Generate control number
    $prefixMap = [
        'Clearance' => 'BC',
        'Indigency' => 'IN',
        'Residency' => 'RES',
    ];
    $typePrefix = $prefixMap[$certType] ?? 'CERT';
    $controlNo  = $typePrefix . '-' . date('Y') . '-' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT);

    // ── Payment payload (columns that exist in the payments table) ──────────
    $paymentPayload = [
        'resident_id'      => (int)$data['resident_id'],
        'resident_name'    => $data['resident_name'],
        'certificate_type' => $certTypeDisplay,
        'or_number'        => $data['or_number'],
        'amount'           => isset($data['amount'])     ? (float)$data['amount']     : 0,
        'ctc_number'       => $data['ctc_number']        ?? null,
        'ctc_amount'       => isset($data['ctc_amount']) ? (float)$data['ctc_amount'] : 0,
        'bc_number'        => $data['bc_number']         ?? null,
        'payment_date'     => $data['date']              ?? date('Y-m-d'),
        'status'           => 'paid',
        // created_at is auto-set by Postgres DEFAULT now()
    ];

    // ── Certificate payload (columns that exist in the certificates table) ──
    $certificatePayload = [
        'resident_id'      => (int)$data['resident_id'],
        'resident_name'    => $data['resident_name'],
        'certificate_type' => $certTypeDisplay,
        'control_number'   => $controlNo,
        'or_number'        => $data['or_number'],
        'amount_paid'      => isset($data['amount']) ? (float)$data['amount'] : 0,
        'status'           => 'paid',
        'issued_date'      => null,
        // date_created is auto-set by Postgres DEFAULT now()
    ];

    if (!empty($data['bc_number'])) {
        $certificatePayload['bc_number'] = $data['bc_number'];
    }

    // ── Save payment ─────────────────────────────────────────────────────────
    $paymentResult = supabase_post_fg($SUPABASE_URL . 'payments', $paymentPayload, $SUPABASE_ANON_KEY);

    $paymentId = null;
    if ($paymentResult['code'] >= 200 && $paymentResult['code'] < 300) {
        $paymentRecord = json_decode($paymentResult['body'], true);
        if (is_array($paymentRecord) && !empty($paymentRecord[0]['id'])) {
            $paymentId = $paymentRecord[0]['id'];
        }
    } else {
        ob_clean();
        http_response_code(500);
        echo json_encode([
            'error'  => 'Payment insert failed (HTTP ' . $paymentResult['code'] . ')',
            'detail' => $paymentResult['body'],
        ]);
        exit;
    }

    // Link payment record to certificate
    if ($paymentId) {
        $certificatePayload['payment_id'] = $paymentId;
    }

    // ── Save certificate ─────────────────────────────────────────────────────
    $certResult = supabase_post_fg($SUPABASE_URL . 'certificates', $certificatePayload, $SUPABASE_ANON_KEY);

    if ($certResult['code'] < 200 || $certResult['code'] >= 300) {
        ob_clean();
        http_response_code(500);
        echo json_encode([
            'error'  => 'Certificate insert failed (HTTP ' . $certResult['code'] . ')',
            'detail' => $certResult['body'],
        ]);
        exit;
    }

    $certificateId = null;
    $certRecord = json_decode($certResult['body'], true);
    if (is_array($certRecord) && !empty($certRecord[0]['id'])) {
        $certificateId = $certRecord[0]['id'];
    }

    ob_clean();
    echo json_encode([
        'success'        => true,
        'payment_id'     => $paymentId,
        'certificate_id' => $certificateId,
        'control_number' => $controlNo,
        'message'        => 'Payment recorded and certificate created successfully',
    ]);

} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit;
}
?>
