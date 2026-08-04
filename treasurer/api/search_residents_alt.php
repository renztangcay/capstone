<?php
/**
 * Search Residents API Endpoint (Alternative using file_get_contents)
 * Matches by First Name, Last Name, Middle Initial, Suffix
 * Returns: JSON array of matching residents
 */

header('Content-Type: application/json; charset=utf-8');

// Get search query from GET parameter
$query = isset($_GET['q']) ? trim($_GET['q']) : '';

if (empty($query)) {
    echo json_encode([]);
    exit;
}

// Use Supabase REST API to search residents
$SUPABASE_URL = 'https://tkizkixcpfndytpkgfrd.supabase.co/rest/v1/';
$SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0';

try {
    // Split query into parts to search
    $parts = array_filter(explode(' ', $query));
    
    // Create Supabase query - search all active residents
    $url = $SUPABASE_URL . 'residents?select=id,first,last,mid,suffix,address,purok,dob,age&status=eq.active&limit=1000000';
    
    // Create headers for stream context
    $headers = array(
        'apikey: ' . $SUPABASE_ANON_KEY,
        'Authorization: Bearer ' . $SUPABASE_ANON_KEY,
        'Accept: application/json',
        'Content-Type: application/json'
    );
    
    $context = stream_context_create(array(
        'http' => array(
            'method' => 'GET',
            'header' => implode("\r\n", $headers),
            'timeout' => 10,
            'ignore_errors' => true
        ),
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false
        )
    ));
    
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch residents from database']);
        exit;
    }
    
    $residents = json_decode($response, true);
    
    if (!is_array($residents)) {
        $residents = [];
    }
    
    // Filter results - match query against full name parts
    $results = [];
    foreach ($residents as $resident) {
        if (!isset($resident['id']) || !isset($resident['first']) || !isset($resident['last'])) {
            continue;
        }
        
        $fullName = strtolower(
            ($resident['last'] ?? '') . ' ' . 
            ($resident['first'] ?? '') . ' ' . 
            ($resident['mid'] ?? '') . ' ' . 
            ($resident['suffix'] ?? '')
        );
        
        // Check if all query parts match
        $matchesAll = true;
        foreach ($parts as $part) {
            if (stripos($fullName, $part) === false) {
                $matchesAll = false;
                break;
            }
        }
        
        if ($matchesAll) {
            // Build full name string
            $name = trim(($resident['last'] ?? '') . ', ' . ($resident['first'] ?? ''));
            if (!empty($resident['mid'])) {
                $name .= ' ' . strtoupper($resident['mid'][0]);
            }
            if (!empty($resident['suffix'])) {
                $name .= ' ' . $resident['suffix'];
            }
            
            $results[] = [
                'id' => $resident['id'],
                'name' => $name,
                'fullName' => $name,
                'first' => $resident['first'] ?? '',
                'last' => $resident['last'] ?? '',
                'mid' => $resident['mid'] ?? '',
                'suffix' => $resident['suffix'] ?? '',
                'address' => $resident['address'] ?? '',
                'purok' => $resident['purok'] ?? ''
            ];
        }
    }
    
    // Return results as JSON
    echo json_encode($results);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit;
}
?>
