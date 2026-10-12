# Indexer Page Gap Analysis

## Comparison: Current Implementation vs. Architecture/Implementation Plans

### ✅ Currently Implemented

1. **Page Structure**
   - ✅ Unified "Indexer" page (combines indexer monitoring and ledger explorer)
   - ✅ KPI strip at top showing indexer status metrics
   - ✅ Indexer Health section
   - ✅ Indexer Configuration section (read-only display)
   - ✅ Tabbed interface: "Ledger Events" and "Recent Jobs"

2. **Indexer Status & Health**
   - ✅ Indexer status (healthy/degraded)
   - ✅ Current round, indexed round, lag blocks
   - ✅ Total events count
   - ✅ Recent errors count
   - ✅ Configuration display (poll interval, batch size, max lag, enabled/running status)

3. **Ledger Events Table**
   - ✅ Transaction ID (with copy button, truncated)
   - ✅ Timestamp (with UTC timezone)
   - ✅ Event Type (with badge styling)
   - ✅ User ID (shows public key + public ID)
   - ✅ Organization ID
   - ✅ Contract App ID (with copy button, shows app ID + public ID)
   - ✅ Document App ID (with copy button, shows app ID + public ID)
   - ✅ Block number
   - ✅ Event type filter (dropdown)
   - ✅ Pagination
   - ✅ Event detail drawer

4. **Recent Jobs Table**
   - ✅ Job ID, Type, Status, Events Indexed, Duration, Started timestamp

---

## ❌ Missing Elements (Per Documentation)

### 1. Ledger Events Table - Missing Columns

**From `escra-frontend-enhancement-plan.md` Section 5:**
- ❌ **Key column** - Should show the key associated with the event
- ❌ **Status column** - Should show event status (not just type)

**Current columns:** Transaction ID, Timestamp, Event Type, User ID, Organization ID, Contract App ID, Document App ID, Block

**Expected columns per docs:** Timestamp, Tenant, User, **Key**, Contract, Document, Type, **Status**

### 2. Filters - Missing Functionality

**From `escra-frontend-enhancement-plan.md` Section 5:**
- ❌ **Multi-select Type filter** - Currently only single-select dropdown
- ❌ **Tenant filter** - Not implemented (tenantFilter state exists but no UI)
- ❌ **User filter** - Missing
- ❌ **Key filter** - Missing
- ❌ **Contract/Document filter** - Missing
- ❌ **Date range filter (calendar)** - Missing

**Current filters:** Event Type (single-select dropdown)

### 3. KPIs - Missing Metrics

**From `escra-frontend-enhancement-plan.md` Section 5:**
- ✅ Total events (implemented)
- ❌ **Total contracts** - Missing
- ❌ **Total documents** - Missing
- ❌ **Total signatures** - Missing
- ✅ Recent errors (implemented as part of health section)

**Current KPIs:** Indexer Status, Current Round, Indexed Round, Total Events

### 4. Indexer Configuration - Missing Controls

**From `escra-frontend-implementation-plan.md` Section 5.3:**
- ✅ Configuration display (read-only) - Implemented
- ❌ **Editable configuration inputs** - Should allow editing:
  - Algorand network selection
  - Endpoints input
  - Credentials (masked placeholders)
  - Polling interval (editable)
  - Backfill ranges input
- ❌ **Save/Update configuration button** - Missing

### 5. Indexer Job Management - Missing Controls

**From `escra-frontend-implementation-plan.md` Section 5.3:**
- ✅ Job list table - Implemented
- ✅ Job status display - Implemented
- ✅ Last processed round - Implemented (via status)
- ✅ Lag metrics - Implemented
- ❌ **Action buttons** - Missing:
  - Start/Stop button
  - Pause/Resume button
  - Backfill button
  - (Can be disabled/mocked initially)

### 6. Ledger Views - Missing Views

**From `escra-frontend-implementation-plan.md` Section 5.3:**
- ✅ Event-level view - Implemented (Ledger Events table)
- ❌ **Contract-level view** - Missing (should show all events for a specific contract)
- ❌ **Tenant-level view** - Missing (should show all events for a specific tenant)
- ❌ **Reconciliation dashboard** - Missing:
  - Should show mismatches between on-chain and off-chain data
  - Health indicators for reconciliation status

### 7. Event Detail Drawer - Missing Information

**Current implementation:** Basic event details shown

**Expected per docs:**
- ✅ Basic metadata - Implemented
- ❌ **Full transaction metadata** - May need expansion
- ❌ **Related entities links** - Should link to contract, document, user detail pages
- ❌ **On-chain vs off-chain reconciliation status** - Missing

### 8. Additional Missing Features

**From `escra-frontend-enhancement-plan.md` Section 5:**
- ❌ **Model UI after lora.algokit.io explorer** - Should have similar visual style/patterns
- ❌ **Export functionality** - Missing (should allow exporting ledger events)

---

## Summary of Missing Items

### High Priority (Core Functionality)
1. **Key column** in Ledger Events table
2. **Status column** in Ledger Events table
3. **Enhanced filters**: Tenant, User, Key, Contract/Document, Date range
4. **Additional KPIs**: Total contracts, documents, signatures
5. **Job management controls**: Start/Stop/Pause/Resume/Backfill buttons

### Medium Priority (Enhanced Views)
6. **Contract-level ledger view**
7. **Tenant-level ledger view**
8. **Reconciliation dashboard**
9. **Editable indexer configuration**

### Low Priority (Polish & UX)
10. **Multi-select type filter**
11. **Export functionality**
12. **Related entity links in detail drawer**
13. **Visual styling alignment with lora.algokit.io**

---

## Recommendations

1. **Immediate additions:**
   - Add Key and Status columns to Ledger Events table
   - Implement missing filters (Tenant, User, Key, Contract/Document, Date range)
   - Add missing KPIs (contracts, documents, signatures)
   - Add job management action buttons (can be mocked/disabled initially)

2. **Next phase:**
   - Add contract-level and tenant-level views
   - Implement reconciliation dashboard
   - Make indexer configuration editable

3. **Future enhancements:**
   - Multi-select filters
   - Export functionality
   - Enhanced detail drawer with related entity links
