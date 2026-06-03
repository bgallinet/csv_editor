# CSV Editor

A modern, web-based CSV editor built with React. Browse local CSV files, edit cells like Excel, manage rows/columns, and save changes with an intuitive interface.

## Features

- **Folder Tree Browser**: Navigate local folders and open CSV files with a collapsible directory tree.
- **Spreadsheet-like Editor**: Edit CSV data in a grid with visible row/column borders.
- **Cell Editing**: Double-click any cell to edit inline. Press Enter to confirm, Escape to cancel.
- **Row/Column Management**: 
  - Add or remove rows and columns via toolbar buttons.
  - Right-click row/column headers for Copy, Cut, Delete, Paste operations.
- **Semicolon-Separated Output**: Save files with `;` as the delimiter (Excel-compatible).
- **File Operations**: Save, Save As, and New File support.
- **Unsaved Changes Tracking**: Warns before discarding unsaved work.
- **One-Click Launch**: Double-click `Open CSV Editor.cmd` to start the app with auto-browser opening.

## Quick Start

### Option 1: One-Click Launch (Easiest)
1. Double-click **`Open CSV Editor.cmd`** in the project folder.
2. The app launches and automatically opens in your browser.
3. Select a local folder or upload CSV files to begin.

### Option 2: Command Line
1. Open a terminal in the `app` folder.
2. Run:
   ```bash
   npm.cmd start
   ```
3. The app opens automatically at `http://localhost:5173/`.

## Usage

### Opening Files
1. Click **"Pick Folder"** to browse local directories and select a folder with CSV files.
2. Or click **"Add CSV Files"** to upload specific CSV files.
3. The left panel shows a folder tree. Double-click a CSV file to open it.

### Editing
- **Edit a cell**: Double-click the cell. Type your changes. Press Enter to confirm or Escape to cancel.
- **Add rows/columns**: Use the toolbar buttons: `+ Row`, `- Row`, `+ Column`, `- Column`.
- **Row/column actions**: Click a row number or column header (A, B, C...) to open a menu with Copy, Cut, Delete, Paste options.

### Saving
- **Save**: Writes changes back to the original file (if opened from File System Access API).
- **Save As**: Export to a new CSV file location.
- **New File**: Start with a blank 10×5 grid.

All saved files use semicolon (`;`) as the delimiter for consistency and Excel compatibility.

## File Structure

```
csv_editor/
├── README.md                    # This file
├── Open CSV Editor.cmd          # One-click launcher (Windows)
├── instructions/
│   ├── instructions_v1.0.md    # Original requirements
│   ├── instructions_v1.1.md    # Refined spec
│   ├── instructions_v1.2.md    # With row/column controls
│   └── instructions_v1.3.md    # Final spec with header menus
├── app/
│   ├── package.json             # Dependencies and scripts
│   ├── index.html               # HTML entry point
│   ├── vite.config.js           # Vite build config
│   ├── src/
│   │   ├── main.jsx             # React app entry
│   │   ├── App.jsx              # Main app component
│   │   └── styles.css           # Application styles
│   ├── dist/                    # Production build output
│   └── node_modules/            # Installed dependencies
```

## Requirements

- **Node.js** 16+ with npm
- **Modern browser** (Chrome, Firefox, Edge, Safari)
- **Permissions**: Browser may request permission to access clipboard for copy/paste operations.

## Browser Compatibility

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

File system access (folder picking) requires browser support for the File System Access API. Fallback file upload is available in browsers without it.

## Troubleshooting

### "npm is disabled" error
Use `npm.cmd` instead of `npm` (the launcher does this automatically).

Alternatively, enable PowerShell script execution:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Port 5173 already in use
Vite automatically uses the next available port (e.g., 5174). Check your browser's address bar.

### Clipboard actions fail
Ensure the app is accessed over a secure context (localhost is trusted). Some browsers may ask for permission to access clipboard.

### File not saving
- For Save to work, files must be opened via the File System Access API (folder picker).
- Use Save As to export to a known location.

## Development

### Build
```bash
npm.cmd run build
```

### Dev Server
```bash
npm.cmd run dev
```

## License

Created as a CSV editing tool. Modify and use freely.

## Version History

- **v1.3**: Added header context menus (copy/cut/delete/paste), semicolon save format, one-click launcher.
- **v1.2**: Added collapsible folder tree, row/column add/remove controls.
- **v1.1**: Refined spec with clearer LLM-ready requirements.
- **v1.0**: Initial concept and requirements.
