<?php
// Placeholder DB connection and common bootstrap.
if (session_status() === PHP_SESSION_NONE) session_start();

// Prevent browser caching (vital for secure logout / back button)
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Ensure fragment responses are served as HTML
header('Content-Type: text/html; charset=utf-8');

$db = null; // replace with PDO or mysqli connection as needed
?>
