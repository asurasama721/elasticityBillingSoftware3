
function openCompanyInfoModal() {
    toggleSettingsSidebar()
    document.getElementById('company-info-modal').style.display = 'block';
    loadCompanyInfo();
}

function closeCompanyInfoModal() {
    document.getElementById('company-info-modal').style.display = 'none';
}

async function loadCompanyInfo() {
    try {
        const info = await getFromDB('companyInfo', 'companyInfo');
        if (info) {
            companyInfo = info;

            // 1. Populate Modal Inputs
            if (document.getElementById('company-name')) document.getElementById('company-name').value = info.name || '';
            if (document.getElementById('company-address')) document.getElementById('company-address').value = info.address || '';
            if (document.getElementById('company-gst')) document.getElementById('company-gst').value = info.gstin || '';
            if (document.getElementById('company-mobile')) document.getElementById('company-mobile').value = info.mobile || '';
            if (document.getElementById('company-email')) document.getElementById('company-email').value = info.email || '';
            if (document.getElementById('company-state')) document.getElementById('company-state').value = info.state || '';
            if (document.getElementById('company-code')) document.getElementById('company-code').value = info.stateCode || '';
            if (document.getElementById('account-number')) document.getElementById('account-number').value = info.accountNumber || '';
            if (document.getElementById('ifsc-code')) document.getElementById('ifsc-code').value = info.ifscCode || '';
            if (document.getElementById('branch')) document.getElementById('branch').value = info.branch || '';
            if (document.getElementById('bank-name')) document.getElementById('bank-name').value = info.bankName || '';
            if (document.getElementById('account-holder')) document.getElementById('account-holder').value = info.accountHolder || '';

            // --- SAFELY PRESERVED EXISTING CALLS ---
            if (typeof updateGSTBillCompanyInfo === 'function') updateGSTBillCompanyInfo();
            if (typeof updateRegularFooterInfo === 'function') updateRegularFooterInfo();

            // --- NEW: UPDATE GST BILL HEADER DISPLAY & HIDE EMPTY LINES ---
            // Name
            if (document.getElementById('gstCompanyName')) {
                document.getElementById('gstCompanyName').textContent = info.name || 'COMPANY NAME';
            }
            // Address
            if (document.getElementById('gstCompanyAddr')) {
                document.getElementById('gstCompanyAddr').textContent = info.address || '';
            }

            // Helper to update text and hide parent <p> if empty
            const updateGstFieldSafe = (id, val) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = val || '';
                    // If value is empty, hide the parent paragraph so label doesn't show
                    if (el.parentElement) {
                        el.parentElement.style.display = (val && val.trim().length > 0) ? 'block' : 'none';
                    }
                }
            };

            updateGstFieldSafe('gstCompanyGstin', info.gstin);
            updateGstFieldSafe('gstCompanyPhone', info.mobile);
            updateGstFieldSafe('gstCompanyEmail', info.email);
            // -------------------------------------------------------------

            // 2. Update Regular Bill Header & Hide Empty Fields (Preserved your logic)
            const regName = document.getElementById('companyName');
            const regAddr = document.getElementById('companyAddr');
            const regGstin = document.getElementById('companyGstin');
            const regPhone = document.getElementById('companyPhone');
            const regEmail = document.getElementById('companyEmail');

            const regGstinLine = document.getElementById('reg-header-gstin-line');
            const regPhoneLine = document.getElementById('reg-header-phone-line');
            const regEmailLine = document.getElementById('reg-header-email-line');

            // Name
            if (regName) regName.textContent = info.name || 'COMPANY NAME';

            // Address - Hide if empty
            if (regAddr) {
                regAddr.textContent = info.address || '';
                regAddr.style.display = (info.address && info.address.trim().length > 0) ? 'block' : 'none';
            }

            // GSTIN - Set text
            if (regGstin) regGstin.textContent = info.gstin || '';

            // Contact No - Hide if empty
            if (regPhone && regPhoneLine) {
                regPhone.textContent = info.mobile || '';
                const hasPhone = info.mobile && info.mobile.trim().length > 0;
                regPhoneLine.style.display = hasPhone ? 'block' : 'none';
            }

            // Email - Hide if empty
            if (regEmail && regEmailLine) {
                regEmail.textContent = info.email || '';
                const hasEmail = info.email && info.email.trim().length > 0;
                regEmailLine.style.display = hasEmail ? 'block' : 'none';
            }

            if (typeof updateBrandingUI === 'function') {
                updateBrandingUI();
            }

            // Force check visibility based on current Tax Settings AND content length
            if (typeof updateGSTINVisibility === 'function') updateGSTINVisibility();
        }
    } catch (error) {
        console.error('Error loading company info:', error);
    }
}

async function saveCompanyInfo() {
    const companyData = {
        name: document.getElementById('company-name').value,
        address: document.getElementById('company-address').value,
        gstin: document.getElementById('company-gst').value,
        mobile: document.getElementById('company-mobile').value,
        email: document.getElementById('company-email').value,
        state: document.getElementById('company-state').value,
        stateCode: document.getElementById('company-code').value,
        accountNumber: document.getElementById('account-number').value,
        ifscCode: document.getElementById('ifsc-code').value,
        branch: document.getElementById('branch').value,
        bankName: document.getElementById('bank-name').value,
        accountHolder: document.getElementById('account-holder').value
    };

    try {
        await setInDB('companyInfo', 'companyInfo', companyData);
        companyInfo = companyData;

        // REFRESH UI IMMEDIATELY
        await loadCompanyInfo();

        closeCompanyInfoModal();
        if (typeof showNotification === 'function') {
            showNotification('Company info saved successfully!', 'success');
        }
    } catch (error) {
        console.error('Error saving company info:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error saving company info', 'error');
        }
    }
}

function updateGSTBillCompanyInfo() {
    if (companyInfo) {
        document.getElementById('gstCompanyName').textContent = companyInfo.name;
        document.getElementById('gstCompanyAddr').textContent = companyInfo.address;
        document.getElementById('gstCompanyGstin').textContent = companyInfo.gstin;
        document.getElementById('gstCompanyPhone').textContent = companyInfo.mobile;
        document.getElementById('gstCompanyEmail').textContent = companyInfo.email;

        // Update the bill footer signatory
        document.getElementById('bill-company-signatory').textContent = `for ${companyInfo.name}`;

        // Update bank details
        document.getElementById('bill-account-holder').textContent = companyInfo.accountHolder;
        document.getElementById('bill-account-number').textContent = companyInfo.accountNumber;
        document.getElementById('bill-ifsc-code').textContent = companyInfo.ifscCode;
        document.getElementById('bill-branch').textContent = companyInfo.branch;
        document.getElementById('bill-bank-name').textContent = companyInfo.bankName;
    }
}


// NEW: Function to generate next invoice number
async function generateNextInvoiceNumber() {
    try {
        const savedBills = await getAllFromDB('gstSavedBills');
        let maxInvoiceNo = 0;

        // Find the highest invoice number from all GST saved bills
        savedBills.forEach(bill => {
            if (bill.value && bill.value.invoiceDetails && bill.value.invoiceDetails.number) {
                const invoiceNo = parseInt(bill.value.invoiceDetails.number);
                if (!isNaN(invoiceNo) && invoiceNo > maxInvoiceNo) {
                    maxInvoiceNo = invoiceNo;
                }
            }
        });

        // Set next invoice number (max + 1) or default to 1 if no bills exist
        const nextInvoiceNo = maxInvoiceNo > 0 ? maxInvoiceNo + 1 : 1;
        document.getElementById('invoice-no').value = nextInvoiceNo.toString().padStart(3, '0');

        console.log('Generated next invoice number:', nextInvoiceNo, 'from max:', maxInvoiceNo);

    } catch (error) {
        console.error('Error generating invoice number:', error);
        document.getElementById('invoice-no').value = '001'; // Default to 001 if error
    }
}

function closeCustomerDetailsModal() {
    // SAVE the current state before closing (in case user made changes)
    saveCustomerDialogState();

    document.getElementById('customer-details-modal').style.display = 'none';

    // Only reset the invoice number field state, not the values
    const invoiceNoInput = document.getElementById('invoice-no');
    invoiceNoInput.disabled = false;
    invoiceNoInput.style.backgroundColor = '';
    invoiceNoInput.title = '';

    // DO NOT clear any form values here
}

function handleCustomerTypeChange() {
    const customerType = document.getElementById('customer-type').value;
    const shipToSection = document.getElementById('ship-to-section');

    if (customerType === 'both') {
        shipToSection.style.display = 'block';
    } else {
        shipToSection.style.display = 'none';
    }
}

async function handleCustomerSearch(type) {
    const input = document.getElementById(`${type}-name`);
    const suggestions = document.getElementById(`${type}-suggestions`);
    const searchTerm = input.value.trim();

    if (searchTerm.length < 2) {
        suggestions.style.display = 'none';
        return;
    }

    try {
        const allCustomers = await getAllFromDB('gstCustomers');
        const filtered = allCustomers.filter(customer =>
            customer.value.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.value.gstin.includes(searchTerm)
        ).slice(0, 5);

        suggestions.innerHTML = '';
        filtered.forEach(customer => {
            const div = document.createElement('div');
            div.className = 'customer-suggestion-item';
            div.textContent = `${customer.value.name} (${customer.value.gstin})`;
            div.onclick = () => fillCustomerDetails(type, customer.value);
            suggestions.appendChild(div);
        });

        suggestions.style.display = filtered.length > 0 ? 'block' : 'none';
    } catch (error) {
        console.error('Error searching customers:', error);
    }
}

function fillCustomerDetails(type, customer) {
    // type is 'consignee' (Bill To) or 'buyer' (Ship To)

    // 1. Name & Address
    if (document.getElementById(`${type}-name`)) document.getElementById(`${type}-name`).value = customer.name || '';
    if (document.getElementById(`${type}-address`)) document.getElementById(`${type}-address`).value = customer.address || '';

    // 2. GSTIN
    if (document.getElementById(`${type}-gst`)) document.getElementById(`${type}-gst`).value = customer.gstin || '';

    // 3. State & Code (Default to ""/27 if missing)
    if (document.getElementById(`${type}-state`)) document.getElementById(`${type}-state`).value = customer.state || '';
    if (document.getElementById(`${type}-code`)) document.getElementById(`${type}-code`).value = customer.stateCode || '';

    // 4. Contact/Phone (Check multiple property names)
    const phoneVal = customer.phone || customer.contact || '';
    if (document.getElementById(`${type}-contact`)) {
        document.getElementById(`${type}-contact`).value = phoneVal;
    }

    // 5. Email (Safely check if input exists)
    const emailVal = customer.email || '';
    if (document.getElementById(`${type}-email`)) {
        document.getElementById(`${type}-email`).value = emailVal;
    }

    // 6. Hide Suggestions
    const suggestions = document.getElementById(`${type}-suggestions`);
    if (suggestions) suggestions.style.display = 'none';

    // 7. Auto-detect transaction type (Interstate vs Intrastate)
    if (typeof companyInfo !== 'undefined' && companyInfo && customer.stateCode) {
        const transTypeEl = document.getElementById('transaction_type');
        if (transTypeEl) {
            if (String(customer.stateCode) !== String(companyInfo.stateCode)) {
                transTypeEl.value = 'interstate';
            } else {
                transTypeEl.value = 'intrastate';
            }
            // Trigger change handler if it exists
            if (typeof handleTransactionTypeChange === 'function') handleTransactionTypeChange();
        }
    }
}


// NEW: Function to check for duplicate invoice numbers
async function checkDuplicateInvoiceNumber(invoiceNo) {
    try {
        const savedBills = await getAllFromDB('gstSavedBills');

        for (const bill of savedBills) {
            if (bill.value.invoiceDetails && bill.value.invoiceDetails.number === invoiceNo) {
                return true; // Duplicate found
            }
        }
        return false; // No duplicate found

    } catch (error) {
        console.error('Error checking duplicate invoice number:', error);
        return false; // Assume no duplicate on error
    }
}

function formatDateForDisplay(dateString) {
    if (!dateString || typeof dateString !== "string") return "N/A";

    try {
        // Normalize possible separators (/, .)
        let safeDate = dateString.replace(/\./g, "-").replace(/\//g, "-");

        const parts = safeDate.split("-");

        // Case 1 ✅ yyyy-mm-dd (from HTML date input)
        if (parts.length === 3 && parts[0].length === 4) {
            const [yyyy, mm, dd] = parts;
            return `${dd.padStart(2, "0")}-${mm.padStart(2, "0")}-${yyyy}`;
        }

        // Case 2 ✅ dd-mm-yyyy (already correct)
        if (parts.length === 3 && parts[2].length === 4) {
            const [dd, mm, yyyy] = parts;
            return `${dd.padStart(2, "0")}-${mm.padStart(2, "0")}-${yyyy}`;
        }

        // Fallback ✅ Use JavaScript parser for other formats
        const parsedDate = new Date(dateString);
        if (!isNaN(parsedDate.getTime())) {
            const dd = String(parsedDate.getDate()).padStart(2, "0");
            const mm = String(parsedDate.getMonth() + 1).padStart(2, "0");
            const yyyy = parsedDate.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
        }

        // Last fallback: return what was given
        return dateString;

    } catch (err) {
        return dateString;
    }
}


function updateGSTTaxCalculation() {
    // Safety check - only proceed if in GST mode and GST bill container exists
    if (!isGSTMode) return;

    const gstBillContainer = document.getElementById('gst-bill-container');
    if (!gstBillContainer || gstBillContainer.style.display === 'none') {
        return; // GST bill not visible, skip calculation
    }

    const items = Array.from(document.querySelectorAll('#gstCopyListManual tbody tr[data-id]'));
    let subtotal = 0;
    const taxData = {};

    items.forEach(row => {
        const amountCell = row.querySelector('.amount');
        if (amountCell) {
            const amount = parseFloat(amountCell.textContent) || 0;
            subtotal += amount;

            const hsn = row.getAttribute('data-hsn') || 'N/A';
            if (!taxData[hsn]) {
                taxData[hsn] = {
                    taxableValue: 0,
                    items: 0
                };
            }
            taxData[hsn].taxableValue += amount;
            taxData[hsn].items += 1;
        }
    });

    // Calculate discount with precision
    const discountAmount = storeWithPrecision(subtotal * (discountPercent / 100));
    const taxableValue = storeWithPrecision(subtotal - discountAmount);

    // Calculate taxes with precision
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (transactionType === 'intrastate') {
        cgstAmount = storeWithPrecision(taxableValue * (currentGSTPercent / 200));
        sgstAmount = storeWithPrecision(taxableValue * (currentGSTPercent / 200));
    } else {
        igstAmount = storeWithPrecision(taxableValue * (currentGSTPercent / 100));
    }

    // ROUND OFF GRAND TOTAL to nearest whole number for display only
    const grandTotal = Math.round(taxableValue + cgstAmount + sgstAmount + igstAmount);

    // Update display with rounded values - safely get elements each time
    try {
        const gstSubTotalEl = document.getElementById('gst-sub-total');
        const gstDiscountAmountEl = document.getElementById('gst-discount-amount');
        const gstDiscountPercentEl = document.getElementById('gst-discount-percent');
        const gstCgstAmountEl = document.getElementById('gst-cgst-amount');
        const gstSgstAmountEl = document.getElementById('gst-sgst-amount');
        const gstIgstAmountEl = document.getElementById('gst-igst-amount');
        const gstGrandTotalEl = document.getElementById('gst-grand-total');

        // Only update if elements exist (GST bill is visible)
        if (gstSubTotalEl) gstSubTotalEl.textContent = roundToTwoDecimals(subtotal).toFixed(2);
        if (gstDiscountAmountEl) gstDiscountAmountEl.textContent = `-${roundToTwoDecimals(discountAmount).toFixed(2)}`;
        if (gstDiscountPercentEl) gstDiscountPercentEl.textContent = roundToTwoDecimals(discountPercent);
        if (gstCgstAmountEl) gstCgstAmountEl.textContent = roundToTwoDecimals(cgstAmount).toFixed(2);
        if (gstSgstAmountEl) gstSgstAmountEl.textContent = roundToTwoDecimals(sgstAmount).toFixed(2);
        if (gstIgstAmountEl) gstIgstAmountEl.textContent = roundToTwoDecimals(igstAmount).toFixed(2);
        if (gstGrandTotalEl) gstGrandTotalEl.textContent = roundToTwoDecimals(grandTotal).toFixed(2);

        // Update discount row label
        const gstDiscountRow = document.getElementById('gst-discount-row');
        if (gstDiscountRow && gstDiscountRow.cells && gstDiscountRow.cells[0]) {
            gstDiscountRow.cells[0].textContent = `Discount (${roundToTwoDecimals(discountPercent)}%)`;
        }

        // Show/hide rows based on conditions
        const gstDiscountRowDisplay = document.getElementById('gst-discount-row');
        const gstCgstRow = document.getElementById('gst-cgst-row');
        const gstSgstRow = document.getElementById('gst-sgst-row');
        const gstIgstRow = document.getElementById('gst-igst-row');

        // Only show discount row if discountPercent > 0 AND discountAmount > 0
        if (gstDiscountRowDisplay) {
            gstDiscountRowDisplay.style.display = (discountPercent > 0 && discountAmount > 0) ? '' : 'none';
        }
        if (gstCgstRow) gstCgstRow.style.display = transactionType === 'intrastate' ? '' : 'none';
        if (gstSgstRow) gstSgstRow.style.display = transactionType === 'intrastate' ? '' : 'none';
        if (gstIgstRow) gstIgstRow.style.display = transactionType === 'interstate' ? '' : 'none';

    } catch (error) {
        console.log('GST elements not available for update (normal during view switching)');
    }

    // Update tax breakdown table with discounted taxable value
    updateTaxBreakdownTable(taxData, taxableValue, cgstAmount, sgstAmount, igstAmount);

    // Update amount in words (without decimal part)
    updateAmountInWords(grandTotal);
}

/// Updated helper for GST Tax Table (Simplified for Adjustment Chain)
function updateTaxBreakdownTable(taxDataMap, taxableValue, cgst, sgst, igst) {
    const tbody = document.getElementById('bill-tax-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Calculate total tax for display
    const totalTax = (cgst + sgst + igst).toFixed(2);

    // Determine rates string based on mode
    const cgstRate = transactionType === 'intrastate' ? (currentGSTPercent / 2).toFixed(2) + '%' : '-';
    const sgstRate = transactionType === 'intrastate' ? (currentGSTPercent / 2).toFixed(2) + '%' : '-';
    const igstRate = transactionType === 'interstate' ? currentGSTPercent.toFixed(2) + '%' : '-';

    // Create a single summary row representing the final calculated values
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="align-center">All Items</td>
        <td class="align-center">${taxableValue.toFixed(2)}</td>
        <td class="align-center">${cgstRate}</td>
        <td class="align-center">${cgst.toFixed(2)}</td>
        <td class="align-center">${sgstRate}</td>
        <td class="align-center">${sgst.toFixed(2)}</td>
        <td class="align-center">${totalTax}</td>
    `;
    tbody.appendChild(row);

    // Add totals row (Visual consistency)
    const totalsRow = document.createElement('tr');
    totalsRow.id = 'tax-section-totals';
    totalsRow.style.fontWeight = 'bold';
    totalsRow.style.backgroundColor = '#f8f9fa';

    totalsRow.innerHTML = `
        <td class="align-center">TOTAL</td>
        <td class="align-center">${taxableValue.toFixed(2)}</td>
        <td></td>
        <td class="align-center">${cgst.toFixed(2)}</td>
        <td></td>
        <td class="align-center">${sgst.toFixed(2)}</td>
        <td class="align-center">${totalTax}</td>
    `;
    tbody.appendChild(totalsRow);
}

function updateAmountInWords(amount) {
    // Add safety check to prevent errors with invalid amounts
    let text = 'Rupees Zero Only';

    if (!isNaN(amount) && amount !== 0) {
        try {
            const words = convertNumberToWords(amount);
            text = `Rupees ${words} Only`;
        } catch (error) {
            console.error('Error converting amount to words:', error);
        }
    }

    // Update GST Bill Words (Existing)
    const gstWordsEl = document.getElementById('bill-amount-words');
    if (gstWordsEl) {
        gstWordsEl.textContent = text;
    }

    // Update Regular Bill Words (New Fix)
    const regWordsEl = document.getElementById('reg-bill-amount-words');
    if (regWordsEl) {
        regWordsEl.textContent = text;
    }
}

// Basic number to words converter (you might want to use a more robust library)
function convertNumberToWords(num) {
    // Round off to nearest whole number first
    const roundedNum = Math.round(num);

    if (roundedNum === 0) return 'Zero';

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

    let n = roundedNum;
    let words = '';

    if (n === 0) {
        words = 'Zero';
    } else {
        // Convert whole part only (no decimal handling)
        let numStr = n.toString();
        let groups = [];

        // Indian numbering system: groups of 2 digits after the first 3
        if (numStr.length > 3) {
            groups.push(numStr.substr(-3));
            numStr = numStr.substr(0, numStr.length - 3);

            while (numStr.length > 2) {
                groups.push(numStr.substr(-2));
                numStr = numStr.substr(0, numStr.length - 2);
            }
            if (numStr.length > 0) {
                groups.push(numStr);
            }
        } else {
            groups.push(numStr);
        }

        groups = groups.reverse();

        for (let i = 0; i < groups.length; i++) {
            let group = parseInt(groups[i]);
            if (group === 0) continue;

            let groupWords = '';
            const hundreds = Math.floor(group / 100);
            const remainder = group % 100;

            if (hundreds > 0) {
                groupWords += units[hundreds] + ' Hundred ';
            }

            if (remainder > 0) {
                if (remainder < 10) {
                    groupWords += units[remainder] + ' ';
                } else if (remainder < 20) {
                    groupWords += teens[remainder - 10] + ' ';
                } else {
                    const tensDigit = Math.floor(remainder / 10);
                    const unitsDigit = remainder % 10;
                    groupWords += tens[tensDigit] + ' ';
                    if (unitsDigit > 0) {
                        groupWords += units[unitsDigit] + ' ';
                    }
                }
            }

            if (i < groups.length - 1) {
                groupWords += thousands[groups.length - 1 - i] + ' ';
            }

            words += groupWords;
        }

        words = words.trim();
    }

    // Return only the whole number part without "and XX/100"
    return words;
}

function openGSTManageCustomersModal() {
    document.getElementById('gst-manage-customers-modal').style.display = 'block';
    loadGSTCustomersList();
}

function closeGSTManageCustomersModal() {
    document.getElementById('gst-manage-customers-modal').style.display = 'none';
}

function openAddGSTCustomerModal() {
    currentlyEditingCustomerId = null;
    document.getElementById('add-gst-customer-modal-title').textContent = 'Add New GST Customer';
    document.getElementById('save-gst-customer-btn').textContent = 'Save GST Customer';

    // RESET ALL FIELDS
    document.getElementById('saved-gst-customer-name').value = '';
    document.getElementById('saved-gst-customer-address').value = '';
    document.getElementById('saved-gst-customer-phone').value = '';
    document.getElementById('saved-gst-customer-gstin').value = '';
    document.getElementById('saved-gst-customer-state').value = '';
    document.getElementById('saved-gst-customer-state-code').value = '';
    document.getElementById('saved-gst-customer-email').value = '';

    document.getElementById('add-gst-customer-modal').style.display = 'block';
}

function closeAddGSTCustomerModal() {
    document.getElementById('add-gst-customer-modal').style.display = 'none';
    currentlyEditingCustomerId = null; // ADD THIS LINE
}

async function saveGSTCustomerDataToLocalStorage() {
    const gstCustomerData = {
        invoiceNo: document.getElementById('invoice-no').value,
        invoiceDate: document.getElementById('invoice-date').value,
        gstPercent: parseFloat(document.getElementById('gst-percent-input').value),
        customerType: document.getElementById('customer-type').value,
        transactionType: document.getElementById('transaction_type').value,

        // Bill To data - ADD CONTACT FIELD
        billTo: {
            name: document.getElementById('consignee-name').value,
            address: document.getElementById('consignee-address').value,
            gstin: document.getElementById('consignee-gst').value,
            contact: document.getElementById('consignee-contact').value, // THIS WAS MISSING
            state: document.getElementById('consignee-state').value,
            stateCode: document.getElementById('consignee-code').value
        },

        // Ship To data - ADD CONTACT FIELD  
        shipTo: {
            name: document.getElementById('buyer-name').value,
            address: document.getElementById('buyer-address').value,
            gstin: document.getElementById('buyer-gst').value,
            contact: document.getElementById('buyer-contact').value, // THIS WAS MISSING
            state: document.getElementById('buyer-state').value,
            stateCode: document.getElementById('buyer-code').value,
            placeOfSupply: document.getElementById('place-of-supply').value
        },

        timestamp: Date.now()
    };

    await setInDB('gstMode', 'gstCustomerData', gstCustomerData);

    // Also update the bill view immediately with contact numbers
    document.getElementById('billToContact').textContent = document.getElementById('consignee-contact').value || 'Not provided';
    if (document.getElementById('customer-type').value === 'both') {
        document.getElementById('shipToContact').textContent = document.getElementById('buyer-contact').value || 'Not provided';
    }
}

async function saveGSTCustomer() {
    const customerName = document.getElementById('saved-gst-customer-name').value.trim();
    const address = document.getElementById('saved-gst-customer-address').value.trim();
    const phone = document.getElementById('saved-gst-customer-phone').value.trim();
    const gstin = document.getElementById('saved-gst-customer-gstin').value.trim();
    const state = document.getElementById('saved-gst-customer-state').value.trim();
    const stateCode = document.getElementById('saved-gst-customer-state-code').value.trim();
    const email = document.getElementById('saved-gst-customer-email').value.trim();

    if (!customerName) {
        showNotification('Please enter a customer name');
        return;
    }

    const customerData = {
        name: customerName,
        address: address,
        phone: phone,
        gstin: gstin,
        state: state,
        stateCode: stateCode,
        email: email,
        timestamp: Date.now()
    };

    try {
        // CHECK IF EDITING EXISTING CUSTOMER
        if (currentlyEditingCustomerId) {
            // UPDATE existing customer
            await setInDB('gstCustomers', currentlyEditingCustomerId, customerData);
            showNotification('GST customer updated successfully!', 'success');
        } else {
            // CREATE new customer
            const customerId = `gst-customer-${Date.now()}`;
            await setInDB('gstCustomers', customerId, customerData);
            showNotification('GST customer saved successfully!', 'success');
        }

        await loadGSTCustomersList();
        closeAddGSTCustomerModal();
        // RESET editing state
        currentlyEditingCustomerId = null;
    } catch (error) {
        console.error('Error saving GST customer:', error);
    }
}

/* 2. LOAD GST CUSTOMERS (Passes 'gst' mode explicitly) */
async function loadGSTCustomersList() {
    try {
        const customers = await getAllFromDB('gstCustomers');
        const listContainer = document.getElementById('customers-list');
        const searchInput = document.getElementById('customer-search');
        const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

        listContainer.innerHTML = '';

        if (customers.length === 0) {
            listContainer.innerHTML = '<div class="customer-card">No GST customers saved yet</div>';
            return;
        }

        const filtered = customers.filter(c => {
            const val = c.value;
            const name = (val.name || '').toLowerCase();
            const gstin = (val.gstin || '').toLowerCase();
            const address = (val.address || '').toLowerCase();
            const phone = (val.phone || val.contact || '').toLowerCase();
            const email = (val.email || '').toLowerCase();
            const state = (val.state || '').toLowerCase();

            return name.includes(searchTerm) ||
                gstin.includes(searchTerm) ||
                address.includes(searchTerm) ||
                phone.includes(searchTerm) ||
                email.includes(searchTerm) ||
                state.includes(searchTerm);
        });

        filtered.sort((a, b) => {
            const nameA = (a.value.name || '').toLowerCase();
            const nameB = (b.value.name || '').toLowerCase();
            return isCustomerSortAscending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        filtered.forEach(c => {
            const val = c.value;
            const customerCard = document.createElement('div');
            customerCard.className = 'customer-card';
            const menuId = `menu-gstcust-${c.id}-${Date.now()}`;

            const displayPhone = val.phone || val.contact || 'Not provided';
            const displayEmail = val.email || 'Not provided';
            const displayAddr = val.address || 'Not provided';
            const displayState = val.state ? `${val.state} (${val.stateCode || '-'})` : 'Not provided';

            customerCard.innerHTML = `
                <div class="card-header-row">
                    <div class="card-info">
                        <span>${val.name}</span>
                        <span class="card-sub-info">${val.gstin || 'No GSTIN'}</span>
                    </div>
                    <div class="card-controls">
                        <button class="icon-btn" onclick="toggleCardDetails(this)" title="Toggle Details">
                            <span class="material-icons">keyboard_arrow_down</span>
                        </button>
                        <div class="action-menu-container">
                            <button class="icon-btn" onclick="toggleActionMenu(event, '${menuId}')">
                                <span class="material-icons">more_vert</span>
                            </button>
                            <div id="${menuId}" class="action-dropdown">
                                <button class="dropdown-item" onclick="openPaymentDialog('${val.name}', '${val.gstin || ''}', 'gst')">
                                    <span class="material-icons">payments</span> Payment & CN
                                </button>
                                <button class="dropdown-item" onclick="openLedgerDialog('${val.name}', '${val.gstin || ''}', 'gst')">
                                    <span class="material-icons">book</span> Ledger
                                </button>
                                <button class="dropdown-item" onclick="editGSTCustomer('${c.id}')">
                                    <span class="material-icons">edit</span> Edit
                                </button>
                                <button class="dropdown-item delete-item" onclick="deleteGSTCustomer('${c.id}')">
                                    <span class="material-icons">delete</span> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="details-section hidden customer-details-text">
                    <div>Address: ${displayAddr}</div>
                    <div>Phone: ${displayPhone}</div>
                    <div>State: ${displayState}</div>
                    <div>Email: ${displayEmail}</div>
                </div>
            `;
            listContainer.appendChild(customerCard);
        });

    } catch (error) {
        console.error('Error loading GST customers list:', error);
    }
}

function searchGSTCustomers() {
    const searchTerm = document.getElementById('gst-customer-search').value.toLowerCase();
    const customerCards = document.querySelectorAll('#gst-customers-list .customer-card');

    customerCards.forEach(card => {
        const nameEl = card.querySelector('.card-info');
        const subInfoEl = card.querySelector('.card-sub-info');
        const detailsEl = card.querySelector('.details-section');

        const customerName = nameEl ? nameEl.textContent.toLowerCase() : '';
        const gstin = subInfoEl ? subInfoEl.textContent.toLowerCase() : '';
        const customerDetails = detailsEl ? detailsEl.textContent.toLowerCase() : '';

        if (customerName.includes(searchTerm) || gstin.includes(searchTerm) || customerDetails.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

async function editGSTCustomer(customerId) {
    try {
        const customer = await getFromDB('gstCustomers', customerId);
        if (customer) {
            currentlyEditingCustomerId = customerId;
            document.getElementById('add-gst-customer-modal-title').textContent = 'Edit GST Customer';
            document.getElementById('save-gst-customer-btn').textContent = 'Update GST Customer';

            // PROPERLY FILL ALL FORM FIELDS
            document.getElementById('saved-gst-customer-name').value = customer.name || '';
            document.getElementById('saved-gst-customer-address').value = customer.address || '';
            document.getElementById('saved-gst-customer-phone').value = customer.phone || '';
            document.getElementById('saved-gst-customer-gstin').value = customer.gstin || '';
            document.getElementById('saved-gst-customer-state').value = customer.state || '';
            document.getElementById('saved-gst-customer-state-code').value = customer.stateCode || '';
            document.getElementById('saved-gst-customer-email').value = customer.email || '';

            document.getElementById('add-gst-customer-modal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error editing GST customer:', error);
        showNotification('Error loading customer for editing', 'error');
    }
}

async function deleteGSTCustomer(customerId) {
    const shouldDeleteGstcustomer = await showConfirm('Are you sure you want to delete this GST customer?');
    if (shouldDeleteGstcustomer) {
        try {
            await removeFromDB('gstCustomers', customerId);
            await loadGSTCustomersList();
        } catch (error) {
            console.error('Error deleting GST customer:', error);
        }
    }
}

function openGSTSavedBillsModal() {
    document.getElementById('gst-saved-bills-modal').style.display = 'block';
    loadGSTSavedBillsList();
}

function closeGSTSavedBillsModal() {
    document.getElementById('gst-saved-bills-modal').style.display = 'none';
}

async function autoSaveGSTCustomer() {
    // 1. Try to get data from INPUTS first (High Fidelity Data)
    // We check if elements exist to prevent errors if modal isn't injected
    let name = document.getElementById('consignee-name') ? document.getElementById('consignee-name').value.trim() : '';
    let gstin = document.getElementById('consignee-gst') ? document.getElementById('consignee-gst').value.trim() : '';
    let address = document.getElementById('consignee-address') ? document.getElementById('consignee-address').value.trim() : '';
    let state = document.getElementById('consignee-state') ? document.getElementById('consignee-state').value.trim() : '';
    let stateCode = document.getElementById('consignee-code') ? document.getElementById('consignee-code').value.trim() : '';
    let phone = document.getElementById('consignee-contact') ? document.getElementById('consignee-contact').value.trim() : '';

    // Check for Email input (safely)
    let email = '';
    if (document.getElementById('consignee-email')) {
        email = document.getElementById('consignee-email').value.trim();
    }

    // 2. Fallback to VIEW DATA if inputs are empty 
    // (e.g., if user clicks "Save Bill" without opening customer details modal)
    if (!name) {
        const nameEl = document.getElementById('billToName');
        if (nameEl) name = nameEl.textContent.trim();

        const gstinEl = document.getElementById('billToGstin');
        if (gstinEl) gstin = gstinEl.textContent.trim();
        if (gstin === 'customer 15-digit GSTIN' || gstin === 'N/A') gstin = '';

        const addrEl = document.getElementById('billToAddr');
        if (addrEl) address = addrEl.textContent.trim();

        // Note: View usually doesn't show State Code/Phone in the main header text, 
        // so we rely on defaults or what was previously loaded.
    }

    // Validation: Don't save placeholders
    if (!name || name === 'jhone doe' || name === 'Customer Name') return;

    try {
        const existingCustomers = await getAllFromDB('gstCustomers');

        // Check if customer exists by GSTIN (Strong match) or Name (Weak match)
        const existingIndex = existingCustomers.findIndex(c =>
            (gstin && c.value.gstin === gstin) ||
            (!gstin && c.value.name.toLowerCase() === name.toLowerCase())
        );

        const customerData = {
            name: name,
            address: address,
            gstin: gstin,
            state: state,
            stateCode: stateCode,
            phone: phone,
            email: email,
            timestamp: Date.now()
        };

        if (existingIndex >= 0) {
            // --- UPDATE EXISTING (Merge Data) ---
            const oldData = existingCustomers[existingIndex];

            // Merge strategy: New data overrides old data, but keep old if new is empty
            const mergedData = {
                ...oldData.value,
                ...customerData,
                phone: phone || oldData.value.phone || '',
                email: email || oldData.value.email || '',
                state: state || oldData.value.state || '',
                stateCode: stateCode || oldData.value.stateCode || ''
            };

            await setInDB('gstCustomers', oldData.id, mergedData);
            console.log('GST customer updated:', name);
        } else {
            // --- CREATE NEW ---
            const customerId = `gst-customer-${Date.now()}`;
            await setInDB('gstCustomers', customerId, customerData);
            console.log('GST customer created:', name);
        }
    } catch (error) {
        console.error('Error auto-saving GST customer:', error);
    }
}
function areGSTCustomerDetailsFilled() {
    const billToName = document.getElementById('billToName').textContent.trim();
    const billToAddr = document.getElementById('billToAddr').textContent.trim();
    const billToGstin = document.getElementById('billToGstin').textContent.trim();

    // Check if basic customer details are filled (not empty or placeholder)
    if (!billToName ||
        !billToAddr ||
        billToGstin === 'customer 15-digit GSTIN' ||
        billToName === 'jhone doe' ||
        billToAddr === 'new york city') {
        return false;
    }

    return true;
}

async function saveGSTCurrentBill() {
    console.log('Edit Mode:', editMode, 'Bill ID:', currentEditingBillId, 'Bill Type:', currentEditingBillType);
    if (!areGSTCustomerDetailsFilled()) {
        showNotification('Please fill customer details in GST mode', 'error');
        return;
    }


    const customerName = document.getElementById('billToName').textContent.trim();
    const invoiceNo = document.getElementById('bill-invoice-no').textContent.trim() || 'No Invoice Number';
    const totalAmount = document.getElementById('gst-grand-total').textContent || '0.00';

    // Check for duplicate invoice number in edit mode
    if (!editMode) {
        const isDuplicate = await checkDuplicateBillNumber(invoiceNo, 'gst');
        if (isDuplicate) {
            showNotification('Invoice number already exists! Please use a different number.', 'error');
            return;
        }
    }

    // Auto-save GST customer if doesn't exist
    await autoSaveGSTCustomer();

    try {
        const currentData = await getGSTBillData();
        if (!currentData) return;

        // Add item count calculation
        const itemCount = document.querySelectorAll('#createListManual tbody tr[data-id]').length;

        const savedBill = {
            ...currentData,
            title: `${customerName} - ${invoiceNo}`,
            totalAmount: totalAmount,
            timestamp: Date.now(),
            date: document.getElementById('bill-date-gst').textContent || new Date().toLocaleDateString(),
            itemCount: itemCount // Add this line
        };

        let billId;
        // In saveGSTCurrentBill() function, add this in the edit mode section:
        if (editMode && currentEditingBillId) {
            // EDIT MODE: Restore original stock first
            await restoreStockFromOriginalBill(currentEditingBillId);

            billId = currentEditingBillId;
            await setInDB('gstSavedBills', billId, savedBill);
            // Then reduce stock with new quantities
            await reduceStockOnSave();
            showNotification('GST Bill updated successfully!');
            resetEditMode();
        } else {
            // Normal mode: Create new bill
            billId = `gst-saved-bill-${Date.now()}`;
            await setInDB('gstSavedBills', billId, savedBill);
            // ADD STOCK REDUCTION HERE - for GST edit mode
            await reduceStockOnSave();
            showNotification('GST Bill saved successfully!');
        }

    } catch (error) {
        console.error('Error saving GST bill:', error);
        showNotification('Error saving GST bill');
    }
}

async function getGSTBillData() {
    const data = {
        company: companyInfo,
        customer: {
            billTo: {
                name: document.getElementById('billToName').textContent,
                address: document.getElementById('billToAddr').textContent,
                gstin: document.getElementById('billToGstin').textContent,
                contact: document.getElementById('billToContact').textContent,
                state: document.getElementById('billToState').textContent,
                stateCode: document.getElementById('billToStateCode').textContent,

            },
            shipTo: {
                name: document.getElementById('shipToName').textContent,
                address: document.getElementById('shipToAddr').textContent,
                gstin: document.getElementById('shipToGstin').textContent,
                contact: document.getElementById('shipToContact').textContent,
                state: document.getElementById('shipToState').textContent,
                stateCode: document.getElementById('shipToStateCode').textContent,
                placeOfSupply: document.getElementById('shipToPOS').textContent
            }
        },
        invoiceDetails: {
            number: document.getElementById('bill-invoice-no').textContent,
            date: document.getElementById('bill-date-gst').textContent
        },
        customerType: document.getElementById('customer-type').value,
        taxSettings: {
            transactionType: transactionType,
            gstPercent: currentGSTPercent,
            discountPercent: discountPercent
        },
        // === FIX: Save Adjustment Chain ===
        adjustmentChain: adjustmentChain,

        tableStructure: [],
        items: [],
        totals: {
            subtotal: parseFloat(document.getElementById('gst-sub-total')?.textContent) || 0,
            // Fallbacks for elements that might be hidden/missing if no adjustments
            cgst: parseFloat(document.getElementById('gst-cgst-amount')?.textContent) || 0,
            sgst: parseFloat(document.getElementById('gst-sgst-amount')?.textContent) || 0,
            igst: parseFloat(document.getElementById('gst-igst-amount')?.textContent) || 0,
            grandTotal: parseFloat(document.getElementById('gst-grand-total')?.textContent) || 0
        }
    };

    document.querySelectorAll('#gstCopyListManual tbody tr').forEach(row => {
        if (row.classList.contains('section-row')) {
            // Save section data
            const sectionId = row.getAttribute('data-section-id');
            const cell = row.querySelector('td');
            let sectionName = '';
            for (let node of cell.childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    sectionName = node.textContent.trim();
                    break;
                }
            }

            data.tableStructure.push({
                type: 'section',
                id: sectionId,
                name: sectionName,
                style: cell.getAttribute('style') || ''
            });
        } else if (row.getAttribute('data-id')) {
            // Save item data
            const cells = row.children;
            const particularsDiv = cells[1];
            const itemName = particularsDiv.querySelector('.itemNameClass')?.textContent.trim() || '';
            const notes = particularsDiv.querySelector('.notes')?.textContent || '';

            const itemObj = {
                type: 'item',
                id: row.getAttribute('data-id'),
                itemName: itemName,
                hsn: row.getAttribute('data-hsn') || '',
                quantity: cells[3].textContent,
                unit: cells[4].textContent,
                rate: parseFloat(cells[5].textContent).toFixed(2),
                amount: parseFloat(cells[6].textContent).toFixed(2),
                notes: notes,
                // Save Discount/Dim Data for reconstruction
                discountType: row.getAttribute('data-discount-type') || 'none',
                discountValue: row.getAttribute('data-discount-value') || 0,
                dimensionType: row.getAttribute('data-dimension-type') || 'none',
                dimensionValues: JSON.parse(row.getAttribute('data-dimension-values') || '[0,0,0]'),
                dimensionUnit: row.getAttribute('data-dimension-unit') || 'ft',
                originalQuantity: row.getAttribute('data-original-quantity'),
                particularsHtml: particularsDiv.innerHTML
            };

            data.tableStructure.push(itemObj);
            data.items.push(itemObj);
        }
    });

    return data;
}


/* 3. LOAD GST SAVED BILLS (Ensures Button Exists) */
async function loadGSTSavedBillsList() {
    try {
        const savedBills = await getAllFromDB('gstSavedBills');
        const billsList = document.getElementById('saved-bills-list');
        billsList.innerHTML = '';

        if (savedBills.length === 0) {
            billsList.innerHTML = '<div class="saved-bill-card">No GST bills saved yet</div>';
            return;
        }

        savedBills.sort((a, b) => {
            const timeA = a.value.createdAt || a.value.timestamp || 0;
            const timeB = b.value.createdAt || b.value.timestamp || 0;
            return timeB - timeA;
        });

        savedBills.forEach(bill => {
            const billCard = document.createElement('div');
            billCard.className = 'saved-bill-card';
            const menuId = `menu-gstbill-${bill.id}-${Date.now()}`;

            const invoiceNo = bill.value.invoiceDetails?.number || 'N/A';
            const custName = bill.value.customer?.billTo?.name || 'N/A';
            const gstin = bill.value.customer?.billTo?.gstin || '';

            // --- PREFILL DATA OBJECT ---
            const prefillData = JSON.stringify({
                type: 'Tax Invoice',
                prefix: '',
                no: invoiceNo
            }).replace(/"/g, '&quot;');

            billCard.innerHTML = `
                <div class="card-header-row">
                    <div class="card-info">
                        <span>${invoiceNo} - ${custName}</span>
                        <span class="card-sub-info">${gstin || 'No GSTIN'}</span>
                        <span class="card-sub-info" style="color:var(--primary-color)">₹${bill.value.totalAmount}</span>
                    </div>
                    <div class="card-controls">
                        <button class="icon-btn" onclick="toggleCardDetails(this)" title="Toggle Details">
                            <span class="material-icons">keyboard_arrow_down</span>
                        </button>
                        <div class="action-menu-container">
                            <button class="icon-btn" onclick="toggleActionMenu(event, '${menuId}')">
                                <span class="material-icons">more_vert</span>
                            </button>
                            <div id="${menuId}" class="action-dropdown">
                                <button class="dropdown-item" onclick="openPaymentDialog('${custName}', '${gstin}', 'gst', ${prefillData})">
                                    <span class="material-icons">payments</span> Payment & CN
                                </button>
                                <button class="dropdown-item" onclick="downloadBillAsJson('${bill.id}', 'gst', event)">
                                    <span class="material-icons">download</span> Download JSON
                                </button>
                                <button class="dropdown-item" onclick="editSavedBill('${bill.id}', 'gst', event)">
                                    <span class="material-icons">edit</span> Edit
                                </button>
                                <button class="dropdown-item delete-item" onclick="deleteSavedBill('${bill.id}', 'gst', event)">
                                    <span class="material-icons">delete</span> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="details-section hidden saved-bill-details">
                    <div>Date: ${bill.value.date}</div>
                    <div>Items: ${bill.value.items?.length || bill.value.itemCount || 0}</div>
                    <div>Type: ${bill.value.taxSettings?.transactionType || 'N/A'}</div>
                </div>
            `;

            billCard.addEventListener('click', async (e) => {
                if (e.target.closest('.card-controls')) return;
                resetEditMode();
                await clearAllData(true);
                if (!isGSTMode) {
                    isGSTMode = true;
                    updateUIForGSTMode();
                }
                await loadGSTSavedBill(bill.id);
                closeSavedBillsModal();
                setTimeout(() => {
                    copyItemsToGSTBill();
                    updateGSTTaxCalculation();
                    resetColumnVisibility();
                }, 100);
            });
            billsList.appendChild(billCard);
        });
    } catch (error) {
        console.error('Error loading GST saved bills:', error);
    }
}

async function loadGSTSavedBill(billId) {
    try {
        const savedBill = await getFromDB('gstSavedBills', billId);
        if (!savedBill) return;

        // FIX: Persist GST Mode to DB so it stays in GST Mode after refresh
        await setInDB('gstMode', 'isGSTMode', true);


        // 1. Load company info
        if (savedBill.companyInfo) {
            companyInfo = savedBill.companyInfo;
            updateGSTBillCompanyInfo();
        }

        // 2. Load customer details to GST bill display
        if (savedBill.customer) {
            document.getElementById('billToName').textContent = savedBill.customer.billTo?.name || '';
            document.getElementById('billToAddr').textContent = savedBill.customer.billTo?.address || '';
            document.getElementById('billToGstin').textContent = savedBill.customer.billTo?.gstin || 'customer 15-digit GSTIN';
            document.getElementById('billToContact').textContent = savedBill.customer.billTo?.contact || '';
            document.getElementById('billToState').textContent = savedBill.customer.billTo?.state || '';
            document.getElementById('billToStateCode').textContent = savedBill.customer.billTo?.stateCode || '';

            // ALSO FILL CUSTOMER DETAILS DIALOG FORM
            document.getElementById('consignee-name').value = savedBill.customer.billTo?.name || '';
            document.getElementById('consignee-address').value = savedBill.customer.billTo?.address || '';
            document.getElementById('consignee-gst').value = savedBill.customer.billTo?.gstin || '';
            document.getElementById('consignee-state').value = savedBill.customer.billTo?.state || '';
            document.getElementById('consignee-code').value = savedBill.customer.billTo?.stateCode || '';
            document.getElementById('consignee-contact').value = savedBill.customer.billTo?.contact || '';

            // Handle ship to section - USE THE SAVED CUSTOMER TYPE
            const shipToDiv = document.getElementById('shipTo');
            if (savedBill.customerType === 'both' && savedBill.customer.shipTo?.name) {
                shipToDiv.style.display = 'block';
                document.getElementById('shipToName').textContent = savedBill.customer.shipTo.name;
                document.getElementById('shipToAddr').textContent = savedBill.customer.shipTo.address;
                document.getElementById('shipToGstin').textContent = savedBill.customer.shipTo.gstin;
                document.getElementById('shipToContact').textContent = savedBill.customer.shipTo?.contact || '';
                document.getElementById('shipToState').textContent = savedBill.customer.shipTo.state;
                document.getElementById('shipToStateCode').textContent = savedBill.customer.shipTo.stateCode;
                document.getElementById('shipToPOS').textContent = savedBill.customer.shipTo.placeOfSupply;

                // ALSO FILL SHIP TO IN CUSTOMER DETAILS DIALOG
                document.getElementById('buyer-name').value = savedBill.customer.shipTo?.name || '';
                document.getElementById('buyer-address').value = savedBill.customer.shipTo?.address || '';
                document.getElementById('buyer-gst').value = savedBill.customer.shipTo?.gstin || '';
                document.getElementById('buyer-state').value = savedBill.customer.shipTo?.state || '';
                document.getElementById('buyer-code').value = savedBill.customer.shipTo?.stateCode || '';
                document.getElementById('buyer-contact').value = savedBill.customer.shipTo?.contact || '';
                document.getElementById('place-of-supply').value = savedBill.customer.shipTo?.placeOfSupply || '';
            } else {
                shipToDiv.style.display = 'none';
            }
        }

        // 3. Load invoice details
        if (savedBill.invoiceDetails) {
            document.getElementById('bill-invoice-no').textContent = savedBill.invoiceDetails.number;
            document.getElementById('bill-date-gst').textContent = savedBill.invoiceDetails.date;

            // ALSO FILL INVOICE DETAILS IN CUSTOMER DIALOG FORM
            document.getElementById('invoice-no').value = savedBill.invoiceDetails.number || '';
            document.getElementById('invoice-date').value = savedBill.invoiceDetails?.date || '';
        }

        if (savedBill.customerType) {
            document.getElementById('customer-type').value = savedBill.customerType;
            handleCustomerTypeChange();
        }

        // 4. Load tax settings variables
        if (savedBill.taxSettings) {
            transactionType = savedBill.taxSettings.transactionType || 'intrastate';
            currentGSTPercent = savedBill.taxSettings.gstPercent || 18;
            discountPercent = savedBill.taxSettings.discountPercent || 0;
        }

        // === 5. RESTORE ADJUSTMENT CHAIN (With Legacy Migration) ===
        if (savedBill.adjustmentChain) {
            adjustmentChain = savedBill.adjustmentChain;
        } else if (savedBill.taxSettings) {
            // Migrate Legacy Bills
            adjustmentChain = [];
            // Migrate Discount
            if (savedBill.taxSettings.discountPercent > 0) {
                adjustmentChain.push({
                    id: 'legacy-discount', name: 'Discount', type: 'percent',
                    value: savedBill.taxSettings.discountPercent, operation: 'subtract', textColor: '#e74c3c'
                });
            } else if (savedBill.taxSettings.discountAmount > 0) {
                adjustmentChain.push({
                    id: 'legacy-discount', name: 'Discount', type: 'amount',
                    value: savedBill.taxSettings.discountAmount, operation: 'subtract', textColor: '#e74c3c'
                });
            }
            // Migrate GST
            if (savedBill.taxSettings.gstPercent > 0) {
                adjustmentChain.push({
                    id: 'legacy-gst', name: 'GST', type: 'percent',
                    value: savedBill.taxSettings.gstPercent, operation: 'add', textColor: '#27ae60'
                });
            }
        } else {
            adjustmentChain = [];
        }

        // 6. Clear current items and load saved items
        const createListTbody = document.querySelector("#createListManual tbody");
        const copyListTbody = document.querySelector("#copyListManual tbody");
        const gstListTbody = document.querySelector("#gstCopyListManual tbody");

        createListTbody.innerHTML = "";
        copyListTbody.innerHTML = "";
        if (gstListTbody) gstListTbody.innerHTML = "";

        // Load table structure (sections + items in order)
        if (savedBill.tableStructure && savedBill.tableStructure.length > 0) {
            let maxId = 0;
            savedBill.tableStructure.forEach(rowData => {
                if (rowData.type === 'section') {
                    createSectionInAllTablesFromSaved(rowData);
                } else if (rowData.type === 'item') {
                    // Create item in all tables
                    createItemInAllTablesFromSaved({
                        type: 'item',
                        id: rowData.id,
                        itemName: rowData.itemName,
                        quantity: rowData.quantity,
                        unit: rowData.unit,
                        rate: parseFloat(rowData.rate),
                        amount: parseFloat(rowData.amount),
                        notes: rowData.notes,
                        dimensionType: rowData.dimensionType,
                        dimensionValues: rowData.dimensionValues,
                        dimensionUnit: rowData.dimensionUnit,
                        hsnCode: rowData.hsn,
                        productCode: rowData.productCode,
                        discountType: rowData.discountType,
                        discountValue: rowData.discountValue,
                        // Pass through new fields if they exist
                        dimensionToggles: rowData.dimensionToggles,
                        convertUnit: rowData.convertUnit
                    });

                    const idNum = parseInt(rowData.id.split('-')[2]);
                    if (idNum > maxId) maxId = idNum;
                }
            });
            rowCounterManual = maxId + 1;
        }
        // Backward compatibility
        else if (savedBill.items && savedBill.items.length > 0) {
            let maxId = 0;
            savedBill.items.forEach(item => {
                createItemInAllTablesFromSaved({
                    type: 'item',
                    id: item.id,
                    itemName: item.itemName,
                    quantity: item.quantity,
                    unit: item.unit,
                    rate: parseFloat(item.rate),
                    amount: parseFloat(item.amount),
                    notes: item.notes,
                    dimensionType: item.dimensionType,
                    dimensionValues: item.dimensionValues,
                    dimensionUnit: item.dimensionUnit,
                    hsnCode: item.hsn,
                    productCode: item.productCode,
                    discountType: item.discountType,
                    discountValue: item.discountValue
                });

                const idNum = parseInt(item.id.split('-')[2]);
                if (idNum > maxId) maxId = idNum;
            });
            rowCounterManual = maxId + 1;
        }

        updateSerialNumbers();

        // 7. Update Calculations (uses the loaded adjustmentChain)
        updateTotal();

        if (isGSTMode) {
            copyItemsToGSTBill();
            updateGSTTaxCalculation();
        }

        // 8. Save the loaded state
        await saveToLocalStorage();
        saveStateToHistory();
        await saveCustomerDialogState();

        // Store invoice data for modal
        window.currentSavedBillInvoiceData = {
            number: savedBill.invoiceDetails?.number,
            date: savedBill.invoiceDetails?.date
        };

        showNotification('GST bill loaded successfully');

        // 9. FORCE REFRESH THE BILL DISPLAY
        setTimeout(() => {
            updateGSTBillDisplay();
            copyItemsToGSTBill();
            updateGSTTaxCalculation();

            // Recalculate totals one last time to ensure UI sync with adjustment chain
            updateTotal();

            // Ensure customer details visible
            if (savedBill.customer) {
                document.getElementById('billToName').textContent = savedBill.customer.billTo?.name || '';
                // ... (other field updates handled by updateGSTBillDisplay) ...
            }
        }, 100);

    } catch (error) {
        console.error('Error loading GST saved bill:', error);
        showNotification('Error loading GST bill', 'error');
    }
    await saveToLocalStorage();
}

function updateGSTBillDisplay() {
    if (!isGSTMode) return;

    // Safety check - only proceed if GST bill container exists and is visible
    const gstBillContainer = document.getElementById('gst-bill-container');
    if (!gstBillContainer || gstBillContainer.style.display === 'none') {
        return; // GST bill not visible, skip update
    }

    // Update company details if available - with safety checks
    if (companyInfo) {
        const gstCompanyNameEl = document.getElementById('gstCompanyName');
        const gstCompanyAddrEl = document.getElementById('gstCompanyAddr');
        const gstCompanyGstinEl = document.getElementById('gstCompanyGstin');
        const gstCompanyPhoneEl = document.getElementById('gstCompanyPhone');
        const gstCompanyEmailEl = document.getElementById('gstCompanyEmail');

        if (gstCompanyNameEl) gstCompanyNameEl.textContent = companyInfo.name || 'COMPANY NAME';
        if (gstCompanyAddrEl) gstCompanyAddrEl.textContent = companyInfo.address || 'Address';
        if (gstCompanyGstinEl) gstCompanyGstinEl.textContent = companyInfo.gstin || 'Your 15-digit GSTIN';
        if (gstCompanyPhoneEl) gstCompanyPhoneEl.textContent = companyInfo.mobile || '+91 1234567890';
        if (gstCompanyEmailEl) gstCompanyEmailEl.textContent = companyInfo.email || 'abcd@gmail.com';
    }

    // Copy items from regular table to GST table
    copyItemsToGSTBill();

    // Update totals and tax calculations (with safety check inside the function)
    updateGSTTaxCalculation();

    // FIX: Calculate and insert section total rows for GST table
    updateSectionTotals();
}

function copyItemsToGSTBill() {
    const regularTable = document.querySelector('#copyListManual tbody');
    const gstTable = document.querySelector('#gstCopyListManual tbody');

    if (!regularTable || !gstTable) return;

    // Clear GST table first
    gstTable.innerHTML = '';

    // Copy ALL rows (both sections and items) from regular table to GST table
    const regularRows = regularTable.querySelectorAll('tr');
    let itemCounter = 0;

    regularRows.forEach((regularRow) => {
        if (regularRow.classList.contains('section-row')) {
            // Handle section rows
            const sectionId = regularRow.getAttribute('data-section-id');
            // FIX: Get the show-total attribute from the source row
            const showTotal = regularRow.getAttribute('data-show-total');

            const cell = regularRow.querySelector('td');
            // Clean name: remove buttons text if present
            const name = cell.textContent.replace('−', '').replace('+', '').trim();
            const styleString = cell.getAttribute('style') || '';

            // Create section row for GST table with JUST THE NAME (no buttons)
            const gstRow = document.createElement('tr');
            gstRow.className = 'section-row';
            gstRow.setAttribute('data-section-id', sectionId);
            // FIX: Set the attribute on the new GST row
            if (showTotal) gstRow.setAttribute('data-show-total', showTotal);

            gstRow.setAttribute('draggable', 'true');

            gstRow.innerHTML = `
                <td colspan="8" style="${styleString}">
                    ${name}
                </td>
            `;

            addDragAndDropListeners(gstRow);
            gstTable.appendChild(gstRow);
        } else if (regularRow.getAttribute('data-id')) {
            // Handle item rows - increment counter only for items
            itemCounter++;

            const cells = regularRow.children;
            const particularsDiv = cells[1];

            // Get HSN from saved item if available
            let hsnCode = regularRow.getAttribute('data-hsn') || '';

            // Get the ADJUSTED rate from the regular table
            const adjustedRate = parseFloat(cells[4].textContent) || 0;
            const adjustedAmount = parseFloat(cells[5].textContent) || 0;

            // Create GST table row with the ADJUSTED rate
            const gstRow = document.createElement('tr');
            gstRow.setAttribute('data-id', regularRow.getAttribute('data-id'));
            gstRow.setAttribute('data-hsn', hsnCode);

            // Copy all data attributes including adjusted rates
            const attributes = ['data-dimension-type', 'data-dimension-values', 'data-dimension-unit', 'data-original-quantity', 'data-product-code', 'data-discount-type', 'data-discount-value', 'data-rate', 'data-amount', 'data-original-rate'];
            attributes.forEach(attr => {
                if (regularRow.hasAttribute(attr)) {
                    gstRow.setAttribute(attr, regularRow.getAttribute(attr));
                }
            });

            gstRow.innerHTML = `
                <td class="sr-no">${itemCounter}</td>
                <td>${particularsDiv.innerHTML}</td>
                <td>${hsnCode}</td>
                <td>${cells[2].textContent}</td>
                <td>${cells[3].textContent}</td>
                <td>${adjustedRate.toFixed(2)}</td>
                <td class="amount">${adjustedAmount.toFixed(2)}</td>
            `;

            addDragAndDropListeners(gstRow);
            gstTable.appendChild(gstRow);
        }
    });

    // Update GST calculations after copying items
    updateGSTTaxCalculation();

    // FIX: Explicitly call updateSectionTotals here to ensure they appear immediately
    updateSectionTotals();
}

//GST STATE SAVE
async function saveGSTStateToDB() {
    if (!isGSTMode) return;

    const gstState = {
        companyInfo: companyInfo,
        customerDetails: {
            billTo: {
                name: document.getElementById('billToName').textContent,
                address: document.getElementById('billToAddr').textContent,
                gstin: document.getElementById('billToGstin').textContent,
                state: document.getElementById('billToState').textContent,
                stateCode: document.getElementById('billToStateCode').textContent
            },
            shipTo: {
                name: document.getElementById('shipToName').textContent,
                address: document.getElementById('shipToAddr').textContent,
                gstin: document.getElementById('shipToGstin').textContent,
                state: document.getElementById('shipToState').textContent,
                stateCode: document.getElementById('shipToStateCode').textContent,
                placeOfSupply: document.getElementById('shipToPOS').textContent
            }
        },
        invoiceDetails: {
            number: document.getElementById('bill-invoice-no').textContent,
            date: document.getElementById('bill-date-gst').textContent
        },
        taxSettings: {
            transactionType: transactionType,
            gstPercent: currentGSTPercent,
            discountPercent: discountPercent
        },
        items: await getGSTItemsData(),
        timestamp: Date.now()
    };

    await setInDB('gstMode', 'currentGSTState', gstState);
}

async function getGSTItemsData() {
    const items = [];
    document.querySelectorAll('#gstCopyListManual tbody tr[data-id]').forEach(row => {
        const cells = row.children;
        const particularsDiv = cells[1];
        const itemName = particularsDiv.querySelector('.itemNameClass')?.textContent.trim() || '';
        const notes = particularsDiv.querySelector('.notes')?.textContent || '';

        items.push({
            id: row.getAttribute('data-id'),
            itemName: itemName,
            hsn: row.getAttribute('data-hsn') || '',
            quantity: cells[3].textContent,
            unit: cells[4].textContent,
            rate: parseFloat(cells[5].textContent).toFixed(2),
            amount: parseFloat(cells[6].textContent).toFixed(2),
            notes: notes
        });
    });
    return items;
}

// Load GST state on initialization
async function loadGSTStateFromDB() {
    if (!isGSTMode) return;

    try {
        const gstState = await getFromDB('gstMode', 'currentGSTState');
        if (gstState) {
            // Load GST state here
            console.log('Loaded GST state:', gstState);
        }
    } catch (error) {
        console.error('Error loading GST state:', error);
    }
}

// Save customer dialog state
async function saveCustomerDialogState() {
    const customerState = {
        customerType: document.getElementById('customer-type').value,
        invoiceNo: document.getElementById('invoice-no').value,
        invoiceDate: document.getElementById('invoice-date').value,
        gstPercent: document.getElementById('gst-percent-input').value,
        transactionType: document.getElementById('transaction_type').value,

        // Bill To details
        consigneeName: document.getElementById('consignee-name').value,
        consigneeAddress: document.getElementById('consignee-address').value,
        consigneeGst: document.getElementById('consignee-gst').value,
        consigneeState: document.getElementById('consignee-state').value,
        consigneeCode: document.getElementById('consignee-code').value,
        consigneeContact: document.getElementById('consignee-contact').value, // ADD THIS LINE

        // Ship To details
        buyerName: document.getElementById('buyer-name').value,
        buyerAddress: document.getElementById('buyer-address').value,
        buyerGst: document.getElementById('buyer-gst').value,
        buyerState: document.getElementById('buyer-state').value,
        buyerCode: document.getElementById('buyer-code').value,
        buyerContact: document.getElementById('buyer-contact').value, // ADD THIS LINE
        placeOfSupply: document.getElementById('place-of-supply').value,

        timestamp: Date.now()
    };

    await setInDB('gstMode', 'customerDialogState', customerState);
}

// Load customer dialog state
async function loadCustomerDialogState() {
    try {
        const customerState = await getFromDB('gstMode', 'customerDialogState');
        if (customerState) {
            // Restore form values
            document.getElementById('customer-type').value = customerState.customerType || 'bill-to';
            // Update visibility based on customer type
            handleCustomerTypeChange();
            document.getElementById('invoice-no').value = customerState.invoiceNo || '';

            // Handle date format conversion if needed
            // let invoiceDate = customerState.invoiceDate || '';
            // if (invoiceDate && invoiceDate.includes('-')) {
            //     // Convert from yyyy-mm-dd to dd/mm/yyyy
            //     const [year, month, day] = invoiceDate.split('-');
            //     invoiceDate = `${day}-${month}-${year}`;
            // }
            // document.getElementById('invoice-date').value = invoiceDate;
            document.getElementById('invoice-date').value = customerState.invoiceDate || '';

            document.getElementById('gst-percent-input').value = customerState.gstPercent || '18';
            document.getElementById('transaction_type').value = customerState.transactionType || 'intrastate';

            // Restore Bill To details
            document.getElementById('consignee-name').value = customerState.consigneeName || '';
            document.getElementById('consignee-address').value = customerState.consigneeAddress || '';
            document.getElementById('consignee-gst').value = customerState.consigneeGst || '';
            document.getElementById('consignee-contact').value = customerState.consigneeContact || '';
            document.getElementById('consignee-state').value = customerState.consigneeState || '';
            document.getElementById('consignee-code').value = customerState.consigneeCode || '';
            document.getElementById('consignee-contact').value = customerState.consigneeContact || '';

            // Restore Ship To details
            document.getElementById('buyer-name').value = customerState.buyerName || '';
            document.getElementById('buyer-address').value = customerState.buyerAddress || '';
            document.getElementById('buyer-gst').value = customerState.buyerGst || '';
            document.getElementById('buyer-contact').value = customerState.buyerContact || '';
            document.getElementById('buyer-state').value = customerState.buyerState || '';
            document.getElementById('buyer-code').value = customerState.buyerCode || '';
            document.getElementById('buyer-contact').value = customerState.buyerContact || '';
            document.getElementById('place-of-supply').value = customerState.placeOfSupply || '';

            // Update visibility based on customer type
            handleCustomerTypeChange();

            // NEW: Also update bill view with the loaded customer data
            document.getElementById('bill-invoice-no').textContent = customerState.invoiceNo || '';
            document.getElementById('bill-date-gst').textContent = formatDateForDisplay(customerState.invoiceDate) || '';

            document.getElementById('billToName').textContent = customerState.consigneeName || '';
            document.getElementById('billToAddr').textContent = customerState.consigneeAddress || '';
            document.getElementById('billToGstin').textContent = customerState.consigneeGst || 'customer 15-digit GSTIN';
            document.getElementById('billToContact').textContent = customerState.consigneeContact || 'Not provided';
            document.getElementById('billToState').textContent = customerState.consigneeState || '';
            document.getElementById('billToStateCode').textContent = customerState.consigneeCode || '27';

            if (customerState.customerType === 'both') {
                document.getElementById('shipTo').style.display = 'block';
                document.getElementById('shipToName').textContent = customerState.buyerName || '';
                document.getElementById('shipToAddr').textContent = customerState.buyerAddress || '';
                document.getElementById('shipToGstin').textContent = customerState.buyerGst || 'customer 15-digit GSTIN';
                document.getElementById('shipToContact').textContent = customerState.buyerContact || 'Not provided';
                document.getElementById('shipToState').textContent = customerState.buyerState || '';
                document.getElementById('shipToStateCode').textContent = customerState.buyerCode || '';
                document.getElementById('shipToPOS').textContent = customerState.placeOfSupply || '';
            } else {
                document.getElementById('shipTo').style.display = 'none';
            }
        } else {
            // NEW: If no saved state, set defaults
            document.getElementById('customer-type').value = 'bill-to';
            document.getElementById('gst-percent-input').value = '18';
            document.getElementById('transaction_type').value = 'intrastate';
            document.getElementById('consignee-state').value = '';
            document.getElementById('consignee-code').value = '';
            document.getElementById('buyer-state').value = '';
            document.getElementById('buyer-code').value = '';
            document.getElementById('place-of-supply').value = '';

            // ADD THIS: Set today's date as default
            const today = new Date();
            const day = String(today.getDate()).padStart(2, '0');
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const year = today.getFullYear();
            document.getElementById('invoice-date').value = `${day}-${month}-${year}`;

            handleCustomerTypeChange();
        }
    } catch (error) {
        console.error('Error loading customer dialog state:', error);
    }
    // Also update Bill View with the loaded contact numbers
    document.getElementById('billToContact').textContent = document.getElementById('consignee-contact').value || 'Not provided';
    if (document.getElementById('customer-type').value === 'both') {
        document.getElementById('shipToContact').textContent = document.getElementById('buyer-contact').value || 'Not provided';
    }
}
function openCustomerDetailsModal() {
    document.getElementById('customer-details-modal').style.display = 'block';

    // REMOVE any code that resets the form values here
    // The form should already have the saved state from loadCustomerDialogState()

    // Check if we're in edit mode and disable invoice number field
    const invoiceNoInput = document.getElementById('invoice-no');
    if (editMode && currentEditingBillId) {
        invoiceNoInput.disabled = true;
        invoiceNoInput.style.backgroundColor = '#f5f5f5';
        invoiceNoInput.title = 'Invoice number cannot be changed in edit mode';
    } else {
        invoiceNoInput.disabled = false;
        invoiceNoInput.style.backgroundColor = '';
        invoiceNoInput.title = '';
    }

    // Check if we have saved bill invoice data (for loaded bills)
    if (window.currentSavedBillInvoiceData) {
        // Use saved bill's invoice data
        document.getElementById('invoice-no').value = window.currentSavedBillInvoiceData.number || '';
        document.getElementById('invoice-date').value = window.currentSavedBillInvoiceData?.date || '';

        // Clear the stored data after using it
        window.currentSavedBillInvoiceData = null;
    }
    // If no saved bill data, the form should keep its current state

    showCustomerDetailsSummary();
}

// NEW: Function to show customer details summary in the modal
function showCustomerDetailsSummary() {
    const invoiceNo = document.getElementById('invoice-no').value;
    const invoiceDate = document.getElementById('invoice-date').value;

    // You can add this summary display in your modal HTML or as a notification
    console.log('Customer Details - Invoice:', invoiceNo, 'Date:', invoiceDate);
}


// [REPLACE EXISTING saveCustomerDetails FUNCTION]
async function saveCustomerDetails() {
    const invoiceNo = document.getElementById('invoice-no').value.trim();
    const invoiceDate = document.getElementById('invoice-date').value;
    const gstPercent = parseFloat(document.getElementById('gst-percent-input').value);
    const customerType = document.getElementById('customer-type').value;

    // 1. Check for duplicate invoice number
    if (typeof editMode !== 'undefined' && editMode && typeof currentEditingBillId !== 'undefined' && currentEditingBillId) {
        // Edit Mode: Check only if number changed
        if (typeof window.currentEditingBillOriginalNumber !== 'undefined' && invoiceNo !== window.currentEditingBillOriginalNumber) {
            const isDuplicate = await checkDuplicateInvoiceNumber(invoiceNo);
            if (isDuplicate) {
                showNotification('Invoice number already exists! Please use a different number.', 'error');
                return;
            }
        }
    } else {
        // New Bill Mode
        const isDuplicate = await checkDuplicateInvoiceNumber(invoiceNo);
        if (isDuplicate) {
            showNotification('Invoice number already exists! Please use a different number.', 'error');
            return;
        }
    }

    // 2. Update GST bill header (Visuals)
    document.getElementById('bill-invoice-no').textContent = invoiceNo;
    document.getElementById('bill-date-gst').textContent = typeof formatDateForDisplay === 'function' ? formatDateForDisplay(invoiceDate) : invoiceDate;

    // 3. Update Bill To details (Visuals)
    document.getElementById('billToName').textContent = document.getElementById('consignee-name').value;
    document.getElementById('billToAddr').textContent = document.getElementById('consignee-address').value;
    document.getElementById('billToGstin').textContent = document.getElementById('consignee-gst').value;
    document.getElementById('billToState').textContent = document.getElementById('consignee-state').value;
    document.getElementById('billToStateCode').textContent = document.getElementById('consignee-code').value;
    document.getElementById('billToContact').textContent = document.getElementById('consignee-contact').value || '';

    // 4. Update Ship To details (Visuals)
    const shipToDiv = document.getElementById('shipTo');
    if (customerType === 'both') {
        shipToDiv.style.display = 'block';
        document.getElementById('shipToName').textContent = document.getElementById('buyer-name').value;
        document.getElementById('shipToAddr').textContent = document.getElementById('buyer-address').value;
        document.getElementById('shipToGstin').textContent = document.getElementById('buyer-gst').value;
        document.getElementById('shipToContact').textContent = document.getElementById('buyer-contact').value || '';
        document.getElementById('shipToState').textContent = document.getElementById('buyer-state').value;
        document.getElementById('shipToStateCode').textContent = document.getElementById('buyer-code').value;
        document.getElementById('shipToPOS').textContent = document.getElementById('place-of-supply').value;
    } else {
        shipToDiv.style.display = 'none';
    }

    // 5. Update Global Variables
    if (document.getElementById('transaction_type')) {
        transactionType = document.getElementById('transaction_type').value;
    }
    currentGSTPercent = gstPercent;

    // --- NEW: SAVE CUSTOMER TO DB ---
    // This grabs the Email, Phone, etc. from the inputs and saves/updates the GST Customer DB
    await autoSaveGSTCustomer();
    // -------------------------------

    // 6. Auto-apply rates logic
    if (typeof autoApplyCustomerRates !== 'undefined' && autoApplyCustomerRates) {
        const gstin = document.getElementById('consignee-gst').value.trim();
        if (gstin) {
            await checkAndApplyCustomerRates(gstin);
        }
    }

    // 7. Save states
    if (typeof saveCustomerDialogState === 'function') await saveCustomerDialogState();
    if (typeof saveGSTCustomerDataToLocalStorage === 'function') await saveGSTCustomerDataToLocalStorage();

    closeCustomerDetailsModal();

    // 8. Refresh Calculations & UI
    // Force Table Regeneration (Handles display:none logic based on new transactionType)
    if (typeof updateTotal === 'function') updateTotal();

    // Update breakdown table
    if (typeof updateGSTTaxCalculation === 'function') updateGSTTaxCalculation();
    if (typeof saveGSTStateToDB === 'function') await saveGSTStateToDB();

    showNotification('Customer details saved successfully!', 'success');
}

// Add auto-save on input changes
function setupCustomerDialogAutoSave() {
    const inputs = [
        'customer-type', 'invoice-no', 'invoice-date', 'gst-percent-input', 'transaction_type',
        'consignee-name', 'consignee-address', 'consignee-gst', 'consignee-state', 'consignee-code', 'consignee-contact',
        'buyer-name', 'buyer-address', 'buyer-gst', 'buyer-state', 'buyer-code', 'buyer-contact', 'place-of-supply',
        'invoice-no',
        'invoice-date'
    ];

    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', debounce(saveCustomerDialogState, 1000));
            element.addEventListener('change', saveCustomerDialogState);
        }
    });
}

// Debounce function to prevent too many saves
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}



// Add click handlers for section editing to all tables
document.addEventListener('click', function (e) {
    // Check if click is on a section row (but not the collapse button)
    const sectionRow = e.target.closest('.section-row');
    if (sectionRow && !e.target.classList.contains('collapse-btn')) {
        const sectionId = sectionRow.getAttribute('data-section-id');
        if (sectionId) {
            editSection(sectionId);
        }
    }
});
function handlePaddingTypeChange() {
    const paddingType = document.getElementById('section-padding-type').value;
    const singlePaddingGroup = document.getElementById('single-padding-group');
    const customPaddingGroup = document.getElementById('custom-padding-group');

    if (paddingType === 'custom') {
        singlePaddingGroup.style.display = 'none';
        customPaddingGroup.style.display = 'block';
    } else if (paddingType === '') {
        singlePaddingGroup.style.display = 'none';
        customPaddingGroup.style.display = 'none';
    } else {
        singlePaddingGroup.style.display = 'block';
        customPaddingGroup.style.display = 'none';
    }
}

function updateSectionTotals() {
    const tables = ['createListManual', 'copyListManual', 'gstCopyListManual'];

    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;

        // Remove existing total rows to avoid duplicates
        table.querySelectorAll('.section-total-row').forEach(row => row.remove());

        const rows = Array.from(table.querySelectorAll('tbody tr'));
        let currentSectionId = null;
        let currentSectionTotal = 0;
        let currentSectionName = '';
        let showTotalForCurrent = false;
        let lastItemRow = null;

        const insertTotalRow = () => {
            if (showTotalForCurrent && lastItemRow && currentSectionTotal > 0) {
                const totalRow = document.createElement('tr');
                totalRow.className = 'section-total-row';
                totalRow.setAttribute('data-for-section', currentSectionId);

                // Determine colspan based on table structure
                let labelColSpan;
                // GST Table: Sr, Particulars, HSN, Qty, Unit, Rate, Amount (Index 6)
                // Regular Table: Sr, Particulars, Qty, Unit, Rate, Amount (Index 5)
                if (tableId === 'gstCopyListManual') {
                    labelColSpan = 6;
                } else {
                    labelColSpan = 5;
                }

                const labelCell = document.createElement('td');
                labelCell.colSpan = labelColSpan;
                labelCell.style.textAlign = 'right';
                labelCell.style.fontWeight = 'bold';
                labelCell.style.paddingRight = '10px';
                labelCell.textContent = `Total :`;

                const amountCell = document.createElement('td');
                amountCell.style.textAlign = 'center';
                amountCell.style.fontWeight = 'bold';
                amountCell.textContent = currentSectionTotal.toFixed(2);

                totalRow.appendChild(labelCell);
                totalRow.appendChild(amountCell);

                // Add empty cell for Actions column if needed
                if (tableId === 'createListManual' || tableId === 'gstCopyListManual') {
                    const emptyCell = document.createElement('td');
                    // FIX: Add class to target this cell for visibility toggling
                    emptyCell.className = 'section-total-action-cell';
                    totalRow.appendChild(emptyCell);
                }

                lastItemRow.parentNode.insertBefore(totalRow, lastItemRow.nextSibling);
            }
        };

        rows.forEach(row => {
            if (row.classList.contains('section-row')) {
                // Close previous section
                if (currentSectionId) insertTotalRow();

                // Start new section
                currentSectionId = row.getAttribute('data-section-id');

                // Safely get text node only (ignoring buttons)
                const td = row.querySelector('td');
                currentSectionName = '';
                if (td) {
                    for (let node of td.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                            currentSectionName = node.textContent.trim();
                            break;
                        }
                    }
                }
                if (!currentSectionName) currentSectionName = 'Section';

                showTotalForCurrent = row.getAttribute('data-show-total') === 'true';
                currentSectionTotal = 0;
                lastItemRow = null;
            } else if (row.getAttribute('data-id')) {
                // Accumulate item
                if (currentSectionId) {
                    const amount = parseFloat(row.getAttribute('data-amount') || 0);
                    currentSectionTotal += amount;
                    lastItemRow = row;
                }
            }
        });

        // Handle last section
        if (currentSectionId) insertTotalRow();
    });
}

function resetSectionModal() {
    // Reset all fields to default values
    document.getElementById('section-name').value = '';
    document.getElementById('section-align').value = 'left';
    document.getElementById('section-font-weight').value = '600';
    document.getElementById('section-bg-color').value = '#ffe8b5';
    document.getElementById('section-font-color').value = '#000000';
    document.getElementById('section-font-size').value = '16';
    document.getElementById('section-text-transform').value = 'none';
    document.getElementById('section-padding-type').value = 'padding-left';
    document.getElementById('section-padding-value').value = '75';
    document.getElementById('section-show-total').checked = false; // NEW: Reset checkbox

    // Reset custom padding
    document.getElementById('section-padding-left').value = '';
    document.getElementById('section-padding-right').value = '';
    document.getElementById('section-padding-top').value = '';
    document.getElementById('section-padding-bottom').value = '';

    // Also reset the stored state to defaults
    sectionModalState = {
        align: 'center',
        fontWeight: '600',
        bgColor: '#ffe8b5',
        fontColor: '#000000',
        fontSize: '16',
        textTransform: 'none',
        paddingType: 'padding-left',
        paddingValue: '75',
        paddingLeft: '',
        paddingRight: '',
        paddingTop: '',
        paddingBottom: '',
        showTotal: false // NEW
    };

    // Reset visibility
    handlePaddingTypeChange();
}


function openSectionModal() {
    currentlyEditingSectionId = null;
    document.getElementById('section-modal-title').textContent = 'Create Section';
    document.getElementById('save-section-btn').textContent = 'Add Section';

    // Reset ONLY section name, preserve all styling from previous state
    document.getElementById('section-name').value = '';

    // Pre-fill with stored modal state (if available) instead of resetting
    document.getElementById('section-align').value = sectionModalState.align || 'left';
    document.getElementById('section-font-weight').value = sectionModalState.fontWeight || '600';
    document.getElementById('section-bg-color').value = sectionModalState.bgColor || '#ffe8b5';
    document.getElementById('section-font-color').value = sectionModalState.fontColor || '#000000';
    document.getElementById('section-font-size').value = sectionModalState.fontSize || '16';
    document.getElementById('section-text-transform').value = sectionModalState.textTransform || 'none';
    document.getElementById('section-padding-type').value = sectionModalState.paddingType || 'padding-left';
    document.getElementById('section-padding-value').value = sectionModalState.paddingValue || '75';

    // Handle custom padding if it was stored
    if (sectionModalState.paddingType === 'custom') {
        document.getElementById('section-padding-left').value = sectionModalState.paddingLeft || '';
        document.getElementById('section-padding-right').value = sectionModalState.paddingRight || '';
        document.getElementById('section-padding-top').value = sectionModalState.paddingTop || '';
        document.getElementById('section-padding-bottom').value = sectionModalState.paddingBottom || '';
    }

    // Update visibility based on padding type
    handlePaddingTypeChange();

    document.getElementById('section-modal').style.display = 'block';
}

function closeSectionModal() {
    document.getElementById('section-modal').style.display = 'none';
    currentlyEditingSectionId = null;
    // DON'T reset sectionModalState here - keep it for next time!
}

function editSection(sectionId) {
    const row = document.querySelector(`#createListManual tr[data-section-id="${sectionId}"]`);
    if (!row) return;

    currentlyEditingSectionId = sectionId;
    document.getElementById('section-modal-title').textContent = 'Edit Section';
    document.getElementById('save-section-btn').textContent = 'Update Section';

    const cell = row.querySelector('td');

    // Extract ONLY the section name (first text node) without any button text
    let sectionName = '';
    for (let node of cell.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            sectionName = node.textContent.trim();
            break;
        }
    }

    document.getElementById('section-name').value = sectionName;
    document.getElementById('section-align').value = cell.style.textAlign || 'left';
    document.getElementById('section-bg-color').value = rgbToHex(cell.style.backgroundColor) || '#ffe8b5';
    document.getElementById('section-font-color').value = rgbToHex(cell.style.color) || '#000000';
    document.getElementById('section-font-size').value = parseInt(cell.style.fontSize) || 16;
    document.getElementById('section-text-transform').value = cell.style.textTransform || 'none';

    // NEW: Load checkbox state
    const showTotal = row.getAttribute('data-show-total') === 'true';
    document.getElementById('section-show-total').checked = showTotal;

    // FIX: Parse padding correctly
    const paddingStyle = cell.style.padding || '';

    if (!paddingStyle) {
        // Handle individual padding properties
        const pl = parseInt(cell.style.paddingLeft) || 0;
        const pr = parseInt(cell.style.paddingRight) || 0;
        const pt = parseInt(cell.style.paddingTop) || 0;
        const pb = parseInt(cell.style.paddingBottom) || 0;

        setPaddingValues(pl, pr, pt, pb);
    } else {
        // Handle combined padding property (e.g., "10px 20px 15px 5px")
        const paddingValues = paddingStyle.split(' ').map(val => parseInt(val) || 0);

        if (paddingValues.length === 1) {
            // Single value: padding: 10px
            setPaddingValues(paddingValues[0], paddingValues[0], paddingValues[0], paddingValues[0]);
        } else if (paddingValues.length === 2) {
            // Two values: padding: 10px 20px (top-bottom, left-right)
            setPaddingValues(paddingValues[1], paddingValues[1], paddingValues[0], paddingValues[0]);
        } else if (paddingValues.length === 3) {
            // Three values: padding: 10px 20px 15px (top, left-right, bottom)
            setPaddingValues(paddingValues[1], paddingValues[1], paddingValues[0], paddingValues[2]);
        } else if (paddingValues.length === 4) {
            // Four values: padding: 10px 20px 15px 5px (top, right, bottom, left)
            setPaddingValues(paddingValues[3], paddingValues[1], paddingValues[0], paddingValues[2]);
        } else {
            setPaddingValues(0, 0, 0, 0);
        }
    }

    document.getElementById('section-modal').style.display = 'block';
}

// Helper function to set padding values in the modal
function setPaddingValues(left, right, top, bottom) {
    // Determine padding type based on the values
    if (left === right && top === bottom && left === top && left > 0) {
        // All sides equal
        document.getElementById('section-padding-type').value = 'padding-inline';
        document.getElementById('section-padding-value').value = left;
        document.getElementById('single-padding-group').style.display = 'block';
        document.getElementById('custom-padding-group').style.display = 'none';
    } else if (left === right && left > 0 && top === 0 && bottom === 0) {
        // Left and right only
        document.getElementById('section-padding-type').value = 'padding-inline';
        document.getElementById('section-padding-value').value = left;
        document.getElementById('single-padding-group').style.display = 'block';
        document.getElementById('custom-padding-group').style.display = 'none';
    } else if (top === bottom && top > 0 && left === 0 && right === 0) {
        // Top and bottom only
        document.getElementById('section-padding-type').value = 'padding-block';
        document.getElementById('section-padding-value').value = top;
        document.getElementById('single-padding-group').style.display = 'block';
        document.getElementById('custom-padding-group').style.display = 'none';
    } else if (left > 0 && right === 0 && top === 0 && bottom === 0) {
        // Left only
        document.getElementById('section-padding-type').value = 'padding-left';
        document.getElementById('section-padding-value').value = left;
        document.getElementById('single-padding-group').style.display = 'block';
        document.getElementById('custom-padding-group').style.display = 'none';
    } else if (right > 0 && left === 0 && top === 0 && bottom === 0) {
        // Right only
        document.getElementById('section-padding-type').value = 'padding-right';
        document.getElementById('section-padding-value').value = right;
        document.getElementById('single-padding-group').style.display = 'block';
        document.getElementById('custom-padding-group').style.display = 'none';
    } else if (top > 0 && bottom === 0 && left === 0 && right === 0) {
        // Top only
        document.getElementById('section-padding-type').value = 'padding-top';
        document.getElementById('section-padding-value').value = top;
        document.getElementById('single-padding-group').style.display = 'block';
        document.getElementById('custom-padding-group').style.display = 'none';
    } else if (bottom > 0 && top === 0 && left === 0 && right === 0) {
        // Bottom only
        document.getElementById('section-padding-type').value = 'padding-bottom';
        document.getElementById('section-padding-value').value = bottom;
        document.getElementById('single-padding-group').style.display = 'block';
        document.getElementById('custom-padding-group').style.display = 'none';
    } else if (top === bottom && left > 0 && right === 0) {
        // Top-Left-Bottom pattern
        document.getElementById('section-padding-type').value = 'top-left-bottom';
        document.getElementById('section-padding-value').value = left; // Using left as the common value
        document.getElementById('single-padding-group').style.display = 'block';
        document.getElementById('custom-padding-group').style.display = 'none';
    } else if (top === bottom && right > 0 && left === 0) {
        // Top-Right-Bottom pattern
        document.getElementById('section-padding-type').value = 'top-right-bottom';
        document.getElementById('section-padding-value').value = right; // Using right as the common value
        document.getElementById('single-padding-group').style.display = 'block';
        document.getElementById('custom-padding-group').style.display = 'none';
    } else {
        // Custom padding (different values for each side)
        document.getElementById('section-padding-type').value = 'custom';
        document.getElementById('section-padding-left').value = left;
        document.getElementById('section-padding-right').value = right;
        document.getElementById('section-padding-top').value = top;
        document.getElementById('section-padding-bottom').value = bottom;
        document.getElementById('single-padding-group').style.display = 'none';
        document.getElementById('custom-padding-group').style.display = 'block';
    }

    // Update the UI based on the selected padding type
    handlePaddingTypeChange();
}


function rgbToHex(rgb) {
    if (!rgb) return '';
    if (rgb.startsWith('#')) return rgb;
    const m = rgb.match(/\d+/g);
    if (!m) return '';
    const [r, g, b] = m.map(Number);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function saveSection() {
    const name = document.getElementById('section-name').value.trim();
    if (!name) {
        showNotification('Please enter a section name');
        return;
    }

    const align = document.getElementById('section-align').value;
    const fontWeight = document.getElementById('section-font-weight').value;
    const bgColor = document.getElementById('section-bg-color').value;
    const fontColor = document.getElementById('section-font-color').value;
    const fontSize = document.getElementById('section-font-size').value + 'px';
    const textTransform = document.getElementById('section-text-transform').value;
    const paddingType = document.getElementById('section-padding-type').value;
    const paddingValue = document.getElementById('section-padding-value').value;

    // FIX: Capture the checkbox state
    const showTotal = document.getElementById('section-show-total').checked;

    let paddingStyle = '';
    if (paddingType && paddingValue) {
        if (paddingType === 'custom') {
            const left = document.getElementById('section-padding-left').value || '0';
            const right = document.getElementById('section-padding-right').value || '0';
            const top = document.getElementById('section-padding-top').value || '0';
            const bottom = document.getElementById('section-padding-bottom').value || '0';
            paddingStyle = `padding: ${top}px ${right}px ${bottom}px ${left}px;`;
        } else if (paddingType === 'top-left-bottom') {
            paddingStyle = `padding-top: ${paddingValue}px; padding-left: ${paddingValue}px; padding-bottom: ${paddingValue}px;`;
        } else if (paddingType === 'top-right-bottom') {
            paddingStyle = `padding-top: ${paddingValue}px; padding-right: ${paddingValue}px; padding-bottom: ${paddingValue}px;`;
        } else if (paddingType === 'padding-inline') {
            paddingStyle = `padding-left: ${paddingValue}px; padding-right: ${paddingValue}px;`;
        } else if (paddingType === 'padding-block') {
            paddingStyle = `padding-top: ${paddingValue}px; padding-bottom: ${paddingValue}px;`;
        } else {
            paddingStyle = `${paddingType}: ${paddingValue}px;`;
        }
    }

    const styleString = `background-color: ${bgColor}; color: ${fontColor}; font-size: ${fontSize}; font-weight: ${fontWeight}; text-transform: ${textTransform}; text-align: ${align}; ${paddingStyle}`;

    // STORE THE MODAL STATE for next section creation
    sectionModalState = {
        align: align,
        fontWeight: fontWeight,
        bgColor: bgColor,
        fontColor: fontColor,
        fontSize: document.getElementById('section-font-size').value, // Store without 'px'
        textTransform: textTransform,
        paddingType: paddingType,
        paddingValue: paddingValue,
        // Store custom padding values if used
        paddingLeft: document.getElementById('section-padding-left').value || '',
        paddingRight: document.getElementById('section-padding-right').value || '',
        paddingTop: document.getElementById('section-padding-top').value || '',
        paddingBottom: document.getElementById('section-padding-bottom').value || '',
        showTotal: showTotal // FIX: Save state for next time
    };

    if (currentlyEditingSectionId) {
        // Update existing section (Pass showTotal)
        updateSectionInAllTables(currentlyEditingSectionId, name, styleString, showTotal);
    } else {
        // Create new section (Pass showTotal)
        createSectionInAllTables(name, styleString, showTotal);
    }

    closeSectionModal();
    saveToLocalStorage();
    saveStateToHistory();

    // FIX: Recalculate totals immediately after saving
    updateSectionTotals();
    applyColumnVisibility();
}

function createSectionInAllTablesFromSaved(sectionData) {
    const tables = ['createListManual', 'copyListManual', 'gstCopyListManual'];

    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        const tr = document.createElement('tr');
        tr.className = 'section-row';
        tr.setAttribute('data-section-id', sectionData.id);
        tr.setAttribute('data-show-total', sectionData.showTotal || false); // NEW: Restore saved state
        tr.setAttribute('draggable', 'true');

        const colspan = tableId === 'gstCopyListManual' ? '8' : '7';

        // FIX: Completely separate logic for each table type
        let content = sectionData.name; // Default fallback

        if (tableId === 'createListManual') {
            // Input table - always show buttons
            const buttonText = sectionData.collapsed ? '+' : '−';
            content = `${sectionData.name} 
                <button class="collapse-btn" onclick="toggleSection('${sectionData.id}')">${buttonText}</button>
                <button onclick="event.stopPropagation(); removeSection('${sectionData.id}')" class="remove-btn"><span class="material-icons">close</span></button>`;
        } else {
            // Bill view tables - ALWAYS show only section name, ignore any saved HTML
            content = sectionData.name;
        }

        tr.innerHTML = `
            <td colspan="${colspan}" style="${sectionData.style || ''}">
                ${content}
            </td>
        `;

        // ADD DRAG LISTENERS TO SECTION ROW
        addDragAndDropListeners(tr);
        tbody.appendChild(tr);
    });
}

function createSectionInAllTables(name, styleString, showTotal) {
    const sectionId = 'section-' + Date.now();

    // Create for input table (Pass showTotal)
    createSectionRow('createListManual', sectionId, name, styleString, showTotal);
    // Create for regular bill table (Pass showTotal)
    createSectionRow('copyListManual', sectionId, name, styleString, showTotal);
    // Create for GST bill table (Pass showTotal)
    createSectionRow('gstCopyListManual', sectionId, name, styleString, showTotal);
}
// And update the createSectionRow function to include stopPropagation:
function createSectionRow(tableId, sectionId, name, styleString, showTotal = false) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const tr = document.createElement('tr');
    tr.className = 'section-row';
    tr.setAttribute('data-section-id', sectionId);
    // FIX: Actually set the attribute on creation so totals work immediately
    tr.setAttribute('data-show-total', showTotal);
    tr.setAttribute('draggable', 'true');

    const colspan = tableId === 'gstCopyListManual' ? '8' : '7';

    // FIX: Only show buttons in input table (createListManual)
    let content = name;
    if (tableId === 'createListManual') {
        // Input table - show buttons
        content = `${name} 
            <button class="collapse-btn" onclick="toggleSection('${sectionId}')">−</button>
            <button onclick="event.stopPropagation(); removeSection('${sectionId}')" class="remove-btn"><span class="material-icons">close</span></button>`;
    } else {
        // Bill view tables - show only section name (no buttons)
        content = name;
    }

    tr.innerHTML = `
        <td colspan="${colspan}" style="${styleString}">
            ${content}
        </td>
    `;

    // Add drag listeners to section rows too
    addDragAndDropListeners(tr);
    tbody.appendChild(tr);
}


function updateSectionInAllTables(sectionId, name, styleString, showTotal) { // NEW argument
    const tables = ['createListManual', 'copyListManual', 'gstCopyListManual'];
    tables.forEach(tableId => {
        const row = document.querySelector(`#${tableId} tr[data-section-id="${sectionId}"]`);
        if (row) {
            const colspan = tableId === 'gstCopyListManual' ? '8' : '7';

            // NEW: Update attribute
            row.setAttribute('data-show-total', showTotal);

            // FIX: Only show buttons in input table (createListManual)
            let content = name;
            if (tableId === 'createListManual') {
                // Input table - show buttons
                content = `${name} 
                    <button class="collapse-btn" onclick="toggleSection('${sectionId}')">−</button>
                    <button onclick="event.stopPropagation(); removeSection('${sectionId}')" class="remove-btn"><span class="material-icons">close</span></button>`;
            } else {
                // Bill view tables - show only section name (no buttons)
                content = name;
            }

            row.innerHTML = `
                <td colspan="${colspan}" style="${styleString}">
                    ${content}
                </td>
            `;
            // RE-ADD DRAG LISTENERS AFTER UPDATING HTML
            addDragAndDropListeners(row);
        }
    });
}
function toggleSection(sectionId) {
    const tables = ['createListManual', 'copyListManual', 'gstCopyListManual'];

    // First, find the collapse state from the input table (createListManual)
    const inputSectionRow = document.querySelector(`#createListManual tr[data-section-id="${sectionId}"]`);
    let isCollapsed = false;

    if (inputSectionRow) {
        const button = inputSectionRow.querySelector('.collapse-btn');
        if (button) {
            isCollapsed = button.textContent === '+';
            button.textContent = isCollapsed ? '−' : '+';
        }
    }

    // Apply the same collapse state to all tables
    tables.forEach(tableId => {
        const sectionRow = document.querySelector(`#${tableId} tr[data-section-id="${sectionId}"]`);
        if (!sectionRow) return;

        let nextRow = sectionRow.nextElementSibling;
        while (nextRow && !nextRow.classList.contains('section-row')) {
            nextRow.style.display = isCollapsed ? '' : 'none';
            nextRow = nextRow.nextElementSibling;
        }
    });

    updateSerialNumbers();
    saveToLocalStorage();
    saveStateToHistory();
}

// Payment & Credit Note System
let currentPaymentCustomer = null;
let currentPaymentType = 'payment'; // 'payment' or 'credit-note'

//new payment fuctions start
/* ==========================================================================
   GLOBAL RECEIPT & REFERENCE LOGIC
   ========================================================================== */

// Helper: Populate Bill Types in Payment Form (same as Saved Bills filter)
/* 1. HELPER: Populate Payment Types (Customer Specific) */
async function populatePaymentBillTypes() {
    const select = document.getElementById('payment-ref-type');
    if (!select || !currentPaymentCustomer) return;

    try {
        const savedBills = await getAllFromDB('savedBills');
        const searchName = currentPaymentCustomer.name.toLowerCase().trim();

        // 1. Filter bills ONLY for the current customer
        const customerBills = savedBills.filter(bill => {
            const bVal = bill.value;
            const state = bVal.modalState || {};

            // Deep Search Match
            const simpleName = (bVal.customer?.name || state.simple?.name || '').toLowerCase().trim();
            const billToName = (state.billTo?.name || '').toLowerCase().trim();

            return simpleName === searchName || billToName === searchName;
        });

        // 2. Extract unique types from THIS customer's bills
        const types = new Set(customerBills.map(b => b.value.modalState?.type || 'Invoice').filter(t => t));

        // 3. Fallback: If customer has NO bills, default to 'Invoice'
        if (types.size === 0) {
            types.add('Invoice');
        }

        // 4. Render Options
        select.innerHTML = '<option value="">-- Select Type --</option>';
        types.forEach(type => {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type;
            select.appendChild(opt);
        });

    } catch (e) {
        console.error("Error populating payment types", e);
    }
}

// Helper: Calculate Next Receipt Number (Max + 1 Logic)
async function updateNextReceiptNo() {
    const displayEl = document.getElementById('payment-receipt-no-display');
    if (!displayEl) return;

    // If we are currently editing, do NOT show the "Next" number
    if (currentlyEditingPaymentId) {
        return;
    }

    try {
        const mode = currentPaymentCustomer?.mode || 'regular';
        let storeName = '';

        if (mode === 'vendor') {
            storeName = currentPaymentType === 'payment' ? 'vendorPayments' : 'vendorCreditNotes';
        } else {
            storeName = currentPaymentType === 'payment' ? 'customerPayments' : 'customerCreditNotes';
        }

        const allRecords = await getAllFromDB(storeName);

        let maxNo = 0;
        if (allRecords && allRecords.length > 0) {
            allRecords.forEach(rec => {
                // Handle both wrapped (.value) and raw objects
                const data = rec.value || rec;
                const val = data.receiptNo;
                const num = parseInt(val || 0);
                if (!isNaN(num) && num > maxNo) maxNo = num;
            });
        }

        // Update the UI immediately
        displayEl.textContent = maxNo + 1;

    } catch (e) {
        console.error("Error updating receipt no:", e);
        displayEl.textContent = "1";
    }
}

function handlePaymentRefTypeChange() {
    // Only clear inputs if not in edit mode
    if (!currentlyEditingPaymentId && document.activeElement === document.getElementById('payment-ref-type')) {
        document.getElementById('payment-ref-no').value = '';
        document.getElementById('payment-ref-prefix').value = '';
        document.getElementById('payment-ref-billno').value = '';
    }
}

/* 2. HANDLE REF INPUT (Updated: Shows Latest Bills First) */
async function handlePaymentRefInput(input) {
    const query = input.value.toLowerCase().trim();
    const suggestionsBox = document.getElementById('payment-ref-suggestions');

    // Determine context
    const mode = currentPaymentCustomer?.mode || 'regular';
    let selectedType = 'Invoice'; // Default

    if (mode === 'regular') {
        const typeSelect = document.getElementById('payment-ref-type');
        if (typeSelect && typeSelect.value) {
            selectedType = typeSelect.value;
        }
    }

    if (!currentPaymentCustomer) {
        suggestionsBox.style.display = 'none';
        return;
    }

    try {
        let suggestions = [];

        // --- SORTING HELPER (Newest First) ---
        const sortByLatest = (a, b) => {
            const timeA = a.value.createdAt || a.value.timestamp || 0;
            const timeB = b.value.createdAt || b.value.timestamp || 0;
            return timeB - timeA; // Descending Order
        };

        // === 1. VENDOR MODE ===
        if (mode === 'vendor') {
            const allVendorBills = await getAllFromDB('vendorSavedBills');
            const searchName = currentPaymentCustomer.name.toLowerCase().trim();

            suggestions = allVendorBills
                .sort(sortByLatest)
                .filter(bill => {
                    const bVal = bill.value;
                    const vendorName = (bVal.vendor?.name || '').toLowerCase().trim();
                    const invoiceNo = (bVal.billDetails?.invoiceNo || '').toLowerCase();

                    // Match Vendor
                    if (vendorName !== searchName) return false;

                    // Match Query (Invoice No)
                    if (query && !invoiceNo.includes(query)) return false;

                    return true;
                }).map(bill => ({
                    display: bill.value.billDetails?.invoiceNo,
                    amount: bill.value.totalAmount,
                    prefix: '',
                    no: bill.value.billDetails?.invoiceNo
                }));
        }
        // === 2. GST MODE ===
        else if (mode === 'gst') {
            const allGstBills = await getAllFromDB('gstSavedBills');
            const searchGSTIN = (currentPaymentCustomer.gstin || '').toLowerCase();

            suggestions = allGstBills
                .sort(sortByLatest)
                .filter(bill => {
                    const bVal = bill.value;
                    const billGST = (bVal.customer?.billTo?.gstin || '').toLowerCase();
                    const shipGST = (bVal.customer?.shipTo?.gstin || '').toLowerCase();

                    // Match Customer
                    if (billGST !== searchGSTIN && shipGST !== searchGSTIN) return false;

                    // Match Query (if typed)
                    if (query) {
                        const invNo = (bVal.invoiceDetails?.number || '').toLowerCase();
                        return invNo.includes(query);
                    }
                    return true;
                }).map(bill => ({
                    display: bill.value.invoiceDetails?.number,
                    amount: bill.value.totals?.grandTotal || bill.value.totalAmount,
                    prefix: '',
                    no: bill.value.invoiceDetails?.number
                }));

        }
        // === 3. REGULAR MODE ===
        else {
            const allBills = await getAllFromDB('savedBills');
            const searchName = currentPaymentCustomer.name.toLowerCase().trim();

            suggestions = allBills
                .sort(sortByLatest)
                .filter(bill => {
                    const state = bill.value.modalState || {};

                    // 1. Match Customer
                    const simpleName = (bill.value.customer?.name || state.simple?.name || '').toLowerCase();
                    const billToName = (state.billTo?.name || '').toLowerCase();
                    if (simpleName !== searchName && billToName !== searchName) return false;

                    // 2. Match Selected Type
                    const billType = state.type || 'Invoice';
                    if (billType !== selectedType) return false;

                    // 3. Match Query (if typed)
                    if (query) {
                        const fullStr = `${state.prefix || ''}${state.invoiceNo}`.toLowerCase();
                        return fullStr.includes(query);
                    }
                    return true;
                }).map(bill => ({
                    display: `${bill.value.modalState?.prefix || ''}${bill.value.modalState?.invoiceNo}`,
                    amount: bill.value.totalAmount,
                    prefix: bill.value.modalState?.prefix || '',
                    no: bill.value.modalState?.invoiceNo
                }));
        }

        // Render
        suggestionsBox.innerHTML = '';
        if (suggestions.length > 0) {
            suggestionsBox.style.display = 'block';
            suggestions.forEach(item => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.style.padding = '8px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid #eee';
                div.innerHTML = `<strong>${item.display}</strong> <span style="font-size:0.8em; float:right;">₹${parseFloat(item.amount).toFixed(2)}</span>`;

                div.onclick = () => {
                    input.value = item.display;
                    document.getElementById('payment-ref-prefix').value = item.prefix;
                    document.getElementById('payment-ref-billno').value = item.no;
                    suggestionsBox.style.display = 'none';
                };
                suggestionsBox.appendChild(div);
            });
        } else {
            suggestionsBox.style.display = 'none';
        }

    } catch (e) {
        console.error("Error getting ref suggestions", e);
    }
}

// Close suggestions when clicking outside
document.addEventListener('click', function (e) {
    const suggestions = document.getElementById('payment-ref-suggestions');
    if (suggestions && e.target.id !== 'payment-ref-no') {
        suggestions.style.display = 'none';
    }
});
//new payment functions end

// --- ADD TO EVENT LISTENERS OR NEW FUNCTIONS SECTION ---

// Toolbar Action: Opens Dialog Prefilled with Current Bill Details
function openCurrentBillPaymentDialog() {
    // 1. Get Current Customer Name
    let customerName = '';
    if (isGSTMode) {
        // GST Mode Logic
        const billToName = document.getElementById('gst-bill-to-name');
        customerName = billToName ? billToName.value : '';
    } else {
        // Regular Mode Logic
        const viewMode = regBillConfig.viewMode || 'simple';
        if (viewMode === 'simple') {
            customerName = document.getElementById('reg-modal-simple-name').value;
        } else {
            customerName = document.getElementById('reg-modal-bill-name').value;
        }
    }

    if (!customerName) {
        alert("Please enter a Customer Name first.");
        return;
    }

    // 2. Get Current Bill Details
    const state = getCurrentBillDetails(); // Helper function (defined below in index2.js)

    // 3. Open Dialog
    openPaymentDialog(customerName, '', isGSTMode ? 'gst' : 'regular', {
        type: state.type,
        prefix: state.prefix,
        no: state.no
    });

    // 4. Sync the Checkbox State in the Dialog
    const toggleEl = document.getElementById('toggle-bill-payment-table');
    if (toggleEl) toggleEl.checked = showBillPaymentTable;
}
/* ==========================================================================
   CORE: SINGLE RENDER FUNCTION (Fixed ID/Type Logic)
   ========================================================================== */

/* ==========================================================================
SHOW PAID TOGGLE LOGIC
========================================================================== */

// 1. The Click Handler
/* ==========================================================================
   SHOW PAID TOGGLE LOGIC (Updated for Persistence)
   ========================================================================== */
function toggleBillPaymentDisplay() {
    showBillPaymentTable = !showBillPaymentTable;

    // 1. SAVE TO LOCALSTORAGE (This fixes the refresh issue)
    localStorage.setItem('showBillPaymentTable', showBillPaymentTable);

    // 2. Update UI
    updateShowPaidButtonState();

    // 3. Render Table
    if (typeof renderBillSpecificPayments === 'function') {
        renderBillSpecificPayments();
    }

    // 4. Save to Current Draft (Optional, but good for DB sync)
    if (!isGSTMode && typeof saveRegularBillDetails === 'function') {
        saveRegularBillDetails(true);
    }
}

// 2. The Visual Sync (Green when active)
function updateShowPaidButtonState() {
    const btn = document.getElementById('btn-toggle-payments');
    if (!btn) return;

    if (showBillPaymentTable) {
        btn.style.backgroundColor = 'var(--primary-color)';
        btn.style.color = 'white';
    } else {
        btn.style.backgroundColor = ''; // Revert to default CSS
        btn.style.color = '';
    }
}


async function renderBillSpecificPayments() {
    const container = document.getElementById('bill-payments-container');
    const tbody = document.getElementById('bill-payments-tbody');
    const tfoot = document.getElementById('bill-payments-tfoot');
    const thead = container ? container.querySelector('thead') : null;

    // Safety Check
    if (!container || !tbody || !tfoot) return;

    // 1. Hide if toggle is OFF
    if (!showBillPaymentTable) {
        container.style.display = 'none';
        return;
    }

    // 2. Get Current Bill Context
    const billDetails = getCurrentBillDetails();
    if (!billDetails.name) {
        container.style.display = 'none';
        return;
    }

    // 3. Fetch Payments & Credit Notes (Explicitly Tagging Types)
    const mode = isGSTMode ? 'gst' : 'regular';

    let payments = await getCustomerPayments(billDetails.name, '', 'payment', {}, mode);
    // Explicitly tag as payment
    payments = payments.map(p => ({ ...p, recordType: 'payment' }));

    let creditNotes = await getCustomerPayments(billDetails.name, '', 'credit-note', {}, mode);
    // Explicitly tag as credit-note
    creditNotes = creditNotes.map(cn => ({ ...cn, recordType: 'credit-note' }));

    const allRecords = [...payments, ...creditNotes];

    // 4. Filter for THIS specific Bill
    const linkedRecords = allRecords.filter(p => {
        const pType = (p.refType || 'Invoice').toLowerCase();
        const bType = (billDetails.type || 'Invoice').toLowerCase();

        const pPrefix = (p.refPrefix || '').toLowerCase();
        const bPrefix = (billDetails.prefix || '').toLowerCase();

        const pNo = (p.refBillNo || '').toString();
        const bNo = (billDetails.no || '').toString();

        return pType === bType && pPrefix === bPrefix && pNo === bNo;
    });

    if (linkedRecords.length === 0) {
        container.style.display = 'none';
        return;
    }

    // 5. Setup View
    container.style.display = 'block';

    // Ensure Header is Hidden (Cleanup)
    if (thead) thead.style.display = 'none';

    tbody.innerHTML = '';

    let totalPaid = 0;

    // Sort by Date
    linkedRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

    linkedRecords.forEach(rec => {
        // --- FIX: Use the explicit tag we added above ---
        const isCN = rec.recordType === 'credit-note';

        const typeLabel = isCN ? 'CN' : 'Payment';
        const amount = parseFloat(rec.amount || 0);

        totalPaid += amount;

        const row = `
            <tr style="border-bottom: 1px solid #eee;">
                <td colspan="5" style="padding: 5px; padding-left:20px;text-align: left;">
                    <span style="font-weight: bold; color: var(--primary-color);">${typeLabel}</span> 
                    #${rec.receiptNo || '-'} 
                    <span style="color: #666; font-size: 0.9em;">(${convertToDisplayFormat(rec.date)})</span>
                    <span style="font-size: 0.85em; color: #555;"> - ${rec.method} ${rec.notes ? '(' + rec.notes + ')' : ''}</span>
                </td>
                <td style="padding: 5px; text-align: center;width:20%">
                    ${amount.toFixed(2)}
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    // 6. Calculate Balance & Advance
    let grandTotal = 0;

    if (isGSTMode) {
        const el = document.getElementById('gst-grand-total');
        if (el) grandTotal = parseFloat(el.textContent.replace(/,/g, '') || 0);
    } else {
        const elCopy = document.getElementById('copyTotalAmount');
        if (elCopy && elCopy.textContent) {
            grandTotal = parseFloat(elCopy.textContent.replace(/,/g, '') || 0);
        } else {
            const totalRows = document.querySelectorAll('#bill-total-tbody tr');
            if (totalRows.length > 0) {
                const lastRowCells = totalRows[totalRows.length - 1].querySelectorAll('td');
                if (lastRowCells.length > 0) {
                    const text = lastRowCells[lastRowCells.length - 1].textContent;
                    grandTotal = parseFloat(text.replace(/,/g, '') || 0);
                }
            }
        }
    }

    if (isNaN(grandTotal)) grandTotal = 0;

    // Logic: Handle Overpayment
    let balance = grandTotal - totalPaid;
    let advanceDeposit = 0;

    if (balance < 0) {
        advanceDeposit = Math.abs(balance);
        balance = 0;
    }

    // 7. Render Footer
    let tfootHtml = `
        <tr>
            <td colspan="5" class="total-cell" style="text-align: right; padding: 5px; border-top: 1px solid #000; font-weight: 700;">Total Paid/CN</td>
            <td class="total-cell" style="text-align: center; padding: 5px; border-top: 1px solid #000; font-weight: 700;">${totalPaid.toFixed(2)}</td>
        </tr>`;

    const balanceColor = balance > 0.01 ? '#d35400' : 'green';
    tfootHtml += `
        <tr style="background-color: #f0f0f0; color: ${balanceColor}; font-weight: bold;">
            <td colspan="5" class="total-cell" style="text-align: right; padding: 5px;">Balance Due</td>
            <td class="total-cell" style="text-align: center; padding: 5px;">${balance.toFixed(2)}</td>
        </tr>`;

    if (advanceDeposit > 0) {
        tfootHtml += `
        <tr style="background-color: #e8f5e9; color: #27ae60; font-weight: bold;">
            <td colspan="5" class="total-cell" style="text-align: right; padding: 5px;">Advance Deposit</td>
            <td class="total-cell" style="text-align: center; padding: 5px;">${advanceDeposit.toFixed(2)}</td>
        </tr>`;
    }

    tfoot.innerHTML = tfootHtml;
}

/* ==========================================================================
   2. HELPER: GET CURRENT BILL DETAILS
   ========================================================================== */
function getCurrentBillDetails() {
    let type = 'Invoice';
    let prefix = '';
    let no = '';
    let name = '';

    if (isGSTMode) {
        // GST Mode Logic
        name = document.getElementById('gst-bill-to-name')?.value || '';
        type = 'Tax Invoice'; // Usually fixed for GST
        no = document.getElementById('gstInvoiceNo')?.value || '';
        // GST typically doesn't use the prefix field the same way, but add if you have it
    } else {
        // Regular Mode Logic
        const viewMode = regBillConfig.viewMode || 'simple';
        if (viewMode === 'simple') {
            name = document.getElementById('reg-modal-simple-name')?.value || '';
        } else {
            name = document.getElementById('reg-modal-bill-name')?.value || '';
        }

        type = document.getElementById('reg-modal-type-select')?.value || 'Invoice';
        prefix = document.getElementById('reg-modal-prefix')?.value || '';
        no = document.getElementById('reg-modal-invoice-no')?.value || '';
    }

    return { name, type, prefix, no };
}

/* ==========================================================================
   3. HELPER: TOGGLE FUNCTION
   ========================================================================== */
function toggleBillPaymentTable(isChecked) {
    showBillPaymentTable = isChecked;
    renderBillSpecificPayments();

    // Auto-save the preference to the current bill details
    if (!isGSTMode) saveRegularBillDetails(true); // Silent save
}

/* 1. OPEN PAYMENT DIALOG (Updated: Clears Drafts on Open) */
async function openPaymentDialog(customerName, gstin, explicitMode, prefillData = null) {
    // 1. SAVE GLOBAL STATE
    currentPaymentPrefill = prefillData;

    // Clear old drafts to prevent mixing data
    paymentDraftState = {
        'payment': {},
        'credit-note': {}
    };

    resetPaymentForm();

    // 2. Mode Determination
    let mode = 'regular';
    if (explicitMode) {
        mode = explicitMode;
    } else {
        const cleanGST = (gstin || '').toLowerCase().trim();
        const seemsLikeGST = cleanGST.length > 5 &&
            !cleanGST.includes('not provided') &&
            !cleanGST.includes('n/a') &&
            !cleanGST.includes('15-digit');
        mode = seemsLikeGST ? 'gst' : 'regular';
    }

    currentPaymentCustomer = {
        name: customerName,
        gstin: gstin,
        mode: mode
    };
    currentPaymentType = 'payment';

    document.getElementById('payment-dialog-title').textContent = `Payments - ${customerName}`;
    document.getElementById('payment-dialog').classList.add('active');

    // 3. UI Reset
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => btn.classList.remove('active'));
    if (toggleBtns[0]) toggleBtns[0].classList.add('active');

    const dateInput = document.getElementById('payment-date');
    if (dateInput) dateInput.value = getTodayDateStr();

    // 4. Setup HTML Structure (Select vs Input)
    const refContainer = document.getElementById('payment-ref-type').parentNode;

    // UPDATED: Handle text display for Vendor vs GST
    if (mode === 'gst' || mode === 'vendor') {
        let displayLabel = 'TAX INVOICE';
        let valueLabel = 'Tax Invoice';

        if (mode === 'vendor') {
            // Default assumption for Vendors
            displayLabel = 'Invoice';
            valueLabel = 'Invoice';

            // Check actual Vendor Type from DB [Diagram of Decision Logic]
            try {
                const vendors = await getAllFromDB('vendorList');
                const match = vendors.find(v => v.value.name.toLowerCase().trim() === customerName.toLowerCase().trim());

                if (match && match.value.type === 'GST') {
                    displayLabel = 'Tax Invoice';
                    valueLabel = 'Tax Invoice';
                }
            } catch (e) {
                console.error("Error fetching vendor type:", e);
            }
        }

        refContainer.innerHTML = `
            <label>Bill Type (Ref):</label>
            <input type="text" value="${displayLabel}" disabled style="background: #f0f0f0; border: 1px solid #ddd; color: #555;">
            <select id="payment-ref-type" style="display:none;"><option value="${valueLabel}" selected>${valueLabel}</option></select>
        `;
    } else {
        refContainer.innerHTML = `
            <label>Bill Type (Ref):</label>
            <select id="payment-ref-type" onchange="handlePaymentRefTypeChange()"></select>
        `;
    }

    // 5. Apply Values & Locking (Via Reset Logic)
    resetPaymentForm(true);

    // 6. Sort Option
    const sortSelect = document.getElementById('sort-by-select');
    if (sortSelect) {
        sortSelect.innerHTML = `
            <option value="date">Date</option>
            <option value="receipt">Receipt No</option>
            <option value="amount">Amount</option>
        `;
    }

    updatePaymentUI();
    loadPaymentsAndCreditNotesWithFilters();
}

function initializePeriodSelector() {
    const selectAll = document.getElementById('select-all-dates');
    const periodInputs = document.getElementById('period-inputs');
    const fromDateInput = document.getElementById('from-date-input');

    if (selectAll && periodInputs) {
        // Set default state
        selectAll.checked = true;
        periodInputs.style.display = 'none';
    }

    if (fromDateInput) {
        // Set default from date to 3 months ago
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        fromDateInput.value = threeMonthsAgo.toISOString().split('T')[0];
        fromDateInput.style.display = 'none';
    }
}

/* 2. HELPER: Populate Ledger Filter Types (Customer Specific) */
async function populateLedgerBillTypes() {
    const select = document.getElementById('ledger-bill-type-filter');
    if (!select || !currentPaymentCustomer) return;

    try {
        const savedBills = await getAllFromDB('savedBills');
        const searchName = currentPaymentCustomer.name.toLowerCase().trim();

        // 1. Filter bills ONLY for the current customer
        const customerBills = savedBills.filter(bill => {
            const bVal = bill.value;
            const state = bVal.modalState || {};

            // Deep Search Match
            const simpleName = (bVal.customer?.name || state.simple?.name || '').toLowerCase().trim();
            const billToName = (state.billTo?.name || '').toLowerCase().trim();

            return simpleName === searchName || billToName === searchName;
        });

        // 2. Extract unique types
        const types = new Set(customerBills.map(b => b.value.modalState?.type || 'Invoice').filter(t => t));

        // 3. Fallback
        if (types.size === 0) {
            types.add('Invoice');
        }

        // 4. Render Options
        select.innerHTML = '<option value="all">All Types</option>';

        // Auto-select 'Invoice' if it exists, otherwise default to 'all'
        let hasInvoice = false;

        types.forEach(type => {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type;
            select.appendChild(opt);
            if (type === 'Invoice') hasInvoice = true;
        });

        // Set default selection logic
        if (hasInvoice) {
            select.value = 'Invoice';
        } else {
            select.value = 'all';
        }

    } catch (e) {
        console.error("Error populating ledger types", e);
    }
}
/* 4. OPEN LEDGER DIALOG (Accepts & Prioritizes Explicit Mode) */
async function openLedgerDialog(customerName, gstin, explicitMode) {
    console.log('[LEDGER] Opening for:', customerName, 'Mode:', explicitMode);

    if (!customerName) return;

    // --- MODE DETERMINATION ---
    let mode = 'regular';

    if (explicitMode) {
        mode = explicitMode;
    } else {
        const cleanGST = (gstin || '').toLowerCase().trim();
        const seemsLikeGST = cleanGST.length > 5 && !cleanGST.includes('not provided');
        mode = seemsLikeGST ? 'gst' : 'regular';
    }

    currentPaymentCustomer = {
        name: customerName.trim(),
        gstin: (gstin || '').trim(),
        mode: mode
    };

    const ledgerDialog = document.getElementById('ledger-dialog');
    const ledgerTitle = document.getElementById('ledger-dialog-title');

    if (ledgerTitle) ledgerTitle.textContent = `Ledger - ${customerName}`;

    // --- UI TOGGLE ---
    const filterSelect = document.getElementById('ledger-bill-type-filter');

    // UPDATED: Hide filter for GST AND Vendor modes
    if (mode === 'gst' || mode === 'vendor') {
        if (filterSelect) filterSelect.style.display = 'none';
    } else {
        if (filterSelect) {
            filterSelect.style.display = 'inline-block';
            await populateLedgerBillTypes(); // Fill Regular Options
        }
    }

    ledgerDialog.classList.add('active');

    // Reset Date Filters
    const selectAll = document.getElementById('select-all-dates');
    const periodInputs = document.getElementById('period-inputs');
    if (selectAll) selectAll.checked = true;
    if (periodInputs) periodInputs.style.display = 'none';

    // Load Data using the correct mode
    loadLedgerData(currentPaymentCustomer.name, currentPaymentCustomer.gstin);
}

/* 4. CLOSE DIALOG (Critical: Clears Prefill Data) */
function closePaymentDialog() {
    document.getElementById('payment-dialog').classList.remove('active');

    // Reset Global States
    currentPaymentCustomer = null;
    currentPaymentPrefill = null; // FIX: Ensure prefill is cleared on close
}
function closeLedgerDialog() {
    document.getElementById('ledger-dialog').classList.remove('active');
}

/* 1. SAVE DRAFT (No Changes, just keeping for completeness) */
function saveFormToDraft(type) {
    if (!paymentDraftState[type]) paymentDraftState[type] = {};

    paymentDraftState[type] = {
        date: document.getElementById('payment-date').value,
        method: document.getElementById('payment-method').value,
        amount: document.getElementById('payment-amount').value,
        notes: document.getElementById('payment-notes').value,
        customMethod: document.getElementById('custom-payment-method').value,
        refType: document.getElementById('payment-ref-type').value,
        refNo: document.getElementById('payment-ref-no').value,
        refPrefix: document.getElementById('payment-ref-prefix').value,
        refBillNo: document.getElementById('payment-ref-billno').value
    };
}

/* 2. RESTORE FORM (Updated: Respects Global Prefill & Locks Fields) */
function restoreFormFromDraft(type) {
    const draft = paymentDraftState[type] || {};

    // --- A. Basic Fields (Always restore from draft or defaults) ---
    document.getElementById('payment-date').value = draft.date || getTodayDateStr();
    document.getElementById('payment-method').value = draft.method || 'Cash';
    document.getElementById('payment-amount').value = draft.amount || '';
    document.getElementById('payment-notes').value = draft.notes || '';

    // Custom Method Logic
    const customInput = document.getElementById('custom-payment-method');
    const customContainer = document.getElementById('custom-method-container');
    customInput.value = draft.customMethod || '';
    if (draft.method === 'Other') {
        customContainer.style.display = 'block';
    } else {
        customContainer.style.display = 'none';
    }

    // --- B. Reference Fields Logic (The Fix) ---
    const refInput = document.getElementById('payment-ref-no');
    const refPrefixInput = document.getElementById('payment-ref-prefix');
    const refBillNoInput = document.getElementById('payment-ref-billno');
    const typeSelect = document.getElementById('payment-ref-type');
    const mode = currentPaymentCustomer?.mode || 'regular';

    if (currentPaymentPrefill) {
        // === LOCKED PREFILL MODE (Override Draft) ===

        // 1. Force Type Selection (Regular Mode)
        if (mode === 'regular' && typeSelect) {
            // Force inject the specific option to ensure it exists
            typeSelect.innerHTML = `<option value="${currentPaymentPrefill.type}" selected>${currentPaymentPrefill.type}</option>`;
            typeSelect.value = currentPaymentPrefill.type;
            typeSelect.disabled = true; // Lock
            typeSelect.style.backgroundColor = "#f0f0f0";
        }

        // 2. Fill & Lock Input
        const displayNo = `${currentPaymentPrefill.prefix || ''}${currentPaymentPrefill.no}`;
        refInput.value = displayNo;
        refInput.readOnly = true; // Lock
        refInput.style.backgroundColor = "#f0f0f0";
        refInput.removeAttribute('onfocus');

        // 3. Fill Hidden Fields
        refPrefixInput.value = currentPaymentPrefill.prefix || '';
        refBillNoInput.value = currentPaymentPrefill.no || '';

    } else {
        // === NORMAL DRAFT MODE (Restore Draft) ===

        // 1. Set Type (Regular Mode)
        if (mode === 'regular' && typeSelect) {
            typeSelect.disabled = false; // Unlock
            typeSelect.style.backgroundColor = "white";

            // Re-populate if options are missing (e.g. was locked)
            if (typeSelect.options.length <= 1) {
                populatePaymentBillTypes().then(() => {
                    if (draft.refType) typeSelect.value = draft.refType;
                });
            } else {
                typeSelect.value = draft.refType || '';
            }
        }

        // 2. Set Input & Unlock
        refInput.value = draft.refNo || '';
        refInput.readOnly = false; // Unlock
        refInput.style.backgroundColor = "white";
        refInput.setAttribute('onfocus', 'handlePaymentRefInput(this)');

        // 3. Hidden Fields
        refPrefixInput.value = draft.refPrefix || '';
        refBillNoInput.value = draft.refBillNo || '';
    }

    // --- C. Reset Button Label ---
    const typeLabel = currentPaymentType === 'payment' ? 'Payment' : 'Credit Note';
    document.getElementById('add-payment-btn').innerHTML = `<i class="material-icons">add</i> Add <span id="add-btn-label">${typeLabel}</span>`;
}


function getTodayDateStr() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
}

/* 3. TOGGLE HANDLER (Updated: Calls Restore which handles logic) */
function setupPaymentTypeToggle() {
    const toggleBtns = document.querySelectorAll('.toggle-btn');

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', async function () {
            // 1. Save Draft
            saveFormToDraft(currentPaymentType);

            // 2. UI Switch
            toggleBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 3. Update State
            currentPaymentType = this.dataset.type;
            currentlyEditingPaymentId = null;

            // 4. Restore Draft (This now triggers the Prefill check)
            restoreFormFromDraft(currentPaymentType);

            // 5. Update UI Labels
            updatePaymentUI();

            // 6. Update Receipt Number
            await updateNextReceiptNo();

            // 7. Reload Table
            loadPaymentsAndCreditNotesWithFilters();
        });
    });
}

// FIXED: Edit Population (Awaiting Options)
async function editPaymentRecord(recordId, recordType = null) {
    try {
        const type = recordType || currentPaymentType;

        // --- FIX: Determine Store based on Mode ---
        const mode = currentPaymentCustomer?.mode || 'regular';
        let storeName = '';

        if (mode === 'vendor') {
            storeName = type === 'payment' ? 'vendorPayments' : 'vendorCreditNotes';
        } else {
            storeName = type === 'payment' ? 'customerPayments' : 'customerCreditNotes';
        }
        // ------------------------------------------

        const record = await getFromDB(storeName, recordId);

        if (!record) { showNotification('Record not found', 'error'); return; }

        currentlyEditingPaymentId = recordId;
        currentPaymentType = type;

        // Ensure Options Loaded
        await populatePaymentBillTypes();

        document.getElementById('payment-date').value = record.date;
        document.getElementById('payment-method').value = record.method;
        document.getElementById('payment-amount').value = record.amount;
        document.getElementById('payment-notes').value = record.notes || '';

        // Fill Refs
        document.getElementById('payment-ref-type').value = record.refType || '';
        document.getElementById('payment-ref-no').value = record.refDisplay || '';
        document.getElementById('payment-ref-prefix').value = record.refPrefix || '';
        document.getElementById('payment-ref-billno').value = record.refBillNo || '';

        // Custom Method
        if (['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card'].indexOf(record.method) === -1) {
            document.getElementById('payment-method').value = 'Other';
            document.getElementById('custom-method-container').style.display = 'block';
            document.getElementById('custom-payment-method').value = record.method;
        } else {
            document.getElementById('custom-method-container').style.display = 'none';
        }

        const typeLabel = type === 'payment' ? 'Payment' : 'Credit Note';
        document.getElementById('add-payment-btn').innerHTML = `<i class="material-icons">save</i> Update ${typeLabel}`;

        // Correct Editing Label
        document.getElementById('payment-receipt-no-display').textContent = `Editing #${record.receiptNo || 'N/A'}`;
        document.getElementById('form-type-label').textContent = typeLabel;

    } catch (error) {
        console.error('Error editing:', error);
    }
}

/* 2. RESET FORM (Updated: Safer Prefill Persistence) */
function resetPaymentForm(setDate = false) {
    if (setDate) {
        const dateInput = document.getElementById('payment-date');
        if (dateInput) dateInput.value = getTodayDateStr();
    }

    // 1. Clear Basic Fields
    document.getElementById('payment-method').value = 'Cash';
    document.getElementById('payment-amount').value = '';
    document.getElementById('payment-notes').value = '';
    document.getElementById('custom-payment-method').value = '';
    document.getElementById('custom-method-container').style.display = 'none';

    // 2. Update Button Label
    const typeLabel = currentPaymentType === 'payment' ? 'Payment' : 'Credit Note';
    document.getElementById('add-payment-btn').innerHTML = `<i class="material-icons">add</i> Add <span id="add-btn-label">${typeLabel}</span>`;

    currentlyEditingPaymentId = null;

    // 3. Handle Reference Fields (Prefill vs Normal)
    const refInput = document.getElementById('payment-ref-no');
    const refPrefixInput = document.getElementById('payment-ref-prefix');
    const refBillNoInput = document.getElementById('payment-ref-billno');
    const typeSelect = document.getElementById('payment-ref-type');
    const mode = currentPaymentCustomer?.mode || 'regular';

    if (currentPaymentPrefill) {
        // === LOCKED MODE (Specific Bill) ===

        // A. Force Type Selection (Regular Mode)
        if (mode === 'regular' && typeSelect) {
            // Force inject option to guarantee it exists and is selected
            typeSelect.innerHTML = `<option value="${currentPaymentPrefill.type}" selected>${currentPaymentPrefill.type}</option>`;
            typeSelect.value = currentPaymentPrefill.type; // Double ensure
            typeSelect.disabled = true;
            typeSelect.style.backgroundColor = "#f0f0f0";
        }

        // B. Fill & Lock Input
        const displayNo = `${currentPaymentPrefill.prefix || ''}${currentPaymentPrefill.no}`;
        refInput.value = displayNo;
        refInput.readOnly = true;
        refInput.style.backgroundColor = "#f0f0f0";
        refInput.removeAttribute('onfocus');

        // C. Fill Hidden Data
        refPrefixInput.value = currentPaymentPrefill.prefix || '';
        refBillNoInput.value = currentPaymentPrefill.no || '';

    } else {
        // === NORMAL MODE (Editable) ===

        // A. Reset Type Select (Regular Mode)
        if (mode === 'regular' && typeSelect) {
            typeSelect.disabled = false;
            typeSelect.style.backgroundColor = "white";
            typeSelect.value = ''; // Clear selection

            // Re-populate if it was locked (has only 1 option)
            if (typeSelect.options.length <= 1) {
                populatePaymentBillTypes();
            }
        }

        // B. Clear & Unlock Input
        refInput.value = '';
        refInput.readOnly = false;
        refInput.style.backgroundColor = "white";
        refInput.setAttribute('onfocus', 'handlePaymentRefInput(this)');

        // C. Clear Hidden Data
        refPrefixInput.value = '';
        refBillNoInput.value = '';
    }

    // 4. Update Receipt No
    updateNextReceiptNo();
}

// FIXED: Update Record Logic
async function updatePaymentRecord() {
    if (!currentlyEditingPaymentId) return;

    const methodSelect = document.getElementById('payment-method');
    let finalMethod = methodSelect.value;
    if (finalMethod === 'Other') finalMethod = document.getElementById('custom-payment-method').value.trim();

    const date = document.getElementById('payment-date').value;
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const notes = document.getElementById('payment-notes').value;

    const refPrefix = document.getElementById('payment-ref-prefix').value;
    const refBillNo = document.getElementById('payment-ref-billno').value;
    const refDisplay = document.getElementById('payment-ref-no').value;

    try {
        // --- FIX: Determine Store based on Mode ---
        const mode = currentPaymentCustomer?.mode || 'regular';
        let storeName = '';

        if (mode === 'vendor') {
            storeName = currentPaymentType === 'payment' ? 'vendorPayments' : 'vendorCreditNotes';
        } else {
            storeName = currentPaymentType === 'payment' ? 'customerPayments' : 'customerCreditNotes';
        }
        // ------------------------------------------

        // --- DETERMINE REF TYPE SAFELY ---
        let refType = '';
        if (mode === 'gst') {
            refType = 'Tax Invoice';
        } else if (mode === 'vendor') {
            const gstin = (currentPaymentCustomer.gstin || '').toLowerCase().trim();
            const isGSTVendor = gstin.length > 5 && !gstin.includes('not provided');
            refType = isGSTVendor ? 'Tax Invoice' : 'Invoice';
        } else {
            // Regular Mode: Trust the dropdown
            refType = document.getElementById('payment-ref-type').value;
        }

        const existingRecord = await getFromDB(storeName, currentlyEditingPaymentId);

        const updatedRecord = {
            ...existingRecord,
            date, method: finalMethod, amount, notes,
            refType, refPrefix, refBillNo, refDisplay,
            updatedAt: Date.now()
        };

        await setInDB(storeName, currentlyEditingPaymentId, updatedRecord);

        paymentDraftState[currentPaymentType] = {}; // Clear draft
        resetPaymentForm(true);
        loadPaymentsAndCreditNotesWithFilters();
        showNotification('Updated successfully!', 'success');

    } catch (error) {
        console.error(error);
    }
}

function updatePaymentUI() {
    const typeLabel = currentPaymentType === 'payment' ? 'Payment' : 'Credit Note';
    if (document.getElementById('form-type-label')) document.getElementById('form-type-label').textContent = typeLabel;
    if (document.getElementById('add-btn-label')) document.getElementById('add-btn-label').textContent = typeLabel;
    if (document.getElementById('list-type-label')) document.getElementById('list-type-label').textContent = typeLabel;
}

// Load payments and credit notes
async function loadPaymentsAndCreditNotes() {
    if (!currentPaymentCustomer) return;

    const payments = await getCustomerPayments(currentPaymentCustomer.name, currentPaymentCustomer.gstin, currentPaymentType);
    displayPayments(payments);
}


/* 4. DISPLAY PAYMENTS (Updated: Show Type if Ref No missing) */
function displayPayments(payments) {
    const tbody = document.getElementById('payments-tbody');
    tbody.innerHTML = '';

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No records found</td></tr>';
        return;
    }

    payments.forEach(payment => {
        // --- LOGIC CHANGE: Default to Bill Type, append No if exists ---
        let refText = payment.refType || 'Invoice';

        if (payment.refBillNo || payment.refDisplay) {
            const num = payment.refDisplay || `${payment.refPrefix || ''}${payment.refBillNo}`;
            refText = `${refText} - ${num}`;
        }

        // Only show dash if absolutely no info exists (legacy data)
        if (!payment.refType && !payment.refBillNo) refText = '-';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight:bold; color:var(--primary-color);">#${payment.receiptNo || 'N/A'}</td>
            <td>${convertToDisplayFormat(payment.date)}</td>
            <td style="font-size: 0.9em; color: var(--secondary-color); font-weight:500;">${refText}</td>
            <td>${payment.method}</td>
            <td>₹${parseFloat(payment.amount).toFixed(2)}</td>
            <td>${payment.notes || ''}</td>
            <td class="payment-actions">
                <button class="edit-payment-btn" data-id="${payment.id}" data-type="${currentPaymentType}">
                    <i class="material-icons">edit</i>
                </button>
                <button class="delete-payment-btn" data-id="${payment.id}" data-type="${currentPaymentType}">
                    <i class="material-icons">delete</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// View bill from ledger
async function viewBill(billId, source) {
    if (source === 'gst') {
        await loadGSTSavedBill(billId);
    } else {
        await loadSavedBill(billId);
    }
    closeLedgerDialog();

    // Switch to bill view
    if (currentView !== 'bill') {
        toggleView();
    }
}
function convertToDisplayFormat(dateStr) {
    console.log(dateStr);
    if (!dateStr) return 'N/A';

    // If already in dd-mm-yyyy format, return as is
    if (dateStr.includes('-') && dateStr.length === 10) {
        const parts = dateStr.split('-');
        if (parts[0].length === 2 && parts[2].length === 4) {
            return dateStr; // Already dd-mm-yyyy
        }
        // Convert yyyy-mm-dd to dd-mm-yyyy
        if (parts[0].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
    return dateStr;
}

function handleSelectAllChange() {
    const selectAll = document.getElementById('select-all-dates');
    const periodInputs = document.getElementById('period-inputs');

    if (selectAll && periodInputs) {
        if (selectAll.checked) {
            periodInputs.style.display = 'none';
        } else {
            periodInputs.style.display = 'flex';
        }

        loadLedgerData();
    }
}

function handlePeriodChange() {
    const periodSelect = document.getElementById('period-select');
    const fromDateInput = document.getElementById('from-date-input');

    if (periodSelect && fromDateInput) {
        if (periodSelect.value === 'fromdate') {
            fromDateInput.style.display = 'block';
        } else {
            fromDateInput.style.display = 'none';
        }

        loadLedgerData();
    }
}

function getDateRangeForPeriod() {
    const selectAll = document.getElementById('select-all-dates');
    if (!selectAll) return null;

    if (selectAll.checked) {
        return null; // Return null to indicate no filtering (show all)
    }

    const periodSelect = document.getElementById('period-select');
    if (!periodSelect) return null;

    const today = new Date();
    let startDate = new Date();

    switch (periodSelect.value) {
        case '1month':
            startDate.setMonth(today.getMonth() - 1);
            break;
        case '3months':
            startDate.setMonth(today.getMonth() - 3);
            break;
        case '6months':
            startDate.setMonth(today.getMonth() - 6);
            break;
        case 'fromdate':
            const fromDateInput = document.getElementById('from-date-input');
            if (fromDateInput && fromDateInput.value) {
                startDate = new Date(fromDateInput.value);
            } else {
                startDate.setMonth(today.getMonth() - 3);
            }
            break;
        default:
            return null;
    }

    // Format dates as dd-mm-yyyy for filtering
    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    return {
        startDate: formatDate(startDate),
        endDate: formatDate(today)
    };
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Close payment dialog
    document.getElementById('close-payment-dialog').addEventListener('click', closePaymentDialog);

    // Close ledger dialog
    document.getElementById('close-ledger-dialog').addEventListener('click', closeLedgerDialog);

    // Setup payment type toggle
    setupPaymentTypeToggle();

    // Close dialogs when clicking outside
    document.getElementById('payment-dialog').addEventListener('click', function (e) {
        if (e.target === this) closePaymentDialog();
    });

    document.getElementById('ledger-dialog').addEventListener('click', function (e) {
        if (e.target === this) closeLedgerDialog();
    });

    // Sync the "Show Paid" button color immediately on load
    if (typeof updateShowPaidButtonState === 'function') {
        updateShowPaidButtonState();
    }
});

/* 1. GET BILLS (Fixed: Logic for Regular Bills) */
async function getCustomerBills(customerName, gstin, mode = 'regular') {
    let bills = [];
    if (!customerName) return [];

    try {
        const searchName = customerName.toLowerCase().trim();
        const searchGST = gstin ? gstin.toLowerCase().trim() : '';

        // === 1. VENDOR MODE ===
        if (mode === 'vendor') {
            const vendorBills = await getAllFromDB('vendorSavedBills');

            const filtered = vendorBills.filter(bill => {
                const bVal = bill.value;
                const vName = (bVal.vendor?.name || '').toLowerCase().trim();
                return vName === searchName;
            });

            // Normalization: Map vendor bill fields to match what Ledger expects
            bills = filtered.map(bill => ({
                ...bill.value,
                source: 'vendor',
                id: bill.id,
                // Ledger expects 'invoiceDetails' for display
                invoiceDetails: {
                    number: bill.value.billDetails.invoiceNo,
                    date: bill.value.billDetails.date
                }
            }));
        }
        // === 2. GST MODE ===
        // Only look in 'gstSavedBills'
        else if (mode === 'gst') {
            const gstBills = await getAllFromDB('gstSavedBills');
            const filteredGstBills = gstBills.filter(bill => {
                const bVal = bill.value;
                const billGST = (bVal.customer?.billTo?.gstin || '').toLowerCase();
                const shipGST = (bVal.customer?.shipTo?.gstin || '').toLowerCase();

                // Primary: Match GSTIN
                if (searchGST.length > 2) {
                    return billGST === searchGST || shipGST === searchGST;
                }
                // Fallback: Match Name (only if GSTIN is missing/short)
                const custName = (bVal.customer?.billTo?.name || '').toLowerCase().trim();
                return custName === searchName;
            });

            bills = filteredGstBills.map(bill => ({
                ...bill.value, source: 'gst', id: bill.id
            }));
        }
        // === 3. REGULAR MODE ===
        // Only look in 'savedBills'
        else {
            const regularBills = await getAllFromDB('savedBills');

            const filteredRegular = regularBills.filter(bill => {
                const bVal = bill.value;
                const state = bVal.modalState || {};

                // Deep Search for Name matches
                const simpleName = (bVal.customer?.name || state.simple?.name || '').toLowerCase().trim();
                const billToName = (state.billTo?.name || '').toLowerCase().trim();
                const shipToName = (state.shipTo?.name || '').toLowerCase().trim();

                return simpleName === searchName || billToName === searchName || shipToName === searchName;
            });

            bills = filteredRegular.map(bill => ({
                ...bill.value, source: 'regular', id: bill.id
            }));
        }

        return bills;
    } catch (error) {
        console.error('[BILLS] Error fetching:', error);
        return [];
    }
}

/* 3. FINANCIAL DATA AGGREGATOR (Passes Mode) */
async function getCustomerFinancialData(customerName, gstin, dateRange = null, mode = 'regular') {
    console.log(`[FINANCE] Getting data for ${customerName} (Mode: ${mode})`);

    const bills = await getCustomerBills(customerName, gstin, mode);
    const payments = await getCustomerPayments(customerName, gstin, 'payment', {}, mode);
    const creditNotes = await getCustomerPayments(customerName, gstin, 'credit-note', {}, mode);

    // Filter by Date Range
    if (!dateRange) {
        return { bills, payments, creditNotes };
    }

    const filterByDateRange = (items) => {
        return items.filter(item => {
            const itemDate = item.date || item.invoiceDetails?.date;
            if (!itemDate) return false;
            try {
                // Custom date check logic
                if (typeof isDateBefore === 'function') {
                    // Start <= Item <= End
                    return !isDateBefore(itemDate, dateRange.startDate) &&
                        (isDateBefore(itemDate, dateRange.endDate) || itemDate === dateRange.endDate);
                }
                // Fallback string compare if helper missing
                return true;
            } catch (e) { return true; }
        });
    };

    return {
        bills: filterByDateRange(bills),
        payments: filterByDateRange(payments),
        creditNotes: filterByDateRange(creditNotes)
    };
}

/* 5. SETUP DIALOG LISTENER (Ensures button click works) */
function setupPaymentDialog() {
    console.log("[SETUP] setupPaymentDialog initialized");

    // Remove old listeners to prevent duplicates (cloning trick)
    const oldBtn = document.getElementById('add-payment-btn');
    if (oldBtn) {
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);

        // Add new listener
        newBtn.addEventListener('click', function (e) {
            console.log("[CLICK] Add/Update button clicked");
            e.preventDefault(); // Prevent form submission if inside a form tag
            addNewPayment();
        });
    }

    // Search functionality
    const searchInput = document.getElementById('payment-search');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            loadPaymentsAndCreditNotesWithFilters();
        });
    }

    // Sort buttons
    const sortBtn = document.getElementById('sort-order-btn');
    if (sortBtn) {
        sortBtn.addEventListener('click', function () {
            const currentOrder = this.dataset.order;
            const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
            this.dataset.order = newOrder;
            this.querySelector('.material-icons').textContent = newOrder === 'asc' ? 'arrow_upward' : 'arrow_downward';
            loadPaymentsAndCreditNotesWithFilters();
        });
    }

    const sortSelect = document.getElementById('sort-by-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => loadPaymentsAndCreditNotesWithFilters());
    }

    const periodSelect = document.getElementById('statement-period');
    if (periodSelect) {
        periodSelect.addEventListener('change', () => loadPaymentsAndCreditNotesWithFilters());
    }

    // Table Actions (Edit/Delete)
    const tbody = document.getElementById('payments-tbody');
    if (tbody) {
        tbody.addEventListener('click', function (e) {
            const editBtn = e.target.closest('.edit-payment-btn');
            const deleteBtn = e.target.closest('.delete-payment-btn');

            if (editBtn) {
                const recordId = editBtn.dataset.id;
                const recordType = editBtn.dataset.type;
                editPaymentRecord(recordId, recordType);
            }

            if (deleteBtn) {
                const recordId = deleteBtn.dataset.id;
                const recordType = deleteBtn.dataset.type;
                deletePaymentRecordConfirm(recordId, recordType);
            }
        });
    }
}

async function deletePaymentRecordConfirm(recordId, recordType = null) {
    const type = recordType || currentPaymentType;
    const typeLabel = type === 'payment' ? 'Payment' : 'Credit Note';

    const shouldDelete = await showConfirm(`Are you sure you want to delete this ${typeLabel.toLowerCase()}?`);
    if (shouldDelete) {
        try {
            await deletePaymentRecord(recordId, type);
            loadPaymentsAndCreditNotesWithFilters();
            showNotification(`${typeLabel} deleted successfully`, 'success');
        } catch (error) {
            console.error('Error deleting record:', error);
            showNotification('Error deleting record. Please try again.', 'error');
        }
    }
}

/* 4. LOAD PAYMENT LIST (Passes Correct Mode) */
async function loadPaymentsAndCreditNotesWithFilters() {
    if (!currentPaymentCustomer) return;

    const filters = {
        search: document.getElementById('payment-search').value,
        sortBy: document.getElementById('sort-by-select').value,
        sortOrder: document.getElementById('sort-order-btn').dataset.order,
        period: document.getElementById('statement-period').value
    };

    // Use the mode detected during openPaymentDialog
    const mode = currentPaymentCustomer.mode || 'regular';

    const payments = await getCustomerPayments(
        currentPaymentCustomer.name,
        currentPaymentCustomer.gstin,
        currentPaymentType,
        filters,
        mode // <--- CRITICAL FIX: Pass the mode explicitly
    );

    displayPayments(payments);
}

/* 1. ADD NEW PAYMENT (Strict Type Saving) */
async function addNewPayment() {
    if (!currentPaymentCustomer) return;

    const methodSelect = document.getElementById('payment-method');
    let finalMethod = methodSelect.value;
    if (finalMethod === 'Other') finalMethod = document.getElementById('custom-payment-method').value.trim();

    const date = document.getElementById('payment-date').value;
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const notes = document.getElementById('payment-notes').value;

    // --- CRITICAL: DETERMINE REF TYPE & MODE ---
    let refType = '';
    const mode = currentPaymentCustomer.mode || 'regular';

    if (mode === 'gst') {
        // 1. GST CUSTOMER (Existing Logic)
        refType = 'Tax Invoice';
    }
    else if (mode === 'vendor') {
        // 2. VENDOR (New Logic)
        // Check if this specific vendor has a valid GSTIN
        const gstin = (currentPaymentCustomer.gstin || '').toLowerCase().trim();
        const isGSTVendor = gstin.length > 5 &&
            !gstin.includes('not provided') &&
            !gstin.includes('n/a');

        refType = isGSTVendor ? 'Tax Invoice' : 'Invoice';
    }
    else {
        // 3. REGULAR CUSTOMER (Existing Logic)
        const selectEl = document.getElementById('payment-ref-type');
        refType = selectEl ? selectEl.value : '';
        if (!refType || refType === '') refType = 'Invoice';
    }

    const refPrefix = document.getElementById('payment-ref-prefix').value;
    const refBillNo = document.getElementById('payment-ref-billno').value;
    const refDisplay = document.getElementById('payment-ref-no').value;

    if (!date || !finalMethod || isNaN(amount)) {
        showNotification('Please fill required fields', 'error'); return;
    }

    if (currentPaymentType === 'payment' && amount <= 0) {
        showNotification('Amount must be positive', 'error'); return;
    }
    if (currentPaymentType === 'credit-note' && amount === 0) {
        showNotification('Amount cannot be zero', 'error'); return;
    }

    if (currentlyEditingPaymentId) {
        await updatePaymentRecord();
        return;
    }

    try {
        // --- DETERMINE CORRECT STORE FOR RECEIPT NO ---
        let storeName = '';
        if (mode === 'vendor') {
            storeName = currentPaymentType === 'payment' ? 'vendorPayments' : 'vendorCreditNotes';
        } else {
            storeName = currentPaymentType === 'payment' ? 'customerPayments' : 'customerCreditNotes';
        }

        const allRecords = await getAllFromDB(storeName);

        let maxNo = 0;
        allRecords.forEach(rec => {
            const val = rec.receiptNo || rec.value?.receiptNo;
            const num = parseInt(val || 0);
            if (!isNaN(num) && num > maxNo) maxNo = num;
        });
        const newReceiptNo = maxNo + 1;

        const paymentData = {
            date, method: finalMethod, amount, notes,
            receiptNo: newReceiptNo,
            refType, refPrefix, refBillNo, refDisplay
        };

        await savePaymentRecord(currentPaymentCustomer.name, currentPaymentCustomer.gstin, paymentData, currentPaymentType);

        showNotification(`${currentPaymentType === 'payment' ? 'Payment' : 'Credit Note'} added!`, 'success');

        paymentDraftState[currentPaymentType] = {};
        resetPaymentForm(true);
        loadPaymentsAndCreditNotesWithFilters();

    } catch (error) {
        console.error('Error adding payment:', error);
    }
}

// Profit Calculation System - Complete Recalculation
let missingPurchaseItems = [];
let isProfitViewActive = false;
let originalRates = new Map();

// Toggle profit view
function toggleProfitView() {
    if (isProfitViewActive) {
        restoreOriginalRates();
    } else {
        calculateProfit();
    }
}

/* ==========================================================================
   PDF DOWNLOAD LOGIC (LEDGER)
   ========================================================================== */
/* PDF DOWNLOAD (Fixed: 60% Width for Addresses) */
async function downloadLedgerPDF() {
    if (!currentPaymentCustomer) {
        showNotification("No customer selected", "error");
        return;
    }

    try {
        showNotification("Generating PDF...", "info");

        // 1. Get Company Info
        const company = await getFromDB('companyInfo', 'companyInfo') || {};

        // 2. Determine Mode & Details
        const mode = currentPaymentCustomer.mode || 'regular';
        let addressText = '';
        let headerTitle = 'LEDGER STATEMENT';

        if (mode === 'vendor') {
            headerTitle = 'VENDOR LEDGER STATEMENT';
            // Fetch full vendor details from DB
            try {
                const vendors = await getAllFromDB('vendorList');
                const match = vendors.find(v => v.value.name.toLowerCase() === currentPaymentCustomer.name.toLowerCase());
                if (match) {
                    const v = match.value;
                    const parts = [];
                    if (v.address) parts.push(v.address);
                    if (v.phone) parts.push(`Phone: ${v.phone}`);
                    if (v.email) parts.push(`Email: ${v.email}`);
                    addressText = parts.join('\n');
                }
            } catch (e) { console.error("Error fetching vendor details for PDF", e); }
        } else {
            // Regular Customer logic
            if (typeof getCustomerAddressStr === 'function') {
                addressText = await getCustomerAddressStr(currentPaymentCustomer);
            }
        }

        // 3. Get Ledger Table Data (Scrape from DOM)
        // (The DOM is already updated by loadLedgerData, so "Purchase" will appear here automatically)
        const tableBody = [];

        // Header Row
        tableBody.push([
            { text: 'Date', style: 'tableHeader' },
            { text: 'Particulars', style: 'tableHeader' },
            { text: 'Debit (₹)', style: 'tableHeader', alignment: 'right' },
            { text: 'Credit (₹)', style: 'tableHeader', alignment: 'right' }
        ]);

        // Scrape Body Rows
        const rows = document.querySelectorAll('#ledger-tbody tr');
        let startDate = '';
        let endDate = '';

        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                const date = cells[0].innerText.trim();
                const part = cells[1].innerText.trim();
                const debit = cells[2].innerText.trim();
                const credit = cells[3].innerText.trim();

                if (index === 0) startDate = date;
                if (index === rows.length - 1) endDate = date;

                tableBody.push([
                    { text: date, style: index === 0 ? 'boldRow' : 'bodyText' },
                    { text: part, style: index === 0 ? 'boldRow' : 'bodyText' },
                    { text: debit, alignment: 'right', style: index === 0 ? 'boldRow' : 'bodyText' },
                    { text: credit, alignment: 'right', style: index === 0 ? 'boldRow' : 'bodyText' }
                ]);
            }
        });

        // Scrape Footer Rows
        const footRows = document.querySelectorAll('.unified-ledger-table tfoot tr');
        footRows.forEach(row => {
            const cells = row.querySelectorAll('td');

            if (cells.length === 3) {
                const label = cells[0].innerText.trim();
                const val1 = cells[1].innerText.trim();
                const val2 = cells[2].innerText.trim();

                tableBody.push([
                    { text: label, colSpan: 2, style: 'footerBold', alignment: 'right' },
                    {},
                    { text: val1, style: 'footerBold', alignment: 'right' },
                    { text: val2, style: 'footerBold', alignment: 'right' }
                ]);
            }
            else if (cells.length === 2) {
                const label = cells[0].innerText.trim();
                const value = cells[1].innerText.trim();

                if (label.toLowerCase().includes('advance deposit')) {
                    const numVal = parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
                    if (numVal === 0) return;
                }

                tableBody.push([
                    { text: label, colSpan: 2, style: 'footerBold', alignment: 'right' },
                    {},
                    { text: value, colSpan: 2, style: 'footerBold', alignment: 'center' },
                    {}
                ]);
            }
            else if (cells.length === 4) {
                tableBody.push([
                    { text: cells[0].innerText.trim(), style: 'footerBold' },
                    { text: cells[1].innerText.trim(), style: 'footerBold' },
                    { text: cells[2].innerText.trim(), style: 'footerBold', alignment: 'right' },
                    { text: cells[3].innerText.trim(), style: 'footerBold', alignment: 'right' }
                ]);
            }
        });

        // 4. Define Document Definition
        const docDefinition = {
            content: [
                // Header: Customer/Vendor Details
                {
                    columns: [
                        {
                            width: '55%',
                            stack: [
                                { text: headerTitle, style: 'mainHeader' },
                                { text: currentPaymentCustomer.name.toUpperCase(), style: 'customerName' },
                                { text: addressText, style: 'subText' },
                                { text: `GSTIN: ${currentPaymentCustomer.gstin || 'N/A'}`, style: 'subText' }
                            ]
                        },
                        {
                            width: '*',
                            stack: [
                                { text: `Date: ${new Date().toLocaleDateString('en-IN')}`, alignment: 'right', style: 'metaText' },
                                { text: `Period: ${startDate} to ${endDate}`, alignment: 'right', style: 'metaText' }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },

                // Table
                {
                    table: {
                        headerRows: 1,
                        widths: ['15%', '45%', '20%', '20%'],
                        body: tableBody
                    },
                    layout: {
                        paddingLeft: function (i) { return 5; },
                        paddingRight: function (i) { return 5; },
                        paddingTop: function (i) { return 5; },
                        paddingBottom: function (i) { return 5; },
                        vLineWidth: function (i, node) { return 0; },
                        hLineWidth: function (i, node) {
                            if (i === 0) return 0;
                            if (i === 1) return 2;
                            return 1;
                        },
                        hLineColor: function (i, node) { return '#444444'; }
                    }
                },

                // Footer: Company Details
                {
                    columns: [
                        {
                            width: '60%',
                            stack: [
                                {
                                    text: 'Regards,',
                                    margin: [0, 30, 0, 5],
                                    bold: true
                                },
                                {
                                    text: (company.name || 'Company Name').toUpperCase(),
                                    bold: true,
                                    fontSize: 11
                                },
                                {
                                    text: [
                                        company.address || '',
                                        company.gstin ? `\nGSTIN: ${company.gstin}` : '',
                                        company.email ? `\nEmail: ${company.email}` : ''
                                    ],
                                    style: 'subText',
                                    color: '#555'
                                }
                            ]
                        }
                    ]
                }
            ],
            styles: {
                mainHeader: { fontSize: 16, bold: true, margin: [0, 0, 0, 5], color: '#2c3e50' },
                customerName: { fontSize: 14, bold: true, margin: [0, 0, 0, 2] },
                subText: { fontSize: 9, color: '#555' },
                metaText: { fontSize: 9, color: '#555' },
                tableHeader: { bold: true, fontSize: 10, color: 'black', fillColor: '#f2f2f2' },
                bodyText: { fontSize: 10 },
                boldRow: { fontSize: 10, bold: true },
                footerBold: { fontSize: 10, bold: true, fillColor: '#f9f9f9' }
            }
        };

        // 5. Generate Filename
        const safeName = currentPaymentCustomer.name.replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const modeStr = currentPaymentCustomer.mode || 'regular';

        const fileName = `Ledger_${safeName}_${dateStr}_${modeStr}.pdf`;

        pdfMake.createPdf(docDefinition).download(fileName);
        showNotification("PDF Downloaded", "success");

    } catch (e) {
        console.error("PDF Error:", e);
        showNotification("Error generating PDF", "error");
    }
}


// Helper to get address string safely (Checking GST customers then Regular)
async function getCustomerAddressStr(custObj) {
    // 1. Try GST Customers first
    const gstCusts = await getAllFromDB('gstCustomers');
    const gstMatch = gstCusts.find(c => c.value.name === custObj.name && c.value.gstin === custObj.gstin);
    if (gstMatch) {
        let addr = gstMatch.value.address || '';
        if (gstMatch.value.phone) addr += `\nPh: ${gstMatch.value.phone}`;
        return addr;
    }

    // 2. Try Regular Customers
    const regCusts = await getAllFromDB('savedCustomers');
    const regMatch = regCusts.find(c => c.value.name === custObj.name);
    if (regMatch) {
        let addr = regMatch.value.address || '';
        if (regMatch.value.phone) addr += `\nPh: ${regMatch.value.phone}`;
        return addr;
    }

    return 'Address Not Found';
}

// Update the profit button in sidebar to use toggle:
// Change: onclick="calculateProfit()" to onclick="toggleProfitView()"
// Main profit calculation function
async function calculateProfit() {
    try {
        // Get all items from current bill
        const items = getCurrentBillItems();

        if (items.length === 0) {
            showNotification('No items in current bill to calculate profit');
            return;
        }

        // Check for items with missing purchase prices
        missingPurchaseItems = await findItemsWithMissingPurchasePrices(items);

        if (missingPurchaseItems.length > 0) {
            // Show dialog for missing purchase prices
            showPurchasePriceDialog(missingPurchaseItems);
        } else {
            // All purchase prices available, calculate profit directly
            applyProfitRecalculation(items);
        }
    } catch (error) {
        console.error('Error calculating profit:', error);
        showNotification('Error calculating profit. Please try again.');
    }
}

// Get all items from current bill
function getCurrentBillItems() {
    const items = [];
    const rows = document.querySelectorAll('#createListManual tbody tr[data-id]');

    rows.forEach(row => {
        const cells = row.children;
        const particularsDiv = cells[1];
        const itemName = particularsDiv.querySelector('.itemNameClass')?.textContent.trim() || '';

        if (itemName) {
            const rate = parseFloat(cells[4].textContent) || 0;
            const quantity = parseFloat(cells[2].textContent) || 0;
            const amount = parseFloat(cells[5].textContent) || 0;

            items.push({
                id: row.getAttribute('data-id'),
                itemName: itemName,
                currentRate: rate,
                quantity: quantity,
                amount: amount,
                row: row
            });
        }
    });

    return items;
}

// Find items with missing purchase prices
async function findItemsWithMissingPurchasePrices(items) {
    const missingItems = [];

    for (const item of items) {
        const savedItem = await getFromDB('savedItems', item.itemName);

        if (!savedItem || !savedItem.purchaseRate || savedItem.purchaseRate <= 0) {
            missingItems.push({
                ...item,
                purchaseRate: savedItem?.purchaseRate || 0
            });
        }
    }

    return missingItems;
}

// Show purchase price dialog
function showPurchasePriceDialog(missingItems) {
    const itemsList = document.getElementById('purchase-price-items-list');
    itemsList.innerHTML = '';

    missingItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'purchase-price-item';
        itemElement.innerHTML = `
            <div class="purchase-price-item-name">${item.itemName}</div>
            <div class="current-rate">Selling: ₹${item.currentRate.toFixed(2)}</div>
            <div class="purchase-price-input-group">
                <label>Purchase:</label>
                <input type="number" 
                       class="purchase-price-input" 
                       data-item-id="${item.id}"
                       value="${item.purchaseRate || ''}" 
                       placeholder="0.00" 
                       step="0.01" 
                       min="0">
            </div>
        `;
        itemsList.appendChild(itemElement);
    });

    document.getElementById('purchase-price-dialog').classList.add('active');
}

// Close purchase price dialog
function closePurchasePriceDialog() {
    document.getElementById('purchase-price-dialog').classList.remove('active');
    missingPurchaseItems = [];
}

// Store original rates for restoration
function storeOriginalRates() {
    originalRates.clear();
    const rows = document.querySelectorAll('#createListManual tbody tr[data-id]');

    rows.forEach(row => {
        const itemId = row.getAttribute('data-id');
        const currentRate = parseFloat(row.children[4].textContent) || 0;
        originalRates.set(itemId, currentRate);
    });
}


// Sync restore to other tables with error handling
function syncRestoreToOtherTables(itemId, originalRate, originalAmount) {
    try {
        // Update copyListManual table
        const copyRow = document.querySelector(`#copyListManual tr[data-id="${itemId}"]`);
        if (copyRow) {
            const cells = copyRow.children;
            cells[4].textContent = originalRate.toFixed(2);
            cells[5].textContent = originalAmount.toFixed(2);
        }

        // Update GST table if in GST mode
        if (isGSTMode) {
            const gstRow = document.querySelector(`#gstCopyListManual tr[data-id="${itemId}"]`);
            if (gstRow) {
                const cells = gstRow.children;
                cells[5].textContent = originalRate.toFixed(2);
                cells[6].textContent = originalAmount.toFixed(2);
            }
        }
    } catch (error) {
        console.error('Error syncing restore to other tables:', error);
    }
}

// Detect and restore profit state after page refresh
function restoreProfitStateAfterRefresh() {
    const rows = document.querySelectorAll('#createListManual tbody tr[data-id]');
    let needsRestoration = false;

    // Check if any rows are in profit display mode (have profit HTML)
    rows.forEach(row => {
        const rateCell = row.children[4];
        const amountCell = row.children[5];

        // Check if cells contain profit display HTML instead of plain numbers
        const hasProfitHTML = rateCell.innerHTML.includes('profit-rate-display') ||
            rateCell.innerHTML.includes('profit-rate') ||
            amountCell.innerHTML.includes('profit-amount-display') ||
            amountCell.innerHTML.includes('profit-amount');

        // Check if cells contain NaN or invalid values
        const rateValue = parseFloat(rateCell.textContent);
        const amountValue = parseFloat(amountCell.textContent);
        const hasInvalidValues = isNaN(rateValue) || isNaN(amountValue);

        if (hasProfitHTML || hasInvalidValues) {
            needsRestoration = true;
        }
    });

    // Also check the total amount display
    const totalAmountElement = document.getElementById('createTotalAmountManual');
    if (totalAmountElement && totalAmountElement.innerHTML.includes('profit-total-display')) {
        needsRestoration = true;
    }

    if (needsRestoration) {
        console.log('Page was refreshed while in profit view. Restoring normal state...');
        const restoredCount = restoreOriginalRates();

        // Show a subtle notification
        if (restoredCount > 0) {
            console.log(`Successfully restored ${restoredCount} items after page refresh`);
        }
    }

    return needsRestoration;
}

// Enhanced restore function to handle both manual restore and page refresh
function restoreOriginalRates() {
    const rows = document.querySelectorAll('#createListManual tbody tr[data-id]');
    let restoredCount = 0;

    rows.forEach(row => {
        const cells = row.children;

        // Method 1: Try to get original rate from data attribute
        let originalRate = parseFloat(row.getAttribute('data-original-rate'));

        // Method 2: If no original rate, try to get from data-rate attribute
        if (isNaN(originalRate) || originalRate <= 0) {
            originalRate = parseFloat(row.getAttribute('data-rate'));
        }

        // Method 3: If still no rate, try to parse from cell content
        if (isNaN(originalRate) || originalRate <= 0) {
            const rateText = cells[4].textContent || cells[4].innerText;
            originalRate = parseFloat(rateText.replace(/[^\d.]/g, ''));
        }

        // Method 4: If all methods fail, use a default safe value
        if (isNaN(originalRate) || originalRate <= 0) {
            originalRate = 1; // Safe default to avoid NaN
        }

        // Calculate final quantity and amount
        const finalQuantity = getFinalQuantity(row);
        const originalAmount = finalQuantity * originalRate;

        // Restore simple numeric display
        cells[4].textContent = originalRate.toFixed(2);
        cells[5].textContent = originalAmount.toFixed(2);

        // Ensure data attributes are correct and clean
        row.setAttribute('data-rate', originalRate.toFixed(8));
        row.setAttribute('data-amount', originalAmount.toFixed(8));

        // Remove all profit-specific attributes
        row.removeAttribute('data-profit-rate');
        row.removeAttribute('data-profit-amount');
        row.removeAttribute('data-purchase-rate');
        row.removeAttribute('data-original-rate');

        // Sync to other tables
        syncRestoreToOtherTables(row.getAttribute('data-id'), originalRate, originalAmount);

        restoredCount++;
    });

    // Restore original totals
    updateTotal();

    // Update UI state
    isProfitViewActive = false;
    updateProfitButtonState(false);

    console.log(`Restored ${restoredCount} items from profit view`);
    return restoredCount;
}


// Robust final quantity calculation
function getFinalQuantity(row) {
    try {
        const dimensionType = row.getAttribute('data-dimension-type') || 'none';
        const originalQuantity = parseFloat(row.getAttribute('data-original-quantity') || row.children[2].textContent) || 0;
        let finalQuantity = originalQuantity;

        if (dimensionType !== 'none' && dimensionType !== 'dozen') {
            const dimensionValues = JSON.parse(row.getAttribute('data-dimension-values') || '[0,0,0]');
            const calculatedArea = calculateAreaFromDimensions(dimensionType, dimensionValues);
            finalQuantity = originalQuantity * (calculatedArea || 1);
        } else if (dimensionType === 'dozen') {
            finalQuantity = originalQuantity / 12;
        }

        return finalQuantity > 0 ? finalQuantity : 1; // Never return 0
    } catch (error) {
        console.error('Error calculating final quantity:', error);
        return 1; // Safe fallback
    }
}
// Update individual item with profit calculation
function updateItemWithProfitCalculation(row, profitRate, purchaseRate, originalRate) {
    const cells = row.children;
    const finalQuantity = getFinalQuantity(row);

    // Update rate cell to show profit
    cells[4].innerHTML = `
        <div class="profit-rate-display">
            <div class="original-rate">₹${originalRate.toFixed(2)}</div>
            <div class="profit-rate">Profit: ₹${profitRate.toFixed(2)}</div>
            <div class="purchase-rate">Cost: ₹${purchaseRate.toFixed(2)}</div>
        </div>
    `;

    // Calculate and update profit amount
    const profitAmount = finalQuantity * profitRate;
    cells[5].innerHTML = `
        <div class="profit-amount-display">
            <div class="profit-amount">₹${profitAmount.toFixed(2)}</div>
            <div class="profit-label">Profit</div>
        </div>
    `;

    // Update data attributes for profit mode
    row.setAttribute('data-profit-rate', profitRate.toFixed(8));
    row.setAttribute('data-profit-amount', profitAmount.toFixed(8));
    row.setAttribute('data-original-rate', originalRate.toFixed(8));
    row.setAttribute('data-purchase-rate', purchaseRate.toFixed(8));

    // Sync to other tables
    syncProfitUpdateToOtherTables(row.getAttribute('data-id'), profitRate, profitAmount, originalRate, purchaseRate);
}

// Update table totals with profit amounts
function updateTableTotalsWithProfit() {
    // Calculate total profit from all items
    const rows = document.querySelectorAll('#createListManual tbody tr[data-id]');
    let totalProfit = 0;

    rows.forEach(row => {
        const profitAmount = parseFloat(row.getAttribute('data-profit-amount') || 0);
        totalProfit += profitAmount;
    });

    // Apply discount to profit if discount exists
    let finalProfit = totalProfit;
    if (discountPercent > 0) {
        const discountAmount = totalProfit * (discountPercent / 100);
        finalProfit = totalProfit - discountAmount;
    }

    // Update total display
    const totalAmountElement = document.getElementById('createTotalAmountManual');
    totalAmountElement.innerHTML = `
        <div class="profit-total-display">
            <div class="total-profit">₹${finalProfit.toFixed(2)}</div>
            <div class="profit-total-label">Total Profit</div>
            ${discountPercent > 0 ? `<div class="profit-discount">After ${discountPercent}% discount</div>` : ''}
        </div>
    `;

    // Update copy table total
    const copyTotalElement = document.getElementById('copyTotalAmount');
    if (copyTotalElement) {
        copyTotalElement.innerHTML = `
            <div class="profit-total-display">
                <div class="total-profit">₹${finalProfit.toFixed(2)}</div>
                <div class="profit-total-label">Total Profit</div>
            </div>
        `;
    }
}

// Update profit button state
function updateProfitButtonState(isActive) {
    const profitBtn = document.querySelector('.settings-btn[onclick="toggleProfitView()"]');
    if (profitBtn) {
        if (isActive) {
            profitBtn.style.backgroundColor = '#27ae60';
            profitBtn.innerHTML = '<span class="material-icons">show_chart</span>PROFIT VIEW ACTIVE';
        } else {
            profitBtn.style.backgroundColor = '';
            profitBtn.innerHTML = '<span class="material-icons">calculate</span>PROFIT CALCULATION';
        }
    }
}

// Apply profit recalculation to all items
async function applyProfitRecalculation(items, manualPurchasePrices = {}) {
    try {
        // Store original rates for restoration
        storeOriginalRates();

        let totalProfit = 0;
        let updatedItems = 0;

        for (const item of items) {
            let purchaseRate = 0;

            // Get purchase rate from manual input or saved item
            if (manualPurchasePrices[item.id]) {
                purchaseRate = manualPurchasePrices[item.id];
            } else {
                const savedItem = await getFromDB('savedItems', item.itemName);
                purchaseRate = savedItem?.purchaseRate || 0;
            }

            if (purchaseRate > 0 && item.currentRate > purchaseRate) {
                // Calculate profit rate (selling rate - purchase rate)
                const profitRate = item.currentRate - purchaseRate;

                // Update the item with profit calculation
                updateItemWithProfitCalculation(item.row, profitRate, purchaseRate, item.currentRate);
                totalProfit += profitRate * getFinalQuantity(item.row);
                updatedItems++;
            } else if (purchaseRate > 0) {
                // No profit or loss
                updateItemWithProfitCalculation(item.row, 0, purchaseRate, item.currentRate);
            }
        }

        // Update table totals with profit amounts
        updateTableTotalsWithProfit();

        isProfitViewActive = true;

        // Show summary
        if (updatedItems > 0) {
            const profitMessage = `Profit calculation applied to ${updatedItems} items.\nTotal Profit: ₹${totalProfit.toFixed(2)}`;
            console.log(profitMessage);

            // Update profit button to show it's active
            updateProfitButtonState(true);
        } else {
            showNotification('No profit calculation applied. Check if purchase prices are set correctly.');
        }

    } catch (error) {
        console.error('Error applying profit calculation:', error);
        showNotification('Error applying profit calculation. Please try again.');
    }
}
async function updateSavedItemsWithPurchasePrices(purchasePrices, items) {
    // Add safety check for items
    if (!items || !Array.isArray(items)) {
        console.error('Invalid items array:', items);
        return;
    }

    // Additional check for empty array
    if (items.length === 0) {
        console.warn('No items to update with purchase prices');
        return;
    }

    for (const item of items) {
        if (purchasePrices[item.id]) {
            const savedItem = await getFromDB('savedItems', item.itemName);

            if (savedItem) {
                // Update existing item
                savedItem.purchaseRate = parseFloat(purchasePrices[item.id]);
                await setInDB('savedItems', item.itemName, savedItem);
            } else {
                // Create new saved item with purchase rate
                const newItem = {
                    name: item.itemName,
                    purchaseRate: parseFloat(purchasePrices[item.id]),
                    timestamp: Date.now()
                };
                await setInDB('savedItems', item.itemName, newItem);
            }
        }
    }
}
async function applyProfitCalculation() {
    try {
        // Collect all purchase prices from the dialog
        const purchasePriceInputs = document.querySelectorAll('.purchase-price-input');
        const purchasePrices = {};

        let allPricesValid = true;

        purchasePriceInputs.forEach(input => {
            const itemId = input.dataset.itemId;
            const purchaseRate = parseFloat(input.value) || 0;

            if (purchaseRate <= 0) {
                allPricesValid = false;
                input.style.borderColor = '#e74c3c';
            } else {
                purchasePrices[itemId] = purchaseRate;
                input.style.borderColor = '';
            }
        });

        if (!allPricesValid) {
            showNotification('Please enter valid purchase prices for all items (greater than 0)');
            return;
        }

        // === FIX: Get the items again to ensure they're available ===
        const items = getCurrentBillItems();

        if (!items || items.length === 0) {
            showNotification('No items found to calculate profit');
            return;
        }

        // Update saved items with purchase prices
        await updateSavedItemsWithPurchasePrices(purchasePrices, items);

        // Get all items and apply profit recalculation
        applyProfitRecalculation(items, purchasePrices);

        closePurchasePriceDialog();

    } catch (error) {
        console.error('Error applying profit calculation:', error);
        showNotification('Error applying profit calculation. Please try again.');
    }
}

// Apply profit calculation to all items
async function applyProfitToAllItems(items, manualPurchasePrices = {}) {
    let totalProfit = 0;
    let updatedItems = 0;

    for (const item of items) {
        let purchaseRate = 0;

        // Get purchase rate from manual input or saved item
        if (manualPurchasePrices[item.id]) {
            purchaseRate = manualPurchasePrices[item.id];
        } else {
            const savedItem = await getFromDB('savedItems', item.itemName);
            purchaseRate = savedItem?.purchaseRate || 0;
        }

        if (purchaseRate > 0) {
            // Calculate profit rate (selling rate - purchase rate)
            const profitRate = item.currentRate - purchaseRate;

            if (profitRate > 0) {
                // Update the item rate with profit calculation
                updateItemRateWithProfit(item.row, profitRate, purchaseRate);
                totalProfit += profitRate * item.quantity;
                updatedItems++;
            }
        }
    }

    // Show summary
    if (updatedItems > 0) {
        const profitMessage = `Profit calculation applied to ${updatedItems} items.\nTotal Profit: ₹${totalProfit.toFixed(2)}`;
        console.log(profitMessage);

        // Optional: Show success message
        showNotification(profitMessage);
    } else {
        showNotification('No profit calculation applied. Check if purchase prices are set correctly.');
    }
}

// Update individual item rate with profit calculation
function updateItemRateWithProfit(row, profitRate, purchaseRate) {
    const cells = row.children;
    const currentRate = parseFloat(cells[4].textContent) || 0;

    // Calculate new rate based on desired profit
    const newRate = purchaseRate + profitRate;

    // Update rate cell
    cells[4].textContent = newRate.toFixed(2);

    // Recalculate amount based on dimension type
    const dimensionType = row.getAttribute('data-dimension-type') || 'none';
    const originalQuantity = parseFloat(row.getAttribute('data-original-quantity') || cells[2].textContent);
    let finalQuantity = originalQuantity;

    if (dimensionType !== 'none' && dimensionType !== 'dozen') {
        const dimensionValues = JSON.parse(row.getAttribute('data-dimension-values') || '[0,0,0]');
        const calculatedArea = calculateAreaFromDimensions(dimensionType, dimensionValues);
        finalQuantity = originalQuantity * calculatedArea;
    } else if (dimensionType === 'dozen') {
        finalQuantity = originalQuantity / 12;
    }

    // Update amount
    const newAmount = finalQuantity * newRate;
    cells[5].textContent = newAmount.toFixed(2);

    // Update data attributes
    row.setAttribute('data-rate', newRate.toFixed(8));
    row.setAttribute('data-amount', newAmount.toFixed(8));

    // Sync to other tables
    syncProfitUpdateToOtherTables(row.getAttribute('data-id'), newRate, newAmount);
}

// Sync profit update to other tables
function syncProfitUpdateToOtherTables(itemId, profitRate, profitAmount, originalRate, purchaseRate) {
    // Update copyListManual table
    const copyRow = document.querySelector(`#copyListManual tr[data-id="${itemId}"]`);
    if (copyRow) {
        const cells = copyRow.children;
        cells[4].innerHTML = `
            <div class="profit-rate-display">
                <div class="original-rate">₹${originalRate.toFixed(2)}</div>
                <div class="profit-rate">Profit: ₹${profitRate.toFixed(2)}</div>
            </div>
        `;
        cells[5].innerHTML = `
            <div class="profit-amount-display">
                <div class="profit-amount">₹${profitAmount.toFixed(2)}</div>
                <div class="profit-label">Profit</div>
            </div>
        `;
    }

    // Update GST table if in GST mode
    if (isGSTMode) {
        const gstRow = document.querySelector(`#gstCopyListManual tr[data-id="${itemId}"]`);
        if (gstRow) {
            const cells = gstRow.children;
            cells[5].innerHTML = `
                <div class="profit-rate-display">
                    <div class="original-rate">₹${originalRate.toFixed(2)}</div>
                    <div class="profit-rate">Profit: ₹${profitRate.toFixed(2)}</div>
                </div>
            `;
            cells[6].innerHTML = `
                <div class="profit-amount-display">
                    <div class="profit-amount">₹${profitAmount.toFixed(2)}</div>
                    <div class="profit-label">Profit</div>
                </div>
            `;
        }
    }
}

// Add event listeners for purchase price dialog
document.addEventListener('DOMContentLoaded', function () {
    // Close purchase price dialog
    document.getElementById('close-purchase-dialog').addEventListener('click', closePurchasePriceDialog);

    // Close dialog when clicking outside
    document.getElementById('purchase-price-dialog').addEventListener('click', function (e) {
        if (e.target === this) closePurchasePriceDialog();
    });

    // Validate purchase price inputs on change
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('purchase-price-input')) {
            const value = parseFloat(e.target.value) || 0;
            if (value > 0) {
                e.target.style.borderColor = '';
            }
        }
    });
});

function deleteCurrentTerms() {
    if (window.currentEditingTermsDiv && confirm('Are you sure you want to delete these terms?')) {
        window.currentEditingTermsDiv.remove();
        closeTermsListModal();
        // Save immediately after deletion
        saveToLocalStorage();
        showNotification('Terms deleted successfully', 'success');
    }
}

function openTermsListModal() {
    toggleSettingsSidebar();
    // Reset editing state
    window.currentEditingTermsDiv = null;

    // Hide delete button for new terms
    const deleteBtn = document.getElementById('delete-terms-btn');
    if (deleteBtn) deleteBtn.style.display = 'none';

    // Reset form
    termsListItems = [];
    termsListType = 'ul';
    termsListStyle = 'disc';

    document.getElementById('terms-heading').value = '';
    document.getElementById('terms-list-type').value = 'ul';
    updateListStyleOptions();
    document.getElementById('terms-items-container').innerHTML = '';

    // Set modal title for new terms
    document.getElementById('section-modal-title').textContent = 'Create Terms & Conditions';
    document.getElementById('save-section-btn').textContent = 'Add Terms';

    // Add first empty item
    addTermsListItem();

    updateTermsPreview();
    document.getElementById('terms-list-modal').style.display = 'block';
}

function closeTermsListModal() {
    document.getElementById('terms-list-modal').style.display = 'none';
    // Reset editing state
    window.currentEditingTermsDiv = null;
    // Hide delete button
    const deleteBtn = document.getElementById('delete-terms-btn');
    if (deleteBtn) deleteBtn.style.display = 'none';
    // Reset modal title
    document.getElementById('section-modal-title').textContent = 'Create Terms & Conditions';
    document.getElementById('save-section-btn').textContent = 'Add Terms';
}

function handleListTypeChange() {
    termsListType = document.getElementById('terms-list-type').value;
    updateListStyleOptions();
    updateTermsPreview();
}

function updateListStyleOptions() {
    const styleSelect = document.getElementById('terms-list-style');
    styleSelect.innerHTML = '';

    const styles = termsListType === 'ul'
        ? [
            { value: 'disc', text: '● Disc' },
            { value: 'circle', text: '○ Circle' },
            { value: 'square', text: '■ Square' },
            { value: 'none', text: 'None' }
        ]
        : [
            { value: 'decimal', text: '1. Decimal' },
            { value: 'decimal-leading-zero', text: '01. Decimal Zero' },
            { value: 'lower-roman', text: 'i. Lower Roman' },
            { value: 'upper-roman', text: 'I. Upper Roman' },
            { value: 'lower-alpha', text: 'a. Lower Alpha' },
            { value: 'upper-alpha', text: 'A. Upper Alpha' },
            { value: 'none', text: 'None' }
        ];

    styles.forEach(style => {
        const option = document.createElement('option');
        option.value = style.value;
        option.textContent = style.text;
        styleSelect.appendChild(option);
    });

    styleSelect.value = termsListType === 'ul' ? 'disc' : 'decimal';
    termsListStyle = styleSelect.value;
}

function editExistingTerms(termsDiv) {
    // Store reference to the terms div being edited
    window.currentEditingTermsDiv = termsDiv;

    // Extract data from existing terms
    const heading = termsDiv.querySelector('h4')?.textContent || '';
    const listElement = termsDiv.querySelector('ul, ol');
    const listType = listElement?.tagName.toLowerCase() || 'ul';
    const listStyle = listElement?.style.listStyleType || (listType === 'ul' ? 'disc' : 'decimal');

    // Extract list items
    const listItems = Array.from(termsDiv.querySelectorAll('li')).map(li => li.textContent);

    // Set modal title and show delete button
    document.getElementById('section-modal-title').textContent = 'Edit Terms & Conditions';
    document.getElementById('save-section-btn').textContent = 'Update Terms';

    // Show delete button
    const deleteBtn = document.getElementById('delete-terms-btn');
    if (deleteBtn) deleteBtn.style.display = 'inline-block';

    // Fill modal fields
    document.getElementById('terms-heading').value = heading;
    document.getElementById('terms-list-type').value = listType;

    // Update list style options and set value
    updateListStyleOptions();
    document.getElementById('terms-list-style').value = listStyle;

    // Clear and refill items container
    const itemsContainer = document.getElementById('terms-items-container');
    itemsContainer.innerHTML = '';
    termsListItems = [];

    listItems.forEach((itemText, index) => {
        const itemId = 'terms-item-' + Date.now() + '-' + index;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'terms-item';
        itemDiv.innerHTML = `
            <input type="text" 
                   id="${itemId}" 
                   value="${itemText}"
                   placeholder="Enter list item text..." 
                   oninput="updateTermsListItem('${itemId}', this.value)"
                   onblur="updateTermsPreview()">
            <button type="button" onclick="removeTermsListItem('${itemId}')" class="remove-terms-item">
                <i class="material-icons">delete</i>
            </button>
        `;
        itemsContainer.appendChild(itemDiv);
        termsListItems.push({ id: itemId, text: itemText });
    });

    // If no items, add one empty
    if (termsListItems.length === 0) {
        addTermsListItem();
    }

    updateTermsPreview();
    document.getElementById('terms-list-modal').style.display = 'block';
}

function addTermsListItem() {
    const container = document.getElementById('terms-items-container');
    const itemId = 'terms-item-' + Date.now();

    const itemDiv = document.createElement('div');
    itemDiv.className = 'terms-item';
    itemDiv.innerHTML = `
        <input type="text" 
               id="${itemId}" 
               placeholder="Enter list item text..." 
               oninput="updateTermsListItem('${itemId}', this.value)"
               onblur="updateTermsPreview()">
        <button type="button" onclick="removeTermsListItem('${itemId}')" class="remove-terms-item">
            <i class="material-icons">delete</i>
        </button>
    `;

    container.appendChild(itemDiv);
    termsListItems.push({ id: itemId, text: '' });

    // Focus on the new input
    setTimeout(() => document.getElementById(itemId).focus(), 100);
}

function removeTermsListItem(itemId) {
    termsListItems = termsListItems.filter(item => item.id !== itemId);
    document.querySelector(`#terms-items-container [id="${itemId}"]`).closest('.terms-item').remove();
    updateTermsPreview();
}

function updateTermsListItem(itemId, text) {
    const item = termsListItems.find(item => item.id === itemId);
    if (item) {
        item.text = text;
    }
}

function updateTermsPreview() {
    const preview = document.getElementById('terms-preview');
    const heading = document.getElementById('terms-heading').value;
    termsListStyle = document.getElementById('terms-list-style').value;

    let previewHTML = '';

    if (heading) {
        previewHTML += `<h4>${heading}</h4>`;
    }

    // Only show list if there are items with text
    const validItems = termsListItems.filter(item => item.text.trim());

    if (validItems.length > 0) {
        const listTag = termsListType;
        previewHTML += `<${listTag} style="list-style-type: ${termsListStyle}">`;
        validItems.forEach(item => {
            previewHTML += `<li>${item.text}</li>`;
        });
        previewHTML += `</${listTag}>`;
    } else {
        previewHTML += '<p style="color: #666; font-style: italic;">No items to preview</p>';
    }

    preview.innerHTML = previewHTML;
}

function saveTermsList() {
    const heading = document.getElementById('terms-heading').value.trim();
    const validItems = termsListItems.filter(item => item.text.trim());

    if (!heading) {
        showNotification('Please enter a heading', 'error');
        return;
    }

    if (validItems.length === 0) {
        showNotification('Please add at least one list item', 'error');
        return;
    }

    let listContainer;

    if (window.currentEditingTermsDiv) {
        // Editing existing terms - update the existing div
        listContainer = window.currentEditingTermsDiv;
    } else {
        // Creating new terms - create new div
        listContainer = document.createElement('div');
        listContainer.className = 'bill-footer-list';
        listContainer.setAttribute('data-editable', 'true');
    }

    let listHTML = `<h4>${heading}</h4>`;

    const listTag = termsListType;
    listHTML += `<${listTag} style="list-style-type: ${termsListStyle}">`;
    validItems.forEach(item => {
        listHTML += `<li>${item.text}</li>`;
    });
    listHTML += `</${listTag}>`;

    listContainer.innerHTML = listHTML;

    // Only insert if it's a new terms div
    if (!window.currentEditingTermsDiv) {
        const billTotalTable = document.getElementById('bill-total-table');
        const gstBillTotalsTable = document.getElementById('gst-bill-totals-table');

        if (billTotalTable && !isGSTMode) {
            billTotalTable.parentNode.insertBefore(listContainer, billTotalTable.nextSibling);
        } else if (gstBillTotalsTable && isGSTMode) {
            gstBillTotalsTable.parentNode.insertBefore(listContainer, gstBillTotalsTable.nextSibling);
        } else {
            const listContainerParent = document.querySelector('.list-of-items');
            if (listContainerParent) {
                listContainerParent.appendChild(listContainer);
            }
        }
    }

    closeTermsListModal();
    showNotification(window.currentEditingTermsDiv ? 'Terms updated successfully!' : 'Terms added successfully!', 'success');

    // Save to localStorage to persist after refresh
    saveToLocalStorage();
}

function openColumnDialog() {
    // Set checkboxes based on current column visibility
    document.getElementById('colSrNo').checked = isColumnVisible(0);
    document.getElementById('colQty').checked = isColumnVisible(2);
    document.getElementById('colUnit').checked = isColumnVisible(3);
    document.getElementById('colRate').checked = isColumnVisible(4);
    document.getElementById('colAmt').checked = isColumnVisible(5);
    document.getElementById('colTotal').checked = isTotalVisible();

    document.getElementById('columnDialog').style.display = 'flex';
}

// Helper function to check if a column is currently visible
function isColumnVisible(columnIndex) {
    const table = document.getElementById('createListManual');
    if (table) {
        const headers = table.querySelectorAll('thead th');
        if (headers[columnIndex]) {
            return headers[columnIndex].style.display !== 'none';
        }
    }
    return true; // Default to visible if not found
}

// Helper function to check if total section is visible
function isTotalVisible() {
    const totalSection = document.getElementById('bill-total-table');
    return totalSection ? totalSection.style.display !== 'none' : true;
}

function closeColumnDialog() {
    document.getElementById('columnDialog').style.display = 'none';
}

function resetColumnVisibility() {
    const columnIds = ['colSrNo', 'colQty', 'colUnit', 'colRate', 'colAmt', 'colTotal'];
    columnIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = true;
    });
    // Apply changes immediately
    applyColumnVisibility();
}

function applyColumnVisibility() {
    const columns = {
        'colSrNo': 0,  // Column index for SR NO
        'colQty': 2,   // Column index for QTY
        'colUnit': 3,  // Column index for UNIT
        'colRate': 4,  // Column index for RATE
        'colAmt': 5,   // Column index for AMT
        'colTotal': 'total' // Special case for total table
    };

    // Tables to sync
    const inputTable = document.getElementById('createListManual'); // Input table
    const previewTable = document.getElementById('copyListManual'); // Preview table
    const totalSection = document.getElementById('bill-total-table'); // Total table

    // First, count visible columns to update section row colspan
    let visibleColumnCount = 7; // Start with all columns (including Actions)

    // Subtract hidden columns (excluding Actions column)
    for (const [checkboxId, columnIndex] of Object.entries(columns)) {
        if (columnIndex !== 'total' && columnIndex !== 6) { // Skip total and Actions
            const isVisible = document.getElementById(checkboxId).checked;
            if (!isVisible) {
                visibleColumnCount--;
            }
        }
    }

    // Check if Amount column is visible
    const isAmtVisible = document.getElementById('colAmt').checked;

    // Hide/show table columns based on checkboxes for BOTH tables
    for (const [checkboxId, columnIndex] of Object.entries(columns)) {
        const isVisible = document.getElementById(checkboxId).checked;

        if (columnIndex === 'total') {
            // Handle total table section
            if (totalSection) {
                totalSection.style.display = isVisible ? '' : 'none';
            }
        } else {
            // Handle both input table and preview table
            const tables = [inputTable, previewTable];

            tables.forEach(table => {
                if (table) {
                    // Hide headers (skip Actions column for input table)
                    const headers = table.querySelectorAll('thead th');
                    if (headers[columnIndex] && columnIndex !== 6) { // Skip Actions column
                        headers[columnIndex].style.display = isVisible ? '' : 'none';
                    }

                    // Hide cells in tbody (skip Actions column for input table)
                    const rows = table.querySelectorAll('tbody tr');
                    rows.forEach(row => {
                        // Skip section rows and total rows when hiding regular columns
                        if (!row.classList.contains('section-row') && !row.classList.contains('section-total-row')) {
                            const cells = row.querySelectorAll('td');
                            if (cells[columnIndex] && columnIndex !== 6) { // Skip Actions column
                                cells[columnIndex].style.display = isVisible ? '' : 'none';
                            }
                        }
                    });
                }
            });
        }
    }

    // Add padding to Particulars column when SR NO is hidden
    const srNoHidden = !document.getElementById('colSrNo').checked;
    const particularsHeaders = document.querySelectorAll('thead th:nth-child(2)');
    const particularsCells = document.querySelectorAll('tbody td:nth-child(2)');

    if (srNoHidden) {
        particularsHeaders.forEach(header => header.style.paddingLeft = '25px');
        particularsCells.forEach(cell => cell.style.paddingLeft = '25px');
    } else {
        particularsHeaders.forEach(header => header.style.paddingLeft = '');
        particularsCells.forEach(cell => cell.style.paddingLeft = '');
    }

    // Update section row colspan to match visible column count
    const sectionRows = document.querySelectorAll('.section-row');
    sectionRows.forEach(row => {
        row.querySelector('td').colSpan = visibleColumnCount;
    });

    // FIX: Update Section Total Rows visibility and colspan
    const sectionTotalRows = document.querySelectorAll('.section-total-row');
    sectionTotalRows.forEach(row => {
        // 1. Hide entire row if Amount column is hidden
        if (!isAmtVisible) {
            row.style.display = 'none';
        } else {
            row.style.display = ''; // Reset display to default (table-row)

            // 2. If visible, calculate colspan
            const cells = row.children;
            if (cells.length > 0) {
                const table = row.closest('table');
                let adjustment = 1; // Default: subtract Amount column

                // Handle the visibility of the extra Action cell
                const actionCell = row.querySelector('.section-total-action-cell');
                if (actionCell) {
                    // Determine if Actions column is hidden in this table
                    let isActionColHidden = false;
                    let actionHeaderIndex = 6; // Default for input table (createListManual)

                    if (table.id === 'gstCopyListManual') actionHeaderIndex = 7;

                    const actionHeader = table.querySelector(`thead th:nth-child(${actionHeaderIndex + 1})`);
                    // If header exists and is hidden, OR header doesn't exist (some views), hide cell
                    if (actionHeader && actionHeader.style.display === 'none') {
                        isActionColHidden = true;
                    } else if (!actionHeader) {
                        // Fallback for tables where action header might be missing/removed in DOM
                        isActionColHidden = true;
                    }

                    if (isActionColHidden) {
                        actionCell.style.display = 'none';
                    } else {
                        actionCell.style.display = 'table-cell';
                        // If action cell is visible, we subtract Amount + Action from colspan
                    }
                }

                // If table has actions column visible (like createListManual or GST view)
                if (table.id === 'createListManual' || table.id === 'gstCopyListManual') {
                    // Check if the row actually HAS an action cell AND it is visible
                    if (cells.length > 2 && actionCell && actionCell.style.display !== 'none') {
                        adjustment = 2; // Subtract Amount + Action
                    }
                } else {
                    // Regular preview table logic (copyListManual)
                    let visibleDataCols = 0;
                    for (let i = 0; i <= 4; i++) { // Check cols 0 to 4
                        const header = table.querySelector(`thead th:nth-child(${i + 1})`);
                        if (header && header.style.display !== 'none') {
                            visibleDataCols++;
                        }
                    }
                    cells[0].colSpan = visibleDataCols;
                    return;
                }

                const newColSpan = Math.max(1, visibleColumnCount - adjustment);
                cells[0].colSpan = newColSpan;
            }
        }
    });

    closeColumnDialog();
}

//new ledger functions
// Custom Payment Method Handler
function handlePaymentMethodChange() {
    const methodSelect = document.getElementById('payment-method');
    const customContainer = document.getElementById('custom-method-container');

    if (methodSelect.value === 'Other') {
        customContainer.style.display = 'block';
    } else {
        customContainer.style.display = 'none';
    }
}

// Save custom payment method to DB
async function saveCustomPaymentMethod(methodName) {
    try {
        const customMethods = await getFromDB('settings', 'customPaymentMethods') || [];
        if (!customMethods.includes(methodName)) {
            customMethods.push(methodName);
            await setInDB('settings', 'customPaymentMethods', customMethods);
        }
    } catch (error) {
        console.error('Error saving custom payment method:', error);
    }
}

// Load custom payment methods
async function loadCustomPaymentMethods() {
    try {
        const customMethods = await getFromDB('settings', 'customPaymentMethods') || [];
        const methodSelect = document.getElementById('payment-method');

        // Remove existing custom methods (except "Other")
        const optionsToRemove = [];
        for (let i = 0; i < methodSelect.options.length; i++) {
            if (methodSelect.options[i].value !== 'Other' &&
                !['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card'].includes(methodSelect.options[i].value)) {
                optionsToRemove.push(i);
            }
        }

        // Remove in reverse order to avoid index issues
        optionsToRemove.reverse().forEach(index => {
            methodSelect.remove(index);
        });

        // Add custom methods
        customMethods.forEach(method => {
            const option = document.createElement('option');
            option.value = method;
            option.textContent = method;
            methodSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading custom payment methods:', error);
    }
}

/* 3. LOAD LEDGER DATA (Passes Correct Mode) */
async function loadLedgerData(customerName = currentPaymentCustomer?.name, gstin = currentPaymentCustomer?.gstin) {
    if (!customerName) return;

    try {
        const dateRange = getDateRangeForPeriod();

        // Use the mode detected during openLedgerDialog
        const mode = currentPaymentCustomer?.mode || 'regular';

        console.log(`[LEDGER] Loading for ${customerName} in ${mode} mode`);

        // Pass mode to calculation functions
        let openingBalance = { amount: 0, type: 'debit', date: 'Opening' };
        if (typeof calculateOpeningBalance === 'function') {
            openingBalance = await calculateOpeningBalance(customerName, gstin, dateRange, mode);
        }

        const financialData = await getCustomerFinancialData(customerName, gstin, dateRange, mode);

        // Filter by Bill Type (Only for Regular)
        const filterSelect = document.getElementById('ledger-bill-type-filter');
        if (mode === 'regular' && filterSelect && filterSelect.style.display !== 'none' && filterSelect.value !== 'all') {
            const type = filterSelect.value;
            financialData.bills = financialData.bills.filter(b => (b.modalState?.type || 'Invoice') === type);
            financialData.payments = financialData.payments.filter(p => (p.refType || 'Invoice') === type);
            financialData.creditNotes = financialData.creditNotes.filter(c => (c.refType || 'Invoice') === type);
        }

        // Render the table
        displayUnifiedLedgerTable(financialData, openingBalance, dateRange);

        // === FIX: UPDATE LABELS FOR VENDOR MODE ===
        // Since displayUnifiedLedgerTable defaults to "Sale", we update the DOM directly
        if (mode === 'vendor') {
            const rows = document.querySelectorAll('#ledger-tbody tr');
            rows.forEach(row => {
                // Check the Particulars column (usually index 1)
                if (row.cells.length > 1) {
                    // Replace "Sale (" with "Purchase ("
                    row.cells[1].innerHTML = row.cells[1].innerHTML.replace(/Sale\s+\(/g, 'Purchase (');
                }
            });
        }
        // ==========================================

    } catch (error) {
        console.error("[LEDGER] Error loading:", error);
    }
}

/* 4. OPENING BALANCE (Passes Mode) */
async function calculateOpeningBalance(customerName, gstin, dateRange, mode = 'regular') {
    if (!dateRange) return { amount: 0, type: 'debit', date: 'Opening' };

    try {
        // Fetch ALL previous data using correct MODE
        const allPreviousData = await getCustomerFinancialData(customerName, gstin, null, mode);

        let totalDebit = 0;
        let totalCredit = 0;
        let lastDate = 'Opening';
        const filterStartObj = convertToComparableDate(dateRange.startDate);

        const processItem = (item, type) => {
            const dateStr = item.date || item.invoiceDetails?.date;
            if (!dateStr) return;

            const itemDateObj = convertToComparableDate(dateStr);

            // Check if BEFORE start date
            if (itemDateObj < filterStartObj) {
                let amount = parseFloat(item.amount || item.totalAmount || item.totals?.grandTotal || 0);
                if (type === 'debit') totalDebit += amount;
                else totalCredit += amount;
                lastDate = dateStr; // Track last transaction date
            }
        };

        allPreviousData.bills.forEach(b => processItem(b, 'debit'));
        allPreviousData.payments.forEach(p => processItem(p, 'credit'));
        allPreviousData.creditNotes.forEach(c => processItem(c, 'credit'));

        const net = totalDebit - totalCredit;
        return {
            amount: Math.abs(net),
            type: net >= 0 ? 'debit' : 'credit',
            date: lastDate
        };
    } catch (e) {
        console.error("Error calc opening balance", e);
        return { amount: 0, type: 'debit', date: 'Opening' };
    }
}



// FIX: Improved date comparison function
function isDateBefore(dateStr, compareDateStr) {
    try {
        const dateObj = convertToComparableDate(dateStr);
        const compareDateObj = convertToComparableDate(compareDateStr);

        return dateObj < compareDateObj;
    } catch (error) {
        console.error('Error comparing dates:', error, dateStr, compareDateStr);
        return false;
    }
}

/* Helper: Convert DD-MM-YYYY to YYYY-MM-DD for sorting */
function convertDateToISO(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // If already in YYYY-MM-DD format (ISO), return as is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

    // Handle DD-MM-YYYY or DD/MM/YYYY
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[0].length === 2) {
            // dd-mm-yyyy -> yyyy-mm-dd
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts[0].length === 2) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }

    return dateStr;
}

// FIX: Improved date conversion function
function convertToComparableDate(dateStr) {
    try {
        // Handle dd-mm-yyyy format
        const [day, month, year] = dateStr.split('-');

        // Ensure 2-digit day and month
        const paddedDay = day.padStart(2, '0');
        const paddedMonth = month.padStart(2, '0');

        // Create date in yyyy-mm-dd format for proper comparison
        return new Date(`${year}-${paddedMonth}-${paddedDay}`);
    } catch (error) {
        console.error('Error converting date:', error, dateStr);
        return new Date(); // Return current date as fallback
    }
}
/* 3. DISPLAY LEDGER (Updated: Receipt #s & Conditional Footer) */
function displayUnifiedLedgerTable(financialData, openingBalance, dateRange) {
    const tbody = document.getElementById('ledger-tbody');
    const tfoot = document.querySelector('.unified-ledger-table tfoot');

    if (!tbody) return;
    tbody.innerHTML = '';

    // 1. Totals & Opening
    let totalDebit = 0;
    let totalCredit = 0;

    if (openingBalance.type === 'debit') totalDebit += openingBalance.amount;
    else totalCredit += openingBalance.amount;

    const openingRow = document.createElement('tr');
    const opDate = openingBalance.date === 'Opening' ? 'Opening' : (typeof convertToDisplayFormat === 'function' ? convertToDisplayFormat(openingBalance.date) : openingBalance.date);

    openingRow.innerHTML = `
        <td>${opDate}</td>
        <td class="bold">Opening Balance</td>
        <td class="right">${openingBalance.type === 'debit' && openingBalance.amount > 0 ? openingBalance.amount.toFixed(2) : '0.00'}</td>
        <td class="right">${openingBalance.type === 'credit' && openingBalance.amount > 0 ? openingBalance.amount.toFixed(2) : ''}</td>
    `;
    tbody.appendChild(openingRow);

    // 2. Transactions
    let allTransactions = [];

    // Helper to get sorting timestamps
    const getSortKeys = (dateStr, item) => {
        const dateTs = new Date(convertDateToISO(dateStr)).getTime(); // Date Only (Midnight)
        // Prefer createdAt, fallback to timestamp, fallback to 0. 
        // This ensures correct ordering for items added on the same day.
        const createdTs = item.createdAt || item.timestamp || 0;
        return { dateTs, createdTs };
    };

    // BILLS
    if (financialData.bills) {
        financialData.bills.forEach(bill => {
            const state = bill.modalState || {};
            const prefix = state.prefix || '';
            const no = state.invoiceNo || bill.invoiceDetails?.invoiceNo || bill.invoiceDetails?.number || '';
            const dateStr = bill.date || bill.invoiceDetails?.date;

            // Label Logic
            let typeLabel = 'Invoice';
            let amount = 0;

            if (bill.source === 'gst') {
                typeLabel = 'Tax Invoice';
                amount = parseFloat(bill.totals?.grandTotal || 0);
            } else if (bill.source === 'vendor') {
                typeLabel = 'Invoice'; // Initial label, modified later if needed
                amount = parseFloat(bill.totalAmount || 0);
            } else {
                typeLabel = state.type || 'Invoice';
                amount = parseFloat(bill.totalAmount || bill.grandTotal || 0);
            }

            const { dateTs, createdTs } = getSortKeys(dateStr, bill);

            allTransactions.push({
                date: dateStr,
                particulars: ` Sale (${typeLabel} - ${prefix}${no})`, // Will be regex-replaced for Vendors later
                debit: amount,
                credit: 0,
                dateTimestamp: dateTs,
                createdTimestamp: createdTs
            });
        });
    }

    // PAYMENTS
    if (financialData.payments) {
        financialData.payments.forEach(pay => {
            let suffix = '';
            const type = pay.refType || 'Invoice';

            if (pay.refBillNo || pay.refDisplay) {
                const num = pay.refDisplay || `${pay.refPrefix || ''}${pay.refBillNo}`;
                suffix = ` (${type} - ${num})`;
            } else {
                suffix = ` (${type})`;
            }

            const recNo = pay.receiptNo ? ` #${pay.receiptNo}` : '';
            const { dateTs, createdTs } = getSortKeys(pay.date, pay);

            allTransactions.push({
                date: pay.date,
                particulars: `Receipt${recNo} : ${pay.method} ${suffix}`,
                debit: 0,
                credit: parseFloat(pay.amount),
                dateTimestamp: dateTs,
                createdTimestamp: createdTs
            });
        });
    }

    // CREDIT NOTES
    if (financialData.creditNotes) {
        financialData.creditNotes.forEach(cn => {
            let suffix = '';
            const type = cn.refType || 'Invoice';
            if (cn.refBillNo || cn.refDisplay) {
                const num = cn.refDisplay || `${cn.refPrefix || ''}${cn.refBillNo}`;
                suffix = ` (${type} - ${num})`;
            } else {
                suffix = ` (${type})`;
            }

            const recNo = cn.receiptNo ? ` #${cn.receiptNo}` : '';
            const { dateTs, createdTs } = getSortKeys(cn.date, cn);

            allTransactions.push({
                date: cn.date,
                particulars: `Credit Note${recNo} : ${cn.method} ${suffix}`,
                debit: 0,
                credit: parseFloat(cn.amount),
                dateTimestamp: dateTs,
                createdTimestamp: createdTs
            });
        });
    }

    // --- UPDATED SORT LOGIC ---
    // 1. Sort by Date (Chronological)
    // 2. If Same Date, Sort by Creation Time (Chronological)
    allTransactions.sort((a, b) => {
        if (a.dateTimestamp !== b.dateTimestamp) {
            return a.dateTimestamp - b.dateTimestamp;
        }
        return a.createdTimestamp - b.createdTimestamp;
    });

    // Render Rows
    allTransactions.forEach(tx => {
        totalDebit += tx.debit;
        totalCredit += tx.credit;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${convertToDisplayFormat(tx.date)}</td>
            <td>${tx.particulars}</td>
            <td class="right">${tx.debit > 0 ? tx.debit.toFixed(2) : ''}</td>
            <td class="right">${tx.credit > 0 ? tx.credit.toFixed(2) : ''}</td>
        `;
        tbody.appendChild(row);
    });

    // 3. Footer Logic
    const netAmount = totalDebit - totalCredit;
    let balanceAmount = 0;
    let advanceDeposit = 0;

    if (netAmount > 0) balanceAmount = netAmount;
    else advanceDeposit = Math.abs(netAmount);

    // Closing date is the date of the last transaction or end of period
    const closingDate = allTransactions.length > 0 ?
        convertToDisplayFormat(allTransactions[allTransactions.length - 1].date) :
        (dateRange ? dateRange.endDate : new Date().toLocaleDateString('en-GB').replace(/\//g, '-'));

    if (tfoot) {
        const advanceRow = advanceDeposit > 0 ? `
            <tr class="total-row highlight">
                <td colspan="2" class="right bold">Advance Deposit</td>
                <td style="text-align:center;" class="right bold" colspan="2">
                    ₹${advanceDeposit.toFixed(2)}
                </td>
            </tr>` : '';

        tfoot.innerHTML = `
            <tr class="total-row highlight">
                <td colspan="2" class="right bold">TOTAL</td>
                <td class="right bold">₹${totalDebit.toFixed(2)}</td>
                <td class="right bold">₹${totalCredit.toFixed(2)}</td>
            </tr>
            <tr class="total-row highlight">
                <td colspan="2" class="right bold">Balance Amount</td>
                <td style="text-align:center;" class="right bold" colspan="2">
                    ${balanceAmount > 0 ? '₹' + balanceAmount.toFixed(2) : '0.00'}
                </td>
            </tr>
            ${advanceRow}
            <tr class="closing-balance-row">
                <td id="closing-balance-date">${closingDate}</td>
                <td class="bold">Closing Balance</td>
                <td class="right bold" id="closing-balance-debit">
                    ${netAmount > 0 ? '₹' + netAmount.toFixed(2) : ''}
                </td>
                <td class="right bold" id="closing-balance-credit">
                    ${netAmount < 0 ? '₹' + Math.abs(netAmount).toFixed(2) : ''}
                </td>
            </tr>
        `;
    }
}

// Helper function to get previous period end date
function getPreviousPeriodEndDate(startDate) {
    try {
        const [day, month, year] = startDate.split('-');
        const dateObj = new Date(`${year}-${month}-${day}`);
        dateObj.setDate(dateObj.getDate() - 1);

        const prevDay = String(dateObj.getDate()).padStart(2, '0');
        const prevMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const prevYear = dateObj.getFullYear();

        return `${prevDay}-${prevMonth}-${prevYear}`;
    } catch (error) {
        console.error('Error getting previous period date:', error);
        return 'Opening';
    }
}

// Helper function to calculate regular bill total
function calculateRegularBillTotal(bill) {
    const subtotal = parseFloat(bill.totalAmount || 0);
    const discountPercent = bill.taxSettings?.discountPercent || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const gstPercent = bill.taxSettings?.gstPercent || 0;
    const gstAmount = (subtotal - discountAmount) * (gstPercent / 100);
    return subtotal - discountAmount + gstAmount;
}

// Update the downloadBillAsJson function filename generation
async function downloadBillAsJson(billId, billType, event) {
    if (event) event.stopPropagation();

    try {
        console.group('=== BILL DOWNLOAD DEBUG ===');
        console.log('Bill ID:', billId);

        // Determine correct store name
        let storeName;
        if (billType === 'restored' || billId.startsWith('restored-bill-')) {
            storeName = 'restoredBills';
        } else {
            storeName = billType === 'gst' ? 'gstSavedBills' : 'savedBills';
        }

        const bill = await getFromDB(storeName, billId);

        if (!bill) {
            showNotification('Bill not found in database', 'error');
            console.groupEnd();
            return;
        }

        // FIX: Extract full bill data (value or direct object)
        const billData = bill.value || bill;

        if (!billData) {
            showNotification('Bill data structure is invalid', 'error');
            console.groupEnd();
            return;
        }

        // Generate Filename
        let billNo = '';
        let customerName = '';
        const isGST = billType === 'gst' || billData.invoiceDetails || (billData.sourceType === 'gst');
        const typeStr = isGST ? 'gst' : 'regular';

        if (isGST) {
            billNo = billData.invoiceDetails?.number || billData.gstCustomerData?.invoiceNo || 'unknown';
            customerName = billData.customer?.billTo?.name || billData.gstCustomerData?.billTo?.name || 'unknown';
        } else {
            billNo = billData.customer?.billNo || 'unknown';
            customerName = billData.customer?.name || 'unknown';
        }

        const cleanBillNo = billNo.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanCustomerName = customerName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filename = `${cleanBillNo}_${cleanCustomerName}_${typeStr}.json`;

        // Download
        const dataStr = JSON.stringify(billData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('✅ Download completed');
        showNotification('Bill downloaded!', 'success');
        console.groupEnd();

    } catch (error) {
        console.error('❌ Download failed:', error);
        showNotification('Download error: ' + error.message, 'error');
        console.groupEnd();
    }
}

// Open Restored Bills Modal
function openRestoredBillsModal() {
    document.getElementById('restored-bills-modal').style.display = 'block';
    loadRestoredBillsList();
    toggleSettingsSidebar();
}

// Close Restored Bills Modal
function closeRestoredBillsModal() {
    document.getElementById('restored-bills-modal').style.display = 'none';
}

// Load Restored Bills List
async function loadRestoredBillsList() {
    try {
        const restoredBills = await getAllFromDB('restoredBills');
        const billsList = document.getElementById('restored-bills-list');
        billsList.innerHTML = '';

        if (restoredBills.length === 0) {
            billsList.innerHTML = '<div class="saved-bill-card">No restored bills yet. Use "Restore Bill from JSON" to add bills.</div>';
            return;
        }

        // Sort by timestamp (newest first)
        restoredBills.sort((a, b) => b.value.timestamp - a.value.timestamp);

        restoredBills.forEach(bill => {
            const billCard = createRestoredBillCard(bill);
            billsList.appendChild(billCard);
        });
    } catch (error) {
        console.error('Error loading restored bills:', error);
        billsList.innerHTML = '<div class="saved-bill-card">Error loading restored bills</div>';
    }
}

// Also update the card creation to be more accurate
function createRestoredBillCard(bill) {
    const billCard = document.createElement('div');
    billCard.className = 'saved-bill-card';

    const val = bill.value || bill;
    const menuId = `menu-restored-${bill.id}-${Date.now()}`;

    // --- DATA EXTRACTION ---
    let isGST = false;
    let prefix = '';
    let rawBillNo = 'N/A';
    let billType = 'Regular';
    let custName = 'N/A';
    let date = 'Unknown';

    // 1. Check for GST Structure
    if (val.sourceType === 'gst' || val.gstCustomerData || val.invoiceDetails) {
        isGST = true;
        billType = 'GST Invoice';
        const gstData = val.gstCustomerData || {};

        // GST always uses Bill To Name
        custName = gstData.billTo?.name || val.customer?.billTo?.name || 'Unknown Customer';
        rawBillNo = val.invoiceDetails?.number || gstData.invoiceNo || 'N/A';
        date = val.invoiceDetails?.date || gstData.invoiceDate || 'Unknown';
    }
    // 2. Regular Bill Structure (Apply Fixed Logic)
    else {
        isGST = false;
        const state = val.modalState || {};

        billType = state.type || 'Estimate';
        prefix = state.prefix || '';
        rawBillNo = state.invoiceNo || val.customer?.billNo || 'N/A';
        date = state.date || val.customer?.date || 'Unknown';

        // --- Determine Customer Name based on View Format ---
        const viewFormat = state.viewFormat || 'simple';

        if (viewFormat === 'simple') {
            custName = state.simple?.name;
        } else if (viewFormat === 'bill_to' || viewFormat === 'both') {
            custName = state.billTo?.name;
        }

        // Fallback
        if (!custName) {
            custName = val.customer?.name || 'N/A';
        }
    }

    const displayBillNo = prefix ? `${prefix}/${rawBillNo}` : rawBillNo;
    const totalAmount = val.totalAmount || '0.00';
    const itemCount = val.itemCount || val.items?.length || 0;

    // --- NEW UI STRUCTURE (MATCHING SAVED BILLS VISUAL) ---
    billCard.innerHTML = `
        <div class="card-header-row">
            <div class="card-info">
                <span>${displayBillNo} - ${custName}</span>
                <span class="card-sub-info" style="font-size: 0.85em; color:var(--primary-color); font-weight: 500;">${billType}</span>
                <span class="card-sub-info">₹${totalAmount}</span>
            </div>
            
            <div class="card-controls">
                <button class="icon-btn" onclick="toggleCardDetails(this)" title="Toggle Details">
                    <span class="material-icons">keyboard_arrow_down</span>
                </button>
                
                <div class="action-menu-container">
                    <button class="icon-btn" onclick="toggleActionMenu(event, '${menuId}')">
                        <span class="material-icons">more_vert</span>
                    </button>
                    <div id="${menuId}" class="action-dropdown">
                        <button class="dropdown-item" onclick="downloadBillAsJson('${bill.id}', 'restored', event)">
                            <span class="material-icons">download</span> Download JSON
                        </button>
                        <button class="dropdown-item" onclick="loadRestoredBill('${bill.id}', event)">
                            <span class="material-icons">open_in_browser</span> Load
                        </button>
                        <button class="dropdown-item delete-item" onclick="deleteRestoredBill('${bill.id}', event)">
                            <span class="material-icons">delete</span> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="details-section hidden saved-bill-details">
            <div>Date: ${date}</div>
            <div>Items: ${itemCount}</div>
            <div>Type: ${isGST ? 'GST' : 'Regular'} • Restored</div>
        </div>
    `;

    return billCard;
}

async function restoreIndividualBill() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const billData = JSON.parse(event.target.result);

                // Validate it's a bill file
                if (!billData.customer && !billData.invoiceDetails) {
                    showNotification('Invalid bill file format', 'error');
                    return;
                }

                // FIX: Determine source type based on bill structure
                const sourceType = billData.invoiceDetails ? 'gst' : 'regular';

                // Add to restored bills
                const restoredBillId = `restored-bill-${Date.now()}`;
                const restoredData = {
                    ...billData,
                    id: restoredBillId,
                    sourceType: sourceType, // ADD THIS LINE
                    timestamp: Date.now(),
                    isRestored: true
                };

                await setInDB('restoredBills', restoredBillId, restoredData);

                showNotification('Bill restored successfully!', 'success');

                // Refresh restored bills list
                await loadRestoredBillsList();

            } catch (error) {
                console.error('Error restoring bill:', error);
                showNotification('Error restoring bill file. Please make sure it\'s a valid bill JSON file.', 'error');
            }
        };
        reader.readAsText(file);
    };

    input.click();
}



// Delete Restored Bill
async function deleteRestoredBill(billId, event) {
    if (event) event.stopPropagation();

    const shouldDelete = await showConfirm('Are you sure you want to delete this restored bill?');
    if (shouldDelete) {
        try {
            await removeFromDB('restoredBills', billId);
            await loadRestoredBillsList();
            showNotification('Restored bill deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting restored bill:', error);
            showNotification('Error deleting restored bill', 'error');
        }
    }
}

// Search Restored Bills
function searchRestoredBills() {
    const searchTerm = document.getElementById('restored-bills-search').value.toLowerCase();
    const billCards = document.querySelectorAll('#restored-bills-list .saved-bill-card');

    billCards.forEach(card => {
        const infoEl = card.querySelector('.card-info');
        const subInfoEl = card.querySelector('.card-sub-info');
        const detailsEl = card.querySelector('.details-section');

        const billTitle = infoEl ? infoEl.textContent.toLowerCase() : '';
        const billTotal = subInfoEl ? subInfoEl.textContent.toLowerCase() : '';
        const billDetails = detailsEl ? detailsEl.textContent.toLowerCase() : '';

        if (billTitle.includes(searchTerm) || billTotal.includes(searchTerm) || billDetails.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Load Regular Restored Bill (Specific Loader)
async function loadRegularRestoredBill(billId) {
    try {
        const bill = await getFromDB('restoredBills', billId);
        if (!bill) return;

        const billData = bill.value || bill;

        // 1. Set as current bill
        await setInDB('billDataManual', 'currentBill', billData);

        // 2. Load standard data
        await loadFromLocalStorage();
        saveStateToHistory();

        // 3. === RESTORE REGULAR MODAL STATE (Exact Logic from loadFromHistory) ===
        const state = billData.modalState;
        if (state) {
            localStorage.setItem('regularBillState', JSON.stringify(state));

            if (typeof initRegBillTypes === 'function') initRegBillTypes();

            // A. Restore Type & Prefix (Trigger Change)
            if (document.getElementById('reg-modal-type-select')) document.getElementById('reg-modal-type-select').value = state.type || 'Estimate';
            if (typeof handleRegTypeChange === 'function') handleRegTypeChange();

            // B. Restore Values Again (Safety against resets)
            if (document.getElementById('reg-modal-type-select')) document.getElementById('reg-modal-type-select').value = state.type || 'Estimate';
            if (document.getElementById('reg-modal-prefix')) document.getElementById('reg-modal-prefix').value = state.prefix || '';
            if (document.getElementById('reg-modal-invoice-no')) document.getElementById('reg-modal-invoice-no').value = state.invoiceNo || '';
            if (document.getElementById('reg-modal-date')) document.getElementById('reg-modal-date').value = state.date || '';

            // C. Restore View Format
            if (document.getElementById('reg-modal-cust-view-select')) {
                document.getElementById('reg-modal-cust-view-select').value = state.viewFormat || state.viewMode || 'simple';
                if (typeof handleRegViewChange === 'function') handleRegViewChange();
            }

            // D. Restore Fields
            if (state.simple) {
                if (document.getElementById('reg-modal-simple-name')) document.getElementById('reg-modal-simple-name').value = state.simple.name || '';
                if (document.getElementById('reg-modal-simple-phone')) document.getElementById('reg-modal-simple-phone').value = state.simple.phone || '';
                if (document.getElementById('reg-modal-simple-addr')) document.getElementById('reg-modal-simple-addr').value = state.simple.addr || '';
            }
            if (state.billTo) {
                if (document.getElementById('reg-modal-bill-name')) document.getElementById('reg-modal-bill-name').value = state.billTo.name || '';
                if (document.getElementById('reg-modal-bill-addr')) document.getElementById('reg-modal-bill-addr').value = state.billTo.addr || '';
                if (document.getElementById('reg-modal-bill-gst')) document.getElementById('reg-modal-bill-gst').value = state.billTo.gst || '';
                if (document.getElementById('reg-modal-bill-phone')) document.getElementById('reg-modal-bill-phone').value = state.billTo.phone || '';
                if (document.getElementById('reg-modal-bill-state')) document.getElementById('reg-modal-bill-state').value = state.billTo.state || '';
                if (document.getElementById('reg-modal-bill-code')) document.getElementById('reg-modal-bill-code').value = state.billTo.code || '';
            }
            if (state.shipTo) {
                if (document.getElementById('reg-modal-ship-name')) document.getElementById('reg-modal-ship-name').value = state.shipTo.name || '';
                if (document.getElementById('reg-modal-ship-addr')) document.getElementById('reg-modal-ship-addr').value = state.shipTo.addr || '';
                if (document.getElementById('reg-modal-ship-gst')) document.getElementById('reg-modal-ship-gst').value = state.shipTo.gst || '';
                if (document.getElementById('reg-modal-ship-phone')) document.getElementById('reg-modal-ship-phone').value = state.shipTo.phone || '';
                if (document.getElementById('reg-modal-ship-state')) document.getElementById('reg-modal-ship-state').value = state.shipTo.state || '';
                if (document.getElementById('reg-modal-ship-code')) document.getElementById('reg-modal-ship-code').value = state.shipTo.code || '';
                if (document.getElementById('reg-modal-ship-pos')) document.getElementById('reg-modal-ship-pos').value = state.shipTo.pos || '';
            }

            // E. Sync to Main View
            if (typeof saveRegularBillDetails === 'function') saveRegularBillDetails(true);
        }

        if (currentView === 'bill') toggleView();
        resetColumnVisibility();

        console.log('Regular restored bill loaded successfully');

    } catch (error) {
        console.error('Error loading regular restored bill:', error);
        throw error;
    }
}

// Load Restored Bill (Universal Loader - GST & Regular)
async function loadRestoredBill(billId, event) {
    if (event) event.stopPropagation();

    try {
        const restoredBill = await getFromDB('restoredBills', billId);
        if (!restoredBill) {
            showNotification('Restored bill not found', 'error');
            return;
        }

        const billData = restoredBill.value || restoredBill;
        let isGSTBill = false;

        // --- 1. DETECT BILL TYPE ---
        if (billData.customer && billData.customer.name && !billData.customer.billTo) isGSTBill = false;
        else if (billData.customer && billData.customer.billNo && !billData.invoiceDetails) isGSTBill = false;
        else if (billData.sourceType === 'gst') isGSTBill = true;
        else if (billData.invoiceDetails && billData.invoiceDetails.number) isGSTBill = true;
        else if (billData.gstCustomerData && billData.gstCustomerData.invoiceNo) isGSTBill = true;
        else if (billData.customer && billData.customer.billTo) isGSTBill = true;
        else isGSTBill = false;

        // --- 2. SWITCH MODE ---
        let modeChanged = false;
        if (isGSTBill && !isGSTMode) {
            isGSTMode = true;
            await setInDB('gstMode', 'isGSTMode', true);
            modeChanged = true;
        } else if (!isGSTBill && isGSTMode) {
            isGSTMode = false;
            await setInDB('gstMode', 'isGSTMode', false);
            modeChanged = true;
        }

        // --- 3. SAFETY SAVE BEFORE CLEARING ---
        if (typeof saveStateToHistory === 'function') saveStateToHistory();

        // --- 4. CLEAR WORKSPACE ---
        if (typeof clearAllData === 'function') await clearAllData(true);

        if (modeChanged) updateUIForGSTMode();

        // --- 5. LOAD DATA ---
        await setInDB('billDataManual', 'currentBill', billData);
        await loadFromLocalStorage();
        saveStateToHistory();

        // --- 6. SETUP DISPLAY ---
        if (isGSTBill) {
            // GST SETUP
            if (billData.gstCustomerData) await populateGSTCustomerDetails(billData.gstCustomerData);
            else if (billData.customer && billData.invoiceDetails) await populateGSTCustomerDetailsFromLegacy(billData);
            copyItemsToGSTBill();
            updateGSTTaxCalculation();
            updateGSTBillDisplay();
        } else {
            // === RESTORE REGULAR MODAL STATE ===
            const state = billData.modalState;
            if (state) {
                localStorage.setItem('regularBillState', JSON.stringify(state));
                if (typeof initRegBillTypes === 'function') initRegBillTypes();

                // Restore Type & Prefix
                if (document.getElementById('reg-modal-type-select')) document.getElementById('reg-modal-type-select').value = state.type || 'Estimate';
                if (typeof handleRegTypeChange === 'function') handleRegTypeChange();

                // Restore Values
                if (document.getElementById('reg-modal-type-select')) document.getElementById('reg-modal-type-select').value = state.type || 'Estimate';
                if (document.getElementById('reg-modal-prefix')) document.getElementById('reg-modal-prefix').value = state.prefix || '';
                if (document.getElementById('reg-modal-invoice-no')) document.getElementById('reg-modal-invoice-no').value = state.invoiceNo || '';
                if (document.getElementById('reg-modal-date')) document.getElementById('reg-modal-date').value = state.date || '';

                // Restore View Format
                if (document.getElementById('reg-modal-cust-view-select')) {
                    document.getElementById('reg-modal-cust-view-select').value = state.viewFormat || state.viewMode || 'simple';
                    if (typeof handleRegViewChange === 'function') handleRegViewChange();
                }

                // === SMART RESTORE INPUTS (With Fallback) ===
                // If the specific modal field is empty, fallback to the main customer data
                const mainName = billData.customer?.name || '';
                const mainAddr = billData.customer?.address || '';
                const mainPhone = billData.customer?.phone || '';

                if (state.simple) {
                    const elName = document.getElementById('reg-modal-simple-name');
                    if (elName) elName.value = state.simple.name || mainName;

                    const elPhone = document.getElementById('reg-modal-simple-phone');
                    if (elPhone) elPhone.value = state.simple.phone || mainPhone;

                    const elAddr = document.getElementById('reg-modal-simple-addr');
                    if (elAddr) elAddr.value = state.simple.addr || mainAddr;
                }

                if (state.billTo) {
                    const elName = document.getElementById('reg-modal-bill-name');
                    // Use BillTo Name -> Fallback to Main Name
                    if (elName) elName.value = state.billTo.name || mainName;

                    const elAddr = document.getElementById('reg-modal-bill-addr');
                    if (elAddr) elAddr.value = state.billTo.addr || mainAddr;

                    const elPhone = document.getElementById('reg-modal-bill-phone');
                    // Only fallback phone if it looks like it belongs (optional, but safer)
                    if (elPhone) elPhone.value = state.billTo.phone || (state.billTo.name ? '' : mainPhone);

                    if (document.getElementById('reg-modal-bill-gst')) document.getElementById('reg-modal-bill-gst').value = state.billTo.gst || '';
                    if (document.getElementById('reg-modal-bill-state')) document.getElementById('reg-modal-bill-state').value = state.billTo.state || '';
                    if (document.getElementById('reg-modal-bill-code')) document.getElementById('reg-modal-bill-code').value = state.billTo.code || '';
                }

                if (state.shipTo) {
                    if (document.getElementById('reg-modal-ship-name')) document.getElementById('reg-modal-ship-name').value = state.shipTo.name || '';
                    if (document.getElementById('reg-modal-ship-addr')) document.getElementById('reg-modal-ship-addr').value = state.shipTo.addr || '';
                    if (document.getElementById('reg-modal-ship-gst')) document.getElementById('reg-modal-ship-gst').value = state.shipTo.gst || '';
                    if (document.getElementById('reg-modal-ship-phone')) document.getElementById('reg-modal-ship-phone').value = state.shipTo.phone || '';
                    if (document.getElementById('reg-modal-ship-state')) document.getElementById('reg-modal-ship-state').value = state.shipTo.state || '';
                    if (document.getElementById('reg-modal-ship-code')) document.getElementById('reg-modal-ship-code').value = state.shipTo.code || '';
                    if (document.getElementById('reg-modal-ship-pos')) document.getElementById('reg-modal-ship-pos').value = state.shipTo.pos || '';
                }

                // Sync to View
                if (typeof saveRegularBillDetails === 'function') saveRegularBillDetails(true);
            }
            updateTotal();
        }

        if (currentView === 'input') toggleView();

        closeRestoredBillsModal();
        showNotification('Restored bill loaded successfully!', 'success');

    } catch (error) {
        console.error('Error loading restored bill:', error);
        showNotification('Error loading restored bill', 'error');
    }
}


// NEW: Helper function to populate GST customer details in modal and bill view
async function populateGSTCustomerDetails(gstCustomerData) {
    if (!gstCustomerData) return;

    // Populate customer details modal form
    document.getElementById('invoice-no').value = gstCustomerData.invoiceNo || '';
    document.getElementById('invoice-date').value = gstCustomerData.invoiceDate || '';
    document.getElementById('gst-percent-input').value = gstCustomerData.gstPercent || '18';
    document.getElementById('transaction_type').value = gstCustomerData.transactionType || 'intrastate';
    document.getElementById('customer-type').value = gstCustomerData.customerType || 'bill-to';

    // Bill To details
    if (gstCustomerData.billTo) {
        document.getElementById('consignee-name').value = gstCustomerData.billTo.name || '';
        document.getElementById('consignee-address').value = gstCustomerData.billTo.address || '';
        document.getElementById('consignee-gst').value = gstCustomerData.billTo.gstin || '';
        document.getElementById('consignee-state').value = gstCustomerData.billTo.state || '';
        document.getElementById('consignee-code').value = gstCustomerData.billTo.stateCode || '';
        document.getElementById('consignee-contact').value = gstCustomerData.billTo.contact || '';
    }

    // Ship To details
    if (gstCustomerData.shipTo && gstCustomerData.customerType === 'both') {
        document.getElementById('buyer-name').value = gstCustomerData.shipTo.name || '';
        document.getElementById('buyer-address').value = gstCustomerData.shipTo.address || '';
        document.getElementById('buyer-gst').value = gstCustomerData.shipTo.gstin || '';
        document.getElementById('buyer-state').value = gstCustomerData.shipTo.state || '';
        document.getElementById('buyer-code').value = gstCustomerData.shipTo.stateCode || '';
        document.getElementById('buyer-contact').value = gstCustomerData.shipTo.contact || '';
        document.getElementById('place-of-supply').value = gstCustomerData.shipTo.placeOfSupply || '';
    }

    // Update visibility based on customer type
    handleCustomerTypeChange();

    // Update GST bill view display
    document.getElementById('bill-invoice-no').textContent = gstCustomerData.invoiceNo || '';
    document.getElementById('bill-date-gst').textContent = gstCustomerData.invoiceDate || '';

    // Update Bill To in bill view
    if (gstCustomerData.billTo) {
        document.getElementById('billToName').textContent = gstCustomerData.billTo.name || '';
        document.getElementById('billToAddr').textContent = gstCustomerData.billTo.address || '';
        document.getElementById('billToGstin').textContent = gstCustomerData.billTo.gstin || 'customer 15-digit GSTIN';
        document.getElementById('billToContact').textContent = gstCustomerData.billTo.contact || 'Not provided';
        document.getElementById('billToState').textContent = gstCustomerData.billTo.state || '';
        document.getElementById('billToStateCode').textContent = gstCustomerData.billTo.stateCode || '27';
    }

    // Update Ship To in bill view
    const shipToDiv = document.getElementById('shipTo');
    if (gstCustomerData.customerType === 'both' && gstCustomerData.shipTo) {
        shipToDiv.style.display = 'block';
        document.getElementById('shipToName').textContent = gstCustomerData.shipTo.name || '';
        document.getElementById('shipToAddr').textContent = gstCustomerData.shipTo.address || '';
        document.getElementById('shipToGstin').textContent = gstCustomerData.shipTo.gstin || 'customer 15-digit GSTIN';
        document.getElementById('shipToContact').textContent = gstCustomerData.shipTo.contact || 'Not provided';
        document.getElementById('shipToState').textContent = gstCustomerData.shipTo.state || '';
        document.getElementById('shipToStateCode').textContent = gstCustomerData.shipTo.stateCode || '27';
        document.getElementById('shipToPOS').textContent = gstCustomerData.shipTo.placeOfSupply || '';
    } else {
        shipToDiv.style.display = 'none';
    }

    // Save the customer dialog state
    await saveCustomerDialogState();
    await saveGSTCustomerDataToLocalStorage();
}

// NEW: Helper function to handle legacy GST bill format
async function populateGSTCustomerDetailsFromLegacy(billData) {
    const gstCustomerData = {
        invoiceNo: billData.invoiceDetails?.number || '',
        invoiceDate: billData.invoiceDetails?.date || '',
        gstPercent: billData.taxSettings?.gstPercent || 18,
        transactionType: billData.taxSettings?.transactionType || 'intrastate',
        customerType: billData.customerType || 'bill-to',
        billTo: {
            name: billData.customer?.billTo?.name || '',
            address: billData.customer?.billTo?.address || '',
            gstin: billData.customer?.billTo?.gstin || '',
            contact: billData.customer?.billTo?.contact || '',
            state: billData.customer?.billTo?.state || '',
            stateCode: billData.customer?.billTo?.stateCode || ''
        },
        shipTo: {
            name: billData.customer?.shipTo?.name || '',
            address: billData.customer?.shipTo?.address || '',
            gstin: billData.customer?.shipTo?.gstin || '',
            contact: billData.customer?.shipTo?.contact || '',
            state: billData.customer?.shipTo?.state || '',
            stateCode: billData.customer?.shipTo?.stateCode || '',
            placeOfSupply: billData.customer?.shipTo?.placeOfSupply || ''
        }
    };

    await populateGSTCustomerDetails(gstCustomerData);
}

// add stock
// Global variable to track which item we are adding stock to
let currentItemForStock = null;

function openAddStockModal(itemName) {
    currentItemForStock = itemName;
    document.getElementById('stock-item-name').textContent = itemName;
    document.getElementById('add-stock-quantity').value = ''; // Clear previous input

    document.getElementById('add-stock-modal').style.display = 'block';

    // Auto-focus the input field for better UX
    setTimeout(() => {
        document.getElementById('add-stock-quantity').focus();
    }, 100);
}

function closeAddStockModal() {
    document.getElementById('add-stock-modal').style.display = 'none';
    currentItemForStock = null;
}

async function saveAddedStock() {
    const input = document.getElementById('add-stock-quantity');
    const quantityToAdd = parseFloat(input.value);

    if (!currentItemForStock) return;

    if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
        showNotification('Please enter a valid quantity greater than 0', 'error');
        input.style.borderColor = 'red';
        return;
    }

    try {
        // 1. Get current item data
        const item = await getFromDB('savedItems', currentItemForStock);

        if (item) {
            // 2. Calculate new stock
            const currentStock = parseFloat(item.stockQuantity) || 0;

            // --- UPDATED: Save Last Stock & Timestamp ---
            item.lastStockQuantity = currentStock; // Archive current stock
            item.lastStockUpdate = Date.now();     // Save timestamp
            // ------------------------------------------

            const newStock = currentStock + quantityToAdd;

            // 3. Update item object
            item.stockQuantity = newStock;

            // 4. Save back to DB
            await setInDB('savedItems', currentItemForStock, item);

            // 5. Success feedback and UI update
            showNotification(`Stock updated! New Total: ${newStock}`, 'success');
            closeAddStockModal();
            await loadItemsList(); // Refresh the list to see the new stock number
        } else {
            showNotification('Item not found in database', 'error');
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        showNotification('Error updating stock', 'error');
    }
}

// Bill Heading Functions
// Bill Heading Functions
function openBillHeadingModal() {
    // Load current values from DOM
    const regHeading = document.getElementById('regular-bill-heading').textContent;
    const gstHeading = document.getElementById('gst-bill-heading').textContent;

    // Get current styles (Default to 18px and Uppercase if not set)
    const currentFontSize = parseInt(document.getElementById('regular-bill-heading').style.fontSize) || 18;
    const currentTransform = document.getElementById('regular-bill-heading').style.textTransform || 'uppercase';

    document.getElementById('regular-heading-input').value = regHeading;
    document.getElementById('gst-heading-input').value = gstHeading;
    document.getElementById('heading-font-size-input').value = currentFontSize;
    document.getElementById('heading-text-transform').value = currentTransform;

    document.getElementById('bill-heading-modal').style.display = 'block';
    toggleSettingsSidebar(); // Close sidebar
}

function closeBillHeadingModal() {
    document.getElementById('bill-heading-modal').style.display = 'none';
}

async function saveBillHeadings() {
    const regHeadingText = document.getElementById('regular-heading-input').value.trim();
    const gstHeadingText = document.getElementById('gst-heading-input').value.trim();
    const fontSize = document.getElementById('heading-font-size-input').value || '18';
    const textTransform = document.getElementById('heading-text-transform').value;

    // Update UI immediately
    updateHeadingDisplay('regular-bill-heading', regHeadingText, fontSize, textTransform);
    updateHeadingDisplay('gst-bill-heading', gstHeadingText, fontSize, textTransform);

    // Save to Database
    try {
        const headings = {
            regular: regHeadingText,
            gst: gstHeadingText,
            fontSize: fontSize,
            textTransform: textTransform
        };
        await setInDB('settings', 'billHeadings', headings);
        // showNotification('Bill headings saved successfully!', 'success');
        closeBillHeadingModal();
    } catch (error) {
        console.error('Error saving bill headings:', error);
    }
}

function updateHeadingDisplay(elementId, text, fontSize = '18', textTransform = 'uppercase') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
        // Show if text exists, Hide if empty
        element.style.display = text.length > 0 ? 'block' : 'none';

        // Apply styles
        element.style.fontSize = fontSize + 'px';
        element.style.textTransform = textTransform;
    }
}

async function loadBillHeadings() {
    try {
        const headings = await getFromDB('settings', 'billHeadings');
        if (headings) {
            const fontSize = headings.fontSize || '18';
            const textTransform = headings.textTransform || 'uppercase';

            updateHeadingDisplay('regular-bill-heading', headings.regular || '', fontSize, textTransform);
            updateHeadingDisplay('gst-bill-heading', headings.gst || '', fontSize, textTransform);
        }
    } catch (error) {
        console.error('Error loading bill headings:', error);
    }
}

// --- Branding (Logo, Sign, Stamp) Functions ---


let brandingSettings = {
    logo: null,
    logoPosition: 'left',
    logoBorderRadius: 0, // <--- ADD THIS
    signature: null,
    stamp: null
};

function openBrandingModal() {
    // Load current position
    document.getElementById('logo-position').value = brandingSettings.logoPosition || 'left';

    // Load current border radius (NEW)
    document.getElementById('logo-radius').value = brandingSettings.logoBorderRadius || 0;

    // Clear file inputs
    document.getElementById('logo-upload').value = '';
    document.getElementById('sign-upload').value = '';
    document.getElementById('stamp-upload').value = '';

    // Show current images in previews
    updateModalPreviews();

    document.getElementById('branding-modal').style.display = 'block';
    toggleSettingsSidebar();
}

function closeBrandingModal() {
    document.getElementById('branding-modal').style.display = 'none';
}

// Update the thumbnails in the modal based on current state
function updateModalPreviews() {
    const types = ['logo', 'signature', 'stamp'];

    types.forEach(type => {
        // Note: HTML IDs are 'sign-preview' but key is 'signature'
        const domId = type === 'signature' ? 'sign' : type;
        const container = document.getElementById(`${domId}-preview`);

        if (container) {
            container.innerHTML = '';
            if (brandingSettings[type]) {
                const img = document.createElement('img');
                img.src = brandingSettings[type];
                container.appendChild(img);
            } else {
                container.innerHTML = '<span>No image set</span>';
            }
        }
    });
}

// Handle new file selection for preview
async function previewImage(input, type) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            // Update global state temporarily (will be saved on Save button)
            brandingSettings[type] = e.target.result;
            updateModalPreviews(); // Refresh UI
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function saveBrandingSettings() {
    const position = document.getElementById('logo-position').value;
    const radius = document.getElementById('logo-radius').value; // (NEW)

    try {
        // Update settings object
        brandingSettings.logoPosition = position;
        brandingSettings.logoBorderRadius = radius; // (NEW)

        // Save to DB
        await setInDB('settings', 'branding', brandingSettings);

        // Update Bill UI
        updateBrandingUI();

        showNotification('Branding saved successfully!', 'success');
        closeBrandingModal();
    } catch (error) {
        console.error('Error saving branding:', error);
        showNotification('Error saving images', 'error');
    }
}

function clearImage(type) {
    // 1. Update State immediately
    brandingSettings[type] = null;

    // 2. Clear Input
    const inputId = type === 'signature' ? 'sign-upload' : `${type}-upload`;
    const input = document.getElementById(inputId);
    if (input) input.value = '';

    // 3. Update Preview immediately
    updateModalPreviews();

    showNotification(`${type} removed (Click Save to apply)`, 'info');
}

async function loadBrandingSettings() {
    try {
        const saved = await getFromDB('settings', 'branding');
        if (saved) {
            brandingSettings = { ...brandingSettings, ...saved };
            updateBrandingUI();
        }
    } catch (error) {
        console.error('Error loading branding:', error);
    }
}

function updateBrandingUI() {
    // 1. Update Header Logo (Regular & GST)
    const containers = ['regular-company-details', 'gst-company-details'];

    containers.forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;

        const existingLogo = container.querySelector('.bill-logo');
        if (existingLogo) existingLogo.remove();

        if (brandingSettings.logo) {
            const img = document.createElement('img');
            img.src = brandingSettings.logo;
            img.className = 'bill-logo';

            // APPLY BORDER RADIUS (NEW)
            img.style.borderRadius = (brandingSettings.logoBorderRadius || 0) + '%';

            if (brandingSettings.logoPosition === 'left') {
                container.insertBefore(img, container.firstChild);
                container.style.flexDirection = 'row';
                container.querySelector('.company-text').style.textAlign = 'right';
            } else {
                container.appendChild(img);
                container.style.flexDirection = 'row';
                container.querySelector('.company-text').style.textAlign = 'left';
            }
        } else {
            container.querySelector('.company-text').style.textAlign = 'center';
        }
    });

    // 2. Update Footer (Sign & Stamp Separate Cells) - GST Only
    const stampCell = document.getElementById('stamp-cell');
    const signatureCell = document.getElementById('signature-cell');

    if (stampCell && signatureCell) {
        // Clear current contents
        stampCell.innerHTML = '';
        signatureCell.innerHTML = '';

        // Add Stamp
        if (brandingSettings.stamp) {
            const stampImg = document.createElement('img');
            stampImg.src = brandingSettings.stamp;
            stampImg.className = 'bill-stamp';
            stampCell.appendChild(stampImg);
        }

        // Add Signature
        if (brandingSettings.signature) {
            const signImg = document.createElement('img');
            signImg.src = brandingSettings.signature;
            signImg.className = 'bill-signature';
            signatureCell.appendChild(signImg);
        }
    }
}

// Add this to your DOMContentLoaded event listener
// await loadBrandingSettings();

/* ==========================================
   UNIFIED ADJUSTMENT SYSTEM (SEQUENTIAL CHAIN)
   ========================================== */

function openAdjustmentModal() {
    // === FIX 2: Explicitly close sidebar instead of toggling ===
    const sidebar = document.getElementById("settings-sidebar");
    const overlay = document.getElementById("settings-overlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("open");

    document.getElementById('adjustment-modal').style.display = 'block';
    renderAdjustmentTables(getCurrentSubtotal());
    resetAdjForm();
}

function closeAdjustmentModal() {
    document.getElementById('adjustment-modal').style.display = 'none';
}

// Core Logic: The Chain Calculator (Handles Regular & GST Modes)
function calculateAdjustments(subtotal) {
    let runningBalance = subtotal;
    let mainBillRows = '';
    let modalPreviewRows = '';

    // --- 1. PREPARE CHAINS ---
    // If GST Mode: Filter out "Legacy GST" (Tax is calc'd at end)
    const activeChain = isGSTMode
        ? adjustmentChain.filter(a => a.id !== 'legacy-gst')
        : adjustmentChain;

    // --- 2. GENERATE FIXED SUBTOTAL ROW FOR MODAL (Common) ---
    const fixedSubRow = `
        <tr style="background-color: #f8f9fa; font-weight: bold;">
            <td>SUB TOTAL</td>
            <td>${subtotal.toFixed(2)}</td>
            <td>-</td>
            <td>-</td>
            <td>${subtotal.toFixed(2)}</td>
            <td></td>
        </tr>`;

    modalPreviewRows += fixedSubRow;

    // --- 3. CALCULATE ADJUSTMENTS CHAIN ---
    activeChain.forEach((adj, index) => {
        let adjAmount = 0;
        let sourceAmount = runningBalance;

        if (adj.type === 'percent') {
            adjAmount = (sourceAmount * adj.value) / 100;
        } else {
            adjAmount = adj.value;
        }
        adjAmount = parseFloat(adjAmount.toFixed(2));

        // === FIX 1: Regular Mode "Taxable Amount" in Modal ===
        // Auto-Insert if Tax is applied after other adjustments
        if ((adj.name.toLowerCase().includes('gst') || adj.name.toLowerCase().includes('tax')) &&
            !isGSTMode &&
            Math.abs(runningBalance - subtotal) > 0.01) {

            // Add to Main Bill
            mainBillRows += `
                <tr class="taxable-row">
                    <td colspan="5" style="text-align: right;">Taxable Amount</td>
                    <td style="text-align: center;">${runningBalance.toFixed(2)}</td>
                </tr>`;

            // Add to Modal Preview (Fixed Row)
            modalPreviewRows += `
                <tr style="background-color: #e8f5e9; font-weight: bold; color: #666;">
                    <td>Taxable Amount</td>
                    <td>${runningBalance.toFixed(2)}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>${runningBalance.toFixed(2)}</td>
                    <td></td>
                </tr>`;
        }

        // Apply Operation
        if (adj.operation === 'subtract') {
            runningBalance -= adjAmount;
        } else {
            runningBalance += adjAmount;
        }

        const sign = adj.operation === 'subtract' ? '-' : '';
        const colorStyle = adj.textColor ? `color: ${adj.textColor};` : '';

        // --- GENERATE HTML ---

        // A. Main Bill Table Row
        mainBillRows += `
            <tr data-adj-id="${adj.id}">
                <td ${isGSTMode ? '' : 'colspan="5" style="text-align: right;"'}>
                    ${adj.name} ${adj.type === 'percent' ? `(${adj.value}%)` : ''}
                </td>
                <td style="text-align: right; ${colorStyle}">${sign}${adjAmount.toFixed(2)}</td>
            </tr>`;

        // B. Modal Preview Row
        const realIndex = adjustmentChain.findIndex(a => a.id === adj.id);

        modalPreviewRows += `
            <tr class="adj-row" draggable="true" data-index="${realIndex}" data-id="${adj.id}">
                <td>${adj.name}</td>
                <td>${sourceAmount.toFixed(2)}</td>
                <td>${adj.type === 'percent' ? adj.value + '%' : '-'}</td>
                <td style="color:${adj.operation === 'subtract' ? 'red' : 'green'}">
                    ${sign}${adjAmount.toFixed(2)}
                </td>
                <td style="font-weight:bold">${runningBalance.toFixed(2)}</td>
                <td>
                    <button class="adj-action-btn edit" onclick="editAdjustment('${adj.id}')">
                        <i class="material-icons" style="font-size:16px">edit</i>
                    </button>
                    <button class="adj-action-btn remove" onclick="removeAdjustment('${adj.id}')">
                        <i class="material-icons" style="font-size:16px">close</i>
                    </button>
                </td>
            </tr>`;
    });

    // --- 4. FINAL CALCULATIONS & DISPLAY ---

    if (isGSTMode) {
        // === GST MODE LOGIC ===
        const taxableValue = runningBalance;
        let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

        // Calculate Taxes
        if (typeof transactionType !== 'undefined' && transactionType === 'intrastate') {
            cgstAmount = parseFloat(((taxableValue * (currentGSTPercent / 2)) / 100).toFixed(2));
            sgstAmount = parseFloat(((taxableValue * (currentGSTPercent / 2)) / 100).toFixed(2));
        } else {
            igstAmount = parseFloat(((taxableValue * currentGSTPercent) / 100).toFixed(2));
        }

        const grandTotal = Math.round(taxableValue + cgstAmount + sgstAmount + igstAmount);

        const showTaxableRow = activeChain.length > 0;

        // === FIX 2: Add Tax Breakdown Rows to Modal Preview ===
        const taxRows = `
            <tr style="background-color: #e8f5e9; font-weight: bold; display: ${showTaxableRow ? '' : 'none'};">
                <td>TAXABLE AMT</td>
                <td>${taxableValue.toFixed(2)}</td>
                <td>-</td>
                <td>-</td>
                <td>${taxableValue.toFixed(2)}</td>
                <td></td>
            </tr>
            ${transactionType === 'intrastate' ? `
            <tr style="font-weight: bold; color: #666;">
                <td>CGST</td>
                <td>${taxableValue.toFixed(2)}</td>
                <td>${(currentGSTPercent / 2)}%</td>
                <td style="color:green">+${cgstAmount.toFixed(2)}</td>
                <td>-</td>
                <td></td>
            </tr>
            <tr style="font-weight: bold; color: #666;">
                <td>SGST</td>
                <td>${taxableValue.toFixed(2)}</td>
                <td>${(currentGSTPercent / 2)}%</td>
                <td style="color:green">+${sgstAmount.toFixed(2)}</td>
                <td>-</td>
                <td></td>
            </tr>` : `
            <tr style="font-weight: bold; color: #666;">
                <td>IGST</td>
                <td>${taxableValue.toFixed(2)}</td>
                <td>${currentGSTPercent}%</td>
                <td style="color:green">+${igstAmount.toFixed(2)}</td>
                <td>-</td>
                <td></td>
            </tr>`}
            <tr style="background-color: #2c3e50; color: white; font-weight: bold;">
                <td>GRAND TOTAL</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>${grandTotal.toFixed(2)}</td>
                <td></td>
            </tr>`;

        modalPreviewRows += taxRows;

        // Update GST Bill Table
        const gstBillHtml = `
            <tr>
                <td>Sub Total</td>
                <td id="gst-sub-total">${subtotal.toFixed(2)}</td>
            </tr>
            ${mainBillRows}
            <tr style="font-weight:bold; background-color:#f8f9fa; display: ${showTaxableRow ? '' : 'none'};">
                <td>TAXABLE AMT</td>
                <td id="gst-taxable-amount">${taxableValue.toFixed(2)}</td>
            </tr>
            <tr style="${transactionType === 'intrastate' ? '' : 'display:none'}">
                <td>CGST</td>
                <td id="gst-cgst-amount">${cgstAmount.toFixed(2)}</td>
            </tr>
            <tr style="${transactionType === 'intrastate' ? '' : 'display:none'}">
                <td>SGST</td>
                <td id="gst-sgst-amount">${sgstAmount.toFixed(2)}</td>
            </tr>
            <tr style="${transactionType === 'interstate' ? '' : 'display:none'}">
                <td>IGST</td>
                <td id="gst-igst-amount">${igstAmount.toFixed(2)}</td>
            </tr>
            <tr>
                <td><strong>Grand Total</strong></td>
                <td><strong id="gst-grand-total">${grandTotal.toFixed(2)}</strong></td>
            </tr>`;

        const gstTbody = document.querySelector('#gst-bill-totals-table tbody');
        if (gstTbody) gstTbody.innerHTML = gstBillHtml;

        updateTaxBreakdownTable({}, taxableValue, cgstAmount, sgstAmount, igstAmount);

        const inputTotal = document.getElementById('createTotalAmountManual');
        if (inputTotal) inputTotal.textContent = subtotal.toFixed(2);

        updateAmountInWords(grandTotal);

    } else {
        // === REGULAR MODE LOGIC ===
        const grandTotal = runningBalance;

        // Modal Fixed Row (Regular)
        const finalRow = `
            <tr style="background-color: #2c3e50; color: white; font-weight: bold;">
                <td>GRAND TOTAL</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>${grandTotal.toFixed(2)}</td>
                <td></td>
            </tr>`;
        modalPreviewRows += finalRow;

        // Update Regular Bill Table
        let regBillHtml = '';

        if (activeChain.length > 0) {
            regBillHtml = `
                <tr>
                    <td colspan="5" class="total-cell" style="text-align: right;">SUB TOTAL</td>
                    <td class="total-cell" style="text-align: center;">${subtotal.toFixed(2)}</td>
                </tr>
                ${mainBillRows}
                <tr>
                    <td colspan="5" class="total-cell" style="text-align: right;">GRAND TOTAL</td>
                    <td class="total-cell" style="text-align: center;">${grandTotal.toFixed(2)}</td>
                </tr>`;
        } else {
            regBillHtml = `
                <tr>
                    <td colspan="5" class="total-cell" style="text-align: right;">TOTAL</td>
                    <td class="total-cell" style="text-align: center;">${grandTotal.toFixed(2)}</td>
                </tr>`;
        }

        const regTbody = document.getElementById('bill-total-tbody');
        if (regTbody) regTbody.innerHTML = regBillHtml;

        // Update Input Mode Total
        const inputTotal = document.getElementById('createTotalAmountManual');
        if (inputTotal) inputTotal.textContent = subtotal.toFixed(2);

        const copyTotal = document.getElementById('copyTotalAmount');
        if (copyTotal) copyTotal.textContent = grandTotal.toFixed(2);

        updateAmountInWords(grandTotal);
    }

    // --- 5. UPDATE MODAL PREVIEW DOM ---
    const previewBody = document.getElementById('adj-preview-tbody');
    if (previewBody) {
        previewBody.innerHTML = modalPreviewRows;
        addAdjDragListeners();
    }

    // --- [UPDATE START] ---
    // 6. RENDER PAYMENT TABLE ON BILL (Update Balance Due based on new Grand Total)
    if (typeof renderBillSpecificPayments === 'function') {
        renderBillSpecificPayments();
    }
    // --- [UPDATE END] ---
}

// Helper: Get raw item total
function getCurrentSubtotal() {
    const items = document.querySelectorAll('#createListManual tbody tr[data-id]');
    let subtotal = 0;
    items.forEach(row => {
        const amount = parseFloat(row.getAttribute('data-amount')) || 0;
        subtotal += amount;
    });
    return parseFloat(subtotal.toFixed(2)); // Fixed precision issues
}

// CRUD: Add/Edit/Remove
async function saveAdjustment() {
    const id = document.getElementById('adj-id').value || 'adj-' + Date.now();
    const name = document.getElementById('adj-name').value.trim();
    const type = document.getElementById('adj-type').value;
    const value = parseFloat(document.getElementById('adj-value').value);
    const operation = document.getElementById('adj-operation').value;
    const color = document.getElementById('adj-color').value;

    if (!name || isNaN(value)) {
        showNotification('Please enter valid details', 'error');
        return;
    }

    const newAdj = { id, name, type, value, operation, textColor: color };

    const existingIndex = adjustmentChain.findIndex(a => a.id === id);
    if (existingIndex >= 0) {
        adjustmentChain[existingIndex] = newAdj;
    } else {
        adjustmentChain.push(newAdj);
    }

    updateTotal();
    openAdjustmentModal();
    resetAdjForm();

    // === FIX 3: Persist data immediately ===
    await saveToLocalStorage();
    saveStateToHistory();
}

function editAdjustment(id) {
    const adj = adjustmentChain.find(a => a.id === id);
    if (!adj) return;

    document.getElementById('adj-id').value = adj.id;
    document.getElementById('adj-name').value = adj.name;
    document.getElementById('adj-type').value = adj.type;
    document.getElementById('adj-value').value = adj.value;
    document.getElementById('adj-operation').value = adj.operation;
    document.getElementById('adj-color').value = adj.textColor;
    document.getElementById('btn-save-adj').textContent = 'Update';
}

// [REPLACE EXISTING removeAdjustment FUNCTION]
async function removeAdjustment(id) {
    // Use custom confirmation dialog
    const shouldRemove = await showConfirm('Are you sure you want to remove this adjustment?');

    if (shouldRemove) {
        adjustmentChain = adjustmentChain.filter(a => a.id !== id);

        // Update UI
        updateTotal();
        renderAdjustmentTables(getCurrentSubtotal());

        // Persist data
        await saveToLocalStorage();
        saveStateToHistory();

        showNotification('Adjustment removed successfully', 'success');
    }
}

function resetAdjForm() {
    document.getElementById('adj-id').value = '';
    document.getElementById('adj-name').value = '';
    document.getElementById('adj-value').value = '';
    document.getElementById('btn-save-adj').textContent = 'Add';
}

function renderAdjustmentTables(subtotal) {
    calculateAdjustments(subtotal); // Re-runs calculation and updates DOM
}

/* ==========================================
   UNIQUE DRAG & DROP FOR ADJUSTMENTS
   ========================================== */
function addAdjDragListeners() {
    const rows = document.querySelectorAll('.adj-row');
    rows.forEach(row => {
        row.addEventListener('dragstart', handleAdjDragStart);
        row.addEventListener('dragover', handleAdjDragOver);
        row.addEventListener('drop', handleAdjDrop);
        row.addEventListener('dragend', handleAdjDragEnd);
    });
}

function handleAdjDragStart(e) {
    adjDragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    this.classList.add('adj-dragging');
}

function handleAdjDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    if (!adjDragSrcEl) return;

    const targetRow = e.target.closest('tr');
    if (targetRow && targetRow !== adjDragSrcEl) {
        targetRow.classList.add('adj-drag-over');
    }
    return false;
}

async function handleAdjDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (adjDragSrcEl === this) return false;

    const srcIdx = parseInt(adjDragSrcEl.getAttribute('data-index'));
    const destIdx = parseInt(this.getAttribute('data-index'));

    const itemToMove = adjustmentChain[srcIdx];
    adjustmentChain.splice(srcIdx, 1);
    adjustmentChain.splice(destIdx, 0, itemToMove);

    updateTotal();
    renderAdjustmentTables(getCurrentSubtotal());

    // === FIX 3: Persist data immediately ===
    await saveToLocalStorage();
    saveStateToHistory();

    return false;
}

function handleAdjDragEnd() {
    this.classList.remove('adj-dragging');
    document.querySelectorAll('.adj-row').forEach(row => row.classList.remove('adj-drag-over'));
    adjDragSrcEl = null;
}

// --- SCANNER FUNCTIONS ---

async function initScanner() {
    if (!codeReader) {
        codeReader = new ZXing.BrowserMultiFormatReader();
    }
}

async function openScanner(mode) {
    currentScannerMode = mode;

    const modal = document.getElementById('scanner-modal');
    modal.style.display = 'block';

    // --- RESET VISIBILITY (In case it was hidden previously) ---
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';

    // Get UI references
    const toggleContainer = document.querySelector('.scan-mode-toggle');
    const manualEntryContainer = document.querySelector('.manual-barcode-entry');

    if (mode === 'modal') {
        // --- ADD ITEM MODE ---
        // 1. Force logic to 'manual' (so it doesn't try to auto-add to bill)
        if (typeof setScanMode === 'function') {
            setScanMode('manual');
        } else {
            scannerMode = 'manual';
        }

        // 2. Hide extra UI elements
        if (toggleContainer) toggleContainer.style.display = 'none';
        if (manualEntryContainer) manualEntryContainer.style.display = 'none';

    } else {
        // --- MAIN BILLING MODE ---
        // 1. Show UI elements
        if (toggleContainer) toggleContainer.style.display = 'flex';
        if (manualEntryContainer) manualEntryContainer.style.display = 'flex';
    }

    // Reset Standard UI Components
    document.getElementById('scanner-container').style.display = 'flex';
    document.getElementById('scanner-controls').style.display = 'flex';
    document.getElementById('camera-select').style.display = 'inline-block';
    document.getElementById('quick-add-form').style.display = 'none';

    await initScanner();

    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        const sourceSelect = document.getElementById('camera-select');
        sourceSelect.innerHTML = '';

        videoInputDevices.forEach((element) => {
            const sourceOption = document.createElement('option');
            sourceOption.text = element.label;
            sourceOption.value = element.deviceId;
            sourceSelect.appendChild(sourceOption);
        });

        // Use last camera (often back camera on mobile) or first available
        const selectedDeviceId = videoInputDevices.length > 1 ? videoInputDevices[videoInputDevices.length - 1].deviceId : videoInputDevices[0].deviceId;

        startDecoding(selectedDeviceId);

        sourceSelect.onchange = () => {
            codeReader.reset();
            startDecoding(sourceSelect.value);
        };

    } catch (err) {
        console.error(err);
        showNotification('Error accessing camera', 'error');
    }
}

function startDecoding(deviceId) {
    codeReader.decodeFromVideoDevice(deviceId, 'scanner-video', (result, err) => {
        if (result) {
            handleScanSuccess(result);
        }
        if (err) {
            // IGNORE specific errors that occur during closing/resizing
            if (err instanceof ZXing.NotFoundException ||
                err.message.includes("IndexSizeError") ||
                err.message.includes("The source width is 0")) {
                return;
            }
            // Log genuine errors
            console.error(err);
        }
    });
}

function closeScannerModal() {
    // 1. Stop the library reader immediately
    if (codeReader) {
        codeReader.reset();
    }

    // 2. Forcefully stop the actual video tracks
    const video = document.getElementById('scanner-video');
    if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }

    // 3. Hide the modal
    document.getElementById('scanner-modal').style.display = 'none';
}

function hideScannerModal() {
    const modal = document.getElementById('scanner-modal');

    // Make invisible but keep in DOM so camera keeps running
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';

    showNotification("Scanner running in background", "info");
}
// --- NEW Helper Function for Dynamic Header ---
function updateQuickAddHeader() {
    const headerEl = document.getElementById('scanned-item-name');
    const inputVal = parseFloat(document.getElementById('quick-quantity').value) || 0;
    const existingQty = parseFloat(headerEl.getAttribute('data-existing-qty')) || 0;
    const baseName = headerEl.getAttribute('data-base-name');

    if (existingQty > 0 && baseName) {
        const newTotal = existingQty + inputVal;

        // Use innerHTML to render the icon
        // Added styling to make the detail text slightly lighter and align the icon
        headerEl.innerHTML = `${baseName} <span style="font-size: 1em; color: #666;">(Qty: ${existingQty} <span class="material-icons" style="font-size: 14px; vertical-align: middle; position: relative; top: -1px;">arrow_right_alt</span> ${newTotal})</span>`;

    } else if (baseName) {
        headerEl.textContent = baseName;
    }
}
// --- UPDATED handleScanSuccess Function ---
async function handleScanSuccess(result) {
    const barcodeText = result.text;
    const currentTime = Date.now();

    // --- AUTOMATIC MODE LOGIC ---
    if (scannerMode === 'auto') {
        if (barcodeText === lastScannedCode && (currentTime - lastScanTime < SCAN_DELAY)) {
            return;
        }

        lastScannedCode = barcodeText;
        lastScanTime = currentTime;

        const allItems = await getAllFromDB('savedItems');
        const foundItem = allItems.find(item =>
            item.value.barcode === barcodeText || item.value.productCode === barcodeText
        );

        if (foundItem) {
            playBeep(); // PLAY SOUND
            await processAutomaticAdd(foundItem.value);
        } else {
            // showNotification(`Item not found: ${barcodeText}`, 'error');
        }
        return;
    }

    // --- MANUAL MODE LOGIC ---
    if (document.getElementById('quick-add-form').style.display !== 'block') {
        if (currentScannerMode === 'modal') {
            document.getElementById('saved-barcode').value = barcodeText;
            const typeSelect = document.getElementById('saved-barcode-type');
            if (barcodeText.length === 13) typeSelect.value = 'EAN_13';
            else if (barcodeText.length === 12) typeSelect.value = 'UPC_A';
            else typeSelect.value = 'CODE_128';

            playBeep(); // PLAY SOUND
            closeScannerModal();
            showNotification('Barcode Scanned!', 'success');
        } else if (currentScannerMode === 'main') {
            const allItems = await getAllFromDB('savedItems');
            const foundItem = allItems.find(item =>
                item.value.barcode === barcodeText || item.value.productCode === barcodeText
            );

            if (foundItem) {
                playBeep(); // PLAY SOUND

                // Pause Camera UI
                document.getElementById('scanner-container').style.display = 'none';
                document.getElementById('scanner-controls').style.display = 'none'; // <--- NEW
                // document.getElementById('camera-select').style.display = 'none';

                // Show Form
                const form = document.getElementById('quick-add-form');
                form.style.display = 'block';

                // Populate Form
                document.getElementById('quick-item-name').value = foundItem.value.name;

                const defaultQty = foundItem.value.defaultQuantity ? parseFloat(foundItem.value.defaultQuantity) : 1;
                document.getElementById('quick-quantity').value = defaultQty;

                document.getElementById('quick-unit').value = foundItem.value.defaultUnit || '';
                document.getElementById('quick-rate').value = foundItem.value.defaultRate || 0;

                scannedItemData = foundItem.value;

                // Existing Qty Logic for Header
                const existingRow = Array.from(document.querySelectorAll('#createListManual tbody tr[data-id]')).find(row => {
                    const nameCell = row.querySelector('.itemNameClass');
                    return nameCell && nameCell.textContent.trim() === foundItem.value.name;
                });

                const headerEl = document.getElementById('scanned-item-name');
                headerEl.setAttribute('data-base-name', foundItem.value.name);

                if (existingRow) {
                    const currentQty = parseFloat(existingRow.getAttribute('data-original-quantity') || existingRow.children[2].textContent);
                    headerEl.setAttribute('data-existing-qty', currentQty);
                } else {
                    headerEl.setAttribute('data-existing-qty', 0);
                }

                updateQuickAddHeader();
                document.getElementById('quick-quantity').focus();
            } else {
                // showNotification(`Item ${barcodeText} not found!`, 'error');
            }
        }
    }
}

async function processAutomaticAdd(itemData) {
    const itemName = itemData.name;

    // CHANGED: Use saved Default Quantity, otherwise fallback to 1
    const addedQty = itemData.defaultQuantity ? parseFloat(itemData.defaultQuantity) : 1;

    const addedUnit = itemData.defaultUnit || '';
    const addedRate = itemData.defaultRate || 0;

    // 1. Check if exists in current bill
    const existingRow = Array.from(document.querySelectorAll('#createListManual tbody tr[data-id]')).find(row => {
        const nameCell = row.querySelector('.itemNameClass');
        return nameCell && nameCell.textContent.trim() === itemName;
    });

    if (existingRow) {
        // --- UPDATE EXISTING ---
        const rowId = existingRow.getAttribute('data-id');
        const currentQty = parseFloat(existingRow.getAttribute('data-original-quantity') || existingRow.children[2].textContent);

        // Increment by the Default Quantity
        const newTotalQty = currentQty + addedQty;

        currentlyEditingRowIdManual = rowId;

        // Populate globals for updateRowManual
        document.getElementById('itemNameManual').value = itemName;
        document.getElementById('quantityManual').value = newTotalQty;
        document.getElementById('selectUnit').value = addedUnit;
        document.getElementById('rateManual').value = addedRate;
        document.getElementById('itemNotesManual').value = existingRow.querySelector('.notes')?.textContent || '';

        // Restore dimensions logic
        const dimType = existingRow.getAttribute('data-dimension-type') || 'none';
        document.getElementById('dimensionType').value = dimType;
        const dimValues = JSON.parse(existingRow.getAttribute('data-dimension-values') || '[0,0,0]');
        document.getElementById('dimension1').value = dimValues[0] || '';
        document.getElementById('dimension2').value = dimValues[1] || '';
        document.getElementById('dimension3').value = dimValues[2] || '';

        // Setup Dimensions Object
        currentDimensions.type = dimType;
        currentDimensions.values = dimValues;
        currentDimensions.unit = existingRow.getAttribute('data-dimension-unit') || 'ft';
        calculateDimensions();

        await updateRowManual();
        showNotification(`Updated: ${itemName} (+${addedQty})`, 'success');

    } else {
        // --- ADD NEW ---
        document.getElementById('itemNameManual').value = itemName;

        // Set Initial Quantity to Default Quantity
        document.getElementById('quantityManual').value = addedQty;

        document.getElementById('selectUnit').value = addedUnit;
        document.getElementById('rateManual').value = addedRate;

        // Load Item Dimensions
        const dimType = itemData.dimensionType || 'none';
        document.getElementById('dimensionType').value = dimType;

        // Restore saved toggle states if they exist
        if (itemData.dimensionToggles) {
            if (document.getElementById('dimension1-toggle')) document.getElementById('dimension1-toggle').checked = itemData.dimensionToggles.toggle1;
            if (document.getElementById('dimension2-toggle')) document.getElementById('dimension2-toggle').checked = itemData.dimensionToggles.toggle2;
            if (document.getElementById('dimension3-toggle')) document.getElementById('dimension3-toggle').checked = itemData.dimensionToggles.toggle3;
        } else {
            // Default checked if no config
            if (document.getElementById('dimension1-toggle')) document.getElementById('dimension1-toggle').checked = true;
            if (document.getElementById('dimension2-toggle')) document.getElementById('dimension2-toggle').checked = true;
            if (document.getElementById('dimension3-toggle')) document.getElementById('dimension3-toggle').checked = true;
        }

        if (dimType !== 'none') {
            currentDimensions.type = dimType;
            currentDimensions.values = itemData.dimensionValues || [0, 0, 0];
            currentDimensions.unit = itemData.measurementUnit || 'ft';
            calculateDimensions();
        } else {
            currentDimensions = { type: 'none', unit: 'ft', values: [0, 0, 0], calculatedArea: 0 };
        }

        await addRowManual();
        showNotification(`Added: ${itemName}`, 'success');
    }

    // Reset Globals after Op
    currentlyEditingRowIdManual = null;
    document.getElementById('itemNameManual').value = '';
    document.getElementById('quantityManual').value = '';
    document.getElementById('rateManual').value = '';
}

async function processQuickAdd() {
    if (!scannedItemData) return;

    // 1. Get values from Quick Add Form
    const itemName = scannedItemData.name;
    const addedQty = parseFloat(document.getElementById('quick-quantity').value) || 0;
    const addedUnit = document.getElementById('quick-unit').value;
    const addedRate = parseFloat(document.getElementById('quick-rate').value) || 0;

    if (addedQty <= 0) {
        showNotification('Please enter a valid quantity', 'error');
        return;
    }

    // 2. Check if item already exists in the bill
    // We look for a row with the same item name in the input table
    const existingRow = Array.from(document.querySelectorAll('#createListManual tbody tr[data-id]')).find(row => {
        const nameCell = row.querySelector('.itemNameClass');
        return nameCell && nameCell.textContent.trim() === itemName;
    });

    if (existingRow) {
        // --- UPDATE EXISTING ITEM (Logic: Merge Qty + Update Row) ---
        const rowId = existingRow.getAttribute('data-id');

        // Get current quantity (using data attribute for precision)
        const currentQty = parseFloat(existingRow.getAttribute('data-original-quantity') || existingRow.children[2].textContent);
        const newTotalQty = currentQty + addedQty;

        // Set global variables required by updateRowManual()
        currentlyEditingRowIdManual = rowId;

        // Fill global inputs with NEW TOTAL quantity and scanned values
        document.getElementById('itemNameManual').value = itemName;
        document.getElementById('quantityManual').value = newTotalQty;
        document.getElementById('selectUnit').value = addedUnit;
        document.getElementById('rateManual').value = addedRate;

        // Preserve notes from existing row
        const existingNotes = existingRow.querySelector('.notes')?.textContent || '';
        document.getElementById('itemNotesManual').value = existingNotes;

        // Restore dimensions and toggles from the existing row to global context
        // This ensures the update function calculates the area correctly
        const dimType = existingRow.getAttribute('data-dimension-type') || 'none';
        document.getElementById('dimensionType').value = dimType;

        const dimValues = JSON.parse(existingRow.getAttribute('data-dimension-values') || '[0,0,0]');
        document.getElementById('dimension1').value = dimValues[0] || '';
        document.getElementById('dimension2').value = dimValues[1] || '';
        document.getElementById('dimension3').value = dimValues[2] || '';

        const toggles = JSON.parse(existingRow.getAttribute('data-dimension-toggles') || '{"toggle1":true,"toggle2":true,"toggle3":true}');
        if (document.getElementById('dimension1-toggle')) document.getElementById('dimension1-toggle').checked = toggles.toggle1;
        if (document.getElementById('dimension2-toggle')) document.getElementById('dimension2-toggle').checked = toggles.toggle2;
        if (document.getElementById('dimension3-toggle')) document.getElementById('dimension3-toggle').checked = toggles.toggle3;

        // Update global dimension calculation object
        currentDimensions.type = dimType;
        currentDimensions.values = dimValues;
        currentDimensions.unit = existingRow.getAttribute('data-dimension-unit') || 'ft';
        calculateDimensions();

        // Execute the update
        await updateRowManual();

        showNotification(`Updated ${itemName}: Quantity increased to ${newTotalQty}`, 'success');

    } else {
        // --- ADD NEW ITEM ---
        // Fill global inputs
        document.getElementById('itemNameManual').value = itemName;
        document.getElementById('quantityManual').value = addedQty;
        document.getElementById('selectUnit').value = addedUnit;
        document.getElementById('rateManual').value = addedRate;

        // Handle dimensions from scanned data
        const dimType = scannedItemData.dimensionType || 'none';
        document.getElementById('dimensionType').value = dimType;

        if (dimType !== 'none') {
            currentDimensions.type = dimType;
            currentDimensions.values = scannedItemData.dimensionValues || [0, 0, 0];
            currentDimensions.unit = scannedItemData.measurementUnit || 'ft';
            calculateDimensions();
        } else {
            currentDimensions = { type: 'none', unit: 'ft', values: [0, 0, 0], calculatedArea: 0 };
        }

        // Execute add
        await addRowManual();
        showNotification(`${itemName} added to bill`, 'success');
    }

    // 3. Reset Scanner for Continuous Scanning (Continuous Mode)
    // Hide the form
    document.getElementById('quick-add-form').style.display = 'none';
    // Show the camera container
    document.getElementById('scanner-container').style.display = 'flex';
    document.getElementById('scanner-controls').style.display = 'flex'; // <--- NEW (Use flex)
    // document.getElementById('camera-select').style.display = 'inline-block';

    // Clear temp data
    scannedItemData = null;

    // Restart the camera immediately
    const selectedDeviceId = document.getElementById('camera-select').value;
    if (selectedDeviceId) {
        codeReader.reset(); // Reset to be safe
        startDecoding(selectedDeviceId);
    }
}

function setScanMode(mode) {
    scannerMode = mode;

    // Update UI
    document.getElementById('btn-scan-manual').className = mode === 'manual' ? 'btn-mode active' : 'btn-mode';
    document.getElementById('btn-scan-auto').className = mode === 'auto' ? 'btn-mode active' : 'btn-mode';

    // Reset scanner UI if switching modes
    document.getElementById('quick-add-form').style.display = 'none';
    document.getElementById('scanner-container').style.display = 'flex';
    document.getElementById('scanner-controls').style.display = 'flex'; // <--- NEW
    document.getElementById('camera-select').style.display = 'inline-block';

    // Restart scanning if needed
    if (codeReader) {
        codeReader.reset();
        const selectedDeviceId = document.getElementById('camera-select').value;
        if (selectedDeviceId) startDecoding(selectedDeviceId);
    }
}

// Handle "Enter" key in manual barcode input
function handleManualEnter(event) {
    if (event.key === 'Enter') {
        handleManualEntry();
    }
}

// Process Manual Barcode Entry
async function handleManualEntry() {
    const input = document.getElementById('manual-barcode-text');
    const code = input.value.trim();

    if (!code) {
        showNotification('Please enter a barcode', 'warning');
        return;
    }

    try {
        const allItems = await getAllFromDB('savedItems');

        // Search by Barcode OR Product Code
        const foundItem = allItems.find(item =>
            item.value.barcode === code || item.value.productCode === code
        );

        if (foundItem) {
            // REMOVED: playBeep();  <-- Sound removed for manual entry

            if (scannerMode === 'auto') {
                // --- AUTOMATIC MODE: Add Instantly ---
                await processAutomaticAdd(foundItem.value);
                input.value = '';
                input.focus();
            } else {
                // --- MANUAL MODE: Open Form ---

                // Hide Scanner UI to show form
                document.getElementById('scanner-container').style.display = 'none';
                document.getElementById('scanner-controls').style.display = 'none'; // <--- NEW
                // document.getElementById('camera-select').style.display = 'none';

                // Show Form
                const form = document.getElementById('quick-add-form');
                form.style.display = 'block';

                // Populate Form
                document.getElementById('quick-item-name').value = foundItem.value.name;

                const defaultQty = foundItem.value.defaultQuantity ? parseFloat(foundItem.value.defaultQuantity) : 1;
                document.getElementById('quick-quantity').value = defaultQty;

                document.getElementById('quick-unit').value = foundItem.value.defaultUnit || '';
                document.getElementById('quick-rate').value = foundItem.value.defaultRate || 0;

                scannedItemData = foundItem.value;

                // Header Logic
                const existingRow = Array.from(document.querySelectorAll('#createListManual tbody tr[data-id]')).find(row => {
                    const nameCell = row.querySelector('.itemNameClass');
                    return nameCell && nameCell.textContent.trim() === foundItem.value.name;
                });

                const headerEl = document.getElementById('scanned-item-name');
                headerEl.setAttribute('data-base-name', foundItem.value.name);

                if (existingRow) {
                    const currentQty = parseFloat(existingRow.getAttribute('data-original-quantity') || existingRow.children[2].textContent);
                    headerEl.setAttribute('data-existing-qty', currentQty);
                } else {
                    headerEl.setAttribute('data-existing-qty', 0);
                }

                updateQuickAddHeader();

                // Clear input and focus quantity in form
                input.value = '';
                document.getElementById('quick-quantity').focus();
            }

        } else {
            // showNotification(`Item not found: ${code}`, 'error');
            input.select();
        }
    } catch (error) {
        console.error('Error in manual entry:', error);
        showNotification('Error checking database', 'error');
    }
}


// Short Beep Sound (Base64 encoded)
const beepAudio = new Audio("./beep.mpeg");

function playBeep() {
    beepAudio.currentTime = 0;
    beepAudio.play().catch(e => console.log("Audio play failed (user interaction needed first)", e));
}


/* ==========================================================================
   ADVANCED OCR & DATA ENTRY ASSISTANT MODULE
   ========================================================================== */

var ocrState = {
    isDragging: false,
    isResizing: false,
    dragStartX: 0, dragStartY: 0,
    initialLeft: 0, initialTop: 0,
    initialWidth: 0, initialHeight: 0,
    resizeDir: '',
    cropper: null,
    currentFile: null,
    worker: null,
    extractedValue: '',
    isReplaceMode: true,
    originalImageSrc: null
};

// document.addEventListener('DOMContentLoaded', () => {
//     initOCRWindowManagement();
//     initOCRDragAndDrop();

//     // Global click listener to close context menu
//     document.addEventListener('click', (e) => {
//         if (!e.target.closest('#ocr-context-menu')) {
//             document.getElementById('ocr-context-menu').style.display = 'none';
//         }
//     });
// });

/* --- WINDOW MANAGEMENT (Drag & Resize) --- */
function initOCRWindowManagement() {
    const modal = document.getElementById('ocr-modal');
    const header = document.getElementById('ocr-header');
    if (!modal) return;

    // Drag Logic
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.window-controls')) return;
        ocrState.isDragging = true;
        ocrState.dragStartX = e.clientX;
        ocrState.dragStartY = e.clientY;
        const rect = modal.getBoundingClientRect();
        ocrState.initialLeft = rect.left;
        ocrState.initialTop = rect.top;
        modal.style.transform = 'none'; // Disable centering transform
        modal.style.left = ocrState.initialLeft + 'px';
        modal.style.top = ocrState.initialTop + 'px';
    });

    // Resize Logic
    document.querySelectorAll('.resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            ocrState.isResizing = true;
            ocrState.resizeDir = handle.className.split(' ').find(c => c.endsWith('-resize')).replace('-resize', '');
            ocrState.dragStartX = e.clientX;
            ocrState.dragStartY = e.clientY;
            const rect = modal.getBoundingClientRect();
            ocrState.initialWidth = rect.width;
            ocrState.initialHeight = rect.height;
            ocrState.initialLeft = rect.left;
            ocrState.initialTop = rect.top;
            modal.style.transform = 'none';
            modal.style.left = ocrState.initialLeft + 'px';
            modal.style.top = ocrState.initialTop + 'px';
        });
    });

    // Mouse Move
    document.addEventListener('mousemove', (e) => {
        if (ocrState.isDragging) {
            const dx = e.clientX - ocrState.dragStartX;
            const dy = e.clientY - ocrState.dragStartY;
            modal.style.left = (ocrState.initialLeft + dx) + 'px';
            modal.style.top = (ocrState.initialTop + dy) + 'px';
        }
        if (ocrState.isResizing) {
            const dx = e.clientX - ocrState.dragStartX;
            const dy = e.clientY - ocrState.dragStartY;

            if (ocrState.resizeDir.includes('e')) modal.style.width = Math.max(600, ocrState.initialWidth + dx) + 'px';
            if (ocrState.resizeDir.includes('s')) modal.style.height = Math.max(400, ocrState.initialHeight + dy) + 'px';
            // Simple implementation for SE corner mostly used
        }
    });

    // Mouse Up (End Interaction & Save)
    document.addEventListener('mouseup', () => {
        // Only save if we were actually interacting
        if (ocrState.isDragging || ocrState.isResizing) {
            saveOCRSettings(); // <--- Save position/size to LocalStorage
        }

        ocrState.isDragging = false;
        ocrState.isResizing = false;
    });
}

/* --- DRAG & DROP FILE ZONE --- */
function initOCRDragAndDrop() {
    const workbench = document.getElementById('ocr-workbench');

    workbench.addEventListener('dragover', (e) => {
        e.preventDefault();
        workbench.style.border = '2px dashed var(--primary-color)';
        workbench.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
    });

    workbench.addEventListener('dragleave', (e) => {
        e.preventDefault();
        workbench.style.border = 'none';
        workbench.style.backgroundColor = '#333';
    });

    workbench.addEventListener('drop', (e) => {
        e.preventDefault();
        workbench.style.border = 'none';
        workbench.style.backgroundColor = '#333';
        if (e.dataTransfer.files.length > 0) {
            const fileInput = document.getElementById('ocr-file-input');
            fileInput.files = e.dataTransfer.files;
            handleOCRFile(fileInput);
        }
    });
}

/* --- CORE FUNCTIONS --- */

function openOCRModal() {
    document.getElementById('ocr-modal').style.display = 'flex';
}

function closeOCRModal() {
    document.getElementById('ocr-modal').style.display = 'none';
    if (ocrState.cropper) ocrState.cropper.destroy();
}

// function minimizeOCRModal() {
//     // Basic minimize: just hide, or could shrink to a bar. 
//     // For now, let's just close (or you can implement a dock)
//     document.getElementById('ocr-modal').style.display = 'none';
// }

async function handleOCRFile(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    ocrState.currentFile = file;

    // UI Reset
    document.getElementById('ocr-empty-state').style.display = 'none';
    const canvasContainer = document.getElementById('ocr-canvas-container');
    canvasContainer.style.display = 'block';
    const imgElement = document.getElementById('ocr-source-image');

    // Enable Buttons
    document.getElementById('btn-crop-scan').disabled = false;
    document.getElementById('btn-filter').disabled = false;

    if (ocrState.cropper) ocrState.cropper.destroy();

    const fileType = file.name.split('.').pop().toLowerCase();

    if (['png', 'jpg', 'jpeg', 'bmp', 'webp'].includes(fileType)) {
        // Load Image directly
        const reader = new FileReader();
        reader.onload = (e) => {
            imgElement.src = e.target.result;
            ocrState.originalImageSrc = e.target.result;
            initCropper(imgElement);
        };
        reader.readAsDataURL(file);
    }
    else if (fileType === 'pdf') {
        // Render PDF Page 1 to Image
        updateOCRProgress(10, 'Rendering PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const page = await pdf.getPage(1); // Default to page 1

        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const pdfUrl = canvas.toDataURL('image/png');
        imgElement.src = pdfUrl;
        // NEW: Store original source
        ocrState.originalImageSrc = pdfUrl;
        initCropper(imgElement);
        updateOCRProgress(0, 'Ready');
    }
    else {
        // Docs/Excel: No visual crop, just process
        document.getElementById('ocr-empty-state').style.display = 'block';
        document.getElementById('ocr-empty-state').innerHTML = '<p>Document loaded. Click "Full Scan".</p>';
        canvasContainer.style.display = 'none';
        document.getElementById('btn-crop-scan').disabled = true;
    }
}

function initCropper(imageElement) {
    ocrState.cropper = new Cropper(imageElement, {
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.8,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
    });
}

/* --- OCR EXECUTION --- */

async function ocrProcess(mode) {
    // 1. Safety Check: Ensure a file is loaded
    if (!ocrState.currentFile) {
        showNotification("Please upload a file first to scan.", "error");
        return;
    }

    const resultArea = document.getElementById('ocr-result');
    const chipsContainer = document.getElementById('ocr-smart-chips');

    resultArea.value = '';
    chipsContainer.innerHTML = '';
    updateOCRProgress(0, 'Starting Engine...');
    document.getElementById('ocr-progress-container').style.display = 'block';

    try {
        let imageToScan;

        // 2. Get Image Source
        if (ocrState.currentFile.name.endsWith('.docx') || ocrState.currentFile.name.endsWith('.xlsx')) {
            // Non-image formats
            await processDocumentFile(ocrState.currentFile);
            return;
        }

        if (mode === 'crop' && ocrState.cropper) {
            // Get cropped canvas
            imageToScan = ocrState.cropper.getCroppedCanvas({ fillColor: '#fff' });
        } else if (ocrState.cropper) {
            // Get full canvas
            imageToScan = ocrState.cropper.element;
        } else {
            // Raw file fallback
            imageToScan = ocrState.currentFile;
        }

        // 3. Initialize Tesseract
        if (!ocrState.worker) {
            ocrState.worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        updateOCRProgress(m.progress * 100, `Scanning... ${Math.round(m.progress * 100)}%`);
                    } else {
                        updateOCRProgress(null, m.status);
                    }
                }
            });
        }

        // 4. Run Recognition
        const ret = await ocrState.worker.recognize(imageToScan);
        const text = ret.data.text;

        // 5. Display Results
        resultArea.value = text;
        localStorage.setItem('billApp_ocrText', text);
        parseSmartData(text);
        updateOCRProgress(100, 'Complete');
        setTimeout(() => document.getElementById('ocr-progress-container').style.display = 'none', 2000);

    } catch (error) {
        console.error(error);
        resultArea.value = "Error: " + error.message;
        updateOCRProgress(0, 'Failed');
    }
}

async function processDocumentFile(file) {
    const resultArea = document.getElementById('ocr-result');
    const fileType = file.name.split('.').pop().toLowerCase();
    let text = '';

    if (fileType === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        text = result.value;
    } else if (fileType.includes('xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        workbook.SheetNames.forEach(name => {
            text += XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
        });
    }

    resultArea.value = text;
    localStorage.setItem('billApp_ocrText', text);
    parseSmartData(text);
    updateOCRProgress(100, 'Document Parsed');
}

/* --- INTELLIGENT FEATURES --- */

function updateOCRProgress(percent, text) {
    if (percent !== null) document.getElementById('ocr-progress-bar').style.width = percent + '%';
    if (text) document.getElementById('ocr-status-text').textContent = text;
}

// 1. Toggle Menu
function toggleFilterMenu() {
    const menu = document.getElementById('filter-menu');
    const btn = document.getElementById('btn-filter');
    if (!menu || !btn) return;

    // Toggle Display
    if (menu.style.display === 'none' || menu.style.display === '') {
        // Calculate Position relative to Viewport
        const rect = btn.getBoundingClientRect();

        menu.style.display = 'block';
        menu.style.top = (rect.bottom + 5) + 'px';
        menu.style.left = rect.left + 'px';

        // Initialize sliders if first run
        if (!ocrState.originalImageSrc && ocrState.cropper) {
            ocrState.originalImageSrc = ocrState.cropper.url;
        }
    } else {
        menu.style.display = 'none';
    }
}

// 2. Real-time Filter Logic
function updateImageFilters() {
    if (!ocrState.cropper || !ocrState.originalImageSrc) return;

    const thresholdVal = parseInt(document.getElementById('slider-threshold').value);
    const contrastVal = parseInt(document.getElementById('slider-contrast').value);

    // Update Label Text
    document.getElementById('val-threshold').textContent = thresholdVal;
    document.getElementById('val-contrast').textContent = contrastVal;

    // Create an off-screen image to process the ORIGINAL pixels
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = ocrState.originalImageSrc;

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Pre-calculate Contrast Factor
        // Factor formula: (259 * (contrast + 255)) / (255 * (259 - contrast))
        const factor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));

        for (let i = 0; i < data.length; i += 4) {
            // 1. Grayscale
            let gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

            // 2. Apply Contrast
            gray = factor * (gray - 128) + 128;

            // 3. Apply Threshold (Binarization)
            // If slider is at 0, skip binarization (grayscale only)
            // If > 0, apply binary cutoff
            let finalVal = gray;
            if (thresholdVal > 0) {
                finalVal = gray > thresholdVal ? 255 : 0;
            }

            // Clamp values 0-255
            finalVal = Math.max(0, Math.min(255, finalVal));

            data[i] = finalVal;     // R
            data[i + 1] = finalVal;   // G
            data[i + 2] = finalVal;   // B
            // Alpha (data[i+3]) remains unchanged
        }

        ctx.putImageData(imgData, 0, 0);

        // Update Cropper
        canvas.toBlob((blob) => {
            const newUrl = URL.createObjectURL(blob);
            ocrState.cropper.replace(newUrl);
        });
    };
}

// 3. Reset Filters
function resetFilters() {
    document.getElementById('slider-threshold').value = 128;
    document.getElementById('slider-contrast').value = 0;

    // Trigger update
    updateImageFilters();
}

// Enhance Image (Simple Binarization filter)
function applyImageFilter() {
    if (!ocrState.cropper) {
        showNotification("Please upload an image first.", "error");
        return;
    }

    showNotification("Enhancing image for text clarity...", "info");

    // 1. Get the current image data from Cropper
    // using getCanvas() allows us to manipulate pixels
    const canvas = ocrState.cropper.getCroppedCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // 2. Loop through every pixel to apply filters
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // A. Grayscale Conversion (Human perception weighted)
        // This converts colors (like pink) to a shade of gray
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // B. Binarization (Thresholding)
        // If the gray value is lighter than 160, make it PURE WHITE (background).
        // If it's darker, make it PURE BLACK (text).
        // This removes the "pink" paper noise effectively.
        const threshold = 160;
        const val = gray > threshold ? 255 : 0;

        data[i] = val;     // Red
        data[i + 1] = val; // Green
        data[i + 2] = val; // Blue
    }

    // 3. Put the processed pixels back
    ctx.putImageData(imgData, 0, 0);

    // 4. Update the Cropper with the new "Clean" image
    canvas.toBlob((blob) => {
        const newUrl = URL.createObjectURL(blob);

        // This updates the visual in the workbench
        ocrState.cropper.replace(newUrl);

        showNotification("Enhancement Complete! Try scanning now.", "success");
    });
}
function parseSmartData(text) {
    const container = document.getElementById('ocr-smart-chips');
    container.innerHTML = '';

    const patterns = [
        { type: 'GSTIN', regex: /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/g, icon: 'badge' },
        { type: 'Date', regex: /\b\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}\b/g, icon: 'event' },
        { type: 'Amount', regex: /(?:Rs\.?|INR|₹)\s*[\d,]+\.?\d{0,2}\b/gi, icon: 'payments' },
        { type: 'Phone', regex: /[6-9]\d{9}\b/g, icon: 'call' },
        { type: 'Invoice', regex: /INV-?\d+/i, icon: 'receipt' }
    ];

    const uniqueMatches = new Set();

    patterns.forEach(p => {
        const matches = text.match(p.regex);
        if (matches) {
            matches.forEach(m => {
                const clean = m.trim();
                if (!uniqueMatches.has(clean) && clean.length > 2) {
                    uniqueMatches.add(clean);
                    createSmartChip(clean, p.type, p.icon, container);
                }
            });
        }
    });
}

function createSmartChip(text, type, icon, container) {
    const chip = document.createElement('div');
    chip.className = 'smart-chip';
    chip.innerHTML = `<span class="material-icons" style="font-size:14px;">${icon}</span> ${text}`;

    // Right Click (or Left Click) to open Magic Fill Menu
    chip.onclick = (e) => {
        openMagicFillMenu(e, text);
    };

    container.appendChild(chip);
}

/* --- MAGIC FILL SYSTEM --- */

function openMagicFillMenu(e, text) {
    e.stopPropagation();
    ocrState.extractedValue = text;

    const menu = document.getElementById('ocr-context-menu');
    menu.style.display = 'block';

    // Position menu at cursor
    // Adjust for scroll and viewport edges in a real app
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
}

// Function to handle SELECT dropdowns from Magic Menu (Main Window)
// Function to handle SELECT dropdowns (Executed in Main Window)
function magicSelect(elementId, value) {
    const el = document.getElementById(elementId);

    if (el) {
        // 1. Set Value
        el.value = value;

        // 2. Trigger Change Event (Important for listeners)
        el.dispatchEvent(new Event('change', { bubbles: true }));

        // 3. Smart Toggling: Show container if currently hidden
        if (elementId === 'dimensionType') {
            const container = document.getElementById('dimension-inputs-container');
            if (container && container.style.display === 'none') {
                if (typeof toggleDimensionInputs === 'function') toggleDimensionInputs();
            }
        }

        if (elementId === 'convertUnit') {
            const convertSelect = document.getElementById('convertUnit');
            // Convert options might be hidden even if dimensions are shown
            if (convertSelect && convertSelect.style.display === 'none') {
                if (typeof toggleConvertOptions === 'function') toggleConvertOptions();
            }
        }

        if (elementId === 'discountType') {
            const container = document.getElementById('discount-inputs-container');
            if (container && container.style.display === 'none') {
                if (typeof toggleDiscountInputs === 'function') toggleDiscountInputs();
            }
        }

        // 4. Hide Menu (if triggered from main window)
        const menu = document.getElementById('magic-menu');
        if (menu) menu.style.display = 'none';

        showNotification(`Selected: ${value}`, 'success');
    } else {
        console.error(`Element #${elementId} not found in Main Window.`);
        showNotification(`Field '${elementId}' not found (Check Input Mode)`, 'error');
    }
}

// NEW: Handle Copy Operation
async function magicOperation(action) {
    const selection = window.magicSelectedText;

    try {
        if (action === 'copy') {
            if (selection) {
                await navigator.clipboard.writeText(selection);
                showNotification('Copied to clipboard', 'success');
            } else {
                showNotification('No text selected', 'warning');
            }
        }
        // Removed Paste/Cut handling logic as requested

        document.getElementById('magic-menu').style.display = 'none';
    } catch (err) {
        console.error('Clipboard error:', err);
        showNotification('Clipboard action failed', 'error');
    }
}

function magicFill(targetFieldId) {
    const val = ocrState.extractedValue;

    if (targetFieldId === 'copy') {
        navigator.clipboard.writeText(val);
        showNotification("Copied to clipboard", "success");
    } else {
        // Auto-detect mode (GST vs Regular)
        let finalId = targetFieldId;

        // Map generic IDs to specific mode IDs
        if (isGSTMode) {
            if (targetFieldId === 'custName') finalId = 'billToName'; // Span in GST view
            if (targetFieldId === 'custGSTIN') finalId = 'billToGstin';
            if (targetFieldId === 'billDate') finalId = 'bill-date-gst';
            if (targetFieldId === 'billNo') finalId = 'bill-invoice-no';

            // For spans, use textContent
            const el = document.getElementById(finalId);
            if (el) {
                el.textContent = val;
                // Also update hidden inputs if they exist for saving
                if (finalId === 'billToName') document.getElementById('consignee-name').value = val;
                showNotification(`Filled GST Field: ${val}`, "success");
            }
        } else {
            // Regular Mode (Inputs)
            const el = document.getElementById(targetFieldId);
            if (el) {
                el.value = val;
                // Trigger input events for auto-save/validation
                el.dispatchEvent(new Event('input'));
                showNotification(`Filled Field: ${val}`, "success");
            }
        }
    }

    document.getElementById('ocr-context-menu').style.display = 'none';
}

function copyOCRText() {
    const text = document.getElementById('ocr-result');
    text.select();
    navigator.clipboard.writeText(text.value);
    showNotification("All text copied!", "success");
}

/* ==========================================
   RIGHT-CLICK MAGIC FILL SYSTEM
   ========================================== */

let magicSelectedText = "";

document.addEventListener('DOMContentLoaded', () => {
    initOCRWindowManagement();
    initOCRDragAndDrop();
    loadOCRSettings();

    // 1. Context Menu Trigger
    document.addEventListener('contextmenu', (e) => {
        const selection = window.getSelection().toString().trim();
        const target = e.target;

        // Allow if text selected OR right-clicking an input/textarea inside OCR
        if ((selection.length > 0 || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.closest('#ocr-modal')) {
            e.preventDefault();
            magicSelectedText = selection;
            window.magicContextMenuTarget = target; // Save target for Paste/Cut
            showMagicMenu(e.clientX, e.clientY);
        }
    });

    // 2. Global Click Listener
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#ocr-context-menu')) document.getElementById('ocr-context-menu').style.display = 'none';
        if (!e.target.closest('#magic-menu')) document.getElementById('magic-menu').style.display = 'none';

        const filterMenu = document.getElementById('filter-menu');
        const filterBtn = document.getElementById('btn-filter');
        if (filterMenu && filterMenu.style.display === 'block') {
            if (!filterMenu.contains(e.target) && (!filterBtn || !filterBtn.contains(e.target))) {
                filterMenu.style.display = 'none';
            }
        }
    });

    // 3. Smart Nested Submenu Positioning
    const magicItems = document.querySelectorAll('.magic-item');
    magicItems.forEach(item => {
        item.addEventListener('mouseenter', function () {
            const subMenu = this.querySelector('.magic-sub-menu');
            if (subMenu) {
                const rect = this.getBoundingClientRect();
                const winWidth = window.innerWidth;
                const winHeight = window.innerHeight;
                const subMenuWidth = 160;
                const subMenuHeight = subMenu.scrollHeight || 300;

                // --- A. Horizontal Logic (Cascading Flip) ---
                const parentMenu = this.closest('.magic-sub-menu');
                const isParentFlippedLeft = parentMenu && parentMenu.classList.contains('flip-left');

                // Default: Flip if hitting right edge OR if parent is already flipped left
                let shouldFlipLeft = isParentFlippedLeft || (rect.right + subMenuWidth > winWidth);

                // Safety: If flipping left puts it off-screen to the left, force right
                if (shouldFlipLeft && (rect.left - subMenuWidth < 0)) {
                    shouldFlipLeft = false;
                }

                if (shouldFlipLeft) {
                    subMenu.classList.add('flip-left');
                } else {
                    subMenu.classList.remove('flip-left');
                }

                // --- B. Vertical Logic (Flip Up) ---
                if (rect.top + subMenuHeight > winHeight) {
                    subMenu.classList.add('flip-up');
                } else {
                    subMenu.classList.remove('flip-up');
                }
            }
        });
    });

    // 4. Restore/Save Text
    const savedText = localStorage.getItem('billApp_ocrText');
    const textArea = document.getElementById('ocr-result');
    if (savedText && textArea) {
        textArea.value = savedText;
        if (window.ocrState) window.ocrState.extractedValue = savedText;
    }

    if (textArea) {
        textArea.addEventListener('input', () => {
            localStorage.setItem('billApp_ocrText', textArea.value);
        });
    }
});

function showMagicMenu(x, y) {
    const menu = document.getElementById('magic-menu');

    // 1. Reset display to measure dimensions
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    // 2. Horizontal Flip (Prevent right overflow)
    if (x + menuWidth > winWidth) {
        x = x - menuWidth;
    }

    // 3. Vertical Flip (Prevent bottom overflow) - NEW LOGIC
    if (y + menuHeight > winHeight) {
        y = y - menuHeight; // Position above the cursor
    }

    // 4. Apply positions
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.visibility = 'visible';
}
function magicFillField(elementId) {
    const element = document.getElementById(elementId);

    if (element) {
        // --- NEW: Handle Replace vs Append ---
        if (ocrState.isReplaceMode) {
            // Replace Mode: Overwrite value
            element.value = magicSelectedText;
        } else {
            // Append Mode: Add space + new text
            const currentVal = element.value;
            if (currentVal) {
                element.value = currentVal + ' ' + magicSelectedText;
            } else {
                element.value = magicSelectedText;
            }
        }
        // -------------------------------------

        // 2. Trigger Events (Important for calculations/autosave)
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        // 3. Visual Feedback
        element.style.transition = "background-color 0.3s";
        element.style.backgroundColor = "#e8f5e9"; // Light green flash
        setTimeout(() => {
            element.style.backgroundColor = "";
        }, 500);

        // 4. Focus
        element.focus();

        // 5. Special Handlers
        if (elementId === 'itemNameManual') {
            if (typeof handleItemNameInput === 'function') {
                handleItemNameInput();
            }
        }

        showNotification(`${ocrState.isReplaceMode ? 'Replaced' : 'Appended'}: ${magicSelectedText}`, 'success');
    } else {
        showNotification(`Field not found (Open the modal first!)`, 'error');
    }
}

function toggleOCRWorkbench() {
    const workbench = document.getElementById('ocr-workbench');
    const chips = document.getElementById('ocr-smart-chips');
    const resHeader = document.querySelector('#ocr-results-panel .result-header');
    const progress = document.getElementById('ocr-progress-container');
    const resultsPanel = document.getElementById('ocr-results-panel');

    // NEW: Target the main modal header
    const mainHeader = document.getElementById('ocr-header');

    // Check current state (if workbench is visible, we go to Focus Mode)
    if (workbench.style.display !== 'none') {
        // --- ENTER FOCUS MODE ---
        workbench.style.display = 'none';
        if (chips) chips.style.display = 'none';
        if (resHeader) resHeader.style.display = 'none';
        if (progress) progress.style.display = 'none';
        if (mainHeader) mainHeader.style.display = 'none'; // Hide Header

        // Remove padding/border for clean full-window look
        if (resultsPanel) {
            resultsPanel.style.padding = '0';
            resultsPanel.style.borderLeft = 'none';
        }

        const btn = document.querySelector('button[onclick="toggleOCRWorkbench()"]');
        if (btn) btn.innerHTML = '<span class="material-icons">vertical_split</span> Split View';

    } else {
        // --- ENTER NORMAL MODE ---
        workbench.style.display = 'flex';
        if (chips) chips.style.display = 'flex';
        if (resHeader) resHeader.style.display = 'flex';
        if (progress) progress.style.display = '';
        if (mainHeader) mainHeader.style.display = 'flex'; // Show Header

        // Restore padding/border
        if (resultsPanel) {
            resultsPanel.style.padding = '15px';
            resultsPanel.style.borderLeft = '1px solid #ddd';
        }

        const btn = document.querySelector('button[onclick="toggleOCRWorkbench()"]');
        if (btn) btn.innerHTML = '<span class="material-icons">view_sidebar</span> Focus View';
    }
}

function toggleOCRReplaceMode() {
    ocrState.isReplaceMode = !ocrState.isReplaceMode;
    const btn = document.getElementById('btn-ocr-replace-mode');

    if (ocrState.isReplaceMode) {
        btn.innerHTML = '<span class="material-icons">find_replace</span> Replace: ON';
        btn.style.backgroundColor = '#e8f5e9'; // Light Green bg
        btn.style.color = '#27ae60'; // Green text
        btn.style.borderColor = '#27ae60';
    } else {
        btn.innerHTML = '<span class="material-icons">playlist_add</span> Replace: OFF';
        btn.style.backgroundColor = ''; // Default gray
        btn.style.color = '';
        btn.style.borderColor = '';
    }

    // NEW: Save to Local Storage immediately
    saveOCRSettings();
}

function saveOCRSettings() {
    const modal = document.getElementById('ocr-modal');
    if (!modal) return;

    const settings = {
        isReplaceMode: ocrState.isReplaceMode,
        width: modal.offsetWidth,
        height: modal.offsetHeight,
        left: modal.offsetLeft,
        top: modal.offsetTop
    };

    localStorage.setItem('billApp_ocrSettings', JSON.stringify(settings));
}

function loadOCRSettings() {
    const saved = localStorage.getItem('billApp_ocrSettings');
    if (saved) {
        const data = JSON.parse(saved);

        // Restore Logic State
        if (data.isReplaceMode !== undefined) {
            ocrState.isReplaceMode = data.isReplaceMode;
        }

        // Restore Visual State (Apply directly to Modal)
        const modal = document.getElementById('ocr-modal');
        if (modal) {
            if (data.width) modal.style.width = data.width + 'px';
            if (data.height) modal.style.height = data.height + 'px';

            // Only apply position if valid coordinates exist
            if (data.left && data.top) {
                modal.style.left = data.left + 'px';
                modal.style.top = data.top + 'px';
                modal.style.transform = 'none'; // Remove default centering
            }
        }

        // Update the Toggle Button UI immediately
        updateReplaceModeUI();
    }
}

// Helper to sync the button UI with the state
function updateReplaceModeUI() {
    const btn = document.getElementById('btn-ocr-replace-mode');
    if (!btn) return;

    if (ocrState.isReplaceMode) {
        btn.innerHTML = '<span class="material-icons">find_replace</span> Replace: ON';
        btn.style.backgroundColor = '#e8f5e9';
        btn.style.color = '#27ae60';
        btn.style.borderColor = '#27ae60';
    } else {
        btn.innerHTML = '<span class="material-icons">playlist_add</span> Replace: OFF';
        btn.style.backgroundColor = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    }
}

function openOCRPopOut() {
    // 1. Create New Window
    const newWin = window.open('', 'OCR_PopOut', 'width=1000,height=700,menubar=no,toolbar=no,location=no,status=no');

    if (!newWin) {
        showNotification("Pop-up blocked! Please allow pop-ups.", "error");
        return;
    }

    newWin.document.open();

    // 2. Gather Styles
    let cssHtml = '';
    document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
        cssHtml += node.outerHTML;
    });

    cssHtml += `
        <style>
            body { margin: 0; padding: 0; background: #f5f5f5; height: 100vh; display: flex; flex-direction: column; }
            #ocr-body { flex: 1; height: 100%; border: none; }
            .window-controls, .resize-handle { display: none !important; } 
            #ocr-header { border-radius: 0; cursor: default; }
            .magic-menu { position: fixed; z-index: 99999; }
        </style>
    `;

    // 3. Gather Content
    const headerContent = document.getElementById('ocr-header').innerHTML;
    const bodyContent = document.getElementById('ocr-body').innerHTML;
    const contextMenu = document.getElementById('ocr-context-menu').outerHTML;
    const magicMenu = document.getElementById('magic-menu').outerHTML;

    // 4. Construct Document
    newWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>OCR Assistant - Bill App</title>
            ${cssHtml}
            <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"><\/script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
            <script>pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';<\/script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"><\/script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"><\/script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" />
            <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js"><\/script>
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
        </head>
        <body>
            <div id="ocr-header">${headerContent}</div>
            <div id="ocr-body">${bodyContent}</div>
            ${contextMenu}
            ${magicMenu}
            
            <script>
                window.ocrState = {
                    cropper: null, currentFile: null, worker: null,
                    extractedValue: '', originalImageSrc: null,
                    isReplaceMode: ${ocrState.isReplaceMode}
                };
                window.magicSelectedText = ""; 

                // Clone generic functions
                ${toggleOCRReplaceMode.toString()}
                ${handleOCRFile.toString()}
                ${ocrProcess.toString()}
                ${processDocumentFile.toString()}
                ${initCropper.toString()}
                ${updateOCRProgress.toString()}
                ${toggleFilterMenu.toString()}   
                ${updateImageFilters.toString()}
                ${resetFilters.toString()}
                ${applyImageFilter.toString()}
                ${parseSmartData.toString()}
                ${createSmartChip.toString()}
                ${openMagicFillMenu.toString()}
                ${copyOCRText.toString()}
                ${showMagicMenu.toString()}
                
                // Inject Toggle Logic
                ${toggleOCRWorkbench.toString()}

                // 3. SPECIAL: Proxy 'magicSelect' to Parent Window
                function magicSelect(targetFieldId, val) {
                    if (window.opener && !window.opener.closed) {
                        // Directly call the parent function
                        window.opener.magicSelect(targetFieldId, val);
                    } else {
                        alert("Main window is closed.");
                    }
                    document.getElementById('magic-menu').style.display = 'none';
                }

                async function magicOperation(action) {
                    const selection = window.magicSelectedText;
                    try {
                        if (action === 'copy') {
                            if (selection) {
                                await navigator.clipboard.writeText(selection);
                                showNotification('Copied to clipboard', 'success');
                            } else {
                                showNotification('No text selected', 'warning');
                            }
                        } 
                        document.getElementById('magic-menu').style.display = 'none';
                    } catch (err) {
                        console.error(err);
                        showNotification('Clipboard action failed', 'error');
                    }
                }

                function magicFillField(targetFieldId) {
                    fillParentField(targetFieldId, window.magicSelectedText);
                    document.getElementById('magic-menu').style.display = 'none';
                }

                function magicFill(targetFieldId) {
                    fillParentField(targetFieldId, window.ocrState.extractedValue);
                    document.getElementById('ocr-context-menu').style.display = 'none';
                }

                function fillParentField(targetFieldId, val) {
                    if (!window.opener || window.opener.closed) {
                        alert("Main Bill App window is closed.");
                        return;
                    }
                    if (targetFieldId === 'copy') {
                        navigator.clipboard.writeText(val);
                        return;
                    }

                    const parentDoc = window.opener.document;
                    const isGSTMode = window.opener.isGSTMode;
                    let finalId = targetFieldId;
                    
                    if (isGSTMode) {
                        if (targetFieldId === 'custName') finalId = 'billToName';
                        if (targetFieldId === 'custGSTIN') finalId = 'billToGstin';
                        if (targetFieldId === 'billDate') finalId = 'bill-date-gst';
                        if (targetFieldId === 'billNo') finalId = 'bill-invoice-no';
                        if (targetFieldId === 'custPhone') finalId = 'billToContact';
                        
                        const el = parentDoc.getElementById(finalId);
                        if (el) {
                            el.textContent = val;
                            if(finalId === 'billToName') {
                                const input = parentDoc.getElementById('consignee-name');
                                if(input) input.value = val;
                            }
                        } else {
                            const inputEl = parentDoc.getElementById(targetFieldId);
                            if(inputEl) updateInput(inputEl, val);
                        }
                    } else {
                        const el = parentDoc.getElementById(targetFieldId);
                        if (el) updateInput(el, val);
                    }
                }

                function updateInput(el, val) {
                    if (window.ocrState.isReplaceMode) {
                        el.value = val;
                    } else {
                        el.value = el.value ? el.value + ' ' + val : val;
                    }
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    if (el.id === 'itemNameManual' && window.opener.handleItemNameInput) {
                        window.opener.handleItemNameInput();
                    }
                }

                document.addEventListener('DOMContentLoaded', () => {
                    const workbench = document.getElementById('ocr-workbench');
                    workbench.addEventListener('dragover', (e) => { e.preventDefault(); workbench.style.background='#444'; });
                    workbench.addEventListener('drop', (e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files.length) {
                            document.getElementById('ocr-file-input').files = e.dataTransfer.files;
                            handleOCRFile(document.getElementById('ocr-file-input'));
                        }
                    });

                    document.addEventListener('contextmenu', (e) => {
                        const selection = window.getSelection().toString().trim();
                        if (selection.length > 0) {
                            e.preventDefault();
                            window.magicSelectedText = selection; 
                            showMagicMenu(e.clientX, e.clientY);
                        }
                    });

                    document.addEventListener('click', (e) => {
                        if (!e.target.closest('#ocr-context-menu')) {
                            document.getElementById('ocr-context-menu').style.display = 'none';
                        }
                        if (!e.target.closest('#magic-menu')) {
                            document.getElementById('magic-menu').style.display = 'none';
                        }
                        
                        const filterMenu = document.getElementById('filter-menu');
                        const filterBtn = document.getElementById('btn-filter');
                        if (filterMenu && filterMenu.style.display === 'block') {
                            if (!filterMenu.contains(e.target) && (!filterBtn || !filterBtn.contains(e.target))) {
                                filterMenu.style.display = 'none';
                            }
                        }
                    });
                    
                    const savedText = localStorage.getItem('billApp_ocrText');
                    const textArea = document.getElementById('ocr-result');
                    if(savedText && textArea) {
                        textArea.value = savedText;
                        window.ocrState.extractedValue = savedText; 
                        if(typeof parseSmartData === 'function') parseSmartData(savedText);
                    }
                    if(textArea) {
                        textArea.addEventListener('input', () => {
                            localStorage.setItem('billApp_ocrText', textArea.value);
                            window.ocrState.extractedValue = textArea.value;
                        });
                    }
                    
                    const btn = document.getElementById('btn-ocr-replace-mode');
                    if (window.ocrState.isReplaceMode) {
                        btn.style.backgroundColor = '#e8f5e9'; 
                        btn.style.color = '#27ae60';
                        btn.innerHTML = '<span class="material-icons">find_replace</span> Replace: ON';
                    } else {
                        btn.innerHTML = '<span class="material-icons">playlist_add</span> Replace: OFF';
                    }

                    // Nested Flip Logic
                    const magicItems = document.querySelectorAll('.magic-item');
                    magicItems.forEach(item => {
                        item.addEventListener('mouseenter', function() {
                            const subMenu = this.querySelector('.magic-sub-menu');
                            if (subMenu) {
                                const rect = this.getBoundingClientRect();
                                const winWidth = window.innerWidth;
                                const winHeight = window.innerHeight;
                                const subMenuWidth = 160; 
                                const subMenuHeight = subMenu.scrollHeight || 300; 

                                const parentMenu = this.closest('.magic-sub-menu');
                                const isParentFlippedLeft = parentMenu && parentMenu.classList.contains('flip-left');
                                let shouldFlipLeft = isParentFlippedLeft || (rect.right + subMenuWidth > winWidth);
                                
                                if (shouldFlipLeft && (rect.left - subMenuWidth < 0)) {
                                    shouldFlipLeft = false;
                                }

                                if (shouldFlipLeft) {
                                    subMenu.classList.add('flip-left');
                                } else {
                                    subMenu.classList.remove('flip-left');
                                }

                                if (rect.top + subMenuHeight > winHeight) {
                                    subMenu.classList.add('flip-up');
                                } else {
                                    subMenu.classList.remove('flip-up');
                                }
                            }
                        });
                    });
                });
                
                function showNotification(msg) { console.log(msg); }
            <\/script>
        </body>
        </html>
    `);

    newWin.document.close();
    newWin.focus();
    closeOCRModal();
}



/* ==========================================
   BUSINESS DASHBOARD LOGIC
   ========================================== */

let dashboardChartInstance = null;
let currentChartMode = 'sales'; // 'sales' or 'profit'

function openBusinessDashboard() {
    toggleSettingsSidebar(); // Close sidebar
    document.getElementById('dashboard-overlay').style.display = 'flex';
    refreshDashboard(); // Load data
}

function closeBusinessDashboard() {
    document.getElementById('dashboard-overlay').style.display = 'none';
}

function toggleChartType(mode) {
    currentChartMode = mode;
    // Update button states
    const buttons = document.querySelectorAll('.chart-btn');
    buttons.forEach(btn => {
        if (btn.textContent.toLowerCase() === mode) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    refreshDashboard();
}

async function refreshDashboard() {
    const days = parseInt(document.getElementById('dashboard-filter').value) || 30;
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);

    // 1. Fetch All Data
    const [salesBills, gstBills, purchaseBills, payments, stockItems] = await Promise.all([
        getAllFromDB('savedBills'),
        getAllFromDB('gstSavedBills'),
        getAllFromDB('vendorSavedBills'),
        getAllFromDB('customerPayments'),
        getAllFromDB('savedItems')
    ]);

    // 2. Filter by Date Range
    const filterDate = (itemDate) => {
        if (!itemDate) return false;
        // Parse dd-mm-yyyy or yyyy-mm-dd
        let d;
        if (itemDate.includes('-')) {
            const parts = itemDate.split('-');
            if (parts[0].length === 4) d = new Date(itemDate); // yyyy-mm-dd
            else d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // dd-mm-yyyy
        } else return false;
        return d >= startDate && d <= today;
    };

    // 3. Process Sales (Regular + GST)
    let totalSales = 0;
    let totalCost = 0; // For profit calc
    const dailySales = {};
    const dailyProfit = {};

    const processBill = (bill) => {
        const val = bill.value;
        const dateStr = val.date || val.invoiceDetails?.date;

        if (filterDate(dateStr)) {
            const amount = parseFloat(val.totalAmount || val.totals?.grandTotal || 0);
            totalSales += amount;

            // Group by Date for Chart
            if (!dailySales[dateStr]) dailySales[dateStr] = 0;
            dailySales[dateStr] += amount;

            // Estimate Cost (Profit Calc)
            let billCost = 0;
            const items = val.items || val.tableStructure || [];
            items.forEach(item => {
                // If we have item details, look up purchase rate
                if (item.type === 'item') {
                    // Try to find purchase rate in saved items or use a stored 'purchaseRate' if we saved it in bill
                    // Simple approximation: assuming 20% margin if cost unknown
                    const rate = parseFloat(item.rate);
                    const qty = parseFloat(item.quantity);
                    billCost += (rate * qty) * 0.8; // Fallback estimate
                }
            });
            totalCost += billCost;

            if (!dailyProfit[dateStr]) dailyProfit[dateStr] = 0;
            dailyProfit[dateStr] += (amount - billCost);
        }
    };

    salesBills.forEach(processBill);
    gstBills.forEach(processBill);

    // 4. Process Purchases (Expenses)
    let totalExpenses = 0;
    purchaseBills.forEach(bill => {
        const val = bill.value;
        if (filterDate(val.billDetails.date)) {
            totalExpenses += parseFloat(val.totalAmount || 0);
        }
    });

    // 5. Process Outstanding (Simplified: Total Sales - Total Payments)
    let totalPayments = 0;
    payments.forEach(p => totalPayments += parseFloat(p.value.amount || 0));
    // Note: Outstanding is cumulative (all time), not just selected period, usually. 
    // But for this view, let's keep it simple or calculate global outstanding.
    // Let's calculate GLOBAL outstanding for the card:
    let globalSales = 0;
    [...salesBills, ...gstBills].forEach(b => {
        globalSales += parseFloat(b.value.totalAmount || b.value.totals?.grandTotal || 0);
    });
    const outstanding = Math.max(0, globalSales - totalPayments);

    // 6. Update UI Cards
    document.getElementById('kpi-total-sales').textContent = `₹${totalSales.toLocaleString('en-IN')}`;
    document.getElementById('kpi-expenses').textContent = `₹${totalExpenses.toLocaleString('en-IN')}`;
    document.getElementById('kpi-outstanding').textContent = `₹${outstanding.toLocaleString('en-IN')}`;

    const profit = totalSales - totalCost; // Simplified profit
    document.getElementById('kpi-profit').textContent = `₹${profit.toLocaleString('en-IN')}`;
    const margin = totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : 0;
    document.getElementById('trend-profit').textContent = `Margin: ${margin}%`;

    // 7. Render Chart
    renderChart(dailySales, dailyProfit);

    // 8. Render Lists
    renderLowStockList(stockItems);
    renderRecentActivity(salesBills, gstBills, purchaseBills);
}

function renderChart(salesData, profitData) {
    const ctx = document.getElementById('mainBusinessChart').getContext('2d');

    // Sort dates
    const labels = Object.keys(salesData).sort((a, b) => {
        const da = new Date(a.split('-').reverse().join('-'));
        const db = new Date(b.split('-').reverse().join('-'));
        return da - db;
    });

    const dataPoints = labels.map(date => currentChartMode === 'sales' ? salesData[date] : profitData[date]);

    if (dashboardChartInstance) dashboardChartInstance.destroy();

    const color = currentChartMode === 'sales' ? '#3498db' : '#2ecc71';
    const bg = currentChartMode === 'sales' ? 'rgba(52, 152, 219, 0.1)' : 'rgba(46, 204, 113, 0.1)';

    dashboardChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: currentChartMode === 'sales' ? 'Daily Sales (₹)' : 'Daily Profit (₹)',
                data: dataPoints,
                borderColor: color,
                backgroundColor: bg,
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderLowStockList(items) {
    const list = document.getElementById('dash-low-stock-list');
    list.innerHTML = '';

    // Filter items where stock <= minStock
    const lowStock = items.filter(i => {
        const stock = parseFloat(i.value.stockQuantity || 0);
        const min = parseFloat(i.value.minStock || 0);
        return stock <= min && min > 0;
    });

    if (lowStock.length === 0) {
        list.innerHTML = '<div style="padding:10px; color:#999; text-align:center;">All items well stocked</div>';
        return;
    }

    lowStock.forEach(i => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div>
                <strong>${i.value.name}</strong><br>
                <small style="color:#777">Min: ${i.value.minStock}</small>
            </div>
            <span class="stock-badge">${i.value.stockQuantity} Left</span>
        `;
        list.appendChild(div);
    });
}

function renderRecentActivity(sales, gst, purchases) {
    const list = document.getElementById('dash-recent-list');
    list.innerHTML = '';

    // Combine and Sort
    const allTxn = [
        ...sales.map(s => ({ ...s.value, type: 'sale', dateStr: s.value.date })),
        ...gst.map(g => ({ ...g.value, type: 'sale', dateStr: g.value.invoiceDetails?.date })),
        ...purchases.map(p => ({ ...p.value, type: 'purchase', dateStr: p.value.billDetails?.date }))
    ];

    // Helper to parse date for sorting
    const parseD = (d) => {
        if (!d) return 0;
        const parts = d.split('-');
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    };

    allTxn.sort((a, b) => parseD(b.dateStr) - parseD(a.dateStr));

    // Take top 10
    allTxn.slice(0, 10).forEach(t => {
        const isSale = t.type === 'sale';
        const name = isSale ? (t.customer?.name || t.customer?.billTo?.name) : t.vendor?.name;
        const amount = t.totalAmount || t.totals?.grandTotal;

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div>
                <strong>${name}</strong><br>
                <small style="color:#999">${t.dateStr}</small>
            </div>
            <span class="txn-amount ${isSale ? 'in' : 'out'}">
                ${isSale ? '+' : '-'}₹${parseFloat(amount).toLocaleString('en-IN')}
            </span>
        `;
        list.appendChild(div);
    });
}

/* ==========================================================================
   EXPENSE MANAGEMENT MODULE
   ========================================================================== */
const defaultExpenseCategories = [
    'Rent', 'Electricity', 'Salary', 'Transport', 'Food',
    'Marketing', 'Maintenance', 'Office Supplies', 'Other'
];

let expenseState = {
    expenses: [],
    currentFilter: {
        search: '',
        category: 'all',
        mode: 'all',
        startDate: '',
        endDate: '',
        sort: 'date-desc'
    },
    editingId: null,
    currentImage: null
};

// --- MODAL CONTROL ---

// [ADD THIS NEW FUNCTION]
/* --- UPDATED: Load Categories (Fixes Duplicates) --- */
async function loadExpenseCategories(selectedPayload = null) {
    const select = document.getElementById('exp-category');

    // [FIX] Clear existing options first to prevent duplicates
    select.innerHTML = '<option value="">Select Category</option>';

    try {
        let customCats = await getFromDB('settings', 'expenseCategories');
        if (!customCats) customCats = [];

        const allCats = [...new Set([...defaultExpenseCategories, ...customCats])];
        allCats.sort();

        allCats.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });

        if (selectedPayload) {
            select.value = selectedPayload;
        }

    } catch (e) {
        console.error("Error loading categories", e);
        defaultExpenseCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });
    }
}

// [ADD THIS NEW FUNCTION]
function addNewExpenseCategory() {
    const modal = document.getElementById('add-category-modal');
    const input = document.getElementById('new-category-name');

    // Reset input
    input.value = '';

    // Show modal
    modal.style.display = 'block';

    // Auto-focus input
    setTimeout(() => {
        input.focus();
    }, 100);
}
function closeAddCategoryModal() {
    document.getElementById('add-category-modal').style.display = 'none';
}

function openExpenseModal() {
    toggleSettingsSidebar();
    document.getElementById('expense-management-modal').style.display = 'block';

    // Set default date range (First to Last day of current month)
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // [FIX] Use helper to ensure inputs accept the value
    document.getElementById('exp-date-from').value = formatDateForInput(firstDay);
    document.getElementById('exp-date-to').value = formatDateForInput(lastDay);

    loadExpenses();
}


function closeExpenseModal() {
    document.getElementById('expense-management-modal').style.display = 'none';
}

function formatDateForInput(dateSource) {
    if (!dateSource) return '';
    const d = new Date(dateSource);
    if (isNaN(d.getTime())) return ''; // Invalid date
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
}

/* --- UPDATED: Add Modal (Fixes Today's Date) --- */
function openAddExpenseModal() {
    expenseState.editingId = null;
    expenseState.currentImage = null;

    document.getElementById('expense-modal-title').textContent = 'Add New Expense';
    document.getElementById('btn-save-expense').textContent = 'Save Expense';

    document.getElementById('exp-title').value = '';
    document.getElementById('exp-amount').value = '';

    // [FIX] Set Today's date correctly
    document.getElementById('exp-date').value = formatDateForInput(new Date());

    loadExpenseCategories();

    document.getElementById('exp-payment-mode').value = 'Cash';
    document.getElementById('exp-reference').value = '';
    document.getElementById('exp-notes').value = '';
    document.getElementById('exp-image').value = '';

    document.getElementById('exp-image-preview').innerHTML = '';
    document.getElementById('exp-image-preview').style.display = 'none';
    document.getElementById('btn-remove-exp-img').style.display = 'none';

    document.getElementById('add-expense-modal').style.display = 'block';
}

function closeAddExpenseModal() {
    document.getElementById('add-expense-modal').style.display = 'none';
}

async function saveNewCategory() {
    const input = document.getElementById('new-category-name');
    const categoryName = input.value.trim();

    if (!categoryName) {
        showNotification("Please enter a category name", "error");
        input.focus();
        return;
    }

    try {
        // Fetch existing custom categories
        let customCats = await getFromDB('settings', 'expenseCategories');
        if (!customCats) customCats = [];

        // Check duplicates (case insensitive)
        const exists = [...defaultExpenseCategories, ...customCats].some(
            c => c.toLowerCase() === categoryName.toLowerCase()
        );

        if (exists) {
            showNotification("Category already exists!", "warning");

            // Select it in the dropdown anyway
            const select = document.getElementById('exp-category');
            if (select) select.value = categoryName;

            closeAddCategoryModal();
            return;
        }

        // Save to DB
        customCats.push(categoryName);
        await setInDB('settings', 'expenseCategories', customCats);

        // Reload Dropdown & Select New Value
        await loadExpenseCategories(categoryName);

        showNotification(`Category "${categoryName}" added!`, "success");
        closeAddCategoryModal();

    } catch (e) {
        console.error("Error adding category", e);
        showNotification("Failed to save category", "error");
    }
}

function handleCategoryEnter(event) {
    if (event.key === 'Enter') {
        saveNewCategory();
    }
}

// --- IMAGE HANDLING ---

function handleExpenseImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];

        // Size Check (Max 3MB)
        if (file.size > 3 * 1024 * 1024) {
            showNotification('Image too large (Max 3MB)', 'error');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            expenseState.currentImage = e.target.result; // Base64

            // Show Preview
            const previewBox = document.getElementById('exp-image-preview');
            previewBox.style.display = 'flex';
            previewBox.innerHTML = `<img src="${e.target.result}" style="max-height:100px;">`;
            document.getElementById('btn-remove-exp-img').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }
}

function removeExpenseImage() {
    expenseState.currentImage = null;
    document.getElementById('exp-image').value = '';
    document.getElementById('exp-image-preview').innerHTML = '';
    document.getElementById('exp-image-preview').style.display = 'none';
    document.getElementById('btn-remove-exp-img').style.display = 'none';
}

// --- CRUD OPERATIONS ---

async function saveExpense() {
    const title = document.getElementById('exp-title').value.trim();
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const date = document.getElementById('exp-date').value;
    const category = document.getElementById('exp-category').value;
    const mode = document.getElementById('exp-payment-mode').value;
    const ref = document.getElementById('exp-reference').value.trim();
    const notes = document.getElementById('exp-notes').value.trim();

    // Validation
    if (!title || isNaN(amount) || amount <= 0 || !date || !category || !mode) {
        showNotification('Please fill all required fields correctly', 'error');
        return;
    }

    const expenseObj = {
        id: expenseState.editingId || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: title,
        amount: amount,
        category: category,
        paymentMode: mode,
        date: date,
        reference: ref,
        notes: notes,
        billImage: expenseState.currentImage,
        createdAt: Date.now()
    };

    try {
        await setInDB('expenses', expenseObj.id, expenseObj);
        showNotification(expenseState.editingId ? 'Expense Updated' : 'Expense Added', 'success');
        closeAddExpenseModal();
        loadExpenses(); // Refresh List
    } catch (e) {
        console.error("Save Expense Error:", e);
        showNotification('Failed to save expense', 'error');
    }
}

async function loadExpenses() {
    try {
        const allExpenses = await getAllFromDB('expenses');
        expenseState.expenses = allExpenses.map(e => e.value);
        filterExpenses(); // This triggers rendering
    } catch (e) {
        console.error("Load Expenses Error:", e);
    }
}

async function deleteExpense(id) {
    if (await showConfirm("Are you sure you want to delete this expense?")) {
        try {
            await removeFromDB('expenses', id);
            showNotification('Expense Deleted', 'success');
            loadExpenses();
        } catch (e) {
            showNotification('Deletion Failed', 'error');
        }
    }
}

/* --- UPDATED: Edit Modal (Fixes Date Loading) --- */
async function editExpense(id) {
    const exp = expenseState.expenses.find(e => e.id === id);
    if (!exp) return;

    openAddExpenseModal();

    expenseState.editingId = id;

    document.getElementById('expense-modal-title').textContent = 'Edit Expense';
    document.getElementById('btn-save-expense').textContent = 'Update Expense';

    document.getElementById('exp-title').value = exp.title;
    document.getElementById('exp-amount').value = exp.amount;

    // [FIX] Convert saved date string to Input format
    document.getElementById('exp-date').value = formatDateForInput(exp.date);

    await loadExpenseCategories(exp.category);

    document.getElementById('exp-payment-mode').value = exp.paymentMode;
    document.getElementById('exp-reference').value = exp.reference || '';
    document.getElementById('exp-notes').value = exp.notes || '';

    if (exp.billImage) {
        expenseState.currentImage = exp.billImage;
        const previewBox = document.getElementById('exp-image-preview');
        previewBox.style.display = 'flex';
        previewBox.innerHTML = `<img src="${exp.billImage}" style="max-height:100px;">`;
        document.getElementById('btn-remove-exp-img').style.display = 'inline-block';
    }
}

// --- FILTERING & RENDERING ---

function filterExpenses() {
    // 1. Get Filter Values
    const search = document.getElementById('exp-search').value.toLowerCase();
    const cat = document.getElementById('exp-filter-category').value;
    const mode = document.getElementById('exp-filter-mode').value;
    const fromDate = document.getElementById('exp-date-from').value;
    const toDate = document.getElementById('exp-date-to').value;
    const sortVal = document.getElementById('exp-sort').value;

    // 2. Filter Array
    let filtered = expenseState.expenses.filter(e => {
        // Search (Title, Ref, Notes)
        const matchSearch = e.title.toLowerCase().includes(search) ||
            (e.reference && e.reference.toLowerCase().includes(search)) ||
            (e.notes && e.notes.toLowerCase().includes(search));

        // Category
        const matchCat = cat === 'all' || e.category === cat;

        // Mode
        const matchMode = mode === 'all' || e.paymentMode === mode;

        // Date Range
        let matchDate = true;
        if (fromDate && toDate) {
            matchDate = e.date >= fromDate && e.date <= toDate;
        }

        return matchSearch && matchCat && matchMode && matchDate;
    });

    // 3. Sort Array
    filtered.sort((a, b) => {
        if (sortVal === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sortVal === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (sortVal === 'amount-desc') return b.amount - a.amount;
        if (sortVal === 'amount-asc') return a.amount - b.amount;
        return 0;
    });

    // 4. Render
    renderExpenseTable(filtered);
    renderExpenseAnalytics(filtered);
}

function renderExpenseTable(data) {
    const tbody = document.getElementById('expense-list-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No expenses found</td></tr>';
        return;
    }

    data.forEach(exp => {
        const tr = document.createElement('tr');

        // Format Date (DD-MM-YYYY)
        const dateObj = new Date(exp.date);
        const displayDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;

        // View Bill Button if image exists
        let imgBtn = '';
        if (exp.billImage) {
            imgBtn = `<button class="action-btn" onclick="viewExpenseImage('${exp.id}')" title="View Bill"><span class="material-icons" style="font-size:16px; color:#3498db;">receipt</span></button>`;
        }

        tr.innerHTML = `
            <td>${displayDate}</td>
            <td>
                <div style="font-weight:600;">${exp.title}</div>
                ${exp.reference ? `<div style="font-size:0.85em; color:#666;">Ref: ${exp.reference}</div>` : ''}
            </td>
            <td><span class="stock-badge" style="background:#f0f0f0; color:#333;">${exp.category}</span></td>
            <td>${exp.paymentMode}</td>
            <td style="font-weight:bold; color:#e74c3c;">₹${exp.amount.toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    ${imgBtn}
                    <button class="action-btn" onclick="editExpense('${exp.id}')" title="Edit"><span class="material-icons" style="font-size:16px;">edit</span></button>
                    <button class="action-btn remove-btn" onclick="deleteExpense('${exp.id}')" title="Delete"><span class="material-icons" style="font-size:16px;">delete</span></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function viewExpenseImage(id) {
    const exp = expenseState.expenses.find(e => e.id === id);
    if (exp && exp.billImage) {
        // Reuse existing file viewer modal logic
        const modal = document.getElementById('file-viewer-modal');
        const img = document.getElementById('file-viewer-img');
        const iframe = document.getElementById('file-viewer-pdf');

        modal.style.display = 'flex';
        img.style.display = 'block';
        iframe.style.display = 'none';

        img.src = exp.billImage;
        initImageZoom(); // Reuse zoom logic
    }
}

// --- ANALYTICS ---

function renderExpenseAnalytics(data) {
    // 1. Calculate Summary Cards
    const totalAmount = data.reduce((sum, e) => sum + e.amount, 0);

    // Today's Expense
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAmount = data.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0);

    // Last Expense
    const lastExp = data.length > 0 ? data[0] : null; // Data is already sorted if desc

    // Category Breakdown
    const catMap = {};
    data.forEach(e => {
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });

    // Find Top Category
    let topCat = '-';
    let topCatAmount = 0;
    Object.entries(catMap).forEach(([cat, amt]) => {
        if (amt > topCatAmount) {
            topCatAmount = amt;
            topCat = cat;
        }
    });

    // Update Cards
    document.getElementById('exp-summary-total').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
    document.getElementById('exp-summary-today').textContent = `₹${todayAmount.toLocaleString('en-IN')}`;
    document.getElementById('exp-summary-category').textContent = topCat;
    document.getElementById('exp-summary-last').textContent = lastExp ? `₹${lastExp.amount}` : '-';

    // 2. Render Bar Chart
    const chartContainer = document.getElementById('expense-chart-container');
    chartContainer.innerHTML = '';

    // Sort categories by amount desc
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    sortedCats.forEach(([cat, amt]) => {
        const percent = totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : 0;

        // Define color based on category (Simple hash or fixed list)
        const colors = {
            'Rent': '#e74c3c', 'Electricity': '#f1c40f', 'Salary': '#2ecc71',
            'Food': '#3498db', 'Transport': '#9b59b6', 'Other': '#95a5a6'
        };
        const color = colors[cat] || '#34495e';

        const barHtml = `
            <div class="chart-bar-row">
                <div class="chart-bar-label">
                    <span>${cat}</span>
                    <span>₹${amt.toLocaleString('en-IN')} (${percent}%)</span>
                </div>
                <div class="chart-bar-bg">
                    <div class="chart-bar-fill" style="width: ${percent}%; background-color: ${color};"></div>
                </div>
            </div>
        `;
        chartContainer.innerHTML += barHtml;
    });
}

function exportExpensesPDF() {
    const element = document.querySelector('.expense-main-panel'); // Export the table view
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `Expense_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Temporarily adjust styling for print
    const originalOverflow = element.querySelector('.expense-table-wrapper').style.overflow;
    element.querySelector('.expense-table-wrapper').style.overflow = 'visible';

    html2pdf().set(opt).from(element).save().then(() => {
        // Revert style
        element.querySelector('.expense-table-wrapper').style.overflow = originalOverflow;
    });
}


// ==========================================
// NEW SIDEBAR LOGIC
// ==========================================

function toggleSettingsSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('settings-overlay');

    // Check if currently open
    const isOpen = sidebar.classList.contains('open');

    if (isOpen) {
        // Close
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        closeSubMenu(); // Reset sub-menus
    } else {
        // Open
        sidebar.classList.add('open');
        overlay.classList.add('open');
    }
}

function toggleSubMenu(categoryId, btnElement) {
    const submenuContainer = document.getElementById('sidebar-submenus');
    const allGroups = document.querySelectorAll('.sub-menu-group');
    const allBtns = document.querySelectorAll('.sidebar-cat-btn');

    // 1. Reset all buttons
    allBtns.forEach(b => b.classList.remove('active'));

    // 2. Identify target group
    const targetGroup = document.getElementById('sub-' + categoryId);

    // 3. Logic: If clicking active category -> Close. If new -> Open.
    const isAlreadyOpen = submenuContainer.classList.contains('open') && targetGroup.classList.contains('active');

    if (isAlreadyOpen) {
        closeSubMenu();
    } else {
        // Open Submenu
        submenuContainer.classList.add('open');

        // Hide all groups
        allGroups.forEach(g => g.classList.remove('active'));

        // Show target group
        if (targetGroup) targetGroup.classList.add('active');

        // Highlight button
        if (btnElement) btnElement.classList.add('active');
    }
}

function closeSubMenu() {
    const submenuContainer = document.getElementById('sidebar-submenus');
    const allBtns = document.querySelectorAll('.sidebar-cat-btn');

    submenuContainer.classList.remove('open');
    allBtns.forEach(b => b.classList.remove('active'));
}

// Close sidebar when clicking overlay
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
        overlay.onclick = toggleSettingsSidebar;
    }
});

/* ==========================================
   PERSONALIZATION MODULE (Windows 11 Style)
   ========================================== */

const defaultPznState = {
    mode: 'solid',
    color: '#f9f9f9', // Default App Background Color
    image: null,
    fit: 'cover',
    brightness: 100,
    contrast: 100,
    blur: 0
};

let pznState = { ...defaultPznState };

const winColors = [
    '#f9f9f9', '#ffffff', '#e8f4fd', '#eafaf1', '#fdedec',
    '#fef5e7', '#f5eef8', '#e0f7fa', '#333333', '#000000'
];

document.addEventListener('DOMContentLoaded', async () => {
    // ... existing init calls ...
    await loadPersonalizationState();
    initPznColorGrid();
});

// Initialize Color Dots in Modal
function initPznColorGrid() {
    const grid = document.getElementById('pzn-colorGrid');
    if (!grid) return;

    // Clear existing dots (except custom picker)
    const custom = grid.querySelector('.custom-color-wrapper');
    grid.innerHTML = '';
    if (custom) grid.appendChild(custom);

    winColors.forEach(c => {
        const dot = document.createElement('div');
        dot.className = 'color-dot';
        dot.style.backgroundColor = c;
        dot.title = c;
        dot.onclick = () => handlePznColorSelect(c, dot);
        grid.insertBefore(dot, custom);
    });
}

function openPersonalizeModal() {
    toggleSettingsSidebar(); // Close sidebar
    document.getElementById('personalize-modal').style.display = 'block';

    // Sync UI Inputs with current state
    document.getElementById('pzn-bgTypeSelect').value = pznState.mode;
    document.getElementById('pzn-fitSelect').value = pznState.fit;
    document.getElementById('pzn-customColorPicker').value = pznState.color;

    document.getElementById('pzn-brightnessSlider').value = pznState.brightness;
    document.getElementById('pzn-contrastSlider').value = pznState.contrast;
    document.getElementById('pzn-blurSlider').value = pznState.blur;

    handlePznTypeChange(); // Show/Hide correct sections based on mode
    updatePznPreview();    // Render preview
}

function closePersonalizeModal() {
    document.getElementById('personalize-modal').style.display = 'none';
}

function handlePznTypeChange() {
    const mode = document.getElementById('pzn-bgTypeSelect').value;
    pznState.mode = mode;

    const picOpts = document.getElementById('pzn-pictureOptions');
    const fitOpts = document.getElementById('pzn-fitOptions');
    const solidOpts = document.getElementById('pzn-solidOptions');

    if (mode === 'picture') {
        picOpts.classList.remove('hidden');
        fitOpts.classList.remove('hidden');
        solidOpts.classList.add('hidden');
    } else {
        picOpts.classList.add('hidden');
        fitOpts.classList.add('hidden');
        solidOpts.classList.remove('hidden');
    }
    updatePznPreview();
}

function handlePznColorSelect(color, dotElement) {
    pznState.color = color;
    pznState.mode = 'solid'; // Force mode if clicking color
    document.getElementById('pzn-bgTypeSelect').value = 'solid';
    handlePznTypeChange();

    // Update active class visual
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    if (dotElement) dotElement.classList.add('active');

    document.getElementById('pzn-customColorPicker').value = color;
    updatePznPreview();
}

function handlePznColorInput(input) {
    pznState.color = input.value;
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    updatePznPreview();
}

function handlePznImageUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            pznState.image = e.target.result;
            // Switch mode to picture automatically
            pznState.mode = 'picture';
            document.getElementById('pzn-bgTypeSelect').value = 'picture';
            handlePznTypeChange();
            updatePznPreview();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function updatePznPreview() {
    // Get current values from inputs
    const fit = document.getElementById('pzn-fitSelect').value;
    const b = document.getElementById('pzn-brightnessSlider').value;
    const c = document.getElementById('pzn-contrastSlider').value;
    const blur = document.getElementById('pzn-blurSlider').value;

    // Update State object
    pznState.fit = fit;
    pznState.brightness = b;
    pznState.contrast = c;
    pznState.blur = blur;

    // Update Slider Label Text
    document.getElementById('pzn-brightnessVal').textContent = b + '%';
    document.getElementById('pzn-contrastVal').textContent = c + '%';
    document.getElementById('pzn-blurVal').textContent = blur + 'px';

    // Apply to Preview Box
    const target = document.getElementById('pzn-previewScreen');
    applyStylesToTarget(target);
}

function applyStylesToTarget(target) {
    if (!target) return;

    let css = '';

    if (pznState.mode === 'picture' && pznState.image) {
        css += `background-image: url('${pznState.image}'); background-color: #333; `;

        switch (pznState.fit) {
            case 'cover': css += `background-size: cover; background-position: center; background-repeat: no-repeat;`; break;
            case 'contain': css += `background-size: contain; background-position: center; background-repeat: no-repeat;`; break;
            case '100% 100%': css += `background-size: 100% 100%; background-position: center; background-repeat: no-repeat;`; break;
            case 'repeat': css += `background-size: auto; background-position: top left; background-repeat: repeat;`; break;
            case 'auto': css += `background-size: auto; background-position: center; background-repeat: no-repeat;`; break;
        }
    } else {
        // Solid Color Mode
        css += `background-image: none; background-color: ${pznState.color};`;
    }

    // Apply Filters
    css += `filter: brightness(${pznState.brightness}%) contrast(${pznState.contrast}%) blur(${pznState.blur}px);`;

    // Scale correction for blur edges
    if (pznState.mode === 'picture' && pznState.fit === 'cover' && pznState.blur > 0) {
        css += `transform: scale(1.02);`;
    } else {
        css += `transform: scale(1);`;
    }

    target.style.cssText = css;
}

function saveAndApplyPersonalization() {
    // 1. Apply to the dedicated background layer
    const bgLayer = document.getElementById('app-background');
    if (bgLayer) {
        applyStylesToTarget(bgLayer);
    }

    // 2. Persist to Database
    setInDB('settings', 'personalization', pznState)
        .then(() => showNotification('Personalization saved!', 'success'))
        .catch(e => console.error("Save error", e));

    closePersonalizeModal();
}

function resetPersonalization() {
    // Revert to defaults
    pznState = { ...defaultPznState };

    // Update Inputs
    document.getElementById('pzn-bgTypeSelect').value = 'solid';
    document.getElementById('pzn-customColorPicker').value = defaultPznState.color;
    document.getElementById('pzn-brightnessSlider').value = 100;
    document.getElementById('pzn-contrastSlider').value = 100;
    document.getElementById('pzn-blurSlider').value = 0;

    // Reset Active Color Dots
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));

    handlePznTypeChange();
    updatePznPreview();
}

async function loadPersonalizationState() {
    // 1. Apply Defaults IMMEDIATELY (Visual feedback)
    const bgLayer = document.getElementById('app-background');
    if (bgLayer) {
        applyStylesToTarget(bgLayer);
    }

    try {
        // 2. Load Saved Settings (Overwrite defaults if found)
        const saved = await getFromDB('settings', 'personalization');
        if (saved) {
            pznState = { ...defaultPznState, ...saved };
            // Re-apply with saved settings
            if (bgLayer) {
                applyStylesToTarget(bgLayer);
            }
        }
    } catch (e) {
        console.error("Error loading personalization", e);
    }
}



/* ==========================================
   REGULAR BILL SYSTEM (Separate Modal)
   ========================================== */

let regBillConfig = {
    type: 'Estimate',
    prefix: 'EST',
    isLocked: true,
    viewMode: 'simple' // simple, bill_to, both
};

// Custom Types Storage
let regCustomTypes = JSON.parse(localStorage.getItem('regCustomTypes')) || [];

// 1. Open/Close Logic
function openRegularBillModal() {
    // 1. Close Sidebar Logic
    if (typeof toggleSettingsSidebar === 'function') {
        toggleSettingsSidebar();
    }

    if (typeof closeSubMenu === 'function') {
        closeSubMenu();
    }

    // 2. Open Modal Logic
    document.getElementById('regular-details-modal').style.display = 'block';

    // Initialize Defaults if needed
    if (!document.getElementById('reg-modal-date').value) {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        document.getElementById('reg-modal-date').value = `${day}-${month}-${year}`;
    }

    initRegBillTypes(); // Load types
    // Pass TRUE to prevent overwriting existing data when just opening the modal
    handleRegTypeChange(true);
}

function closeRegularModal() {
    document.getElementById('regular-details-modal').style.display = 'none';
}


/* ==========================================
   INITIALIZE BILL TYPES (Fix Duplicates & Default)
   ========================================== */
/* ==========================================
   INITIALIZE BILL TYPES (Strict Sort Order)
   ========================================== */
function initRegBillTypes() {
    const select = document.getElementById('reg-modal-type-select');
    if (!select) return;

    // 1. Preserve currently selected value
    let currentVal = select.value;

    // Force Invoice as default if the browser sees "Estimate" (HTML default)
    if (currentVal === 'Estimate') {
        currentVal = 'Invoice';
    }

    // 2. Clear existing options
    select.innerHTML = '';

    // 3. Define Strict Default Order
    const defaults = ['Invoice', 'Estimate', 'Quotation', 'Purchase Order', 'Work Order'];

    // 4. Get Custom Types
    const customTypes = JSON.parse(localStorage.getItem('customRegTypes') || '[]');

    // 5. Add Defaults (Strict Order)
    // We filter out any defaults that might be overridden in customTypes (though usually we just edit prefix)
    // But per your request, we want defaults first.
    defaults.forEach(defName => {
        // Check if this default name exists in custom types (in case user "edited" a default)
        // If user edited "Estimate", we still want it to appear in the "Estimate" slot, 
        // but we might want to use the custom label. 
        // For simplicity and strict order, we just list the names here.
        const opt = document.createElement('option');
        opt.value = defName;
        opt.textContent = defName;
        select.appendChild(opt);
    });

    // 6. Add Custom Types (Only those that are NOT in the defaults list)
    // This ensures "My Custom Bill" appears AFTER "Work Order"
    const purelyCustomTypes = customTypes.filter(ct => !defaults.includes(ct.name));

    purelyCustomTypes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.name;
        opt.textContent = t.name;
        select.appendChild(opt);
    });

    // 7. Add "Custom..." Placeholder at the very end
    const customOpt = document.createElement('option');
    customOpt.value = 'Custom';
    customOpt.textContent = 'Custom...';
    select.appendChild(customOpt);

    // 8. Restore Selection
    // We check if the currentVal exists in our new list.
    const options = Array.from(select.options);
    const exists = options.some(o => o.value === currentVal);

    if (exists) {
        select.value = currentVal;
    } else {
        // Fallback to first option (Invoice)
        if (select.options.length > 0) select.selectedIndex = 0;
    }

    // 9. Update UI (Hide/Show 3-dots)
    handleRegTypeChange(true);
}

function toggleRegTypeMenu() {
    const menu = document.getElementById('reg-type-menu');
    if (menu) menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}

function updateBillLabels(text) {
    // 1. Modal Label
    const lblModal = document.getElementById('lbl-reg-invoice-no');
    if (lblModal) lblModal.textContent = text;

    // 2. Simple View Label
    const lblSimple = document.getElementById('lbl-simple-bill-no');
    if (lblSimple) lblSimple.textContent = text;

    // 3. Advanced View Label
    const lblAdv = document.getElementById('lbl-adv-invoice-no');
    if (lblAdv) lblAdv.textContent = text;
}

/* Update this function to LOAD saved prefixes correctly */
async function handleRegTypeChange(preventSync = false) {
    const select = document.getElementById('reg-modal-type-select');
    const type = select.value;
    const prefixInput = document.getElementById('reg-modal-prefix');
    const customPanel = document.getElementById('reg-custom-type-panel');
    const saveBtn = document.getElementById('reg-save-custom-btn');
    const menu = document.getElementById('reg-type-menu');
    const menuBtn = document.getElementById('reg-type-menu-btn'); // Get the button

    if (menu) menu.style.display = 'none';

    let labelText = "Invoice No";

    // --- LOGIC: Hide Menu Button if "Invoice" ---
    if (menuBtn) {
        menuBtn.style.display = (type === 'Invoice') ? 'none' : 'block';
    }

    // 1. Determine Prefix & Label
    if (type === 'Custom') {
        prefixInput.value = '';
        prefixInput.disabled = false;
        customPanel.style.display = 'block';
        saveBtn.style.display = 'block';
    } else {
        customPanel.style.display = 'none';
        saveBtn.style.display = 'none';

        const customTypes = JSON.parse(localStorage.getItem('customRegTypes') || '[]');
        const foundCustom = customTypes.find(t => t.name === type);

        if (foundCustom) {
            prefixInput.value = foundCustom.prefix;
            labelText = foundCustom.label || (type + " No");
        } else {
            const defaults = {
                'Invoice': '',  // No prefix for Invoice
                'Estimate': 'EST',
                'Quotation': 'QTN',
                'Purchase Order': 'PO',
                'Work Order': 'WO'
            };
            // Use undefined check to allow empty string as valid prefix
            prefixInput.value = (defaults[type] !== undefined) ? defaults[type] : '';

            if (type === 'Estimate') labelText = "Bill No";
            else if (type === 'Invoice') labelText = "Invoice No";
            else labelText = type + " No";
        }

        regBillConfig.prefix = prefixInput.value;
        prefixInput.disabled = true;
        updateRegLockIcon();
    }

    // 2. Update Label Text
    updateBillLabels(labelText);

    // 3. Auto-Populate Next Invoice Number (Async)
    if (type !== 'Custom' && !preventSync) {
        const currentPrefix = prefixInput.value;
        const nextNo = await getNextInvoiceNumberAsync(type, currentPrefix);
        document.getElementById('reg-modal-invoice-no').value = nextNo;

        // Sync to view immediately
        syncRegularData('modal');
    }

    // 4. Save State
    if (!preventSync && typeof saveRegularModalState === 'function') {
        saveRegularModalState();
    }
}

/* Update this function to SAVE prefix when locking */
function toggleRegPrefixLock() {
    const input = document.getElementById('reg-modal-prefix');
    const btn = document.getElementById('reg-prefix-lock-btn');
    const icon = btn.querySelector('.material-icons');

    if (input.disabled) {
        // --- UNLOCK ACTION ---
        input.disabled = false;
        icon.textContent = 'lock_open'; // Change icon to open lock
        input.focus();
    } else {
        // --- LOCK ACTION (AND SAVE) ---
        input.disabled = true;
        icon.textContent = 'lock'; // Change icon back to closed lock

        // TRIGGER SAVE
        quickSavePrefix();
    }
}

function quickSavePrefix() {
    const select = document.getElementById('reg-modal-type-select');
    const input = document.getElementById('reg-modal-prefix');

    const typeName = select.value;
    const newPrefix = input.value.trim();

    if (typeName === 'Custom') return; // Cannot quick-save "Custom..." placeholder

    // 1. Get existing custom types
    let customTypes = JSON.parse(localStorage.getItem('customRegTypes') || '[]');

    // 2. Check if this type already exists in custom storage
    const existingIndex = customTypes.findIndex(t => t.name === typeName);

    if (existingIndex >= 0) {
        // UPDATE existing custom type
        customTypes[existingIndex].prefix = newPrefix;
    } else {
        // CREATE new override for a Default Type (e.g. Estimate)
        // We need to fetch the current label to avoid losing it
        let currentLabel = document.getElementById('lbl-reg-invoice-no').textContent;

        customTypes.push({
            name: typeName,
            prefix: newPrefix,
            label: currentLabel
        });
    }

    // 3. Save to DB
    localStorage.setItem('customRegTypes', JSON.stringify(customTypes));

    // 4. Update the View immediately
    const formatted = newPrefix ? `${newPrefix}/${document.getElementById('reg-modal-invoice-no').value}` : document.getElementById('reg-modal-invoice-no').value;

    // Update labels in background
    document.getElementById('billPrefixDisplay').textContent = newPrefix ? `${newPrefix}/` : '';

    // if (typeof showNotification === 'function') showNotification('Prefix updated & saved', 'success');
}

function updateRegLockIcon() {
    const btn = document.getElementById('reg-prefix-lock-btn');
    const icon = btn.querySelector('.material-icons');
    if (regBillConfig.isLocked) {
        icon.textContent = 'lock';
        btn.classList.remove('unlocked');
    } else {
        icon.textContent = 'lock_open';
        btn.classList.add('unlocked');
    }
}

function deleteRegType() {
    const select = document.getElementById('reg-modal-type-select');
    const typeName = select.value;

    if (!confirm(`Delete custom type "${typeName}"?`)) return;

    let customTypes = JSON.parse(localStorage.getItem('customRegTypes') || '[]');
    const initialLen = customTypes.length;

    // Filter out the deleted one
    customTypes = customTypes.filter(t => t.name !== typeName);

    if (customTypes.length === initialLen) {
        alert("Cannot delete default types.");
        toggleRegTypeMenu();
        return;
    }

    localStorage.setItem('customRegTypes', JSON.stringify(customTypes));

    // Reset UI
    initRegBillTypes();
    select.value = "Estimate"; // Fallback to default
    handleRegTypeChange();
    toggleRegTypeMenu();
}

function editRegType() {
    const select = document.getElementById('reg-modal-type-select');
    const typeName = select.value;

    if (typeName === 'Custom') return;

    // 1. Try to find in Saved Custom Types
    const customTypes = JSON.parse(localStorage.getItem('customRegTypes') || '[]');
    const found = customTypes.find(t => t.name === typeName);

    // 2. Prepare Data (Use Saved, or Fallback to Default)
    let editName = typeName;
    let editPrefix = '';
    let editLabel = '';

    if (found) {
        // It's already a custom/saved type
        editPrefix = found.prefix;
        editLabel = found.label;
    } else {
        // It's a Default Type (not yet customized)
        // Get current values from the UI
        editPrefix = document.getElementById('reg-modal-prefix').value;

        // UPDATED: Force "Bill No" for Estimate, otherwise use screen text
        editLabel = (typeName === 'Estimate') ? "Bill No" : document.getElementById('lbl-reg-invoice-no').textContent;
    }

    // 3. Populate Inputs
    document.getElementById('reg-custom-name-input').value = editName;
    document.getElementById('reg-custom-prefix-input').value = editPrefix;
    document.getElementById('reg-custom-label-input').value = editLabel;

    // 4. Show Panel & Save Button
    document.getElementById('reg-custom-type-panel').style.display = 'block';
    document.getElementById('reg-save-custom-btn').style.display = 'block';

    // Hide menu
    toggleRegTypeMenu();
}

function saveRegCustomType() {
    const name = document.getElementById('reg-custom-name-input').value.trim();
    const prefix = document.getElementById('reg-custom-prefix-input').value.trim();
    const label = document.getElementById('reg-custom-label-input').value.trim();

    if (!name) {
        alert("Please enter a Type Name");
        return;
    }

    // UPDATED: Logic to force "Bill No" for Estimate if label is empty
    const finalLabel = label || (name === 'Estimate' ? "Bill No" : name + " No");

    const newType = { name, prefix, label: finalLabel };

    let customTypes = JSON.parse(localStorage.getItem('customRegTypes') || '[]');

    const existingIndex = customTypes.findIndex(t => t.name === name);
    if (existingIndex >= 0) {
        customTypes[existingIndex] = newType;
    } else {
        customTypes.push(newType);
    }

    localStorage.setItem('customRegTypes', JSON.stringify(customTypes));

    // REFRESH UI
    initRegBillTypes(); // Rebuild dropdown

    const select = document.getElementById('reg-modal-type-select');
    select.value = name; // Select the edited type

    handleRegTypeChange(); // Trigger updates

    // if (typeof showNotification === 'function') showNotification('Bill Type Saved', 'success');
}

// 3. Customer View Logic
function handleRegViewChange() {
    const view = document.getElementById('reg-modal-cust-view-select').value;
    regBillConfig.viewMode = view;

    const simpleSec = document.getElementById('reg-modal-simple-section');
    const advSec = document.getElementById('reg-modal-advanced-section');
    const shipCol = document.getElementById('reg-modal-ship-col');

    if (view === 'simple') {
        simpleSec.style.display = 'block';
        advSec.style.display = 'none';
    } else {
        simpleSec.style.display = 'none';
        advSec.style.display = 'block'; // Enable Flexbox

        if (view === 'both') {
            shipCol.style.display = 'block';
        } else {
            shipCol.style.display = 'none';
        }
    }
}

function copyRegBillToShip() {
    document.getElementById('reg-modal-ship-name').value = document.getElementById('reg-modal-bill-name').value;
    document.getElementById('reg-modal-ship-addr').value = document.getElementById('reg-modal-bill-addr').value;
    document.getElementById('reg-modal-ship-gst').value = document.getElementById('reg-modal-bill-gst').value;
    document.getElementById('reg-modal-ship-phone').value = document.getElementById('reg-modal-bill-phone').value;
    document.getElementById('reg-modal-ship-state').value = document.getElementById('reg-modal-bill-state').value;
    document.getElementById('reg-modal-ship-code').value = document.getElementById('reg-modal-bill-code').value;
}

// 4. Save & Update View Logic (MAIN FUNCTION)
/* ==========================================
   FINAL SAVE FUNCTION (With State Hiding)
   ========================================== */
/* ==========================================
   SAVE DETAILS (With Validation)
   ========================================== */
async function saveRegularBillDetails(isSilentLoad = false) {
    // 1. Get Data
    const typeEl = document.getElementById('reg-modal-type-select');

    // --- VALIDATION START ---
    // Check if user is trying to save the "Custom..." placeholder
    if (!isSilentLoad && typeEl && typeEl.value === 'Custom') {
        if (typeof showNotification === 'function') {
            showNotification('Please fill the custom fields or switch to a valid Bill Type', 'error', 3000);
        } else {
            alert('Please fill the custom fields or switch to a valid Bill Type');
        }
        return; // STOP EXECUTION
    }
    // --- VALIDATION END ---

    const prefixEl = document.getElementById('reg-modal-prefix');
    const rawNoEl = document.getElementById('reg-modal-invoice-no');
    const dateEl = document.getElementById('reg-modal-date');

    const type = typeEl ? typeEl.value : '';
    const prefix = prefixEl ? prefixEl.value : '';
    const rawNo = rawNoEl ? rawNoEl.value : '';
    const date = dateEl ? dateEl.value : '';

    // No Separator Logic
    const formattedInvoiceNo = prefix ? `${prefix}${rawNo}` : rawNo;

    // Force Label Update based on Type
    let labelText = "Invoice No";
    const defaults = {
        'Invoice': 'Invoice No',
        'Estimate': 'Bill No',
        'Quotation': 'Quotation No',
        'Purchase Order': 'Purchase Order No',
        'Work Order': 'Work Order No'
    };

    if (defaults[type]) {
        labelText = defaults[type];
    } else {
        try {
            const customTypes = JSON.parse(localStorage.getItem('customRegTypes') || '[]');
            const found = customTypes.find(t => t.name === type);
            if (found && found.label) labelText = found.label;
            else labelText = type + " No";
        } catch (e) {
            labelText = type + " No";
        }
    }

    if (typeof updateBillLabels === 'function') {
        updateBillLabels(labelText);
    }

    // 2. Sync Heading
    if (typeof syncBillHeadingToSettings === 'function') {
        syncBillHeadingToSettings(type);
    }

    // 3. Update Global Meta
    const dispNo = document.getElementById('disp-reg-invoice-no');
    const dispDate = document.getElementById('disp-reg-date');
    if (dispNo) dispNo.textContent = formattedInvoiceNo;
    if (dispDate) dispDate.textContent = date;

    // 4. Update Table View
    const prefixSpan = document.getElementById('billPrefixDisplay');
    const numberInput = document.getElementById('billNo');
    if (prefixSpan) {
        prefixSpan.textContent = prefix ? `${prefix}` : '';
        prefixSpan.style.display = prefix ? 'inline' : 'none';
        prefixSpan.style.color = '#0f0f0f';
    }
    if (numberInput) numberInput.value = rawNo;

    // 5. Handle View Switching
    const viewMode = regBillConfig.viewMode;
    const defaultView = document.getElementById('reg-default-view');
    const advancedView = document.getElementById('reg-advanced-view');
    const shipCol = document.getElementById('adv-ship-col');

    let activeCustomerName = '';

    if (viewMode === 'simple') {
        if (defaultView) defaultView.style.display = 'block';
        if (advancedView) advancedView.style.display = 'none';

        const custName = document.getElementById('custName');
        const custPhone = document.getElementById('custPhone');
        const custAddr = document.getElementById('custAddr');
        const billDate = document.getElementById('billDate');

        const modalSimpleName = document.getElementById('reg-modal-simple-name').value;
        activeCustomerName = modalSimpleName;

        if (custName) custName.value = modalSimpleName;
        if (custPhone) custPhone.value = document.getElementById('reg-modal-simple-phone').value;
        if (custAddr) custAddr.value = document.getElementById('reg-modal-simple-addr').value;
        if (billDate) billDate.value = date;

        if (!isSilentLoad && typeof saveToLocalStorage === 'function') {
            saveToLocalStorage();
        }
    } else {
        if (defaultView) defaultView.style.display = 'none';
        if (advancedView) advancedView.style.display = 'block';

        const advNo = document.getElementById('adv-invoice-no');
        const advDate = document.getElementById('adv-bill-date');
        if (advNo) advNo.textContent = formattedInvoiceNo;
        if (advDate) advDate.textContent = date;

        const modalBillName = document.getElementById('reg-modal-bill-name').value.trim();
        activeCustomerName = modalBillName;

        const updateField = (viewId, modalId, hideParent = false) => {
            const el = document.getElementById(viewId);
            const val = document.getElementById(modalId).value.trim();
            if (!el) return;
            el.textContent = val || '-';
            const isEmpty = (val === '' || val === '-');
            const targetToHide = hideParent ? el.parentElement : el;
            targetToHide.style.display = isEmpty ? 'none' : (hideParent ? '' : 'block');
        };

        const updateStateLine = (viewStateId, viewCodeId, modalStateId, modalCodeId) => {
            const stateVal = document.getElementById(modalStateId).value.trim();
            const codeVal = document.getElementById(modalCodeId).value.trim();
            const stateEl = document.getElementById(viewStateId);
            const codeEl = document.getElementById(viewCodeId);
            if (!stateEl || !codeEl) return;
            stateEl.textContent = stateVal;
            codeEl.textContent = codeVal;
            const parentRow = stateEl.parentElement;
            parentRow.style.display = (stateVal === '' && codeVal === '') ? 'none' : '';
        };

        updateField('adv-bill-name', 'reg-modal-bill-name', false);
        updateField('adv-bill-addr', 'reg-modal-bill-addr', false);
        updateField('adv-bill-gst', 'reg-modal-bill-gst', true);
        updateField('adv-bill-phone', 'reg-modal-bill-phone', true);
        updateStateLine('adv-bill-state', 'adv-bill-code', 'reg-modal-bill-state', 'reg-modal-bill-code');

        if (viewMode === 'both') {
            if (shipCol) shipCol.style.display = 'block';
            updateField('adv-ship-name', 'reg-modal-ship-name', false);
            updateField('adv-ship-addr', 'reg-modal-ship-addr', false);
            updateField('adv-ship-gst', 'reg-modal-ship-gst', true);
            updateField('adv-ship-phone', 'reg-modal-ship-phone', true);
            updateField('adv-ship-pos', 'reg-modal-ship-pos', true);
            updateStateLine('adv-ship-state', 'adv-ship-code', 'reg-modal-ship-state', 'reg-modal-ship-code');
        } else {
            if (shipCol) shipCol.style.display = 'none';
        }
    }

    await saveRegularModalState();

    if (!isSilentLoad) {
        closeRegularModal();
        if (activeCustomerName && typeof checkAndApplyCustomerRates === 'function') {
            await checkAndApplyCustomerRates(activeCustomerName);
        }
    }
}

/* ==========================================
   RESET REGULAR MODAL
   ========================================== */
function resetRegularModal() {
    // 1. Clear Input Fields
    document.getElementById('reg-modal-invoice-no').value = '';

    // Set Date to Today (DD-MM-YYYY)
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const yyyy = today.getFullYear();
    document.getElementById('reg-modal-date').value = `${dd}-${mm}-${yyyy}`;

    // Simple View Inputs
    document.getElementById('reg-modal-simple-name').value = '';
    document.getElementById('reg-modal-simple-phone').value = '';
    document.getElementById('reg-modal-simple-addr').value = '';

    // Advanced View Inputs
    const idsToClear = [
        'reg-modal-bill-name', 'reg-modal-bill-addr', 'reg-modal-bill-gst',
        'reg-modal-bill-phone', 'reg-modal-bill-state', 'reg-modal-bill-code',
        'reg-modal-ship-name', 'reg-modal-ship-addr', 'reg-modal-ship-gst',
        'reg-modal-ship-phone', 'reg-modal-ship-state', 'reg-modal-ship-code',
        'reg-modal-ship-pos'
    ];
    idsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // 2. Set Default Defaults
    document.getElementById('reg-modal-bill-state').value = '';
    document.getElementById('reg-modal-bill-code').value = '';
    document.getElementById('reg-modal-ship-state').value = '';
    document.getElementById('reg-modal-ship-code').value = '';

    // 3. RESET TYPE TO "Invoice"
    const select = document.getElementById('reg-modal-type-select');
    if (select) {
        select.value = 'Invoice';
        // This triggers: 
        // 1. Menu Hide
        // 2. Label Update
        // 3. Next Invoice Number Fetch
        handleRegTypeChange();
    } else {
        // Fallback if select doesn't exist for some reason
        saveRegularBillDetails();
    }
}

// 5. Saved Bills Filtering
function updateSavedBillsFilterOptions(bills) {
    const select = document.getElementById('saved-prefix-filter');
    if (!select) return;
    select.innerHTML = '<option value="all">All Prefixes</option>';

    // Extract unique prefixes (Handle null/undefined)
    const prefixes = new Set(bills.map(b => b.prefix || 'None').filter(p => p));
    prefixes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        select.appendChild(opt);
    });
}

/* 1. APPLY SAVED BILLS FILTER (Updated with Payment & CN Button) */
async function applySavedBillsFilter() {
    // 1. Determine Context
    const isGST = (typeof currentBillsMode !== 'undefined' && currentBillsMode === 'gst');
    const selectedType = document.getElementById('saved-prefix-filter') ? document.getElementById('saved-prefix-filter').value : 'all';
    const searchInput = document.getElementById('saved-bills-search').value.trim().toLowerCase();
    const billsList = document.getElementById('saved-bills-list');

    try {
        // 2. Fetch Data
        let source;
        if (isGST) {
            source = await getAllFromDB('gstSavedBills');
        } else {
            source = await getAllFromDB('savedBills');
        }

        // 3. Filter Data
        const filtered = source.filter(bill => {
            const val = bill.value;
            const state = val.modalState || {};

            // --- A. Check Type (Regular Mode Only) ---
            let matchesType = true;
            if (!isGST) {
                const billType = state.type || 'Regular';
                matchesType = (selectedType === 'all') || (billType === selectedType);
            }

            // --- B. Check Search (Command Logic) ---
            let matchesSearch = true;

            if (searchInput) {
                // Command: Amount (/amt/)
                if (searchInput.startsWith('/amt/')) {
                    const term = searchInput.replace('/amt/', '').trim();
                    const amountStr = (val.totalAmount || '').toString().toLowerCase();
                    matchesSearch = amountStr.includes(term);
                }
                // Command: GSTIN (/gstin/)
                else if (searchInput.startsWith('/gstin/')) {
                    const term = searchInput.replace('/gstin/', '').trim();
                    const billToGst = (val.customer?.billTo?.gstin || '').toLowerCase();
                    const shipToGst = (val.customer?.shipTo?.gstin || '').toLowerCase();
                    const mainGst = (val.customer?.gstin || '').toLowerCase();
                    matchesSearch = billToGst.includes(term) || shipToGst.includes(term) || mainGst.includes(term);
                }
                // Command: Date (/date/)
                else if (searchInput.startsWith('/date/')) {
                    const term = searchInput.replace('/date/', '').trim();
                    const dateStr = (val.date || '').toString().toLowerCase();
                    matchesSearch = dateStr.includes(term);
                }
                // Command: Month (/month/)
                else if (searchInput.startsWith('/month/')) {
                    let term = searchInput.replace('/month/', '').trim();
                    if (term.length === 1) term = '0' + term; // Handle single digit

                    const dateStr = (val.date || ''); // Format: DD-MM-YYYY
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                        matchesSearch = (parts[1] === term);
                    } else {
                        matchesSearch = false;
                    }
                }
                // Command: Year (/year/)
                else if (searchInput.startsWith('/year/')) {
                    const term = searchInput.replace('/year/', '').trim();
                    const dateStr = (val.date || '');
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                        matchesSearch = (parts[2] === term);
                    } else {
                        matchesSearch = false;
                    }
                }
                // Default: Standard Text Search
                else {
                    const title = val.title?.toLowerCase() || '';
                    const billNo = (val.customer?.billNo || val.invoiceDetails?.number || '').toString().toLowerCase();

                    let nameMatch = false;
                    if (isGST) {
                        const billToName = val.customer?.billTo?.name?.toLowerCase() || '';
                        const shipToName = val.customer?.shipTo?.name?.toLowerCase() || '';
                        nameMatch = billToName.includes(searchInput) || shipToName.includes(searchInput);
                    } else {
                        const custName = val.customer?.name?.toLowerCase() || '';
                        const simpleName = state.simple?.name?.toLowerCase() || '';
                        const billToName = state.billTo?.name?.toLowerCase() || '';
                        nameMatch = custName.includes(searchInput) || simpleName.includes(searchInput) || billToName.includes(searchInput);
                    }

                    matchesSearch = title.includes(searchInput) || billNo.includes(searchInput) || nameMatch;
                }
            }

            return matchesType && matchesSearch;
        });

        // 4. Sort Data
        filtered.sort((a, b) => {
            const timeA = a.value.createdAt || a.value.timestamp || 0;
            const timeB = b.value.createdAt || b.value.timestamp || 0;

            if (typeof isSavedBillsSortAscending !== 'undefined' && isSavedBillsSortAscending) {
                return timeA - timeB; // Oldest First
            } else {
                return timeB - timeA; // Newest First
            }
        });

        // 5. Render Data
        billsList.innerHTML = '';

        if (filtered.length === 0) {
            billsList.innerHTML = '<div class="saved-bill-card">No matching bills found</div>';
            return;
        }

        filtered.forEach(bill => {
            const billCard = document.createElement('div');
            billCard.className = 'saved-bill-card';
            const val = bill.value;

            // --- RENDER LOGIC: GST vs REGULAR ---
            if (isGST) {
                // ================= GST CARD =================
                const menuId = `menu-gst-${bill.id}-${Date.now()}`;
                const billNo = val.invoiceDetails?.number || 'N/A';
                const custName = val.customer?.billTo?.name || 'N/A';
                const gstin = val.customer?.billTo?.gstin || 'No GSTIN';

                // --- DATA FOR PREFILL ---
                const prefillData = JSON.stringify({
                    type: 'Tax Invoice',
                    prefix: '',
                    no: billNo
                }).replace(/"/g, '&quot;');

                billCard.innerHTML = `
                    <div class="card-header-row">
                        <div class="card-info">
                            <span>${billNo} - ${custName}</span>
                            <span class="card-sub-info">${gstin}</span>
                            <span class="card-sub-info" style="color:var(--primary-color)">₹${val.totalAmount}</span>
                        </div>
                        <div class="card-controls">
                            <button class="icon-btn" onclick="toggleCardDetails(this)" title="Toggle Details">
                                <span class="material-icons">keyboard_arrow_down</span>
                            </button>
                            <div class="action-menu-container">
                                <button class="icon-btn" onclick="toggleActionMenu(event, '${menuId}')">
                                    <span class="material-icons">more_vert</span>
                                </button>
                                <div id="${menuId}" class="action-dropdown">
                                    <button class="dropdown-item" onclick="openPaymentDialog('${custName}', '${gstin}', 'gst', ${prefillData})">
                                        <span class="material-icons">payments</span> Payment & CN
                                    </button>
                                    <button class="dropdown-item" onclick="downloadBillAsJson('${bill.id}', 'gst', event)">
                                        <span class="material-icons">download</span> Download JSON
                                    </button>
                                    <button class="dropdown-item" onclick="editSavedBill('${bill.id}', 'gst', event)">
                                        <span class="material-icons">edit</span> Edit
                                    </button>
                                    <button class="dropdown-item delete-item" onclick="deleteSavedBill('${bill.id}', 'gst', event)">
                                        <span class="material-icons">delete</span> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="details-section hidden saved-bill-details">
                        <div>Date: ${val.date}</div>
                        <div>Items: ${val.items?.length || 0}</div>
                        <div>Type: ${val.taxSettings?.transactionType || 'intrastate'}</div>
                    </div>`;

                billCard.addEventListener('click', async (e) => {
                    if (e.target.closest('.card-controls')) return;
                    if (typeof resetEditMode === 'function') resetEditMode();
                    if (typeof clearAllData === 'function') await clearAllData(true);

                    // Force switch to GST Mode UI
                    if (!isGSTMode) {
                        isGSTMode = true;
                        if (typeof updateUIForGSTMode === 'function') updateUIForGSTMode();
                    }
                    if (typeof loadGSTSavedBill === 'function') await loadGSTSavedBill(bill.id);
                    closeSavedBillsModal();

                    setTimeout(() => {
                        if (typeof copyItemsToGSTBill === 'function') copyItemsToGSTBill();
                        if (typeof updateGSTTaxCalculation === 'function') updateGSTTaxCalculation();
                        if (typeof resetColumnVisibility === 'function') resetColumnVisibility();
                    }, 100);
                });

            } else {
                // ================= REGULAR CARD =================
                const menuId = `menu-bill-${bill.id}-${Date.now()}`;
                const state = val.modalState || {};
                const rawBillNo = state.invoiceNo || val.customer?.billNo || 'N/A';
                const prefix = state.prefix || '';
                const billType = state.type || 'Regular';

                // Name Logic
                const viewFormat = state.viewFormat || 'simple';
                let custName = 'N/A';
                if (viewFormat === 'simple') custName = state.simple?.name;
                else if (viewFormat === 'bill_to' || viewFormat === 'both') custName = state.billTo?.name;
                if (!custName) custName = val.customer?.name || 'N/A';

                const displayBillNo = prefix ? `${prefix}${rawBillNo}` : rawBillNo;
                const gstin = val.customer?.gstin || '';

                // --- DATA FOR PREFILL ---
                const prefillData = JSON.stringify({
                    type: billType,
                    prefix: prefix,
                    no: rawBillNo
                }).replace(/"/g, '&quot;');

                billCard.innerHTML = `
                    <div class="card-header-row">
                        <div class="card-info">
                            <span>${displayBillNo} - ${custName}</span>
                            <span class="card-sub-info" style="color:var(--primary-color);font-size: 0.85em; font-weight: 500;">${billType}</span>
                            <span class="card-sub-info">₹${val.totalAmount}</span>
                        </div>
                        <div class="card-controls">
                            <button class="icon-btn" onclick="toggleCardDetails(this)" title="Toggle Details">
                                <span class="material-icons">keyboard_arrow_down</span>
                            </button>
                            <div class="action-menu-container">
                                <button class="icon-btn" onclick="toggleActionMenu(event, '${menuId}')">
                                    <span class="material-icons">more_vert</span>
                                </button>
                                <div id="${menuId}" class="action-dropdown">
                                    <button class="dropdown-item" onclick="openPaymentDialog('${custName}', '${gstin}', 'regular', ${prefillData})">
                                        <span class="material-icons">payments</span> Payment & CN
                                    </button>
                                    <button class="dropdown-item" onclick="downloadBillAsJson('${bill.id}', 'regular', event)">
                                        <span class="material-icons">download</span> Download JSON
                                    </button>
                                    <button class="dropdown-item" onclick="editSavedBill('${bill.id}', 'regular', event)">
                                        <span class="material-icons">edit</span> Edit
                                    </button>
                                    <button class="dropdown-item delete-item" onclick="deleteSavedBill('${bill.id}', 'regular', event)">
                                        <span class="material-icons">delete</span> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="details-section hidden saved-bill-details">
                        <div>Date: ${val.date}</div>
                        <div>Items: ${val.items?.length || val.itemCount || 0}</div>
                    </div>`;

                billCard.addEventListener('click', async (e) => {
                    if (e.target.closest('.card-controls')) return;
                    if (typeof resetEditMode === 'function') resetEditMode();
                    if (typeof clearAllData === 'function') await clearAllData(true);

                    // Force switch to Regular Mode UI
                    if (isGSTMode) {
                        isGSTMode = false;
                        if (typeof updateUIForGSTMode === 'function') updateUIForGSTMode();
                    }
                    if (typeof loadSavedBill === 'function') await loadSavedBill(bill.id);
                    closeSavedBillsModal();
                });
            }

            billsList.appendChild(billCard);
        });

    } catch (error) {
        console.error("Filter error", error);
    }
}

/* ==========================================
   REAL-TIME SYNC LOGIC (View <-> Modal)
   ========================================== */

/* ==========================================
   UPDATED SYNC LOGIC (With Auto-Save & Auto-Rate)
   ========================================== */
/* ==========================================
   UPDATED SYNC LOGIC (Fixes Modal Typing)
   ========================================== */
async function syncRegularData(source) {
    // 1. Define Elements (Main View)
    const viewName = document.getElementById('custName');
    const viewPhone = document.getElementById('custPhone');
    const viewAddr = document.getElementById('custAddr');
    const viewBillNo = document.getElementById('billNo');
    const viewDate = document.getElementById('billDate');
    const viewGST = document.getElementById('custGSTIN');

    // 2. Define Elements (Modal)
    const modalName = document.getElementById('reg-modal-simple-name');
    const modalPhone = document.getElementById('reg-modal-simple-phone');
    const modalAddr = document.getElementById('reg-modal-simple-addr');
    const modalInvoiceNo = document.getElementById('reg-modal-invoice-no');
    const modalDate = document.getElementById('reg-modal-date');

    // Modal Advanced Elements
    const modalBillName = document.getElementById('reg-modal-bill-name');
    const modalBillPhone = document.getElementById('reg-modal-bill-phone');
    const modalBillAddr = document.getElementById('reg-modal-bill-addr');
    const modalBillGST = document.getElementById('reg-modal-bill-gst');

    if (source === 'view') {
        // --- CASE A: User typing in MAIN VIEW ---
        if (modalName) modalName.value = viewName.value;
        if (modalPhone) modalPhone.value = viewPhone.value;
        if (modalAddr) modalAddr.value = viewAddr.value;
        if (modalInvoiceNo) modalInvoiceNo.value = viewBillNo.value;
        if (modalDate) modalDate.value = viewDate.value;

        if (modalBillName) modalBillName.value = viewName.value;
        if (modalBillPhone) modalBillPhone.value = viewPhone.value;
        if (modalBillAddr) modalBillAddr.value = viewAddr.value;
        if (modalBillGST) modalBillGST.value = viewGST.value;

        await saveRegularModalState();

    } else {
        // --- CASE B: User typing in MODAL ---
        if (viewName) viewName.value = modalName.value;
        if (viewPhone) viewPhone.value = modalPhone.value;
        if (viewAddr) viewAddr.value = modalAddr.value;
        if (viewBillNo) viewBillNo.value = modalInvoiceNo.value;
        if (viewDate) viewDate.value = modalDate.value;

        if (typeof saveToLocalStorage === 'function') saveToLocalStorage();

        // --- FIX: Manually Trigger Rate Check ---
        // Since we are changing values via code, the 'input' listener on main view won't fire.
        // We must call the rate check manually here.
        const activeName = modalName.value || modalBillName.value;

        if (activeName && typeof checkAndApplyCustomerRates === 'function') {
            checkAndApplyCustomerRates(activeName); // This will respect the 'Invoice' restriction
        }
    }
}

// Helper Function to Sync & Save Heading
function syncBillHeadingToSettings(typeVal) {
    const text = typeVal.toUpperCase();

    // 1. Update the Input in the hidden Settings Modal
    const settingsInput = document.getElementById('regular-heading-input');
    if (settingsInput) {
        settingsInput.value = text;
    }

    // 2. Update the Visual Header on Page immediately
    const pageHeader = document.querySelector('.invoice-title') || document.querySelector('h1');
    if (pageHeader) pageHeader.textContent = text;

    // 3. Trigger the Save Logic to Persist it
    if (typeof saveBillHeadings === 'function') {
        // We wrap the existing save function to prevent it from closing the wrong modal
        // or throwing errors if the modal isn't open.
        const originalClose = window.closeBillHeadingModal;
        window.closeBillHeadingModal = function () { /* No-op to prevent error */ };

        saveBillHeadings();

        window.closeBillHeadingModal = originalClose; // Restore original function
    }
}

/* ==========================================
   STATE PERSISTENCE (Save/Load)
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
    // ... your other init code ...
    // 1. Init Options
    if (typeof initRegBillTypes === 'function') initRegBillTypes();

    // 2. Load State (This internally calls saveRegularBillDetails(true))
    // This is what puts the saved bill number into the main view input
    if (typeof loadRegularModalState === 'function') await loadRegularModalState();

    /* ==========================================
   CLOSE MENUS WHEN CLICKING OUTSIDE
   ========================================== */
    document.addEventListener('click', function (event) {
        const menu = document.getElementById('reg-type-menu');

        // Find the toggle button (looks for the button that calls the function)
        const toggleBtn = event.target.closest('button[onclick="toggleRegTypeMenu()"]');

        // Only proceed if menu exists and is currently open
        if (menu && menu.style.display === 'block') {

            // Check if the click target is:
            // 1. NOT inside the menu
            // 2. NOT the toggle button itself (let the button handle the toggle)
            if (!menu.contains(event.target) && !toggleBtn) {
                menu.style.display = 'none';
            }
        }
    });
});

async function saveRegularModalState() {
    const state = {
        // 1. Config
        type: document.getElementById('reg-modal-type-select').value,
        prefix: document.getElementById('reg-modal-prefix').value,
        invoiceNo: document.getElementById('reg-modal-invoice-no').value,
        showPaymentTable: showBillPaymentTable,
        date: document.getElementById('reg-modal-date').value,
        viewMode: document.getElementById('reg-modal-cust-view-select').value,
        isLocked: regBillConfig.isLocked,

        // 2. Simple Data
        simple: {
            name: document.getElementById('reg-modal-simple-name').value,
            phone: document.getElementById('reg-modal-simple-phone').value,
            addr: document.getElementById('reg-modal-simple-addr').value
        },

        // 3. Advanced Data
        billTo: {
            name: document.getElementById('reg-modal-bill-name').value,
            addr: document.getElementById('reg-modal-bill-addr').value,
            gst: document.getElementById('reg-modal-bill-gst').value,
            phone: document.getElementById('reg-modal-bill-phone').value,
            state: document.getElementById('reg-modal-bill-state').value,
            code: document.getElementById('reg-modal-bill-code').value,
        },
        shipTo: {
            name: document.getElementById('reg-modal-ship-name').value,
            addr: document.getElementById('reg-modal-ship-addr').value,
            gst: document.getElementById('reg-modal-ship-gst').value,
            phone: document.getElementById('reg-modal-ship-phone').value,
            state: document.getElementById('reg-modal-ship-state').value,
            code: document.getElementById('reg-modal-ship-code').value,
            pos: document.getElementById('reg-modal-ship-pos').value
        }
    };

    try {
        await setInDB('settings', 'regularBillState', state);
    } catch (e) {
        console.error("Error saving regular bill state", e);
    }
}

/* ==========================================
   FIXED LOAD FUNCTION (Respects Saved State)
   ========================================== */
async function loadRegularModalState() {
    try {
        const state = await getFromDB('settings', 'regularBillState');
        if (!state) return; // No saved state, keep defaults

        // 1. Restore Config
        if (state.type) {
            document.getElementById('reg-modal-type-select').value = state.type;
            // PASS TRUE to prevent auto-saving during load
            await handleRegTypeChange(true);
        }

        // Restore Prefix
        if (state.prefix !== undefined) {
            document.getElementById('reg-modal-prefix').value = state.prefix;
            regBillConfig.prefix = state.prefix;
        }

        // Restore Lock UI
        regBillConfig.isLocked = (state.isLocked !== undefined) ? state.isLocked : true;
        document.getElementById('reg-modal-prefix').disabled = regBillConfig.isLocked;
        updateRegLockIcon();

        // 2. Restore Common Fields
        document.getElementById('reg-modal-invoice-no').value = state.invoiceNo || '';
        document.getElementById('reg-modal-date').value = state.date || '';
        document.getElementById('reg-modal-cust-view-select').value = state.viewMode || 'simple';

        // 3. Restore Simple Data
        if (state.simple) {
            document.getElementById('reg-modal-simple-name').value = state.simple.name || '';
            document.getElementById('reg-modal-simple-phone').value = state.simple.phone || '';
            document.getElementById('reg-modal-simple-addr').value = state.simple.addr || '';
        }

        // 4. Restore Advanced Data
        if (state.billTo) {
            document.getElementById('reg-modal-bill-name').value = state.billTo.name || '';
            document.getElementById('reg-modal-bill-addr').value = state.billTo.addr || '';
            document.getElementById('reg-modal-bill-gst').value = state.billTo.gst || '';
            document.getElementById('reg-modal-bill-phone').value = state.billTo.phone || '';
            document.getElementById('reg-modal-bill-state').value = (state.billTo.state !== undefined) ? state.billTo.state : '';
            document.getElementById('reg-modal-bill-code').value = (state.billTo.code !== undefined) ? state.billTo.code : '';
        }

        if (state.shipTo) {
            document.getElementById('reg-modal-ship-name').value = state.shipTo.name || '';
            document.getElementById('reg-modal-ship-addr').value = state.shipTo.addr || '';
            document.getElementById('reg-modal-ship-gst').value = state.shipTo.gst || '';
            document.getElementById('reg-modal-ship-phone').value = state.shipTo.phone || '';
            document.getElementById('reg-modal-ship-state').value = (state.shipTo.state !== undefined) ? state.shipTo.state : '';
            document.getElementById('reg-modal-ship-code').value = (state.shipTo.code !== undefined) ? state.shipTo.code : '';
            document.getElementById('reg-modal-ship-pos').value = (state.shipTo.pos !== undefined) ? state.shipTo.pos : '';
        }

        // 5. Trigger View Logic
        handleRegViewChange();

        // 6. Apply to Bill View (Silent Mode - true)
        saveRegularBillDetails(true);

    } catch (e) {
        console.error("Error loading regular bill state", e);
    }
}

/* ==========================================
   AUTO-INCREMENT HELPER
   ========================================== */
async function getNextInvoiceNumberAsync(type, prefix) {
    try {
        const savedBills = await getAllFromDB('savedBills');
        let maxNum = 0;

        savedBills.forEach(bill => {
            const state = bill.value.modalState || {};

            // Check if Type matches
            if (state.type === type) {
                // Check if Prefix matches (handle nulls as empty string)
                const billPrefix = state.prefix || '';
                const targetPrefix = prefix || '';

                if (billPrefix === targetPrefix) {
                    // Try to parse the Number
                    const numStr = state.invoiceNo || '0';
                    const num = parseInt(numStr, 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            }
        });

        // Return Max + 1, padded to 3 digits
        return String(maxNum + 1).padStart(3, '0');

    } catch (e) {
        console.error("Error calculating next number", e);
        return '001';
    }
}
