<?php
// Import local treasurerLedger entries to Supabase treasurer_transactions table
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);
if (!$data) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid JSON']);
  exit;
}

// Allow either single object or array
$entries = is_array($data) && array_keys($data) === range(0, count($data)-1) ? $data : [$data];

$SUPABASE_URL = 'https://tkizkixcpfndytpkgfrd.supabase.co/rest/v1/';
$SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0';

function supabase_post(string $url, array $payload, string $apiKey) {
  $headers = [
    'http' => [
      'method' => 'POST',
      'header' => implode("\r\n", [
        'apikey: ' . $apiKey,
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
        'Prefer: return=representation'
      ]),
      'content' => json_encode($payload),
      'timeout' => 15,
      'ignore_errors' => true,
    ],
    'ssl' => [ 'verify_peer' => false, 'verify_peer_name' => false ]
  ];

  $ctx = stream_context_create($headers);
  $body = @file_get_contents($url, false, $ctx);
  $code = 0;
  if (isset($http_response_header) && is_array($http_response_header)) {
    if (preg_match('/HTTP\/\S+\s+(\d{3})/', $http_response_header[0], $m)) $code = (int)$m[1];
  }
  return ['code' => $code, 'body' => $body];
}

$inserted = 0;
$errors = [];
foreach ($entries as $entry) {
  $payload = [
    'resident_id' => isset($entry['residentId']) ? (int)$entry['residentId'] : null,
    'resident_name' => $entry['name'] ?? ($entry['resident'] ?? ''),
    'certificate_type' => $entry['certType'] ?? ($entry['cert'] ?? null),
    'control_number' => $entry['controlNumber'] ?? null,
    'or_number' => $entry['orNo'] ?? ($entry['or_number'] ?? null),
    'amount' => isset($entry['amount']) ? (float)$entry['amount'] : 0,
    'ctc_number' => $entry['ctcNo'] ?? null,
    'ctc_amount' => isset($entry['ctcAmount']) ? (float)$entry['ctcAmount'] : null,
    'bc_number' => $entry['bcNo'] ?? null,
    'payment_date' => isset($entry['date']) ? date('Y-m-d', strtotime($entry['date'])) : date('Y-m-d'),
    'status' => $entry['status'] ?? 'paid',
    'source' => 'local_import'
  ];

  $res = supabase_post($SUPABASE_URL . 'treasurer_transactions', $payload, $SUPABASE_ANON_KEY);
  if ($res['code'] >= 200 && $res['code'] < 300) {
    $inserted++;
  } else {
    $errors[] = ['entry' => $entry, 'response' => $res];
  }
}

echo json_encode(['inserted' => $inserted, 'errors' => $errors]);
exit;
?>
