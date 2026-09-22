(() => {
  const DISCLAIMER_KEY = "sotf-inventory-disclaimer-v1";
  const SAVES_PATH = "%USERPROFILE%\\AppData\\LocalLow\\Endnight\\SonsOfTheForest\\Saves";
  const INVENTORY_FILE = "PlayerInventorySaveData.json";
  const KEEP_ON_CLEAR = new Set([351, 379, 380, 402, 412, 413, 483, 486, 552, 589]);

  const $ = (id) => document.getElementById(id);
  const els = {
    dropZone: $("dropZone"),
    dropTarget: $("dropTarget"),
    loaderTitle: $("loaderTitle"),
    loaderStatus: $("loaderStatus"),
    browseBtn: $("browseBtn"),
    fileInput: $("fileInput"),
    copyPathBtn: $("copyPathBtn"),
    copyCmdBtn: $("copyCmdBtn"),
    helperCmd: $("helperCmd"),
    search: $("search"),
    category: $("category"),
    ownedOnly: $("ownedOnly"),
    resultCount: $("resultCount"),
    rows: $("rows"),
    table: $("inventory"),
    emptyState: $("emptyState"),
    changeSummary: $("changeSummary"),
    resetBtn: $("resetBtn"),
    clearBtn: $("clearBtn"),
    saveBtn: $("saveBtn"),
    disclaimer: $("disclaimer"),
    disclaimerOk: $("disclaimerOk"),
    saveDialog: $("saveDialog"),
    saveFileName: $("saveFileName"),
    saveCancel: $("saveCancel"),
    saveConfirm: $("saveConfirm"),
    toast: $("toast"),
    toolbar: document.querySelector(".toolbar")
  };

  const state = {
    items: new Map(),
    sortKey: "count",
    sortDir: -1,
    query: "",
    category: "",
    ownedOnly: false,
    source: null
  };

  function buildCatalog() {
    state.items.clear();
    for (const [id, name, category, max] of SOTF_ITEMS) {
      state.items.set(id, { id, name, category, max, count: 0, original: 0, equipped: false, known: true });
    }
  }

  function fillCategories() {
    const cats = [...new Set(SOTF_ITEMS.map((i) => i[2]))].sort();
    for (const c of cats) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      els.category.appendChild(opt);
    }
  }

  function ensureUnknownCategory() {
    const hasUnknown = [...state.items.values()].some((i) => !i.known);
    const existing = els.category.querySelector('option[value="Unknown"]');
    if (hasUnknown && !existing) {
      const opt = document.createElement("option");
      opt.value = "Unknown";
      opt.textContent = "Unknown";
      els.category.appendChild(opt);
    } else if (!hasUnknown && existing) {
      existing.remove();
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function clamp(value, max) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, max);
  }

  function visibleItems() {
    const q = state.query.trim().toLowerCase();
    const qNum = /^\d+$/.test(q) ? Number(q) : null;
    const list = [...state.items.values()].filter((i) => {
      if (state.category && i.category !== state.category) return false;
      if (state.ownedOnly && i.count === 0 && !i.equipped) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q) || (qNum !== null && i.id === qNum);
    });
    const dir = state.sortDir;
    const key = state.sortKey;
    list.sort((a, b) => {
      let r;
      if (key === "name" || key === "category") r = a[key].localeCompare(b[key]);
      else r = a[key] - b[key];
      if (r === 0) r = key === "name" ? a.id - b.id : a.name.localeCompare(b.name);
      else r *= dir;
      return r;
    });
    return list;
  }

  function rowHtml(i) {
    const locked = i.equipped;
    const pills = [];
    if (i.equipped) pills.push('<span class="pill">equipped</span>');
    if (!i.known) pills.push('<span class="pill pill-warn" title="Not in the item list. Keep it as is unless you know what it is.">unknown</span>');
    return `<tr data-id="${i.id}" class="${rowClass(i)}">
      <td class="cell-name">${escapeHtml(i.name)}${pills.join("")}</td>
      <td class="cell-cat">${escapeHtml(i.category)}</td>
      <td class="cell-id">${i.id}</td>
      <td class="cell-count">
        <div class="stepper">
          <button type="button" data-step="-1" aria-label="Remove one ${escapeHtml(i.name)}" ${locked || i.count <= 0 ? "disabled" : ""}>-</button>
          <input type="number" inputmode="numeric" min="0" max="${i.max}" value="${i.count}" aria-label="${escapeHtml(i.name)} count" ${locked ? "disabled" : ""}>
          <button type="button" data-step="1" aria-label="Add one ${escapeHtml(i.name)}" ${locked || i.count >= i.max ? "disabled" : ""}>+</button>
        </div>
      </td>
      <td class="cell-max"><button type="button" class="btn-link" data-fill ${locked || i.count >= i.max ? "disabled" : ""}>Fill</button>${i.max.toLocaleString()}</td>
    </tr>`;
  }

  function rowClass(i) {
    const c = [];
    if (i.count !== i.original) c.push("changed");
    if (i.count === 0 && !i.equipped) c.push("zero");
    return c.join(" ");
  }

  function render() {
    const list = visibleItems();
    els.rows.innerHTML = list.map(rowHtml).join("");
    els.emptyState.hidden = list.length > 0;
    els.resultCount.textContent = `${list.length} of ${state.items.size} items`;
    for (const th of els.table.querySelectorAll("th[data-sort]")) {
      if (th.dataset.sort === state.sortKey) th.setAttribute("aria-sort", state.sortDir === 1 ? "ascending" : "descending");
      else th.removeAttribute("aria-sort");
    }
    updateSummary();
  }

  function updateRow(i) {
    const tr = els.rows.querySelector(`tr[data-id="${i.id}"]`);
    if (!tr) return;
    tr.className = rowClass(i);
    const input = tr.querySelector("input");
    if (document.activeElement !== input || Number(input.value) !== i.count) input.value = i.count;
    tr.querySelector('[data-step="-1"]').disabled = i.equipped || i.count <= 0;
    tr.querySelector('[data-step="1"]').disabled = i.equipped || i.count >= i.max;
    tr.querySelector("[data-fill]").disabled = i.equipped || i.count >= i.max;
  }

  function changedItems() {
    return [...state.items.values()].filter((i) => i.count !== i.original);
  }

  function clearableItems() {
    return [...state.items.values()].filter((i) => !i.equipped && !KEEP_ON_CLEAR.has(i.id));
  }

  function updateSummary() {
    const n = changedItems().length;
    els.changeSummary.textContent = n === 0 ? "No changes" : `${n} item${n === 1 ? "" : "s"} changed`;
    els.changeSummary.classList.toggle("has-changes", n > 0);
    els.resetBtn.disabled = n === 0;
    els.clearBtn.disabled = !clearableItems().some((i) => i.count > 0);
    els.saveBtn.disabled = !state.source || n === 0;
    els.saveBtn.title = state.source ? "" : "Load a save first";
  }

  function setCount(id, value) {
    const i = state.items.get(id);
    if (!i || i.equipped) return;
    i.count = clamp(value, i.max);
    updateRow(i);
    updateSummary();
  }

  let toastTimer;
  function toast(msg, isError) {
    els.toast.textContent = msg;
    els.toast.classList.toggle("error", !!isError);
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), isError ? 7000 : 4500);
  }

  function parseInventory(text) {
    let outer;
    try {
      outer = JSON.parse(text);
    } catch {
      throw new Error(`${INVENTORY_FILE} isn't valid JSON. The save may be damaged.`);
    }
    const raw = outer && outer.Data && outer.Data.PlayerInventory;
    if (raw === undefined) throw new Error(`${INVENTORY_FILE} has no PlayerInventory data. This doesn't look like a Sons of the Forest save.`);
    const innerIsString = typeof raw === "string";
    const inner = innerIsString ? JSON.parse(raw) : raw;
    const blocks = inner && inner.ItemInstanceManagerData && inner.ItemInstanceManagerData.ItemBlocks;
    if (!Array.isArray(blocks)) throw new Error("The inventory has no item list. This save format isn't supported.");
    return { outer, inner, innerIsString };
  }

  function applyInventory(inner) {
    buildCatalog();
    const addUnknown = (id, count) => {
      const name = SOTF_NAMES[id] || `Unknown item ${id}`;
      const item = { id, name, category: "Unknown", max: Math.max(count, 1), count: 0, original: 0, equipped: false, known: false };
      state.items.set(id, item);
      return item;
    };
    for (const block of inner.ItemInstanceManagerData.ItemBlocks) {
      const id = Number(block.ItemId);
      const count = Math.max(0, Number(block.TotalCount) || 0);
      const item = state.items.get(id) || addUnknown(id, count);
      item.count += count;
      if (item.count > item.max) item.max = item.count;
    }
    if (Array.isArray(inner.EquippedItems)) {
      for (const block of inner.EquippedItems) {
        const id = Number(block.ItemId);
        const item = state.items.get(id) || addUnknown(id, 0);
        item.equipped = true;
      }
    }
    for (const item of state.items.values()) item.original = item.count;
    ensureUnknownCategory();
  }

  async function loadFile(file) {
    if (!file) return;
    try {
      const isJson = /\.json$/i.test(file.name);
      let zip = null;
      let path = INVENTORY_FILE;
      let text;
      if (isJson) {
        text = await file.text();
      } else {
        zip = await JSZip.loadAsync(file);
        const entry = Object.values(zip.files).find((f) => !f.dir && f.name.split("/").pop() === INVENTORY_FILE);
        if (!entry) throw new Error(`${file.name} has no ${INVENTORY_FILE}. Pick the SaveData.zip inside one of your save folders.`);
        path = entry.name;
        text = await entry.async("string");
      }
      const parsed = parseInventory(text);
      applyInventory(parsed.inner);
      state.source = { kind: isJson ? "json" : "zip", zip, path, fileName: isJson ? INVENTORY_FILE : "SaveData.zip", ...parsed };
      state.sortKey = "count";
      state.sortDir = -1;
      const owned = [...state.items.values()].filter((i) => i.count > 0).length;
      els.dropZone.classList.add("loaded");
      els.loaderTitle.textContent = `Loaded ${file.name}`;
      els.loaderStatus.textContent = `${owned} item types in your inventory. Drop another file to switch saves.`;
      render();
      toast(`Loaded ${file.name}`);
    } catch (err) {
      console.error(err);
      toast(err && err.message ? err.message : `Couldn't read ${file.name}.`, true);
    }
  }

  function buildInventoryText() {
    const { outer, inner, innerIsString } = state.source;
    const blocks = inner.ItemInstanceManagerData.ItemBlocks;
    const removed = new Set();
    for (const item of changedItems()) {
      if (item.equipped) continue;
      const matches = blocks.filter((b) => Number(b.ItemId) === item.id);
      if (item.count === 0) {
        removed.add(item.id);
        for (const b of matches) blocks.splice(blocks.indexOf(b), 1);
        continue;
      }
      if (matches.length === 0) {
        blocks.push({ ItemId: item.id, TotalCount: item.count, UniqueItems: [] });
        continue;
      }
      const [first, ...rest] = matches;
      first.TotalCount = item.count;
      if (Array.isArray(first.UniqueItems) && first.UniqueItems.length > item.count) {
        first.UniqueItems = first.UniqueItems.slice(0, item.count);
      }
      for (const b of rest) blocks.splice(blocks.indexOf(b), 1);
    }
    const slots = inner.QuickSelect && inner.QuickSelect.Slots;
    if (Array.isArray(slots) && removed.size) {
      inner.QuickSelect.Slots = slots.filter((s) => !(s && removed.has(Number(s.ItemId))));
    }
    outer.Data.PlayerInventory = innerIsString ? JSON.stringify(inner) : inner;
    return JSON.stringify(outer);
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function doSave() {
    try {
      const text = buildInventoryText();
      const src = state.source;
      let blob;
      if (src.kind === "zip") {
        src.zip.file(src.path, text);
        blob = await src.zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      } else {
        blob = new Blob([text], { type: "application/json" });
      }
      download(blob, src.fileName);
      for (const item of state.items.values()) item.original = item.count;
      render();
      toast(`Downloaded ${src.fileName}. Replace the file in your save folder, then start the game.`);
    } catch (err) {
      console.error(err);
      toast(`Couldn't build the new save: ${err.message}`, true);
    }
  }

  async function browse() {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          id: "sotf-saves",
          startIn: "documents",
          types: [{ description: "Sons of the Forest save", accept: { "application/zip": [".zip"], "application/json": [".json"] } }]
        });
        loadFile(await handle.getFile());
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    els.fileInput.value = "";
    els.fileInput.click();
  }

  function setToolbarOffset() {
    document.documentElement.style.setProperty("--toolbar-h", `${els.toolbar.offsetHeight}px`);
  }

  function bind() {
    els.copyPathBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(SAVES_PATH);
        toast("Path copied. Paste it into the file dialog's address bar, then open your SteamID and save folders.");
      } catch {
        toast("Couldn't copy. Select the path and copy it manually.", true);
      }
    });

    els.copyCmdBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(els.helperCmd.textContent.trim());
        toast("Command copied. Paste it into PowerShell and press Enter.");
      } catch {
        toast("Couldn't copy. Select the command and copy it manually.", true);
      }
    });

    els.browseBtn.addEventListener("click", browse);
    els.fileInput.addEventListener("change", () => loadFile(els.fileInput.files[0]));

    let dragDepth = 0;
    const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
    window.addEventListener("dragover", (e) => { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener("drop", (e) => { if (hasFiles(e)) e.preventDefault(); });
    els.dropZone.addEventListener("dragenter", (e) => {
      if (!hasFiles(e)) return;
      dragDepth++;
      els.dropZone.classList.add("dragging");
    });
    els.dropZone.addEventListener("dragleave", () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) els.dropZone.classList.remove("dragging");
    });
    els.dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dragDepth = 0;
      els.dropZone.classList.remove("dragging");
      loadFile(e.dataTransfer.files[0]);
    });
    els.dropTarget.addEventListener("click", browse);
    els.dropTarget.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        browse();
      }
    });

    let searchTimer;
    els.search.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.query = els.search.value; render(); }, 80);
    });
    els.category.addEventListener("change", () => { state.category = els.category.value; render(); });
    els.ownedOnly.addEventListener("change", () => { state.ownedOnly = els.ownedOnly.checked; render(); });

    els.table.querySelector("thead").addEventListener("click", (e) => {
      const th = e.target.closest("th[data-sort]");
      if (!th) return;
      const key = th.dataset.sort;
      if (state.sortKey === key) state.sortDir *= -1;
      else {
        state.sortKey = key;
        state.sortDir = key === "name" || key === "category" ? 1 : -1;
      }
      render();
    });

    els.rows.addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-id]");
      if (!tr) return;
      const id = Number(tr.dataset.id);
      const item = state.items.get(id);
      const step = e.target.closest("[data-step]");
      if (step) {
        const amount = Number(step.dataset.step) * (e.shiftKey ? 10 : 1);
        setCount(id, item.count + amount);
      } else if (e.target.closest("[data-fill]")) {
        setCount(id, item.max);
      }
    });

    els.rows.addEventListener("input", (e) => {
      if (e.target.tagName !== "INPUT") return;
      const id = Number(e.target.closest("tr").dataset.id);
      const item = state.items.get(id);
      if (e.target.value === "") return;
      const v = clamp(e.target.value, item.max);
      if (String(v) !== e.target.value) e.target.value = v;
      setCount(id, v);
    });

    els.rows.addEventListener("focusout", (e) => {
      if (e.target.tagName !== "INPUT") return;
      const id = Number(e.target.closest("tr").dataset.id);
      const item = state.items.get(id);
      if (item) e.target.value = item.count;
    });

    els.rows.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" && e.key === "Enter") e.target.blur();
    });

    els.resetBtn.addEventListener("click", () => {
      for (const item of state.items.values()) item.count = item.original;
      render();
    });

    els.clearBtn.addEventListener("click", () => {
      for (const item of clearableItems()) item.count = 0;
      render();
      toast("Inventory cleared. Equipped items and starting tools were kept. Use Undo changes to restore.");
    });

    els.saveBtn.addEventListener("click", () => {
      if (!state.source) return;
      els.saveFileName.textContent = state.source.fileName;
      els.saveDialog.showModal();
    });
    els.saveCancel.addEventListener("click", () => els.saveDialog.close());
    els.saveConfirm.addEventListener("click", () => {
      els.saveDialog.close();
      doSave();
    });

    els.disclaimerOk.addEventListener("click", () => {
      try { localStorage.setItem(DISCLAIMER_KEY, "1"); } catch {}
      els.disclaimer.close();
    });
    els.disclaimer.addEventListener("cancel", (e) => e.preventDefault());

    window.addEventListener("beforeunload", (e) => {
      if (changedItems().length) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    window.addEventListener("resize", setToolbarOffset);
  }

  function showDisclaimerIfNeeded() {
    let seen = false;
    try { seen = localStorage.getItem(DISCLAIMER_KEY) === "1"; } catch {}
    if (!seen) els.disclaimer.showModal();
  }

  buildCatalog();
  fillCategories();
  bind();
  render();
  setToolbarOffset();
  showDisclaimerIfNeeded();
})();
