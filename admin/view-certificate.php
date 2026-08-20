<?php include __DIR__ . '/includes/db.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barangay Clearance Certificate</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: 0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Times New Roman', Times, serif;
            background: #f5f5f5;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        .certificate {
            width: 8.5in;
            height: 11in;
            background: white;
            padding: 0.75in 1in;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            position: relative;
        }

        /* Watermark */
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.08;
            width: 400px;
            height: 400px;
            pointer-events: none;
        }

        /* Header */
        .header {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }

        .logo {
            width: 110px;
            height: 110px;
            flex-shrink: 0;
            object-fit: contain;
            margin-top: -14px;
            margin-bottom: -6px;
        }

        .header-text {
            flex: 1;
            text-align: center;
            padding-top: 1px;
            margin-right: 170px;
            margin-bottom: -6px;
        }

        .header-text h1 {
            font-size: 16px;
            font-weight: bold;
            margin: 0;
            line-height: 1.3;
            margin-left: 28px;
        }

        .header-text h2 {
            font-size: 20px;
            font-weight: bold;
            margin: 2px 0;
            letter-spacing: 0.5px;
            text-align: justify;
            width: 150%;
        }

        .header-text h3 {
            font-size: 20px;
            font-weight: bold;
            margin: 2px 0;
            margin-left: 28px;
        }

        .header-text h4 {
            font-size: 20px;
            font-weight: bold;
            margin: 0;
            margin-left: 28px;
        }

        .clearance-number {
            position: absolute;
            right: 1.7in;
            top: 1.9in;
            color: #d32f2f;
            font-size: 12px;
        }

        /* Title */
        .title {
            text-align: center;
            margin: 40px 0 30px 0;
        }

        .title h1 {
            font-size: 20px;
            font-weight: bold;
            text-decoration: underline;
            letter-spacing: 3px;
        }

        /* Photo */
        .photo-container {
            position: absolute;
            right: 1.1in;
            top: 2.1in;
            width: 1in;
            height: 1in;
            border: 2px solid #333;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #999;
            text-align: center;
            padding: 5px;
            overflow: hidden;
        }

        .photo-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        /* Content */
        .content {
            margin: 30px 0;
            margin-right: 0.1in;
            line-height: 1.8;
            text-align: justify;
            
        }

        .salutation {
            font-size: 14px;
            margin-bottom: 20px;
        }

        .body-text {
            font-size: 14px;
            text-indent: 50px;
            margin-top: 20px;
            word-spacing: 3px;
        }

        .body-text strong {
            font-weight: bold;
        }

        .purpose {
            font-size: 14px;
            text-indent: 50px;
            margin-top: 20px;
        }

        .issuance {
            font-size: 14px;
            text-indent: 50px;
            margin-top: 20px;
        }

        .issuance sup {
            font-size: 10px;
            vertical-align: super;
        }

        /* Signature Section */
        .signature-section {
            margin-top: 230px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .signature-left {
            text-align: center;
            width: 45%;
        }

        .signature-right {
            text-align: center;
            width: 25%;
        }

        .signature-line {
            border-top: 2px solid #000;
            width: 100%;
            margin-bottom: 5px;
            
        }

        .signature-label {
            font-size: 12px;
            font-style: italic;
            color: #666;
        }

        .signature-name {
            font-size: 14px;
            font-weight: bold;
            text-decoration: underline;
            margin-top: 10px;
        }

        .signature-title {
            font-size: 13px;
            font-weight: bold;
            margin-top: 2px;
        }

        /* Footer */
        .footer {
            position: absolute;
            bottom: 0.75in;
            left: 1in;
            right: 1in;
        }

        .validity-note {
            font-size: 11px;
            font-style: italic;
            margin-bottom: 10px;
        }

        .payment-details {
            font-size: 10px;
            line-height: 1.4;
            margin-bottom: 15px;
        }

        .contact-info {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 11px;
            margin-left: 140px;
        }

        .facebook-icon {
            width: 35px;
            height: 35px;
            background: #1877f2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 20px;
            flex-shrink: 0;
        }

        .contact-text {
            line-height: 1.4;
        }

        .contact-text a {
            color: #1877f2;
            text-decoration: none;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }

            .certificate {
                box-shadow: none;
                margin: 0;
            }
        }
        .hotline {
            margin-left: 70px;
            margin-bottom: -15px;
        }
        .email {
            margin-left: 30px;
            margin-bottom: -15px;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <!-- Watermark -->
        <img class="watermark" src="../assets/logo_centtral.jpeg" alt="Watermark">

        <!-- Header -->
        <div class="header">
            <img class="logo" src="../assets/logo_centtral.jpeg" alt="Central Barangay Logo">
            <div class="header-text">
                <h1>Republic of the Philippines</h1>
                <h2>OFFICE OF THE BARANGAY COUNCIL</h2>
                <h3>CENTRAL BARANGAY</h3>
                <h4>DIPOLOG CITY</h4>
            </div>
        </div>

        <!-- Clearance Number -->
        <div class="clearance-number">No. <span id="certNo"></span></div>

        <!-- Title -->
        <div class="title">
            <h1 id="certTitle">BARANGAY CLEARANCE</h1>
        </div>

        <!-- Photo Placeholder -->
        <div class="photo-container" id="photoContainer">
            <span id="photoPlaceholder">2x2 Photo Here</span>
        </div>

        <!-- Content -->
        <div class="content">
            <p class="salutation">TO WHOM IT MAY CONCERN:</p>

            <p class="body-text" id="certBodyPara">
                THIS IS TO CERTIFY that <strong><span id="certResidentName">RESIDENT NAME</span></strong><span id="certResidentExtra">, legal age</span>,
                is a bona fide resident of <span id="certAddress"></span>, 
                Central Barangay, Dipolog City.
            </p>

            <p class="purpose" id="certPurposePara1"></p>

            <p class="purpose">
                This certificate is issued to <span id="certPurpose"></span>.
            </p>

            <p class="issuance">
                Issued this <span id="certDay"></span> day of 
                <span id="certMonth"></span> at Central Barangay Hall, Dipolog City.
            </p>
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
            <div class="signature-left" id="signatureLeft">
                <div class="signature-line"></div>
                <p class="signature-label">Signature of Applicant</p>
                <p id="validityNoteLeft" style="display:none;font-size:11px;font-style:italic;margin-top:8px;text-align:center;">NOT VALID WITHOUT SEAL</p>
            </div>

            <div class="signature-right">
                <p class="signature-name"><span id="certSignatory">ROSANNA D. DIAZ</span></p>
                <p class="signature-title">PUNONG BARANGAY</p>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p class="validity-note" id="validityNote">NOT VALID WITHOUT SEAL</p>

            <div class="payment-details" id="paymentDetails">
                <div>Amount: <span id="certAmount"></span></div>
                <div>O.R No.: <span id="certORNo"></span></div>
                <div id="certBCNoRow">BC No.: <span id="certBCNo"></span></div>
                <div>CTC No.: <span id="certCTCNo"></span></div>
                <div>Amount: <span id="certCTCAmount"></span></div>
                <div>Date: <span id="certDate"></span></div>
            </div>

            <div class="contact-info">
                <div class="facebook-icon">f</div>
                <div class="contact-text">
                 <div class="hotline">Hotline: (065) 212-3458</div><br>
                   <div class="email">Email us at <a href="mailto:centralbrgy7100@gmail.com">centralbrgy7100@gmail.com</a></div><br>
                    <a href="https://www.facebook.com/CentralBarangayDipologCity" target="_blank">https://www.facebook.com/CentralBarangayDipologCity</a>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Get certificate data securely from POST parameters (fallback to GET)
        const serverData = <?php echo json_encode($_REQUEST); ?>;
        const params = new URLSearchParams();
        if (serverData) {
            for (const [key, value] of Object.entries(serverData)) {
                params.set(key, value);
            }
        }
        // Fallback to URL search string if missing
        new URLSearchParams(window.location.search).forEach((val, key) => {
            if (!params.has(key)) params.set(key, val);
        });
        
        // Populate certificate fields
        if (params.get('certNo')) {
            // Normalize control number: extract trailing numeric part if present
            const rawCertNo = params.get('certNo') || '';
            const match = rawCertNo.match(/(\d+)\s*$/);
            const display = match ? match[1] : rawCertNo;
            document.getElementById('certNo').textContent = display;
        }

        // --- Dynamic Certificate Type: update title & body based on type param ---
        const certType = (params.get('type') || 'Barangay Clearance').trim();
        const certTypeLower = certType.toLowerCase();

        const titleEl = document.getElementById('certTitle');
        const para1El = document.getElementById('certPurposePara1');

        const photoEl      = document.getElementById('photoContainer');
        const paymentEl    = document.getElementById('paymentDetails');
        const sigLeftEl    = document.getElementById('signatureLeft');
        const validityEl   = document.getElementById('validityNote');

        if (certTypeLower.includes('indigency')) {
            // Certificate of Indigency
            if (titleEl)    titleEl.textContent   = 'CERTIFICATE OF INDIGENCY';
            document.title = 'Certificate of Indigency';
            if (para1El)    para1El.textContent   = '';
            // Hide photo, payment details, and footer validity note
            if (photoEl)    photoEl.style.display   = 'none';
            if (paymentEl)  paymentEl.style.display  = 'none';
            if (validityEl) validityEl.style.display = 'none';
            // Show NOT VALID WITHOUT SEAL below Signature of Applicant
            const validityNoteLeft = document.getElementById('validityNoteLeft');
            if (validityNoteLeft) validityNoteLeft.style.display = 'block';

            // Change purpose sentence prefix for Certificate of Indigency
            const purposePara = document.querySelector('.purpose:not(#certPurposePara1)');
            if (purposePara) {
                purposePara.innerHTML = purposePara.innerHTML.replace('This certificate is issued to', 'This certification is hereby issued to');
            }

            // Replace "Dipolog City." with "Dipolog City, and an INDIGENT CITIZEN." in the body paragraph
            const certBodyPara = document.getElementById('certBodyPara');
            if (certBodyPara) {
                certBodyPara.innerHTML = certBodyPara.innerHTML.replace(
                    /Dipolog City\./,
                    'Dipolog City, and an <strong>INDIGENT CITIZEN</strong>.'
                );
            }

            // Underline the issuance sentence with a solid continuous line
            const issuanceEl = document.querySelector('.issuance');
            if (issuanceEl) {
                issuanceEl.style.textDecoration = 'underline';
                issuanceEl.style.textDecorationSkipInk = 'none';
            }
            // Ensure signature section stays properly separated on left and right for Certificate of Indigency
            if (sigLeftEl) {
                sigLeftEl.style.position = 'static';
                sigLeftEl.style.transform = 'none';
            }
            const sigSecInd = document.querySelector('.signature-section');
            if (sigSecInd) {
                sigSecInd.style.position = 'static';
                sigSecInd.style.marginTop = '140px';
            }
            const sigRightInd = document.querySelector('.signature-right');
            if (sigRightInd) sigRightInd.style.transform = 'translateY(-70px)';

            // Increase content font size for Certificate of Indigency
            document.querySelectorAll('.body-text, .purpose, .issuance, .salutation').forEach(el => {
                el.style.fontSize = '19px';
            });
        } else if (certTypeLower.includes('residency')) {
            // Certificate of Residency
            if (titleEl)  titleEl.textContent  = 'CERTIFICATE OF RESIDENCY';
            document.title = 'Certificate of Residency';
            if (para1El)  para1El.textContent  = 'This certification is issued upon the request of the above-named individual as proof of residency.';
            // Hide 2x2 photo box for Certificate of Residency
            if (photoEl)  photoEl.style.display = 'none';
            // Change purpose sentence prefix for Certificate of Residency
            const purposeParaRes = document.querySelector('.purpose:not(#certPurposePara1)');
            if (purposeParaRes) {
                purposeParaRes.innerHTML = purposeParaRes.innerHTML.replace('This certificate is issued to', 'This certification is further issued to');
            }
            // Show BC No. row for Residency certificates
            const bcNoRow = document.getElementById('certBCNoRow');
            if (bcNoRow) bcNoRow.style.display = 'block';

            // Underline the issuance sentence with a solid continuous line
            const issuanceElRes = document.querySelector('.issuance');
            if (issuanceElRes) {
                issuanceElRes.style.textDecoration = 'underline';
                issuanceElRes.style.textDecorationSkipInk = 'none';
            }

            // Increase content font size to 17px for Certificate of Residency only and adjust signature top margin
            document.querySelectorAll('.body-text, .purpose, .issuance, .salutation').forEach(el => {
                el.style.fontSize = '18px';
            });
            // Lock signature section at fixed bottom position for Certificate of Residency so left and right stay separated
            const sigSecRes = document.querySelector('.signature-section');
            if (sigSecRes) {
                sigSecRes.style.position = 'absolute';
                sigSecRes.style.bottom = '2.7in';
                sigSecRes.style.left = '1in';
                sigSecRes.style.right = '1in';
                sigSecRes.style.marginTop = '0';
            }
            if (sigLeftEl) {
                sigLeftEl.style.position = 'static';
                sigLeftEl.style.transform = 'none';
            }
            const sigRightRes = document.querySelector('.signature-right');
            if (sigRightRes) sigRightRes.style.transform = 'translateY(-40px)';
        } else if (certTypeLower.includes('business')) {
            // Business Clearance
            if (titleEl)  titleEl.textContent  = 'BARANGAY BUSINESS CLEARANCE';
            document.title = 'Barangay Business Clearance';
            if (para1El)  para1El.textContent  = '';
        } else {
            // Default: Barangay Clearance
            if (titleEl)  titleEl.textContent  = 'BARANGAY CLEARANCE';
            document.title = 'Barangay Clearance Certificate';
            if (para1El)  para1El.textContent  = 'This clearance is issued to certify that the above-mentioned individual has no derogatory or criminal record filed in this Barangay.';
            // Set content font size to 17px for Barangay Clearance only and adjust top margin of signature section
            document.querySelectorAll('.body-text, .purpose, .issuance, .salutation').forEach(el => {
                el.style.fontSize = '18px';
            });
            // Lock signature section at fixed bottom position above footer so both sides stay locked and separated
            const sigSec = document.querySelector('.signature-section');
            if (sigSec) {
                sigSec.style.position = 'absolute';
                sigSec.style.bottom = '3.1in';
                sigSec.style.left = '1in';
                sigSec.style.right = '1in';
                sigSec.style.marginTop = '0';
            }
            if (sigLeftEl) {
                sigLeftEl.style.position = 'static';
                sigLeftEl.style.transform = 'none';
            }
        }
        // --- End dynamic type ---
        // Set resident name (bold) and extra/civil (non-bold) separately
        if (params.get('resident')) {
            const name = params.get('resident') || '';
            const el = document.getElementById('certResidentName');
            if (el) el.textContent = name.toUpperCase();
        }
        // Always show "legal age" after the name; append civil status and Filipino nationality
        const elExtra = document.getElementById('certResidentExtra');
        if (elExtra) {
            const civil = params.get('civil') ? ', ' + params.get('civil') : '';
            elExtra.textContent = ', legal age' + civil + ', Filipino';
        }
        if (params.get('address')) {
            let addr = params.get('address');
            document.getElementById('certAddress').textContent = addr;
        }
        if (params.get('gender')) {
            const el = document.getElementById('certGender'); if (el) el.textContent = params.get('gender');
        }
        // Purpose should reflect the preview 'This clearance is issued to (input)'
        if (params.get('purpose')) document.getElementById('certPurpose').innerHTML = params.get('purpose');
        // Issued day: prefer numeric day and render ordinal with <sup>, accept HTML if provided
        function ordinalSuffix(n) {
            const s = ["th","st","nd","rd"], v = n%100;
            return (s[(v-20)%10] || s[v] || s[0]);
        }
        if (params.get('day')) {
            const rawDay = params.get('day') || '';
            const elDay = document.getElementById('certDay');
            if (elDay) {
                // if contains HTML already, use as-is
                if (/<[^>]+>/.test(rawDay)) {
                    elDay.innerHTML = rawDay;
                } else {
                    const n = parseInt(String(rawDay).replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(n)) {
                        const suf = ordinalSuffix(n);
                        if (certTypeLower.includes('indigency')) {
                            elDay.textContent = `${n}${suf}`;
                        } else {
                            elDay.innerHTML = `${n}<sup>${suf}</sup>`;
                        }
                    } else {
                        elDay.textContent = rawDay;
                    }
                }
            }
        }
        if (params.get('month')) document.getElementById('certMonth').textContent = params.get('month');
        if (params.get('signatory')) document.getElementById('certSignatory').textContent = params.get('signatory');
        function formatAmountWithDecimal(raw) {
            if (!raw) return '';
            const normalized = String(raw).trim();
            const clean = normalized.replace(/[^0-9.]/g, '');
            const parsed = parseFloat(clean);
            if (!isNaN(parsed)) {
                return 'Php' + parsed.toFixed(2);
            }
            return normalized;
        }

        if (params.get('amount')) {
            document.getElementById('certAmount').textContent = formatAmountWithDecimal(params.get('amount'));
        }
        if (params.get('orNo')) document.getElementById('certORNo').textContent = params.get('orNo');
        if (params.get('bcNo')) document.getElementById('certBCNo').textContent = params.get('bcNo');
        if (params.get('ctcNo')) document.getElementById('certCTCNo').textContent = params.get('ctcNo');
        // Show CTC Amount if provided
        if (params.get('ctcAmount')) {
            const el = document.getElementById('certCTCAmount');
            if (el) el.textContent = formatAmountWithDecimal(params.get('ctcAmount'));
        }

        // Format date param to numeric month format MM/DD/YYYY (e.g., 02/09/2026)
        function formatDateNumeric(raw) {
            if (!raw) return '';
            raw = String(raw).trim();
            // ISO yyyy-mm-dd
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                const d = new Date(raw + 'T00:00:00'); if (!isNaN(d.getTime())) {
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const yyyy = d.getFullYear();
                    return `${mm}/${dd}/${yyyy}`;
                }
            }
            // dd/mm/yyyy or dd-mm-yyyy -> convert to mm/dd/yyyy
            const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (m) {
                const day = String(parseInt(m[1], 10)).padStart(2, '0');
                const month = String(parseInt(m[2], 10)).padStart(2, '0');
                const year = m[3];
                return `${month}/${day}/${year}`;
            }
            // fallback to native parse
            const d2 = new Date(raw);
            if (!isNaN(d2.getTime())) {
                const mm = String(d2.getMonth() + 1).padStart(2, '0');
                const dd = String(d2.getDate()).padStart(2, '0');
                const yyyy = d2.getFullYear();
                return `${mm}/${dd}/${yyyy}`;
            }
            return raw;
        }

        if (params.get('date')) document.getElementById('certDate').textContent = formatDateNumeric(params.get('date'));

        // Print on load if requested
        if (params.get('print') === 'true') {
            window.addEventListener('load', () => {
                setTimeout(() => window.print(), 500);
            });
        }

        // Print functionality (Ctrl+P)
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
        });
    </script>
</body>
</html>
