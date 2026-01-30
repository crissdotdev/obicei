# obicei — PWA Development Plan

> **Purpose:** This document is a complete specification for replicating the native iOS SwiftUI habit-tracking app "obicei" as a Progressive Web App. It contains every data model, every component, every color value, every animation parameter, and every business logic rule extracted directly from the source code. Follow it exactly.

---

## 1. App Overview

**Name:** obicei (Romanian for "habit")
**Type:** Habit tracker with two habit modes — binary (yes/no) and numeric (value input)
**Architecture:** MVVM — Models, ViewModels, Views, Services, Theme
**Persistence:** IndexedDB (replaces SwiftData)
**Notifications:** Web Push API + Notification API (replaces UserNotifications)
**Stack:** React 18+ with TypeScript, Tailwind CSS (utility), and a charting library (Recharts or Chart.js)

---

## 2. Design System / Theme

### 2.1 Color Palette

| Token | Value | Usage |
|---|---|---|
| `--accent` | `rgb(208, 2, 27)` / `#D0021B` | Primary accent — date selected bg, contribution grid completed cells, chart average line, today border on grid |
| `--accent-75` | `rgba(208, 2, 27, 0.75)` | Contribution grid completed cells |
| `--primary` | System text color — use `rgb(0, 0, 0)` in light mode, `rgb(255, 255, 255)` in dark mode | Habit names, chart line/points, binary toggle filled state |
| `--primary-06` | `rgba(current-text, 0.06)` | Date strip unselected background |
| `--primary-08` | `rgba(current-text, 0.08)` | Contribution grid uncompleted cells |
| `--primary-15` | `rgba(current-text, 0.15)` | Stat card dotted border |
| `--primary-30` | `rgba(current-text, 0.3)` | Binary toggle border, numeric display border |
| `--secondary` | System secondary label — use `rgb(142, 142, 147)` | Unit labels, stat card titles, month labels, "LAST N DAYS" text, empty state text |
| `--background` | System background — `#FFFFFF` light / `#000000` dark | Checkmark icon color (inverts against filled toggle) |
| `--white` | `#FFFFFF` | Date strip selected day text |

### 2.2 Typography

| Token | CSS Equivalent | Usage |
|---|---|---|
| `ndotExtraLargeTitle` | `font-family: 'Ndot57Regular'; font-size: 50px;` | Main screen day name title (right-aligned) |
| `ndotLargeTitle` | `font-family: 'Ndot57Regular'; font-size: 34px;` | Navigation bar large title (not used directly in views, set via UINavigationBar appearance) |
| `ndotTitle` | `font-family: 'Ndot57Regular'; font-size: 28px;` | Stat card values, navigation bar inline title |
| `monoFont` | `font-family: ui-monospace, 'SF Mono', 'Menlo', 'Consolas', monospace; font-size: 16px;` (system body monospaced) | Habit names, form fields, numeric values, empty state text |
| `monoCaption` | `font-family: ui-monospace, ...; font-size: 12px;` (system caption monospaced) | Unit labels, stat card titles, "LAST N DAYS" label |
| Date strip day letter | `font-size: 10px; font-weight: 500; font-family: monospace;` | Day-of-week single letter (M, T, W...) |
| Date strip day number | `font-size: 14px; font-weight: 600; font-family: monospace;` | Day number (1–31) |
| Month labels (grid) | `font-size: 9px; font-family: monospace;` | Month abbreviations above contribution grid |
| Chart axis labels | `font-size: 10px; font-family: monospace;` | X and Y axis labels on charts |
| Chart avg annotation | `font-size: 10px; font-family: monospace; color: var(--accent);` | "avg {value}" text on chart |

**Custom Font File:** `Ndot57-Regular.otf` — must be loaded via `@font-face` as `'Ndot57Regular'`. This is a pixelated/dot-matrix style display font. Ship the `.otf` file in `/public/fonts/`.

### 2.3 Layout Constants

| Token | Value | Usage |
|---|---|---|
| `dotSize` | `12px` | Contribution grid cell width & height |
| `gridSpacing` | `3px` | Contribution grid gap between cells |
| `dottedDash` | `4px dash, 3px gap` → CSS: `stroke-dasharray: 4 3` or `border-style: dashed` | Stat card border, chart average rule line, chart grid lines |
| `borderWidth` | `0.5px` | Binary toggle border, numeric display border, stat card border |

