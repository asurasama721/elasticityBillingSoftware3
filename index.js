// Add IndexedDB variables at the top
let db = null;
const DB_NAME = 'BillAppDB';

const DB_VERSION = 8; // Changed from 5 to 6 to trigger upgrade
let dbInitialized = false;
let dbInitPromise = null;
let isGSTMode = false;
let gstCustomers = [];
let gstSavedBills = [];
let companyInfo = null;
let currentGSTPercent = 18;
let transactionType = 'intrastate'; // 'intrastate' or 'interstate'
// Global variables for toggle states
let currentCustomerMode = 'regular'; // 'regular' or 'gst'
let currentBillsMode = 'regular'; // 'regular' or 'gst'
let currentlyEditingSectionId = null;
let currentAdjustTaxPercent = 0;
let isGSTInclusive = false;
let confirmResolve = null;
let currentlyEditingPaymentId = null;
let termsListItems = [];
let termsListType = 'ul';
let termsListStyle = 'disc';

let discountAmount = 0;
let discountPercent = 0;
let gstPercent = 0;
let autoApplyCustomerRates = true;

// Edit mode variables
let editMode = false;
let currentEditingBillId = null;
let currentEditingBillType = null; // 'regular' or 'gst
// 
let currentConvertUnit = 'none';

// [ADD AT TOP WITH GLOBAL VARIABLES]
let adjustmentChain = []; // Stores: { id, name, type, value, operation, textColor }
let adjDragSrcEl = null;  // Unique drag source for adjustments

let codeReader = null;
let currentScannerMode = null; // 'main' or 'modal'
let scannedItemData = null;
let scannerMode = 'manual'; // 'manual' or 'auto'
let lastScannedCode = null;
let lastScanTime = 0;
const SCAN_DELAY = 1500;

let isVendorMode = false;
let currentVendorFile = null; // Stores Base64 string of uploaded bill
let currentlyEditingVendorId = null;
let currentVendorBillsMode = 'regular'; // 'regular' or 'gst'

// Add/Update this at the top with other global variables
let autoScrollEnabled = localStorage.getItem('billApp_autoScroll') === 'true';
let lastScrollPosition = 0; // Stores scroll position before editing
let isSavedBillsSortAscending = false; // Default: Descending (Newest First)

// State to hold draft inputs when toggling
let paymentDraftState = {
    payment: {},
    'credit-note': {}
};

let isCustomerSortAscending = true; // Default A-Z

// Add this with other global variables
let sectionModalState = {
    align: 'left',
    bgColor: '#ffe8b5',
    fontColor: '#000000',
    fontSize: '14',
    textTransform: 'none',
    paddingType: '',
    paddingValue: ''
};

// IndexedDB initialization function
function initDB() {
    if (dbInitPromise) {
        return dbInitPromise;
    }

    dbInitPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION); // Make sure DB_VERSION is incremented if needed

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            dbInitialized = true;

            db.onerror = (event) => {
                console.error('Database error:', event.target.error);
            };

            db.onclose = () => {
                dbInitialized = false;
                dbInitPromise = null;
            };

            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Existing object stores
            if (!database.objectStoreNames.contains('billDataManual')) {
                database.createObjectStore('billDataManual', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('billHistoryManual')) {
                database.createObjectStore('billHistoryManual', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('vendorList')) {
                database.createObjectStore('vendorList', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('vendorSavedBills')) {
                database.createObjectStore('vendorSavedBills', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('taxSettings')) {
                database.createObjectStore('taxSettings', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('theme')) {
                database.createObjectStore('theme', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('savedItems')) {
                database.createObjectStore('savedItems', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('savedCustomers')) {
                database.createObjectStore('savedCustomers', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('savedBills')) {
                database.createObjectStore('savedBills', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('gstCustomers')) {
                database.createObjectStore('gstCustomers', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('gstSavedBills')) {
                database.createObjectStore('gstSavedBills', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('companyInfo')) {
                database.createObjectStore('companyInfo', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('gstMode')) {
                database.createObjectStore('gstMode', { keyPath: 'id' });
            }

            if (!database.objectStoreNames.contains('expenses')) {
                const expenseStore = database.createObjectStore('expenses', { keyPath: 'id' });
                expenseStore.createIndex('date', 'date', { unique: false });
                expenseStore.createIndex('category', 'category', { unique: false });
            }

            // NEW: Add payment and credit note object stores
            if (!database.objectStoreNames.contains('customerPayments')) {
                database.createObjectStore('customerPayments', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('customerCreditNotes')) {
                database.createObjectStore('customerCreditNotes', { keyPath: 'id' });
            }

            // ADD THIS: Create settings object store
            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'id' });
            }
            // Add this with other object store creations
            if (!database.objectStoreNames.contains('restoredBills')) {
                database.createObjectStore('restoredBills', { keyPath: 'id' });
            }
        };

        request.onblocked = () => {
            console.log('Database blocked - waiting for other connections to close');
        };
    });

    return dbInitPromise;
}

async function ensureDBInitialized() {
    if (!dbInitialized && !dbInitPromise) {
        await initDB();
    } else if (dbInitPromise) {
        await dbInitPromise;
    }

    if (db && (db.readyState === 'closed' || !db.objectStoreNames)) {
        dbInitialized = false;
        dbInitPromise = null;
        await initDB();
    }
}

async function getFromDB(storeName, key) {
    await ensureDBInitialized();

    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
        } catch (error) {
            reject(error);
        }
    });
}

async function setInDB(storeName, key, value) {
    await ensureDBInitialized();

    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({ id: key, value: value });

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        } catch (error) {
            reject(error);
        }
    });
}

async function removeFromDB(storeName, key) {
    await ensureDBInitialized();

    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        } catch (error) {
            reject(error);
        }
    });
}


// Save payment/credit note
async function savePaymentRecord(customerName, gstin, paymentData, type = 'payment') {
    console.log(`[SAVE] Saving ${type} for ${customerName}`, paymentData);
    
    const storeName = type === 'payment' ? 'customerPayments' : 'customerCreditNotes';
    const recordId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // FIXED: Using spread (...paymentData) to ensure receiptNo and ref fields are saved
    const record = {
        id: recordId,
        customerName: customerName,
        gstin: gstin,
        type: type,
        timestamp: Date.now(),
        ...paymentData // <--- CRITICAL FIX: Saves receiptNo, refType, refBillNo etc.
    };

    await setInDB(storeName, recordId, record);
    console.log(`[SAVE] Success. ID: ${recordId}`);
    return recordId;
}
// Toggle auto-apply customer rates
async function toggleAutoApplyRates() {
    try {
        autoApplyCustomerRates = !autoApplyCustomerRates;
        updateAutoApplyButton();
        showNotification(`Auto-apply customer rates: ${autoApplyCustomerRates ? 'ON' : 'OFF'}`, 'info', 2000);

        // Save the setting to DB with error handling
        try {
            await setInDB('settings', 'autoApplyCustomerRates', autoApplyCustomerRates);
        } catch (error) {
            console.warn('Could not save auto-apply setting (settings store may not exist):', error);
            // Continue without saving - the setting will work for current session
        }
    } catch (error) {
        console.error('Error toggling auto-apply rates:', error);
    }
}

// Update the button appearance
function updateAutoApplyButton() {
    const button = document.querySelector('.auto-apply-rates-btn');
    if (button) {
        if (autoApplyCustomerRates) {
            button.style.backgroundColor = '#27ae60';
            button.innerHTML = '<span class="material-icons">auto_awesome</span>Auto Rate : ON';
        } else {
            button.style.backgroundColor = '';
            button.innerHTML = '<span class="material-icons">auto_awesome</span>Auto Rate : OFF';
        }
    }
}

// Load auto-apply setting on startup
async function loadAutoApplySetting() {
    try {
        // Check if settings store exists first
        await ensureDBInitialized();

        if (db && db.objectStoreNames.contains('settings')) {
            const setting = await getFromDB('settings', 'autoApplyCustomerRates');
            autoApplyCustomerRates = setting !== false; // Default to true if not set
        } else {
            // Settings store doesn't exist, use default
            autoApplyCustomerRates = true;
        }
        updateAutoApplyButton();
    } catch (error) {
        console.warn('Error loading auto-apply setting, using default:', error);
        autoApplyCustomerRates = true;
        updateAutoApplyButton();
    }
}

// Customer Rate Suggestion System
async function getCustomerRateSuggestion(identifier, itemName) {
    if (!identifier || !itemName) return null;

    try {
        const searchItem = itemName.toLowerCase().trim();
        const searchIdentifier = identifier.toLowerCase().trim();
        
        let targetBills = [];

        if (isGSTMode) {
            // --- GST MODE: Search by GSTIN in gstSavedBills ---
            const rawBills = await getAllFromDB('gstSavedBills');
            
            // 1. Filter: Match GSTIN (Bill To OR Ship To)
            targetBills = rawBills.filter(bill => {
                const val = bill.value;
                const billTo = val.customer?.billTo?.gstin?.toLowerCase();
                const shipTo = val.customer?.shipTo?.gstin?.toLowerCase();
                
                return billTo === searchIdentifier || shipTo === searchIdentifier;
            });

        } else {
            // --- REGULAR MODE: Search by Name in savedBills ---
            const rawBills = await getAllFromDB('savedBills');

            // 1. Filter: Match Name AND Type is 'Invoice'
            targetBills = rawBills.filter(bill => {
                const val = bill.value;

                // STRICT RULE: Only 'Invoice' type (ignore Estimates, Quotes, etc.)
                // Check new modalState.type or fallback to 'Invoice' for legacy
                const type = val.modalState?.type || 'Invoice';
                if (type !== 'Invoice') return false;

                // Check Name (New Modal State OR Legacy Customer Name)
                const simpleName = val.modalState?.simple?.name?.toLowerCase();
                const billName = val.modalState?.billTo?.name?.toLowerCase();
                const legacyName = val.customer?.name?.toLowerCase(); // Fallback for old data

                return simpleName === searchIdentifier || 
                       billName === searchIdentifier || 
                       legacyName === searchIdentifier;
            });
        }

        // 2. SORT: By 'createdAt' Descending (Newest Created First)
        // This fixes the issue where editing an old bill (updating timestamp) messed up the order.
        // Fallback to 'timestamp' if createdAt doesn't exist (legacy bills).
        targetBills.sort((a, b) => {
            const timeA = a.value.createdAt || a.value.timestamp || 0;
            const timeB = b.value.createdAt || b.value.timestamp || 0;
            return timeB - timeA; // Descending (Newest -> Oldest)
        });

        // 3. TRAVERSE: Stop at the FIRST match (which is the most recent due to sorting)
        for (const bill of targetBills) {
            const val = bill.value;
            
            // Handle various item structures (Regular 'items', GST 'items', or Legacy 'tableStructure')
            let itemsList = val.items || [];
            // Fallback for very old Regular bills that used tableStructure
            if (itemsList.length === 0 && val.tableStructure) {
                itemsList = val.tableStructure;
            }

            for (const item of itemsList) {
                // Normalize Item Name check
                // 'itemName' is used in GST/Legacy, 'name' might be in new Regular items, 'particulars' in manual
                const storedName = (item.itemName || item.name || item.particulars || '').toLowerCase().trim();
                const storedType = item.type || 'item'; // For legacy tableStructure rows

                // Logic: Match Name AND ensure it's not a header/total row
                if (storedName === searchItem && storedType === 'item') {
                    const rate = parseFloat(item.rate || 0);
                    
                    if (rate > 0) {
                        // FOUND THE LATEST RATE! Return immediately.
                        return {
                            rate: rate,
                            discountType: item.discountType || 'none',
                            discountValue: parseFloat(item.discountValue) || 0
                        };
                    }
                }
            }
        }

        return null; // No match found in history

    } catch (error) {
        console.error('Error getting customer rate suggestion:', error);
        return null;
    }
}

// Sync rates to all tables (input, bill view, GST view)
function syncRateToOtherTables(itemId, newRate, newAmount, particularsHtml = null, discountType = null, discountValue = null) {
    // Sync to regular bill table (copyListManual)
    const copyRow = document.querySelector(`#copyListManual tr[data-id="${itemId}"]`);
    if (copyRow) {
        const cells = copyRow.children;
        cells[4].textContent = parseFloat(newRate).toFixed(2);
        cells[5].textContent = parseFloat(newAmount).toFixed(2);

        if (particularsHtml) cells[1].innerHTML = particularsHtml;
        if (discountType !== null) copyRow.setAttribute('data-discount-type', discountType);
        if (discountValue !== null) copyRow.setAttribute('data-discount-value', discountValue);
    }

    // Sync to GST table if in GST mode
    if (isGSTMode) {
        const gstRow = document.querySelector(`#gstCopyListManual tr[data-id="${itemId}"]`);
        if (gstRow) {
            const cells = gstRow.children;
            cells[5].textContent = parseFloat(newRate).toFixed(2); // Rate column
            cells[6].textContent = parseFloat(newAmount).toFixed(2); // Amount column

            // FIXED: Update HTML and Attributes on GST Row
            if (particularsHtml) cells[1].innerHTML = particularsHtml;
            if (discountType !== null) gstRow.setAttribute('data-discount-type', discountType);
            if (discountValue !== null) gstRow.setAttribute('data-discount-value', discountValue);
        }
    }
}

// Check and apply customer-specific rates to existing items
// Check and apply customer-specific rates to existing items
async function checkAndApplyCustomerRates(paramIdentifier) {
    if (!autoApplyCustomerRates) return;

    try {
        // --- RESTRICTION: Regular Mode only runs for 'Invoice' Type ---
        if (!isGSTMode) {
            const billTypeEl = document.getElementById('reg-modal-type-select');
            const currentType = billTypeEl ? billTypeEl.value : 'Invoice';

            if (currentType !== 'Invoice') {
                return; // Abort if not Invoice
            }
        }
        // -------------------------------------------------------------

        // Determine Identifier based on Mode
        let identifier = null;

        if (isGSTMode) {
            // GST Mode: Use GSTIN
            const displayGstin = document.getElementById('billToGstin')?.textContent.trim();
            const inputGstin = document.getElementById('consignee-gst')?.value.trim();

            if (displayGstin && displayGstin !== 'customer 15-digit GSTIN' && displayGstin !== 'N/A') {
                identifier = displayGstin;
            } else if (inputGstin) {
                identifier = inputGstin;
            }
        } else {
            // Regular Mode: Use Customer Name
            identifier = paramIdentifier || document.getElementById('custName')?.value.trim() || window.currentCustomer;
        }

        if (!identifier) return;

        // --- FIX: Ensure Global Variable is Updated ---
        // This fixes the issue where 'save' button passes the name but the fetcher doesn't see it
        window.currentCustomer = identifier;
        // ----------------------------------------------

        const items = document.querySelectorAll('#createListManual tbody tr[data-id]');
        let appliedCount = 0;

        for (const row of items) {
            const cells = row.children;
            const particularsDiv = cells[1];
            const itemName = particularsDiv.querySelector('.itemNameClass')?.textContent.trim();

            if (itemName) {
                const suggestion = await getCustomerRateSuggestion(identifier, itemName);

                if (suggestion) {
                    const { rate: suggestedRate, discountType, discountValue } = suggestion;

                    // 1. Update Rate Visuals & Data
                    cells[4].textContent = parseFloat(suggestedRate).toFixed(2);
                    row.setAttribute('data-rate', parseFloat(suggestedRate).toFixed(8));

                    // 2. Update Discount Attributes
                    row.setAttribute('data-discount-type', discountType);
                    row.setAttribute('data-discount-value', discountValue);

                    // 3. Recalculate Quantity
                    const baseQuantity = parseFloat(row.getAttribute('data-original-quantity') || cells[2].textContent);
                    const dimensionType = row.getAttribute('data-dimension-type') || 'none';

                    let finalQuantity = baseQuantity;

                    const dimValues = JSON.parse(row.getAttribute('data-dimension-values') || '[0,0,0]');
                    const dimToggles = JSON.parse(row.getAttribute('data-dimension-toggles') || '{"toggle1":true,"toggle2":true,"toggle3":true}');
                    const dimUnit = row.getAttribute('data-dimension-unit') || 'inch';
                    const convertUnit = row.getAttribute('data-convert-unit') || 'none';

                    if (dimensionType !== 'none' && dimensionType !== 'dozen') {
                        const v1 = dimToggles.toggle1 ? dimValues[0] : 1;
                        const v2 = dimToggles.toggle2 ? dimValues[1] : 1;
                        const v3 = dimToggles.toggle3 ? dimValues[2] : 1;

                        let rawResult = 0;
                        let activeDimensionCount = 0;

                        switch (dimensionType) {
                            case 'length':
                                rawResult = v1;
                                if (dimToggles.toggle1) activeDimensionCount++;
                                break;
                            case 'widthXheight':
                            case 'widthXdepth':
                            case 'lengthXheight':
                            case 'lengthXwidth':
                            case 'lengthXdepth':
                                rawResult = v1 * v2;
                                if (dimToggles.toggle1) activeDimensionCount++;
                                if (dimToggles.toggle2) activeDimensionCount++;
                                break;
                            case 'widthXheightXdepth':
                            case 'lengthXwidthXheight':
                            case 'lengthXheightXdepth':
                            case 'lengthXwidthXdepth':
                                rawResult = v1 * v2 * v3;
                                if (dimToggles.toggle1) activeDimensionCount++;
                                if (dimToggles.toggle2) activeDimensionCount++;
                                if (dimToggles.toggle3) activeDimensionCount++;
                                break;
                            default:
                                rawResult = 0;
                        }

                        let conversionFactor = 1;
                        if (convertUnit !== 'none' && convertUnit !== dimUnit) {
                            const unitFactors = { 'mm': 1, 'cm': 10, 'inch': 25.4, 'ft': 304.8, 'mtr': 1000 };
                            if (unitFactors[dimUnit] && unitFactors[convertUnit]) {
                                const linearFactor = unitFactors[dimUnit] / unitFactors[convertUnit];
                                const power = activeDimensionCount > 0 ? activeDimensionCount : 1;
                                conversionFactor = Math.pow(linearFactor, power);
                            }
                        }
                        finalQuantity = baseQuantity * rawResult * conversionFactor;
                    }
                    else if (dimensionType === 'dozen') {
                        finalQuantity = baseQuantity / 12;
                    }

                    // 4. Calculate Amounts
                    let baseAmount = finalQuantity * suggestedRate;
                    let discountAmount = 0;

                    if (discountType !== 'none' && discountValue > 0) {
                        switch (discountType) {
                            case 'percent_per_unit':
                                discountAmount = (suggestedRate * (discountValue / 100)) * finalQuantity; break;
                            case 'amt_per_unit':
                                discountAmount = discountValue * finalQuantity; break;
                            case 'percent_on_amount':
                                discountAmount = baseAmount * (discountValue / 100); break;
                            case 'amt_on_amount':
                                discountAmount = discountValue; break;
                        }
                    }

                    const finalAmount = storeWithPrecision(baseAmount - discountAmount);
                    const safeFinalAmount = finalAmount < 0 ? 0 : finalAmount;

                    cells[5].textContent = safeFinalAmount.toFixed(2);
                    row.setAttribute('data-amount', safeFinalAmount.toFixed(8));

                    // 5. Update Text
                    const notes = particularsDiv.querySelector('.notes')?.textContent || '';
                    const storedUnit = cells[3].textContent;
                    const dimDisplayText = getDimensionDisplayText(dimensionType, dimValues, dimUnit, dimToggles);

                    const particularsHtml = formatParticularsManual(
                        itemName, notes, dimDisplayText, baseQuantity, finalQuantity, suggestedRate,
                        dimensionType, dimUnit, storedUnit, discountType, discountValue, dimToggles, convertUnit
                    );

                    cells[1].innerHTML = particularsHtml;
                    syncRateToOtherTables(row.getAttribute('data-id'), suggestedRate, safeFinalAmount, particularsHtml, discountType, discountValue);
                    appliedCount++;
                }
            }
        }

        if (appliedCount > 0) {
            updateTotal();
            if (isGSTMode) updateGSTTaxCalculation();
            await saveToLocalStorage();
            if (typeof showNotification === 'function') {
                showNotification(`Applied previous rates for ${identifier}`, 'info', 3000);
            }
        }

    } catch (error) {
        console.error('Error applying customer rates:', error);
    }
}

/* 3. GET PAYMENTS (Fixed for Ledger - Case Insensitive) */
async function getCustomerPayments(customerName, gstin, type = 'payment', filters = {}) {
    const storeName = type === 'payment' ? 'customerPayments' : 'customerCreditNotes';
    if(!customerName) return [];

    try {
        const allRecords = await getAllFromDB(storeName);
        if (!allRecords || allRecords.length === 0) return [];

        const searchName = customerName.toLowerCase().trim();
        const searchGST = gstin ? gstin.toLowerCase().trim() : '';

        let records = allRecords.filter(record => {
            const rVal = record.value || record; // Handle wrapped vs raw objects
            
            // 1. Check GSTIN match
            if (searchGST && rVal.gstin) {
                return rVal.gstin.toLowerCase().trim() === searchGST;
            } 
            
            // 2. Check Name Match (Case Insensitive)
            const recName = (rVal.customerName || '').toLowerCase().trim();
            return recName === searchName;
        }).map(r => r.value || r);

        // Apply filters if function exists
        if (typeof applyPaymentFilters === 'function') {
            records = applyPaymentFilters(records, filters);
        }

        console.log(`[PAYMENTS] Found ${records.length} ${type}s`);
        return records;

    } catch (error) {
        console.error(`[PAYMENTS] Error fetching ${type}:`, error);
        return [];
    }
}

/* 2. SEARCH FILTER (Added Receipt No & Ref No Support) */
function applyPaymentFilters(records, filters) {
    if (!filters) return records;

    let filtered = [...records];

    // 1. Search Filter
    if (filters.search) {
        const term = filters.search.toLowerCase().trim();
        filtered = filtered.filter(item => {
            // Existing checks
            const method = (item.method || '').toLowerCase();
            const amount = (item.amount || '').toString();
            const notes = (item.notes || '').toLowerCase();
            const date = (item.date || '').toLowerCase();
            
            // NEW: Receipt Number Check
            const receipt = (item.receiptNo || '').toString();
            
            // NEW: Reference Check (Construct the string to search against)
            const type = item.refType || '';
            const prefix = item.refPrefix || '';
            const billNo = item.refBillNo || '';
            const refDisplay = item.refDisplay || '';
            const fullRef = `${type} ${prefix}${billNo} ${refDisplay}`.toLowerCase();

            return method.includes(term) || 
                   amount.includes(term) || 
                   notes.includes(term) || 
                   date.includes(term) ||
                   receipt.includes(term) || // Search by "1", "2"
                   fullRef.includes(term);   // Search by "Invoice", "001"
        });
    }

    // 2. Sort Filter
    if (filters.sortBy) {
        filtered.sort((a, b) => {
            let valA, valB;
            
            if (filters.sortBy === 'date') {
                valA = new Date(convertDateToISO(a.date));
                valB = new Date(convertDateToISO(b.date));
            } else if (filters.sortBy === 'amount') {
                valA = parseFloat(a.amount);
                valB = parseFloat(b.amount);
            }

            if (filters.sortOrder === 'asc') {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });
    }

    // 3. Period Filter
    if (filters.period && filters.period !== 'all') {
        const today = new Date();
        const cutoffDate = new Date();
        
        if (filters.period === '1month') cutoffDate.setMonth(today.getMonth() - 1);
        if (filters.period === '3months') cutoffDate.setMonth(today.getMonth() - 3);
        if (filters.period === '6months') cutoffDate.setMonth(today.getMonth() - 6);

        filtered = filtered.filter(item => {
            const itemDate = new Date(convertDateToISO(item.date));
            return itemDate >= cutoffDate;
        });
    }

    return filtered;
}

// Delete payment/credit note
async function deletePaymentRecord(recordId, type = 'payment') {
    const storeName = type === 'payment' ? 'customerPayments' : 'customerCreditNotes';
    await removeFromDB(storeName, recordId);
}

async function loadGSTCustomers() {
    try {
        const customers = await getAllFromDB('gstCustomers');
        gstCustomers = customers.map(c => c.value);
    } catch (error) {
        console.error('Error loading GST customers:', error);
        gstCustomers = [];
    }
}

async function getAllFromDB(storeName) {
    await ensureDBInitialized();

    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        try {
            // Check if the object store exists
            if (!db.objectStoreNames.contains(storeName)) {
                console.warn(`Object store '${storeName}' does not exist, returning empty array`);
                resolve([]);
                return;
            }

            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        } catch (error) {
            console.error(`Error accessing store '${storeName}':`, error);
            resolve([]); // Return empty array instead of rejecting
        }
    });
}

// Notification System
function showNotification(message, type = 'info', duration = 2000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Auto remove after duration
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);

    return notification;
}

// Custom Confirm Dialog
function showConfirm(message) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirm-dialog');
        const messageEl = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');

        messageEl.textContent = message;
        confirmResolve = resolve;

        dialog.classList.add('active');

        // Remove previous event listeners
        yesBtn.onclick = null;
        noBtn.onclick = null;

        // Add new event listeners
        yesBtn.onclick = () => {
            dialog.classList.remove('active');
            confirmResolve(true);
        };

        noBtn.onclick = () => {
            dialog.classList.remove('active');
            confirmResolve(false);
        };
    });
}

// Close confirm dialog when clicking outside
document.getElementById('confirm-dialog').addEventListener('click', function (e) {
    if (e.target === this) {
        this.classList.remove('active');
        if (confirmResolve) {
            confirmResolve(false);
        }
    }
});

function handleDiscountTypeChange() {
    const type = document.getElementById('discount-type-select').value;
    const percentGroup = document.getElementById('percent-input-group');
    const amountGroup = document.getElementById('amount-input-group');

    // Hide both initially
    percentGroup.style.display = 'none';
    amountGroup.style.display = 'none';

    // Show relevant input
    if (type === 'percent') {
        percentGroup.style.display = 'flex';
    } else if (type === 'amount') {
        amountGroup.style.display = 'flex';
    }
}

// Get current subtotal for discount calculations
function getCurrentSubtotal() {
    if (isGSTMode) {
        // Get from actual stored items, not displayed total
        const items = document.querySelectorAll('#createListManual tbody tr[data-id]');
        let subtotal = 0;

        items.forEach(row => {
            const amount = parseFloat(row.getAttribute('data-amount')) || 0;
            subtotal = storeWithPrecision(subtotal + amount);
        });

        return subtotal;
    } else {
        // Get from actual stored items, not displayed total
        const items = document.querySelectorAll('#createListManual tbody tr[data-id]');
        let subtotal = 0;

        items.forEach(row => {
            const amount = parseFloat(row.getAttribute('data-amount')) || 0;
            subtotal = storeWithPrecision(subtotal + amount);
        });

        return subtotal;
    }
}

function toggleDiscountInputs() {
    const container = document.getElementById('discount-inputs-container');
    const button = document.getElementById('toggleDiscountBtn');

    if (container.style.display === 'none') {
        container.style.display = 'flex';
        button.style.backgroundColor = '#27ae60'; // Green when active
    } else {
        container.style.display = 'none';
        button.style.backgroundColor = ''; // Reset to default
    }
}

function toggleDimensionInputs() {
    const container = document.getElementById('dimension-inputs-container');
    const button = document.getElementById('toggleDimensionBtn');
    const convertBtn = document.getElementById('toggleConvertBtn');

    if (container.style.display === 'none') {
        container.style.display = 'flex';
        button.style.backgroundColor = '#3498db';
        if (convertBtn) convertBtn.style.display = 'inline-block';
    } else {
        container.style.display = 'none';
        button.style.backgroundColor = '';
        if (convertBtn) {
            convertBtn.style.display = 'none';
            convertBtn.classList.remove('active');
        }

        // Reset convert state
        const convertSelect = document.getElementById('convertUnit');
        if (convertSelect) {
            convertSelect.style.display = 'none';
            convertSelect.value = 'none';
        }
        currentConvertUnit = 'none';
    }
}

let rowCounterManual = 1;
let currentlyEditingRowIdManual = null;
let historyStackManual = [];
let historyIndexManual = -1;
let rateColumnHidden = false;
let currentView = 'input';
let showDimensions = true;

const themes = ['blue', 'green', 'red', 'purple', 'orange', 'dark', 'high-contrast', 'teal', 'indigo', 'brown', 'pink', 'cyan', 'lime', 'deep-purple', 'amber', 'deep-orange', 'blue-grey', 'navy', 'charcoal', 'burgundy', 'forest', 'slate', 'lavender', 'mint', 'peach', 'sage', 'rose-gold', 'nebula', 'cosmic', 'galaxy', 'stellar', 'asteroid', 'rainbow'];
let currentThemeIndex = 0;


// let discountPercent = 0;
// let gstPercent = 0;

let currentDimensions = {
    type: 'none',
    unit: 'ft',
    values: [0, 0, 0],
    calculatedArea: 0
};

let currentlyEditingItemId = null;
let currentlyEditingCustomerId = null;

function getModeSpecificVars() {
    return {
        rowCounter: rowCounterManual,
        currentlyEditingRowId: currentlyEditingRowIdManual,
        historyStack: historyStackManual,
        historyIndex: historyIndexManual,
        createListId: 'createListManual',
        copyListId: 'copyListManual',
        totalAmountId: 'createTotalAmountManual',
        copyTotalAmountId: 'copyTotalAmount',
        localStorageKey: 'billDataManual',
        historyStorageKey: 'billHistoryManual',
        addRowFunc: addRowManual,
        updateRowFunc: updateRowManual,
        editRowFunc: editRowManual,
        removeRowFunc: removeRowManual
    };
}

function toggleSettingsSidebar() {
    const sidebar = document.getElementById("settings-sidebar");
    const overlay = document.getElementById("settings-overlay");
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
}

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        const settingsSidebar = document.getElementById("settings-sidebar");
        if (settingsSidebar.classList.contains("open")) {
            toggleSettingsSidebar();
        }
    }
});

document.addEventListener('DOMContentLoaded', async function () {
    try {
        await initDB();
        await loadFromLocalStorage();
        await loadHistoryFromLocalStorage();
        await loadSavedTheme();
        await loadTaxSettings();
        // await loadSavedItems();
        await loadSavedCustomers();
        await loadBillHeadings();
        await loadBrandingSettings();

        // Load GST mode settings
        const gstModeSetting = await getFromDB('gstMode', 'isGSTMode');
        isGSTMode = gstModeSetting || false;
        await loadCompanyInfo();
        await loadGSTCustomers();

        updateUIForGSTMode();

        // === FIX: Force Adjustment Calculation on Load ===
        // This ensures the total table renders correctly after refresh
        setTimeout(() => {
            updateTotal(); // Triggers calculateAdjustments using the loaded adjustmentChain
        }, 100);

        saveStateToHistory();

        // Fix profit state after page refresh
        restoreProfitStateAfterRefresh();

        // Safe date initialization
        const dateInput = document.getElementById('billDate');
        if (dateInput && !dateInput.value) {
            const today = new Date();
            const day = String(today.getDate()).padStart(2, '0');
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const year = today.getFullYear();
            dateInput.value = `${day}-${month}-${year}`;
            initializeDateInputs();
            saveToLocalStorage();
        }

        // Initialize payment and ledger systems
        setupPaymentDialog();

        // Safe ledger period initialization
        const fromDateInput = document.getElementById('from-date-input');
        if (fromDateInput) {
            // Set default from date to 3 months ago for "From Date" option
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            fromDateInput.value = threeMonthsAgo.toISOString().split('T')[0];
        }

        // Safe select all dates event listener
        const selectAllDates = document.getElementById('select-all-dates');
        if (selectAllDates) {
            selectAllDates.addEventListener('change', handleSelectAllChange);
        }

        // Close payment dialog
        const closePaymentBtn = document.getElementById('close-payment-dialog');
        if (closePaymentBtn) {
            closePaymentBtn.addEventListener('click', closePaymentDialog);
        }

        // Close ledger dialog
        const closeLedgerBtn = document.getElementById('close-ledger-dialog');
        if (closeLedgerBtn) {
            closeLedgerBtn.addEventListener('click', closeLedgerDialog);
        }

        // Setup payment type toggle
        setupPaymentTypeToggle();

        // Close dialogs when clicking outside
        const paymentDialog = document.getElementById('payment-dialog');
        if (paymentDialog) {
            paymentDialog.addEventListener('click', function (e) {
                if (e.target === this) closePaymentDialog();
            });
        }

        const ledgerDialog = document.getElementById('ledger-dialog');
        if (ledgerDialog) {
            ledgerDialog.addEventListener('click', function (e) {
                if (e.target === this) closeLedgerDialog();
            });
        }

        // Close purchase price dialog
        const closePurchaseBtn = document.getElementById('close-purchase-dialog');
        if (closePurchaseBtn) {
            closePurchaseBtn.addEventListener('click', closePurchasePriceDialog);
        }

        // Close purchase dialog when clicking outside
        const purchaseDialog = document.getElementById('purchase-price-dialog');
        if (purchaseDialog) {
            purchaseDialog.addEventListener('click', function (e) {
                if (e.target === this) closePurchasePriceDialog();
            });
        }

        // Validate purchase price inputs on change
        document.addEventListener('input', function (e) {
            if (e.target.classList.contains('purchase-price-input')) {
                const value = parseFloat(e.target.value) || 0;
                if (value > 0) {
                    e.target.style.borderColor = '';
                }
            }
        });

        // UPDATED DIMENSION INPUT EVENT LISTENERS
        const dimension1 = document.getElementById('dimension1');
        if (dimension1) {
            dimension1.addEventListener('input', function () {
                currentDimensions.values[0] = parseFloat(this.value) || 0;
                calculateDimensions();
            });
            dimension1.addEventListener('blur', function () {
                if (this.value) {
                    this.value = parseFloat(this.value).toFixed(2);
                    currentDimensions.values[0] = parseFloat(this.value);
                    calculateDimensions();
                }
            });
        }

        const dimension2 = document.getElementById('dimension2');
        if (dimension2) {
            dimension2.addEventListener('input', function () {
                currentDimensions.values[1] = parseFloat(this.value) || 0;
                calculateDimensions();
            });
            dimension2.addEventListener('blur', function () {
                if (this.value) {
                    this.value = parseFloat(this.value).toFixed(2);
                    currentDimensions.values[1] = parseFloat(this.value);
                    calculateDimensions();
                }
            });
        }

        const dimension3 = document.getElementById('dimension3');
        if (dimension3) {
            dimension3.addEventListener('input', function () {
                currentDimensions.values[2] = parseFloat(this.value) || 0;
                calculateDimensions();
            });
            dimension3.addEventListener('blur', function () {
                if (this.value) {
                    this.value = parseFloat(this.value).toFixed(2);
                    currentDimensions.values[2] = parseFloat(this.value);
                    calculateDimensions();
                }
            });
        }

        // Customer name event listeners
        const custName = document.getElementById('custName');
        if (custName) {
            custName.addEventListener('input', async function () {
                const customerName = this.value.trim();
                if (customerName) {
                    window.currentCustomer = customerName;
                    if (autoApplyCustomerRates) {
                        await checkAndApplyCustomerRates(customerName);
                    }
                }
            });
        }

        // Add customer rate suggestion listeners
        if (custName) {
            custName.addEventListener('input', async function () {
                const customerName = this.value.trim();
                if (customerName) {
                    window.currentCustomer = customerName;
                    if (autoApplyCustomerRates) {
                        await checkAndApplyCustomerRates(customerName);
                    }
                }
            });
        }

        // Add click handler for existing terms
        document.addEventListener('click', function (e) {
            const termsDiv = e.target.closest('.bill-footer-list[data-editable="true"]');
            if (termsDiv) {
                e.preventDefault();
                e.stopPropagation();
                editExistingTerms(termsDiv);
            }
        });

        // Add event delegation for dynamically created ledger and payment buttons
        document.addEventListener('click', function (e) {
            // Handle ledger buttons
            if (e.target.classList.contains('btn-ledger') || e.target.closest('.btn-ledger')) {
                const button = e.target.classList.contains('btn-ledger') ? e.target : e.target.closest('.btn-ledger');
                const customerName = button.getAttribute('data-customer-name');
                const gstin = button.getAttribute('data-gstin');

                if (customerName) {
                    openLedgerDialog(customerName, gstin);
                }
            }

            // auto select cgst or igst
            const consigneeGST = document.getElementById('consignee-gst');
            if (consigneeGST) {
                consigneeGST.addEventListener('input', function () {
                    const cGSTVal = this.value.trim();
                    const companyGST = document.getElementById('company-gst').value.trim();

                    if (cGSTVal.length >= 2 && companyGST.length >= 2) {
                        const consigneeStateCode = cGSTVal.substring(0, 2);
                        const companyStateCode = companyGST.substring(0, 2);

                        const transactionTypeSelect = document.getElementById('transaction_type');
                        if (consigneeStateCode !== companyStateCode) {
                            transactionTypeSelect.value = 'interstate';
                        } else {
                            transactionTypeSelect.value = 'intrastate';
                        }
                    }
                });
            }

            // Handle payment buttons
            if (e.target.classList.contains('btn-payment') || e.target.closest('.btn-payment')) {
                const button = e.target.classList.contains('btn-payment') ? e.target : e.target.closest('.btn-payment');
                const customerName = button.getAttribute('data-customer-name');
                const gstin = button.getAttribute('data-gstin');

                if (customerName) {
                    openPaymentDialog(customerName, gstin);
                }
            }
        });

        // Add this to hide ALL suggestion boxes when clicking elsewhere
        document.addEventListener('click', function (e) {
            const suggestionPairs = [
                { inputId: 'itemNameManual', boxId: 'item-suggestions' },
                { inputId: 'consignee-name', boxId: 'consignee-suggestions' },
                { inputId: 'buyer-name', boxId: 'buyer-suggestions' },
                { inputId: 'custName', boxId: 'regular-customer-suggestions' },
                { inputId: 'selectUnit', boxId: 'unit-suggestions' },
                { inputId: 'saved-select-unit', boxId: 'saved-unit-suggestions' }
            ];

            suggestionPairs.forEach(pair => {
                const input = document.getElementById(pair.inputId);
                const box = document.getElementById(pair.boxId);

                if (input && box) {
                    if (e.target !== input && !box.contains(e.target)) {
                        box.style.display = 'none';
                    }
                }
            });
        });

        // AUTO SCROLL ON LOAD
        // Restore Auto Scroll Button State
        const btn = document.getElementById('btn-auto-scroll');
        if (btn) {
            if (autoScrollEnabled) {
                btn.style.backgroundColor = '#80a2c2c4';
                const label = btn.querySelector('.sidebar-label');
                if (label) label.textContent = 'Auto Scroll : ON';
            } else {
                btn.style.backgroundColor = '';
                const label = btn.querySelector('.sidebar-label');
                if (label) label.textContent = 'Auto Scroll : OFF';
            }
        }
        // 


        // OCR start

        // OVR end

        // ADD THIS: Close restored bills modal
        const closeRestoredBtn = document.querySelector('#restored-bills-modal .close');
        if (closeRestoredBtn) {
            closeRestoredBtn.addEventListener('click', closeRestoredBillsModal);
        }

        // // Item name input listener
        // const itemNameManual = document.getElementById('itemNameManual');
        // if (itemNameManual) {
        //     itemNameManual.addEventListener('input', handleItemNameInput);
        // }

        // Load custom payment methods on startup
        await loadCustomPaymentMethods();

        // Add this to your DOMContentLoaded function
        await loadAutoApplySetting();
        // Load customer dialog state
        await loadCustomerDialogState();
        setupCustomerDialogAutoSave();

        await loadVendorState();   // Restore mode and inputs
        setupVendorAutoSave();     // Attach listeners for future typing

    } catch (error) {
        console.error('Error during initialization:', error);
    }
});


function initializeDateInputs() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayFormatted = `${day}-${month}-${year}`;

    // Set today's date for all date inputs
    const dateInputs = [
        'billDate',
        'invoice-date',
        'payment-date',
        'from-date',
        'to-date'
    ];

    dateInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input && !input.value) {
            input.value = todayFormatted;
        }
    });
}

function toggleConvertOptions() {
    const convertSelect = document.getElementById('convertUnit');
    const btn = document.getElementById('toggleConvertBtn');

    if (convertSelect.style.display === 'none') {
        convertSelect.style.display = 'inline-block';
        btn.classList.add('active');
    } else {
        convertSelect.style.display = 'none';
        convertSelect.value = 'none';
        currentConvertUnit = 'none';
        btn.classList.remove('active');
        // Recalculate without conversion
        calculateDimensions();
    }
}

function handleConvertUnitChange() {
    currentConvertUnit = document.getElementById('convertUnit').value;
}

function getConversionFactor(fromUnit, toUnit, power) {
    if (fromUnit === toUnit || toUnit === 'none' || !toUnit) return 1;

    const factors = {
        ft: { inch: 12, mtr: 0.3048, cm: 30.48, mm: 304.8 },
        inch: { ft: 1 / 12, mtr: 0.0254, cm: 2.54, mm: 25.4 },
        mtr: { ft: 3.28084, inch: 39.3701, cm: 100, mm: 1000 },
        cm: { ft: 0.0328084, inch: 0.393701, mtr: 0.01, mm: 10 },
        mm: { ft: 0.00328084, inch: 0.0393701, mtr: 0.001, cm: 0.1 }
    };

    if (!factors[fromUnit] || !factors[fromUnit][toUnit]) return 1;

    const baseFactor = factors[fromUnit][toUnit];
    return Math.pow(baseFactor, power);
}

function handleDimensionTypeChange() {
    const dimensionType = document.getElementById('dimensionType').value;
    const measurementUnit = document.getElementById('measurementUnit');
    const dimensionInputs = document.getElementById('dimensionInputs');

    const dim1 = document.getElementById('dimension1');
    const dim2 = document.getElementById('dimension2');
    const dim3 = document.getElementById('dimension3');
    const dim1Toggle = document.getElementById('dimension1-toggle');
    const dim2Toggle = document.getElementById('dimension2-toggle');
    const dim3Toggle = document.getElementById('dimension3-toggle');

    currentDimensions.type = dimensionType;

    // Reset values
    if (!dim1.value) dim1.value = '';
    if (!dim2.value) dim2.value = '';
    if (!dim3.value) dim3.value = '';

    // Reset toggles
    if (dim1Toggle) dim1Toggle.checked = true;
    if (dim2Toggle) dim2Toggle.checked = true;
    if (dim3Toggle) dim3Toggle.checked = true;

    if (dimensionType === 'none') {
        if (measurementUnit) measurementUnit.style.display = 'none';
        if (dimensionInputs) dimensionInputs.style.display = 'none';
    } else if (dimensionType === 'dozen') {
        if (measurementUnit) measurementUnit.style.display = 'none';
        if (dimensionInputs) dimensionInputs.style.display = 'none';
        const quantityInput = document.getElementById('quantityManual');
        if (quantityInput && quantityInput.value) {
            const quantity = parseFloat(quantityInput.value);
            quantityInput.value = (quantity / 12).toFixed(2);
        }
    } else {
        if (measurementUnit) measurementUnit.style.display = 'inline-block';
        if (dimensionInputs) dimensionInputs.style.display = 'flex';

        // Show/hide appropriate inputs
        const inputs = document.querySelectorAll('#dimensionInputs .dimension-input-with-toggle');
        inputs.forEach(input => input.style.display = 'none');

        if (inputs[0]) inputs[0].style.display = 'flex';
        if (dim1) dim1.style.display = 'inline-block';

        switch (dimensionType) {
            case 'length': if (dim1) dim1.placeholder = 'Length'; break;
            case 'widthXheight':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Width';
                if (dim2) dim2.placeholder = 'Height';
                break;
            case 'widthXheightXdepth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (inputs[2]) inputs[2].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Width';
                if (dim2) dim2.placeholder = 'Height';
                if (dim3) dim3.placeholder = 'Depth';
                break;
            case 'lengthXwidthXheight':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (inputs[2]) inputs[2].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Width';
                if (dim3) dim3.placeholder = 'Height';
                break;
            case 'widthXdepth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Width';
                if (dim2) dim2.placeholder = 'Depth';
                break;
            case 'lengthXheightXdepth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (inputs[2]) inputs[2].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Height';
                if (dim3) dim3.placeholder = 'Depth';
                break;
            case 'lengthXdepth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Depth';
                break;
            case 'lengthXheight':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Height';
                break;
            case 'lengthXwidth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Width';
                break;
            case 'lengthXwidthXdepth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (inputs[2]) inputs[2].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Width';
                if (dim3) dim3.placeholder = 'Depth';
                break;
        }
    }

    calculateDimensions();
}

// Add function to update dimension calculation based on toggles
function updateDimensionCalculation() {
    calculateDimensions();
}

function handleMeasurementUnitChange() {
    const newUnit = document.getElementById('measurementUnit').value;
    const oldUnit = currentDimensions.unit;

    if (oldUnit !== newUnit) {
        convertDimensions(oldUnit, newUnit);
    }

    currentDimensions.unit = newUnit;
    calculateDimensions();
}

function convertDimensions(fromUnit, toUnit) {
    const conversionFactors = {
        ft: { inch: 12, mtr: 0.3048, cm: 30.48, mm: 304.8 },
        inch: { ft: 1 / 12, mtr: 0.0254, cm: 2.54, mm: 25.4 },
        mtr: { ft: 3.28084, inch: 39.3701, cm: 100, mm: 1000 },
        cm: { ft: 0.0328084, inch: 0.393701, mtr: 0.01, mm: 10 },
        mm: { ft: 0.00328084, inch: 0.0393701, mtr: 0.001, cm: 0.1 }
    };

    const factor = conversionFactors[fromUnit][toUnit];

    const dim1 = document.getElementById('dimension1');
    const dim2 = document.getElementById('dimension2');
    const dim3 = document.getElementById('dimension3');

    if (dim1.value) {
        dim1.value = (parseFloat(dim1.value) * factor).toFixed(4);
        currentDimensions.values[0] = parseFloat(dim1.value);
    }
    if (dim2.value && dim2.style.display !== 'none') {
        dim2.value = (parseFloat(dim2.value) * factor).toFixed(4);
        currentDimensions.values[1] = parseFloat(dim2.value);
    }
    if (dim3.value && dim3.style.display !== 'none') {
        dim3.value = (parseFloat(dim3.value) * factor).toFixed(4);
        currentDimensions.values[2] = parseFloat(dim3.value);
    }
}

function calculateDimensions() {
    const dim1 = document.getElementById('dimension1');
    const dim2 = document.getElementById('dimension2');
    const dim3 = document.getElementById('dimension3');
    const dim1Toggle = document.getElementById('dimension1-toggle');
    const dim2Toggle = document.getElementById('dimension2-toggle');
    const dim3Toggle = document.getElementById('dimension3-toggle');

    // Convert input values to numbers and update currentDimensions
    // BUT DON'T FORMAT THEM HERE - keep raw input for typing
    if (dim1.value) currentDimensions.values[0] = parseFloat(dim1.value) || 0;
    if (dim2.value && dim2.style.display !== 'none') currentDimensions.values[1] = parseFloat(dim2.value) || 0;
    if (dim3.value && dim3.style.display !== 'none') currentDimensions.values[2] = parseFloat(dim3.value) || 0;

    let calculatedValue = 0;
    const [v1, v2, v3] = currentDimensions.values;

    // Apply toggle states - if unchecked, use 1 (no effect on multiplication)
    const effectiveV1 = dim1Toggle.checked ? v1 : 1;
    const effectiveV2 = dim2Toggle.checked ? v2 : 1;
    const effectiveV3 = dim3Toggle.checked ? v3 : 1;

    switch (currentDimensions.type) {
        case 'length':
            calculatedValue = effectiveV1;
            break;
        case 'widthXheight':
            calculatedValue = effectiveV1 * effectiveV2;
            break;
        case 'widthXheightXdepth':
            calculatedValue = effectiveV1 * effectiveV2 * effectiveV3;
            break;
        case 'lengthXwidthXheight':
            calculatedValue = effectiveV1 * effectiveV2 * effectiveV3;
            break;
        case 'widthXdepth':
            calculatedValue = effectiveV1 * effectiveV2;
            break;
        case 'lengthXheightXdepth':
            calculatedValue = effectiveV1 * effectiveV2 * effectiveV3;
            break;
        case 'lengthXdepth':
            calculatedValue = effectiveV1 * effectiveV2;
            break;
        case 'lengthXheight':
            calculatedValue = effectiveV1 * effectiveV2;
            break;
        case 'lengthXwidth':
            calculatedValue = effectiveV1 * effectiveV2;
            break;
        case 'lengthXwidthXdepth':
            calculatedValue = effectiveV1 * effectiveV2 * effectiveV3;
            break;
        default:
            calculatedValue = 0;
    }

    currentDimensions.calculatedArea = calculatedValue;

    // REMOVE THE FORMATTING FROM HERE - it interferes with typing
    // We'll format only when the input loses focus or when saving
}

function getDimensionDisplayText(dimensionType = null, dimensionValues = null, dimensionUnit = null, toggleStates = null) {
    // Use passed parameters or fall back to current state
    const type = dimensionType || currentDimensions.type;
    const unit = dimensionUnit || currentDimensions.unit;

    if (type === 'none' || type === 'dozen') {
        return '';
    }

    // Handle both array and object formats for dimension values
    let values = dimensionValues || currentDimensions.values;
    let v1 = 0, v2 = 0, v3 = 0;

    if (Array.isArray(values)) {
        [v1, v2, v3] = values;
    } else if (typeof values === 'object' && values !== null) {
        // Extract values from object
        v1 = values[0] || values.values?.[0] || 0;
        v2 = values[1] || values.values?.[1] || 0;
        v3 = values[2] || values.values?.[2] || 0;
    }

    // Get toggle states
    const toggles = toggleStates || {
        toggle1: true,
        toggle2: true,
        toggle3: true
    };

    // Count how many dimensions are checked (actually used in calculation)
    const checkedCount = [toggles.toggle1, toggles.toggle2, toggles.toggle3].filter(Boolean).length;

    // DYNAMIC UNIT SUFFIX BASED ON CHECKED DIMENSIONS
    let unitSuffix = '';
    switch (checkedCount) {
        case 1:
            unitSuffix = unit; // Linear (1 dimension)
            break;
        case 2:
            unitSuffix = unit + '²'; // Area (2 dimensions)
            break;
        case 3:
            unitSuffix = unit + '³'; // Volume (3 dimensions)
            break;
        default:
            unitSuffix = unit; // Fallback
    }

    // Format values
    const formattedV1 = formatNumber(v1);
    const formattedV2 = formatNumber(v2);
    const formattedV3 = formatNumber(v3);

    let dimensionText = '';

    switch (type) {
        case 'length':
            dimensionText = `${toggles.toggle1 ? 'L' : '<span style="color: red">L</span>'} ${formattedV1}${unit}`;
            break;
        case 'widthXheight':
            dimensionText = `${toggles.toggle1 ? 'W' : '<span style="color: red">W</span>'} ${formattedV1}${unit} X ${toggles.toggle2 ? 'H' : '<span style="color: red">H</span>'} ${formattedV2}${unit}`;
            break;
        case 'widthXheightXdepth':
            dimensionText = `${toggles.toggle1 ? 'W' : '<span style="color: red">W</span>'} ${formattedV1}${unit} X ${toggles.toggle2 ? 'H' : '<span style="color: red">H</span>'} ${formattedV2}${unit} X ${toggles.toggle3 ? 'D' : '<span style="color: red">D</span>'} ${formattedV3}${unit}`;
            break;
        case 'lengthXwidthXheight':
            dimensionText = `${toggles.toggle1 ? 'L' : '<span style="color: red">L</span>'} ${formattedV1}${unit} X ${toggles.toggle2 ? 'W' : '<span style="color: red">W</span>'} ${formattedV2}${unit} X ${toggles.toggle3 ? 'H' : '<span style="color: red">H</span>'} ${formattedV3}${unit}`;
            break;
        case 'widthXdepth':
            dimensionText = `${toggles.toggle1 ? 'W' : '<span style="color: red">W</span>'} ${formattedV1}${unit} X ${toggles.toggle2 ? 'D' : '<span style="color: red">D</span>'} ${formattedV2}${unit}`;
            break;
        case 'lengthXheightXdepth':
            dimensionText = `${toggles.toggle1 ? 'L' : '<span style="color: red">L</span>'} ${formattedV1}${unit} X ${toggles.toggle2 ? 'H' : '<span style="color: red">H</span>'} ${formattedV2}${unit} X ${toggles.toggle3 ? 'D' : '<span style="color: red">D</span>'} ${formattedV3}${unit}`;
            break;
        case 'lengthXdepth':
            dimensionText = `${toggles.toggle1 ? 'L' : '<span style="color: red">L</span>'} ${formattedV1}${unit} X ${toggles.toggle2 ? 'D' : '<span style="color: red">D</span>'} ${formattedV2}${unit}`;
            break;
        case 'lengthXheight':
            dimensionText = `${toggles.toggle1 ? 'L' : '<span style="color: red">L</span>'} ${formattedV1}${unit} X ${toggles.toggle2 ? 'H' : '<span style="color: red">H</span>'} ${formattedV2}${unit}`;
            break;
        case 'lengthXwidth':
            dimensionText = `${toggles.toggle1 ? 'L' : '<span style="color: red">L</span>'} ${formattedV1}${unit} X ${toggles.toggle2 ? 'W' : '<span style="color: red">W</span>'} ${formattedV2}${unit}`;
            break;
        case 'lengthXwidthXdepth':
            dimensionText = `${toggles.toggle1 ? 'L' : '<span style="color: red">L</span>'} ${formattedV1}${unit} X ${toggles.toggle2 ? 'W' : '<span style="color: red">W</span>'} ${formattedV2}${unit} X ${toggles.toggle3 ? 'D' : '<span style="color: red">D</span>'} ${formattedV3}${unit}`;
            break;
    }

    return dimensionText;
}


// ==========================================
// AUTO RATE CONVERSION LOGIC (FINAL)
// ==========================================

let autoRateConversion = false;
let previousConvertUnit = 'none';

function toggleAutoRateConversion() {
    autoRateConversion = !autoRateConversion;

    // 1. Save state
    localStorage.setItem('billApp_autoRate', autoRateConversion);

    // 2. Update UI
    updateAutoRateUI();

    // 3. Notify
    if (autoRateConversion) {
        showNotification("Auto Rate Conversion Enabled", "success");
    } else {
        showNotification("Auto Rate Conversion Disabled", "info");
    }
}

// Helper: Update Button UI based on state
function updateAutoRateUI() {
    const btn = document.getElementById('btn-auto-rate');
    if (!btn) return;

    const label = btn.querySelector('.sidebar-label');
    const icon = btn.querySelector('.material-icons');

    if (autoRateConversion) {
        label.textContent = "Rate Convert : ON";
        icon.style.color = "#2ecc71"; // Green
        btn.style.backgroundColor = "#e8f5e9";
    } else {
        label.textContent = "Rate Convert: OFF";
        icon.style.color = ""; // Reset
        btn.style.backgroundColor = "";
    }
}

// Helper: Check if the "Convert" button is toggled ON
function isConvertModeActive() {
    const btn = document.getElementById('toggleConvertBtn');
    return btn && btn.classList.contains('active');
}

// LOAD STATE ON STARTUP
document.addEventListener('DOMContentLoaded', () => {
    // 1. Restore Auto Rate Toggle
    const savedState = localStorage.getItem('billApp_autoRate');
    if (savedState === 'true') {
        autoRateConversion = true;
        setTimeout(updateAutoRateUI, 100);
    }

    // 2. Sync "Previous Unit" Tracker
    setTimeout(() => {
        const convertSelect = document.getElementById('convertUnit');
        if (convertSelect) {
            previousConvertUnit = convertSelect.value;
        }
    }, 1000);
});

// --- MATH HELPERS ---

function getLinearFactor(fromUnit, toUnit) {
    if (!fromUnit || !toUnit || fromUnit === toUnit || fromUnit === 'none' || toUnit === 'none') return 1;

    const factors = {
        'ft': { 'inch': 12, 'mtr': 0.3048, 'cm': 30.48, 'mm': 304.8 },
        'inch': { 'ft': 1 / 12, 'mtr': 0.0254, 'cm': 2.54, 'mm': 25.4 },
        'mtr': { 'ft': 3.28084, 'inch': 39.3701, 'cm': 100, 'mm': 1000 },
        'cm': { 'ft': 0.0328084, 'inch': 0.393701, 'mtr': 0.01, 'mm': 10 },
        'mm': { 'ft': 0.00328084, 'inch': 0.0393701, 'mtr': 0.001, 'cm': 0.1 }
    };

    if (factors[fromUnit] && factors[fromUnit][toUnit]) {
        return factors[fromUnit][toUnit];
    }
    return 1;
}

function getDimensionPower() {
    const type = document.getElementById('dimensionType').value;
    if (['widthXheightXdepth', 'lengthXwidthXheight', 'lengthXheightXdepth', 'lengthXwidthXdepth'].includes(type)) return 3;
    if (['widthXheight', 'widthXdepth', 'lengthXdepth', 'lengthXheight', 'lengthXwidth'].includes(type)) return 2;
    return 1;
}

// --- OVERRIDES WITH CONDITIONAL CHECKS ---

const originalHandleMeasurementUnitChange = handleMeasurementUnitChange;

handleMeasurementUnitChange = function () {
    const newUnit = document.getElementById('measurementUnit').value;
    const oldUnit = currentDimensions.unit || 'ft';
    const rateInput = document.getElementById('rateManual');

    // CONDITION: Convert ONLY if AutoRate is ON AND Convert Button is OFF
    if (autoRateConversion && !isConvertModeActive() && rateInput.value && oldUnit !== newUnit) {
        const currentRate = parseFloat(rateInput.value);
        const power = getDimensionPower();
        const factor = getLinearFactor(oldUnit, newUnit);

        // Input Change: Rate DECREASES if unit gets smaller
        const conversionMultiplier = Math.pow(factor, power);
        const newRate = currentRate / conversionMultiplier;

        rateInput.value = parseFloat(newRate.toFixed(4));
        showNotification(`Rate converted: ${oldUnit} -> ${newUnit}`, "info");
    }

    originalHandleMeasurementUnitChange();
};

const originalHandleConvertUnitChange = handleConvertUnitChange;

handleConvertUnitChange = function () {
    const convertSelect = document.getElementById('convertUnit');
    const newConvertUnit = convertSelect.value;

    // 1. Update Global Variable (Original Functionality)
    currentConvertUnit = newConvertUnit;

    // 2. Auto Rate Conversion Logic
    const rateInput = document.getElementById('rateManual');

    // Determine source unit (Previous convert unit OR Base unit if starting from None)
    const oldConvertUnit = previousConvertUnit || 'none';
    const baseUnit = document.getElementById('measurementUnit').value;
    const sourceUnit = (oldConvertUnit === 'none') ? baseUnit : oldConvertUnit;

    // CONDITION: Convert only if AutoRate ON + Convert Button ON + Valid Values
    if (autoRateConversion && isConvertModeActive() && rateInput.value && newConvertUnit !== 'none') {
        const currentRate = parseFloat(rateInput.value);
        const power = getDimensionPower();
        const factor = getLinearFactor(sourceUnit, newConvertUnit);

        // Output Change: Rate INCREASES if unit gets larger (Divide by factor)
        // e.g. ft -> mtr (0.3048). Rate must increase. Rate / 0.3048 = Larger Rate.
        const conversionMultiplier = Math.pow(factor, power);

        if (conversionMultiplier !== 0) {
            const newRate = currentRate / conversionMultiplier;
            rateInput.value = parseFloat(newRate.toFixed(4));
            showNotification(`Rate converted to ${newConvertUnit}`, "info");
        }
    }

    // 3. Update Previous Unit Tracker
    previousConvertUnit = newConvertUnit;
};

const originalHandleDimensionTypeChange = handleDimensionTypeChange;
handleDimensionTypeChange = function () {
    originalHandleDimensionTypeChange();
    previousConvertUnit = document.getElementById('convertUnit').value;
};

// END AUTO RATE CONVERT


// HELPER: Syncs the Global Toolbar Button with the state of the rows
function updateGlobalDimensionButtonState() {
    const rows = document.querySelectorAll('#createListManual tbody tr[data-id]');
    const btn = document.getElementById('toggleDimensionText');
    if (!btn) return;

    // If no items, default to OFF (Default Color)
    if (rows.length === 0) {
        btn.style.backgroundColor = '';
        btn.style.color = '';
        return;
    }

    // Check if ALL items are hidden
    const allHidden = Array.from(rows).every(row =>
        row.getAttribute('data-dimensions-visible') === 'false'
    );

    if (allHidden) {
        // STATE: ON (All Hidden) -> Primary Color
        btn.style.backgroundColor = 'var(--primary-color)';
        btn.style.color = 'white';
    } else {
        // STATE: OFF (All Visible) or PARTIAL (Mixed) -> Default Color
        btn.style.backgroundColor = '';
        btn.style.color = '';
    }
}

// HELPER: Sets visibility for a specific row and updates UI
function setRowDimensionVisibility(rowId, isVisible) {
    // Update Input Table Row
    const inputRow = document.querySelector(`#createListManual tr[data-id="${rowId}"]`);
    if (inputRow) {
        inputRow.setAttribute('data-dimensions-visible', isVisible ? 'true' : 'false');
        const dimDiv = inputRow.querySelector('.dimensions');
        if (dimDiv) dimDiv.style.display = isVisible ? 'block' : 'none';

        // Update Icon
        const btnIcon = inputRow.querySelector('.dimensions-btn .material-icons');
        if (btnIcon) btnIcon.textContent = isVisible ? 'layers' : 'layers_clear';
    }

    // Update Regular/GST View Tables (Visual sync only)
    const viewTables = ['copyListManual', 'gstCopyListManual'];
    viewTables.forEach(tableId => {
        const viewRow = document.querySelector(`#${tableId} tr[data-id="${rowId}"]`);
        if (viewRow) {
            const dimDiv = viewRow.querySelector('.dimensions');
            if (dimDiv) dimDiv.style.display = isVisible ? 'block' : 'none';
        }
    });
}

function toggleDimensionsDisplay() {
    const btn = document.getElementById('toggleDimensionText');
    const rows = document.querySelectorAll('#createListManual tbody tr[data-id]');

    if (rows.length === 0) return;

    // LOGIC: 
    // If Button is colored (All Hidden) -> Action: SHOW ALL
    // If Button is default (All Visible OR Partial) -> Action: HIDE ALL

    // Check if currently "All Hidden" (Primary Color)
    const isCurrentlyAllHidden = btn.style.backgroundColor !== '';

    // Target state: If All Hidden, we want to Show (true). Otherwise Hide (false).
    const targetState = isCurrentlyAllHidden;

    rows.forEach(row => {
        const rowId = row.getAttribute('data-id');
        setRowDimensionVisibility(rowId, targetState);
    });

    saveToLocalStorage();
    saveStateToHistory();

    // Recalculate button state immediately
    updateGlobalDimensionButtonState();
}

async function handleItemSearch() {
    const searchTerm = document.getElementById('itemNameManual').value.trim().toLowerCase();
    const suggestions = document.getElementById('item-suggestions');

    if (searchTerm.length < 1) {
        suggestions.style.display = 'none';
        return;
    }

    try {
        const items = await getAllFromDB('savedItems');

        if (!items || !Array.isArray(items)) {
            suggestions.style.display = 'none';
            return;
        }

        // Expanded Search Logic (Matches barcode, batch, etc.)
        const filtered = items.filter(item => {
            if (!item || !item.value) return false;

            const data = item.value;

            const name = (data.name || '').toLowerCase();
            const otherNames = (data.otherNames || '').toLowerCase();
            const barcode = (data.barcode || '').toLowerCase();
            const productCode = (data.productCode || '').toLowerCase();
            const sectionCode = (data.sectionCode || '').toLowerCase();
            const batchNumber = (data.batchNumber || '').toLowerCase();

            return name.includes(searchTerm) ||
                otherNames.includes(searchTerm) ||
                barcode.includes(searchTerm) ||
                productCode.includes(searchTerm) ||
                sectionCode.includes(searchTerm) ||
                batchNumber.includes(searchTerm);
        }).slice(0, 5);

        suggestions.innerHTML = '';
        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-suggestion-item';

            // Only show Name + Stock (No extra info)
            const stockText = item.value.stockQuantity !== undefined ? ` (Stock: ${item.value.stockQuantity})` : '';
            div.textContent = item.value.name + stockText;

            div.onclick = () => selectItemSuggestion(item.value.name);
            suggestions.appendChild(div);
        });

        suggestions.style.display = filtered.length > 0 ? 'block' : 'none';
    } catch (error) {
        console.error('Error searching items:', error);
        suggestions.style.display = 'none';
    }
}

// Handle item selection from suggestions
function selectItemSuggestion(itemName) {
    document.getElementById('itemNameManual').value = itemName;
    document.getElementById('item-suggestions').style.display = 'none';

    // Trigger the existing item name input handler
    handleItemNameInput();
}

// Toggle More Options in Add Item Modal
function toggleMoreOptions() {
    const container = document.getElementById('more-options-container');
    const btn = document.getElementById('toggle-more-options-btn');
    const icon = btn.querySelector('.material-icons');

    if (container.style.display === 'none') {
        container.style.display = 'block';
        btn.innerHTML = 'Hide Options <span class="material-icons">keyboard_arrow_up</span>';
        btn.style.backgroundColor = '#e0e0e0';
    } else {
        container.style.display = 'none';
        btn.innerHTML = 'More Options <span class="material-icons">keyboard_arrow_down</span>';
        btn.style.backgroundColor = '#f0f0f0';
    }
}

// Logic for Category Suggestions (Fetch from DB)
async function handleSavedCategorySearch() {
    const input = document.getElementById('saved-category');
    const suggestionsBox = document.getElementById('saved-category-suggestions');
    const searchTerm = input.value.trim().toLowerCase();

    if (searchTerm.length < 1) {
        suggestionsBox.style.display = 'none';
        return;
    }

    try {
        const allItems = await getAllFromDB('savedItems');
        // Extract unique categories
        const categories = [...new Set(allItems.map(item => item.value.category).filter(c => c))];

        const filtered = categories.filter(cat => cat.toLowerCase().includes(searchTerm)).slice(0, 5);

        suggestionsBox.innerHTML = '';

        if (filtered.length > 0) {
            filtered.forEach(cat => {
                const div = document.createElement('div');
                div.className = 'item-suggestion-item';
                div.textContent = cat;
                div.onclick = () => {
                    input.value = cat;
                    suggestionsBox.style.display = 'none';
                };
                suggestionsBox.appendChild(div);
            });
            suggestionsBox.style.display = 'block';
        } else {
            suggestionsBox.style.display = 'none';
        }
    } catch (error) {
        console.error('Error searching categories:', error);
        suggestionsBox.style.display = 'none';
    }
}

// --- Unit Suggestion Logic ---
const defaultUnits = ['nos', 'pair', 'pak', 'box', 'pouch', 'kg', 'g', 'ft', 'sqft', 'sheet', 'ltr', 'ml', 'pc', 'set'];

async function handleUnitSearch() {
    const input = document.getElementById('selectUnit');
    const suggestionsBox = document.getElementById('unit-suggestions');
    const searchTerm = input.value.trim().toLowerCase();

    try {
        // 1. Static Units (Your default list)
        const staticUnits = ['nos', 'pair', 'pak', 'box', 'pouch', 'kg', 'g', 'ft', 'sqft', 'sheet', 'ltr', 'ml', 'pc', 'set'];

        // 2. Fetch Dynamic Units from DB (Existing saved items)
        const allItems = await getAllFromDB('savedItems');
        const dbUnits = allItems.map(item => item.value.defaultUnit).filter(u => u);

        // 3. Merge and Deduplicate (Combine lists and remove duplicates)
        const uniqueUnits = [...new Set([...staticUnits, ...dbUnits])];

        // 4. Filter based on what user typed
        const filtered = uniqueUnits.filter(unit => unit.toLowerCase().includes(searchTerm)).slice(0, 5);

        suggestionsBox.innerHTML = '';

        if (filtered.length > 0) {
            filtered.forEach(unit => {
                const div = document.createElement('div');
                div.className = 'item-suggestion-item';
                div.textContent = unit;

                // When clicked, fill input and hide suggestions
                div.onclick = () => {
                    input.value = unit;
                    suggestionsBox.style.display = 'none';
                };
                suggestionsBox.appendChild(div);
            });
            suggestionsBox.style.display = 'block';
        } else {
            suggestionsBox.style.display = 'none';
        }
    } catch (error) {
        console.error("Error fetching units", error);
        suggestionsBox.style.display = 'none';
    }
}

function selectUnitSuggestion(unit) {
    document.getElementById('selectUnit').value = unit;
    document.getElementById('unit-suggestions').style.display = 'none';
}

// --- Saved Item Unit Suggestion Logic ---
// Updated Unit Suggestions (Static + DB Units)
async function handleSavedUnitSearch() {
    const input = document.getElementById('saved-select-unit');
    const suggestionsBox = document.getElementById('saved-unit-suggestions');
    const searchTerm = input.value.trim().toLowerCase();

    try {
        // 1. Static Units
        const staticUnits = ['nos', 'pair', 'pak', 'box', 'pouch', 'kg', 'g', 'ft', 'sqft', 'sheet', 'ltr', 'ml', 'pc', 'set'];

        // 2. Fetch Dynamic Units from DB
        const allItems = await getAllFromDB('savedItems');
        const dbUnits = allItems.map(item => item.value.defaultUnit).filter(u => u);

        // 3. Merge and Deduplicate
        const uniqueUnits = [...new Set([...staticUnits, ...dbUnits])];

        // 4. Filter
        const filtered = uniqueUnits.filter(unit => unit.toLowerCase().includes(searchTerm)).slice(0, 5);

        suggestionsBox.innerHTML = '';

        if (filtered.length > 0) {
            filtered.forEach(unit => {
                const div = document.createElement('div');
                div.className = 'item-suggestion-item';
                div.textContent = unit;
                div.onclick = () => {
                    input.value = unit;
                    suggestionsBox.style.display = 'none';
                };
                suggestionsBox.appendChild(div);
            });
            suggestionsBox.style.display = 'block';
        } else {
            suggestionsBox.style.display = 'none';
        }
    } catch (error) {
        console.error("Error fetching units", error);
        suggestionsBox.style.display = 'none';
    }
}

function selectSavedUnitSuggestion(unit) {
    document.getElementById('saved-select-unit').value = unit;
    document.getElementById('saved-unit-suggestions').style.display = 'none';
}

async function handleItemNameInput() {
    const itemName = document.getElementById('itemNameManual').value.trim();
    if (!itemName) return;

    try {
        let item = await getFromDB('savedItems', itemName);

        if (!item) {
            const allItems = await getAllFromDB('savedItems');
            item = allItems.find(savedItem => {
                if (!savedItem.value.otherNames) return false;
                const otherNames = savedItem.value.otherNames.split(',').map(name => name.trim().toLowerCase());
                return otherNames.includes(itemName.toLowerCase());
            })?.value;
        }

        if (item) {
            document.getElementById('dimensionType').value = item.dimensionType || 'none';
            document.getElementById('quantityManual').value = item.defaultQuantity || 1;
            document.getElementById('selectUnit').value = item.defaultUnit || '';
            document.getElementById('itemNotesManual').value = item.notes || '';
            document.getElementById('hsnCodeManual').value = item.hsnCode || '';
            document.getElementById('productCodeManual').value = item.productCode || '';

            // --- UPDATED: Rate & Tax Logic with Priority ---
            let rateToFill = 0;
            let taxTypeToUse = 'exclusive';

            if (item.salePrice && item.salePrice > 0) {
                // Priority 1: Sale Price exists
                rateToFill = item.salePrice;
                taxTypeToUse = item.saleTaxType || 'exclusive';
            } else if (item.mrp && item.mrp > 0) {
                // Priority 2: Sale Price empty, MRP exists
                rateToFill = item.mrp;
                taxTypeToUse = item.mrpTaxType || 'exclusive';
            } else if (item.defaultRate > 0) {
                // Priority 3: Fallback
                rateToFill = item.defaultRate;
                taxTypeToUse = item.taxType || 'exclusive';
            }

            document.getElementById('rateManual').value = rateToFill > 0 ? rateToFill : '';

            // Set GST Toggle
            if (isGSTMode) {
                const gstBtn = document.getElementById('gstInclusiveBtn');
                if (gstBtn) {
                    if (taxTypeToUse === 'inclusive') {
                        isGSTInclusive = true;
                        gstBtn.textContent = 'Inclusive';
                        gstBtn.style.backgroundColor = '#27ae60';
                    } else {
                        isGSTInclusive = false;
                        gstBtn.textContent = 'Exclusive';
                        gstBtn.style.backgroundColor = '';
                    }
                }
            }
            // ----------------------------------------------

            if (item.dimensionValues) {
                document.getElementById('dimension1').value = parseFloat(item.dimensionValues[0]) || '';
                document.getElementById('dimension2').value = parseFloat(item.dimensionValues[1]) || '';
                document.getElementById('dimension3').value = parseFloat(item.dimensionValues[2]) || '';
            }

            let identifier = null;
            if (isGSTMode) {
                const displayGstin = document.getElementById('billToGstin').textContent.trim();
                const inputGstin = document.getElementById('consignee-gst').value.trim();
                if (displayGstin && displayGstin !== 'customer 15-digit GSTIN' && displayGstin !== 'N/A') {
                    identifier = displayGstin;
                } else if (inputGstin) {
                    identifier = inputGstin;
                }
            } else {
                identifier = document.getElementById('custName').value.trim();
            }

            let suggestedData = null;
            if (identifier && autoApplyCustomerRates) {
                suggestedData = await getCustomerRateSuggestion(identifier, itemName);
            }

            const discountContainer = document.getElementById('discount-inputs-container');
            const discountBtn = document.getElementById('toggleDiscountBtn');

            if (suggestedData) {
                document.getElementById('rateManual').value = suggestedData.rate;
                document.getElementById('discountType').value = suggestedData.discountType;
                document.getElementById('discountValue').value = suggestedData.discountValue;

                if (suggestedData.discountType !== 'none' && suggestedData.discountValue > 0) {
                    discountContainer.style.display = 'flex';
                    discountBtn.style.backgroundColor = '#27ae60';
                } else {
                    discountContainer.style.display = 'none';
                    discountBtn.style.backgroundColor = '';
                }
            } else {
                document.getElementById('discountType').value = item.discountType || 'none';
                document.getElementById('discountValue').value = item.discountValue || '';

                if (item.discountType && item.discountType !== 'none' && item.discountValue) {
                    discountContainer.style.display = 'flex';
                    discountBtn.style.backgroundColor = '#27ae60';
                } else {
                    discountContainer.style.display = 'none';
                    discountBtn.style.backgroundColor = '';
                }
            }

            currentDimensions.type = item.dimensionType || 'none';
            currentDimensions.unit = item.measurementUnit || 'ft';
            if (item.dimensionValues) {
                currentDimensions.values = [
                    parseFloat(item.dimensionValues[0]) || 0,
                    parseFloat(item.dimensionValues[1]) || 0,
                    parseFloat(item.dimensionValues[2]) || 0
                ];
            } else {
                currentDimensions.values = [0, 0, 0];
            }

            document.getElementById('measurementUnit').value = item.measurementUnit || 'ft';

            handleDimensionTypeChange();

            if (item.dimensionToggles) {
                if (document.getElementById('dimension1-toggle')) document.getElementById('dimension1-toggle').checked = item.dimensionToggles.toggle1 !== false;
                if (document.getElementById('dimension2-toggle')) document.getElementById('dimension2-toggle').checked = item.dimensionToggles.toggle2 !== false;
                if (document.getElementById('dimension3-toggle')) document.getElementById('dimension3-toggle').checked = item.dimensionToggles.toggle3 !== false;
            } else {
                if (document.getElementById('dimension1-toggle')) document.getElementById('dimension1-toggle').checked = true;
                if (document.getElementById('dimension2-toggle')) document.getElementById('dimension2-toggle').checked = true;
                if (document.getElementById('dimension3-toggle')) document.getElementById('dimension3-toggle').checked = true;
            }

            calculateDimensions();

            const dimensionContainer = document.getElementById('dimension-inputs-container');
            const dimensionBtn = document.getElementById('toggleDimensionBtn');

            if (item.dimensionType && item.dimensionType !== 'none') {
                dimensionContainer.style.display = 'flex';
                dimensionBtn.style.backgroundColor = '#3498db';
                const convertBtn = document.getElementById('toggleConvertBtn');
                if (convertBtn) convertBtn.style.display = 'inline-block';
            } else {
                dimensionContainer.style.display = 'none';
                dimensionBtn.style.backgroundColor = '';
                const convertBtn = document.getElementById('toggleConvertBtn');
                if (convertBtn) convertBtn.style.display = 'none';
            }

            document.getElementById('quantityManual').focus();
        }
    } catch (error) {
        console.error('Error checking saved item:', error);
    }
}

async function openManageItemsModal() {
    try {
        document.getElementById('manage-items-modal').style.display = 'block';
        await loadItemsList();
        toggleSettingsSidebar();
    } catch (error) {
        console.error('Error opening manage items modal:', error);
    }
}

function closeManageItemsModal() {
    document.getElementById('manage-items-modal').style.display = 'none';
}

function openAddItemModal() {
    currentlyEditingItemId = null;
    document.getElementById('add-item-modal-title').textContent = 'Add New Item';
    document.getElementById('save-item-btn').textContent = 'Save Item';

    // 1. Reset Standard Fields
    document.getElementById('saved-item-name').value = '';
    document.getElementById('saved-category').value = '';
    document.getElementById('saved-batch-number').value = '';
    document.getElementById('saved-section-code').value = '';
    document.getElementById('saved-barcode').value = '';

    // --- NEW: Reset Brand & Vendor ---
    document.getElementById('saved-brand-name').value = '';
    document.getElementById('saved-vendor-name').value = '';

    // --- NEW: Reset Sale Price & MRP ---
    document.getElementById('saved-sale-price').value = '';
    document.getElementById('saved-sale-tax-type').value = 'exclusive';
    document.getElementById('saved-mrp').value = '';
    document.getElementById('saved-mrp-tax-type').value = 'exclusive'; // Default Exclusive
    // ----------------------------------

    document.getElementById('saved-stock-quantity').value = '0';
    document.getElementById('saved-dimension-type').value = 'none';
    document.getElementById('saved-measurement-unit').value = 'ft';
    document.getElementById('saved-default-quantity').value = '1';
    document.getElementById('saved-select-unit').value = '';

    document.getElementById('saved-dimension1').value = '';
    document.getElementById('saved-dimension2').value = '';
    document.getElementById('saved-dimension3').value = '';

    document.getElementById('saved-hsn-code').value = '';
    document.getElementById('saved-product-code').value = '';
    document.getElementById('saved-purchase-rate').value = '';
    document.getElementById('saved-discount-type').value = 'none';
    document.getElementById('saved-discount-value').value = '';
    document.getElementById('saved-other-names').value = '';
    document.getElementById('saved-notes').value = '';

    // 2. Reset New Fields
    document.getElementById('saved-min-stock').value = '0';

    // 3. Reset UI State (Collapse "More Options")
    document.getElementById('more-options-container').style.display = 'none';
    document.getElementById('toggle-more-options-btn').innerHTML = 'More Options <span class="material-icons">keyboard_arrow_down</span>';

    // 4. Reset Suggestions Boxes (Good practice)
    document.getElementById('saved-category-suggestions').style.display = 'none';
    document.getElementById('saved-unit-suggestions').style.display = 'none';

    // 5. Force Dimension Toggles to Checked (Default for NEW items)
    if (document.getElementById('saved-dimension1-toggle')) document.getElementById('saved-dimension1-toggle').checked = true;
    if (document.getElementById('saved-dimension2-toggle')) document.getElementById('saved-dimension2-toggle').checked = true;
    if (document.getElementById('saved-dimension3-toggle')) document.getElementById('saved-dimension3-toggle').checked = true;

    // Reset Barcode Type
    if (document.getElementById('saved-barcode-type')) document.getElementById('saved-barcode-type').value = 'CODE_128';

    // 6. Update UI visibility based on reset values
    handleSavedDimensionTypeChange();
    document.getElementById('add-item-modal').style.display = 'block';
}

function closeAddItemModal() {
    document.getElementById('add-item-modal').style.display = 'none';
}

// Handle dimension type change in saved items modal
// FIND this function in index.js and REPLACE it with this version:
function handleSavedDimensionTypeChange() {
    // 1. Get Elements (Modal Specific IDs)
    const dimensionType = document.getElementById('saved-dimension-type').value;

    // TARGET THE CONTAINER DIV (Label + Select)
    const measurementUnitWrapper = document.getElementById('saved-measurement-unit-wrapper');
    const measurementUnitSelect = document.getElementById('saved-measurement-unit');

    const dimensionInputs = document.getElementById('saved-dimension-inputs');

    // Inputs
    const dim1 = document.getElementById('saved-dimension1');
    const dim2 = document.getElementById('saved-dimension2');
    const dim3 = document.getElementById('saved-dimension3');

    // Inputs Containers
    const inputs = document.querySelectorAll('#saved-dimension-inputs .dimension-input-with-toggle');

    // --- REMOVED THE FORCED RESET LOGIC HERE --- 
    // The lines setting .checked = true were deleted

    // Reset values only if they're not already set
    if (dim1 && !dim1.value) dim1.value = '';
    if (dim2 && !dim2.value) dim2.value = '';
    if (dim3 && !dim3.value) dim3.value = '';

    // --- VISIBILITY LOGIC ---
    if (dimensionType === 'none' || dimensionType === 'dozen') {
        // HIDE THE CONTAINER
        if (measurementUnitWrapper) measurementUnitWrapper.style.display = 'none';
        if (measurementUnitSelect) measurementUnitSelect.style.display = 'none';
        if (dimensionInputs) dimensionInputs.style.display = 'none';
    } else {
        // SHOW THE CONTAINER
        if (measurementUnitWrapper) measurementUnitWrapper.style.display = 'block';
        if (measurementUnitSelect) measurementUnitSelect.style.display = 'block';
        if (dimensionInputs) dimensionInputs.style.display = 'block';

        // Hide all inputs first
        inputs.forEach(input => input.style.display = 'none');

        // Show first input for all types
        if (inputs[0]) inputs[0].style.display = 'flex';
        if (dim1) dim1.style.display = 'inline-block';

        // Set placeholders based on dimension type
        switch (dimensionType) {
            case 'length':
                if (dim1) dim1.placeholder = 'Length';
                break;
            case 'widthXheight':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Width';
                if (dim2) dim2.placeholder = 'Height';
                break;
            case 'widthXheightXdepth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (inputs[2]) inputs[2].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Width';
                if (dim2) dim2.placeholder = 'Height';
                if (dim3) dim3.placeholder = 'Depth';
                break;
            case 'lengthXwidthXheight':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (inputs[2]) inputs[2].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Width';
                if (dim3) dim3.placeholder = 'Height';
                break;
            case 'widthXdepth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Width';
                if (dim2) dim2.placeholder = 'Depth';
                break;
            case 'lengthXheightXdepth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (inputs[2]) inputs[2].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Height';
                if (dim3) dim3.placeholder = 'Depth';
                break;
            case 'lengthXdepth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Depth';
                break;
            case 'lengthXheight':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Height';
                break;
            case 'lengthXwidth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Width';
                break;
            case 'lengthXwidthXdepth':
                if (inputs[1]) inputs[1].style.display = 'flex';
                if (inputs[2]) inputs[2].style.display = 'flex';
                if (dim1) dim1.placeholder = 'Length';
                if (dim2) dim2.placeholder = 'Width';
                if (dim3) dim3.placeholder = 'Depth';
                break;
        }
    }
}

function updateSavedDimensionCalculation() {
    // Get dimension values
    const dim1 = parseFloat(document.getElementById('saved-dimension1').value) || 0;
    const dim2 = parseFloat(document.getElementById('saved-dimension2').value) || 0;
    const dim3 = parseFloat(document.getElementById('saved-dimension3').value) || 0;

    // Get toggle states
    const dim1Toggle = document.getElementById('saved-dimension1-toggle').checked;
    const dim2Toggle = document.getElementById('saved-dimension2-toggle').checked;
    const dim3Toggle = document.getElementById('saved-dimension3-toggle').checked;

    const dimensionType = document.getElementById('saved-dimension-type').value;

    // Calculate effective values based on toggles
    const effectiveV1 = dim1Toggle ? dim1 : 1;
    const effectiveV2 = dim2Toggle ? dim2 : 1;
    const effectiveV3 = dim3Toggle ? dim3 : 1;

    let calculatedArea = 0;

    switch (dimensionType) {
        case 'length':
            calculatedArea = effectiveV1;
            break;
        case 'widthXheight':
            calculatedArea = effectiveV1 * effectiveV2;
            break;
        case 'widthXheightXdepth':
            calculatedArea = effectiveV1 * effectiveV2 * effectiveV3;
            break;
        case 'lengthXwidthXheight':
            calculatedArea = effectiveV1 * effectiveV2 * effectiveV3;
            break;
        case 'widthXdepth':
            calculatedArea = effectiveV1 * effectiveV2;
            break;
        case 'lengthXheightXdepth':
            calculatedArea = effectiveV1 * effectiveV2 * effectiveV3;
            break;
        case 'lengthXdepth':
            calculatedArea = effectiveV1 * effectiveV2;
            break;
        case 'lengthXheight':
            calculatedArea = effectiveV1 * effectiveV2;
            break;
        case 'lengthXwidth':
            calculatedArea = effectiveV1 * effectiveV2;
            break;
        case 'lengthXwidthXdepth':
            calculatedArea = effectiveV1 * effectiveV2 * effectiveV3;
            break;
        default:
            calculatedArea = 0;
    }

    // You can display this calculated area if needed, or use it for preview
    // For now, we'll just update the display values
    if (document.getElementById('saved-dimension1').value) {
        document.getElementById('saved-dimension1').value = dim1.toFixed(2);
    }
    if (document.getElementById('saved-dimension2').value && document.getElementById('saved-dimension2').style.display !== 'none') {
        document.getElementById('saved-dimension2').value = dim2.toFixed(2);
    }
    if (document.getElementById('saved-dimension3').value && document.getElementById('saved-dimension3').style.display !== 'none') {
        document.getElementById('saved-dimension3').value = dim3.toFixed(2);
    }
}
// Handle measurement unit change in saved items modal
function handleSavedMeasurementUnitChange() {
    // Unit conversion logic can be added here if needed
}
// Add this function to debug stock saving
async function debugStock() {
    const items = await getAllFromDB('savedItems');
    console.log('All items with stock:', items.map(item => ({
        name: item.value.name,
        stock: item.value.stockQuantity,
        hasStock: item.value.stockQuantity != null
    })));
}

async function editItem(itemName) {
    try {
        const item = await getFromDB('savedItems', itemName);
        if (item) {
            currentlyEditingItemId = itemName;
            document.getElementById('add-item-modal-title').textContent = 'Edit Item';
            document.getElementById('save-item-btn').textContent = 'Update Item';

            // Populate Fields
            document.getElementById('saved-item-name').value = item.name;
            document.getElementById('saved-category').value = item.category || '';
            document.getElementById('saved-min-stock').value = item.minStock || 0;
            document.getElementById('saved-batch-number').value = item.batchNumber || '';
            document.getElementById('saved-section-code').value = item.sectionCode || '';
            document.getElementById('saved-barcode').value = item.barcode || '';

            // --- NEW: Populate Brand & Vendor ---
            document.getElementById('saved-brand-name').value = item.brandName || '';
            document.getElementById('saved-vendor-name').value = item.vendorName || '';

            // --- NEW: Populate Sale Price & MRP ---
            document.getElementById('saved-sale-price').value = item.salePrice || item.defaultRate || '';
            document.getElementById('saved-sale-tax-type').value = item.saleTaxType || item.taxType || 'exclusive';

            document.getElementById('saved-mrp').value = item.mrp || '';
            document.getElementById('saved-mrp-tax-type').value = item.mrpTaxType || 'exclusive';
            // --------------------------------------

            document.getElementById('saved-stock-quantity').value = item.stockQuantity || 0;
            document.getElementById('saved-dimension-type').value = item.dimensionType || 'none';
            document.getElementById('saved-measurement-unit').value = item.measurementUnit || 'ft';
            document.getElementById('saved-default-quantity').value = item.defaultQuantity || 1;
            document.getElementById('saved-select-unit').value = item.defaultUnit || '';

            if (document.getElementById('saved-barcode-type')) document.getElementById('saved-barcode-type').value = item.barcodeType || 'CODE_128';

            if (item.dimensionValues) {
                document.getElementById('saved-dimension1').value = parseFloat(item.dimensionValues[0]) || '';
                document.getElementById('saved-dimension2').value = parseFloat(item.dimensionValues[1]) || '';
                document.getElementById('saved-dimension3').value = parseFloat(item.dimensionValues[2]) || '';
            } else {
                document.getElementById('saved-dimension1').value = '';
                document.getElementById('saved-dimension2').value = '';
                document.getElementById('saved-dimension3').value = '';
            }

            if (item.dimensionToggles) {
                if (document.getElementById('saved-dimension1-toggle')) document.getElementById('saved-dimension1-toggle').checked = item.dimensionToggles.toggle1;
                if (document.getElementById('saved-dimension2-toggle')) document.getElementById('saved-dimension2-toggle').checked = item.dimensionToggles.toggle2;
                if (document.getElementById('saved-dimension3-toggle')) document.getElementById('saved-dimension3-toggle').checked = item.dimensionToggles.toggle3;
            } else {
                if (document.getElementById('saved-dimension1-toggle')) document.getElementById('saved-dimension1-toggle').checked = true;
                if (document.getElementById('saved-dimension2-toggle')) document.getElementById('saved-dimension2-toggle').checked = true;
                if (document.getElementById('saved-dimension3-toggle')) document.getElementById('saved-dimension3-toggle').checked = true;
            }

            updateSavedDimensionCalculation();

            document.getElementById('saved-discount-type').value = item.discountType || 'none';
            document.getElementById('saved-discount-value').value = item.discountValue || '';
            document.getElementById('saved-hsn-code').value = item.hsnCode || '';
            document.getElementById('saved-product-code').value = item.productCode || '';
            document.getElementById('saved-purchase-rate').value = item.purchaseRate || '';
            document.getElementById('saved-other-names').value = item.otherNames || '';
            document.getElementById('saved-notes').value = item.notes || '';
            document.getElementById('more-options-container').style.display = 'none';
            document.getElementById('toggle-more-options-btn').innerHTML = 'More Options <span class="material-icons">keyboard_arrow_down</span>';

            handleSavedDimensionTypeChange();
            document.getElementById('add-item-modal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error editing item:', error);
        showNotification('Error loading item for editing');
    }
}

async function saveItem() {
    const itemName = document.getElementById('saved-item-name').value.trim();
    // Existing Fields
    const category = document.getElementById('saved-category').value.trim();
    const batchNumber = document.getElementById('saved-batch-number').value.trim();
    const sectionCode = document.getElementById('saved-section-code').value.trim();

    const brandName = document.getElementById('saved-brand-name').value.trim();
    const vendorName = document.getElementById('saved-vendor-name').value.trim();

    const barcode = document.getElementById('saved-barcode').value.trim();
    const barcodeType = document.getElementById('saved-barcode-type') ? document.getElementById('saved-barcode-type').value : 'CODE128';

    const salePrice = parseFloat(document.getElementById('saved-sale-price').value) || 0;
    const saleTaxType = document.getElementById('saved-sale-tax-type').value;
    const mrp = parseFloat(document.getElementById('saved-mrp').value) || 0;
    const mrpTaxType = document.getElementById('saved-mrp-tax-type').value;

    const dimensionType = document.getElementById('saved-dimension-type').value;
    const measurementUnit = document.getElementById('saved-measurement-unit').value;
    const defaultQuantity = parseFloat(document.getElementById('saved-default-quantity').value) || 1;
    const defaultUnit = document.getElementById('saved-select-unit').value.trim();
    // const defaultRate = parseFloat(document.getElementById('saved-default-rate').value) || 0;

    const discountType = document.getElementById('saved-discount-type').value;
    const discountValue = parseFloat(document.getElementById('saved-discount-value').value) || 0;
    const hsnCode = document.getElementById('saved-hsn-code').value.trim();

    const stockQuantity = parseInt(document.getElementById('saved-stock-quantity').value) || 0;
    const minStock = parseInt(document.getElementById('saved-min-stock').value) || 0;

    const productCode = document.getElementById('saved-product-code').value.trim();
    const purchaseRate = parseFloat(document.getElementById('saved-purchase-rate').value) || 0;
    const otherNames = document.getElementById('saved-other-names').value.trim();
    const notes = document.getElementById('saved-notes').value.trim();

    const dimension1 = parseFloat(document.getElementById('saved-dimension1').value) || 0;
    const dimension2 = parseFloat(document.getElementById('saved-dimension2').value) || 0;
    const dimension3 = parseFloat(document.getElementById('saved-dimension3').value) || 0;
    const dimensionValues = [dimension1, dimension2, dimension3];

    const toggleStates = {
        toggle1: document.getElementById('saved-dimension1-toggle') ? document.getElementById('saved-dimension1-toggle').checked : true,
        toggle2: document.getElementById('saved-dimension2-toggle') ? document.getElementById('saved-dimension2-toggle').checked : true,
        toggle3: document.getElementById('saved-dimension3-toggle') ? document.getElementById('saved-dimension3-toggle').checked : true
    };

    if (!itemName) {
        showNotification('Please enter an item name');
        return;
    }

    // --- UPDATED: Handle Stock History Logic ---
    let lastStockQuantity = 0;
    let lastStockUpdate = Date.now(); // Default for new items

    if (currentlyEditingItemId) {
        try {
            const oldItem = await getFromDB('savedItems', currentlyEditingItemId);
            if (oldItem) {
                const oldStock = parseInt(oldItem.stockQuantity) || 0;

                if (oldStock !== stockQuantity) {
                    // Stock changed manually: Archive old stock
                    lastStockQuantity = oldStock;
                    lastStockUpdate = Date.now();
                } else {
                    // Stock didn't change: Preserve existing history
                    lastStockQuantity = oldItem.lastStockQuantity !== undefined ? oldItem.lastStockQuantity : 0;
                    lastStockUpdate = oldItem.lastStockUpdate || Date.now();
                }
            }
        } catch (e) {
            console.error("Error fetching old item for stock history", e);
        }
    }
    // -------------------------------------------

    const itemData = {
        name: itemName,
        category: category,
        batchNumber: batchNumber,
        sectionCode: sectionCode,
        barcode: barcode,
        barcodeType: barcodeType,
        brandName: brandName,
        vendorName: vendorName,
        salePrice: salePrice,
        saleTaxType: saleTaxType,
        mrp: mrp,
        mrpTaxType: mrpTaxType,

        defaultRate: salePrice > 0 ? salePrice : mrp,
        taxType: saleTaxType,

        dimensionType: dimensionType,
        measurementUnit: measurementUnit,
        dimensionValues: dimensionValues,
        dimensionToggles: toggleStates,
        defaultQuantity: defaultQuantity,
        defaultUnit: defaultUnit,
        discountType: discountType,
        discountValue: discountValue,
        hsnCode: hsnCode,

        stockQuantity: stockQuantity,
        minStock: minStock,
        // Save history fields
        lastStockQuantity: lastStockQuantity,
        lastStockUpdate: lastStockUpdate,

        productCode: productCode,
        purchaseRate: purchaseRate,
        otherNames: otherNames,
        notes: notes,
        timestamp: Date.now()
    };

    try {
        if (currentlyEditingItemId && currentlyEditingItemId !== itemName) {
            await removeFromDB('savedItems', currentlyEditingItemId);
        }
        await setInDB('savedItems', itemName, itemData);
        closeAddItemModal();
        await loadItemsList();
    } catch (error) {
        console.error('Error saving item:', error);
    }
}

// Batch Invoice Functions
function openBatchInvoiceModal() {
    toggleSettingsSidebar();
    document.getElementById('batch-invoice-modal').style.display = 'block';
}

function closeBatchInvoiceModal() {
    document.getElementById('batch-invoice-modal').style.display = 'none';
}

async function generateBatchInvoice() {
    const input = document.getElementById('batch-invoice-input').value.trim();

    if (!input) {
        showNotification('Please enter product data', 'error');
        return;
    }

    try {
        // Remove brackets and parse the input
        const cleanInput = input.replace(/[\[\]]/g, '');

        // Parse the input handling quoted strings with commas
        const items = [];
        let currentItem = '';
        let insideQuotes = false;

        for (let i = 0; i < cleanInput.length; i++) {
            const char = cleanInput[i];

            if (char === '"') {
                insideQuotes = !insideQuotes;
                currentItem += char;
            } else if (char === ',' && !insideQuotes) {
                items.push(currentItem.trim());
                currentItem = '';
            } else {
                currentItem += char;
            }
        }

        // Push the last item
        if (currentItem.trim()) {
            items.push(currentItem.trim());
        }

        if (items.length < 4) {
            showNotification('Invalid format. Need at least 2 products + contact + customer name + address', 'error');
            return;
        }

        // Extract components (last 3 elements: contact, name, address)
        const address = items[items.length - 1].replace(/"/g, '').trim();
        const customerName = items[items.length - 2].replace(/"/g, '').trim();
        const contactNumber = items[items.length - 3].trim();
        const productItems = items.slice(0, items.length - 3);

        // Fill customer details
        document.getElementById('custName').value = customerName;
        document.getElementById('custPhone').value = contactNumber;
        document.getElementById('custAddr').value = address;

        // Process each product
        let addedCount = 0;
        for (const item of productItems) {
            const [productCode, quantity] = item.split('@');

            if (!productCode || !quantity) {
                console.warn('Invalid item format:', item);
                continue;
            }

            await addItemByProductCode(productCode.trim(), parseFloat(quantity.trim()));
            addedCount++;
        }

        closeBatchInvoiceModal();
        showNotification(`Added ${addedCount} items for ${customerName}`, 'success');

    } catch (error) {
        console.error('Error generating batch invoice:', error);
        showNotification('Error processing batch invoice', 'error');
    }
}

async function addItemByProductCode(productCode, quantity) {
    try {
        // Search for item by product code
        const allItems = await getAllFromDB('savedItems');
        const item = allItems.find(savedItem =>
            savedItem.value.productCode === productCode
        );

        if (!item) {
            console.warn('Product not found:', productCode);
            showNotification(`Product ${productCode} not found`, 'warning');
            return;
        }

        // Fill the manual input fields with item data
        document.getElementById('itemNameManual').value = item.value.name;
        document.getElementById('quantityManual').value = quantity;
        document.getElementById('selectUnit').value = item.value.defaultUnit || '';
        document.getElementById('rateManual').value = item.value.defaultRate || '';
        document.getElementById('itemNotesManual').value = item.value.notes || '';
        document.getElementById('hsnCodeManual').value = item.value.hsnCode || '';
        document.getElementById('productCodeManual').value = item.value.productCode || '';
        document.getElementById('discountType').value = item.value.discountType || 'none';
        document.getElementById('discountValue').value = item.value.discountValue || '';

        // Handle dimensions
        document.getElementById('dimensionType').value = item.value.dimensionType || 'none';
        if (item.value.dimensionType && item.value.dimensionType !== 'none') {
            document.getElementById('measurementUnit').value = item.value.measurementUnit || 'ft';

            if (item.value.dimensionValues) {
                document.getElementById('dimension1').value = parseFloat(item.value.dimensionValues[0]) || '';
                document.getElementById('dimension2').value = parseFloat(item.value.dimensionValues[1]) || '';
                document.getElementById('dimension3').value = parseFloat(item.value.dimensionValues[2]) || '';
            }

            // Show dimension inputs if needed
            document.getElementById('dimension-inputs-container').style.display = 'flex';
            document.getElementById('toggleDimensionBtn').style.backgroundColor = '#3498db';
            handleDimensionTypeChange();
        }

        // Show discount inputs if needed
        if (item.value.discountType && item.value.discountType !== 'none') {
            document.getElementById('discount-inputs-container').style.display = 'flex';
            document.getElementById('toggleDiscountBtn').style.backgroundColor = '#27ae60';
        }

        // Add the item to table
        await addRowManual();

    } catch (error) {
        console.error('Error adding item by product code:', error);
        throw error;
    }
}

async function reduceStockOnSave() {
    try {
        const rows = document.querySelectorAll('#createListManual tbody tr[data-id]');

        for (const row of rows) {
            const itemName = row.children[1].querySelector('.itemNameClass')?.textContent.trim();
            const quantity = parseFloat(row.getAttribute('data-original-quantity')) || parseFloat(row.children[2].textContent);

            if (itemName && quantity > 0) {
                const savedItem = await getFromDB('savedItems', itemName);
                if (savedItem && savedItem.stockQuantity !== undefined) {
                    const newStock = Math.max(0, savedItem.stockQuantity - quantity);
                    savedItem.stockQuantity = newStock;
                    await setInDB('savedItems', itemName, savedItem);
                }
            }
        }
    } catch (error) {
        console.error('Error reducing stock:', error);
    }
}
// --- New UI Helper Functions ---

// Toggle Details Visibility
function toggleCardDetails(btn) {
    // Find the parent card
    const card = btn.closest('.item-card, .customer-card, .saved-bill-card');
    // Find the details section within that card
    const details = card.querySelector('.details-section');
    const icon = btn.querySelector('.material-icons');

    if (details.classList.contains('hidden')) {
        // Show details
        details.classList.remove('hidden');
        icon.textContent = 'keyboard_arrow_up';
    } else {
        // Hide details
        details.classList.add('hidden');
        icon.textContent = 'keyboard_arrow_down';
    }
}

// Toggle Action Menu
function toggleActionMenu(event, menuId) {
    event.stopPropagation(); // Prevent event bubbling

    // Close any other open menus first
    closeAllActionMenus();

    const menu = document.getElementById(menuId);
    if (menu) {
        menu.classList.toggle('show');
    }
}

// Close all menus (used when clicking outside)
function closeAllActionMenus() {
    document.querySelectorAll('.action-dropdown.show').forEach(menu => {
        menu.classList.remove('show');
    });
}

// Global listener to close menus when clicking anywhere else
document.addEventListener('click', function (e) {
    if (!e.target.closest('.action-menu-container')) {
        closeAllActionMenus();
    }
});

async function loadItemsList() {
    try {
        const items = await getAllFromDB('savedItems');
        const itemsList = document.getElementById('items-list');
        itemsList.innerHTML = '';

        if (items.length === 0) {
            itemsList.innerHTML = '<div class="item-card">No items saved yet</div>';
            return;
        }

        // Helper function to format date: dd-mm-yy, hh:mm AM/PM
        const formatStockDate = (ts) => {
            if (!ts) return '';
            const d = new Date(ts);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear()).slice(-2);

            let h = d.getHours();
            const m = String(d.getMinutes()).padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12; // Convert 0 to 12

            return `${day}-${month}-${year}, ${h}:${m} ${ampm}`;
        };

        items.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';

            const safeName = item.value.name.replace(/[^a-zA-Z0-9]/g, '-');
            const menuId = `menu-item-${safeName}-${Date.now()}`;

            let dimensionInfo = '';
            let unitInfo = '';
            if (item.value.dimensionType && item.value.dimensionType !== 'none') {
                dimensionInfo += `<div>Dimension Type: ${item.value.dimensionType}</div>`;
                unitInfo = `<div>Measurement Unit: ${item.value.measurementUnit || 'ft'}</div>`;
                if (item.value.dimensionValues) {
                    const [v1, v2, v3] = item.value.dimensionValues;
                    dimensionInfo += `<div>Dimension Values: ${v1}, ${v2}, ${v3}</div>`;
                }
            }

            // --- UPDATED: Stock Info with History ---
            let stockInfo = '';
            if (item.value.stockQuantity !== undefined) {
                const updateTimeStr = item.value.lastStockUpdate ? formatStockDate(item.value.lastStockUpdate) : '';
                const updateDisplay = updateTimeStr ? ` <span style="font-size:0.85em; color:#666;">(Updated: ${updateTimeStr})</span>` : '';

                stockInfo = `<div>Stock: ${item.value.stockQuantity}${updateDisplay}</div>`;

                if (item.value.lastStockQuantity !== undefined) {
                    stockInfo += `<div>Last Stock: ${item.value.lastStockQuantity}</div>`;
                }
            }
            // ----------------------------------------

            let discountInfo = (item.value.discountType && item.value.discountType !== 'none') ? `<div>Discount: ${item.value.discountType} - ${item.value.discountValue}</div>` : '';
            let notesInfo = (item.value.notes && item.value.notes !== 'None' && item.value.notes.trim() !== '') ? `<div>Notes: ${item.value.notes}</div>` : '';

            let otherNamesInfo = item.value.otherNames ? `<div>Other Names: ${item.value.otherNames}</div>` : '';
            let hsnInfo = item.value.hsnCode ? `<div>HSN/SAC: ${item.value.hsnCode}</div>` : '';
            let productCodeInfo = item.value.productCode ? `<div>Product Code: ${item.value.productCode}</div>` : '';
            let purchaseRateInfo = item.value.purchaseRate ? `<div>Purchase Rate: ₹${item.value.purchaseRate}</div>` : '';

            let categoryInfo = item.value.category ? `<div>Category: ${item.value.category}</div>` : '';
            let brandInfo = item.value.brandName ? `<div>Brand: ${item.value.brandName}</div>` : '';
            let vendorInfo = item.value.vendorName ? `<div>Vendor: ${item.value.vendorName}</div>` : '';

            let saleInfo = item.value.salePrice
                ? `<div>Sale Price: ₹${item.value.salePrice} <span style="font-size:0.85em; color:#666;">(${item.value.saleTaxType})</span></div>`
                : '';
            let mrpInfo = item.value.mrp
                ? `<div>MRP: ₹${item.value.mrp} <span style="font-size:0.85em; color:#666;">(${item.value.mrpTaxType})</span></div>`
                : '';

            let batchInfo = item.value.batchNumber ? `<div>Batch: ${item.value.batchNumber}</div>` : '';
            let sectionInfo = item.value.sectionCode ? `<div>Section: ${item.value.sectionCode}</div>` : '';

            let taxTypeInfo = item.value.taxType ? ` <span style="font-size:0.85em; color:#666;">(Default: ${item.value.taxType})</span>` : '';

            let codeOptions = '';
            if (item.value.productCode) {
                codeOptions += `
                <button class="dropdown-item" onclick="openCodeModal('qr', '${item.value.productCode}', '${item.value.name}', 'Product Code')">
                    <span class="material-icons">qr_code_2</span> Product Code QR
                </button>`;
            }
            if (item.value.sectionCode) {
                codeOptions += `
                <button class="dropdown-item" onclick="openCodeModal('qr', '${item.value.sectionCode}', '${item.value.name}', 'Section Code')">
                    <span class="material-icons">qr_code_2</span> Section Code QR
                </button>`;
            }
            if (item.value.barcode) {
                const bType = item.value.barcodeType || 'CODE128';
                codeOptions += `
                <button class="dropdown-item" onclick="openCodeModal('barcode', '${item.value.barcode}', '${item.value.name}', '${bType}')">
                    <span class="material-icons">view_week</span> View Barcode
                </button>`;
            }

            itemCard.innerHTML = `
                <div class="card-header-row">
                    <div class="card-info">${item.value.name}</div>
                    
                    <div class="card-controls">
                        <button class="icon-btn" onclick="toggleCardDetails(this)" title="Toggle Details">
                            <span class="material-icons">keyboard_arrow_down</span>
                        </button>
                        
                        <div class="action-menu-container">
                            <button class="icon-btn" onclick="toggleActionMenu(event, '${menuId}')">
                                <span class="material-icons">more_vert</span>
                            </button>
                            <div id="${menuId}" class="action-dropdown">
                                <button class="dropdown-item" onclick="openAddStockModal('${item.value.name}')">
                                    <span class="material-icons">add_box</span> Add Stock
                                </button>
                                <button class="dropdown-item" onclick="editItem('${item.value.name}')">
                                    <span class="material-icons">edit</span> Edit
                                </button>
                                
                                ${codeOptions}
                                
                                <button class="dropdown-item delete-item" onclick="deleteItem('${item.value.name}')">
                                    <span class="material-icons">delete</span> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="details-section hidden item-details">
                    ${categoryInfo}
                    ${brandInfo}
                    ${vendorInfo}
                    ${saleInfo}
                    ${mrpInfo}
                    ${batchInfo}
                    ${sectionInfo}
                    ${dimensionInfo}
                    ${unitInfo}
                    <div>Default Quantity: ${item.value.defaultQuantity || 1}</div>
                    <div>Default Unit: ${item.value.defaultUnit}</div>
                    ${stockInfo}
                    ${productCodeInfo}
                    ${hsnInfo}
                    ${purchaseRateInfo}
                    ${discountInfo}
                    ${otherNamesInfo}
                    ${notesInfo}
                </div>
            `;
            itemsList.appendChild(itemCard);
        });
    } catch (error) {
        console.error('Error loading items list:', error);
    }
}

function searchItems() {
    const searchTerm = document.getElementById('item-search').value.toLowerCase();
    const itemCards = document.querySelectorAll('.item-card');

    itemCards.forEach(card => {
        const nameEl = card.querySelector('.card-info');
        const detailsEl = card.querySelector('.details-section');

        const itemName = nameEl ? nameEl.textContent.toLowerCase() : '';
        // Since Category, Batch, and Section are added to detailsHtml, this search covers them!
        const itemDetails = detailsEl ? detailsEl.textContent.toLowerCase() : '';

        if (itemName.includes(searchTerm) || itemDetails.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

async function deleteItem(itemName) {
    const shouldDeleteItem = await showConfirm(`Are you sure you want to delete "${itemName}"?`)
    if (shouldDeleteItem) {
        try {
            await removeFromDB('savedItems', itemName);
            // await loadSavedItems();
            await loadItemsList();
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    }
}

// --- Code Generation Logic ---

function openCodeModal(type, codeValue, itemName, meta) {
    const modal = document.getElementById('code-display-modal');
    const container = document.getElementById('code-canvas-container');
    const headerTitle = document.getElementById('code-modal-title');
    const cardTitle = document.getElementById('code-product-name-display');
    const textDisplay = document.getElementById('code-text-display');

    // Reset
    container.innerHTML = '';
    headerTitle.textContent = meta || 'Code View';
    cardTitle.textContent = itemName;
    textDisplay.textContent = codeValue;

    if (type === 'qr') {
        const qrDiv = document.createElement('div');
        container.appendChild(qrDiv);

        // 1. GENERATE AT HIGH RESOLUTION (600x600)
        // This creates plenty of pixels for a sharp result
        new QRCode(qrDiv, {
            text: codeValue,
            width: 600,
            height: 600,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // 2. VISUALLY SCALE DOWN
        // CSS makes it fit the modal, but the image data remains high-res
        const qrImg = qrDiv.querySelector('img');
        if (qrImg) {
            qrImg.style.width = "200px";
            qrImg.style.height = "auto";
        }

        // Add meta label
        const label = document.createElement('div');
        label.textContent = meta;
        label.style.fontSize = '0.8em';
        label.style.color = '#666';
        label.style.marginTop = '5px';
        textDisplay.appendChild(label);

    } else if (type === 'barcode') {
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);

        let format = meta.replace('_', '');
        if (format === 'UPCA') format = 'UPC';

        try {
            // 1. GENERATE AT HIGH RESOLUTION
            // Thicker bars (width: 4) and taller height ensure crisp rendering
            JsBarcode(canvas, codeValue, {
                format: format,
                lineColor: "#000",
                width: 4,
                height: 150,
                displayValue: false,
                margin: 10
            });

            // 2. VISUALLY SCALE DOWN
            canvas.style.maxWidth = "100%";
            canvas.style.height = "100px"; // Visual height

        } catch (e) {
            console.error("Barcode generation error", e);
            container.innerHTML = '<p style="color:red">Invalid format for this barcode type</p>';
        }

        const label = document.createElement('div');
        label.textContent = meta;
        label.style.fontSize = '0.7em';
        label.style.color = '#888';
        label.style.marginTop = '2px';
        textDisplay.appendChild(label);
    }

    modal.style.display = 'block';

    const sidebar = document.getElementById("settings-sidebar");
    if (sidebar) sidebar.classList.remove("open");
}

function closeCodeModal() {
    document.getElementById('code-display-modal').style.display = 'none';
}

function downloadCodeImage() {
    // Check if html2canvas is loaded
    if (typeof html2canvas === 'undefined') {
        showNotification("Error: html2canvas library is missing.", "error");
        return;
    }

    const element = document.getElementById('printable-code-card');
    const itemName = document.getElementById('code-product-name-display').textContent;
    const safeName = itemName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const code = document.getElementById('code-text-display').innerText.split('\n')[0];

    html2canvas(element, {
        scale: 5, // SCALE 5: Captures at 5x screen resolution (Very Sharp)
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${safeName}-${code}.png`;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(err => {
        console.error("Download failed:", err);
        showNotification("Image generation failed", "error");
    });
}

//Useless loadsaved function 
async function loadSavedCustomers() {
    // We no longer use the <datalist>, so we don't need to populate HTML here.
    // The new suggestion box fetches data dynamically when you type.
    try {
        // Just ensuring DB connection works
        await getAllFromDB('savedCustomers');
    } catch (error) {
        console.error('Error checking saved customers:', error);
    }
}

async function handleCustomerNameInput() {
    const customerName = document.getElementById('custName').value.trim();
    if (!customerName) return;

    try {
        const customer = await getFromDB('savedCustomers', customerName);
        if (customer) {
            document.getElementById('custAddr').value = customer.address || '';
            document.getElementById('custPhone').value = customer.phone || '';
            document.getElementById('custGSTIN').value = customer.gstin || '';
            saveToLocalStorage();
        }
    } catch (error) {
        console.error('Error checking saved customer:', error);
    }
}


// Open Manage Customers Modal
function openManageCustomersModal() {
    document.getElementById('manage-customers-modal').style.display = 'block';

    // Reset to regular mode by default
    document.getElementById('customer-mode-toggle').checked = false;
    currentCustomerMode = 'regular';
    document.getElementById('add-customer-main-btn').textContent = 'Add New Customer';

    // LOAD REGULAR CUSTOMERS INITIALLY
    loadCustomersList();
    toggleSettingsSidebar();
}


function closeManageCustomersModal() {
    document.getElementById('manage-customers-modal').style.display = 'none';
}

function openAddCustomerModal() {
    currentlyEditingCustomerId = null;
    document.getElementById('add-customer-modal-title').textContent = 'Add New Customer';
    document.getElementById('save-customer-btn').textContent = 'Save Customer';

    document.getElementById('saved-customer-name').value = '';
    document.getElementById('saved-customer-address').value = '';
    document.getElementById('saved-customer-phone').value = '';
    document.getElementById('saved-customer-gstin').value = '';

    document.getElementById('add-customer-modal').style.display = 'block';
}

function closeAddCustomerModal() {
    document.getElementById('add-customer-modal').style.display = 'none';
    currentlyEditingCustomerId = null; // ADD THIS LINE
}

async function saveCustomer() {
    const customerName = document.getElementById('saved-customer-name').value.trim();
    const address = document.getElementById('saved-customer-address').value.trim();
    const phone = document.getElementById('saved-customer-phone').value.trim();
    const gstin = document.getElementById('saved-customer-gstin').value.trim();

    if (!customerName) {
        showNotification('Please enter a customer name', 'error');
        return;
    }

    // Check for duplicate customer (case-insensitive)
    const existingCustomers = await getAllFromDB('savedCustomers');
    const customerExists = existingCustomers.some(customer =>
        customer.value.name.toLowerCase() === customerName.toLowerCase()
    );

    // If editing and name changed, or creating new and name exists
    if ((currentlyEditingCustomerId && customerName.toLowerCase() !== currentlyEditingCustomerId.toLowerCase()) ||
        (!currentlyEditingCustomerId && customerExists)) {
        showNotification('Customer already exists! Please use a different name.', 'error');
        return;
    }

    const customerData = {
        name: customerName,
        address: address,
        phone: phone,
        gstin: gstin,
        timestamp: Date.now()
    };

    try {
        // CHECK IF EDITING EXISTING CUSTOMER
        if (currentlyEditingCustomerId) {
            // UPDATE existing customer
            await setInDB('savedCustomers', currentlyEditingCustomerId, customerData);
            showNotification('Customer updated successfully!', 'success');
        } else {
            // CREATE new customer
            await setInDB('savedCustomers', customerName, customerData);
            showNotification('Customer saved successfully!', 'success');
        }

        await loadSavedCustomers();
        closeAddCustomerModal();
        // RESET editing state
        currentlyEditingCustomerId = null;
        await loadCustomersList();
    } catch (error) {
        console.error('Error saving customer:', error);
    }
}
//load regular mode customers
async function loadCustomersList() {
    try {
        const customers = await getAllFromDB('savedCustomers');
        const listContainer = document.getElementById('customers-list');
        const searchInput = document.getElementById('customer-search');
        const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

        listContainer.innerHTML = '';

        if (customers.length === 0) {
            listContainer.innerHTML = '<div class="customer-card">No regular customers saved yet</div>';
            return;
        }

        // 1. FILTER (Search Name, Address, Phone, GSTIN)
        const filtered = customers.filter(c => {
            const val = c.value;
            const name = (val.name || '').toLowerCase();
            const gstin = (val.gstin || '').toLowerCase();
            const address = (val.address || '').toLowerCase();
            const phone = (val.phone || '').toLowerCase();

            return name.includes(searchTerm) || 
                   gstin.includes(searchTerm) || 
                   address.includes(searchTerm) || 
                   phone.includes(searchTerm);
        });

        if (filtered.length === 0) {
            listContainer.innerHTML = '<div class="customer-card">No matching customers found</div>';
            return;
        }

        // 2. SORT (A-Z / Z-A)
        filtered.sort((a, b) => {
            const nameA = (a.value.name || '').toLowerCase();
            const nameB = (b.value.name || '').toLowerCase();
            
            if (isCustomerSortAscending) {
                return nameA.localeCompare(nameB);
            } else {
                return nameB.localeCompare(nameA);
            }
        });

        // 3. RENDER
        filtered.forEach(customer => {
            const val = customer.value;
            const customerCard = document.createElement('div');
            customerCard.className = 'customer-card';

            // Safe Name for ID
            const safeName = val.name.replace(/[^a-zA-Z0-9]/g, '-');
            const menuId = `menu-cust-${safeName}-${Date.now()}`;

            // Safe Data Display
            const displayAddr = val.address || 'Not provided';
            const displayPhone = val.phone || 'Not provided';
            const displayGstin = val.gstin || 'Not provided';

            customerCard.innerHTML = `
                <div class="card-header-row">
                    <div class="card-info">${val.name}</div>
                    
                    <div class="card-controls">
                        <button class="icon-btn" onclick="toggleCardDetails(this)" title="Toggle Details">
                            <span class="material-icons">keyboard_arrow_down</span>
                        </button>
                        
                        <div class="action-menu-container">
                            <button class="icon-btn" onclick="toggleActionMenu(event, '${menuId}')">
                                <span class="material-icons">more_vert</span>
                            </button>
                            <div id="${menuId}" class="action-dropdown">
                                <button class="dropdown-item" onclick="openPaymentDialog('${val.name}', '${val.gstin || ''}')">
                                    <span class="material-icons">payments</span> Payment & CN
                                </button>
                                <button class="dropdown-item" onclick="openLedgerDialog('${val.name}', '${val.gstin || ''}')">
                                    <span class="material-icons">book</span> Ledger
                                </button>
                                <button class="dropdown-item" onclick="editCustomer('${val.name}')">
                                    <span class="material-icons">edit</span> Edit
                                </button>
                                <button class="dropdown-item delete-item" onclick="deleteCustomer('${val.name}')">
                                    <span class="material-icons">delete</span> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="details-section hidden customer-details-text">
                    <div>Address: ${displayAddr}</div>
                    <div>Phone: ${displayPhone}</div>
                    <div>GSTIN: ${displayGstin}</div>
                </div>
            `;
            listContainer.appendChild(customerCard);
        });
    } catch (error) {
        console.error('Error loading customers list:', error);
    }
}

// Search Customers (works for both regular and GST)
function searchCustomers() {
    // Check which mode is active (Regular or GST)
    const toggle = document.getElementById('customer-mode-toggle');
    const isGST = toggle && toggle.checked;
    
    if (isGST) {
        loadGSTCustomersList();
    } else {
        loadCustomersList();
    }
}

async function handleRegularCustomerSearch() {
    const input = document.getElementById('custName');
    const addrInput = document.getElementById('custAddr');
    const phoneInput = document.getElementById('custPhone');
    const gstInput = document.getElementById('custGSTIN');

    const suggestions = document.getElementById('regular-customer-suggestions');
    const searchTerm = input.value.trim();

    if (searchTerm.length < 1) {
        suggestions.style.display = 'none';
        return;
    }

    try {
        const allCustomers = await getAllFromDB('savedCustomers');

        const filtered = allCustomers
            .filter(customer =>
                customer.value.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .slice(0, 5);

        suggestions.innerHTML = '';

        if (filtered.length > 0) {
            filtered.forEach(customer => {
                const div = document.createElement('div');
                div.className = 'customer-suggestion-item';
                div.textContent = customer.value.name;

                // ✅ FIXED CLICK HANDLER
                div.onclick = async () => {
                    const data = customer.value;

                    // 1️⃣ Fill BILL VIEW inputs
                    input.value = data.name || '';
                    if (addrInput) addrInput.value = data.address || '';
                    if (phoneInput) phoneInput.value = data.phone || '';
                    if (gstInput) gstInput.value = data.gstin || '';

                    // 2️⃣ Confirm customer ONLY on click
                    window.currentCustomer = data.name;
                    window.confirmedRegularCustomer = data.name;

                    // 3️⃣ Hide suggestions
                    suggestions.innerHTML = '';
                    suggestions.style.display = 'none';

                    // 4️⃣ Sync BILL VIEW → MODAL
                    await syncRegularData('view');

                    // 5️⃣ Apply rates if items already exist
                    if (typeof checkAndApplyCustomerRates === 'function') {
                        checkAndApplyCustomerRates(data.name);
                    }
                };

                suggestions.appendChild(div);
            });

            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }

        // ❌ DO NOT set currentCustomer while typing

    } catch (error) {
        console.error('Error searching regular customers:', error);
        suggestions.style.display = 'none';
    }
}


/* =========================================
   REGULAR MODAL CUSTOMER SUGGESTIONS
   ========================================= */

async function handleRegModalCustomerSearch(input, type) {
    const query = input.value.trim().toLowerCase();
    const suggestionsBox = document.getElementById(type === 'simple' ? 'reg-modal-simple-suggestions' : 'reg-modal-bill-suggestions');

    if (query.length < 1) {
        suggestionsBox.style.display = 'none';
        return;
    }

    try {
        // CORRECTION: Using 'savedCustomers' matching your existing logic
        const allCustomers = await getAllFromDB('savedCustomers');

        // CORRECTION: Accessing .value.name based on your snippet
        const filtered = allCustomers.filter(item =>
            item.value && item.value.name.toLowerCase().includes(query)
        ).slice(0, 5); // Limit to 5 suggestions

        suggestionsBox.innerHTML = '';

        if (filtered.length > 0) {
            filtered.forEach(item => {
                const customer = item.value; // Unwrap the customer object
                const div = document.createElement('div');
                div.className = 'customer-suggestion-item';
                div.textContent = customer.name;

                // Click handler
                div.onclick = () => selectRegModalCustomer(customer, type);

                suggestionsBox.appendChild(div);
            });
            suggestionsBox.style.display = 'block';
        } else {
            suggestionsBox.style.display = 'none';
        }
    } catch (e) {
        console.error("Error fetching customers for modal:", e);
        suggestionsBox.style.display = 'none';
    }
}

function selectRegModalCustomer(customer, type) {
    const isSimple = type === 'simple';

    // Define inputs based on Simple vs Advanced
    const nameInput = document.getElementById(isSimple ? 'reg-modal-simple-name' : 'reg-modal-bill-name');
    const phoneInput = document.getElementById(isSimple ? 'reg-modal-simple-phone' : 'reg-modal-bill-phone');
    const addrInput = document.getElementById(isSimple ? 'reg-modal-simple-addr' : 'reg-modal-bill-addr');
    const suggestionsBox = document.getElementById(isSimple ? 'reg-modal-simple-suggestions' : 'reg-modal-bill-suggestions');

    // 1. Fill Fields
    if (nameInput) nameInput.value = customer.name || '';
    if (phoneInput) phoneInput.value = customer.phone || '';
    if (addrInput) addrInput.value = customer.address || '';

    // 2. Extra fields for Advanced Mode (Bill To)
    if (!isSimple) {
        const gstInput = document.getElementById('reg-modal-bill-gst');
        // Handle potential missing fields gracefully
        if (gstInput) gstInput.value = customer.gstin || '';

        // Optional: Fill State/Code if they exist in your customer object
        if (customer.state) {
            const stateInput = document.getElementById('reg-modal-bill-state');
            if (stateInput) stateInput.value = customer.state;
        }
        if (customer.stateCode) {
            const codeInput = document.getElementById('reg-modal-bill-code');
            if (codeInput) codeInput.value = customer.stateCode;
        }
    }

    // 3. Hide Box & Sync
    if (suggestionsBox) suggestionsBox.style.display = 'none';
    syncRegularData('modal');
}

// Global Listener to close suggestions when clicking outside (Modal Specific)
document.addEventListener('click', function (e) {
    // Only run if a modal suggestion box is actually open
    const simpleBox = document.getElementById('reg-modal-simple-suggestions');
    const billBox = document.getElementById('reg-modal-bill-suggestions');

    if ((simpleBox && simpleBox.style.display === 'block') || (billBox && billBox.style.display === 'block')) {
        if (!e.target.closest('.customer-suggestions') && !e.target.closest('input[id^="reg-modal"]')) {
            if (simpleBox) simpleBox.style.display = 'none';
            if (billBox) billBox.style.display = 'none';
        }
    }
});

async function selectRegularCustomer(customer) {
    // 1. Fill Fields
    document.getElementById('custName').value = customer.name;
    document.getElementById('custAddr').value = customer.address || '';
    document.getElementById('custPhone').value = customer.phone || '';
    document.getElementById('custGSTIN').value = customer.gstin || '';

    // 2. Hide Suggestions
    document.getElementById('regular-customer-suggestions').style.display = 'none';

    // 3. Save & Trigger updates
    await saveToLocalStorage();

    // 4. Trigger Rate Application
    window.currentCustomer = customer.name;
    if (typeof checkAndApplyCustomerRates === 'function') {
        await checkAndApplyCustomerRates(customer.name);
    }
}

function toggleCustomerSort() {
    isCustomerSortAscending = !isCustomerSortAscending;
    
    // Update Button UI
    const btn = document.getElementById('customer-sort-btn');
    if (btn) {
        if (isCustomerSortAscending) {
            btn.classList.remove('ascending'); // Default icon
        } else {
            btn.classList.add('ascending'); // Flip icon
        }
    }

    // Refresh List (Triggers searchCustomers -> loadGSTCustomersList)
    searchCustomers(); 
}

function toggleSavedBillsSort() {
    isSavedBillsSortAscending = !isSavedBillsSortAscending;
    
    // Update UI
    const btn = document.getElementById('saved-bills-sort-btn');
    if (isSavedBillsSortAscending) {
        btn.classList.add('ascending');
    } else {
        btn.classList.remove('ascending');
    }

    // Re-apply filters with new sort order
    applySavedBillsFilter();
}

// Search Bills (works for both regular and GST)
function searchSavedBills() {
    // const searchTerm = document.getElementById('saved-bills-search').value.toLowerCase();
    // const billCards = document.querySelectorAll('#saved-bills-list .saved-bill-card');

    // billCards.forEach(card => {
    //     const infoEl = card.querySelector('.card-info');
    //     const subInfoEl = card.querySelector('.card-sub-info');
    //     const detailsEl = card.querySelector('.details-section');

    //     const billTitle = infoEl ? infoEl.textContent.toLowerCase() : '';
    //     const billTotal = subInfoEl ? subInfoEl.textContent.toLowerCase() : '';
    //     const billDetails = detailsEl ? detailsEl.textContent.toLowerCase() : '';

    //     if (billTitle.includes(searchTerm) || billTotal.includes(searchTerm) || billDetails.includes(searchTerm)) {
    //         card.style.display = 'block';
    //     } else {
    //         card.style.display = 'none';
    //     }
    // });

    applySavedBillsFilter();
}
async function editCustomer(customerName) {
    try {
        const customer = await getFromDB('savedCustomers', customerName);
        if (customer) {
            currentlyEditingCustomerId = customerName;
            document.getElementById('add-customer-modal-title').textContent = 'Edit Customer';
            document.getElementById('save-customer-btn').textContent = 'Update Customer';

            // PROPERLY FILL ALL FORM FIELDS
            document.getElementById('saved-customer-name').value = customer.name;
            document.getElementById('saved-customer-address').value = customer.address || '';
            document.getElementById('saved-customer-phone').value = customer.phone || '';
            document.getElementById('saved-customer-gstin').value = customer.gstin || '';

            document.getElementById('add-customer-modal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error editing customer:', error);
        showNotification('Error loading customer for editing', 'error');
    }
}

async function deleteCustomer(customerName) {
    const shouldDeleteCustomer = await showConfirm(`Are you sure you want to delete "${customerName}"?`)
    if (shouldDeleteCustomer) {
        try {
            await removeFromDB('savedCustomers', customerName);
            await loadSavedCustomers();
            await loadCustomersList();
        } catch (error) {
            console.error('Error deleting customer:', error);
        }
    }
}

async function autoSaveRegularCustomer(data) {
    // Data can be a string (name only - legacy) or object {name, address, phone, gstin, state, code}
    let name, address, phone, gstin, state, code;

    if (typeof data === 'string') {
        name = data;
        // Fallback to reading DOM if string passed
        address = document.getElementById('custAddr')?.value || '';
        phone = document.getElementById('custPhone')?.value || '';
        gstin = document.getElementById('custGSTIN')?.value || '';
    } else {
        name = data.name;
        address = data.address || '';
        phone = data.phone || '';
        gstin = data.gstin || '';
        state = data.state || '';
        code = data.code || '';
    }

    if (!name) return;

    // Check if customer already exists (Case Insensitive)
    const existingCustomers = await getAllFromDB('savedCustomers');
    const customerExists = existingCustomers.some(customer =>
        customer.value.name.toLowerCase() === name.toLowerCase()
    );

    if (customerExists) {
        console.log('Customer already exists, skipping auto-save');
        return;
    }

    // Create customer data
    const customerData = {
        name: name,
        address: address,
        phone: phone,
        gstin: gstin,
        state: state,
        code: code,
        timestamp: Date.now()
    };

    try {
        await setInDB('savedCustomers', name, customerData);
        await loadSavedCustomers(); // Refresh the customer list
        console.log('Customer auto-saved:', name);
    } catch (error) {
        console.error('Error auto-saving customer:', error);
    }
}

// Check for duplicate bill/invoice numbers
async function checkDuplicateBillNumber(number, mode, currentBillType, excludeId = null) {
    try {
        const storeName = mode === 'gst' ? 'gstSavedBills' : 'savedBills';
        const savedBills = await getAllFromDB(storeName);

        for (const bill of savedBills) {
            // Skip the bill currently being edited (Self-check)
            if (excludeId && bill.id === excludeId) continue;

            const val = bill.value;

            if (mode === 'gst') {
                // GST Logic (Standard Invoice Number check)
                if (val.invoiceDetails && val.invoiceDetails.number === number) {
                    return true;
                }
            } else {
                // REGULAR MODE: Check both Number AND Type
                const savedNo = val.customer?.billNo;
                // Default to 'Estimate' if modalState is missing (Legacy support)
                const savedType = val.modalState?.type || 'Estimate';

                // Duplicate if BOTH Number and Type match
                if (String(savedNo) === String(number) && savedType === currentBillType) {
                    return true;
                }
            }
        }
        return false;
    } catch (error) {
        console.error('Error checking duplicate bill number:', error);
        return false;
    }
}

// Reset edit mode
function resetEditMode() {
    editMode = false;
    currentEditingBillId = null;
    currentEditingBillType = null;
    updateSaveButtonAppearance();
}

// Update save button appearance
function updateSaveButtonAppearance() {
    const saveBtn = document.querySelector('.settings-btn[onclick="saveCurrentBill()"]');
    if (saveBtn) {
        if (editMode) {
            saveBtn.style.backgroundColor = '#27ae60'; // Green
            saveBtn.innerHTML = '<span class="material-icons">save</span>UPDATE BILL';
        } else {
            saveBtn.style.backgroundColor = ''; // Default
            saveBtn.innerHTML = '<span class="material-icons">save</span>SAVE BILL';
        }
    }
}

// Set edit mode
function setEditMode(billId, billType) {
    editMode = true;
    currentEditingBillId = billId;
    currentEditingBillType = billType;
    updateSaveButtonAppearance();
}

async function editSavedBill(billId, billType, event) {
    if (event) event.stopPropagation();

    // CLEAR CURRENT DATA AND SAVE TO HISTORY FIRST
    await clearAllData(true); // true = silent mode

    // Set edit mode FIRST
    setEditMode(billId, billType);

    // Store original bill number for duplicate checking
    let savedBill;
    if (billType === 'regular') {
        savedBill = await getFromDB('savedBills', billId);
        window.currentEditingBillOriginalNumber = savedBill?.customer?.billNo;
    } else {
        savedBill = await getFromDB('gstSavedBills', billId);
        window.currentEditingBillOriginalNumber = savedBill?.invoiceDetails?.number;
    }

    // SWITCH MODE BASED ON BILL TYPE
    let modeChanged = false;
    if (billType === 'gst' && !isGSTMode) {
        isGSTMode = true;
        await setInDB('gstMode', 'isGSTMode', true);
        modeChanged = true;
    } else if (billType === 'regular' && isGSTMode) {
        isGSTMode = false;
        await setInDB('gstMode', 'isGSTMode', false);
        modeChanged = true;
    }

    // Update UI if mode changed
    if (modeChanged) {
        updateUIForGSTMode();
    }

    // LOAD THE BILL DATA
    if (billType === 'regular') {
        // 1. Load Items & Basic Data
        await loadSavedBill(billId);

        // 2. --- RESTORE MODAL STATE ---
        if (savedBill && savedBill.modalState) {
            // A. Push state back to LocalStorage so loadRegularModalState() can find it
            localStorage.setItem('regularBillState', JSON.stringify(savedBill.modalState));

            // B. Ensure Custom Types exist in dropdown (if custom type was used)
            if (typeof initRegBillTypes === 'function') {
                initRegBillTypes();
            }

            // C. Restore the UI (Inputs, Labels, Prefix, View Mode)
            if (typeof loadRegularModalState === 'function') {
                loadRegularModalState();
            }

            // D. Force Label Update (specifically for custom types like Proforma)
            if (savedBill.modalState.type) {
                const typeSelect = document.getElementById('reg-modal-type-select');
                if (typeSelect) {
                    typeSelect.value = savedBill.modalState.type;
                    // Trigger change to update labels/prefixes
                    if (typeof handleRegTypeChange === 'function') {
                        handleRegTypeChange();
                    }
                    // Re-load state again to fill inputs that handleRegTypeChange might have cleared
                    if (typeof loadRegularModalState === 'function') {
                        loadRegularModalState();
                    }
                }
            }
        }
    } else {
        await loadGSTSavedBill(billId);
        updateGSTBillDisplay();
    }

    closeSavedBillsModal();
    showNotification('Edit mode activated. Make your changes and click UPDATE BILL to save.', 'info');
    await saveToLocalStorage();
}


// Delete saved bill with confirmation
async function deleteSavedBill(billId, billType, event) {
    if (event) event.stopPropagation();

    const shouldDelete = await showConfirm('Are you sure you want to delete this bill?');
    if (shouldDelete) {
        try {
            const storeName = billType === 'gst' ? 'gstSavedBills' : 'savedBills';
            await removeFromDB(storeName, billId);

            // Reload the appropriate list
            if (billType === 'gst') {
                await loadGSTSavedBillsList();
            } else {
                await loadSavedBillsList();
            }

            showNotification('Bill deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting bill:', error);
            showNotification('Error deleting bill', 'error');
        }
    }
}



// REPLACE ENTIRE saveCurrentBill FUNCTION WITH THIS:
async function saveCurrentBill() {
    // 1. CHECK VENDOR MODE FIRST
    if (typeof isVendorMode !== 'undefined' && isVendorMode) {
        await saveVendorPurchaseBill();
        return;
    }

    // 2. EXISTING SALES LOGIC
    if (isGSTMode) {
        await saveGSTCurrentBill();
    } else {
        // --- REGULAR BILL SAVE LOGIC ---

        // Determine Customer Name & Details based on View Format
        const viewFormat = document.getElementById('reg-modal-cust-view-select').value;
        let customerName = '';
        let custDataToSave = null;

        if (viewFormat === 'simple') {
            customerName = document.getElementById('reg-modal-simple-name').value.trim();
            if (customerName) {
                custDataToSave = {
                    name: customerName,
                    address: document.getElementById('reg-modal-simple-addr').value,
                    phone: document.getElementById('reg-modal-simple-phone').value
                };
            }
        } else {
            // Bill To or Both (Prioritize Bill To details for saving)
            customerName = document.getElementById('reg-modal-bill-name').value.trim();
            if (customerName) {
                custDataToSave = {
                    name: customerName,
                    address: document.getElementById('reg-modal-bill-addr').value,
                    phone: document.getElementById('reg-modal-bill-phone').value,
                    gstin: document.getElementById('reg-modal-bill-gst').value,
                    state: document.getElementById('reg-modal-bill-state').value,
                    code: document.getElementById('reg-modal-bill-code').value
                };
            }
        }

        // Fallback if modal fields are empty (Safety)
        if (!customerName) {
            customerName = document.getElementById('custName').value.trim();
        }

        const billNo = document.getElementById('billNo').value.trim();
        const totalAmount = document.getElementById('createTotalAmountManual').textContent || '0.00';

        // Validation
        if (!billNo || billNo.length === 0) {
            showNotification('Please enter a bill number before saving.', 'error');
            return;
        }

        // --- DUPLICATE CHECK WITH TYPE ---
        const currentType = document.getElementById('reg-modal-type-select').value;
        const currentId = (editMode && currentEditingBillId) ? currentEditingBillId : null;

        if (typeof checkDuplicateBillNumber === 'function') {
            const isDuplicate = await checkDuplicateBillNumber(billNo, 'regular', currentType, currentId);
            if (isDuplicate) {
                showNotification(`Bill ${billNo} already exists for ${currentType}!`, 'error');
                return;
            }
        }

        // Auto-save customer with correct details
        if (custDataToSave) {
            await autoSaveRegularCustomer(custDataToSave);
        } else if (customerName) {
            await autoSaveRegularCustomer(customerName);
        }

        try {
            const currentData = await getFromDB('billDataManual', 'currentBill');
            if (!currentData) return;

            const itemCount = document.querySelectorAll('#createListManual tbody tr[data-id]').length;

            // --- CAPTURE EXACT MODAL STATE FROM DOM ---
            const modalState = {
                // Config
                type: currentType,
                prefix: document.getElementById('reg-modal-prefix').value,
                invoiceNo: document.getElementById('reg-modal-invoice-no').value,
                date: document.getElementById('reg-modal-date').value,

                // View Format
                viewFormat: viewFormat,

                // Simple Data
                simple: {
                    name: document.getElementById('reg-modal-simple-name').value,
                    phone: document.getElementById('reg-modal-simple-phone').value,
                    addr: document.getElementById('reg-modal-simple-addr').value
                },
                // Advanced Data (Bill To)
                billTo: {
                    name: document.getElementById('reg-modal-bill-name').value,
                    addr: document.getElementById('reg-modal-bill-addr').value,
                    gst: document.getElementById('reg-modal-bill-gst').value,
                    phone: document.getElementById('reg-modal-bill-phone').value,
                    state: document.getElementById('reg-modal-bill-state').value,
                    code: document.getElementById('reg-modal-bill-code').value,
                },
                // Advanced Data (Ship To)
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

            // --- NEW: HANDLE CREATED_AT LOGIC ---
            let createdAtTimestamp = Date.now();
            
            // If editing, try to retrieve the original creation time
            if (editMode && currentEditingBillId) {
                const originalBill = await getFromDB('savedBills', currentEditingBillId);
                if (originalBill) {
                    // Use existing createdAt, or fallback to timestamp if it's an old legacy bill
                    createdAtTimestamp = originalBill.createdAt || originalBill.timestamp || Date.now();
                }
            }
            // ------------------------------------

            const savedBill = {
                ...currentData,
                title: `${customerName} - ${billNo}`,
                totalAmount: totalAmount,
                timestamp: Date.now(), // Always updates on save (Last Modified)
                createdAt: createdAtTimestamp, // Remains constant for life of bill
                date: document.getElementById('billDate').value || new Date().toLocaleDateString(),
                itemCount: itemCount,
                modalState: modalState
            };

            let billId;
            if (editMode && currentEditingBillId) {
                // EDIT MODE
                await restoreStockFromOriginalBill(currentEditingBillId);
                billId = currentEditingBillId;
                await setInDB('savedBills', billId, savedBill);
                await reduceStockOnSave();
                showNotification('Bill updated successfully!');
                resetEditMode();
            } else {
                // NORMAL MODE
                billId = `saved-bill-${Date.now()}`;
                await setInDB('savedBills', billId, savedBill);
                await reduceStockOnSave();
                showNotification('Bill saved successfully!');
            }

        } catch (error) {
            console.error('Error saving bill:', error);
        }
    }
}


/* ==========================================
   VENDOR STATE PERSISTENCE (AUTO-SAVE)
   ========================================== */

async function saveVendorState() {
    // We do NOT save items here anymore. 
    // The unified table is handled by the main saveToLocalStorage() function.

    const state = {
        isVendorMode: isVendorMode,
        // Inputs Only
        vendorName: document.getElementById('vendorName').value,
        vendorInvoiceNo: document.getElementById('vendorInvoiceNo').value,
        vendorAddr: document.getElementById('vendorAddr').value,
        vendorDate: document.getElementById('vendorDate').value,
        vendorPhone: document.getElementById('vendorPhone').value,
        vendorGSTIN: document.getElementById('vendorGSTIN').value,
        vendorEmail: document.getElementById('vendorEmail').value,
        vendorType: document.getElementById('vendorType').value
    };

    try {
        await setInDB('settings', 'vendorState', state);
    } catch (e) {
        console.error("Error saving vendor state", e);
    }
}

async function loadVendorState() {
    try {
        const state = await getFromDB('settings', 'vendorState');
        if (state) {
            // 1. Restore Mode
            // This switches the visible container (hides Sales, shows Vendor)
            if (state.isVendorMode && !isVendorMode) {
                toggleVendorMode();
            }

            // 2. Restore Inputs
            document.getElementById('vendorName').value = state.vendorName || '';
            document.getElementById('vendorInvoiceNo').value = state.vendorInvoiceNo || '';
            document.getElementById('vendorAddr').value = state.vendorAddr || '';
            document.getElementById('vendorDate').value = state.vendorDate || '';
            document.getElementById('vendorPhone').value = state.vendorPhone || '';
            document.getElementById('vendorGSTIN').value = state.vendorGSTIN || '';
            document.getElementById('vendorEmail').value = state.vendorEmail || '';
            document.getElementById('vendorType').value = state.vendorType || 'Regular';

            // 3. REMOVED: Table restoration logic. 
            // The table (including sections) is now preserved because loadFromLocalStorage() 
            // runs before this and handles the unified table structure.
        }
    } catch (e) {
        console.error("Error loading vendor state", e);
    }
}

function setupVendorAutoSave() {
    const inputs = [
        'vendorName', 'vendorInvoiceNo', 'vendorAddr', 'vendorDate',
        'vendorPhone', 'vendorGSTIN', 'vendorEmail', 'vendorType'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Save state whenever user types or changes value
            el.addEventListener('input', () => {
                // Use existing debounce logic or direct save
                saveVendorState();
            });
            el.addEventListener('change', saveVendorState);
        }
    });
}

/* ==========================================
   VENDOR MODE & PURCHASE ENTRY LOGIC
   ========================================== */

function toggleVendorMode() {
    isVendorMode = !isVendorMode;
    const body = document.body;
    const btn = document.querySelector('.vendor-mode-btn');

    // Toggle UI Elements
    const regHeading = document.getElementById('regular-bill-heading');
    const companyDetails = document.getElementById('regular-company-details');
    // Important: The selector below targets the sales customer details block
    const customerDetails = document.querySelector('#bill-container .customer-details');
    const vendorDetails = document.getElementById('vendor-details-container');
    const regFooter = document.getElementById('regular-bill-footer');
    const saveBtn = document.querySelector('.settings-btn[onclick="saveCurrentBill()"]');

    if (isVendorMode) {
        // --- SWITCH TO VENDOR MODE ---
        body.classList.add('vendor-mode');

        // Hide Sales Elements
        if (regHeading) regHeading.style.display = 'none';
        if (companyDetails) companyDetails.style.display = 'none';
        if (customerDetails) customerDetails.style.display = 'none';
        if (regFooter) regFooter.style.display = 'none';

        // Show Vendor Elements
        if (vendorDetails) vendorDetails.style.display = 'block';

        // Update Sidebar Button
        if (btn) {
            btn.style.backgroundColor = '#e67e22';
            btn.innerHTML = '<span class="material-icons">domain</span>SALES MODE';
        }

        // Update Save Button Text
        if (saveBtn) {
            saveBtn.style.backgroundColor = '#d35400';
            saveBtn.innerHTML = '<span class="material-icons">save_alt</span>SAVE PURCHASE';
        }

        // Set Default Date
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        const dateInput = document.getElementById('vendorDate');
        if (dateInput && !dateInput.value) dateInput.value = dateStr;

        // showNotification("Switched to Vendor (Purchase) Mode", "info");

    } else {
        // --- SWITCH BACK TO SALES MODE ---
        body.classList.remove('vendor-mode');

        // Show Sales Elements
        if (regHeading) regHeading.style.display = 'block';
        if (companyDetails) companyDetails.style.display = 'flex';
        if (customerDetails) customerDetails.style.display = 'block'; // customer details is a table
        if (regFooter) regFooter.style.display = 'none'; // Footer hidden by default until toggled

        // Hide Vendor Elements
        if (vendorDetails) vendorDetails.style.display = 'none';

        // Reset Buttons
        if (btn) {
            btn.style.backgroundColor = '';
            btn.innerHTML = '<span class="material-icons">store</span>VENDOR MODE';
        }

        if (saveBtn) {
            saveBtn.style.backgroundColor = '';
            saveBtn.innerHTML = '<span class="material-icons">save</span>SAVE BILL';
        }
    }
    saveVendorState();
}

function toggleVendorBillsMode() {
    const toggle = document.getElementById('vendor-bills-mode-toggle');
    currentVendorBillsMode = toggle.checked ? 'gst' : 'regular';
    loadVendorSavedBillsList();
}

async function editVendorSavedBill(billId, event) {
    if (event) event.stopPropagation();

    try {
        const bill = await getFromDB('vendorSavedBills', billId);
        if (!bill) {
            showNotification("Bill not found", "error");
            return;
        }

        // 1. Clear current workspace
        await clearAllData(true);

        // 2. Ensure we are in Vendor Mode
        if (!isVendorMode) {
            toggleVendorMode();
        }

        const data = bill.value || bill;

        // 3. Set Edit Mode Globals
        editMode = true;
        currentEditingBillId = billId;

        const saveBtn = document.querySelector('.settings-btn[onclick="saveCurrentBill()"]');
        if (saveBtn) {
            saveBtn.innerHTML = '<span class="material-icons">update</span>UPDATE PURCHASE';
            saveBtn.style.backgroundColor = '#27ae60';
        }

        // 4. Populate Inputs
        document.getElementById('vendorName').value = data.vendor.name;
        document.getElementById('vendorAddr').value = data.vendor.address || '';
        document.getElementById('vendorPhone').value = data.vendor.phone || '';
        document.getElementById('vendorGSTIN').value = data.vendor.gstin || '';
        document.getElementById('vendorEmail').value = data.vendor.email || '';
        document.getElementById('vendorInvoiceNo').value = data.billDetails.invoiceNo;
        document.getElementById('vendorDate').value = data.billDetails.date;
        document.getElementById('vendorType').value = data.billDetails.type || 'Regular';

        if (data.billDetails.file) {
            currentVendorFile = data.billDetails.file;
            const label = document.getElementById('vendorFileName');
            label.style.display = 'inline';
            label.textContent = data.billDetails.file.name;
        } else {
            currentVendorFile = null;
            document.getElementById('vendorFileName').style.display = 'none';
        }

        // 5. Populate Items (This manipulates the DOM directly)
        if (data.items && data.items.length > 0) {
            const createListTbody = document.querySelector("#createListManual tbody");
            const copyListTbody = document.querySelector("#copyListManual tbody");

            data.items.forEach(item => {
                const rowId = item.id || `row-manual-${Date.now()}-${Math.random()}`;
                const toggleStates = item.dimensionToggles || { toggle1: true, toggle2: true, toggle3: true };

                const row1 = createTableRowManual(
                    rowId, item.itemName, item.quantity, item.unit, item.rate, item.amount, item.notes || '',
                    '', true, item.quantity, item.dimensionType || 'none', item.quantity,
                    { values: item.dimensionValues || [0, 0, 0], toggle1: toggleStates.toggle1, toggle2: toggleStates.toggle2, toggle3: toggleStates.toggle3 },
                    item.dimensionUnit || 'ft', item.hsn || '', '', item.discountType || 'none', item.discountValue || 0
                );
                if (item.particularsHtml) row1.children[1].innerHTML = item.particularsHtml;
                createListTbody.appendChild(row1);

                const row2 = createTableRowManual(
                    rowId, item.itemName, item.quantity, item.unit, item.rate, item.amount, item.notes || '',
                    '', false, item.quantity, item.dimensionType || 'none', item.quantity,
                    { values: item.dimensionValues || [0, 0, 0], toggle1: toggleStates.toggle1, toggle2: toggleStates.toggle2, toggle3: toggleStates.toggle3 }
                );
                if (item.particularsHtml) row2.children[1].innerHTML = item.particularsHtml;
                copyListTbody.appendChild(row2);
            });
        }

        // 6. UI Updates
        updateSerialNumbers();
        updateTotal();
        closeVendorSavedBillsModal();
        showNotification("Purchase bill loaded for editing", "info");

        // 7. CRITICAL: Save to BOTH storages immediately
        // This persists the Table Items to billDataManual
        await saveToLocalStorage();
        // This persists the Vendor Mode & Inputs to vendorState
        await saveVendorState();

    } catch (e) {
        console.error("Error loading vendor bill", e);
        showNotification("Error loading bill", "error");
    }
}

// Handle File Upload (Convert to Base64)
function handleVendorFileSelect(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        // 5MB Limit
        if (file.size > 5 * 1024 * 1024) {
            showNotification("File too large (Max 5MB)", "error");
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            currentVendorFile = {
                name: file.name,
                type: file.type,
                data: e.target.result // Base64 string
            };
            const label = document.getElementById('vendorFileName');
            if (label) {
                label.style.display = 'inline';
                label.textContent = file.name.substring(0, 15) + '...';
            }
        };
        reader.readAsDataURL(file);
    }
}

// === SAVE PURCHASE LOGIC ===

// Helper to scrape items specifically from the Input Table (createListManual)
function getVendorItemsData() {
    const items = [];
    // Select rows from the INPUT table, not the GST view table
    document.querySelectorAll('#createListManual tbody tr[data-id]').forEach(row => {
        const cells = row.children;
        const particularsDiv = cells[1];
        const itemName = particularsDiv.querySelector('.itemNameClass')?.textContent.trim() || '';
        const notes = particularsDiv.querySelector('.notes')?.textContent || '';

        // Safely extract values
        const quantity = parseFloat(row.getAttribute('data-original-quantity') || cells[2].textContent) || 0;
        const rate = parseFloat(cells[4].textContent) || 0;
        const amount = parseFloat(cells[5].textContent) || 0;

        items.push({
            id: row.getAttribute('data-id'),
            itemName: itemName,
            quantity: quantity,
            unit: cells[3].textContent,
            rate: rate,
            amount: amount,
            notes: notes,
            // Capture all hidden attributes needed to recreate the row exactly
            hsn: row.getAttribute('data-hsn') || '',
            dimensionType: row.getAttribute('data-dimension-type') || 'none',
            dimensionValues: JSON.parse(row.getAttribute('data-dimension-values') || '[0,0,0]'),
            dimensionUnit: row.getAttribute('data-dimension-unit') || 'ft',
            dimensionToggles: JSON.parse(row.getAttribute('data-dimension-toggles') || '{"toggle1":true,"toggle2":true,"toggle3":true}'),
            discountType: row.getAttribute('data-discount-type') || 'none',
            discountValue: row.getAttribute('data-discount-value') || 0,
            particularsHtml: particularsDiv.innerHTML
        });
    });
    return items;
}

async function saveVendorPurchaseBill() {
    const vendorName = document.getElementById('vendorName').value.trim();
    const invoiceNo = document.getElementById('vendorInvoiceNo').value.trim();

    if (!vendorName || !invoiceNo) {
        showNotification("Vendor Name and Invoice No are required", "error");
        return;
    }

    // 1. Determine ID (New or Existing)
    let billId;
    if (editMode && currentEditingBillId) {
        billId = currentEditingBillId; // Keep existing ID
    } else {
        billId = `vendor-bill-${Date.now()}`; // Generate New ID
    }

    // 2. Gather Data (Using the new helper)
    const itemsData = getVendorItemsData(); // SCRAPE FROM INPUT TABLE

    const purchaseData = {
        id: billId,
        vendor: {
            name: vendorName,
            address: document.getElementById('vendorAddr').value,
            phone: document.getElementById('vendorPhone').value,
            gstin: document.getElementById('vendorGSTIN').value,
            email: document.getElementById('vendorEmail').value
        },
        billDetails: {
            invoiceNo: invoiceNo,
            date: document.getElementById('vendorDate').value,
            type: document.getElementById('vendorType').value,
            file: currentVendorFile // Base64 string
        },
        items: itemsData,
        totalAmount: document.getElementById('createTotalAmountManual').textContent,
        timestamp: Date.now()
    };

    try {
        // 3. Save Bill
        await setInDB('vendorSavedBills', billId, purchaseData);

        // 4. Auto-Save Vendor (if new)
        await autoSaveVendor(purchaseData.vendor);

        // 5. Handle Stock (Only increase if NEW bill, to avoid double counting on edits for now)
        if (!editMode) {
            await processPurchaseItems(purchaseData.items);
            showNotification("Purchase Saved & Stock Updated!", "success");
        } else {
            showNotification("Purchase Updated Successfully!", "success");
        }

        // 6. RESET UI & EXIT EDIT MODE
        // Clear Form
        document.getElementById('vendorName').value = '';
        document.getElementById('vendorInvoiceNo').value = '';
        document.getElementById('vendorAddr').value = '';
        document.getElementById('vendorPhone').value = '';
        document.getElementById('vendorGSTIN').value = '';
        document.getElementById('vendorEmail').value = '';

        // Clear Tables
        await clearAllData(true);

        // Reset File
        currentVendorFile = null;
        document.getElementById('vendorFileName').style.display = 'none';
        document.getElementById('vendorFile').value = '';

        // Reset Edit Mode State
        editMode = false;
        currentEditingBillId = null;

        // Reset Button Text
        const saveBtn = document.querySelector('.settings-btn[onclick="saveCurrentBill()"]');
        if (saveBtn) {
            saveBtn.innerHTML = '<span class="material-icons">save_alt</span>SAVE PURCHASE';
            saveBtn.style.backgroundColor = '#d35400';
        }

    } catch (e) {
        console.error("Purchase save error", e);
        showNotification("Error saving purchase bill", "error");
    }
}

async function autoSaveVendor(vendorData) {
    const vendors = await getAllFromDB('vendorList');
    const exists = vendors.find(v => v.value.name.toLowerCase() === vendorData.name.toLowerCase());

    if (!exists) {
        await setInDB('vendorList', `vendor-${Date.now()}`, vendorData);
        console.log("New vendor added automatically");
    }
}

async function processPurchaseItems(items) {
    for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        if (qty <= 0) continue;

        // Check if item exists in savedItems
        let savedItemObj = await getFromDB('savedItems', item.itemName);

        if (savedItemObj) {
            // EXISTS: Increase Stock
            const currentStock = parseFloat(savedItemObj.stockQuantity) || 0;
            savedItemObj.stockQuantity = currentStock + qty;

            // Update purchase rate to the rate in this bill
            savedItemObj.purchaseRate = parseFloat(item.rate);

            savedItemObj.lastStockUpdate = Date.now();

            await setInDB('savedItems', item.itemName, savedItemObj);
        } else {
            // NEW ITEM: Create it automatically
            const newItem = {
                name: item.itemName,
                stockQuantity: qty,
                purchaseRate: parseFloat(item.rate),
                salePrice: 0, // Default 0, user sets later
                defaultUnit: item.unit,
                category: 'Uncategorized',
                timestamp: Date.now()
            };
            await setInDB('savedItems', item.itemName, newItem);
        }
    }
}

// === VENDOR MANAGEMENT UI ===

function openManageVendorsModal() {
    toggleSettingsSidebar();
    document.getElementById('manage-vendors-modal').style.display = 'block';
    loadVendorList();
}

function closeManageVendorsModal() {
    document.getElementById('manage-vendors-modal').style.display = 'none';
}

async function loadVendorList() {
    const list = document.getElementById('vendors-list');
    list.innerHTML = '';
    const vendors = await getAllFromDB('vendorList');

    if (vendors.length === 0) { list.innerHTML = '<div class="item-card">No vendors found</div>'; return; }

    vendors.forEach(v => {
        const val = v.value;
        const menuId = `menu-vendor-${v.id}-${Date.now()}`;

        const card = document.createElement('div');
        card.className = 'customer-card';
        card.innerHTML = `
            <div class="card-header-row">
                <div class="card-info">${val.name} <span class="card-sub-info">${val.phone || ''}</span></div>
                
                <div class="card-controls">
                    <button class="icon-btn" onclick="toggleCardDetails(this)" title="Toggle Details">
                        <span class="material-icons">keyboard_arrow_down</span>
                    </button>
                    
                    <div class="action-menu-container">
                        <button class="icon-btn" onclick="toggleActionMenu(event, '${menuId}')">
                            <span class="material-icons">more_vert</span>
                        </button>
                        <div id="${menuId}" class="action-dropdown">
                            <button class="dropdown-item" onclick="openPaymentDialog('${val.name}', '${val.gstin || ''}')">
                                <span class="material-icons">payments</span> Payment & CN
                            </button>
                            <button class="dropdown-item" onclick="openLedgerDialog('${val.name}', '${val.gstin || ''}')">
                                <span class="material-icons">book</span> Ledger
                            </button>
                            <button class="dropdown-item" onclick="editVendor('${v.id}')">
                                <span class="material-icons">edit</span> Edit
                            </button>
                            <button class="dropdown-item delete-item" onclick="deleteVendor('${v.id}')">
                                <span class="material-icons">delete</span> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="details-section hidden">
                <div>${val.address || 'No Address'}</div>
                <div>GSTIN: ${val.gstin || '-'}</div>
                <div>Email: ${val.email || '-'}</div>
            </div>
        `;
        list.appendChild(card);
    });
}

function openAddVendorModal() {
    document.getElementById('saved-vendor-name').value = '';
    document.getElementById('saved-vendor-address').value = '';
    document.getElementById('saved-vendor-phone').value = '';
    document.getElementById('saved-vendor-gstin').value = '';
    document.getElementById('saved-vendor-email').value = '';
    document.getElementById('add-vendor-modal').style.display = 'block';
}

function closeAddVendorModal() {
    document.getElementById('add-vendor-modal').style.display = 'none';
    currentlyEditingVendorId = null;
}

async function saveVendor() {
    // 1. Target the specific modal to avoid ID conflicts
    const modalContext = document.getElementById('add-vendor-modal');
    if (!modalContext) {
        console.error("Vendor modal not found in DOM");
        return;
    }

    // 2. Query inputs strictly within this modal
    const nameInput = modalContext.querySelector('#saved-vendor-name');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
        console.warn("Vendor Name is empty. Checking input element:", nameInput);
        showNotification("Vendor Name is required", "error");
        return;
    }

    const vendorData = {
        name: name,
        address: modalContext.querySelector('#saved-vendor-address').value || '',
        phone: modalContext.querySelector('#saved-vendor-phone').value || '',
        gstin: modalContext.querySelector('#saved-vendor-gstin').value || '',
        email: modalContext.querySelector('#saved-vendor-email').value || '',
        timestamp: Date.now()
    };

    try {
        if (currentlyEditingVendorId) {
            // Update Existing Vendor
            console.log("Updating vendor:", currentlyEditingVendorId);
            await setInDB('vendorList', currentlyEditingVendorId, vendorData);

            // Optional: Update global vendor state inputs if this vendor is currently loaded in the main view
            const currentVendorName = document.getElementById('vendorName');
            if (currentVendorName && currentVendorName.value === name) {
                document.getElementById('vendorAddr').value = vendorData.address;
                document.getElementById('vendorPhone').value = vendorData.phone;
                document.getElementById('vendorGSTIN').value = vendorData.gstin;
                document.getElementById('vendorEmail').value = vendorData.email;
                if (typeof saveVendorState === 'function') saveVendorState();
            }

            showNotification("Vendor updated successfully", "success");
        } else {
            // Create New Vendor
            const newId = `vendor-${Date.now()}`;
            console.log("Creating new vendor:", newId);
            await setInDB('vendorList', newId, vendorData);
            showNotification("Vendor added successfully", "success");
        }

        closeAddVendorModal(); // Use the correct close function name
        await loadVendorList();   // Refresh list

        // Reset editing ID
        currentlyEditingVendorId = null;

    } catch (e) {
        console.error("Save vendor error:", e);
        showNotification("Error saving vendor", "error");
    }
}

async function deleteVendor(id) {
    if (confirm("Are you sure you want to delete this vendor?")) {
        await removeFromDB('vendorList', id);
        loadVendorList();
    }
}

// Vendor Autocomplete
async function handleVendorSearch() {
    const input = document.getElementById('vendorName');
    const suggestions = document.getElementById('vendor-suggestions');
    const val = input.value.trim().toLowerCase();

    if (val.length < 1) {
        suggestions.style.display = 'none';
        return;
    }

    try {
        const all = await getAllFromDB('vendorList');

        // Search by Name or GSTIN
        const filtered = all.filter(v =>
            v.value.name.toLowerCase().includes(val) ||
            (v.value.gstin && v.value.gstin.toLowerCase().includes(val))
        ).slice(0, 5);

        suggestions.innerHTML = '';

        if (filtered.length > 0) {
            filtered.forEach(v => {
                const div = document.createElement('div');
                div.className = 'customer-suggestion-item';

                // CHANGED: Show ONLY the name, removed GSTIN appending
                div.textContent = v.value.name;

                div.onclick = () => selectVendorSuggestion(v.value);
                suggestions.appendChild(div);
            });
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    } catch (e) {
        console.error("Vendor search error", e);
    }
}
function selectVendorSuggestion(vendorData) {
    // 1. Auto-Fill Details
    document.getElementById('vendorName').value = vendorData.name;
    document.getElementById('vendorAddr').value = vendorData.address || '';
    document.getElementById('vendorPhone').value = vendorData.phone || '';
    document.getElementById('vendorGSTIN').value = vendorData.gstin || '';
    document.getElementById('vendorEmail').value = vendorData.email || '';

    // 2. Hide Suggestions
    document.getElementById('vendor-suggestions').style.display = 'none';

    // 3. CRITICAL: Persist State Immediately
    // This ensures data is saved if page is refreshed right after clicking
    saveVendorState();
}

function openAddVendorModal() {
    currentlyEditingVendorId = null;
    document.getElementById('add-vendor-modal-title').textContent = 'Add New Vendor';
    document.getElementById('save-vendor-btn').textContent = 'Save Vendor';

    // Clear inputs
    document.getElementById('saved-vendor-name').value = '';
    document.getElementById('saved-vendor-address').value = '';
    document.getElementById('saved-vendor-phone').value = '';
    document.getElementById('saved-vendor-gstin').value = '';
    document.getElementById('saved-vendor-email').value = '';

    document.getElementById('add-vendor-modal').style.display = 'block';
}

async function editVendor(vendorId) {
    try {
        console.log("Attempting to edit vendor ID:", vendorId);

        // 1. Fetch from DB
        const result = await getFromDB('vendorList', vendorId);

        if (!result) {
            console.error("Vendor not found in database.");
            return;
        }

        // 2. Unwrap Data
        // Handle both wrapped {id, value: {..}} and direct {id, name: ..} structures
        const val = result.value || result;
        console.log("Vendor Data Loaded:", val);

        currentlyEditingVendorId = vendorId;

        // 3. Update Modal UI
        document.getElementById('add-vendor-modal-title').textContent = 'Edit Vendor';
        const saveBtn = document.getElementById('save-vendor-btn');
        if (saveBtn) saveBtn.textContent = 'Update Vendor';

        // 4. Populate Fields (Targeting specifically within the modal to avoid ambiguity)
        const modal = document.getElementById('add-vendor-modal');
        if (modal) {
            const nameInput = modal.querySelector('#saved-vendor-name');
            const addrInput = modal.querySelector('#saved-vendor-address');
            const phoneInput = modal.querySelector('#saved-vendor-phone');
            const gstinInput = modal.querySelector('#saved-vendor-gstin');
            const emailInput = modal.querySelector('#saved-vendor-email');

            if (nameInput) {
                // Ensure we handle null/undefined names gracefully
                nameInput.value = (val.name !== undefined && val.name !== null) ? val.name : '';
            }
            if (addrInput) addrInput.value = val.address || '';
            if (phoneInput) phoneInput.value = val.phone || '';
            if (gstinInput) gstinInput.value = val.gstin || '';
            if (emailInput) emailInput.value = val.email || '';

            // Show Modal
            modal.style.display = 'block';
        } else {
            console.error("Modal element 'add-vendor-modal' not found in DOM");
        }

    } catch (e) {
        console.error("Error in editVendor:", e);
    }
}

// === VENDOR BILLS HISTORY ===

function openVendorSavedBillsModal() {
    toggleSettingsSidebar();
    document.getElementById('vendor-bills-modal').style.display = 'block';

    // Reset toggle to Regular by default
    document.getElementById('vendor-bills-mode-toggle').checked = false;
    currentVendorBillsMode = 'regular';

    loadVendorSavedBillsList();
}

function closeVendorSavedBillsModal() {
    document.getElementById('vendor-bills-modal').style.display = 'none';
}

async function loadVendorSavedBillsList() {
    const list = document.getElementById('vendor-bills-list');
    list.innerHTML = '';

    let bills = await getAllFromDB('vendorSavedBills');

    if (bills.length === 0) {
        list.innerHTML = '<div class="item-card">No purchase bills found</div>';
        return;
    }

    // Filter based on toggle mode
    // Note: Older bills might not have 'type', so we assume 'Regular' if missing
    bills = bills.filter(b => {
        const type = (b.value.billDetails.type || 'Regular').toLowerCase();
        return type === currentVendorBillsMode;
    });

    if (bills.length === 0) {
        list.innerHTML = `<div class="item-card">No ${currentVendorBillsMode.toUpperCase()} bills found</div>`;
        return;
    }

    // Sort newest first
    bills.sort((a, b) => b.value.timestamp - a.value.timestamp);

    bills.forEach(b => {
        const val = b.value;
        const menuId = `menu-vbill-${b.id}-${Date.now()}`;
        const hasFile = !!val.billDetails.file;

        const card = document.createElement('div');
        card.className = 'saved-bill-card';
        card.innerHTML = `
            <div class="card-header-row">
                <div class="card-info">
                    <span>${val.vendor.name} - ${val.billDetails.invoiceNo}</span>
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
                            ${hasFile ? `
                            <button class="dropdown-item" onclick="viewBillFile('${b.id}')">
                                <span class="material-icons">description</span> View File
                            </button>` : ''}
                            
                            <button class="dropdown-item" onclick="editVendorSavedBill('${b.id}', event)">
                                <span class="material-icons">edit</span> Edit
                            </button>
                            
                            <button class="dropdown-item delete-item" onclick="deleteVendorBill('${b.id}')">
                                <span class="material-icons">delete</span> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="details-section hidden saved-bill-details">
                <div>Date: ${val.billDetails.date}</div>
                <div>GSTIN: ${val.vendor.gstin || '-'}</div>
                <div>Items: ${val.items ? val.items.length : 0}</div>
            </div>
        `;

        // Click on card body to load/edit (ignoring buttons)
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                editVendorSavedBill(b.id, e);
            }
        });

        list.appendChild(card);
    });
}

/* ==========================================
   IMAGE VIEWER ZOOM & PAN LOGIC
   ========================================== */

let imgState = {
    scale: 1,
    panning: false,
    pointX: 0,
    pointY: 0,
    startX: 0,
    startY: 0,
    // Touch specifics
    lastTouchDist: 0
};

function initImageZoom() {
    const img = document.getElementById('file-viewer-img');
    const container = document.querySelector('#file-viewer-modal .modal-body');

    if (!img || !container) return;

    // Reset State
    imgState = { scale: 1, panning: false, pointX: 0, pointY: 0, startX: 0, startY: 0, lastTouchDist: 0 };
    updateImageTransform();

    // --- MOUSE EVENTS (PC) ---

    // 1. Zoom (Scroll)
    container.onwheel = function (e) {
        e.preventDefault();
        const xs = (e.clientX - imgState.pointX) / imgState.scale;
        const ys = (e.clientY - imgState.pointY) / imgState.scale;

        const delta = -e.deltaY;

        // Zoom Factor
        (delta > 0) ? (imgState.scale *= 1.1) : (imgState.scale /= 1.1);

        // Limits (0.5x to 10x)
        if (imgState.scale < 0.5) imgState.scale = 0.5;
        if (imgState.scale > 10) imgState.scale = 10;

        updateImageTransform();
    };

    // 2. Pan Start (MouseDown)
    img.onmousedown = function (e) {
        e.preventDefault();
        imgState.startX = e.clientX - imgState.pointX;
        imgState.startY = e.clientY - imgState.pointY;
        imgState.panning = true;
        img.style.cursor = 'grabbing'; // Visual feedback during drag
    };

    // 3. Pan Move (MouseMove)
    container.onmousemove = function (e) {
        e.preventDefault();
        if (!imgState.panning) return;
        imgState.pointX = e.clientX - imgState.startX;
        imgState.pointY = e.clientY - imgState.startY;
        updateImageTransform();
    };

    // 4. Pan End (MouseUp)
    container.onmouseup = function (e) {
        imgState.panning = false;
        img.style.cursor = 'move'; // Revert to requested cursor
    };

    container.onmouseleave = function (e) {
        imgState.panning = false;
        img.style.cursor = 'move';
    }

    // --- TOUCH EVENTS (MOBILE) ---

    // 1. Touch Start
    container.ontouchstart = function (e) {
        if (e.touches.length === 1) {
            // Single finger = Pan
            const touch = e.touches[0];
            imgState.startX = touch.clientX - imgState.pointX;
            imgState.startY = touch.clientY - imgState.pointY;
            imgState.panning = true;
        } else if (e.touches.length === 2) {
            // Two fingers = Zoom Init
            imgState.panning = false;
            imgState.lastTouchDist = getTouchDistance(e.touches);
        }
    };

    // 2. Touch Move
    container.ontouchmove = function (e) {
        e.preventDefault(); // Prevent page scroll

        if (e.touches.length === 1 && imgState.panning) {
            // Pan Logic
            const touch = e.touches[0];
            imgState.pointX = touch.clientX - imgState.startX;
            imgState.pointY = touch.clientY - imgState.startY;
            updateImageTransform();
        } else if (e.touches.length === 2) {
            // Pinch Zoom Logic
            const currentDist = getTouchDistance(e.touches);
            if (imgState.lastTouchDist > 0) {
                const ratio = currentDist / imgState.lastTouchDist;
                imgState.scale *= ratio;

                // Limits
                if (imgState.scale < 0.5) imgState.scale = 0.5;
                if (imgState.scale > 10) imgState.scale = 10;

                updateImageTransform();
            }
            imgState.lastTouchDist = currentDist;
        }
    };

    // 3. Touch End
    container.ontouchend = function (e) {
        imgState.panning = false;
        imgState.lastTouchDist = 0;
    };
}

// Helper: Calculate distance between two fingers
function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Helper: Apply CSS
function updateImageTransform() {
    const img = document.getElementById('file-viewer-img');
    if (img) {
        img.style.transform = `translate(${imgState.pointX}px, ${imgState.pointY}px) scale(${imgState.scale})`;
    }
}

// --- KEYBOARD EVENTS ---
document.addEventListener('keydown', function (e) {
    // Only active if modal is open
    const modal = document.getElementById('file-viewer-modal');
    if (modal.style.display !== 'block' && modal.style.display !== 'flex') return;

    if (e.ctrlKey) {
        // Numpad + or standard + (keycode 107 or 187)
        if (e.key === '+' || e.code === 'NumpadAdd' || e.key === '=') {
            e.preventDefault();
            imgState.scale *= 1.1;
            updateImageTransform();
        }
        // Numpad - or standard - (keycode 109 or 189)
        if (e.key === '-' || e.code === 'NumpadSubtract') {
            e.preventDefault();
            imgState.scale /= 1.1;
            if (imgState.scale < 0.5) imgState.scale = 0.5;
            updateImageTransform();
        }
        // Reset (Ctrl + 0)
        if (e.key === '0' || e.code === 'Numpad0') {
            e.preventDefault();
            imgState.scale = 1;
            imgState.pointX = 0;
            imgState.pointY = 0;
            updateImageTransform();
        }
    }
});

// View Uploaded File
// UPDATE THIS FUNCTION
async function viewBillFile(id) {
    const bill = await getFromDB('vendorSavedBills', id);
    if (bill && bill.billDetails.file) {
        const file = bill.billDetails.file;
        const modal = document.getElementById('file-viewer-modal');
        const img = document.getElementById('file-viewer-img');
        const iframe = document.getElementById('file-viewer-pdf');
        const msg = document.getElementById('file-viewer-msg');

        modal.style.display = 'flex';
        img.style.display = 'none';
        iframe.style.display = 'none';
        msg.style.display = 'none';

        // Reset Transform style immediately
        img.style.transform = 'translate(0px, 0px) scale(1)';

        if (file.type.includes('image')) {
            img.src = file.data;
            img.style.display = 'block';

            // INITIALIZE ZOOM CONTROLS HERE
            initImageZoom();

        } else if (file.type.includes('pdf')) {
            iframe.src = file.data;
            iframe.style.display = 'block';
            // Remove zoom listeners for PDF to allow native PDF controls
            const container = document.querySelector('#file-viewer-modal .modal-body');
            container.onwheel = null;
            container.onmousedown = null;
            container.ontouchstart = null;
        } else {
            msg.style.display = 'block';
            msg.textContent = "File format not supported for preview";
        }
    }
}

// UPDATE THIS FUNCTION
function closeFileViewerModal() {
    document.getElementById('file-viewer-modal').style.display = 'none';
    const img = document.getElementById('file-viewer-img');
    img.src = '';
    document.getElementById('file-viewer-pdf').src = '';

    // Clean up Event Listeners to prevent errors when modal is closed
    const container = document.querySelector('#file-viewer-modal .modal-body');
    if (container) {
        container.onwheel = null;
        container.onmousedown = null;
        container.onmousemove = null;
        container.onmouseup = null;
        container.onmouseleave = null;
        container.ontouchstart = null;
        container.ontouchmove = null;
        container.ontouchend = null;
    }

    // Reset Image State
    if (img) {
        img.style.transform = 'none';
        img.style.cursor = 'move';
    }
}

async function deleteVendorBill(id) {
    if (confirm("Delete this purchase record? (Note: Stock added by this bill will NOT be reverted automatically)")) {
        await removeFromDB('vendorSavedBills', id);
        loadVendorSavedBillsList();
    }
}

function searchVendorBills() {
    const term = document.getElementById('vendor-bills-search').value.toLowerCase();
    const cards = document.querySelectorAll('#vendor-bills-list .saved-bill-card');

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
    });
}

function searchVendors() {
    const term = document.getElementById('vendor-search').value.toLowerCase();
    const cards = document.querySelectorAll('#vendors-list .customer-card');

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
    });
}

// VENDOR FUNCTIONS END

async function restoreStockFromOriginalBill(billId) {
    try {
        const originalBill = await getFromDB('savedBills', billId);
        if (!originalBill || !originalBill.tableStructure) return;

        // Restore stock for each item in the original bill
        for (const rowData of originalBill.tableStructure) {
            if (rowData.type === 'item' && rowData.itemName) {
                const savedItem = await getFromDB('savedItems', rowData.itemName);
                if (savedItem && savedItem.stockQuantity !== undefined) {
                    const originalQuantity = parseFloat(rowData.quantity) || 0;
                    // Add back the original quantity to stock
                    savedItem.stockQuantity += originalQuantity;
                    await setInDB('savedItems', rowData.itemName, savedItem);
                }
            }
        }
    } catch (error) {
        console.error('Error restoring stock from original bill:', error);
    }
}

// Open Saved Bills Modal
function openSavedBillsModal() {
    const modal = document.getElementById('saved-bills-modal');
    if (!modal) return;
    modal.style.display = 'block';

    // 1. Reset to regular mode by default
    const toggle = document.getElementById('bills-mode-toggle');
    if (toggle) toggle.checked = false;
    currentBillsMode = 'regular';

    // 2. Reset Sort Button to Default (Descending)
    isSavedBillsSortAscending = false; 
    const sortBtn = document.getElementById('saved-bills-sort-btn');
    if (sortBtn) {
        sortBtn.classList.remove('ascending');
    }

    // 3. Ensure Type Filter is Visible (for Regular)
    const filterSelect = document.getElementById('saved-prefix-filter');
    if (filterSelect) {
        filterSelect.style.display = 'inline-block';
        filterSelect.value = 'all'; // Reset selection
    }
    
    // 4. Reset Search Placeholder & Input
    const searchInput = document.getElementById('saved-bills-search');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = "Search... (/amt/500, /date/23, /month/12)";
    }

    // 5. Load Regular Bills
    loadSavedBillsList();
    
    if (typeof toggleSettingsSidebar === 'function') toggleSettingsSidebar();
}


function closeSavedBillsModal() {
    document.getElementById('saved-bills-modal').style.display = 'none';
}

async function loadSavedBillsList() {
    try {
        const savedBills = await getAllFromDB('savedBills');
        const billsList = document.getElementById('saved-bills-list');
        billsList.innerHTML = '';

        // --- FIX: Populate Filter by Bill Type ---
        const filterSelect = document.getElementById('saved-prefix-filter');
        if (filterSelect) {
            // Extract unique types
            const types = new Set(savedBills.map(b => b.value.modalState?.type || 'Regular').filter(t => t));

            filterSelect.innerHTML = '<option value="all">All Types</option>';
            types.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type;
                opt.textContent = type;
                filterSelect.appendChild(opt);
            });
        }

        if (savedBills.length === 0) {
            billsList.innerHTML = '<div class="saved-bill-card">No regular bills saved yet</div>';
            return;
        }

        // --- UPDATED SORTING LOGIC: CreatedAt Descending (Fallback to Timestamp) ---
        savedBills.sort((a, b) => {
            const timeA = a.value.createdAt || a.value.timestamp || 0;
            const timeB = b.value.createdAt || b.value.timestamp || 0;
            return timeB - timeA; // Descending (Newest Original Creation First)
        });
        // --------------------------------------------------------------------------

        savedBills.forEach(bill => {
            const billCard = document.createElement('div');
            billCard.className = 'saved-bill-card';

            const menuId = `menu-bill-${bill.id}-${Date.now()}`;

            // Get Data from Saved Modal State
            const state = bill.value.modalState || {};
            const rawBillNo = state.invoiceNo || bill.value.customer?.billNo || 'N/A';
            const prefix = state.prefix || '';
            const billType = state.type || 'Estimate'; // Default text

            // --- FIX START: Determine Customer Name based on View Format ---
            const viewFormat = state.viewFormat || 'simple';
            let custName = 'N/A';

            if (viewFormat === 'simple') {
                custName = state.simple?.name;
            } else if (viewFormat === 'bill_to' || viewFormat === 'both') {
                custName = state.billTo?.name;
            }

            // Fallback if the specific name is empty
            if (!custName) {
                custName = bill.value.customer?.name || 'N/A';
            }
            // --- FIX END ---

            // Construct Display Number (Prefix + No)
            const displayBillNo = prefix ? `${prefix}${rawBillNo}` : rawBillNo;

            // --- FIX: Card HTML with Prefix and Type ---
            billCard.innerHTML = `
                <div class="card-header-row">
                    <div class="card-info">
                        <span>${displayBillNo} - ${custName}</span>
                        <span class="card-sub-info" style="font-size: 0.85em; color: #666; color:var(--primary-color);font-weight: 500;">${billType}</span>
                        <span class="card-sub-info">₹${bill.value.totalAmount}</span>
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
                    <div>Date: ${bill.value.date}</div>
                    <div>Items: ${bill.value.items?.length || bill.value.itemCount || 0}</div>
                    
                </div>
            `;

            billCard.addEventListener('click', async (e) => {
                if (e.target.closest('.card-controls')) return;
                resetEditMode();
                await clearAllData(true);
                if (isGSTMode) {
                    isGSTMode = false;
                    updateUIForGSTMode();
                }
                await loadSavedBill(bill.id);
                closeSavedBillsModal();
            });
            billsList.appendChild(billCard);
        });
    } catch (error) {
        console.error('Error loading saved bills:', error);
    }
}

async function loadSavedBill(billId) {
    try {
        const savedBill = await getFromDB('savedBills', billId);
        if (!savedBill) return;

        // FIX: Persist Regular Mode to DB so it stays in Regular Mode after refresh
        await setInDB('gstMode', 'isGSTMode', false);

        await setInDB('billDataManual', 'currentBill', savedBill);
        await loadFromLocalStorage();
        saveStateToHistory();

        // ------------------------------------------------------------
        // === RESTORE REGULAR MODAL STATE ===
        // ------------------------------------------------------------
        const state = savedBill.modalState;
        if (state) {
            // 1. Push state to LocalStorage
            localStorage.setItem('regularBillState', JSON.stringify(state));

            // 2. Initialize Dropdowns
            if (typeof initRegBillTypes === 'function') {
                initRegBillTypes();
            }

            // 3. SET TYPE & PREFIX FIRST
            if (document.getElementById('reg-modal-type-select')) {
                document.getElementById('reg-modal-type-select').value = state.type || 'Estimate';
            }

            // 4. TRIGGER TYPE CHANGE (Updates Labels)
            // FIX: Pass 'true' to prevent generating a new invoice number
            if (typeof handleRegTypeChange === 'function') {
                await handleRegTypeChange(true);
            }

            // 5. RESTORE TYPE & PREFIX AGAIN (Safety measure)
            if (document.getElementById('reg-modal-type-select')) document.getElementById('reg-modal-type-select').value = state.type || 'Estimate';
            if (document.getElementById('reg-modal-prefix')) document.getElementById('reg-modal-prefix').value = state.prefix || '';

            // 6. RESTORE INVOICE NUMBER (Now safe from overwrite)
            if (document.getElementById('reg-modal-invoice-no')) {
                document.getElementById('reg-modal-invoice-no').value = state.invoiceNo || '';
            }

            if (document.getElementById('reg-modal-date')) document.getElementById('reg-modal-date').value = state.date || '';

            // 7. SET VIEW FORMAT (Check both keys for safety)
            if (document.getElementById('reg-modal-cust-view-select')) {
                // FIX: Check viewFormat (Correct) OR viewMode (Legacy/Bugged)
                document.getElementById('reg-modal-cust-view-select').value = state.viewFormat || state.viewMode || 'simple';

                if (typeof handleRegViewChange === 'function') {
                    handleRegViewChange();
                }
            }

            // 8. RESTORE DATA FIELDS
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
                if (document.getElementById('reg-modal-bill-state')) document.getElementById('reg-modal-bill-state').value = state.billTo.state || 'Maharashtra';
                if (document.getElementById('reg-modal-bill-code')) document.getElementById('reg-modal-bill-code').value = state.billTo.code || '27';
            }

            if (state.shipTo) {
                if (document.getElementById('reg-modal-ship-name')) document.getElementById('reg-modal-ship-name').value = state.shipTo.name || '';
                if (document.getElementById('reg-modal-ship-addr')) document.getElementById('reg-modal-ship-addr').value = state.shipTo.addr || '';
                if (document.getElementById('reg-modal-ship-gst')) document.getElementById('reg-modal-ship-gst').value = state.shipTo.gst || '';
                if (document.getElementById('reg-modal-ship-phone')) document.getElementById('reg-modal-ship-phone').value = state.shipTo.phone || '';
                if (document.getElementById('reg-modal-ship-state')) document.getElementById('reg-modal-ship-state').value = state.shipTo.state || 'Maharashtra';
                if (document.getElementById('reg-modal-ship-code')) document.getElementById('reg-modal-ship-code').value = state.shipTo.code || '27';
                if (document.getElementById('reg-modal-ship-pos')) document.getElementById('reg-modal-ship-pos').value = state.shipTo.pos || 'Maharashtra';
            }

            // 9. SYNC TO MAIN VIEW
            if (typeof saveRegularBillDetails === 'function') {
                saveRegularBillDetails(true);
            }
        }
        // ------------------------------------------------------------

        if (currentView === 'input') toggleView();

        resetColumnVisibility();
    } catch (error) {
        console.error('Error loading saved bill:', error);
    }
}


// Add this helper function to format numbers (remove .00 when whole number)
function formatNumber(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return value;

    // Check if it's a whole number (no decimal part or .00)
    if (num % 1 === 0) {
        return num.toString(); // Return without decimals
    } else {
        return num.toFixed(2); // Return with 2 decimals for non-whole numbers
    }
}

function formatParticularsManual(itemName, notes, dimensions = '', quantity = 0, finalQuantity = 0, rate = 0, dimensionType = 'none', dimensionUnit = 'ft', unit = '', discountType = 'none', discountValue = '', toggleStates = null, convertUnit = 'none') {
    let particularsHtml = `<div class="itemNameClass">${itemName}</div>`;

    // Format the values using the helper function
    const formattedQuantity = formatNumber(quantity);
    const formattedFinalQuantity = formatNumber(finalQuantity);
    const formattedRate = formatNumber(rate);

    let calculationText = '';
    let discountText = '';

    // Build calculation text based on dimension type
    if (dimensionType !== 'none' && dimensions) {
        // COUNT ONLY GEOMETRIC DIMENSIONS (ignore quantity)
        let geometricDimensionsCount = 0;

        switch (dimensionType) {
            case 'length':
                geometricDimensionsCount = 1;
                break;
            case 'widthXheight':
            case 'widthXdepth':
            case 'lengthXdepth':
            case 'lengthXheight':
            case 'lengthXwidth':
                geometricDimensionsCount = 2;
                break;
            case 'widthXheightXdepth':
            case 'lengthXwidthXheight':
            case 'lengthXheightXdepth':
            case 'lengthXwidthXdepth':
                geometricDimensionsCount = 3;
                break;
            default:
                geometricDimensionsCount = 0;
        }

        // ADJUST for unchecked toggles
        if (toggleStates) {
            let actualUsedDimensions = 0;
            // Recalculate based on what is actually physically present in the calculation
            // We can't just map type to toggles blindly because different types use different toggles
            // But since we only need the count for the unit suffix (ft, sq.ft, cu.ft), we can count true toggles
            // LIMITED by the geometric max of that type.

            let activeCount = 0;
            if (toggleStates.toggle1) activeCount++;
            if (toggleStates.toggle2) activeCount++;
            if (toggleStates.toggle3) activeCount++;

            // If type is 2D but 3 toggles are active (shouldn't happen logic-wise but safety check), cap it
            geometricDimensionsCount = Math.min(geometricDimensionsCount, activeCount);
        }

        // DETERMINE UNIT SUFFIX based on convertUnit OR dimensionUnit
        let displayUnit = (convertUnit && convertUnit !== 'none') ? convertUnit : dimensionUnit;
        let unitSuffix = '';

        switch (geometricDimensionsCount) {
            case 1:
                unitSuffix = displayUnit; // Linear
                break;
            case 2:
                unitSuffix = displayUnit + '²'; // Area
                break;
            case 3:
                unitSuffix = displayUnit + '³'; // Volume
                break;
            default:
                unitSuffix = displayUnit; // Fallback
        }

        calculationText = `${dimensions} X ${formattedQuantity}${unit} = ${formattedFinalQuantity}${unitSuffix}`;
    } else {
        calculationText = `${formattedQuantity}${unit} @ ${formattedRate}/${unit}`;
    }

    // Build discount text based on discount type
    if (discountType !== 'none' && discountValue) {
        switch (discountType) {
            case 'percent_per_unit':
                discountText = ` (Less : ${discountValue}%/${unit})`;
                break;
            case 'amt_per_unit':
                discountText = ` (Less : ${discountValue}₹/${unit})`;
                break;
            case 'percent_on_amount':
                discountText = ` (Less : ${discountValue}%/amt)`;
                break;
            case 'amt_on_amount':
                discountText = ` (Less : ${discountValue}₹/amt)`;
                break;
        }
    }

    if (dimensionType !== 'none' && showDimensions) {
        particularsHtml += `<div class="dimensions" style="font-size: 0.8em; color: #666; margin: 5px 0;">${calculationText}${discountText}</div>`;
    } else if (showDimensions) {
        particularsHtml += `<div class="dimensions" style="font-size: 0.8em; color: #666; margin: 5px 0;">${calculationText}${discountText}</div>`;
    }

    if (notes) {
        particularsHtml += `<p class="notes">${notes}</p>`;
    }
    return particularsHtml;
}

// Add this line in the addRowManual, updateRowManual, and removeRowManual functions
// After calling updateTotal(), add:
function refreshCopyTableTotal() {
    const total = Array.from(document.querySelectorAll('#createListManual tbody tr[data-id]'))
        .reduce((sum, row) => {
            const amountCell = row.querySelector('.amount');
            if (amountCell) {
                const amountValue = parseFloat(amountCell.textContent) || 0;
                return sum + amountValue;
            }
            return sum;
        }, 0);

    const copyTotalElement = document.getElementById('copyTotalAmount');
    if (copyTotalElement) {
        copyTotalElement.textContent = total.toFixed(2);
    }
}

// Function: Add Row Manual
async function addRowManual() {
    let itemName = document.getElementById("itemNameManual").value.trim();
    let quantity = parseFloat(document.getElementById("quantityManual").value.trim());
    let unit = document.getElementById("selectUnit").value.trim();
    let rate = parseFloat(document.getElementById("rateManual").value.trim());

    // GST Inclusive Logic
    if (isGSTMode && isGSTInclusive && currentGSTPercent > 0) {
        rate = rate / (1 + currentGSTPercent / 100);
    }

    const notes = document.getElementById("itemNotesManual").value.trim();

    // Get HSN code if in GST mode
    let hsnCode = '';
    let productCode = '';
    if (isGSTMode) {
        hsnCode = document.getElementById("hsnCodeManual").value.trim();
        productCode = document.getElementById("productCodeManual").value.trim();
    }

    // Get discount values
    const discountType = document.getElementById("discountType").value;
    const discountValue = parseFloat(document.getElementById("discountValue").value) || 0;

    // ENSURE DIMENSION VALUES ARE PROPERLY CALCULATED FIRST
    calculateDimensions();

    // CAPTURE DIMENSION DATA
    const currentDimType = currentDimensions.type;
    const currentDimValues = [...currentDimensions.values];
    const currentDimUnit = currentDimensions.unit;
    const currentDimArea = currentDimensions.calculatedArea;

    // CAPTURE TOGGLE STATES
    const dim1Toggle = document.getElementById('dimension1-toggle');
    const dim2Toggle = document.getElementById('dimension2-toggle');
    const dim3Toggle = document.getElementById('dimension3-toggle');
    const toggleStates = {
        toggle1: dim1Toggle ? dim1Toggle.checked : true,
        toggle2: dim2Toggle ? dim2Toggle.checked : true,
        toggle3: dim3Toggle ? dim3Toggle.checked : true
    };

    // Get dimensions display text
    const dimensionText = getDimensionDisplayText(currentDimType, currentDimValues, currentDimUnit, toggleStates);

    // Store original quantity with full precision
    const originalQuantity = quantity;

    // --- NEW CONVERSION LOGIC ---
    let power = 0;
    if (currentDimType !== 'none' && currentDimType !== 'dozen') {
        if (toggleStates.toggle1) power++;
        if (['widthXheight', 'widthXdepth', 'lengthXdepth', 'lengthXheight', 'lengthXwidth', 'widthXheightXdepth', 'lengthXwidthXheight', 'lengthXheightXdepth', 'lengthXwidthXdepth'].includes(currentDimType)) {
            if (toggleStates.toggle2) power++;
        }
        if (['widthXheightXdepth', 'lengthXwidthXheight', 'lengthXheightXdepth', 'lengthXwidthXdepth'].includes(currentDimType)) {
            if (toggleStates.toggle3) power++;
        }
    }
    const selectedConvertUnit = document.getElementById('convertUnit').value;
    const conversionFactor = getConversionFactor(currentDimUnit, selectedConvertUnit, power);
    // ----------------------------

    // Calculate base amount
    let calculatedQuantity = quantity;
    let baseAmount = 0;

    if (currentDimType !== 'none' && currentDimType !== 'dozen' && currentDimArea > 0) {
        // Apply conversion factor
        calculatedQuantity = (quantity * currentDimArea) * conversionFactor;
        baseAmount = storeWithPrecision(calculatedQuantity * rate);
    } else if (currentDimType === 'dozen') {
        calculatedQuantity = quantity / 12;
        baseAmount = storeWithPrecision(calculatedQuantity * rate);
    } else {
        baseAmount = quantity * rate;
    }

    // CALCULATE DISCOUNT
    let discountAmount = 0;
    let finalAmount = baseAmount;

    if (discountType !== 'none' && discountValue > 0) {
        switch (discountType) {
            case 'percent_per_unit':
                const discountPerUnit = rate * (discountValue / 100);
                discountAmount = discountPerUnit * (currentDimType !== 'none' && currentDimType !== 'dozen' ? calculatedQuantity : quantity);
                break;
            case 'amt_per_unit':
                discountAmount = discountValue * (currentDimType !== 'none' && currentDimType !== 'dozen' ? calculatedQuantity : quantity);
                break;
            case 'percent_on_amount':
                discountAmount = baseAmount * (discountValue / 100);
                break;
            case 'amt_on_amount':
                discountAmount = discountValue;
                break;
        }
        finalAmount = storeWithPrecision(baseAmount - discountAmount);
        if (finalAmount < 0) finalAmount = 0;
    }

    if (isNaN(quantity) || isNaN(rate) || !itemName) {
        return;
    }

    const id = 'row-manual-' + rowCounterManual++;

    const row1 = createTableRowManual(
        id,
        itemName,
        originalQuantity.toFixed(8),
        unit,
        rate,
        finalAmount,
        notes,
        dimensionText,
        true,
        calculatedQuantity,
        currentDimType,
        originalQuantity,
        {
            values: currentDimValues,
            toggle1: toggleStates.toggle1,
            toggle2: toggleStates.toggle2,
            toggle3: toggleStates.toggle3
        },
        currentDimUnit,
        hsnCode,
        productCode,
        discountType,
        discountValue,
        true,
        selectedConvertUnit // Pass convert unit
    );

    row1.setAttribute('data-amount', storeWithPrecision(finalAmount));
    row1.setAttribute('data-rate', storeWithPrecision(rate));

    const row2 = createTableRowManual(
        id,
        itemName,
        originalQuantity.toFixed(8),
        unit,
        rate,
        finalAmount,
        notes,
        dimensionText,
        false,
        calculatedQuantity,
        currentDimType,
        originalQuantity,
        {
            values: currentDimValues,
            toggle1: toggleStates.toggle1,
            toggle2: toggleStates.toggle2,
            toggle3: toggleStates.toggle3
        },
        currentDimUnit,
        hsnCode,
        productCode,
        discountType,
        discountValue,
        true,
        selectedConvertUnit // Pass convert unit
    );

    document.getElementById("createListManual").querySelector('tbody').appendChild(row1);
    document.getElementById("copyListManual").querySelector('tbody').appendChild(row2);

    if (isGSTMode) {
        copyItemsToGSTBill();
        updateGSTTaxCalculation();
    }

    updateSerialNumbers();
    updateTotal();
    refreshCopyTableTotal();
    await saveToLocalStorage();
    saveStateToHistory();

    // --- RESET INPUTS ---
    document.getElementById("itemNameManual").value = "";
    document.getElementById("quantityManual").value = "";
    document.getElementById("rateManual").value = "";
    document.getElementById("itemNotesManual").value = "";
    document.getElementById("dimension1").value = "";
    document.getElementById("dimension2").value = "";
    document.getElementById("dimension3").value = "";
    document.getElementById("selectUnit").value = "";

    if (isGSTMode) {
        document.getElementById("hsnCodeManual").value = "";
        document.getElementById("productCodeManual").value = "";
    }

    // --- RESET DISCOUNT UI ---
    document.getElementById("discountType").value = "none";
    document.getElementById("discountValue").value = "";
    // Hide container and reset button style
    document.getElementById("discount-inputs-container").style.display = "none";
    document.getElementById("toggleDiscountBtn").style.backgroundColor = "";

    // --- RESET DIMENSION UI ---
    document.getElementById('dimensionType').value = 'none';
    document.getElementById('measurementUnit').style.display = 'none';
    document.getElementById('dimensionInputs').style.display = 'none';
    // Hide container and reset button style
    document.getElementById("dimension-inputs-container").style.display = "none";
    document.getElementById("toggleDimensionBtn").style.backgroundColor = "";

    // --- RESET CONVERT UI ---
    document.getElementById('toggleConvertBtn').style.display = 'none';
    document.getElementById('toggleConvertBtn').classList.remove('active');
    document.getElementById('toggleConvertBtn').style.backgroundColor = "";
    document.getElementById('convertUnit').style.display = 'none';
    document.getElementById('convertUnit').value = 'none';
    currentConvertUnit = 'none';

    currentDimensions = {
        type: 'none',
        unit: 'ft',
        values: [0, 0, 0],
        calculatedArea: 0
    };

    document.getElementById("itemNameManual").focus();

    applyColumnVisibility();
    updateGlobalDimensionButtonState();
    // Auto-apply rates for the newly added item (if applicable)
    await checkAndApplyCustomerRates();
}

function cancelUpdateManual() {
    // 1. CAPTURE DATA
    const targetRowId = currentlyEditingRowIdManual;
    const scrollPosToRestore = lastScrollPosition;

    // --- STEP A: INSTANT VISUAL CLEANUP ---
    // Remove background color and transitions from ALL rows immediately
    const allRows = document.querySelectorAll('#createListManual tr');
    allRows.forEach(r => {
        r.style.backgroundColor = '';
        r.style.transition = 'none'; // Disable transition to clear instantly
    });

    // 2. Clear Inputs
    document.getElementById("itemNameManual").value = "";
    document.getElementById("quantityManual").value = "";
    document.getElementById("rateManual").value = "";
    document.getElementById("itemNotesManual").value = "";
    document.getElementById("dimension1").value = "";
    document.getElementById("dimension2").value = "";
    document.getElementById("dimension3").value = "";
    document.getElementById("selectUnit").value = "";

    // Clear GST
    const hsnInput = document.getElementById("hsnCodeManual");
    if (hsnInput) hsnInput.value = "";
    const prodInput = document.getElementById("productCodeManual");
    if (prodInput) prodInput.value = "";

    // 3. Reset UI Sections
    document.getElementById("discountType").value = "none";
    document.getElementById("discountValue").value = "";
    document.getElementById("discount-inputs-container").style.display = "none";
    document.getElementById("toggleDiscountBtn").style.backgroundColor = "";

    document.getElementById('dimensionType').value = 'none';
    document.getElementById('measurementUnit').style.display = 'none';
    document.getElementById('dimensionInputs').style.display = 'none';
    document.getElementById("dimension-inputs-container").style.display = "none";
    document.getElementById("toggleDimensionBtn").style.backgroundColor = "";

    document.getElementById('toggleConvertBtn').style.display = 'none';
    document.getElementById('toggleConvertBtn').classList.remove('active');
    document.getElementById('toggleConvertBtn').style.backgroundColor = "";
    document.getElementById('convertUnit').style.display = 'none';
    document.getElementById('convertUnit').value = 'none';
    currentConvertUnit = 'none';

    currentDimensions = { type: 'none', unit: 'ft', values: [0, 0, 0], calculatedArea: 0 };

    // 4. Reset Buttons
    document.getElementById("addItemBtnManual").style.display = "inline-block";
    document.getElementById("updateItemBtnManual").style.display = "none";
    document.getElementById("cancelUpdateBtnManual").style.display = "none";

    // 5. Clear Editing State & Blur
    currentlyEditingRowIdManual = null;
    if (document.activeElement) {
        document.activeElement.blur();
    }

    // --- STEP B: RESTORE SCROLL POSITION ---
    if (typeof autoScrollEnabled !== 'undefined' && autoScrollEnabled) {
        window.scrollTo({
            top: scrollPosToRestore,
            behavior: 'smooth'
        });
    } else {
        // Auto Scroll OFF
        document.getElementById("itemNameManual").focus();
    }
}

async function updateRowManual() {
    if (!currentlyEditingRowIdManual) return;

    let itemName = document.getElementById("itemNameManual").value.trim();
    let quantityInput = document.getElementById("quantityManual").value.trim();
    let quantity = parseFloat(quantityInput);
    let unit = document.getElementById("selectUnit").value.trim();
    let rate = parseFloat(document.getElementById("rateManual").value.trim());

    if (isGSTMode && isGSTInclusive && currentGSTPercent > 0) {
        rate = rate / (1 + currentGSTPercent / 100);
    }
    const notes = document.getElementById("itemNotesManual").value.trim();

    let hsnCode = '';
    let productCode = '';
    if (isGSTMode) {
        hsnCode = document.getElementById("hsnCodeManual").value.trim();
        productCode = document.getElementById("productCodeManual").value.trim();
    }

    const discountType = document.getElementById("discountType").value;
    const discountValue = parseFloat(document.getElementById("discountValue").value) || 0;

    const dimensionType = currentDimensions.type;

    const dim1Toggle = document.getElementById('dimension1-toggle');
    const dim2Toggle = document.getElementById('dimension2-toggle');
    const dim3Toggle = document.getElementById('dimension3-toggle');
    const toggleStates = {
        toggle1: dim1Toggle ? dim1Toggle.checked : true,
        toggle2: dim2Toggle ? dim2Toggle.checked : true,
        toggle3: dim3Toggle ? dim3Toggle.checked : true
    };

    const dim1Value = parseFloat(document.getElementById('dimension1').value) || 0;
    const dim2Value = parseFloat(document.getElementById('dimension2').value) || 0;
    const dim3Value = parseFloat(document.getElementById('dimension3').value) || 0;

    document.getElementById('dimension1').value = dim1Value.toFixed(2);
    document.getElementById('dimension2').value = dim2Value.toFixed(2);
    document.getElementById('dimension3').value = dim3Value.toFixed(2);

    currentDimensions.values = [dim1Value, dim2Value, dim3Value];
    calculateDimensions();

    const dimensionText = getDimensionDisplayText(dimensionType, currentDimensions.values, currentDimensions.unit, toggleStates);
    const originalQuantity = quantity;

    // --- CONVERSION LOGIC ---
    let power = 0;
    if (currentDimensions.type !== 'none' && currentDimensions.type !== 'dozen') {
        if (toggleStates.toggle1) power++;
        if (['widthXheight', 'widthXdepth', 'lengthXdepth', 'lengthXheight', 'lengthXwidth', 'widthXheightXdepth', 'lengthXwidthXheight', 'lengthXheightXdepth', 'lengthXwidthXdepth'].includes(currentDimensions.type)) {
            if (toggleStates.toggle2) power++;
        }
        if (['widthXheightXdepth', 'lengthXwidthXheight', 'lengthXheightXdepth', 'lengthXwidthXdepth'].includes(currentDimensions.type)) {
            if (toggleStates.toggle3) power++;
        }
    }
    const selectedConvertUnit = document.getElementById('convertUnit').value;
    const conversionFactor = getConversionFactor(currentDimensions.unit, selectedConvertUnit, power);
    // ----------------------------

    let calculatedQuantity = quantity;
    let baseAmount = 0;

    if (currentDimensions.type !== 'none' && currentDimensions.type !== 'dozen' && currentDimensions.calculatedArea > 0) {
        calculatedQuantity = (quantity * currentDimensions.calculatedArea) * conversionFactor;
        baseAmount = storeWithPrecision(calculatedQuantity * rate);
    } else if (currentDimensions.type === 'dozen') {
        calculatedQuantity = quantity / 12;
        baseAmount = storeWithPrecision(calculatedQuantity * rate);
    } else {
        baseAmount = quantity * rate;
    }

    let discountAmount = 0;
    let finalAmount = baseAmount;

    if (discountType !== 'none' && discountValue > 0) {
        switch (discountType) {
            case 'percent_per_unit':
                const discountPerUnit = rate * (discountValue / 100);
                discountAmount = discountPerUnit * (currentDimensions.type !== 'none' && currentDimensions.type !== 'dozen' ? calculatedQuantity : quantity);
                break;
            case 'amt_per_unit':
                discountAmount = discountValue * (currentDimensions.type !== 'none' && currentDimensions.type !== 'dozen' ? calculatedQuantity : quantity);
                break;
            case 'percent_on_amount':
                discountAmount = baseAmount * (discountValue / 100);
                break;
            case 'amt_on_amount':
                discountAmount = discountValue;
                break;
        }
        finalAmount = storeWithPrecision(baseAmount - discountAmount);
        if (finalAmount < 0) finalAmount = 0;
    }

    if (isNaN(quantity) || isNaN(rate) || !itemName) {
        return;
    }

    const numericRate = typeof rate === 'string' ? parseFloat(rate) : Number(rate);
    const dimensionUnit = currentDimensions.unit;

    const formattedDisplayQuantity = originalQuantity % 1 === 0 ?
        originalQuantity.toString() :
        originalQuantity.toFixed(2);

    let finalQuantity = calculatedQuantity;
    if (currentDimensions.type !== 'none' && currentDimensions.type !== 'dozen' && currentDimensions.calculatedArea > 0) {
        finalQuantity = (quantity * currentDimensions.calculatedArea) * conversionFactor;
    } else if (currentDimensions.type === 'dozen') {
        finalQuantity = quantity / 12;
    } else {
        finalQuantity = quantity;
    }

    // Pass selectedConvertUnit
    let particularsHtml = formatParticularsManual(itemName, notes, dimensionText, formattedDisplayQuantity, finalQuantity, numericRate, dimensionType, dimensionUnit, unit, discountType, discountValue, toggleStates, selectedConvertUnit);

    const rows = document.querySelectorAll(`tr[data-id="${currentlyEditingRowIdManual}"]`);
    rows.forEach(row => {
        // --- FIX: Preserve Visibility State ---
        const wasVisible = row.getAttribute('data-dimensions-visible') !== 'false';

        const cells = row.children;
        cells[1].innerHTML = particularsHtml;

        // Re-apply visibility to the new HTML
        const dimDiv = cells[1].querySelector('.dimensions');
        if (dimDiv) {
            dimDiv.style.display = wasVisible ? 'block' : 'none';
        }

        const formattedQuantity = originalQuantity % 1 === 0 ?
            originalQuantity.toString() :
            originalQuantity.toFixed(2);
        cells[2].textContent = formattedQuantity;

        cells[3].textContent = unit;
        cells[4].textContent = parseFloat(rate).toFixed(2);
        cells[5].textContent = roundToTwoDecimals(finalAmount).toFixed(2);

        row.setAttribute('data-amount', storeWithPrecision(finalAmount));
        row.setAttribute('data-rate', storeWithPrecision(rate));

        row.setAttribute('data-dimension-type', dimensionType);
        row.setAttribute('data-dimension-values', JSON.stringify([...currentDimensions.values]));
        row.setAttribute('data-dimension-unit', currentDimensions.unit);
        row.setAttribute('data-dimension-toggles', JSON.stringify(toggleStates));
        row.setAttribute('data-original-quantity', originalQuantity.toFixed(8));
        row.setAttribute('data-convert-unit', selectedConvertUnit);

        if (isGSTMode) {
            row.setAttribute('data-hsn', hsnCode);
            row.setAttribute('data-product-code', productCode);
        }

        row.setAttribute('data-discount-type', discountType);
        row.setAttribute('data-discount-value', discountValue);
    });

    if (isGSTMode) {
        copyItemsToGSTBill();
        updateGSTTaxCalculation();
    }

    updateSerialNumbers();
    updateTotal();
    await saveToLocalStorage();
    saveStateToHistory();

    // --- RESET UI (Same as cancel logic) ---
    cancelUpdateManual();
}

// Helper function to calculate area from dimensions considering toggle states
function calculateAreaWithToggles(dimensionType, dimensionValues, toggleStates) {
    const [v1, v2, v3] = dimensionValues;

    // Apply toggle states - if unchecked, use 1 (no effect on multiplication)
    const effectiveV1 = toggleStates.toggle1 ? v1 : 1;
    const effectiveV2 = toggleStates.toggle2 ? v2 : 1;
    const effectiveV3 = toggleStates.toggle3 ? v3 : 1;

    switch (dimensionType) {
        case 'length':
            return effectiveV1;
        case 'widthXheight':
            return effectiveV1 * effectiveV2;
        case 'widthXheightXdepth':
            return effectiveV1 * effectiveV2 * effectiveV3;
        case 'lengthXwidthXheight':
            return effectiveV1 * effectiveV2 * effectiveV3;
        case 'widthXdepth':
            return effectiveV1 * effectiveV2;
        case 'lengthXheightXdepth':
            return effectiveV1 * effectiveV2 * effectiveV3;
        case 'lengthXdepth':
            return effectiveV1 * effectiveV2;
        case 'lengthXheight':
            return effectiveV1 * effectiveV2;
        case 'lengthXwidth':
            return effectiveV1 * effectiveV2;
        case 'lengthXwidthXdepth':
            return effectiveV1 * effectiveV2 * effectiveV3;
        default:
            return 1;
    }
}

function duplicateRow(rowId) {
    const sourceRow = document.querySelector(`#createListManual tr[data-id="${rowId}"]`);
    if (!sourceRow) return;

    // Get all data from source row
    const cells = sourceRow.children;
    const particularsDiv = cells[1];
    const itemName = particularsDiv.querySelector('.itemNameClass')?.textContent.trim() || '';
    const notes = particularsDiv.querySelector('.notes')?.textContent || '';

    const dimensionType = sourceRow.getAttribute('data-dimension-type') || 'none';
    const dimensionValues = JSON.parse(sourceRow.getAttribute('data-dimension-values') || '[0,0,0]');
    const dimensionUnit = sourceRow.getAttribute('data-dimension-unit') || 'ft';

    // FIX: PROPERLY get toggle states
    const toggleStatesAttr = sourceRow.getAttribute('data-dimension-toggles');
    let toggleStates;
    try {
        toggleStates = toggleStatesAttr && toggleStatesAttr !== 'undefined' ? JSON.parse(toggleStatesAttr) : { toggle1: true, toggle2: true, toggle3: true };
    } catch (e) {
        console.warn('Invalid toggle states, using defaults:', e);
        toggleStates = { toggle1: true, toggle2: true, toggle3: true };
    }

    const originalQuantity = parseFloat(sourceRow.getAttribute('data-original-quantity') || cells[2].textContent);

    const hsnCode = sourceRow.getAttribute('data-hsn') || '';
    const productCode = sourceRow.getAttribute('data-product-code') || '';
    const discountType = sourceRow.getAttribute('data-discount-type') || 'none';
    const discountValue = sourceRow.getAttribute('data-discount-value') || '';

    // --- FIX: GET CONVERT UNIT ---
    const convertUnit = sourceRow.getAttribute('data-convert-unit') || 'none';

    const unit = cells[3].textContent;
    const rate = parseFloat(cells[4].textContent);
    const amount = parseFloat(cells[5].textContent);

    // Create new unique ID
    const newId = 'row-manual-' + rowCounterManual++;

    // --- FIX: Calculate final quantity using NEW CONVERSION LOGIC ---
    let finalQuantity = originalQuantity;

    // 1. Determine dimensionality (power)
    let power = 0;
    if (dimensionType !== 'none' && dimensionType !== 'dozen') {
        if (toggleStates.toggle1) power++;
        if (['widthXheight', 'widthXdepth', 'lengthXdepth', 'lengthXheight', 'lengthXwidth', 'widthXheightXdepth', 'lengthXwidthXheight', 'lengthXheightXdepth', 'lengthXwidthXdepth'].includes(dimensionType)) {
            if (toggleStates.toggle2) power++;
        }
        if (['widthXheightXdepth', 'lengthXwidthXheight', 'lengthXheightXdepth', 'lengthXwidthXdepth'].includes(dimensionType)) {
            if (toggleStates.toggle3) power++;
        }
    }

    // 2. Get Conversion Factor
    const conversionFactor = getConversionFactor(dimensionUnit, convertUnit, power);

    // 3. Calculate Final Quantity
    if (dimensionType !== 'none' && dimensionType !== 'dozen') {
        const calculatedArea = calculateAreaFromDimensions(dimensionType, dimensionValues);
        // Apply toggles to calculation (simplified check, ideally use calculateAreaWithToggles if strict)
        // But for duplication, we can rely on the source row's logic logic being consistent

        // Re-calculate area with toggles specifically
        let effectiveArea = calculateAreaWithToggles(dimensionType, dimensionValues, toggleStates);
        finalQuantity = (originalQuantity * effectiveArea) * conversionFactor;
    } else if (dimensionType === 'dozen') {
        finalQuantity = originalQuantity / 12;
    }

    // Get dimension text
    const dimensionText = getDimensionDisplayText(dimensionType, dimensionValues, dimensionUnit, toggleStates);

    // Create duplicate row with PROPER CONVERT UNIT
    const newRow = createTableRowManual(
        newId,
        itemName,
        originalQuantity.toFixed(8),
        unit,
        rate,
        amount,
        notes,
        dimensionText,
        true,
        finalQuantity,
        dimensionType,
        originalQuantity,
        {
            values: dimensionValues,
            toggle1: toggleStates.toggle1,
            toggle2: toggleStates.toggle2,
            toggle3: toggleStates.toggle3
        },
        dimensionUnit,
        hsnCode,
        productCode,


        discountType,
        discountValue,
        true, // dimensionsVisible
        convertUnit // <--- PASS CONVERT UNIT
    );

    // Insert the duplicate below the source row
    sourceRow.parentNode.insertBefore(newRow, sourceRow.nextSibling);

    // Sync to other tables
    syncDuplicatedRowToOtherTables(newId, sourceRow, itemName, originalQuantity, unit, rate, amount, notes, dimensionType, dimensionValues, dimensionUnit, hsnCode, productCode, discountType, discountValue, finalQuantity, dimensionText, toggleStates, convertUnit);

    // Update everything
    updateSerialNumbers();
    updateTotal();
    refreshCopyTableTotal(); // Ensure copy table total updates
    saveToLocalStorage();
    saveStateToHistory();
    applyColumnVisibility();

    if (isGSTMode) {
        copyItemsToGSTBill(); // Ensure sync
        updateGSTTaxCalculation();
    }
}

// Helper function to calculate area from dimensions (add if not exists)
function calculateAreaFromDimensions(dimensionType, dimensionValues) {
    const [v1, v2, v3] = dimensionValues;
    switch (dimensionType) {
        case 'length':
            return v1;
        case 'widthXheight':
            return v1 * v2;
        case 'widthXheightXdepth':
            return v1 * v2 * v3;
        default:
            return 1;
    }
}

// Sync duplicated row to other tables with toggle states
function syncDuplicatedRowToOtherTables(newId, sourceRow, itemName, quantity, unit, rate, amount, notes, dimensionType, dimensionValues, dimensionUnit, hsnCode, productCode, discountType, discountValue, finalQuantity, dimensionText, toggleStates, convertUnit = 'none') {
    // Sync to copyListManual (regular bill table)
    const copySourceRow = document.querySelector(`#copyListManual tr[data-id="${sourceRow.getAttribute('data-id')}"]`);
    if (copySourceRow) {
        const copyRow = createTableRowManual(
            newId,
            itemName,
            quantity.toFixed(8),
            unit,
            rate,
            amount,
            notes,
            dimensionText,
            false,
            finalQuantity,
            dimensionType,
            quantity,
            {
                values: dimensionValues,
                toggle1: toggleStates.toggle1,
                toggle2: toggleStates.toggle2,
                toggle3: toggleStates.toggle3
            },
            dimensionUnit,
            hsnCode,
            productCode,
            discountType,
            discountValue,
            true, // dimensionsVisible default
            convertUnit // <--- PASS CONVERT UNIT
        );
        copySourceRow.parentNode.insertBefore(copyRow, copySourceRow.nextSibling);
    }

    // Sync to GST table if in GST mode
    if (isGSTMode) {
        const gstSourceRow = document.querySelector(`#gstCopyListManual tr[data-id="${sourceRow.getAttribute('data-id')}"]`);
        if (gstSourceRow) {
            const gstRow = createGSTTableRowManual(
                newId,
                itemName,
                quantity.toFixed(8),
                unit,
                rate,
                amount,
                notes,
                dimensionText,
                false,
                finalQuantity,
                dimensionType,
                quantity,
                dimensionValues,
                dimensionUnit,
                hsnCode,
                productCode,
                discountType,
                discountValue,
                convertUnit // <--- PASS CONVERT UNIT
            );
            gstSourceRow.parentNode.insertBefore(gstRow, gstSourceRow.nextSibling);
        }
    }
}

function toggleRowDimensions(rowId) {
    const row = document.querySelector(`#createListManual tr[data-id="${rowId}"]`);
    if (!row) return;

    const currentVisibility = row.getAttribute('data-dimensions-visible') === 'true';
    const newVisibility = !currentVisibility;

    // Apply new state
    setRowDimensionVisibility(rowId, newVisibility);

    saveToLocalStorage();
    saveStateToHistory();

    // CRITICAL: Update Global Button State based on this change
    updateGlobalDimensionButtonState();
}


function createTableRowManual(id, itemName, quantity, unit, rate, amount, notes, dimensions, editable, finalQuantity = 0, dimensionType = 'none', originalQuantity = 0, dimensionData = { values: [0, 0, 0], toggle1: true, toggle2: true, toggle3: true }, dimensionUnit = 'ft', hsnCode = '', productCode = '', discountType = 'none', discountValue = '', dimensionsVisible = true, convertUnit = 'none') {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", id);

    // Add drag listeners to ALL rows
    addDragAndDropListeners(tr);

    // Only add click listener for editing to input table rows
    if (editable) {
        tr.addEventListener('click', () => editRowManual(id));
    }

    // Extract dimension values and toggle states
    const dimensionValues = dimensionData.values || [0, 0, 0];
    const toggleStates = {
        toggle1: dimensionData.toggle1 !== false,
        toggle2: dimensionData.toggle2 !== false,
        toggle3: dimensionData.toggle3 !== false
    };

    // FIX: Format display quantity - remove .00 if whole number
    const displayQuantity = parseFloat(originalQuantity > 0 ? originalQuantity : quantity);
    const formattedDisplayQuantity = displayQuantity % 1 === 0 ?
        displayQuantity.toString() :
        displayQuantity.toFixed(2);

    // SAFELY handle rate conversion to number
    const numericRate = typeof rate === 'string' ? parseFloat(rate) : Number(rate);
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

    // Pass convertUnit to formatParticularsManual
    let particularsHtml = formatParticularsManual(itemName, notes, dimensions, displayQuantity, finalQuantity, numericRate, dimensionType, dimensionUnit, unit, discountType, discountValue, toggleStates, convertUnit);

    const removeFn = editable ? `removeRowManual('${id}')` : `removeRowManual('${id}', true)`;

    // Create actions HTML with three buttons
    let actionsHtml = '';
    if (editable) {
        actionsHtml = `
            <div class="action-buttons">
                <button onclick="duplicateRow('${id}')" class="action-btn copy-btn" title="Duplicate Item">
                    <span class="material-icons"  translate="no">content_copy</span>
                </button>
                <button onclick="toggleRowDimensions('${id}')" class="action-btn dimensions-btn" title="Toggle Dimensions">
                    <span class="material-icons"  translate="no">${dimensionsVisible ? 'layers' : 'layers_clear'}</span>
                </button>
                <button onclick="${removeFn}" class="action-btn remove-btn" title="Remove Item">
                    <span class="material-icons"  translate="no">close</span>
                </button>
            </div>
        `;
    } else {
        // actionsHtml = `<button onclick="${removeFn}" class="remove-btn"><span class="material-icons">close</span></button>`;
    }

    tr.innerHTML = `
    <td class="sr-no"></td>
    <td>${particularsHtml}</td>
    <td>${formattedDisplayQuantity}</td>
    <td>${unit}</td>
    <td>${numericRate.toFixed(2)}</td>
    <td class="amount">${numericAmount.toFixed(2)}</td>
    <td class="actions-cell">${actionsHtml}</td>
`;

    // Set dimension attributes including toggle states
    tr.setAttribute('data-dimension-type', dimensionType);
    tr.setAttribute('data-dimension-values', JSON.stringify(dimensionValues));
    tr.setAttribute('data-dimension-unit', dimensionUnit);
    tr.setAttribute('data-dimension-toggles', JSON.stringify(toggleStates));
    tr.setAttribute('data-original-quantity', displayQuantity.toFixed(8));

    // SAFELY store original rate as number
    tr.setAttribute('data-original-rate', numericRate.toFixed(8));

    // Set amounts
    tr.setAttribute('data-amount', storeWithPrecision(numericAmount));
    tr.setAttribute('data-rate', storeWithPrecision(numericRate));

    // Set dimension visibility attribute
    tr.setAttribute('data-dimensions-visible', dimensionsVisible ? 'true' : 'false');

    // Set Convert Unit attribute
    tr.setAttribute('data-convert-unit', convertUnit);

    // Add HSN and product code data if provided
    if (hsnCode) {
        tr.setAttribute('data-hsn', hsnCode);
    }
    if (productCode) {
        tr.setAttribute('data-product-code', productCode);
    }

    // Add discount data attributes
    tr.setAttribute('data-discount-type', discountType);
    tr.setAttribute('data-discount-value', discountValue);

    return tr;
}

function createGSTTableRowManual(id, itemName, quantity, unit, rate, amount, notes, dimensions, editable, finalQuantity = 0, dimensionType = 'none', originalQuantity = 0, dimensionValues = [0, 0, 0], dimensionUnit = 'ft', hsnCode = '', productCode = '', discountType = 'none', discountValue = '', convertUnit = 'none') {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", id);

    const displayQuantity = parseFloat(originalQuantity > 0 ? originalQuantity : quantity);
    const formattedDisplayQuantity = displayQuantity % 1 === 0 ? displayQuantity.toString() : displayQuantity.toFixed(2);

    const numericRate = typeof rate === 'string' ? parseFloat(rate) : Number(rate);
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

    // Pass convertUnit to formatParticularsManual (toggleStates is null here as GST table relies on saved calc)
    let particularsHtml = formatParticularsManual(itemName, notes, dimensions, displayQuantity, finalQuantity, numericRate, dimensionType, dimensionUnit, unit, discountType, discountValue, null, convertUnit);

    const removeFn = `removeRowManual('${id}', true)`;

    tr.innerHTML = `
    <td class="sr-no"></td>
    <td>${particularsHtml}</td>
    <td>${hsnCode}</td>
    <td>${formattedDisplayQuantity}</td>
    <td>${unit}</td>
    <td>${numericRate.toFixed(2)}</td>
    <td class="amount">${numericAmount.toFixed(2)}</td>
    
`;

    tr.setAttribute('data-dimension-type', dimensionType);
    tr.setAttribute('data-dimension-values', JSON.stringify(dimensionValues));
    tr.setAttribute('data-dimension-unit', dimensionUnit);
    tr.setAttribute('data-original-quantity', displayQuantity.toFixed(8));
    tr.setAttribute('data-hsn', hsnCode);
    tr.setAttribute('data-convert-unit', convertUnit);

    tr.setAttribute('data-discount-type', discountType);
    tr.setAttribute('data-discount-value', discountValue);

    if (productCode) {
        tr.setAttribute('data-product-code', productCode);
    }

    return tr;
}

// Function: Remove Row Manual
function removeRowManual(id, skipConfirm = false) {
    // Note: Kept skipConfirm logic but ensured deletion happens
    document.querySelectorAll(`tr[data-id="${id}"]`).forEach(row => row.remove());

    const gstRows = document.querySelectorAll(`#gstCopyListManual tr[data-id="${id}"]`);
    gstRows.forEach(row => row.remove());

    if (isGSTMode) {
        copyItemsToGSTBill();
        updateGSTTaxCalculation();
    }

    updateSerialNumbers();
    updateTotal();
    refreshCopyTableTotal();
    saveToLocalStorage();
    saveStateToHistory();

    updateGlobalDimensionButtonState(); // <--- ADDED THIS
}

function toggleAutoScroll() {
    autoScrollEnabled = !autoScrollEnabled;

    // SAVE TO LOCAL STORAGE
    localStorage.setItem('billApp_autoScroll', autoScrollEnabled);

    const btn = document.getElementById('btn-auto-scroll');
    const label = btn.querySelector('.sidebar-label');

    if (autoScrollEnabled) {
        btn.style.backgroundColor = '#27ae60'; // Green
        label.textContent = 'Auto Scroll : ON';
    } else {
        btn.style.backgroundColor = ''; // Default
        label.textContent = 'Auto Scroll : OFF';
    }
}
function editRowManual(id) {
    // Prevent editing if click came from action buttons
    if (window.event) {
        const target = window.event.target;
        if (target.closest('.action-buttons') || target.closest('.action-btn')) {
            return;
        }
    }

    // --- SAVE SCROLL POSITION ---
    if (typeof autoScrollEnabled !== 'undefined' && autoScrollEnabled) {
        lastScrollPosition = window.scrollY || document.documentElement.scrollTop;
    }

    const row = document.querySelector(`#createListManual tr[data-id="${id}"]`);
    if (!row) return;

    // --- VISUAL UPDATE: Highlight the active row ---
    // First, clear highlight from any other rows (safety)
    document.querySelectorAll('#createListManual tr').forEach(r => r.style.backgroundColor = '');

    // Apply Active Highlight
    row.style.transition = "background-color 0.3s";
    row.style.backgroundColor = "#eeeeeeff";
    // ----------------------------------------------

    currentlyEditingRowIdManual = id;
    const cells = row.children;
    const particularsDiv = cells[1];
    const itemName = particularsDiv.querySelector('.itemNameClass')?.textContent.trim() || '';
    const notesText = particularsDiv.querySelector('.notes')?.textContent || '';

    const dimensionType = row.getAttribute('data-dimension-type') || 'none';
    const dimensionValues = JSON.parse(row.getAttribute('data-dimension-values') || '[0,0,0]');
    const dimensionUnit = row.getAttribute('data-dimension-unit') || 'ft';

    // Safe JSON parsing for dimension toggles
    const toggleStatesAttr = row.getAttribute('data-dimension-toggles');
    let toggleStates;
    try {
        toggleStates = toggleStatesAttr && toggleStatesAttr !== 'undefined' ? JSON.parse(toggleStatesAttr) : { toggle1: true, toggle2: true, toggle3: true };
    } catch (e) {
        console.warn('Invalid toggle states in editRowManual, using defaults:', e);
        toggleStates = { toggle1: true, toggle2: true, toggle3: true };
    }

    const originalQuantity = parseFloat(row.getAttribute('data-original-quantity') || cells[2].textContent);

    // Get HSN, product code, discount, and CONVERT UNIT
    const hsnCode = row.getAttribute('data-hsn') || '';
    const productCode = row.getAttribute('data-product-code') || '';
    const discountType = row.getAttribute('data-discount-type') || 'none';
    const discountValue = row.getAttribute('data-discount-value') || '';
    const savedConvertUnit = row.getAttribute('data-convert-unit') || 'none';

    // Populate all fields
    document.getElementById("itemNameManual").value = itemName;

    const formattedQuantity = originalQuantity % 1 === 0 ?
        originalQuantity.toString() :
        originalQuantity.toFixed(2);
    document.getElementById("quantityManual").value = formattedQuantity;

    document.getElementById("selectUnit").value = cells[3].textContent;
    document.getElementById("rateManual").value = parseFloat(cells[4].textContent).toFixed(2);
    document.getElementById("itemNotesManual").value = notesText;

    if (isGSTMode) {
        document.getElementById("hsnCodeManual").value = hsnCode;
        document.getElementById("productCodeManual").value = productCode;
    }

    // --- RESTORE DISCOUNT STATE ---
    document.getElementById("discountType").value = discountType;
    document.getElementById("discountValue").value = discountValue;

    if (discountType !== 'none' && discountValue > 0) {
        document.getElementById("discount-inputs-container").style.display = 'flex';
        // ACTIVATE BUTTON VISUALLY
        document.getElementById("toggleDiscountBtn").style.backgroundColor = '#27ae60';
    } else {
        document.getElementById("discount-inputs-container").style.display = 'none';
        document.getElementById("toggleDiscountBtn").style.backgroundColor = '';
    }

    // --- RESTORE DIMENSION STATE ---
    document.getElementById('dimensionType').value = dimensionType;
    handleDimensionTypeChange(); // This shows inputs based on type

    if (dimensionType !== 'none' && dimensionType !== 'dozen') {
        // ACTIVATE BUTTON VISUALLY
        document.getElementById("dimension-inputs-container").style.display = 'flex';
        document.getElementById("toggleDimensionBtn").style.backgroundColor = '#3498db';

        // Show Convert Button since Dimensions are active
        document.getElementById('toggleConvertBtn').style.display = 'inline-block';

        document.getElementById('measurementUnit').value = dimensionUnit;
        currentDimensions.unit = dimensionUnit;

        const hasActualDimensions = dimensionValues.some(val => val > 0);

        if (hasActualDimensions) {
            document.getElementById('dimension1').value = parseFloat(dimensionValues[0]).toFixed(2);
            // Only fill 2 and 3 if applicable
            if (['widthXheight', 'widthXdepth', 'lengthXdepth', 'lengthXheight', 'lengthXwidth', 'widthXheightXdepth', 'lengthXwidthXheight', 'lengthXheightXdepth', 'lengthXwidthXdepth'].some(t => dimensionType.includes(t) || dimensionType === t)) {
                document.getElementById('dimension2').value = parseFloat(dimensionValues[1]).toFixed(2);
            }
            if (['widthXheightXdepth', 'lengthXwidthXheight', 'lengthXheightXdepth', 'lengthXwidthXdepth'].some(t => dimensionType.includes(t) || dimensionType === t)) {
                document.getElementById('dimension3').value = parseFloat(dimensionValues[2]).toFixed(2);
            }
        } else {
            document.getElementById('dimension1').value = '';
            document.getElementById('dimension2').value = '';
            document.getElementById('dimension3').value = '';
        }

        currentDimensions.values = dimensionValues;

        // Set toggle states
        if (document.getElementById('dimension1-toggle')) document.getElementById('dimension1-toggle').checked = toggleStates.toggle1;
        if (document.getElementById('dimension2-toggle')) document.getElementById('dimension2-toggle').checked = toggleStates.toggle2;
        if (document.getElementById('dimension3-toggle')) document.getElementById('dimension3-toggle').checked = toggleStates.toggle3;

        // --- RESTORE CONVERT UNIT STATE ---
        if (savedConvertUnit && savedConvertUnit !== 'none') {
            document.getElementById('toggleConvertBtn').classList.add('active'); // Make it purple
            document.getElementById('convertUnit').style.display = 'inline-block';
            document.getElementById('convertUnit').value = savedConvertUnit;
            currentConvertUnit = savedConvertUnit;
        } else {
            document.getElementById('toggleConvertBtn').classList.remove('active'); // Reset color
            document.getElementById('convertUnit').style.display = 'none';
            document.getElementById('convertUnit').value = 'none';
            currentConvertUnit = 'none';
        }

        calculateDimensions();
    } else {
        // Reset if no dimensions
        document.getElementById("dimension-inputs-container").style.display = 'none';
        document.getElementById("toggleDimensionBtn").style.backgroundColor = '';
        document.getElementById('toggleConvertBtn').style.display = 'none'; // Hide convert
    }
    previousConvertUnit = savedConvertUnit;

    // --- BUTTON VISIBILITY ---
    document.getElementById("addItemBtnManual").style.display = "none";
    document.getElementById("updateItemBtnManual").style.display = "inline-block";
    document.getElementById("cancelUpdateBtnManual").style.display = "inline-block";

    // --- AUTO SCROLL TO TOP ---
    if (typeof autoScrollEnabled !== 'undefined' && autoScrollEnabled) {
        document.getElementById('tools').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updateSerialNumbers() {
    const vars = getModeSpecificVars();
    const createListId = vars.createListId;
    const copyListId = vars.copyListId;

    // Update all tables including GST table
    const tables = [createListId, copyListId];
    if (isGSTMode) {
        tables.push('gstCopyListManual');
    }

    tables.forEach(tableId => {
        const rows = document.querySelectorAll(`#${tableId} tbody tr`);
        let itemCounter = 0;

        rows.forEach((row) => {
            const srNoCell = row.querySelector('.sr-no');
            if (srNoCell) {
                if (row.classList.contains('section-row')) {
                    // Section rows get no serial number (blank)
                    srNoCell.textContent = '';
                } else if (row.getAttribute('data-id')) {
                    // Item rows get sequential serial numbers
                    itemCounter++;
                    srNoCell.textContent = itemCounter;
                } else {
                    // Any other rows get no serial number
                    srNoCell.textContent = '';
                }
            }
        });
    });
}
let isRegularFooterVisible = false;

function toggleRegularFooter() {
    const footer = document.getElementById('regular-bill-footer');
    const btn = document.getElementById('reg-footer-btn');

    isRegularFooterVisible = !isRegularFooterVisible;

    if (footer) {
        footer.style.display = isRegularFooterVisible ? 'table' : 'none';
    }


    // === UPDATED: SET BUTTON STYLE DIRECTLY ===
    if (btn) {
        btn.style.backgroundColor = isRegularFooterVisible ? 'var(--primary-color)' : '';
        btn.style.color = isRegularFooterVisible ? 'white' : '';
    }

    // Update info if showing
    if (isRegularFooterVisible) {
        updateRegularFooterInfo();
        // Also update amount in words immediately
        updateTotal();
    }

    applyColumnVisibility();
}

function updateRegularFooterInfo() {
    if (!companyInfo) return;

    // Update Text Fields
    const signatory = document.getElementById('reg-bill-company-signatory');
    const accHolder = document.getElementById('reg-bill-account-holder');
    const accNo = document.getElementById('reg-bill-account-number');
    const ifsc = document.getElementById('reg-bill-ifsc-code');
    const branch = document.getElementById('reg-bill-branch');
    const bank = document.getElementById('reg-bill-bank-name');

    if (signatory) signatory.textContent = `for ${companyInfo.name || 'COMPANY NAME'}`;
    if (accHolder) accHolder.textContent = companyInfo.accountHolder || '-';
    if (accNo) accNo.textContent = companyInfo.accountNumber || '-';
    if (ifsc) ifsc.textContent = companyInfo.ifscCode || '-';
    if (branch) branch.textContent = companyInfo.branch || '-';
    if (bank) bank.textContent = companyInfo.bankName || '-';

    // Update Branding (Sign & Stamp) for Regular Bill
    const regStampCell = document.getElementById('reg-stamp-cell');
    const regSignatureCell = document.getElementById('reg-signature-cell');

    if (regStampCell && regSignatureCell && brandingSettings) {
        regStampCell.innerHTML = '';
        regSignatureCell.innerHTML = '';

        if (brandingSettings.stamp) {
            const stampImg = document.createElement('img');
            stampImg.src = brandingSettings.stamp;
            stampImg.className = 'bill-stamp';
            regStampCell.appendChild(stampImg);
        }

        if (brandingSettings.signature) {
            const signImg = document.createElement('img');
            signImg.src = brandingSettings.signature;
            signImg.className = 'bill-signature';
            regSignatureCell.appendChild(signImg);
        }
    }
}

function updateTotal() {
    // 1. Calculate Item Subtotal
    const createListId = getModeSpecificVars().createListId;
    const subtotal = Array.from(document.querySelectorAll(`#${createListId} tbody tr[data-id]`))
        .reduce((sum, row) => {
            const amountCell = row.querySelector('.amount');
            return sum + (amountCell ? (parseFloat(amountCell.textContent) || 0) : 0);
        }, 0);

    // === NEW: UPDATE DISCOUNT & GST BUTTONS BASED ON ACTIVE CHAIN ===

    // Check Discount
    const hasDiscount = adjustmentChain && adjustmentChain.some(a => a.name.toLowerCase().includes('discount'));
    const discBtn = document.getElementById('discount-tool-btn');
    if (discBtn) {
        discBtn.style.backgroundColor = hasDiscount ? 'var(--primary-color)' : '';
        discBtn.style.color = hasDiscount ? 'white' : '';
    }

    // Check GST (Only in Regular Mode)
    const gstBtn = document.getElementById('gst-tool-btn');
    if (gstBtn) {
        // GST button active if GST exists in chain AND we are NOT in GST mode (since GST mode handles tax differently)
        const hasGST = adjustmentChain && adjustmentChain.some(a => a.name.toLowerCase().includes('gst'));
        if (hasGST && !isGSTMode) {
            gstBtn.style.backgroundColor = 'var(--primary-color)';
            gstBtn.style.color = 'white';
        } else {
            gstBtn.style.backgroundColor = '';
            gstBtn.style.color = '';
        }
    }

    // 2. Run Sequential Adjustment Calculation
    calculateAdjustments(subtotal);
    updateSectionTotals();

    if (isVendorMode) {
        saveVendorState();
    }
}


// Helper to create items from saved data
function createItemInAllTablesFromSaved(itemData) {
    const createListTbody = document.querySelector("#createListManual tbody");
    const copyListTbody = document.querySelector("#copyListManual tbody");

    // Create for input table
    const row1 = createTableRowManual(
        itemData.id,
        itemData.itemName,
        itemData.quantity,
        itemData.unit,
        parseFloat(itemData.rate),
        parseFloat(itemData.amount),
        itemData.notes,
        '', // dimension text will come from particularsHtml
        true,
        parseFloat(itemData.quantity),
        itemData.dimensionType,
        parseFloat(itemData.quantity),
        {
            values: itemData.dimensionValues || [0, 0, 0],
            toggle1: itemData.dimensionToggles?.toggle1 !== false,
            toggle2: itemData.dimensionToggles?.toggle2 !== false,
            toggle3: itemData.dimensionToggles?.toggle3 !== false
        },
        itemData.dimensionUnit,
        itemData.hsnCode,
        itemData.productCode,
        itemData.discountType,
        itemData.discountValue,
        itemData.dimensionsVisible !== false,
        itemData.convertUnit // <--- PASS THIS
    );

    // Use saved particulars HTML if available
    if (itemData.particularsHtml) {
        row1.children[1].innerHTML = itemData.particularsHtml;
    }
    if (itemData.displayQuantity) {
        row1.children[2].textContent = itemData.displayQuantity;
    }

    createListTbody.appendChild(row1);

    // Create for regular bill table
    const row2 = createTableRowManual(
        itemData.id,
        itemData.itemName,
        itemData.quantity,
        itemData.unit,
        parseFloat(itemData.rate),
        parseFloat(itemData.amount),
        itemData.notes,
        '',
        false,
        parseFloat(itemData.quantity),
        itemData.dimensionType,
        parseFloat(itemData.quantity),
        {
            values: itemData.dimensionValues || [0, 0, 0],
            toggle1: itemData.dimensionToggles?.toggle1 !== false,
            toggle2: itemData.dimensionToggles?.toggle2 !== false,
            toggle3: itemData.dimensionToggles?.toggle3 !== false
        },
        itemData.dimensionUnit,
        itemData.hsnCode,
        itemData.productCode,
        itemData.discountType,
        itemData.discountValue,
        itemData.dimensionsVisible !== false,
        itemData.convertUnit // <--- PASS THIS
    );

    if (itemData.particularsHtml) {
        row2.children[1].innerHTML = itemData.particularsHtml;
    }
    if (itemData.displayQuantity) {
        row2.children[2].textContent = itemData.displayQuantity;
    }

    copyListTbody.appendChild(row2);

    // Create for GST table if needed
    if (isGSTMode) {
        const gstListTbody = document.querySelector("#gstCopyListManual tbody");
        if (gstListTbody) {
            const gstRow = createGSTTableRowManual(
                itemData.id,
                itemData.itemName,
                itemData.quantity,
                itemData.unit,
                parseFloat(itemData.rate),
                parseFloat(itemData.amount),
                itemData.notes,
                '',
                false,
                parseFloat(itemData.quantity),
                itemData.dimensionType,
                parseFloat(itemData.quantity),
                itemData.dimensionValues,
                itemData.dimensionUnit,
                itemData.hsnCode,
                itemData.productCode,
                itemData.discountType,
                itemData.discountValue,
                itemData.convertUnit // <--- PASS THIS
            );

            if (itemData.particularsHtml) {
                gstRow.children[1].innerHTML = itemData.particularsHtml;
            }
            if (itemData.displayQuantity) {
                gstRow.children[3].textContent = itemData.displayQuantity;
            }

            gstListTbody.appendChild(gstRow);
        }
    }
}

async function removeSection(sectionId) {
    const shouldDeleteSection = await showConfirm('Are you sure you want to remove this section? All items under this section will also be removed.');
    if (shouldDeleteSection) {
        // Remove from all tables
        const tables = ['createListManual', 'copyListManual', 'gstCopyListManual'];
        tables.forEach(tableId => {
            const sectionRow = document.querySelector(`#${tableId} tr[data-section-id="${sectionId}"]`);
            if (sectionRow) {
                // Also remove all items under this section (until next section)
                let nextRow = sectionRow.nextElementSibling;
                while (nextRow && !nextRow.classList.contains('section-row')) {
                    const nextNextRow = nextRow.nextElementSibling;
                    nextRow.remove();
                    nextRow = nextNextRow;
                }
                // Remove the section row itself
                sectionRow.remove();
            }
        });

        updateSerialNumbers();
        updateTotal();
        saveToLocalStorage();
        saveStateToHistory();

        if (isGSTMode) {
            updateGSTTaxCalculation();
        }
    }
}


// Helper function to create sections from saved data
function createSectionInAllTablesFromSaved(sectionData) {
    const tables = ['createListManual', 'copyListManual', 'gstCopyListManual'];

    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        const tr = document.createElement('tr');
        tr.className = 'section-row';
        tr.setAttribute('data-section-id', sectionData.id);
        tr.setAttribute('draggable', 'true');

        const colspan = tableId === 'gstCopyListManual' ? '8' : '7';

        // FIX: Handle saved HTML differently for input table vs bill view tables
        if (sectionData.html && tableId === 'createListManual') {
            // Input table - use saved HTML with buttons
            tr.innerHTML = `<td colspan="${colspan}" style="${sectionData.style || ''}">${sectionData.html}</td>`;
        } else if (sectionData.html && (tableId === 'copyListManual' || tableId === 'gstCopyListManual')) {
            // Bill view tables - extract just the section name from HTML (remove buttons)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sectionData.html;

            // Extract just the text content (section name) without buttons
            let sectionName = '';
            for (let node of tempDiv.childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    sectionName = node.textContent.trim();
                    break;
                }
            }

            // If we couldn't extract the name, fall back to the saved name
            if (!sectionName) {
                sectionName = sectionData.name;
            }

            tr.innerHTML = `
                <td colspan="${colspan}" style="${sectionData.style || ''}">
                    ${sectionName}
                </td>
            `;
        } else {
            // Fallback: create from basic data
            let content = sectionData.name;
            if (tableId === 'createListManual') {
                const buttonText = sectionData.collapsed ? '+' : '−';
                content = `${sectionData.name} 
                    <button class="collapse-btn" onclick="toggleSection('${sectionData.id}')">${buttonText}</button>
                    <button onclick="event.stopPropagation(); removeSection('${sectionData.id}')" class="remove-btn"><span class="material-icons">close</span></button>`;
            } else {
                // Bill view tables - show only section name
                content = sectionData.name;
            }

            tr.innerHTML = `
                <td colspan="${colspan}" style="${sectionData.style || ''}">
                    ${content}
                </td>
            `;
        }

        // ADD DRAG LISTENERS TO SECTION ROW
        addDragAndDropListeners(tr);
        tbody.appendChild(tr);
    });
}

function loadTermsData(termsData) {
    // Remove any existing terms first
    const existingTerms = document.querySelectorAll('.bill-footer-list[data-editable="true"]');
    existingTerms.forEach(terms => terms.remove());

    // Create new terms from saved data
    termsData.forEach(terms => {
        createTermsFromData(terms);
    });
}

function createTermsFromData(termsData) {
    const listContainer = document.createElement('div');
    listContainer.className = 'bill-footer-list';
    listContainer.setAttribute('data-editable', 'true');

    let listHTML = `<h4>${termsData.heading}</h4>`;
    listHTML += `<${termsData.listType} style="list-style-type: ${termsData.listStyle}">`;

    termsData.listItems.forEach(item => {
        listHTML += `<li>${item}</li>`;
    });

    listHTML += `</${termsData.listType}>`;
    listContainer.innerHTML = listHTML;

    // Insert below the appropriate table
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

async function loadGSTCustomerDataFromLocalStorage() {
    try {
        const gstCustomerData = await getFromDB('gstMode', 'gstCustomerData');
        if (gstCustomerData) {
            // Update GST bill header
            document.getElementById('bill-invoice-no').textContent = gstCustomerData.invoiceNo || '001';
            document.getElementById('bill-date-gst').textContent = formatDateForDisplay(gstCustomerData.invoiceDate) || formatDateForDisplay(new Date());

            // Update Bill To section
            document.getElementById('billToName').textContent = gstCustomerData.billTo.name || '';
            document.getElementById('billToAddr').textContent = gstCustomerData.billTo.address || '';
            document.getElementById('billToGstin').textContent = gstCustomerData.billTo.gstin || 'customer 15-digit GSTIN';
            document.getElementById('billToState').textContent = gstCustomerData.billTo.state || 'maharashtra';
            document.getElementById('billToStateCode').textContent = gstCustomerData.billTo.stateCode || '27';

            // Update Ship To section if applicable
            const shipToDiv = document.getElementById('shipTo');
            if (gstCustomerData.customerType === 'both' && gstCustomerData.shipTo.name) {
                shipToDiv.style.display = 'block';
                document.getElementById('shipToName').textContent = gstCustomerData.shipTo.name;
                document.getElementById('shipToAddr').textContent = gstCustomerData.shipTo.address;
                document.getElementById('shipToGstin').textContent = gstCustomerData.shipTo.gstin;
                document.getElementById('shipToState').textContent = gstCustomerData.shipTo.state;
                document.getElementById('shipToStateCode').textContent = gstCustomerData.shipTo.stateCode;
                document.getElementById('shipToPOS').textContent = gstCustomerData.shipTo.placeOfSupply;
            } else {
                shipToDiv.style.display = 'none';
            }

            // Update transaction type and GST percent
            transactionType = gstCustomerData.transactionType || 'intrastate';
            currentGSTPercent = gstCustomerData.gstPercent || 18;

            console.log('GST customer data loaded successfully');
        }
    } catch (error) {
        console.error('Error loading GST customer data:', error);
    }
}

// Function: Load From Local Storage
async function loadFromLocalStorage() {
    try {
        const saved = await getFromDB('billDataManual', 'currentBill');
        if (saved) {
            // Load company details
            document.getElementById("companyName").textContent = saved.company?.name || "COMPANY NAME";
            document.getElementById("companyAddr").textContent = saved.company?.address || "Address";
            document.getElementById("companyPhone").textContent = saved.company?.phone || "+91 01234-56789";
            document.getElementById("companyGstin").textContent = saved.company?.gstin || "GSTIN : Your 15-digit GSTIN";

            // Load customer details
            document.getElementById("custName").value = saved.customer?.name || "";
            document.getElementById("billNo").value = saved.customer?.billNo || "";
            document.getElementById("custAddr").value = saved.customer?.address || "";
            document.getElementById("billDate").value = saved.customer?.date || "";
            document.getElementById("custPhone").value = saved.customer?.phone || "";
            document.getElementById("custGSTIN").value = saved.customer?.gstin || "";

            // === NEW: Load Adjustments (with Migration) ===
            if (saved.adjustmentChain) {
                // Load new format directly
                adjustmentChain = saved.adjustmentChain;
            } else if (saved.taxSettings) {
                // MIGRATION: Convert legacy Tax/Discount to Adjustment Chain
                adjustmentChain = []; // Reset

                // Migrate Discount (Subtract) - Put at start
                if (saved.taxSettings.discountPercent > 0) {
                    adjustmentChain.push({
                        id: 'legacy-discount',
                        name: 'Discount',
                        type: 'percent',
                        value: saved.taxSettings.discountPercent,
                        operation: 'subtract',
                        textColor: '#e74c3c'
                    });
                } else if (saved.taxSettings.discountAmount > 0) {
                    adjustmentChain.push({
                        id: 'legacy-discount',
                        name: 'Discount',
                        type: 'amount',
                        value: saved.taxSettings.discountAmount,
                        operation: 'subtract',
                        textColor: '#e74c3c'
                    });
                }

                // Migrate GST (Add) - Put at end
                if (saved.taxSettings.gstPercent > 0) {
                    adjustmentChain.push({
                        id: 'legacy-gst',
                        name: 'GST',
                        type: 'percent',
                        value: saved.taxSettings.gstPercent,
                        operation: 'add',
                        textColor: '#27ae60'
                    });
                }
                console.log('Migrated legacy tax settings to adjustment chain');
            } else {
                adjustmentChain = [];
            }

            // Load GST Data
            await loadCompanyInfo();
            await loadGSTCustomerDataFromLocalStorage();

            if (saved.gstCustomerData) {
                document.getElementById('bill-invoice-no').textContent = saved.gstCustomerData.invoiceNo || '';
                document.getElementById('bill-date-gst').textContent = saved.gstCustomerData.invoiceDate || '';
                document.getElementById('billToName').textContent = saved.gstCustomerData.billTo?.name || '';
                document.getElementById('billToAddr').textContent = saved.gstCustomerData.billTo?.address || '';
                document.getElementById('billToGstin').textContent = saved.gstCustomerData.billTo?.gstin || 'customer 15-digit GSTIN';
                document.getElementById('billToContact').textContent = saved.gstCustomerData.billTo?.contact || 'Not provided';
                document.getElementById('billToState').textContent = saved.gstCustomerData.billTo?.state || 'Maharashtra';
                document.getElementById('billToStateCode').textContent = saved.gstCustomerData.billTo?.stateCode || '27';

                if (saved.gstCustomerData.customerType === 'both' && saved.gstCustomerData.shipTo?.name) {
                    document.getElementById('shipTo').style.display = 'block';
                    document.getElementById('shipToName').textContent = saved.gstCustomerData.shipTo.name;
                    document.getElementById('shipToAddr').textContent = saved.gstCustomerData.shipTo.address;
                    document.getElementById('shipToGstin').textContent = saved.gstCustomerData.shipTo.gstin;
                    document.getElementById('shipToContact').textContent = saved.gstCustomerData.shipTo?.contact || 'Not provided';
                    document.getElementById('shipToState').textContent = saved.gstCustomerData.shipTo.state;
                    document.getElementById('shipToStateCode').textContent = saved.gstCustomerData.shipTo.stateCode;
                    document.getElementById('shipToPOS').textContent = saved.gstCustomerData.shipTo.placeOfSupply;
                } else {
                    document.getElementById('shipTo').style.display = 'none';
                }
            }

            // Clear and Rebuild Tables
            const createListTbody = document.querySelector("#createListManual tbody");
            const copyListTbody = document.querySelector("#copyListManual tbody");
            const gstListTbody = document.querySelector("#gstCopyListManual tbody");

            createListTbody.innerHTML = "";
            copyListTbody.innerHTML = "";
            if (gstListTbody) gstListTbody.innerHTML = "";

            let maxId = 0;

            // Load Items/Sections
            if (saved.tableStructure && saved.tableStructure.length > 0) {
                saved.tableStructure.forEach(rowData => {
                    if (rowData.type === 'section') {
                        createSectionInAllTablesFromSaved(rowData);
                    } else if (rowData.type === 'item') {
                        createItemInAllTablesFromSaved(rowData);
                        const idNum = parseInt(rowData.id.split('-')[2]);
                        if (idNum > maxId) maxId = idNum;
                    }
                });
                rowCounterManual = maxId + 1;
            }

            // Load Terms
            if (saved.termsData && saved.termsData.length > 0) {
                loadTermsData(saved.termsData);
            }

            // Final Updates
            updateSerialNumbers();
            updateTotal();

            updateGlobalDimensionButtonState(); // <--- ADDED THIS

            updateGSTINVisibility();

            if (isGSTMode) {
                copyItemsToGSTBill();
                updateGSTTaxCalculation();
            }
        }
    } catch (error) {
        console.error('Error loading from IndexedDB:', error);
    }
}


function getTermsData() {
    const termsDivs = document.querySelectorAll('.bill-footer-list[data-editable="true"]');
    const termsData = [];

    termsDivs.forEach(termsDiv => {
        const heading = termsDiv.querySelector('h4')?.textContent || '';
        const listElement = termsDiv.querySelector('ul, ol');
        const listType = listElement?.tagName.toLowerCase() || 'ul';
        const listStyle = listElement?.style.listStyleType || (listType === 'ul' ? 'disc' : 'decimal');

        const listItems = Array.from(termsDiv.querySelectorAll('li')).map(li => li.textContent);

        termsData.push({
            heading: heading,
            listType: listType,
            listStyle: listStyle,
            listItems: listItems
        });
    });

    return termsData;
}

function copyBillToShipTo() {
    // Copy values from Bill To (consignee) to Ship To (buyer)
    document.getElementById('buyer-name').value = document.getElementById('consignee-name').value;
    document.getElementById('buyer-address').value = document.getElementById('consignee-address').value;
    document.getElementById('buyer-gst').value = document.getElementById('consignee-gst').value;
    document.getElementById('buyer-state').value = document.getElementById('consignee-state').value;
    document.getElementById('buyer-code').value = document.getElementById('consignee-code').value;
    document.getElementById('buyer-contact').value = document.getElementById('consignee-contact').value;

    // Trigger auto-save if setup
    saveCustomerDialogState();

    showNotification('Copied details from Bill To', 'success');
}
async function getGSTCustomerDataForSave() {
    // Get current GST customer data from the BILL VIEW DISPLAY, not the form
    const shipToVisible = document.getElementById('shipTo').style.display !== 'none';

    return {
        invoiceNo: document.getElementById('bill-invoice-no').textContent,
        invoiceDate: document.getElementById('bill-date-gst').textContent,
        billTo: {
            name: document.getElementById('billToName').textContent,
            address: document.getElementById('billToAddr').textContent,
            gstin: document.getElementById('billToGstin').textContent,
            contact: document.getElementById('billToContact').textContent,
            state: document.getElementById('billToState').textContent,
            stateCode: document.getElementById('billToStateCode').textContent
        },
        shipTo: {
            name: document.getElementById('shipToName').textContent,
            address: document.getElementById('shipToAddr').textContent,
            gstin: document.getElementById('shipToGstin').textContent,
            contact: document.getElementById('shipToContact').textContent,
            state: document.getElementById('shipToState').textContent,
            stateCode: document.getElementById('shipToStateCode').textContent,
            placeOfSupply: document.getElementById('shipToPOS').textContent
        },
        customerType: shipToVisible ? 'both' : 'bill-to',
        transactionType: transactionType,
        gstPercent: currentGSTPercent
    };
}
async function saveToLocalStorage() {
    try {
        const vars = getModeSpecificVars();
        const createListId = vars.createListId;

        // 1. Gather all basic data
        const data = {
            tableStructure: [],
            company: {
                name: document.getElementById("companyName").textContent,
                address: document.getElementById("companyAddr").textContent,
                phone: document.getElementById("companyPhone").textContent,
                gstin: document.getElementById("companyGstin").textContent
            },
            customer: {
                name: document.getElementById("custName").value,
                billNo: document.getElementById("billNo").value,
                address: document.getElementById("custAddr").value,
                date: document.getElementById("billDate").value,
                phone: document.getElementById("custPhone").value,
                gstin: document.getElementById("custGSTIN").value
            },
            // Keep legacy taxSettings object for safety, but main logic uses adjustmentChain
            taxSettings: {
                discountPercent: 0, // Deprecated but kept for structure
                discountAmount: 0,
                gstPercent: 0
            },
            // NEW: Save the adjustment chain
            adjustmentChain: adjustmentChain,

            // State flags
            normalBillState: {
                discountVisible: adjustmentChain.length > 0,
                gstVisible: adjustmentChain.length > 0
            },
            termsData: getTermsData(),
            gstCustomerData: await getGSTCustomerDataForSave()
        };

        // 2. Gather Rows (Items and Sections)
        document.querySelectorAll(`#${createListId} tbody tr`).forEach(row => {
            if (row.classList.contains('section-row')) {
                // ... [Existing Section Logic] ...
                const sectionId = row.getAttribute('data-section-id');
                const cell = row.querySelector('td');
                const collapseBtn = row.querySelector('.collapse-btn');

                let sectionName = '';
                for (let node of cell.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                        sectionName = node.textContent.trim();
                        break;
                    }
                }

                let htmlContent = row.closest('#createListManual') ? cell.innerHTML : sectionName;

                // In saveToLocalStorage, inside the section row block:
                data.tableStructure.push({
                    type: 'section',
                    id: sectionId,
                    name: sectionName,
                    style: cell.getAttribute('style') || '',
                    collapsed: collapseBtn ? collapseBtn.textContent === '+' : false,
                    html: htmlContent,
                    sourceTable: row.closest('table')?.id || 'createListManual',
                    showTotal: row.getAttribute('data-show-total') === 'true' // Save this
                });

            } else if (row.getAttribute('data-id')) {
                // ... [Existing Item Logic] ...
                const cells = row.children;
                const particularsDiv = cells[1];
                const itemName = particularsDiv.querySelector('.itemNameClass')?.textContent.trim() || '';
                const notes = particularsDiv.querySelector('.notes')?.textContent || '';

                const dimensionType = row.getAttribute('data-dimension-type') || 'none';
                const dimensionValuesAttr = row.getAttribute('data-dimension-values');
                const dimensionValues = dimensionValuesAttr ? JSON.parse(dimensionValuesAttr) : [0, 0, 0];
                const dimensionUnit = row.getAttribute('data-dimension-unit') || 'ft';
                const toggleStatesAttr = row.getAttribute('data-dimension-toggles');
                const toggleStates = toggleStatesAttr ? JSON.parse(toggleStatesAttr) : { toggle1: true, toggle2: true, toggle3: true };

                const originalQuantity = parseFloat(row.getAttribute('data-original-quantity') || cells[2].textContent);
                const hsnCode = row.getAttribute('data-hsn') || '';
                const productCode = row.getAttribute('data-product-code') || '';
                const discountType = row.getAttribute('data-discount-type') || 'none';
                const discountValue = row.getAttribute('data-discount-value') || '';
                const convertUnit = row.getAttribute('data-convert-unit') || 'none';

                data.tableStructure.push({
                    type: 'item',
                    id: row.getAttribute('data-id'),
                    itemName: itemName,
                    quantity: originalQuantity.toFixed(8),
                    unit: cells[3].textContent,
                    rate: storeWithPrecision(parseFloat(cells[4].textContent)),
                    amount: storeWithPrecision(parseFloat(cells[5].textContent)),
                    notes: notes,
                    dimensionType: dimensionType,
                    dimensionValues: dimensionValues,
                    dimensionUnit: dimensionUnit,
                    dimensionToggles: toggleStates,
                    convertUnit: convertUnit,
                    hsnCode: hsnCode,
                    productCode: productCode,
                    discountType: discountType,
                    discountValue: discountValue,
                    particularsHtml: particularsDiv.innerHTML,
                    displayQuantity: cells[2].textContent,
                    dimensionsVisible: row.getAttribute('data-dimensions-visible') === 'true'
                });
            }
        });

        // 3. Save to DB
        await setInDB('billDataManual', 'currentBill', data);

    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function saveStateToHistory() {
    const historyStack = historyStackManual;
    let historyIndex = historyIndexManual;

    if (historyIndex < historyStack.length - 1) {
        historyStack.splice(historyIndex + 1);
    }

    const state = {
        tableStructure: [],
        company: {
            name: document.getElementById("companyName").textContent,
            address: document.getElementById("companyAddr").textContent,
            phone: document.getElementById("companyPhone").textContent
        },
        customer: {
            name: document.getElementById("custName").value,
            billNo: document.getElementById("billNo").value,
            address: document.getElementById("custAddr").value,
            date: document.getElementById("billDate").value,
            phone: document.getElementById("custPhone").value,
            gstin: document.getElementById("custGSTIN").value
        },
        taxSettings: {
            discountPercent: storeWithPrecision(discountPercent),
            discountAmount: storeWithPrecision(discountAmount),
            gstPercent: storeWithPrecision(gstPercent)
        }
    };

    document.querySelectorAll(`#createListManual tbody tr`).forEach(row => {
        if (row.classList.contains('section-row')) {
            const sectionId = row.getAttribute('data-section-id');
            const cell = row.querySelector('td');
            const collapseBtn = row.querySelector('.collapse-btn');

            let sectionName = '';
            for (let node of cell.childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    sectionName = node.textContent.trim();
                    break;
                }
            }

            const completeHTML = cell.innerHTML;

            state.tableStructure.push({
                type: 'section',
                id: sectionId,
                name: sectionName,
                style: cell.getAttribute('style') || '',
                collapsed: collapseBtn ? collapseBtn.textContent === '+' : false,
                html: completeHTML,
                showTotal: row.getAttribute('data-show-total') === 'true' // <--- ADDED THIS FIX
            });
        } else if (row.getAttribute('data-id')) {
            const cells = row.children;
            const particularsDiv = cells[1];
            const itemName = particularsDiv.querySelector('.itemNameClass')?.textContent.trim() || '';
            const notes = particularsDiv.querySelector('.notes')?.textContent || '';

            const particularsHtml = particularsDiv.innerHTML;

            const dimensionType = row.getAttribute('data-dimension-type') || 'none';
            const dimensionValuesAttr = row.getAttribute('data-dimension-values');
            const dimensionValues = dimensionValuesAttr ? JSON.parse(dimensionValuesAttr) : [0, 0, 0];
            const dimensionUnit = row.getAttribute('data-dimension-unit') || 'ft';

            const toggleStatesAttr = row.getAttribute('data-dimension-toggles');
            let toggleStates;
            try {
                toggleStates = toggleStatesAttr && toggleStatesAttr !== 'undefined' ? JSON.parse(toggleStatesAttr) : { toggle1: true, toggle2: true, toggle3: true };
            } catch (e) {
                toggleStates = { toggle1: true, toggle2: true, toggle3: true };
            }

            const originalQuantity = parseFloat(row.getAttribute('data-original-quantity') || cells[2].textContent);
            const hsnCode = row.getAttribute('data-hsn') || '';
            const productCode = row.getAttribute('data-product-code') || '';
            const discountType = row.getAttribute('data-discount-type') || 'none';
            const discountValue = row.getAttribute('data-discount-value') || '';

            // --- SAVE CONVERT UNIT ---
            const convertUnit = row.getAttribute('data-convert-unit') || 'none';

            state.tableStructure.push({
                type: 'item',
                id: row.getAttribute('data-id'),
                itemName: itemName,
                quantity: originalQuantity.toFixed(8),
                unit: cells[3].textContent,
                rate: storeWithPrecision(parseFloat(cells[4].textContent)),
                amount: storeWithPrecision(parseFloat(cells[5].textContent)),
                notes: notes,
                dimensionType: dimensionType,
                dimensionValues: dimensionValues,
                dimensionUnit: dimensionUnit,
                dimensionToggles: toggleStates,
                convertUnit: convertUnit, // <--- SAVED HERE
                hsnCode: hsnCode,
                productCode: productCode,
                discountType: discountType,
                discountValue: discountValue,
                particularsHtml: particularsHtml,
                displayQuantity: cells[2].textContent,
                dimensionsVisible: row.getAttribute('data-dimensions-visible') === 'true'
            });
        }
    });

    historyStack.push(JSON.stringify(state));
    historyIndex = historyStack.length - 1;
    historyIndexManual = historyIndex;

    if (historyStack.length > 50) {
        historyStack.shift();
        historyIndexManual--;
    }
}

function undoAction() {
    if (currentView === 'bill') {
        showNotification('Switch to Input mode for Undo/Redo', 'info');
        return;
    }

    if (historyIndexManual > 0) {
        historyIndexManual--;
        restoreStateFromHistory();
    }
}

function redoAction() {
    if (currentView === 'bill') {
        showNotification('Switch to Input mode for Undo/Redo', 'info');
        return;
    }

    if (historyIndexManual < historyStackManual.length - 1) {
        historyIndexManual++;
        restoreStateFromHistory();
    }
}
// Function: Restore State From History
function restoreStateFromHistory() {
    const state = JSON.parse(historyStackManual[historyIndexManual]);

    document.getElementById("companyName").textContent = state.company?.name || "COMPANY NAME";
    document.getElementById("companyAddr").textContent = state.company?.address || "Address";
    document.getElementById("companyPhone").textContent = state.company?.phone || "+91 01234-56789";
    document.getElementById("companyGstin").textContent = state.company?.gstin || "GSTIN : Your 15-digit GSTIN";

    document.getElementById("custName").value = state.customer?.name || "";
    document.getElementById("billNo").value = state.customer?.billNo || "";
    document.getElementById("custAddr").value = state.customer?.address || "";
    document.getElementById("billDate").value = state.customer?.date || "";
    document.getElementById("custPhone").value = state.customer?.phone || "";
    document.getElementById("custGSTIN").value = state.customer?.gstin || "";

    if (state.taxSettings) {
        discountPercent = state.taxSettings.discountPercent || 0;
        gstPercent = state.taxSettings.gstPercent || 0;
    }

    const createListTbody = document.querySelector("#createListManual tbody");
    const copyListTbody = document.querySelector("#copyListManual tbody");
    createListTbody.innerHTML = "";
    copyListTbody.innerHTML = "";

    let maxId = 0;

    if (state.tableStructure && state.tableStructure.length > 0) {
        state.tableStructure.forEach(rowData => {
            if (rowData.type === 'section') {
                createSectionInAllTablesFromSaved(rowData);
            } else if (rowData.type === 'item') {
                const toggleStates = rowData.dimensionToggles || { toggle1: true, toggle2: true, toggle3: true };

                createItemInAllTablesFromSaved({
                    type: 'item',
                    id: rowData.id,
                    itemName: rowData.itemName,
                    quantity: rowData.quantity,
                    unit: rowData.unit,
                    rate: rowData.rate,
                    amount: rowData.amount,
                    notes: rowData.notes,
                    dimensionType: rowData.dimensionType,
                    dimensionValues: rowData.dimensionValues,
                    dimensionUnit: rowData.dimensionUnit,
                    dimensionToggles: toggleStates,
                    hsnCode: rowData.hsnCode,
                    productCode: rowData.productCode,
                    discountType: rowData.discountType,
                    discountValue: rowData.discountValue,
                    particularsHtml: rowData.particularsHtml,
                    displayQuantity: rowData.displayQuantity,
                    dimensionsVisible: rowData.dimensionsVisible !== false,
                    convertUnit: rowData.convertUnit
                });

                const idNum = parseInt(rowData.id.split('-')[2]);
                if (idNum > maxId) maxId = idNum;
            }
        });
        rowCounterManual = maxId + 1;
    }

    if (state.tableStructure) {
        state.tableStructure.forEach(rowData => {
            if (rowData.type === 'section' && rowData.collapsed) {
                const sectionRow = document.querySelector(`tr[data-section-id="${rowData.id}"]`);
                if (sectionRow) {
                    const button = sectionRow.querySelector('.collapse-btn');
                    if (button) {
                        button.textContent = '+';
                        let nextRow = sectionRow.nextElementSibling;
                        while (nextRow && !nextRow.classList.contains('section-row')) {
                            nextRow.style.display = 'none';
                            nextRow = nextRow.nextElementSibling;
                        }
                    }
                }
            }
        });
    }

    updateSerialNumbers();
    updateTotal();
    updateGlobalDimensionButtonState(); // <--- ADDED THIS
    updateGSTINVisibility();
    saveToLocalStorage();

    initializeDragAndDrop();
    formatAllQuantitiesAfterRestore();
    updateColumnVisibility();
}

// Replace the formatAllQuantities function with this one
function formatAllQuantitiesAfterRestore() {
    const tables = ['createListManual', 'copyListManual'];
    if (isGSTMode) {
        tables.push('gstCopyListManual');
    }

    tables.forEach(tableId => {
        const rows = document.querySelectorAll(`#${tableId} tbody tr[data-id]`);

        rows.forEach(row => {
            const quantityCell = row.children[2]; // Qty is at index 2 for regular tables
            let originalQuantity;

            // For GST table, quantity is at index 3
            if (tableId === 'gstCopyListManual') {
                originalQuantity = parseFloat(row.children[3].textContent);
            } else {
                originalQuantity = parseFloat(row.getAttribute('data-original-quantity') || quantityCell.textContent);
            }

            // Format quantity - remove .00 if whole number
            const formattedQuantity = originalQuantity % 1 === 0 ?
                originalQuantity.toString() :
                originalQuantity.toFixed(2);

            // Update the cell
            if (tableId === 'gstCopyListManual') {
                row.children[3].textContent = formattedQuantity;
            } else {
                quantityCell.textContent = formattedQuantity;
            }
        });
    });
}
async function saveToHistory() {
    try {
        const vars = getModeSpecificVars();
        const historyStorageKey = vars.historyStorageKey;

        // Use values from View or fallback to Modal if View is empty
        const customerName = document.getElementById("custName").value.trim() || "Unnamed Bill";
        const billNo = document.getElementById("billNo").value.trim() || "No Bill Number";
        const date = document.getElementById("billDate").value.trim() || new Date().toLocaleDateString();

        const createListId = vars.createListId;

        // --- 1. Calculate Total Amount (Preserved Logic) ---
        let subtotal = 0;
        document.querySelectorAll(`#${createListId} tbody tr[data-id]`).forEach(row => {
            const amount = parseFloat(row.children[5].textContent) || 0;
            subtotal += amount;
        });

        let runningBalance = subtotal;

        // Filter chain based on mode
        const activeChain = (typeof isGSTMode !== 'undefined' && isGSTMode)
            ? adjustmentChain.filter(a => a.id !== 'legacy-gst')
            : adjustmentChain;

        // Apply Adjustments
        if (activeChain && activeChain.length > 0) {
            activeChain.forEach(adj => {
                let adjAmount = 0;
                if (adj.type === 'percent') {
                    adjAmount = (runningBalance * adj.value) / 100;
                } else {
                    adjAmount = adj.value;
                }

                if (adj.operation === 'subtract') {
                    runningBalance -= adjAmount;
                } else {
                    runningBalance += adjAmount;
                }
            });
        }

        // GST Mode Logic
        if (typeof isGSTMode !== 'undefined' && isGSTMode) {
            const taxableValue = runningBalance;
            let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

            if (typeof transactionType !== 'undefined' && transactionType === 'intrastate') {
                cgstAmount = (taxableValue * (currentGSTPercent / 2)) / 100;
                sgstAmount = (taxableValue * (currentGSTPercent / 2)) / 100;
            } else {
                igstAmount = (taxableValue * currentGSTPercent) / 100;
            }
            runningBalance = Math.round(taxableValue + cgstAmount + sgstAmount + igstAmount);
        }

        // --- NEW: Capture Regular Details Modal State ---
        const modalState = {
            type: document.getElementById('reg-modal-type-select')?.value || 'Estimate',
            prefix: document.getElementById('reg-modal-prefix')?.value || '',
            invoiceNo: document.getElementById('reg-modal-invoice-no')?.value || '',
            date: document.getElementById('reg-modal-date')?.value || '',
            viewFormat: document.getElementById('reg-modal-cust-view-select')?.value || 'simple',

            simple: {
                name: document.getElementById('reg-modal-simple-name')?.value || '',
                phone: document.getElementById('reg-modal-simple-phone')?.value || '',
                addr: document.getElementById('reg-modal-simple-addr')?.value || ''
            },
            billTo: {
                name: document.getElementById('reg-modal-bill-name')?.value || '',
                addr: document.getElementById('reg-modal-bill-addr')?.value || '',
                gst: document.getElementById('reg-modal-bill-gst')?.value || '',
                phone: document.getElementById('reg-modal-bill-phone')?.value || '',
                state: document.getElementById('reg-modal-bill-state')?.value || 'Maharashtra',
                code: document.getElementById('reg-modal-bill-code')?.value || '27'
            },
            shipTo: {
                name: document.getElementById('reg-modal-ship-name')?.value || '',
                addr: document.getElementById('reg-modal-ship-addr')?.value || '',
                gst: document.getElementById('reg-modal-ship-gst')?.value || '',
                phone: document.getElementById('reg-modal-ship-phone')?.value || '',
                state: document.getElementById('reg-modal-ship-state')?.value || 'Maharashtra',
                code: document.getElementById('reg-modal-ship-code')?.value || '27',
                pos: document.getElementById('reg-modal-ship-pos')?.value || 'Maharashtra'
            }
        };

        // --- 2. Construct Data Object ---
        const currentData = {
            tableStructure: [],
            company: {
                name: document.getElementById("companyName").textContent,
                address: document.getElementById("companyAddr").textContent,
                phone: document.getElementById("companyPhone").textContent
            },
            customer: {
                name: customerName,
                billNo: billNo,
                address: document.getElementById("custAddr").value,
                date: date,
                phone: document.getElementById("custPhone").value,
                gstin: document.getElementById("custGSTIN").value
            },
            // === NEW: Save the Modal State ===
            modalState: modalState,

            adjustmentChain: adjustmentChain,
            taxSettings: {
                discountPercent: 0,
                discountAmount: 0,
                gstPercent: 0
            },
            timestamp: Date.now(),
            totalAmount: runningBalance.toFixed(2)
        };

        // Save complete table structure (Preserved Logic)
        document.querySelectorAll(`#${createListId} tbody tr`).forEach(row => {
            if (row.classList.contains('section-row')) {
                const sectionId = row.getAttribute('data-section-id');
                const cell = row.querySelector('td');
                const collapseBtn = row.querySelector('.collapse-btn');
                let sectionName = '';
                for (let node of cell.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                        sectionName = node.textContent.trim();
                        break;
                    }
                }
                currentData.tableStructure.push({
                    type: 'section',
                    id: sectionId,
                    name: sectionName,
                    style: cell.getAttribute('style') || '',
                    collapsed: collapseBtn ? collapseBtn.textContent === '+' : false,
                    html: cell.innerHTML,
                    showTotal: row.getAttribute('data-show-total') === 'true'
                });
            } else if (row.getAttribute('data-id')) {
                const cells = row.children;
                const particularsDiv = cells[1];
                const itemName = particularsDiv.querySelector('.itemNameClass')?.textContent.trim() || '';
                const notes = particularsDiv.querySelector('.notes')?.textContent || '';
                const particularsHtml = particularsDiv.innerHTML;

                // Get Attributes safely
                const dimensionValuesAttr = row.getAttribute('data-dimension-values');
                const dimensionValues = dimensionValuesAttr ? JSON.parse(dimensionValuesAttr) : [0, 0, 0];
                const toggleStatesAttr = row.getAttribute('data-dimension-toggles');
                let toggleStates;
                try { toggleStates = toggleStatesAttr && toggleStatesAttr !== 'undefined' ? JSON.parse(toggleStatesAttr) : { toggle1: true, toggle2: true, toggle3: true }; } catch (e) { toggleStates = { toggle1: true, toggle2: true, toggle3: true }; }

                currentData.tableStructure.push({
                    type: 'item',
                    id: row.getAttribute('data-id'),
                    itemName: itemName,
                    quantity: parseFloat(row.getAttribute('data-original-quantity') || cells[2].textContent).toFixed(8),
                    unit: cells[3].textContent,
                    rate: cells[4].textContent,
                    amount: cells[5].textContent,
                    notes: notes,
                    dimensionType: row.getAttribute('data-dimension-type') || 'none',
                    dimensionValues: dimensionValues,
                    dimensionUnit: row.getAttribute('data-dimension-unit') || 'ft',
                    dimensionToggles: toggleStates,
                    convertUnit: row.getAttribute('data-convert-unit') || 'none',
                    hsnCode: row.getAttribute('data-hsn') || '',
                    productCode: row.getAttribute('data-product-code') || '',
                    discountType: row.getAttribute('data-discount-type') || 'none',
                    discountValue: row.getAttribute('data-discount-value') || '',
                    particularsHtml: particularsHtml,
                    displayQuantity: cells[2].textContent,
                    dimensionsVisible: row.getAttribute('data-dimensions-visible') === 'true'
                });
            }
        });

        if (currentData.totalAmount === "0.00" && currentData.tableStructure.length === 0) return;

        let history = await getFromDB(historyStorageKey, 'history') || [];

        // Duplicate Detection (Preserved)
        if (history.length > 0) {
            const lastItem = history[0];
            if (JSON.stringify(lastItem.data.tableStructure) === JSON.stringify(currentData.tableStructure) &&
                lastItem.data.customer.name === currentData.customer.name &&
                lastItem.data.customer.billNo === currentData.customer.billNo &&
                JSON.stringify(lastItem.data.adjustmentChain) === JSON.stringify(currentData.adjustmentChain)) {
                return;
            }
        }

        const historyData = {
            id: `bill-${Date.now()}`,
            title: `${customerName} - ${billNo}`,
            date: date,
            data: currentData
        };

        history.unshift(historyData);
        if (history.length > 50) history = history.slice(0, 50);

        await setInDB(historyStorageKey, 'history', history);

        const historySidebar = document.getElementById("history-sidebar");
        const historyModal = document.getElementById("history-modal");

        // Reload if either sidebar or modal is open
        if ((historySidebar && historySidebar.classList.contains("open")) ||
            (historyModal && historyModal.style.display === "block")) {
            loadHistoryFromLocalStorage();
        }
    } catch (error) {
        console.error('Error saving to history:', error);
    }
}


async function removeHistoryItem(id, event) {
    if (event) event.stopPropagation();

    try {
        const vars = getModeSpecificVars();
        const historyStorageKey = vars.historyStorageKey;

        let history = await getFromDB(historyStorageKey, 'history') || [];
        history = history.filter(item => item.id !== id);
        await setInDB(historyStorageKey, 'history', history);

        await loadHistoryFromLocalStorage();
    } catch (error) {
        console.error('Error removing history item:', error);
    }
}

async function loadFromHistory(item) {
    if (!item.data) return;

    const data = item.data;

    // Only load data if there's actual content
    if (data.tableStructure && data.tableStructure.length > 0) {

        // 1. Load Legacy/Standard Fields (Fallback for older bills)
        document.getElementById("companyName").textContent = data.company.name;
        document.getElementById("companyAddr").textContent = data.company.address;
        document.getElementById("companyPhone").textContent = data.company.phone;
        document.getElementById("custName").value = data.customer.name;
        document.getElementById("billNo").value = data.customer.billNo;
        document.getElementById("custAddr").value = data.customer.address;
        document.getElementById("billDate").value = data.customer.date;
        document.getElementById("custPhone").value = data.customer.phone;
        document.getElementById("custGSTIN").value = data.customer.gstin || '';

        // ------------------------------------------------------------
        // === NEW: RESTORE REGULAR MODAL STATE & SYNC VIEW ===
        // ------------------------------------------------------------
        const state = data.modalState;
        if (state) {
            // A. Restore General Settings
            if (document.getElementById('reg-modal-type-select')) document.getElementById('reg-modal-type-select').value = state.type || 'Estimate';
            if (document.getElementById('reg-modal-prefix')) document.getElementById('reg-modal-prefix').value = state.prefix || '';
            if (document.getElementById('reg-modal-invoice-no')) document.getElementById('reg-modal-invoice-no').value = state.invoiceNo || '';
            if (document.getElementById('reg-modal-date')) document.getElementById('reg-modal-date').value = state.date || '';

            // B. Restore View Format
            if (document.getElementById('reg-modal-cust-view-select')) {
                document.getElementById('reg-modal-cust-view-select').value = state.viewFormat || 'simple';
                // Trigger view change to ensure correct fields are visible
                if (typeof handleRegViewChange === 'function') handleRegViewChange();
            }

            // C. Restore Simple Details
            if (state.simple) {
                if (document.getElementById('reg-modal-simple-name')) document.getElementById('reg-modal-simple-name').value = state.simple.name || '';
                if (document.getElementById('reg-modal-simple-phone')) document.getElementById('reg-modal-simple-phone').value = state.simple.phone || '';
                if (document.getElementById('reg-modal-simple-addr')) document.getElementById('reg-modal-simple-addr').value = state.simple.addr || '';
            }

            // D. Restore Bill To
            if (state.billTo) {
                if (document.getElementById('reg-modal-bill-name')) document.getElementById('reg-modal-bill-name').value = state.billTo.name || '';
                if (document.getElementById('reg-modal-bill-addr')) document.getElementById('reg-modal-bill-addr').value = state.billTo.addr || '';
                if (document.getElementById('reg-modal-bill-gst')) document.getElementById('reg-modal-bill-gst').value = state.billTo.gst || '';
                if (document.getElementById('reg-modal-bill-phone')) document.getElementById('reg-modal-bill-phone').value = state.billTo.phone || '';
                if (document.getElementById('reg-modal-bill-state')) document.getElementById('reg-modal-bill-state').value = state.billTo.state || 'Maharashtra';
                if (document.getElementById('reg-modal-bill-code')) document.getElementById('reg-modal-bill-code').value = state.billTo.code || '27';
            }

            // E. Restore Ship To
            if (state.shipTo) {
                if (document.getElementById('reg-modal-ship-name')) document.getElementById('reg-modal-ship-name').value = state.shipTo.name || '';
                if (document.getElementById('reg-modal-ship-addr')) document.getElementById('reg-modal-ship-addr').value = state.shipTo.addr || '';
                if (document.getElementById('reg-modal-ship-gst')) document.getElementById('reg-modal-ship-gst').value = state.shipTo.gst || '';
                if (document.getElementById('reg-modal-ship-phone')) document.getElementById('reg-modal-ship-phone').value = state.shipTo.phone || '';
                if (document.getElementById('reg-modal-ship-state')) document.getElementById('reg-modal-ship-state').value = state.shipTo.state || 'Maharashtra';
                if (document.getElementById('reg-modal-ship-code')) document.getElementById('reg-modal-ship-code').value = state.shipTo.code || '27';
                if (document.getElementById('reg-modal-ship-pos')) document.getElementById('reg-modal-ship-pos').value = state.shipTo.pos || 'Maharashtra';
            }

            // F. SYNC TO MAIN VIEW (Push modal data to bill paper)
            if (typeof saveRegularBillDetails === 'function') {
                saveRegularBillDetails(true); // true = silent mode (no toast)
            }
        }
        // ------------------------------------------------------------


        // === UPDATE: Load Adjustments (with Migration) ===
        if (data.adjustmentChain) {
            // Load new format
            adjustmentChain = data.adjustmentChain;
        } else if (data.taxSettings) {
            // Migrate Legacy History Items
            adjustmentChain = [];

            if (data.taxSettings.discountPercent > 0) {
                adjustmentChain.push({
                    id: 'legacy-discount', name: 'Discount', type: 'percent',
                    value: data.taxSettings.discountPercent, operation: 'subtract', textColor: '#e74c3c'
                });
            } else if (data.taxSettings.discountAmount > 0) {
                adjustmentChain.push({
                    id: 'legacy-discount', name: 'Discount', type: 'amount',
                    value: data.taxSettings.discountAmount, operation: 'subtract', textColor: '#e74c3c'
                });
            }

            if (data.taxSettings.gstPercent > 0) {
                adjustmentChain.push({
                    id: 'legacy-gst', name: 'GST', type: 'percent',
                    value: data.taxSettings.gstPercent, operation: 'add', textColor: '#27ae60'
                });
            }
        } else {
            adjustmentChain = [];
        }

        const createListTbody = document.querySelector("#createListManual tbody");
        const copyListTbody = document.querySelector("#copyListManual tbody");
        createListTbody.innerHTML = "";
        copyListTbody.innerHTML = "";

        let maxId = 0;

        // Restore table structure
        if (data.tableStructure && data.tableStructure.length > 0) {
            data.tableStructure.forEach(rowData => {
                if (rowData.type === 'section') {
                    createSectionInAllTablesFromSaved(rowData);
                } else if (rowData.type === 'item') {
                    const toggleStates = rowData.dimensionToggles || { toggle1: true, toggle2: true, toggle3: true };

                    createItemInAllTablesFromSaved({
                        type: 'item',
                        id: rowData.id,
                        itemName: rowData.itemName,
                        quantity: rowData.quantity,
                        unit: rowData.unit,
                        rate: rowData.rate,
                        amount: rowData.amount,
                        notes: rowData.notes,
                        dimensionType: rowData.dimensionType,
                        dimensionValues: rowData.dimensionValues,
                        dimensionUnit: rowData.dimensionUnit,
                        dimensionToggles: toggleStates,
                        hsnCode: rowData.hsnCode,
                        productCode: rowData.productCode,
                        discountType: rowData.discountType,
                        discountValue: rowData.discountValue,
                        particularsHtml: rowData.particularsHtml,
                        displayQuantity: rowData.displayQuantity,
                        dimensionsVisible: rowData.dimensionsVisible !== false,
                        convertUnit: rowData.convertUnit
                    });

                    const idNum = parseInt(rowData.id.split('-')[2]);
                    if (idNum > maxId) maxId = idNum;
                }
            });
            rowCounterManual = maxId + 1;
        }

        // Apply collapse states
        if (data.tableStructure) {
            data.tableStructure.forEach(rowData => {
                if (rowData.type === 'section' && rowData.collapsed) {
                    const sectionRow = document.querySelector(`tr[data-section-id="${rowData.id}"]`);
                    if (sectionRow) {
                        const button = sectionRow.querySelector('.collapse-btn');
                        if (button) {
                            button.textContent = '+';
                            let nextRow = sectionRow.nextElementSibling;
                            while (nextRow && !nextRow.classList.contains('section-row')) {
                                nextRow.style.display = 'none';
                                nextRow = nextRow.nextElementSibling;
                            }
                        }
                    }
                }
            });
        }

        updateSerialNumbers();
        // Re-calculate totals based on loaded items and loaded chain
        updateTotal();
        updateGSTINVisibility();
        await saveToLocalStorage();

        // UPDATE LEGACY DIALOG BOXES (Visual only)
        setTimeout(() => {
            const discountTypeSelect = document.getElementById('discount-type-select');
            const discountPercentInput = document.getElementById('discount-percent-input');
            const discountAmountInput = document.getElementById('discount-amount-input');

            // Try to find legacy discount in the chain
            const legacyDisc = adjustmentChain.find(a => a.id === 'legacy-discount');
            if (legacyDisc) {
                discountTypeSelect.value = legacyDisc.type; // percent or amount
                if (legacyDisc.type === 'percent') discountPercentInput.value = legacyDisc.value;
                else discountAmountInput.value = legacyDisc.value;
            } else {
                discountTypeSelect.value = 'none';
            }

            // Try to find legacy GST
            const legacyGST = adjustmentChain.find(a => a.id === 'legacy-gst');
            const gstInput = document.getElementById('gst-input');
            if (legacyGST) gstInput.value = legacyGST.value;
            else gstInput.value = '';

            if (typeof handleDiscountTypeChange === 'function') handleDiscountTypeChange();
        }, 100);

        saveStateToHistory();
        initializeDragAndDrop();
        closeHistoryModal();
        // updateColumnVisibility();
        // FIX: Reset columns to visible on load
        resetColumnVisibility();

        console.log('Bill restored successfully from history');
    } else {
        console.log('No data found in this history item');
        showNotification('No data found in this history item');
    }
}

function openDiscountModal() {
    const modal = document.getElementById('discount-modal');
    const percentInput = document.getElementById('discount-percent-input');
    const amountInput = document.getElementById('discount-amount-input');
    const typeSelect = document.getElementById('discount-type-select');
    const subtotalDisplay = document.getElementById('current-subtotal-display');

    // Get current subtotal
    const currentSubtotal = getCurrentSubtotal();
    subtotalDisplay.textContent = roundToTwoDecimals(currentSubtotal);

    // === FIX 2: Check Adjustment Chain for existing legacy discount ===
    const existingAdj = adjustmentChain.find(a => a.id === 'legacy-discount');

    if (existingAdj) {
        typeSelect.value = existingAdj.type; // 'percent' or 'amount'

        if (existingAdj.type === 'percent') {
            percentInput.value = existingAdj.value;
            amountInput.value = '';
        } else {
            amountInput.value = existingAdj.value;
            percentInput.value = '';
        }
    } else {
        // Reset if no discount exists
        typeSelect.value = 'none';
        percentInput.value = '';
        amountInput.value = '';
    }

    // Update visibility of inputs based on selection
    handleDiscountTypeChange();

    modal.style.display = 'block';
}

function closeDiscountModal() {
    const modal = document.getElementById('discount-modal');
    modal.style.display = 'none';
}

// Precision helper functions
function roundToTwoDecimals(value) {
    if (isNaN(value)) return 0;

    // First round to handle floating-point precision issues
    const rounded = Math.round(value * 100) / 100;

    // If it's very close to a whole number after rounding, return the whole number
    if (Math.abs(rounded - Math.round(rounded)) < 0.001) {
        return Math.round(rounded);
    }

    return parseFloat(rounded.toFixed(2));
}

function storeWithPrecision(value) {
    if (isNaN(value)) return 0;
    return parseFloat(value.toFixed(8));
}

function calculateWithPrecision(value) {
    if (isNaN(value)) return 0;
    return parseFloat(value.toFixed(8));
}

async function applyDiscountSettings() {
    const type = document.getElementById('discount-type-select').value;

    // 1. Remove any existing legacy discount to avoid duplicates
    adjustmentChain = adjustmentChain.filter(a => a.id !== 'legacy-discount');

    let newDiscount = null;

    // 2. Create new adjustment object based on input
    if (type === 'percent') {
        const percentValue = parseFloat(document.getElementById('discount-percent-input').value) || 0;

        if (percentValue > 100) {
            showNotification('Discount percentage cannot exceed 100%', 'info');
            return;
        }

        if (percentValue > 0) {
            newDiscount = {
                id: 'legacy-discount',
                name: 'Discount',
                type: 'percent',
                value: percentValue,
                operation: 'subtract',
                textColor: '#e74c3c' // Red color
            };
        }
    }
    else if (type === 'amount') {
        const amountValue = parseFloat(document.getElementById('discount-amount-input').value) || 0;
        const currentSubtotal = getCurrentSubtotal(); // Helper function we added earlier

        if (amountValue > currentSubtotal) {
            showNotification('Discount amount cannot exceed subtotal', 'info');
            return;
        }

        if (amountValue > 0) {
            newDiscount = {
                id: 'legacy-discount',
                name: 'Discount',
                type: 'amount',
                value: amountValue,
                operation: 'subtract',
                textColor: '#e74c3c' // Red color
            };
        }
    }

    // 3. Add to Chain (Unshift adds to TOP, usually before Tax)
    if (newDiscount) {
        adjustmentChain.unshift(newDiscount);
    }

    // 4. Save and Update
    await saveToLocalStorage();
    saveStateToHistory();
    updateTotal(); // Triggers new calculation logic
    closeDiscountModal();

    showNotification('Discount applied successfully', 'success');
}

function openGSTModal() {
    const modal = document.getElementById('gst-modal');
    const gstInput = document.getElementById('gst-input');
    const gstinInput = document.getElementById('gstin-input');

    // === FIX 3: Check Adjustment Chain for existing legacy GST ===
    const existingAdj = adjustmentChain.find(a => a.id === 'legacy-gst');

    if (existingAdj) {
        gstInput.value = existingAdj.value;
    } else {
        gstInput.value = ''; // Reset to empty if no GST
    }

    gstinInput.value = document.getElementById('custGSTIN').value || '';

    modal.style.display = 'block';
}

function closeGSTModal() {
    const modal = document.getElementById('gst-modal');
    modal.style.display = 'none';
}

// Add this NEW function to update GSTIN field visibility
function updateGSTINVisibility() {
    const gstLine = document.getElementById('reg-header-gstin-line');
    const gstTD = document.getElementById('custGSINTd');
    const companyGSTINSpan = document.getElementById('companyGstin'); // Ensure this exists

    // Check if GST exists in the new Adjustment Chain
    const hasGST = adjustmentChain.some(a => a.id === 'legacy-gst');

    if (hasGST) {
        // Show elements
        if (gstLine) {
            // Only show header line if there is actually text content
            const hasText = companyGSTINSpan && companyGSTINSpan.textContent.trim() !== '' && companyGSTINSpan.textContent !== 'Your 15-digit GSTIN';
            gstLine.style.display = hasText ? 'block' : 'none';
        }
        if (gstTD) gstTD.style.display = 'table-cell'; // table-cell preserves layout better than block
    } else {
        // Hide elements
        if (gstLine) gstLine.style.display = 'none';
        if (gstTD) gstTD.style.display = 'none';
    }
}

async function applyGSTSettings() {
    const gstInput = document.getElementById('gst-input');
    const gstinInput = document.getElementById('gstin-input');

    const newGST = parseFloat(gstInput.value) || 0;
    const newGSTIN = gstinInput.value.trim();

    if (newGST < 0 || newGST > 100) {
        showNotification('Invalid GST Percentage', 'error');
        return;
    }

    // 1. Update GSTIN field value
    const custGSTINEl = document.getElementById('custGSTIN');
    if (custGSTINEl) custGSTINEl.value = newGSTIN;

    // 2. Update Adjustment Chain
    // Remove existing legacy GST first
    adjustmentChain = adjustmentChain.filter(a => a.id !== 'legacy-gst');

    if (newGST > 0) {
        const newTax = {
            id: 'legacy-gst',
            name: 'GST',
            type: 'percent',
            value: newGST,
            operation: 'add',
            textColor: '#27ae60' // Green color
        };

        adjustmentChain.push(newTax);
    }

    // 3. Save and Update
    updateGSTINVisibility(); // Call the updated visibility logic
    await saveToLocalStorage();
    saveStateToHistory();
    updateTotal();
    closeGSTModal();

    showNotification('GST applied successfully', 'success');
}

async function saveGSTIN() {
    await saveToLocalStorage();
    saveStateToHistory();
}

async function saveTaxSettings() {
    const taxSettings = {
        discountPercent: storeWithPrecision(discountPercent),
        discountAmount: storeWithPrecision(discountAmount),
        gstPercent: storeWithPrecision(gstPercent)
    };
    await setInDB('taxSettings', 'taxSettings', taxSettings);
}

async function loadTaxSettings() {
    try {
        const saved = await getFromDB('taxSettings', 'taxSettings');
        if (saved) {
            discountPercent = saved.discountPercent || 0;
            gstPercent = saved.gstPercent || 0;
        }
    } catch (error) {
        console.error('Error loading tax settings:', error);
    }
}

async function backupData() {
    try {
        const currentBill = await getFromDB('billDataManual', 'currentBill');
        const historyData = await getAllFromDB('billHistoryManual');
        const taxSettings = await getFromDB('taxSettings', 'taxSettings');
        const theme = await getFromDB('theme', 'currentTheme');
        const savedItems = await getAllFromDB('savedItems');
        const savedCustomers = await getAllFromDB('savedCustomers');
        const savedBills = await getAllFromDB('savedBills');

        // GST Data
        const gstCustomers = await getAllFromDB('gstCustomers');
        const gstSavedBills = await getAllFromDB('gstSavedBills');
        const companyInfo = await getFromDB('companyInfo', 'companyInfo');
        const gstMode = await getFromDB('gstMode', 'isGSTMode');

        const backupData = {
            currentBill: currentBill,
            history: historyData,
            taxSettings: taxSettings,
            theme: theme,
            savedItems: savedItems,
            savedCustomers: savedCustomers,
            savedBills: savedBills,
            // GST Data
            gstCustomers: gstCustomers,
            gstSavedBills: gstSavedBills,
            companyInfo: companyInfo,
            gstMode: gstMode,
            timestamp: new Date().toISOString(),
            version: '2.0'
        };

        const dataStr = JSON.stringify(backupData);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bill-app-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error creating backup:', error);
    }
}

async function restoreData() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const backupData = JSON.parse(event.target.result);

                    if (!backupData.currentBill || !backupData.history) {
                        showNotification('Invalid backup file format');
                        return;
                    }

                    // Clear all existing data before restoring
                    await clearAllData(true);

                    // Restore regular data
                    await setInDB('billDataManual', 'currentBill', backupData.currentBill);

                    for (const historyItem of backupData.history) {
                        await setInDB('billHistoryManual', historyItem.id, historyItem.value);
                    }

                    if (backupData.taxSettings) {
                        await setInDB('taxSettings', 'taxSettings', backupData.taxSettings);
                    }

                    if (backupData.theme) {
                        await setInDB('theme', 'currentTheme', backupData.theme);
                    }

                    if (backupData.savedItems) {
                        for (const item of backupData.savedItems) {
                            await setInDB('savedItems', item.id, item.value);
                        }
                    }

                    if (backupData.savedCustomers) {
                        for (const customer of backupData.savedCustomers) {
                            await setInDB('savedCustomers', customer.id, customer.value);
                        }
                    }

                    if (backupData.savedBills) {
                        for (const bill of backupData.savedBills) {
                            await setInDB('savedBills', bill.id, bill.value);
                        }
                    }

                    // Restore GST Data
                    if (backupData.gstCustomers) {
                        for (const customer of backupData.gstCustomers) {
                            await setInDB('gstCustomers', customer.id, customer.value);
                        }
                    }

                    if (backupData.gstSavedBills) {
                        for (const bill of backupData.gstSavedBills) {
                            await setInDB('gstSavedBills', bill.id, bill.value);
                        }
                    }

                    if (backupData.companyInfo) {
                        await setInDB('companyInfo', 'companyInfo', backupData.companyInfo);
                    }

                    if (backupData.gstMode !== undefined) {
                        await setInDB('gstMode', 'isGSTMode', backupData.gstMode);
                    }


                    // Reload all data
                    await loadFromLocalStorage();
                    await loadHistoryFromLocalStorage();
                    await loadSavedTheme();
                    await loadTaxSettings();
                    // await loadSavedItems();
                    await loadSavedCustomers();

                    // Load GST data
                    await loadCompanyInfo();
                    await loadGSTCustomers();

                    // Update GST mode
                    const gstModeSetting = await getFromDB('gstMode', 'isGSTMode');
                    isGSTMode = gstModeSetting || false;
                    updateUIForGSTMode();

                    saveStateToHistory();

                    showNotification('Data restored successfully!');

                } catch (error) {
                    console.error('Error parsing backup file:', error);
                    showNotification('Error restoring backup file. Please make sure it\'s a valid backup file.');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    } catch (error) {
        console.error('Error restoring data:', error);
        showNotification('Error restoring data. Please try again.');
    }
}
async function clearCustomerInputs() {
    // 1. Reset Select to Bill To
    const custType = document.getElementById('customer-type');
    if (custType) {
        custType.value = 'bill-to';
        if (typeof handleCustomerTypeChange === 'function') handleCustomerTypeChange();
    }

    // 2. Clear Bill To inputs
    if(document.getElementById('consignee-name')) document.getElementById('consignee-name').value = '';
    if(document.getElementById('consignee-address')) document.getElementById('consignee-address').value = '';
    if(document.getElementById('consignee-gst')) document.getElementById('consignee-gst').value = '';
    if(document.getElementById('consignee-state')) document.getElementById('consignee-state').value = 'Maharashtra';
    if(document.getElementById('consignee-code')) document.getElementById('consignee-code').value = '27';
    if(document.getElementById('consignee-contact')) document.getElementById('consignee-contact').value = '';

    // 3. Clear Ship To inputs
    if(document.getElementById('buyer-name')) document.getElementById('buyer-name').value = '';
    if(document.getElementById('buyer-address')) document.getElementById('buyer-address').value = '';
    if(document.getElementById('buyer-gst')) document.getElementById('buyer-gst').value = '';
    if(document.getElementById('buyer-state')) document.getElementById('buyer-state').value = 'Maharashtra';
    if(document.getElementById('buyer-code')) document.getElementById('buyer-code').value = '27';
    if(document.getElementById('buyer-contact')) document.getElementById('buyer-contact').value = '';
    if(document.getElementById('place-of-supply')) document.getElementById('place-of-supply').value = '';

    // 4. Clear invoice details & Set Defaults
    if(document.getElementById('invoice-no')) document.getElementById('invoice-no').value = '';
    if(document.getElementById('gst-percent-input')) document.getElementById('gst-percent-input').value = '18';

    // --- NEW: Set Present Date ---
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}-${month}-${year}`;
    
    if (document.getElementById('invoice-date')) {
        document.getElementById('invoice-date').value = dateStr;
    }

    // --- NEW: Auto Increment Invoice Number ---
    if (typeof generateNextInvoiceNumber === 'function') {
        await generateNextInvoiceNumber();
    }

    // 5. Clear bill view display
    if(document.getElementById('bill-invoice-no')) document.getElementById('bill-invoice-no').textContent = document.getElementById('invoice-no').value;
    if(document.getElementById('bill-date-gst')) document.getElementById('bill-date-gst').textContent = dateStr;
    if(document.getElementById('billToName')) document.getElementById('billToName').textContent = '';
    if(document.getElementById('billToAddr')) document.getElementById('billToAddr').textContent = '';
    if(document.getElementById('billToGstin')) document.getElementById('billToGstin').textContent = 'customer 15-digit GSTIN';
    if(document.getElementById('billToContact')) document.getElementById('billToContact').textContent = 'Not provided';
    if(document.getElementById('shipTo')) document.getElementById('shipTo').style.display = 'none';

    // 6. Save the cleared state
    if(typeof saveCustomerDialogState === 'function') saveCustomerDialogState();
    if(typeof saveToLocalStorage === 'function') saveToLocalStorage();

    if(typeof showNotification === 'function') showNotification('Customer details cleared & reset!', 'success');
}

async function clearAllData(silent = false) {
    // 1. Save current state to history BEFORE clearing (only if there's actual data)
    const hasItems = document.querySelectorAll('#createListManual tbody tr[data-id]').length > 0;
    const hasSections = document.querySelectorAll('#createListManual tbody tr.section-row').length > 0;
    const hasTaxSettings = typeof adjustmentChain !== 'undefined' && adjustmentChain.length > 0;

    if (hasItems || hasSections || hasTaxSettings) {
        if (typeof saveStateToHistory === 'function') saveStateToHistory();
        if (typeof saveToHistory === 'function') await saveToHistory();
    }

       window.currentCustomer = null;
    window.confirmedRegularCustomer = null; // safe even if unused

    // ---------------------------------------------------------
    // 2. CLEAR REGULAR BILL DETAILS MODAL INPUTS (Specific Fix)
    // ---------------------------------------------------------

    // A. Clear Simple View Inputs
    if (document.getElementById('reg-modal-simple-name')) document.getElementById('reg-modal-simple-name').value = '';
    if (document.getElementById('reg-modal-simple-phone')) document.getElementById('reg-modal-simple-phone').value = '';
    if (document.getElementById('reg-modal-simple-addr')) document.getElementById('reg-modal-simple-addr').value = '';

    // B. Clear Advanced Bill To Inputs
    if (document.getElementById('reg-modal-bill-name')) document.getElementById('reg-modal-bill-name').value = '';
    if (document.getElementById('reg-modal-bill-addr')) document.getElementById('reg-modal-bill-addr').value = '';
    if (document.getElementById('reg-modal-bill-gst')) document.getElementById('reg-modal-bill-gst').value = '';
    if (document.getElementById('reg-modal-bill-phone')) document.getElementById('reg-modal-bill-phone').value = '';
    // Reset State/Code to defaults
    if (document.getElementById('reg-modal-bill-state')) document.getElementById('reg-modal-bill-state').value = '';
    if (document.getElementById('reg-modal-bill-code')) document.getElementById('reg-modal-bill-code').value = '';

    // C. Clear Advanced Ship To Inputs
    if (document.getElementById('reg-modal-ship-name')) document.getElementById('reg-modal-ship-name').value = '';
    if (document.getElementById('reg-modal-ship-addr')) document.getElementById('reg-modal-ship-addr').value = '';
    if (document.getElementById('reg-modal-ship-gst')) document.getElementById('reg-modal-ship-gst').value = '';
    if (document.getElementById('reg-modal-ship-phone')) document.getElementById('reg-modal-ship-phone').value = '';
    // Reset State/Code/POS to defaults
    if (document.getElementById('reg-modal-ship-state')) document.getElementById('reg-modal-ship-state').value = '';
    if (document.getElementById('reg-modal-ship-code')) document.getElementById('reg-modal-ship-code').value = '';
    if (document.getElementById('reg-modal-ship-pos')) document.getElementById('reg-modal-ship-pos').value = '';

    // ---------------------------------------------------------
    // 3. UPDATE DATE & SMART INVOICE NUMBER
    // ---------------------------------------------------------
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    // Set Date in Modal
    if (document.getElementById('reg-modal-date')) document.getElementById('reg-modal-date').value = dateStr;

    // Generate Next Invoice Number based on Modal Settings
    try {
        const typeEl = document.getElementById('reg-modal-type-select');
        const prefixEl = document.getElementById('reg-modal-prefix');
        const invoiceEl = document.getElementById('reg-modal-invoice-no');

        if (typeEl && prefixEl && invoiceEl && typeof getNextInvoiceNumberAsync === 'function') {
            // This function respects the selected Type and Prefix
            const nextNo = await getNextInvoiceNumberAsync(typeEl.value, prefixEl.value);
            invoiceEl.value = nextNo;
        }
    } catch (e) {
        console.error("Error refreshing invoice number:", e);
        if (document.getElementById('reg-modal-invoice-no')) document.getElementById('reg-modal-invoice-no').value = '';
    }

    // 4. Clear All Tables (Standard)
    const createListTbody = document.querySelector("#createListManual tbody");
    const copyListTbody = document.querySelector("#copyListManual tbody");
    if (createListTbody) createListTbody.innerHTML = "";
    if (copyListTbody) copyListTbody.innerHTML = "";

    // Clear GST table if exists
    const gstListTbody = document.querySelector("#gstCopyListManual tbody");
    if (gstListTbody) gstListTbody.innerHTML = "";

    // 5. RESET ADJUSTMENTS & CALCULATIONS
    if (typeof adjustmentChain !== 'undefined') adjustmentChain = [];
    if (typeof discountPercent !== 'undefined') discountPercent = 0;
    if (typeof discountAmount !== 'undefined') discountAmount = 0;
    if (typeof gstPercent !== 'undefined') gstPercent = 0;

    if (typeof rowCounterManual !== 'undefined') rowCounterManual = 1;
    if (typeof currentlyEditingRowIdManual !== 'undefined') currentlyEditingRowIdManual = null;

    if (typeof currentDimensions !== 'undefined') {
        currentDimensions = { type: 'none', unit: 'ft', values: [0, 0, 0], calculatedArea: 0 };
    }

    // 6. Reset GST Customer Dialog State (Preserved Logic)
    try {
        if (typeof removeFromDB === 'function') await removeFromDB('gstMode', 'customerDialogState');

        const custTypeEl = document.getElementById('customer-type');
        if (custTypeEl) {
            custTypeEl.value = 'bill-to';
            if (typeof handleCustomerTypeChange === 'function') handleCustomerTypeChange();
        }

        const inputsToClear = [
            'consignee-name', 'consignee-address', 'consignee-gst', 'consignee-contact',
            'consignee-state', 'consignee-code',
            'buyer-name', 'buyer-address', 'buyer-gst', 'buyer-contact',
            'buyer-state', 'buyer-code', 'place-of-supply',
            'invoice-no'
        ];

        inputsToClear.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id.includes('state') && !id.includes('place')) el.value = 'Maharashtra';
                else if (id.includes('code')) el.value = '27';
                else el.value = '';
            }
        });

        if (document.getElementById('invoice-date')) document.getElementById('invoice-date').value = dateStr;

        // Clear Vendor Inputs (Silent Mode preservation)
        if (document.getElementById('vendorName')) document.getElementById('vendorName').value = '';
        if (document.getElementById('vendorInvoiceNo')) document.getElementById('vendorInvoiceNo').value = '';
        if (document.getElementById('vendorAddr')) document.getElementById('vendorAddr').value = '';
        if (document.getElementById('vendorPhone')) document.getElementById('vendorPhone').value = '';
        if (document.getElementById('vendorGSTIN')) document.getElementById('vendorGSTIN').value = '';
        if (document.getElementById('vendorEmail')) document.getElementById('vendorEmail').value = '';

        const vDateSil = document.getElementById('vendorDate');
        if (vDateSil) vDateSil.value = dateStr;

        if (document.getElementById('vendorFile')) document.getElementById('vendorFile').value = '';
        const vFileLabelSil = document.getElementById('vendorFileName');
        if (vFileLabelSil) vFileLabelSil.style.display = 'none';

        if (typeof currentVendorFile !== 'undefined') currentVendorFile = null;
        if (typeof saveVendorState === 'function') saveVendorState();

    } catch (error) {
        console.error('Error clearing customer dialog state:', error);
    }

    // 7. Reset GST Mode Display Elements
    if (typeof isGSTMode !== 'undefined' && isGSTMode) {
        if (typeof generateNextInvoiceNumber === 'function') await generateNextInvoiceNumber();
        if (document.getElementById('bill-invoice-no')) document.getElementById('bill-invoice-no').textContent = document.getElementById('invoice-no').value;
        if (document.getElementById('bill-date-gst')) document.getElementById('bill-date-gst').textContent = dateStr;

        // Reset placeholders
        if (document.getElementById('billToName')) document.getElementById('billToName').textContent = ' ';
        if (document.getElementById('billToAddr')) document.getElementById('billToAddr').textContent = ' ';
        // ... (standard resets)
        if (document.getElementById('shipTo')) document.getElementById('shipTo').style.display = 'none';
    }

    // 8. Update UI & Reset Modals
    if (typeof updateSerialNumbers === 'function') updateSerialNumbers();
    if (typeof updateTotal === 'function') updateTotal();
    if (typeof resetEditMode === 'function') resetEditMode();

    setTimeout(() => {
        const discountTypeSelect = document.getElementById('discount-type-select');
        const discountPercentInput = document.getElementById('discount-percent-input');
        const discountAmountInput = document.getElementById('discount-amount-input');

        if (discountTypeSelect) discountTypeSelect.value = 'none';
        if (discountPercentInput) discountPercentInput.value = '';
        if (discountAmountInput) discountAmountInput.value = '';

        const gstInput = document.getElementById('gst-input');
        const gstinInput = document.getElementById('gstin-input');

        if (gstInput) gstInput.value = '';
        if (gstinInput) gstinInput.value = '';

        if (typeof handleDiscountTypeChange === 'function') handleDiscountTypeChange();
    }, 100);

    // ---------------------------------------------------------
    // 9. SYNC TO VIEW (Apply Changes)
    // ---------------------------------------------------------
    // This pushes the cleared modal data (and new invoice #) to the main view
    if (typeof saveRegularBillDetails === 'function') {
        saveRegularBillDetails();
    }

    // 10. Persist
    if (typeof saveTaxSettings === 'function') await saveTaxSettings();
    if (typeof saveToLocalStorage === 'function') await saveToLocalStorage();
    if (typeof saveCustomerDialogState === 'function') await saveCustomerDialogState();
    if (typeof saveGSTCustomerDataToLocalStorage === 'function') await saveGSTCustomerDataToLocalStorage();

    if (!silent) {
        console.log('All data cleared.');
    }
}

function changeTheme(theme) {
    const root = document.documentElement;

    switch (theme) {
        case 'high-contrast':
            root.style.setProperty('--primary-color', '#000000');
            root.style.setProperty('--secondary-color', '#3b3b3bff');
            root.style.setProperty('--text-color', '#000000');
            root.style.setProperty('--bg-color', '#ffffff');
            root.style.setProperty('--border-color', '#d4d4d4ff');
            root.style.setProperty('--highlight-color', '#000000');
            root.style.setProperty('--total-bg', '#cfcfcfff');
            break;
        case 'blue':
            root.style.setProperty('--primary-color', '#3498db');
            root.style.setProperty('--secondary-color', '#2980b9');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#f9f9f9');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#f1c40f');
            root.style.setProperty('--total-bg', '#ecf0f1');
            break;
        case 'green':
            root.style.setProperty('--primary-color', '#2ecc71');
            root.style.setProperty('--secondary-color', '#27ae60');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#f9f9f9');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#f1c40f');
            root.style.setProperty('--total-bg', '#eafaf1');
            break;
        case 'red':
            root.style.setProperty('--primary-color', '#e74c3c');
            root.style.setProperty('--secondary-color', '#c0392b');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#f9f9f9');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#f1c40f');
            root.style.setProperty('--total-bg', '#fdedec');
            break;
        case 'purple':
            root.style.setProperty('--primary-color', '#9b59b6');
            root.style.setProperty('--secondary-color', '#8e44ad');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#f9f9f9');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#f1c40f');
            root.style.setProperty('--total-bg', '#f5eef8');
            break;
        case 'orange':
            root.style.setProperty('--primary-color', '#f26d38');
            root.style.setProperty('--secondary-color', '#e67e22');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#f9f9f9');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#f1c40f');
            root.style.setProperty('--total-bg', '#fef5e7');
            break;
        case 'dark':
            root.style.setProperty('--primary-color', '#34495e');
            root.style.setProperty('--secondary-color', '#2c3e50');
            root.style.setProperty('--text-color', '#000');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#34495e');
            root.style.setProperty('--highlight-color', '#f1c40f');
            root.style.setProperty('--total-bg', '#e1e1e1');
            break;
        case 'teal':
            root.style.setProperty('--primary-color', '#009688');
            root.style.setProperty('--secondary-color', '#00796b');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ff9800');
            root.style.setProperty('--total-bg', '#e0f2f1');
            break;
        case 'indigo':
            root.style.setProperty('--primary-color', '#3f51b5');
            root.style.setProperty('--secondary-color', '#303f9f');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ff4081');
            root.style.setProperty('--total-bg', '#e8eaf6');
            break;
        case 'brown':
            root.style.setProperty('--primary-color', '#795548');
            root.style.setProperty('--secondary-color', '#5d4037');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ff5722');
            root.style.setProperty('--total-bg', '#efebe9');
            break;
        case 'pink':
            root.style.setProperty('--primary-color', '#e91e63');
            root.style.setProperty('--secondary-color', '#c2185b');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#00bcd4');
            root.style.setProperty('--total-bg', '#fce4ec');
            break;
        case 'cyan':
            root.style.setProperty('--primary-color', '#00bcd4');
            root.style.setProperty('--secondary-color', '#0097a7');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ff5722');
            root.style.setProperty('--total-bg', '#e0f7fa');
            break;
        case 'lime':
            root.style.setProperty('--primary-color', '#cddc39');
            root.style.setProperty('--secondary-color', '#afb42b');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ff5722');
            root.style.setProperty('--total-bg', '#f9fbe7');
            break;
        case 'deep-purple':
            root.style.setProperty('--primary-color', '#673ab7');
            root.style.setProperty('--secondary-color', '#512da8');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ff9800');
            root.style.setProperty('--total-bg', '#ede7f6');
            break;
        case 'amber':
            root.style.setProperty('--primary-color', '#ffc107');
            root.style.setProperty('--secondary-color', '#ffa000');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#e91e63');
            root.style.setProperty('--total-bg', '#fff8e1');
            break;
        case 'deep-orange':
            root.style.setProperty('--primary-color', '#ff5722');
            root.style.setProperty('--secondary-color', '#e64a19');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#2196f3');
            root.style.setProperty('--total-bg', '#fbe9e7');
            break;
        case 'blue-grey':
            root.style.setProperty('--primary-color', '#607d8b');
            root.style.setProperty('--secondary-color', '#455a64');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ff9800');
            root.style.setProperty('--total-bg', '#eceff1');
            break;
        case 'navy':
            root.style.setProperty('--primary-color', '#001f3f');
            root.style.setProperty('--secondary-color', '#001a33');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#7fdbff');
            root.style.setProperty('--total-bg', '#e6f2ff');
            break;
        case 'charcoal':
            root.style.setProperty('--primary-color', '#36454f');
            root.style.setProperty('--secondary-color', '#2c3e50');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#e74c3c');
            root.style.setProperty('--total-bg', '#f8f9fa');
            break;
        case 'burgundy':
            root.style.setProperty('--primary-color', '#800020');
            root.style.setProperty('--secondary-color', '#660019');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#d4af37');
            root.style.setProperty('--total-bg', '#f9f0f2');
            break;
        case 'forest':
            root.style.setProperty('--primary-color', '#228b22');
            root.style.setProperty('--secondary-color', '#1c6b1c');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ffd700');
            root.style.setProperty('--total-bg', '#f0f8f0');
            break;
        case 'slate':
            root.style.setProperty('--primary-color', '#708090');
            root.style.setProperty('--secondary-color', '#5a6672');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ff6b6b');
            root.style.setProperty('--total-bg', '#f8f9fa');
            break;
        case 'lavender':
            root.style.setProperty('--primary-color', '#b57edc');
            root.style.setProperty('--secondary-color', '#9b59b6');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ffb6c1');
            root.style.setProperty('--total-bg', '#f8f4ff');
            break;
        case 'mint':
            root.style.setProperty('--primary-color', '#98fb98');
            root.style.setProperty('--secondary-color', '#77dd77');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ffb347');
            root.style.setProperty('--total-bg', '#f0fff0');
            break;
        case 'peach':
            root.style.setProperty('--primary-color', '#ffdab9');
            root.style.setProperty('--secondary-color', '#f4a688');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#87ceeb');
            root.style.setProperty('--total-bg', '#fff5ee');
            break;
        case 'sage':
            root.style.setProperty('--primary-color', '#b2ac88');
            root.style.setProperty('--secondary-color', '#9a9578');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#d4a574');
            root.style.setProperty('--total-bg', '#f8f8f0');
            break;
        case 'rose-gold':
            root.style.setProperty('--primary-color', '#e8b4b4');
            root.style.setProperty('--secondary-color', '#d4a5a5');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#c9b037');
            root.style.setProperty('--total-bg', '#fdf0f0');
            break;
        case 'nebula':
            root.style.setProperty('--primary-color', '#4a235a');
            root.style.setProperty('--secondary-color', '#2c125a');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#e74c3c');
            root.style.setProperty('--total-bg', '#f5eef8');
            break;
        case 'cosmic':
            root.style.setProperty('--primary-color', '#1a237e');
            root.style.setProperty('--secondary-color', '#0d1452');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ffab00');
            root.style.setProperty('--total-bg', '#e8eaf6');
            break;
        case 'galaxy':
            root.style.setProperty('--primary-color', '#311b92');
            root.style.setProperty('--secondary-color', '#1a1267');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#00e5ff');
            root.style.setProperty('--total-bg', '#ede7f6');
            break;
        case 'stellar':
            root.style.setProperty('--primary-color', '#01579b');
            root.style.setProperty('--secondary-color', '#002f6c');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ffd600');
            root.style.setProperty('--total-bg', '#e1f5fe');
            break;
        case 'asteroid':
            root.style.setProperty('--primary-color', '#37474f');
            root.style.setProperty('--secondary-color', '#263238');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#ff6e40');
            root.style.setProperty('--total-bg', '#eceff1');
            break;
        case 'rainbow':
            root.style.setProperty('--primary-color', '#ff0000');
            root.style.setProperty('--secondary-color', '#ff7f00');
            root.style.setProperty('--text-color', '#333');
            root.style.setProperty('--bg-color', '#fff');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--highlight-color', '#4b0082');
            root.style.setProperty('--total-bg', '#f0f8ff');
            break;
    }
    setInDB('theme', 'theme', theme);
}

async function cycleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    changeTheme(themes[currentThemeIndex]);
}

async function loadSavedTheme() {
    try {
        const savedTheme = await getFromDB('theme', 'theme');
        if (savedTheme !== null && themes.includes(savedTheme)) {
            currentThemeIndex = themes.indexOf(savedTheme);
            changeTheme(savedTheme);
        } else {
            changeTheme(themes[0]);
        }
    } catch (error) {
        console.error('Error loading theme:', error);
        changeTheme(themes[0]);
    }
}
// Dynamic Add Customer Handler
function handleAddCustomer() {
    if (currentCustomerMode === 'gst') {
        openAddGSTCustomerModal();
    } else {
        openAddCustomerModal();
    }
}

function toggleCustomerMode() {
    const toggle = document.getElementById('customer-mode-toggle');
    const addButton = document.getElementById('add-customer-main-btn');

    if (toggle.checked) {
        currentCustomerMode = 'gst';
        addButton.textContent = 'Add New GST Customer';
        // LOAD GST CUSTOMERS LIST
        loadGSTCustomersList();
    } else {
        currentCustomerMode = 'regular';
        addButton.textContent = 'Add New Customer';
        // LOAD REGULAR CUSTOMERS LIST
        loadCustomersList();
    }
}
// Toggle between Regular and GST Bills
function toggleBillsMode() {
    const isGST = document.getElementById('bills-mode-toggle').checked;
    currentBillsMode = isGST ? 'gst' : 'regular';
    
    const filterSelect = document.getElementById('saved-prefix-filter');
    const searchInput = document.getElementById('saved-bills-search');

    if (isGST) {
        // --- GST MODE UI ---
        // Hide Type Filter
        if (filterSelect) filterSelect.style.display = 'none';
        
        // Update Search Placeholder for GST
        if (searchInput) {
            searchInput.value = ''; // Clear previous search
            // Shows GSTIN, Amt, Date, Month, Year
            searchInput.placeholder = "Search GST... (/gstin/27.., /amt/500, /date/23, /month/12, /year/2025)";
        }
        
        // Load Data
        applySavedBillsFilter();

    } else {
        // --- REGULAR MODE UI ---
        // Show Type Filter
        if (filterSelect) filterSelect.style.display = 'inline-block';
        
        // Update Search Placeholder for Regular
        if (searchInput) {
            searchInput.value = '';
            // Shows Amt, Date, Month, Year
            searchInput.placeholder = "Search... (/amt/500, /date/23, /month/12, /year/2025)";
        }

        // Load Data
        loadSavedBillsList(); 
    }
}

//NO LOGNER USED updateColumnVisibility
// NEW FUNCTION: Update column visibility based on current view
function updateColumnVisibility() {
    if (currentView === 'bill') {
        if (isGSTMode) {
            // Hide remove button columns in GST bill view
            hideTableColumn(document.getElementById("gstCopyListManual"), 8, "none");
            hideTableColumn(document.getElementById("gstCopyListManual"), 7, "none");
        } else {
            // Hide remove button columns in regular bill view
            hideTableColumn(document.getElementById("copyListManual"), 7, "none");
            hideTableColumn(document.getElementById("copyListManual"), 6, "none");
        }
    } else {
        // Show columns in input view
        if (isGSTMode) {
            hideTableColumn(document.getElementById("gstCopyListManual"), 8, "table-cell");
            hideTableColumn(document.getElementById("gstCopyListManual"), 7, "table-cell");
        } else {
            hideTableColumn(document.getElementById("copyListManual"), 7, "table-cell");
            hideTableColumn(document.getElementById("copyListManual"), 6, "table-cell");
        }
    }
}

function toggleView() {
    const bill = document.getElementById("bill-container");
    const gstBill = document.getElementById("gst-bill-container");
    const manual = document.getElementById("manual-item-container");
    const viewText = document.getElementById('view-text');
    const viewIcon = document.getElementById('view-icon');
    const regFooterBtn = document.getElementById('reg-footer-btn'); // NEW

    currentView = currentView === 'input' ? 'bill' : 'input';

    if (currentView === 'bill') {
        manual.style.display = "none";
        viewText.textContent = "SHOW INPUT";
        viewIcon.textContent = "edit";

        if (isGSTMode) {
            bill.style.display = "none";
            gstBill.style.display = "block";
            updateGSTBillDisplay();
            hideTableColumn(document.getElementById("gstCopyListManual"), 8, "none");
            hideTableColumn(document.getElementById("gstCopyListManual"), 7, "none");

            if (regFooterBtn) regFooterBtn.style.display = 'none'; // Hide reg footer btn in GST
        } else {
            bill.style.display = "block";
            gstBill.style.display = "none";
            hideTableColumn(document.getElementById("copyListManual"), 7, "none");
            hideTableColumn(document.getElementById("copyListManual"), 6, "none");
            updateTotal();

            if (regFooterBtn) regFooterBtn.style.display = 'inline-block'; // Show reg footer btn
        }
    } else {
        bill.style.display = "none";
        gstBill.style.display = "none";
        manual.style.display = "block";
        viewText.textContent = "SHOW BILL";
        viewIcon.textContent = "description";

        if (regFooterBtn) regFooterBtn.style.display = 'none'; // Hide in input mode

        if (isGSTMode) {
            hideTableColumn(document.getElementById("gstCopyListManual"), 8, "table-cell");
            hideTableColumn(document.getElementById("gstCopyListManual"), 7, "table-cell");
        } else {
            hideTableColumn(document.getElementById("copyListManual"), 7, "table-cell");
            hideTableColumn(document.getElementById("copyListManual"), 6, "table-cell");
        }
    }
    // FIX: Recalculate column widths and total row colspan immediately
    applyColumnVisibility();
    // updateColumnVisibility();
}

// SIMPLE DRAG & DROP - Unified for all rows
let dragSrcEl = null;
let isDragging = false;

function handleDragStart(e) {
    dragSrcEl = this;
    isDragging = true;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';

    // Simple drag image
    const dragImage = this.cloneNode(true);
    dragImage.style.opacity = '0.7';
    dragImage.style.width = this.offsetWidth + 'px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
}

function handleDragOver(e) {
    e.preventDefault();
    if (!dragSrcEl || !isDragging) return;

    const tbody = this.closest('tbody');
    const afterElement = getDragAfterElement(tbody, e.clientY);

    // Remove highlight from all rows
    const allRows = tbody.querySelectorAll('tr');
    allRows.forEach(row => row.classList.remove('drag-over'));

    // Highlight the drop target
    if (afterElement && afterElement !== dragSrcEl) {
        afterElement.classList.add('drag-over');
    }

    return false;
}

function handleDragEnter(e) {
    e.preventDefault();
}

function handleDragLeave(e) {
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();

    if (!dragSrcEl || !isDragging) return;

    const sourceTbody = dragSrcEl.closest('tbody');
    const afterElement = getDragAfterElement(sourceTbody, e.clientY);

    if (dragSrcEl !== this && afterElement !== dragSrcEl) {
        if (afterElement) {
            sourceTbody.insertBefore(dragSrcEl, afterElement);
        } else {
            sourceTbody.appendChild(dragSrcEl);
        }

        // Sync across all tables
        syncAllTables();

        updateSerialNumbers();
        updateTotal();

        // FIX: Recalculate section totals immediately after drop
        // This ensures total rows appear/move correctly when sections/items are reordered
        updateSectionTotals();

        saveToLocalStorage();
        saveStateToHistory();

        if (isGSTMode) {
            updateGSTTaxCalculation();
        }
    }

    cleanupDrag();
    return false;
}

function handleDragEnd(e) {
    cleanupDrag();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('tr:not(.dragging)')];

    for (const element of draggableElements) {
        const box = element.getBoundingClientRect();
        const middle = box.top + box.height / 2;

        if (y < middle) {
            return element;
        }
    }

    return null;
}

function syncAllTables() {
    const sourceTable = document.getElementById('createListManual');
    if (!sourceTable) return;

    const sourceTbody = sourceTable.querySelector('tbody');
    const sourceRows = Array.from(sourceTbody.querySelectorAll('tr'));

    // Apply same order to other tables
    const tablesToSync = ['copyListManual', 'gstCopyListManual'];
    tablesToSync.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        // Get all rows from this table
        const currentRows = Array.from(tbody.querySelectorAll('tr'));

        // Create a map for quick lookup
        const rowMap = new Map();
        currentRows.forEach(row => {
            const id = row.getAttribute('data-id') || row.getAttribute('data-section-id');
            if (id) rowMap.set(id, row);
        });

        // Clear the table
        tbody.innerHTML = '';

        // Add rows in the same order as source table
        sourceRows.forEach(sourceRow => {
            const id = sourceRow.getAttribute('data-id') || sourceRow.getAttribute('data-section-id');
            const rowToAdd = rowMap.get(id);
            if (rowToAdd) {
                tbody.appendChild(rowToAdd);
            }
        });
    });
}

function addDragAndDropListeners(row) {
    row.setAttribute('draggable', 'true');
    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragenter', handleDragEnter);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('dragleave', handleDragLeave);
    row.addEventListener('drop', handleDrop);
    row.addEventListener('dragend', handleDragEnd);
}

function cleanupDrag() {
    if (dragSrcEl) {
        dragSrcEl.classList.remove('dragging');
    }

    // Remove all highlights
    const allTables = ['createListManual', 'copyListManual', 'gstCopyListManual'];
    allTables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table) {
            const tbody = table.querySelector('tbody');
            if (tbody) {
                const allRows = tbody.querySelectorAll('tr');
                allRows.forEach(row => row.classList.remove('drag-over', 'dragging'));
            }
        }
    });

    dragSrcEl = null;
    isDragging = false;
}

function initializeDragAndDrop() {
    const tables = ['createListManual', 'copyListManual', 'gstCopyListManual'];
    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table && table.querySelector('tbody')) {
            const rows = table.querySelector('tbody').querySelectorAll('tr');
            rows.forEach(row => {
                addDragAndDropListeners(row);
            });
        }
    });
}

async function downloadPDF() {
    // 1. Save data
    await saveToLocalStorage();

    // 2. Auto-Switch to Bill View if currently in Input View
    let wasInputView = false;
    if (currentView === 'input') {
        toggleView();
        wasInputView = true;
    }

    // 3. Select the correct container
    let element;
    const filename = `bill-${document.getElementById("billNo").value || 'document'}.pdf`;

    if (isGSTMode) {
        element = document.getElementById("gst-bill-container");
        if (currentView === 'input') {
            // This part handles GST table columns if needed, though toggleView usually handles it
            hideTableColumn(document.getElementById("gstCopyListManual"), 8, "none");
            hideTableColumn(document.getElementById("gstCopyListManual"), 7, "none");
        }
    } else {
        element = document.getElementById("bill-container");

        // UPDATED: Only show Footer if the user has toggled it ON
        const regFooter = document.getElementById('regular-bill-footer');
        if (regFooter) {
            if (isRegularFooterVisible) {
                regFooter.style.display = 'table';
                updateRegularFooterInfo(); // Ensure signatures are up to date
            } else {
                regFooter.style.display = 'none';
            }
        }
    }

    // 4. Configure Options
    const opt = {
        margin: [5, 5, 5, 5],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 5,
            dpi: 400,
            useCORS: true,
            logging: false,
            letterRendering: true,
            scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },

        // Keep rows intact
        pagebreak: {
            mode: ['css', 'legacy'],
            avoid: ['tr', '.section-row', '.section-total-row', '.bill-footer']
        }
    };

    // 5. Generate PDF
    element.classList.add('pdf-mode');

    html2pdf().set(opt).from(element).save().then(() => {
        // Cleanup CSS class
        element.classList.remove('pdf-mode');

        // Restore Regular Footer Visibility (matches UI state)
        if (!isGSTMode) {
            const regFooter = document.getElementById('regular-bill-footer');
            if (regFooter) {
                regFooter.style.display = isRegularFooterVisible ? 'table' : 'none';
            }
        }

        // 6. Switch back to Input View if we auto-switched
        if (wasInputView) {
            toggleView();
        }
    });
}

// Print functionality (keep this as is)
function handlePrint() {
    // Save current view state
    const previousView = currentView;

    // Switch to bill view based on current mode
    if (currentView !== 'bill') {
        toggleView(); // This will switch to bill view
    }

    // Wait for UI to update, then trigger print
    setTimeout(() => {
        window.print();

        // Optional: Return to previous view after print dialog closes
        setTimeout(() => {
            if (previousView !== 'bill') {
                toggleView(); // Return to previous view
            }
        }, 1000);
    }, 500);
}


// --- SHARE FUNCTIONALITY ---

function openShareModal() {
    // Close sidebar if open
    const sidebar = document.getElementById("settings-sidebar");
    if (sidebar) sidebar.classList.remove("open");

    document.getElementById('share-modal').style.display = 'block';
}

function closeShareModal() {
    document.getElementById('share-modal').style.display = 'none';
}

// 1. WhatsApp "Say Hi" Logic
function handleSayHi() {
    let phone = '';

    if (isGSTMode) {
        phone = document.getElementById('billToContact').textContent;

        if (!phone || phone.trim() === 'Not provided' || phone.trim() === '') {
            phone = document.getElementById('consignee-contact').value;
        }
    } else {
        phone = document.getElementById('custPhone').value;
    }

    // Clean: remove spaces, dashes, brackets
    phone = (phone || '').replace(/[\s\-()]/g, '');

    // If it starts with + -> keep as is
    if (phone.startsWith('+')) {
        // already correct international format
    }
    // If it starts with '00' -> convert to '+'
    else if (phone.startsWith('00')) {
        phone = '+' + phone.substring(2);
    }
    // If it starts with '91' AND length > 10 -> assume missing '+'
    else if (phone.startsWith('91') && phone.length > 10) {
        phone = '+' + phone;
    }
    // Else -> assume India default
    else {
        // Remove all non-digits again
        phone = phone.replace(/\D/g, '');
        // Must be at least 10 digits
        if (phone.length < 10) {
            showNotification("No valid phone number found!", "error");
            return;
        }
        phone = '+91' + phone;
    }

    // Validate length (minimum international length)
    const numeric = phone.replace(/\D/g, '');
    if (numeric.length < 10) {
        showNotification("No valid phone number found!", "error");
        return;
    }

    // Final WhatsApp Message
    const msg = encodeURIComponent("Hi");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
}


// 2. Native Share PDF Logic
async function handleSharePDF() {
    // Check if Web Share API is supported for files
    if (!navigator.share || !navigator.canShare) {
        showNotification("Sharing is not supported on this device/browser.", "error");
        return;
    }

    showNotification("Generating PDF...", "info");

    // --- Prepare Container (Similar to downloadPDF logic) ---
    // Auto-Switch to Bill View if needed
    let wasInputView = false;
    if (currentView === 'input') {
        toggleView();
        wasInputView = true;
    }

    let element;
    // Determine filename
    let billNoVal = isGSTMode ? document.getElementById("bill-invoice-no").textContent : document.getElementById("billNo").value;
    const filename = `bill-${billNoVal || 'document'}.pdf`;

    if (isGSTMode) {
        element = document.getElementById("gst-bill-container");
    } else {
        element = document.getElementById("bill-container");
        // Handle Footer Visibility
        const regFooter = document.getElementById('regular-bill-footer');
        if (regFooter) {
            regFooter.style.display = isRegularFooterVisible ? 'table' : 'none';
            if (isRegularFooterVisible) updateRegularFooterInfo();
        }
    }

    // --- Generate PDF Blob ---
    const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, dpi: 400, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.section-row', '.section-total-row', '.bill-footer'] }
    };

    try {
        element.classList.add('pdf-mode');

        // Generate Blob using html2pdf
        const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');

        element.classList.remove('pdf-mode');

        // Restore View if needed
        if (wasInputView) toggleView();

        // Create File object
        const file = new File([pdfBlob], filename, { type: "application/pdf" });

        // Invoke Native Share
        if (navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'Bill PDF',
                text: `Here is the bill: ${filename}`,
                files: [file]
            });
            closeShareModal();
        } else {
            showNotification("Your device does not support file sharing.", "error");
        }

    } catch (error) {
        console.error("Sharing failed:", error);
        element.classList.remove('pdf-mode');
        showNotification("Error generating or sharing PDF", "error");
    }
}

function hideTableColumn(table, colIndex, displayStyle) {
    if (!table) return;
    const rows = table.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        const cols = rows[i].cells;
        if (cols.length > colIndex) {
            cols[colIndex].style.display = displayStyle;
        }
    }
}

//  REMOVE : function toggleRateColumn()

// function toggleRateColumn() {
//     if (currentView === 'bill') {
//         showNotification('Switch to Input mode to toggle rate column', 'info');
//         return;
//     }

//     const tables = [
//         document.getElementById("createListManual"),
//         document.getElementById("copyListManual")
//     ];

//     rateColumnHidden = !rateColumnHidden;
//     const displayStyle = rateColumnHidden ? "none" : "table-cell";

//     tables.forEach(table => {
//         if (table) {
//             hideTableColumn(table, 4, displayStyle);
//         }
//     });

//     // Also update GST table if in GST mode (shouldn't happen, but just in case)
//     if (isGSTMode) {
//         const gstTable = document.getElementById("gstCopyListManual");
//         if (gstTable) {
//             hideTableColumn(gstTable, 5, "table-cell"); // Always show in GST mode
//         }
//     }

//     const buttonIcon = document.querySelector('#tools button:nth-child(6) .material-icons');
//     if (buttonIcon) {
//         buttonIcon.textContent = rateColumnHidden ? "visibility" : "visibility_off";
//     }
// }

function autoSave() {
    saveToLocalStorage();
    saveToHistory();
    saveStateToHistory();
}

window.onclick = function (event) {
    const discountModal = document.getElementById('discount-modal');
    const gstModal = document.getElementById('gst-modal');
    const manageItemsModal = document.getElementById('manage-items-modal');
    const addItemModal = document.getElementById('add-item-modal');
    const manageCustomersModal = document.getElementById('manage-customers-modal');
    const addCustomerModal = document.getElementById('add-customer-modal');
    const savedBillsModal = document.getElementById('saved-bills-modal');
    const restoredBillsModal = document.getElementById('restored-bills-modal'); // ADD THIS
    const historyModal = document.getElementById('history-modal');
    const clearHistoryModal = document.getElementById('clear-history-modal');
    const batchInvoiceModal = document.getElementById('batch-invoice-modal');
    const billHeadingModal = document.getElementById('bill-heading-modal');

    // ADD THIS LINE: Get section modal
    const sectionModal = document.getElementById('section-modal');

    if (event.target == discountModal) {
        closeDiscountModal();
    }
    if (event.target == batchInvoiceModal) {
        closeBatchInvoiceModal();
    }
    if (event.target == gstModal) {
        closeGSTModal();
    }
    if (event.target == manageItemsModal) {
        closeManageItemsModal();
    }
    if (event.target == addItemModal) {
        // closeAddItemModal();
    }
    if (event.target == manageCustomersModal) {
        closeManageCustomersModal();
    }
    if (event.target == addCustomerModal) {
        closeAddCustomerModal();
    }
    if (event.target == savedBillsModal) {
        closeSavedBillsModal();
    }
    if (event.target == historyModal) {
        closeHistoryModal();
    }
    if (event.target == clearHistoryModal) {
        closeClearHistoryModal();
    }

    // ADD THIS: Handle section modal click
    if (event.target == sectionModal) {
        closeSectionModal();
    }

    // ADD THIS: Handle restored bills modal click
    if (event.target == restoredBillsModal) {
        closeRestoredBillsModal();
    }
    const addStockModal = document.getElementById('add-stock-modal');
    if (event.target == addStockModal) {
        closeAddStockModal();
    }
    if (event.target == billHeadingModal) {
        closeBillHeadingModal();
    }
    const brandingModal = document.getElementById('branding-modal');
    if (event.target == brandingModal) {
        closeBrandingModal();
    }
}

// History Modal Functions
function openHistoryModal() {
    document.getElementById('history-modal').style.display = 'block';
    loadHistoryFromLocalStorage();
    toggleSettingsSidebar(); // Close settings sidebar if open
}

function closeHistoryModal() {
    document.getElementById('history-modal').style.display = 'none';
}

function openClearHistoryConfirmation() {
    document.getElementById('clear-history-modal').style.display = 'block';
}

function closeClearHistoryModal() {
    document.getElementById('clear-history-modal').style.display = 'none';
}

async function clearAllHistory() {
    try {
        const vars = getModeSpecificVars();
        const historyStorageKey = vars.historyStorageKey;

        await setInDB(historyStorageKey, 'history', []);
        await loadHistoryFromLocalStorage();
        closeClearHistoryModal();
        closeHistoryModal();
    } catch (error) {
        console.error('Error clearing history:', error);
    }
}

function searchHistory() {
    const searchTerm = document.getElementById('history-search').value.toLowerCase();
    const historyItems = document.querySelectorAll('.history-item');

    historyItems.forEach(item => {
        const title = item.querySelector('.history-item-title').textContent.toLowerCase();
        const date = item.querySelector('.history-item-date').textContent.toLowerCase();

        if (title.includes(searchTerm) || date.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Update the loadHistoryFromLocalStorage function to work with modal
async function loadHistoryFromLocalStorage() {
    try {
        const vars = getModeSpecificVars();
        const historyStorageKey = vars.historyStorageKey;

        const history = await getFromDB(historyStorageKey, 'history') || [];
        const historyList = document.getElementById("history-list");

        historyList.innerHTML = "";

        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-item" style="justify-content:center;color:#888;">No history available</div>';
            return;
        }

        history.forEach(item => {
            const historyItem = document.createElement("div");
            historyItem.className = "history-item";

            // Extract Data for UI
            const data = item.data;
            const state = data.modalState || {}; // Fallback for old bills

            // --- 1. GET NAME (Check all possible locations) ---
            let custName = 'Unnamed';
            if (state.billTo?.name) custName = state.billTo.name;
            else if (state.simple?.name) custName = state.simple.name;
            else if (data.customer?.name) custName = data.customer.name;

            // --- 2. FORMAT HEADER: Prefix/No : Name ---
            const prefix = state.prefix ? `${state.prefix}/` : ''; // Add slash
            const invoiceNo = state.invoiceNo || data.customer.billNo || '---';
            const headerText = `${prefix}${invoiceNo} : ${custName}`;

            // Other Vars
            const type = state.type || 'Regular Bill';
            const dateStr = state.date || data.customer.date || '---';
            const timestamp = data.timestamp || parseInt(item.id.replace('bill-', ''));
            const timeStr = timestamp
                ? new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : '';
            const totalVal = data.totalAmount || '0.00';

            // HTML Structure
            historyItem.innerHTML = `
                <div class="history-row-main">${headerText}</div>
                <div class="history-row-type">${type}</div>
                <div class="history-row-date">${dateStr} &nbsp;|&nbsp; ${timeStr}</div>
                <div class="history-row-total">Total: ₹${totalVal}</div>
                <button class="history-item-remove" onclick="removeHistoryItem('${item.id}', event)">×</button>
            `;

            historyItem.addEventListener('click', function (e) {
                if (!e.target.classList.contains('history-item-remove')) {
                    loadFromHistory(item);
                }
            });

            historyList.appendChild(historyItem);
        });
    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById("history-list").innerHTML = '<div class="history-item">Error loading history</div>';
    }
}

// Update the removeHistoryItem function
async function removeHistoryItem(id, event) {
    if (event) event.stopPropagation();

    try {
        const vars = getModeSpecificVars();
        const historyStorageKey = vars.historyStorageKey;

        let history = await getFromDB(historyStorageKey, 'history') || [];
        history = history.filter(item => item.id !== id);
        await setInDB(historyStorageKey, 'history', history);

        await loadHistoryFromLocalStorage();
    } catch (error) {
        console.error('Error removing history item:', error);
    }
}

function openGSTModeModal() {
    toggleSettingsSidebar();
    const modal = document.getElementById('gst-mode-modal');
    const enableGSTCheckbox = document.getElementById('enable-gst-mode');

    // Set checkbox to current GST mode state
    enableGSTCheckbox.checked = isGSTMode;

    // Update modal text based on current state
    const modalTitle = modal.querySelector('h3');
    const modalText = modal.querySelector('.modal-body p');

    if (isGSTMode) {
        modalTitle.textContent = 'Switch to Regular Mode';
        modalText.textContent = 'Switch to regular mode for simple billing without GST calculations?';
    } else {
        modalTitle.textContent = 'Switch to GST Mode';
        modalText.textContent = 'Switch to GST mode for GST-compliant invoicing with tax calculations?';
    }

    modal.style.display = 'block';
}

function closeGSTModeModal() {
    document.getElementById('gst-mode-modal').style.display = 'none';
}

async function toggleGSTMode() {
    const enableGST = document.getElementById('enable-gst-mode').checked;

    if (enableGST !== isGSTMode) {
        isGSTMode = enableGST;
        await setInDB('gstMode', 'isGSTMode', isGSTMode);

        // FIX: Reset all columns to visible when switching TO GST Mode
        if (isGSTMode) {
            const columnIds = ['colSrNo', 'colQty', 'colUnit', 'colRate', 'colAmt', 'colTotal'];
            columnIds.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) checkbox.checked = true;
            });
            // Apply these changes immediately
            applyColumnVisibility();
        }

        updateUIForGSTMode();
        closeGSTModeModal();

        // Force Recalculate Totals & Adjustments after Mode Switch
        setTimeout(() => {
            updateTotal();
            updateGSTINVisibility();
        }, 100);

        if (isGSTMode) {
            console.log('GST Mode Enabled. Please set up your company information and customer details.');
        } else {
            console.log('Switched to Regular Mode.');
        }
    }
}

function openTaxAdjustmentModal() {
    if (!isGSTMode) return;

    const modal = document.getElementById('tax-adjustment-modal');
    const customerGST = document.getElementById('current-customer-gst');
    const itemCount = document.getElementById('current-item-count');

    // Get current customer GST from customer details
    const currentCustomerGST = currentGSTPercent || 18;
    customerGST.textContent = currentCustomerGST;

    // Count current items
    const items = document.querySelectorAll('#createListManual tbody tr[data-id]');
    itemCount.textContent = items.length;

    // Set current adjust tax value
    document.getElementById('adjust-tax-percent').value = currentAdjustTaxPercent;

    modal.style.display = 'block';
}

function closeTaxAdjustmentModal() {
    document.getElementById('tax-adjustment-modal').style.display = 'none';
}

function applyTaxAdjustment() {
    if (!isGSTMode) return;

    const adjustTaxInput = document.getElementById('adjust-tax-percent');
    const adjustTaxPercent = parseFloat(adjustTaxInput.value) || 0;

    if (adjustTaxPercent < 0 || adjustTaxPercent > 100) {
        showNotification('Please enter a valid tax percentage between 0 and 100');
        return;
    }

    const customerGSTPercent = currentGSTPercent || 18;

    if (customerGSTPercent === 0) {
        showNotification('Customer GST percentage is 0%. Please set customer GST first.');
        return;
    }

    // Apply tax adjustment to all items
    applyTaxAdjustmentToItems(adjustTaxPercent, customerGSTPercent);

    currentAdjustTaxPercent = adjustTaxPercent;
    closeTaxAdjustmentModal();
}

function applyTaxAdjustmentToItems(adjustTaxPercent, customerGSTPercent) {
    const items = document.querySelectorAll('#createListManual tbody tr[data-id]');

    if (items.length === 0) {
        showNotification('No items found to adjust');
        return;
    }

    // Handle 0% adjustment - reset to original rates (no adjustment)
    if (adjustTaxPercent === 0) {
        // Reset all rates to their original values in ALL tables
        const allTables = ['createListManual', 'copyListManual', 'gstCopyListManual'];

        allTables.forEach(tableId => {
            const tableItems = document.querySelectorAll(`#${tableId} tbody tr[data-id]`);
            tableItems.forEach(row => {
                const cells = row.children;
                if (cells.length < 6) return;

                const rateCell = cells[4];
                const amountCell = cells[5];

                // Get the original rate from data attribute or recalculate
                const originalRate = parseFloat(row.getAttribute('data-original-rate')) || parseFloat(rateCell.textContent);
                const quantity = parseFloat(row.getAttribute('data-original-quantity') || cells[2].textContent);

                if (!isNaN(originalRate) && originalRate > 0) {
                    // Reset to original rate
                    rateCell.textContent = originalRate.toFixed(2);

                    // Recalculate amount based on dimension type
                    const dimensionType = row.getAttribute('data-dimension-type') || 'none';
                    let finalQuantity = quantity;

                    if (dimensionType !== 'none' && dimensionType !== 'dozen') {
                        const dimensionValues = JSON.parse(row.getAttribute('data-dimension-values') || '[0,0,0]');
                        const calculatedArea = calculateAreaFromDimensions(dimensionType, dimensionValues);
                        finalQuantity = quantity * calculatedArea;
                    } else if (dimensionType === 'dozen') {
                        finalQuantity = quantity / 12;
                    }

                    const newAmount = finalQuantity * originalRate;
                    amountCell.textContent = newAmount.toFixed(2);

                    // Update data attributes
                    row.setAttribute('data-rate', originalRate.toFixed(8));
                    row.setAttribute('data-amount', newAmount.toFixed(8));
                }
            });
        });
    } else {
        // Calculate adjustment factor for non-zero adjustment
        const adjustmentFactor = (1 + adjustTaxPercent / 100) / (1 + customerGSTPercent / 100);

        // Apply adjustment to ALL tables
        const allTables = ['createListManual', 'copyListManual', 'gstCopyListManual'];

        allTables.forEach(tableId => {
            const tableItems = document.querySelectorAll(`#${tableId} tbody tr[data-id]`);
            tableItems.forEach(row => {
                const cells = row.children;
                if (cells.length < 6) return;

                const rateCell = cells[4];
                const amountCell = cells[5];

                // Get current rate and quantity
                const currentRate = parseFloat(rateCell.textContent);
                const quantity = parseFloat(row.getAttribute('data-original-quantity') || cells[2].textContent);

                if (!isNaN(currentRate) && currentRate > 0) {
                    // Store original rate before adjustment (for reset functionality)
                    if (!row.getAttribute('data-original-rate')) {
                        row.setAttribute('data-original-rate', currentRate.toFixed(8));
                    }

                    // Calculate adjusted rate
                    const adjustedRate = currentRate * adjustmentFactor;

                    // Update rate
                    rateCell.textContent = adjustedRate.toFixed(2);

                    // Recalculate amount based on dimension type
                    const dimensionType = row.getAttribute('data-dimension-type') || 'none';
                    let finalQuantity = quantity;

                    if (dimensionType !== 'none' && dimensionType !== 'dozen') {
                        const dimensionValues = JSON.parse(row.getAttribute('data-dimension-values') || '[0,0,0]');
                        const calculatedArea = calculateAreaFromDimensions(dimensionType, dimensionValues);
                        finalQuantity = quantity * calculatedArea;
                    } else if (dimensionType === 'dozen') {
                        finalQuantity = quantity / 12;
                    }

                    const newAmount = finalQuantity * adjustedRate;
                    amountCell.textContent = newAmount.toFixed(2);

                    // Update data attributes
                    row.setAttribute('data-rate', adjustedRate.toFixed(8));
                    row.setAttribute('data-amount', newAmount.toFixed(8));
                }
            });
        });
    }

    // Update serial numbers and totals
    updateSerialNumbers();

    // Update calculations without triggering UI errors
    if (isGSTMode) {
        const gstBillContainer = document.getElementById('gst-bill-container');
        if (gstBillContainer && gstBillContainer.style.display !== 'none') {
            updateGSTTaxCalculation();
        }
    } else {
        const billContainer = document.getElementById('bill-container');
        if (billContainer && billContainer.style.display !== 'none') {
            updateTotal();
        }
    }

    // Always update the input table total (it's always visible)
    const totalAmountId = getModeSpecificVars().totalAmountId;
    const total = Array.from(document.querySelectorAll('#createListManual tbody tr[data-id]'))
        .reduce((sum, row) => {
            const amountCell = row.querySelector('.amount');
            if (amountCell) {
                const amountValue = parseFloat(amountCell.textContent) || 0;
                return sum + amountValue;
            }
            return sum;
        }, 0);
    document.getElementById(totalAmountId).textContent = total.toFixed(2);

    saveToLocalStorage();
    saveStateToHistory();

    if (adjustTaxPercent === 0) {
        showNotification('Tax adjustment removed! Rates reset to original values.');
    } else {
        showNotification(`Tax rates adjusted successfully! Effective tax: ${adjustTaxPercent}%, Displayed GST: ${customerGSTPercent}%`);
    }
}

function toggleGSTInclusive() {
    if (!isGSTMode) return;

    isGSTInclusive = !isGSTInclusive;
    const button = document.getElementById('gstInclusiveBtn');
    if (button) {
        button.textContent = isGSTInclusive ? 'Inclusive' : 'Exclusive';
        button.style.backgroundColor = isGSTInclusive ? '#27ae60' : '';
    }
}


function updateUIForGSTMode() {
    document.body.classList.toggle('gst-mode', isGSTMode);

    const gstInclusiveBtn = document.getElementById('gstInclusiveBtn');
    if (gstInclusiveBtn) {
        gstInclusiveBtn.style.display = isGSTMode ? 'inline-block' : 'none';
    }

    const gstModeBtn = document.querySelector('.gst-mode-btn');
    const companyInfoBtn = document.querySelector('.company-info-btn');
    const customerDetailsBtn = document.querySelector('.customer-details-btn');
    const gstCustomersBtn = document.querySelector('.gst-customers-btn');
    const gstBillsBtn = document.querySelector('.gst-bills-btn');
    const taxAdjustmentBtn = document.querySelector('.tax-adjustment-btn');

    // NEW: Handle "Regular Bill Details" Sidebar Button Visibility
    // ------------------------------------------------------------
    const btnRegularDetails = document.getElementById('btn-regular-details');
    if (btnRegularDetails) {
        btnRegularDetails.style.display = isGSTMode ? 'none' : 'flex';
    }
    // ------------------------------------------------------------

    // Toggle Footer Button logic
    const regFooterBtn = document.getElementById('reg-footer-btn');

    if (gstModeBtn) {
        gstModeBtn.style.display = 'flex';
        const icon = gstModeBtn.querySelector('.material-icons');
        const text = gstModeBtn.querySelector('span:not(.material-icons)') || document.createElement('span');
        if (isGSTMode) {
            icon.textContent = 'receipt';
            text.textContent = 'REGULAR MODE';
        } else {
            icon.textContent = 'receipt_long';
            text.textContent = 'GST MODE';
        }
        if (!gstModeBtn.contains(text)) gstModeBtn.appendChild(text);
    }

    // UPDATED: Company Info is now ALWAYS visible
    if (companyInfoBtn) companyInfoBtn.style.display = 'flex';

    // GST-only buttons
    if (customerDetailsBtn) customerDetailsBtn.style.display = isGSTMode ? 'flex' : 'none';
    if (gstCustomersBtn) gstCustomersBtn.style.display = isGSTMode ? 'flex' : 'none';
    if (gstBillsBtn) gstBillsBtn.style.display = isGSTMode ? 'flex' : 'none';
    if (taxAdjustmentBtn) taxAdjustmentBtn.style.display = isGSTMode ? 'flex' : 'none';

    const gstToolBtn = document.getElementById('gst-tool-btn');
    if (gstToolBtn) gstToolBtn.style.display = isGSTMode ? 'none' : 'inline-block';

    // Handle Regular Footer Button Visibility
    if (regFooterBtn) {
        // Only show in Regular Mode AND Bill View
        regFooterBtn.style.display = (!isGSTMode && currentView === 'bill') ? 'inline-block' : 'none';
    }

    const rateToggleBtn = document.getElementById('rate-toggle-btn');

    if (rateToggleBtn) {
        rateToggleBtn.style.display = isGSTMode ? 'none' : 'inline-block';
        if (isGSTMode) {
            hideTableColumn(document.getElementById("createListManual"), 4, "table-cell");
            hideTableColumn(document.getElementById("copyListManual"), 4, "table-cell");
            hideTableColumn(document.getElementById("gstCopyListManual"), 5, "table-cell");
            rateColumnHidden = false;
        } else {
            const displayStyle = rateColumnHidden ? "none" : "table-cell";
            hideTableColumn(document.getElementById("createListManual"), 4, displayStyle);
            hideTableColumn(document.getElementById("copyListManual"), 4, displayStyle);
        }
    }

    const billContainer = document.getElementById('bill-container');
    const gstBillContainer = document.getElementById('gst-bill-container');
    const manualContainer = document.getElementById('manual-item-container');

    if (currentView === 'bill') {
        if (isGSTMode) {
            billContainer.style.display = 'none';
            gstBillContainer.style.display = 'block';
            manualContainer.style.display = 'none';
            updateGSTBillDisplay();
        } else {
            billContainer.style.display = 'block';
            gstBillContainer.style.display = 'none';
            manualContainer.style.display = 'none';
            // Trigger footer update
            updateRegularFooterInfo();
        }
    } else {
        billContainer.style.display = 'none';
        gstBillContainer.style.display = 'none';
        manualContainer.style.display = 'block';
    }

    const hsnInputContainer = document.getElementById('hsn-input-container');
    if (hsnInputContainer) hsnInputContainer.style.display = isGSTMode ? 'flex' : 'none';

    const addTermsBtn = document.getElementById('addTermsListSectionBtn');
    if (addTermsBtn) addTermsBtn.style.display = isGSTMode ? 'none' : 'flex';
}

