# CSV Editor Spec v1.1

## 1. Objective
Build a React web application that allows a user to browse local CSV files, open one, edit cells in a spreadsheet-like grid, and save changes.

## 2. Required Output Location
- Generate application source code in `./app`.
- Do not generate code outside `./app` unless explicitly needed for project setup.

## 3. Runtime and Launch
- App must run as a React web app.
- User starts it with:
  - `npm start`
- Assume standard React dev workflow and scripts in `package.json`.

## 4. Functional Requirements

### 4.1 Main Layout
Create a two-pane layout:
- Left pane: Local file browser for CSV files.
- Right pane: Main editor area (grid view for opened CSV).

Suggested behavior:
- Left pane width around 260-320px, resizable optional.
- Right pane fills remaining space.

### 4.2 Local File Browser
The app must allow browsing local CSV files and opening one by double-click.

Because this is a web app, implement local file access using browser-safe APIs:
- Preferred: File System Access API (directory picker + file handles).
- Fallback if unavailable: file upload input that lists selected CSV files.

Required browser behavior:
- Show only files with `.csv` extension.
- Display file names in a list/tree style.
- Double-click on a CSV file opens it in the main editor.
- Show a friendly message if no folder/files are selected.

### 4.3 CSV Loading and Parsing
When a CSV file is opened:
- Read text content.
- Parse into rows and columns.
- Handle quoted values and commas inside quoted values.
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

### 4.6 Unsaved Changes
Track dirty state:
- Mark document as unsaved after any edit.
- Clear dirty state after successful Save or Save As.
- Before opening another file or creating a new file, warn user if there are unsaved changes.

## 5. CSV Serialization Rules
When saving/exporting:
- Rebuild CSV from current grid state.
- Quote fields when needed (commas, quotes, newlines).
- Escape internal quotes correctly.
- Preserve row/column order exactly as shown in grid.

## 6. UX Requirements
- Clean, simple interface.
- Clear feedback for:
  - File opened successfully
  - Save success/failure
  - Parse/read errors
  - Permission denied scenarios
- Buttons disabled/enabled based on context (for example Save disabled when no file is open and no editable document exists).

## 7. Non-Functional Requirements
- Use React with maintainable component structure.
- Keep state management understandable (React state/hooks is acceptable).
- Avoid unnecessary complexity.
- Handle medium CSVs smoothly (several thousand rows) without freezing the UI during normal edits.

## 8. Suggested Component Structure (Guidance)
Possible components (names can vary):
- App shell/layout
- File browser pane
- Toolbar
- CSV grid/table editor
- Dialog/notification utilities

## 9. Acceptance Criteria
The implementation is complete when all conditions below are true:
1. `npm start` launches the app successfully.
2. User can pick local files/folder and see CSV items in left pane.
3. Double-clicking a CSV opens it in the main grid.
4. Grid displays visible row/column boundaries.
5. Double-clicking a cell enables editing and updates value.
6. Save writes updates to the original file when possible.
7. Save As exports current data to a new CSV file.
8. New File creates an editable new CSV document.
9. Unsaved-change warning appears before destructive navigation actions.

## 10. Out of Scope (Do Not Implement Unless Asked)
- Multi-sheet spreadsheets
- Formula engine
- Cell formatting tools
- Real-time collaboration
- Authentication/backend services

## 11. Implementation Note for the Next LLM Step
In the next step, generate the full React app code in `./app` according to this specification. Include any needed dependencies and scripts so the project runs with `npm start`.