### 2.4 Spacing & Layout

| Element | Value |
|---|---|
| Main content horizontal padding | `16px` |
| Title area top padding | `4px` |
| Date strip vertical padding | `20px` |
| Date strip trailing padding | `10px` |
| Date strip inter-button spacing | `6px` |
| Date strip button inner padding | `8px vertical, 16px horizontal (scroll area)` |
| Date button size | `36px × 44px` |
| Date button corner radius | `8px` |
| Habit row vertical padding | `4px` |
| Stat card vertical padding | `12px` |
| Stat card corner radius | `8px` |
| Stat cards inter-card spacing | `8px` |
| Detail view sections spacing | `20px` |
| Detail view padding | `16px` all sides |
| Binary toggle size | `28px × 28px` |
| Binary toggle corner radius | `6px` |
| Numeric display min width | `46px` |
| Numeric display min height | `28px` |
| Numeric display horizontal padding | `8px` |
| Numeric display corner radius | `6px` |
| Checkmark icon size | `14px, bold weight` |
| Chart min height | `200px` |
| Contribution grid horizontal padding | `4px` |
| Contribution grid cell corner radius | `2px` |
| Contribution grid today border width | `1.5px` |
| Empty state spacing | `16px` |

---

## 3. Data Models

### 3.1 Habit

```typescript
interface Habit {
  id: string;            // UUID v4
  name: string;
  type: 'binary' | 'numeric';
  unit?: string;         // Only for numeric habits (e.g., "grams", "minutes")
  createdAt: string;     // ISO 8601 date string
  reminderEnabled: boolean;
  reminderHour: number;  // 0–23, default 9
  reminderMinute: number; // 0–59, default 0
  sortOrder: number;     // For ordering in list
  isArchived: boolean;   // Hidden but not deleted, default false
}
```

### 3.2 HabitEntry

```typescript
interface HabitEntry {
  id: string;            // UUID v4
  habitId: string;       // Foreign key to Habit.id
  date: string;          // ISO 8601 date, normalized to start of day (midnight)
  completed: boolean;
  value?: number;        // Only for numeric habits
}
```

### 3.3 Persistence — IndexedDB Schema

Use **Dexie.js** (or idb) for IndexedDB:

```
Database: "obicei-db", version 1

Table: habits
  - Primary key: id
  - Indexes: sortOrder, isArchived

Table: entries
  - Primary key: id
  - Indexes: habitId, date, [habitId+date] (compound)
```

**Cascade Delete Rule:** When a habit is deleted, delete ALL its entries.

**Date Normalization:** All entry dates must be normalized to midnight (start of day) before storage.

---

## 4. Component Architecture

```
App (PWA Shell)
├── HabitListPage (route: "/")
│   ├── NavigationBar
│   │   ├── DayTitle (right-aligned, Ndot57 50px)
│   │   └── AddButton (+ icon)
│   ├── DateStrip (horizontal scroll)
│   │   └── DateButton[] (per day)
│   ├── HabitList
│   │   └── HabitRow[] (per active habit)
│   │       ├── HabitInfo (name + optional unit)
│   │       ├── BinaryToggle (for binary habits)
│   │       └── NumericDisplay (for numeric habits)
│   └── EmptyState (when no habits)
├── HabitDetailPage (route: "/habit/:id")
│   ├── DetailHeader (unit label, uppercase)
│   ├── StatCards (3 cards in a row)
│   │   └── StatCard (title + value)
│   ├── ContributionGrid (for binary habits)
│   │   ├── MonthLabels
│   │   └── GridCells (7 rows × N columns)
│   ├── PeriodPicker (for numeric habits, segmented: 7D|30D|90D|1Y)
│   ├── NumericChart (for numeric habits, line chart)
│   └── ToolbarMenu (Edit / Delete)
├── HabitFormModal (sheet/modal)
│   ├── NameField
│   ├── TypePicker (segmented: Yes/No | Number) — only on create
│   ├── UnitField (only for numeric type)
│   ├── ReminderToggle
│   ├── TimePicker (only when reminder enabled)
│   ├── CancelButton
│   └── SaveButton (disabled when name empty)
└── NumericInputDialog (alert-style modal)
    ├── ValueTextField (decimal input)
    ├── SaveButton
    └── CancelButton
```

