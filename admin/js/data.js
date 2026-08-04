'use strict';

// ══════════════════════════════════════════
// DATA
// ══════════════════════════════════════════
// Demo data cleared — initialize empty stores
const officials = [];
let residents = [];
let certificates = [];
let households = [];
let editingHHId = null;

// Expose to window for modular access
window.residents = residents;
window.households = households;
window.officials = officials;
window.certificates = certificates;

