# CSV Editor Spec v1.3

## 1. Objective
Build a React web application that allows a user to browse local CSV files in a folder tree, open one, edit cells in a spreadsheet-like grid, and save changes.

## 2. Required Output Location
- Generate application source code in `./app`.
- Do not generate code outside `./app` unless explicitly needed for project setup.

## 3. Runtime and Launch
- App must run as a React web app.
- User can start it with:
  - `npm start`
- Provide a one-click Windows launcher file in the project root:
  - `Open CSV Editor.cmd`
- Launcher behavior:
  - Double-clicking the launcher starts the app.
  - Browser opens automatically.
  - App is ready to use without manually typing commands.

## 4. Functional Requirements

### 4.1 Main Layout
Create a two-pane layout:
- Left pane: Local folder tree (directories + CSV files only).
- Right pane: Main editor area (grid view for opened CSV).

Suggested behavior:
- Left pane width around 260-320px, resizable optional.
- Right pane fills remaining space.

### 4.2 Local File Browser (Folder Tree)
The app must allow browsing local folders and opening CSV files by double-click.

Because this is a web app, implement local file access using browser-safe APIs:
- Preferred: File System Access API (directory picker + file handles).
- Fallback if unavailable: file upload input that lists selected CSV files.

Required behavior:
- Show folder structure (nested directories) in the left pane.
- Show only directories and `.csv` files.
- Hide all non-CSV file types.
- Folder nodes must be collapsible/expandable.
- CSV file nodes open in the editor on double-click.
- Show a friendly message if no folder/files are selected.

### 4.3 CSV Loading and Parsing
When a CSV file is opened:
- Read text content.
- Parse into rows and columns.
- Handle quoted values and separators inside quoted values.
- Preserve empty cells.
- Normalize line endings (`\r\n` and `\n`).

Recommended: use a robust CSV parser library to avoid edge-case parsing bugs.

### 4.4 Spreadsheet-Like Editor
Display CSV data in a visible table/grid similar to Excel:
- Rows and columns separated by clear borders.
- Each cell shows current value.
- Double-click cell to enter edit mode.
- In edit mode:
  - Input is focused.
  - Enter confirms edit.
  - Escape cancels edit.
  - Blur confirms edit.

Minimum usability requirements:
- Scroll for large files.
- Keep header row visually distinct if present (optional inference, no strict schema required).
- Prevent layout break on long text (truncate or wrap consistently).

### 4.5 Toolbar Actions
Provide these buttons in UI:
- Save
- Save As
- New File
- Add Row
- Remove Last Row
- Add Column
- Remove Last Column

Behavior:
- Save:
  - Writes current in-memory CSV data back to the originally opened file when permission/handle exists.
  - If original file handle is unavailable, fallback to Save As behavior.
- Save As:
  - Lets user choose destination/name.
  - Exports current grid data as CSV.
- New File:
  - Creates a new empty CSV in editor state.
  - Start with at least a small default grid (for example 10 rows x 5 columns) or a clearly editable blank table.
- Add Row:
  - Appends one row at the bottom.
  - New row should match current column count.
- Remove Last Row:
  - Removes the final row.
  - Keep at least 1 row in the grid.
- Add Column:
  - Appends one column at the right for all rows.
- Remove Last Column:
  - Removes the final column from all rows.
  - Keep at least 1 column in the grid.

### 4.6 Row/Column Header Context Menu
Rows and columns must be clickable via their headers, opening a small action menu.

Required actions for both row and column menus:
- Copy
- Cut
- Delete
- Paste

Expected behavior:
- Click row header (row number) to open row menu.
- Click column header (A, B, C...) to open column menu.
- Copy copies selected row/column data to clipboard.
- Cut copies then deletes selected row/column.
- Delete removes selected row/column.
- Paste reads clipboard and applies to selected row/column.
- Menu closes on outside click or Escape.

### 4.7 Unsaved Changes
Track dirty state:
- Mark document as unsaved after any cell edit and after row/column structure changes.
- Mark document as unsaved after row/column menu actions that modify data (cut, delete, paste).
- Clear dirty state after successful Save or Save As.
- Before opening another file or creating a new file, warn user if there are unsaved changes.

## 5. CSV Serialization Rules
When saving/exporting:
- Rebuild CSV from current grid state.
- Use semicolon (`;`) as output separator/delimiter.
- Quote fields when needed (separator, quotes, newlines).
- Escape internal quotes correctly.
- Preserve row/column order exactly as shown in grid.

Compatibility note:
- Parser should still open CSV files that use other separators when possible.
- Standardized save output must be semicolon-separated for readability and Excel compatibility.

## 6. UX Requirements
- Clean, simple interface.
- Clear feedback for:
  - File opened successfully
  - Save success/failure
  - Parse/read errors
  - Permission denied scenarios
  - Clipboard action success/failure
- Buttons disabled/enabled based on context (for example Save disabled when no file is open and no editable document exists).

## 7. Non-Functional Requirements
- Use React with maintainable component structure.
- Keep state management understandable (React state/hooks is acceptable).
- Avoid unnecessary complexity.
- Handle medium CSVs smoothly (several thousand rows) without freezing the UI during normal edits.

## 8. Suggested Component Structure (Guidance)
Possible components (names can vary):
- App shell/layout
- File browser tree pane
- Toolbar
- CSV grid/table editor
- Header action menu (row/column)
- Dialog/notification utilities

## 9. Acceptance Criteria
The implementation is complete when all conditions below are true:
1. `npm start` launches the app successfully.
2. Double-clicking `Open CSV Editor.cmd` launches and auto-opens the app in browser.
3. User can pick local files/folder and see a folder tree in the left pane.
4. Folder nodes can be expanded and collapsed.
5. Only folders and CSV files are shown in the tree.
6. Double-clicking a CSV opens it in the main grid.
7. Grid displays visible row/column boundaries.
8. Double-clicking a cell enables editing and updates value.
9. Add/Remove Row buttons correctly change row count.
10. Add/Remove Column buttons correctly change column count.
11. Row and column headers are clickable and show a menu.
12. Menu includes copy, cut, delete, and paste for row and column contexts.
13. Save writes updates to the original file when possible.
14. Save As exports current data to a new CSV file.
15. Saved/exported CSV output uses semicolon separators.
16. New File creates an editable new CSV document.
17. Unsaved-change warning appears before destructive navigation actions.

## 10. Out of Scope (Do Not Implement Unless Asked)
- Multi-sheet spreadsheets
- Formula engine
- Cell formatting tools
- Real-time collaboration
- Authentication/backend services

## 11. Implementation Note for the Next LLM Step
In the next step, generate or update the full React app code in `./app` according to this specification. Include any needed dependencies and scripts so the project runs with `npm start` and one-click launcher behavior via `Open CSV Editor.cmd`.