---

## 5. Component Specifications

### 5.1 HabitListPage

**Layout:** Full-height vertical stack, no spacing between sections.

**Title Area:**
- Right-aligned text
- Font: `Ndot57Regular, 50px`
- Content: If selected date is today → full weekday name (e.g., "Thursday"); otherwise → medium date format (e.g., "Jan 29, 2026")
- Padding: `16px horizontal, 4px top`

**Date Strip:**
- Horizontal scrollable container, no scrollbar
- Auto-scrolls to today (trailing anchor) on mount
- Contains one DateButton per day from the earliest habit creation date through today
- Outer padding: `16px horizontal, 8px vertical` (inside scroll), `10px trailing` (outside scroll), `20px vertical` (container)

**DateButton:**
- Size: `36px × 44px`, corner radius `8px`
- Content: Single day-of-week letter (M, T, W, T, F, S, S) + day number
- Day letter: `10px monospace medium weight`
- Day number: `14px monospace semibold`
- VStack spacing: `2px`
- **Selected state:** Background `var(--accent)`, text `white`
- **Unselected + all habits completed:** Background `var(--primary-06)`, text `var(--accent)`
- **Unselected + not all completed:** Background `var(--primary-06)`, text `var(--primary)`
- "All habits completed" = every active habit has a completed entry on that date

**Habit List:**
- Plain list style (no grouped insets)
- Each row is a NavigationLink to HabitDetailPage
- Sorted by `sortOrder`
- Filtered: only `isArchived === false`

**Empty State:**
- Centered VStack, spacing `16px`
- "No habits yet." in `monoFont`, secondary color
- "Add your first habit" button in `monoFont`

**Toolbar:**
- Plus (+) button in primary action position (top-right)
- Opens HabitFormModal

### 5.2 HabitRow

**Layout:** HStack, `4px vertical padding`

**Left side (HabitInfo):**
- VStack aligned leading, spacing `2px`
- Habit name: `monoFont` (16px monospace)
- Unit (numeric only): `monoCaption` (12px monospace), secondary color, shows `habit.unit`

**Right side — Binary Toggle:**
- Button, plain style (no default button chrome)
- Size: `28px × 28px`, corner radius `6px`
- **Uncompleted:** Transparent fill, border `var(--primary-30)` at `0.5px` width
- **Completed:** `var(--primary)` fill, border `var(--primary-30)` at `0.5px`, checkmark icon centered — `14px bold`, color `var(--background)` (inverted)
- Fill transition: `ease-in-out 200ms`
- **Scale animation on tap:** Immediately scale to `1.3`, then after `150ms` spring back to `1.0` — spring parameters: `response 300ms, damping 0.5`
- **Haptic (PWA):** `navigator.vibrate(15)` on tap (medium impact equivalent)

**Right side — Numeric Display:**
- Button, plain style
- Min size: `46px wide × 28px tall`, `8px horizontal padding`
- Corner radius `6px`, border `var(--primary-30)` at `0.5px`
- Shows formatted value if entry exists (monoFont), or empty
- Text color: `var(--primary)` if value exists, `var(--secondary)` if empty
- On tap: opens NumericInputDialog
- **Scale animation on save:** Scale to `1.15`, then after `150ms` spring back to `1.0`
- **Haptic on save (PWA):** `navigator.vibrate([10, 50, 10])` (success notification equivalent)

### 5.3 NumericInputDialog

- Native-style alert/modal dialog
- Title: "Enter value"
- Single text field, decimal/numeric keyboard mode (`inputmode="decimal"`)
- **Save button:** If text is empty/whitespace → clear the entry (set completed=false, value=null). If valid number → save value and set completed=true.
- **Cancel button:** Dismisses without saving
- Pre-populates with existing value if entry exists

### 5.4 HabitFormModal

**Layout:** Full-screen modal with navigation bar (Cancel left, Save right)

**Title:** "Edit Habit" if editing existing, "New Habit" if creating

**Sections (form layout):**

1. **Name Section:**
   - Text input, placeholder "Habit name"
   - Font: `monoFont`

2. **Type Section (create only — hidden when editing):**
   - Segmented picker with two options: "Yes / No" (binary), "Number" (numeric)
   - Default: binary

3. **Unit Section (shown only when type=numeric):**
   - Text input, placeholder "Unit (e.g. grams, minutes)"
   - Font: `monoFont`

