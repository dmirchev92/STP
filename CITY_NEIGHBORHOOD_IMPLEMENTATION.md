# City and Neighborhood Implementation Summary

## Overview
Added City and Neighborhood selection to case creation flow, reusing the same lists from homepage filters.

---

## Database Changes Required

### Tables Updated
Two case-related tables need `city` and `neighborhood` columns:

1. **`marketplace_service_cases`** - Direct case creation (used by UnifiedCaseModal)
2. **`service_cases`** - Template-based cases (used by chat templates)

### Migration Script
**Location:** `backend/migrations/add-city-neighborhood-to-cases.js`

**Run migration:**
```bash
cd backend/migrations
node add-city-neighborhood-to-cases.js
```

**What it does:**
- Checks both tables for existing `city` and `neighborhood` columns
- Adds missing columns as `TEXT` type (nullable)
- Verifies successful addition
- Safe to run multiple times (checks before adding)

---

## Frontend Changes

### File: `Marketplace/src/components/UnifiedCaseModal.tsx`

**Changes made:**
1. Imported Sofia neighborhoods list: `import { sofiaNeighborhoods } from './NeighborhoodSelect'`
2. Added `city` and `neighborhood` to form state initialization
3. Added City dropdown with options: София, Пловдив, Варна, Бургас
4. Added Neighborhood dropdown (shown only when City = София)
5. Reset neighborhood when city changes
6. Added validation:
   - City is required for all cases
   - Neighborhood is required only when City = София

**Form order (direct mode):**
1. Modal header
2. Тип заявка (Assignment Type)
3. Тип услуга (Service Type)
4. **Град (City)** ← NEW
5. **Квартал (Neighborhood)** ← NEW (conditional)
6. Description
7. Date and Time
8. Priority
9. Address
10. Phone
11. Screenshots
12. Additional Details

---

## Backend Changes

### File: `backend/src/controllers/caseController.ts`

**Changes made:**
1. Added `city` and `neighborhood` to request body destructuring
2. Updated INSERT statement to include both fields in column list
3. Added values to INSERT parameters array

**Before:**
```sql
INSERT INTO marketplace_service_cases (
  id, service_type, description, preferred_date, preferred_time,
  priority, address, phone, ...
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ...)
```

**After:**
```sql
INSERT INTO marketplace_service_cases (
  id, service_type, description, preferred_date, preferred_time,
  priority, city, neighborhood, address, phone, ...
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ...)
```

### File: `backend/src/models/SQLiteDatabase.ts`

**Changes made:**
Updated CREATE TABLE statements for both tables to include:
```sql
city TEXT,
neighborhood TEXT,
```

This ensures new database installations have the columns from the start.

---

## Data Source

### Cities (4 options)
- София
- Пловдив
- Варна
- Бургас

### Sofia Neighborhoods (148 options)
Sourced from: `Marketplace/src/components/NeighborhoodSelect.tsx`
- Exported as `sofiaNeighborhoods` array
- Same list used on homepage filters in `SearchSection.tsx`

---

## Validation Rules

### City
- **Required:** Yes (for all cases)
- **Type:** Dropdown select
- **Options:** 4 Bulgarian cities

### Neighborhood
- **Required:** Only when City = "София"
- **Type:** Dropdown select
- **Options:** 148 Sofia neighborhoods
- **Visibility:** Hidden when City ≠ София
- **Behavior:** Resets to empty when City changes

---

## Testing Checklist

### Database Migration
- [ ] Run migration script: `node backend/migrations/add-city-neighborhood-to-cases.js`
- [ ] Verify columns added to `marketplace_service_cases` table
- [ ] Verify columns added to `service_cases` table
- [ ] Check migration output for errors

### Frontend Testing
- [ ] Open chat → Click "Създай заявка за услуга"
- [ ] Select City = "София" → Verify Neighborhood dropdown appears
- [ ] Select City = "Пловдив" → Verify Neighborhood dropdown hides
- [ ] Try to submit without City → Verify validation error
- [ ] Try to submit with София but no Neighborhood → Verify validation error
- [ ] Successfully submit case with City and Neighborhood
- [ ] Verify submitted data includes city and neighborhood fields

