import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 5;

function createEmptyGrid(rowCount = DEFAULT_ROWS, colCount = DEFAULT_COLS) {
  return Array.from({ length: rowCount }, () => Array(colCount).fill(""));
}

function normalizeGrid(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return createEmptyGrid();
  }

  const rowArrays = data.map((row) =>
    Array.isArray(row) ? row.map((cell) => `${cell ?? ""}`) : [`${row ?? ""}`]
  );
  const maxCols = Math.max(1, ...rowArrays.map((row) => row.length));

  return rowArrays.map((row) => {
    if (row.length === maxCols) {
      return row;
    }
    return [...row, ...Array(maxCols - row.length).fill("")];
  });
}

function getColumnLabel(columnIndex) {
  let index = columnIndex + 1;
  let label = "";

  while (index > 0) {
    const remainder = (index - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    index = Math.floor((index - 1) / 26);
  }

  return label;
}

function gridToCsv(grid) {
  return Papa.unparse(grid, {
    delimiter: ";",
    newline: "\n",
    quoteChar: '"',
    escapeChar: '"',
  });
}

function buildFileTreeFromItems(items) {
  const root = {
    type: "dir",
    name: "root",
    path: "",
    children: [],
  };

  for (const item of items) {
    const parts = item.path.split("/").filter(Boolean);
    let cursor = root;

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      if (isLast) {
        cursor.children.push({
          type: "file",
          id: item.id,
          name: part,
          path: currentPath,
          item,
        });
        continue;
      }

      let dirNode = cursor.children.find(
        (child) => child.type === "dir" && child.path === currentPath
      );

      if (!dirNode) {
        dirNode = {
          type: "dir",
          name: part,
          path: currentPath,
          children: [],
        };
        cursor.children.push(dirNode);
      }

      cursor = dirNode;
    }
  }

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "dir" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    for (const node of nodes) {
      if (node.type === "dir") {
        sortNodes(node.children);
      }
    }
  };

  sortNodes(root.children);
  return root.children;
}

async function collectCsvFilesFromDirectory(dirHandle, prefix = "") {
  const items = [];
  for await (const [name, handle] of dirHandle.entries()) {
    const fullPath = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "file" && name.toLowerCase().endsWith(".csv")) {
      items.push({
        id: fullPath,
        name,
        path: fullPath,
        source: "handle",
        handle,
      });
      continue;
    }

    if (handle.kind === "directory") {
      const nested = await collectCsvFilesFromDirectory(handle, fullPath);
      items.push(...nested);
    }
  }

  items.sort((a, b) => a.path.localeCompare(b.path));
  return items;
}