4. **Reminder Section:**
   - Toggle: "Daily Reminder"
   - When enabled, show Time picker (hour:minute)
   - Default time: 09:00

**Save Logic:**
- Trim whitespace from name
- If editing: update name, unit (only for numeric), reminder settings
- If creating: create new Habit with all fields
- If reminder enabled → schedule web notification
- If reminder disabled → cancel any existing notification
- Save button disabled when name is empty/whitespace

### 5.5 HabitDetailPage

**Layout:** ScrollView → VStack aligned leading, spacing `20px`, padding `16px`

**Navigation:** Inline title (habit name), back button

**Header:**
- For numeric habits only: shows `habit.unit` in uppercase
- Font: `monoCaption`, secondary color

**Toolbar Menu (three-dot "..." icon, top-right):**
- "Edit" → opens HabitFormModal
- "Delete" → shows confirmation alert

**Delete Confirmation Alert:**
- Title: "Delete Habit"
- Message: `This will delete all entries for "{habit.name}". This cannot be undone.`
- Buttons: "Delete" (destructive/red), "Cancel"
- On delete: cancel notifications, delete habit + all entries, navigate back

#### 5.5.1 Binary Habit Detail

**Stat Cards Row:** 3 cards side-by-side, spacing `8px`
- "Current" → `currentStreak` value
- "Longest" → `longestStreak` value
- "Rate" → `completionRate` formatted as `"{N}%"` (rounded to integer)

**Contribution Grid:** Full-width, below stat cards (see 5.7)

#### 5.5.2 Numeric Habit Detail

**Stat Cards Row:** 3 cards side-by-side, spacing `8px`
- "Average" → `average(days)` formatted value
- "Min" → `minimum(days)` formatted value
- "Max" → `maximum(days)` formatted value

**Period Picker:** Segmented control with options: `7D`, `30D`, `90D`, `1Y`
- Default selection: `30D`
- Maps to days: 7, 30, 90, 365
- Changes filter for stat cards AND chart simultaneously

**Numeric Chart:** Below period picker (see 5.8)

### 5.6 StatCard

**Layout:** VStack centered, spacing `4px`

- **Value:** Font `ndotTitle` (Ndot57Regular 28px), single line, scales down to 50% if needed
- **Title:** Font `monoCaption` (12px monospace), secondary color, single line

**Container:**
- Full width (flex: 1 in row)
- `12px vertical padding`
- Border: `var(--primary-15)` at `0.5px`, dashed `4-3`, corner radius `8px`

**CSS border equivalent:**
```css
border: 0.5px dashed rgba(current-text, 0.15);
border-radius: 8px;
/* Use SVG or custom dash pattern for exact 4-3 dash */
```

### 5.7 ContributionGrid (Binary habits only)

**Layout:** Horizontal ScrollView → LazyHGrid (7 rows × N columns)

**Grid Dimensions:**
- Rows: 7 (Sunday through Saturday, matching Calendar.current weekday)
- Columns: Calculated from `createdAt` week start to current week end
- Start date: Sunday of the week containing `createdAt`
- End date: Saturday of the current week
- Cell size: `12px × 12px`, corner radius `2px`
- Gap: `3px` between cells
- Grid padding: `4px horizontal`

**Cell States:**
| Condition | Fill Color |
|---|---|
| Future date | `transparent` |
| Before habit creation date | `transparent` |
| Not completed | `var(--primary-08)` |
| Completed | `var(--accent-75)` → `rgba(208, 2, 27, 0.75)` |
| Today (overlay) | `1.5px` stroke border in `var(--accent)` |

**Month Labels:**
- Row above the grid
- Font: `9px monospace`, secondary color
- Each label spans the columns belonging to that month
- Width per span: `columns × (dotSize + gridSpacing)` = `columns × 15px`
- Labels: abbreviated month names ("Jan", "Feb", etc.)

**Footer:**
- Text: `"LAST {N} DAYS"` where N = days since creation (minimum 1)
- Font: `monoCaption`, secondary color
- `4px top padding`

**Scroll Behavior:** Auto-scroll to trailing (most recent) on mount. Use `scroll-snap-align: end` or `scrollLeft` on mount.

### 5.8 NumericChart

**Library:** Use Recharts (React) or Chart.js

**Chart Type:** Line chart with point markers