### Backend Testing
- [ ] Check backend logs for successful case creation
- [ ] Query database to verify city/neighborhood values are stored
- [ ] Test with different cities (София, Пловдив, Варна, Бургас)
- [ ] Test with Sofia neighborhoods
- [ ] Verify existing cases without city/neighborhood still work

### Integration Testing
- [ ] Create case from chat (direct assignment)
- [ ] Create case from chat (open assignment)
- [ ] Verify cases appear in dashboard with location info
- [ ] Test case filtering by city/neighborhood (if implemented)

---

## Database Schema Reference

### marketplace_service_cases
```sql
CREATE TABLE marketplace_service_cases (
  id TEXT PRIMARY KEY,
  service_type TEXT NOT NULL,
  description TEXT NOT NULL,
  preferred_date TEXT,
  preferred_time TEXT DEFAULT 'morning',
  priority TEXT DEFAULT 'normal',
  city TEXT,                    -- NEW
  neighborhood TEXT,            -- NEW
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  additional_details TEXT,
  provider_id TEXT,
  provider_name TEXT,
  is_open_case INTEGER DEFAULT 0,
  assignment_type TEXT DEFAULT 'open',
  status TEXT DEFAULT 'pending',
  decline_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES users(id)
);
```

### service_cases
```sql
CREATE TABLE service_cases (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  provider_id TEXT,
  case_data TEXT NOT NULL,
  status TEXT DEFAULT 'template_sent',
  priority TEXT DEFAULT 'normal',
  city TEXT,                    -- NEW
  neighborhood TEXT,            -- NEW
  estimated_cost DECIMAL(10,2),
  estimated_duration INTEGER,
  scheduled_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  assigned_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (conversation_id) REFERENCES marketplace_conversations(id),
  FOREIGN KEY (template_id) REFERENCES case_templates(id),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (provider_id) REFERENCES users(id)
);
```

---

## Files Modified

### Frontend
- ✅ `Marketplace/src/components/UnifiedCaseModal.tsx`

### Backend
- ✅ `backend/src/controllers/caseController.ts`
- ✅ `backend/src/models/SQLiteDatabase.ts`
- ✅ `backend/migrations/add-city-neighborhood-to-cases.js` (NEW)

### Documentation
- ✅ `CITY_NEIGHBORHOOD_IMPLEMENTATION.md` (THIS FILE)

---

## Next Steps

1. **Run the migration:**
   ```bash
   cd d:\newtry1\ServiceTextPro\backend\migrations
   node add-city-neighborhood-to-cases.js
   ```

2. **Rebuild backend (if using TypeScript):**
   ```bash
   cd d:\newtry1\ServiceTextPro\backend
   npm run build
   ```

3. **Restart backend server:**
   ```bash
   npm run dev
   # or
   npm start
   ```

4. **Test the frontend:**
   - Navigate to http://192.168.0.129:3002/
   - Open a chat with a service provider
   - Click "Създай заявка за услуга"
   - Fill out the form including City and Neighborhood
   - Submit and verify case is created successfully

5. **Verify database:**
   ```bash
   cd d:\newtry1\ServiceTextPro\backend\data
   sqlite3 servicetext_pro.db
   .schema marketplace_service_cases
   SELECT city, neighborhood FROM marketplace_service_cases LIMIT 5;
   ```

---

## Rollback Plan

If issues occur, you can remove the columns (though this will lose data):

```sql
-- SQLite doesn't support DROP COLUMN directly
-- You would need to recreate the table without these columns
-- Better to keep the columns and fix any bugs instead
```

---

## Future Enhancements

- [ ] Add city/neighborhood filtering in dashboard
- [ ] Add city/neighborhood search in case list
- [ ] Show location info in case cards
- [ ] Add neighborhood autocomplete/search
- [ ] Support neighborhoods for other cities (Plovdiv, Varna, Burgas)
- [ ] Add map integration for location selection
- [ ] Validate neighborhood belongs to selected city

---

## Notes

- **Backward Compatibility:** Existing cases without city/neighborhood will have NULL values (safe)
- **Data Source:** Reuses exact same lists from homepage filters (consistent UX)
- **Validation:** City always required, Neighborhood required only for Sofia
- **Database:** Columns are nullable (TEXT) to support existing data
- **Migration:** Safe to run multiple times (checks before adding columns)