export default function App() {
  const [fileItems, setFileItems] = useState([]);
  const [fileTree, setFileTree] = useState([]);
  const [expandedDirs, setExpandedDirs] = useState({});
  const [grid, setGrid] = useState(createEmptyGrid());
  const [docName, setDocName] = useState("Untitled.csv");
  const [activeFileHandle, setActiveFileHandle] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("Choose a folder or CSV files to begin.");
  const [editingCell, setEditingCell] = useState(null);
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [headerMenu, setHeaderMenu] = useState(null);

  const fallbackInputRef = useRef(null);

  const canSave = isDocumentOpen;
  const canSaveAs = isDocumentOpen;

  const tableColumnCount = useMemo(() => {
    if (!Array.isArray(grid) || grid.length === 0) {
      return DEFAULT_COLS;
    }
    return Math.max(1, ...grid.map((row) => row.length));
  }, [grid]);

  const supportsFsa = typeof window !== "undefined" && "showDirectoryPicker" in window;

  useEffect(() => {
    if (!headerMenu) {
      return undefined;
    }

    function closeMenuOnClick() {
      setHeaderMenu(null);
    }

    function closeMenuOnEscape(event) {
      if (event.key === "Escape") {
        setHeaderMenu(null);
      }
    }

    document.addEventListener("click", closeMenuOnClick);
    document.addEventListener("keydown", closeMenuOnEscape);

    return () => {
      document.removeEventListener("click", closeMenuOnClick);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [headerMenu]);

  function markStatus(message) {
    setStatus(message);
  }

  function setItemsAndTree(items) {
    const tree = buildFileTreeFromItems(items);
    const initiallyExpanded = {};

    for (const node of tree) {
      if (node.type === "dir") {
        initiallyExpanded[node.path] = true;
      }
    }

    setFileItems(items);
    setFileTree(tree);
    setExpandedDirs(initiallyExpanded);
  }

  function toggleDirectory(path) {
    setExpandedDirs((current) => ({
      ...current,
      [path]: !current[path],
    }));
  }

  function ensureUnsavedChangesHandled() {
    if (!dirty) {
      return true;
    }

    return window.confirm("You have unsaved changes. Continue and discard them?");
  }

  async function handlePickDirectory() {
    if (!supportsFsa) {
      markStatus("Directory picker is unavailable in this browser. Use 'Add CSV Files' instead.");
      return;
    }

    if (!ensureUnsavedChangesHandled()) {
      return;
    }

    try {
      const directoryHandle = await window.showDirectoryPicker();
      const items = await collectCsvFilesFromDirectory(directoryHandle);
      setItemsAndTree(items);

      if (items.length === 0) {
        markStatus("No CSV files found in selected folder.");
      } else {
        markStatus(`Loaded ${items.length} CSV file(s). Double-click one to open.`);
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        markStatus("Folder selection canceled.");
        return;
      }
      markStatus(`Unable to load folder: ${error.message || "Unknown error"}`);
    }
  }

  function handleFallbackFileSelection(event) {
    if (!ensureUnsavedChangesHandled()) {
      event.target.value = "";
      return;
    }

    const files = Array.from(event.target.files || []).filter((file) =>
      file.name.toLowerCase().endsWith(".csv")
    );

    const items = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      name: file.name,
      path: file.webkitRelativePath || file.name,
      source: "file",
      file,
    }));

    setItemsAndTree(items);
    if (items.length === 0) {
      markStatus("No CSV files selected.");
      return;
    }

    markStatus(`Added ${items.length} CSV file(s). Double-click one to open.`);
  }

  async function openFileItem(item) {
    if (!ensureUnsavedChangesHandled()) {
      return;
    }

    try {
      const file = item.source === "handle" ? await item.handle.getFile() : item.file;
      const text = await file.text();

      const parsed = Papa.parse(text, {
        skipEmptyLines: false,
      });

      if (parsed.errors?.length) {
        markStatus(`Opened with parser warnings: ${parsed.errors[0].message}`);
      }

      const normalized = normalizeGrid(parsed.data);
      setGrid(normalized);
      setDocName(item.name);
      setActiveFileHandle(item.source === "handle" ? item.handle : null);
      setIsDocumentOpen(true);
      setDirty(false);
      setEditingCell(null);

      if (!parsed.errors?.length) {
        markStatus(`Opened ${item.path}`);
      }
    } catch (error) {
      markStatus(`Failed to open file: ${error.message || "Unknown error"}`);
    }
  }

  function startEdit(rowIndex, colIndex) {
    setEditingCell({
      rowIndex,
      colIndex,
      draft: grid[rowIndex]?.[colIndex] ?? "",
    });
  }

  function commitEdit() {
    if (!editingCell) {
      return;
    }

    const { rowIndex, colIndex, draft } = editingCell;
    setGrid((previousGrid) => {
      const next = previousGrid.map((row) => [...row]);
      if (!next[rowIndex]) {
        next[rowIndex] = Array(tableColumnCount).fill("");
      }
      next[rowIndex][colIndex] = draft;
      return next;
    });
    setDirty(true);
    setEditingCell(null);
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  function updateDraft(value) {
    setEditingCell((current) => {
      if (!current) {
        return current;
      }
      return { ...current, draft: value };
    });
  }

  function createNewFile() {
    if (!ensureUnsavedChangesHandled()) {
      return;
    }

    setGrid(createEmptyGrid());
    setDocName("Untitled.csv");
    setActiveFileHandle(null);
    setIsDocumentOpen(true);
    setDirty(false);
    setEditingCell(null);
    markStatus("Created new CSV document.");
  }

  function addRow() {
    setGrid((previousGrid) => {
      const colCount = Math.max(1, ...previousGrid.map((row) => row.length), tableColumnCount);
      return [...previousGrid.map((row) => [...row]), Array(colCount).fill("")];
    });
    setDirty(true);
    setEditingCell(null);
    setIsDocumentOpen(true);
  }

  function clearRow(rowIndex) {
    setGrid((previousGrid) => {
      const colCount = Math.max(1, ...previousGrid.map((row) => row.length), tableColumnCount);
      return previousGrid.map((row, index) =>
        index === rowIndex ? Array(colCount).fill("") : [...row, ...Array(colCount - row.length).fill("")]
      );
    });
    setDirty(true);
    setEditingCell(null);
    setIsDocumentOpen(true);
  }

  function removeLastRow() {
    setGrid((previousGrid) => {
      if (previousGrid.length <= 1) {
        return previousGrid;
      }
      return previousGrid.slice(0, -1).map((row) => [...row]);
    });
    setDirty(true);
    setEditingCell(null);
    setIsDocumentOpen(true);
  }

  function deleteRow(rowIndex) {
    setGrid((previousGrid) => {
      if (previousGrid.length <= 1) {
        const colCount = Math.max(1, ...previousGrid.map((row) => row.length), tableColumnCount);
        return [Array(colCount).fill("")];
      }

      return previousGrid
        .filter((_, index) => index !== rowIndex)
        .map((row) => [...row]);
    });
    setDirty(true);
    setEditingCell(null);
    setIsDocumentOpen(true);
  }

  function addColumn() {
    setGrid((previousGrid) => {
      if (previousGrid.length === 0) {
        return [Array(1).fill("")];
      }
      return previousGrid.map((row) => [...row, ""]);
    });
    setDirty(true);
    setEditingCell(null);
    setIsDocumentOpen(true);
  }

  function clearColumn(colIndex) {
    setGrid((previousGrid) => {
      const colCount = Math.max(1, ...previousGrid.map((row) => row.length), tableColumnCount);
      return previousGrid.map((row) => {
        const padded = [...row, ...Array(colCount - row.length).fill("")];
        padded[colIndex] = "";
        return padded;
      });
    });
    setDirty(true);
    setEditingCell(null);
    setIsDocumentOpen(true);
  }

  function removeLastColumn() {
    setGrid((previousGrid) => {
      const colCount = Math.max(1, ...previousGrid.map((row) => row.length));
      if (colCount <= 1) {
        return previousGrid;
      }

      return previousGrid.map((row) => row.slice(0, colCount - 1));
    });
    setDirty(true);
    setEditingCell(null);
    setIsDocumentOpen(true);
  }

  function deleteColumn(colIndex) {
    setGrid((previousGrid) => {
      const colCount = Math.max(1, ...previousGrid.map((row) => row.length), tableColumnCount);
      if (colCount <= 1) {
        return previousGrid.map(() => [""]);
      }

      return previousGrid.map((row) => {
        const padded = [...row, ...Array(colCount - row.length).fill("")];
        return padded.filter((_, index) => index !== colIndex);
      });
    });
    setDirty(true);
    setEditingCell(null);
    setIsDocumentOpen(true);
  }

  async function copyRow(rowIndex) {
    try {
      const row = grid[rowIndex] || [];
      const csvText = gridToCsv([row]);
      await navigator.clipboard.writeText(csvText);
      markStatus(`Copied row ${rowIndex + 1}.`);
    } catch (error) {
      markStatus(`Copy row failed: ${error.message || "Clipboard unavailable"}`);
    }
  }

  async function copyColumn(colIndex) {
    try {
      const columnMatrix = grid.map((row) => [row[colIndex] ?? ""]);
      const csvText = gridToCsv(columnMatrix);
      await navigator.clipboard.writeText(csvText);
      markStatus(`Copied column ${getColumnLabel(colIndex)}.`);
    } catch (error) {
      markStatus(`Copy column failed: ${error.message || "Clipboard unavailable"}`);
    }
  }

  async function pasteRow(rowIndex) {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = Papa.parse(text, { skipEmptyLines: false }).data;
      const incomingRow = Array.isArray(parsed?.[0]) ? parsed[0].map((value) => `${value ?? ""}`) : [""];

      setGrid((previousGrid) => {
        const targetCols = Math.max(
          tableColumnCount,
          incomingRow.length,
          ...previousGrid.map((row) => row.length)
        );

        return previousGrid.map((row, index) => {
          const padded = [...row, ...Array(targetCols - row.length).fill("")];
          if (index !== rowIndex) {
            return padded;
          }
          const nextRow = Array(targetCols).fill("");
          for (let i = 0; i < incomingRow.length; i += 1) {
            nextRow[i] = incomingRow[i] ?? "";
          }
          return nextRow;
        });
      });

      setDirty(true);
      setEditingCell(null);
      setIsDocumentOpen(true);
      markStatus(`Pasted into row ${rowIndex + 1}.`);
    } catch (error) {
      markStatus(`Paste row failed: ${error.message || "Clipboard unavailable"}`);
    }
  }

  async function pasteColumn(colIndex) {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = Papa.parse(text, { skipEmptyLines: false }).data;
      const incomingValues = parsed
        .map((row) => (Array.isArray(row) ? `${row[0] ?? ""}` : ""));

      if (incomingValues.length === 0) {
        incomingValues.push("");
      }

      setGrid((previousGrid) => {
        const baseRows = previousGrid.length;
        const targetRows = Math.max(baseRows, incomingValues.length);
        const colCount = Math.max(1, ...previousGrid.map((row) => row.length), tableColumnCount, colIndex + 1);

        return Array.from({ length: targetRows }, (_, rowIndex) => {
          const sourceRow = previousGrid[rowIndex] || Array(colCount).fill("");
          const padded = [...sourceRow, ...Array(colCount - sourceRow.length).fill("")];
          padded[colIndex] = incomingValues[rowIndex] ?? "";
          return padded;
        });
      });

      setDirty(true);
      setEditingCell(null);
      setIsDocumentOpen(true);
      markStatus(`Pasted into column ${getColumnLabel(colIndex)}.`);
    } catch (error) {
      markStatus(`Paste column failed: ${error.message || "Clipboard unavailable"}`);
    }
  }

  function openHeaderMenu(event, type, index) {
    event.stopPropagation();
    setHeaderMenu({
      type,
      index,
      x: event.clientX,
      y: event.clientY,
    });
  }

  async function handleHeaderAction(action) {
    if (!headerMenu) {
      return;
    }

    const { type, index } = headerMenu;
    setHeaderMenu(null);

    if (type === "row") {
      if (action === "copy") {
        await copyRow(index);
      }
      if (action === "cut") {
        await copyRow(index);
        deleteRow(index);
      }
      if (action === "delete") {
        deleteRow(index);
      }
      if (action === "paste") {
        await pasteRow(index);
      }
      return;
    }

    if (action === "copy") {
      await copyColumn(index);
    }
    if (action === "cut") {
      await copyColumn(index);
      deleteColumn(index);
    }
    if (action === "delete") {
      deleteColumn(index);
    }
    if (action === "paste") {
      await pasteColumn(index);
    }
  }

  async function writeToHandle(handle, csvText) {
    const writable = await handle.createWritable();
    await writable.write(csvText);
    await writable.close();
  }

  function triggerDownload(csvText, filename) {
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function saveAs() {
    if (!isDocumentOpen) {
      markStatus("Nothing to save.");
      return;
    }

    const csvText = gridToCsv(grid);

    try {
      if ("showSaveFilePicker" in window) {
        const newHandle = await window.showSaveFilePicker({
          suggestedName: docName || "Untitled.csv",
          types: [
            {
              description: "CSV Files",
              accept: {
                "text/csv": [".csv"],
              },
            },
          ],
        });

        await writeToHandle(newHandle, csvText);
        setActiveFileHandle(newHandle);
        setDocName(newHandle.name || docName);
        setDirty(false);
        markStatus("File saved successfully (Save As).");
        return;
      }

      triggerDownload(csvText, docName || "Untitled.csv");
      setDirty(false);
      markStatus("CSV downloaded (browser fallback Save As).");
    } catch (error) {
      if (error?.name === "AbortError") {
        markStatus("Save As canceled.");
        return;
      }
      markStatus(`Save As failed: ${error.message || "Unknown error"}`);
    }
  }

  async function save() {
    if (!isDocumentOpen) {
      markStatus("Nothing to save.");
      return;
    }

    const csvText = gridToCsv(grid);

    try {
      if (activeFileHandle) {
        await writeToHandle(activeFileHandle, csvText);
        setDirty(false);
        markStatus("File saved successfully.");
        return;
      }

      markStatus("No write handle available. Falling back to Save As.");
      await saveAs();
    } catch (error) {
      markStatus(`Save failed: ${error.message || "Unknown error"}`);
    }
  }

  function renderTreeNode(node, depth = 0) {
    if (node.type === "dir") {
      const isExpanded = Boolean(expandedDirs[node.path]);

      return (
        <li key={`dir-${node.path}`}>
          <button
            type="button"
            className="tree-node tree-dir tree-dir-button"
            style={{ paddingLeft: `${8 + depth * 14}px` }}
            onClick={() => toggleDirectory(node.path)}
            aria-expanded={isExpanded}
          >
            <span className="tree-caret">{isExpanded ? "▾" : "▸"}</span>
            <span className="tree-label">{node.name}</span>
          </button>
          {isExpanded && (
            <ul className="tree-children">
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li key={node.id}>
        <button
          type="button"
          className="tree-node tree-file"
          onDoubleClick={() => openFileItem(node.item)}
          onClick={() => markStatus(`Double-click to open ${node.path}`)}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          title={node.path}
        >
          {node.name}
        </button>
      </li>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>CSV Editor</h1>
        <div className="sidebar-actions">
          <button type="button" onClick={handlePickDirectory}>
            Pick Folder
          </button>
          <button
            type="button"
            onClick={() => fallbackInputRef.current?.click()}
            title="Fallback for browsers without folder picker"
          >
            Add CSV Files
          </button>
          <input
            ref={fallbackInputRef}
            type="file"
            accept=".csv,text/csv"
            multiple
            onChange={handleFallbackFileSelection}
            style={{ display: "none" }}
          />
        </div>

        <div className="file-list-header">Folders / CSV</div>
        <ul className="file-list" role="tree" aria-label="CSV folder tree">
          {fileItems.length === 0 && <li className="empty-note">No CSV folders loaded yet.</li>}
          {fileTree.map((node) => renderTreeNode(node))}
        </ul>
      </aside>

      <main className="main-pane">
        <header className="toolbar">
          <div className="doc-title">
            <strong>{docName}</strong>
            {dirty ? <span className="dirty-tag">Unsaved changes</span> : <span>Saved</span>}
          </div>
          <div className="toolbar-actions">
            <button type="button" onClick={createNewFile}>
              New File
            </button>
            <button type="button" onClick={save} disabled={!canSave}>
              Save
            </button>
            <button type="button" onClick={saveAs} disabled={!canSaveAs}>
              Save As
            </button>
            <button type="button" onClick={addRow}>
              + Row
            </button>
            <button type="button" onClick={removeLastRow}>
              - Row
            </button>
            <button type="button" onClick={addColumn}>
              + Column
            </button>
            <button type="button" onClick={removeLastColumn}>
              - Column
            </button>
          </div>
        </header>

        <section className="status-bar" aria-live="polite">
          {status}
        </section>

        <section className="grid-wrapper">
          <table className="csv-grid">
            <thead>
              <tr>
                <th>#</th>
                {Array.from({ length: tableColumnCount }).map((_, colIndex) => (
                  <th key={`head-${colIndex}`}>
                    <button
                      type="button"
                      className="header-trigger"
                      onClick={(event) => openHeaderMenu(event, "column", colIndex)}
                    >
                      {getColumnLabel(colIndex)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  <th>
                    <button
                      type="button"
                      className="header-trigger row-header-trigger"
                      onClick={(event) => openHeaderMenu(event, "row", rowIndex)}
                    >
                      {rowIndex + 1}
                    </button>
                  </th>
                  {Array.from({ length: tableColumnCount }).map((_, colIndex) => {
                    const isEditing =
                      editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex;
                    const value = row[colIndex] ?? "";

                    return (
                      <td
                        key={`cell-${rowIndex}-${colIndex}`}
                        onDoubleClick={() => startEdit(rowIndex, colIndex)}
                        title={value}
                      >
                        {isEditing ? (
                          <input
                            className="cell-input"
                            autoFocus
                            value={editingCell.draft}
                            onChange={(event) => updateDraft(event.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                commitEdit();
                              }
                              if (event.key === "Escape") {
                                cancelEdit();
                              }
                            }}
                          />
                        ) : (
                          <span className="cell-text">{value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {headerMenu && (
            <div
              className="header-menu"
              style={{ left: `${headerMenu.x}px`, top: `${headerMenu.y}px` }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" onClick={() => handleHeaderAction("copy")}>Copy</button>
              <button type="button" onClick={() => handleHeaderAction("cut")}>Cut</button>
              <button type="button" onClick={() => handleHeaderAction("delete")}>Delete</button>
              <button type="button" onClick={() => handleHeaderAction("paste")}>Paste</button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