**Line:**
- Color: `var(--primary)` (black in light mode, white in dark)
- Interpolation: Catmull-Rom (smooth curves) — use `type="monotone"` in Recharts
- Point markers at each data point, size ~30 symbol area (~6px diameter)
- Point color: `var(--primary)`

**Average Rule Line:**
- Horizontal line at y = average value
- Color: `var(--accent)` (#D0021B)
- Style: dashed, `1px width`, dash pattern `4 3`
- Annotation: Top-right aligned, text `"avg {value}"`, font `10px monospace`, color `var(--accent)`

**Y Axis:**
- Grid lines: `0.5px`, dashed `2 2`, secondary color
- Labels: `10px monospace`

**X Axis:**
- Grid lines: `0.5px`, dashed `2 2`
- Labels: `10px monospace`, format "MMM d" (e.g., "Jan 29")

**Container:** Full width, minimum height `200px`

---

## 6. Business Logic

### 6.1 HabitListViewModel

```typescript
// Toggle binary habit for a given date
function toggleBinary(habit: Habit, date: Date): void {
  const normalizedDate = startOfDay(date);
  const entry = findEntry(habit.id, normalizedDate);

  if (entry) {
    entry.completed = !entry.completed;
    // Update in IndexedDB
  } else {
    // Create new entry: { date: normalizedDate, completed: true }
    // Insert into IndexedDB
  }
}

// Set numeric value for a given date
function setNumericValue(habit: Habit, value: number, date: Date): void {
  const normalizedDate = startOfDay(date);
  const entry = findEntry(habit.id, normalizedDate);

  if (entry) {
    entry.value = value;
    entry.completed = true;
    // Update in IndexedDB
  } else {
    // Create new entry: { date: normalizedDate, completed: true, value }
    // Insert into IndexedDB
  }
}

// Clear numeric value (when user submits empty input)
function clearNumericValue(habit: Habit, date: Date): void {
  const normalizedDate = startOfDay(date);
  const entry = findEntry(habit.id, normalizedDate);

  if (entry) {
    entry.value = undefined;
    entry.completed = false;
    // Update in IndexedDB
  }
}

// Find entry for habit on a specific date
function findEntry(habitId: string, date: Date): HabitEntry | undefined {
  // Query IndexedDB: entries where habitId matches AND date is same day
}
```

### 6.2 HabitDetailViewModel

#### Current Streak (Binary)
```
1. Get all completed entries, extract dates (normalized to start of day), sort descending
2. If empty → return 0
3. Start checking from today. If today is not in the list, start from yesterday
4. Walk backward: for each consecutive day found in the sorted list, increment streak
5. Break when a gap is found (date is before the check date but not adjacent)
6. Return streak count
```

#### Longest Streak (Binary)
```
1. Get all completed entry dates, sort ascending
2. If empty → return 0
3. Walk forward: if difference between consecutive dates = 1 day, increment current streak
4. If gap > 1 day, reset current streak to 1
5. Track maximum of all streaks
6. Return max(longest, current)
```

#### Completion Rate (Binary)
```
1. totalDays = max(1, days between createdAt (start of day) and today (start of day) + 1)
2. completedDays = count of entries where completed = true
3. Return (completedDays / totalDays) × 100
```

#### Completed Dates Set (Binary)
```
Return Set of all dates (start of day) where entry.completed = true
Used by ContributionGrid
```

#### Numeric Entries (Numeric, filtered by period)
```
1. cutoff = today minus {days} days (start of day)
2. Filter entries: value is not null AND date >= cutoff
3. Sort by date ascending
```

#### Average (Numeric)
```
1. Get filtered numeric entries
2. If empty → return 0
3. Sum all values, divide by count
```

#### Minimum / Maximum (Numeric)
```
Return min/max of filtered numeric entry values, or 0 if empty
```

### 6.3 Value Formatting
```typescript
function formatValue(value: number): string {
  if (value % 1 === 0) {
    return value.toFixed(0);  // No decimals for whole numbers
  }
  return value.toFixed(1);    // One decimal place otherwise
}
```

### 6.4 Date Helpers
```typescript
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - days);
  return d;
}
```

---

## 7. Haptic Feedback (Vibration API)

The iOS app uses UIKit haptic feedback. Map to the Web Vibration API:

| iOS Haptic | Trigger | PWA Equivalent |
|---|---|---|
| `UIImpactFeedbackGenerator(style: .medium)` | Binary toggle tap | `navigator.vibrate(15)` |
| `UINotificationFeedbackGenerator().notificationOccurred(.success)` | Numeric value saved | `navigator.vibrate([10, 50, 10])` |

**Feature Detection:**
```typescript
function haptic(pattern: number | number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
```

---

## 8. Animations

### 8.1 Binary Toggle Scale

```
Trigger: On tap
1. Immediately: scale → 1.3 with spring animation (300ms response, 0.5 damping)
2. After 150ms delay: scale → 1.0 with spring animation (300ms response, 0.5 damping)
```

**CSS equivalent:**
```css
.toggle-bounce {
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
/* Or use JS: element.animate() with spring-like easing */
```

**Note:** CSS doesn't have native spring physics. Use a library like `framer-motion` (recommended) or approximate with `cubic-bezier(0.34, 1.56, 0.64, 1)`.

With Framer Motion:
```tsx
<motion.div
  animate={{ scale: toggling ? 1.3 : 1.0 }}
  transition={{ type: "spring", stiffness: 500, damping: 15, duration: 0.3 }}
/>
```

### 8.2 Numeric Save Scale

```
Trigger: On successful numeric save
1. Immediately: scale → 1.15 with spring animation
2. After 150ms: scale → 1.0 with spring animation
Same spring parameters as binary toggle
```

### 8.3 Binary Toggle Fill

```
Trigger: completed state change
Transition: ease-in-out, 200ms duration
Property: background-color (transparent ↔ var(--primary))
```

---

## 9. Notification Service

### 9.1 Request Permission
```typescript
async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}
```

### 9.2 Schedule Daily Reminder
```typescript
// Use a Service Worker with periodic check or the Notification Triggers API (if available)
// Fallback: Use setInterval/setTimeout for in-app reminders when app is open
// For true background: register in service worker

function scheduleReminder(habit: Habit): void {
  // Store reminder config in IndexedDB
  // Service worker checks periodically and fires notifications
  // Notification content:
  //   title: "obicei"
  //   body: "Time to track: {habit.name}"
  //   identifier: "habit-{habit.id}"
}
```

### 9.3 Cancel Reminder
```typescript
function cancelReminder(habit: Habit): void {
  // Remove reminder config from IndexedDB
  // Cancel any pending notification with tag "habit-{habit.id}"
}
```

**Important:** Web Push notifications require a service worker and potentially a push server for reliable delivery. For MVP, use in-app scheduled notifications when the tab is open, and document the push server requirement for full parity.

---

## 10. PWA Configuration

### 10.1 manifest.json

```json
{
  "name": "obicei",
  "short_name": "obicei",
  "description": "Habit tracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#D0021B",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 10.2 Service Worker

- Cache static assets (HTML, CSS, JS, fonts)
- Cache-first strategy for fonts and icons
- Network-first for data operations
- Enable offline support — all data is in IndexedDB
- Handle notification scheduling

### 10.3 Dark Mode Support

The app inherits system appearance. Implement with:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --primary: rgb(255, 255, 255);
    --background: rgb(0, 0, 0);
    --secondary: rgb(142, 142, 147);
  }
}
@media (prefers-color-scheme: light) {
  :root {
    --primary: rgb(0, 0, 0);
    --background: rgb(255, 255, 255);
    --secondary: rgb(142, 142, 147);
  }
}
```

The accent color `#D0021B` remains the same in both modes.

---

## 11. Routing

| Route | Component | Description |
|---|---|---|
| `/` | HabitListPage | Main habit list with date strip |
| `/habit/:id` | HabitDetailPage | Habit detail with stats and charts |

Use React Router. The HabitFormModal and NumericInputDialog are overlays, not routes.

---

## 12. Project Structure

```
src/
├── app/
│   ├── App.tsx
│   ├── routes.tsx
│   └── main.tsx
├── components/
│   ├── ContributionGrid.tsx
│   ├── DateStrip.tsx
│   ├── EmptyState.tsx
│   ├── HabitDetailView.tsx
│   ├── HabitFormModal.tsx
│   ├── HabitListView.tsx
│   ├── HabitRow.tsx
│   ├── NumericChart.tsx
│   ├── NumericInputDialog.tsx
│   ├── PeriodPicker.tsx
│   └── StatCard.tsx
├── hooks/
│   ├── useHabits.ts          (CRUD + queries)
│   └── useHabitDetail.ts     (streak/stats calculations)
├── lib/
│   ├── db.ts                 (Dexie IndexedDB setup)
│   ├── date-utils.ts
│   ├── format-utils.ts
│   ├── haptics.ts
│   └── notifications.ts
├── models/
│   ├── habit.ts
│   └── habit-entry.ts
├── theme/
│   └── theme.ts              (CSS variable definitions + constants)
├── styles/
│   └── globals.css
public/
├── fonts/
│   └── Ndot57-Regular.otf
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
├── manifest.json
└── sw.js
```

---

## 13. Technology Stack

| Concern | Technology |
|---|---|
| Framework | React 18+ with TypeScript |
| Build | Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS + CSS custom properties |
| Animations | Framer Motion |
| Charts | Recharts |
| Database | Dexie.js (IndexedDB wrapper) |
| Icons | Heroicons or Lucide (for +, checkmark, ellipsis) |
| PWA | vite-plugin-pwa (Workbox) |
| Font | Self-hosted Ndot57-Regular.otf via @font-face |

---

## 14. Implementation Order

1. **Setup:** Vite + React + TypeScript + Tailwind + Framer Motion + PWA plugin
2. **Theme:** CSS variables, @font-face for Ndot57, global styles
3. **Database:** Dexie.js schema, Habit and HabitEntry models
4. **Hooks:** `useHabits` (CRUD, queries), `useHabitDetail` (stats calculations)
5. **HabitListPage:** DateStrip, HabitRow (binary + numeric), EmptyState
6. **HabitFormModal:** Create/edit form with type picker, unit, reminders
7. **HabitDetailPage:** StatCard, ContributionGrid, PeriodPicker, NumericChart
8. **Animations:** Toggle bounce, save bounce, fill transitions
9. **Haptics:** Vibration API integration
10. **Notifications:** Permission request, in-app scheduling, service worker
11. **PWA:** manifest.json, service worker, offline support, icons
12. **Dark Mode:** CSS media query, test all components
13. **Polish:** Scroll behaviors, keyboard handling, responsive layout

---

## 15. Critical Behavioral Details

1. **Date Strip Range:** From earliest habit creation date to today. If no habits, only show today.
2. **Date Strip Auto-scroll:** Always scrolls to today (trailing edge) on mount.
3. **"All Completed" indicator:** A date button gets accent-colored text ONLY if every active (non-archived) habit has a completed entry on that date.
4. **Habit Type Immutability:** Once a habit is created, its type (binary/numeric) cannot be changed. The type picker is hidden in edit mode.
5. **Empty Numeric Save:** Submitting empty text in the numeric dialog CLEARS the entry (sets completed=false, value=null), does NOT ignore.
6. **Current Streak Grace:** If today doesn't have an entry, the streak counts from yesterday. This means missing today doesn't break your streak until tomorrow.
7. **Contribution Grid Start:** Begins from the Sunday of the week containing `createdAt`, not from `createdAt` itself.
8. **Contribution Grid End:** Ends at the Saturday of the current week (even if those days are in the future — future cells are transparent).
9. **Sort Order:** Habits are displayed in `sortOrder` ascending. New habits should get the next available sortOrder.
10. **Archive vs Delete:** The iOS app has `isArchived` but the UI only shows delete. Keep `isArchived` in the model for future use, but the current UI only deletes.
11. **Reminder Default Time:** 09:00 AM
12. **Value Formatting:** Whole numbers show no decimal (e.g., "5"), non-whole show one decimal (e.g., "5.3").
13. **Navigation Title Font:** The navigation bar (both large and inline titles) uses Ndot57Regular font. Large title: 28px (set via UINavigationBar appearance), inline: 17px.

---

## 16. Accessibility Notes

- All interactive elements must be keyboard accessible
- Binary toggle should be an actual button with `aria-pressed` state
- Numeric display button should have `aria-label` indicating current value
- Contribution grid cells should have `aria-label` with date and completion status
- Form inputs need proper labels
- Color is never the sole indicator — always paired with icons or text
- Respect `prefers-reduced-motion` for animations

---

*End of specification. This document contains everything needed to build the complete PWA replica of the obicei iOS app.*
