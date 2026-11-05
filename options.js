// Vibrant rainbow swatches for the picker, mapped to their adaptive themes
const PALETTE = [
  { id: "blue",     dot: "#3b82f6", dark: { bg: "#2b3640", text: "#e2e8f0", title: "#64b5f6" }, light: { bg: "#e2edf8", text: "#1e293b", title: "#1e40af" } },
  { id: "ocean",    dot: "#06b6d4", dark: { bg: "#1e3842", text: "#e2e8f0", title: "#4dd0e1" }, light: { bg: "#e0f2f1", text: "#0f172a", title: "#00695c" } },
  { id: "emerald",  dot: "#10b981", dark: { bg: "#1e3831", text: "#e2e8f0", title: "#81c784" }, light: { bg: "#e8f5e9", text: "#0f172a", title: "#2e7d32" } },
  { id: "olive",    dot: "#84cc16", dark: { bg: "#2c3323", text: "#e2e8f0", title: "#aed581" }, light: { bg: "#f1f8e9", text: "#141e0b", title: "#3f6212" } },
  { id: "bronze",   dot: "#f59e0b", dark: { bg: "#382d24", text: "#e2e8f0", title: "#ffb74d" }, light: { bg: "#efebe9", text: "#1c1917", title: "#78350f" } },
  { id: "wine",     dot: "#ef4444", dark: { bg: "#3d262b", text: "#e2e8f0", title: "#f06292" }, light: { bg: "#fce4ec", text: "#1c1917", title: "#9d174d" } },
  { id: "purple",   dot: "#a855f7", dark: { bg: "#35263b", text: "#e2e8f0", title: "#ba68c8" }, light: { bg: "#f3e5f5", text: "#1e1b4b", title: "#6b21a8" } },
  { id: "navy",     dot: "#6366f1", dark: { bg: "#212836", text: "#e2e8f0", title: "#7986cb" }, light: { bg: "#e8eaf6", text: "#0f172a", title: "#3730a3" } },
  { id: "steel",    dot: "#64748b", dark: { bg: "#30343a", text: "#e2e8f0", title: "#90a4ae" }, light: { bg: "#eceff1", text: "#1e293b", title: "#374151" } },
  { id: "slate",    dot: "#0f172a", dark: { bg: "#1c2530", text: "#e2e8f0", title: "#5eead4" }, light: { bg: "#e6f4f8", text: "#0f172a", title: "#0e7490" } }
];

let savedAudioData = null;
let selectedColorId = "blue";

function updatePreview(colorId) {
  const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const item = PALETTE.find(c => c.id === colorId) || PALETTE[0];
  const theme = isDark ? item.dark : item.light;

  const card = document.getElementById("previewCard");
  const header = document.getElementById("prevHeader");
  if (card && header) {
    card.style.backgroundColor = theme.bg;
    card.style.color = theme.text;
    header.style.color = theme.title;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Localize static UI elements
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const msg = browser.i18n.getMessage(el.getAttribute("data-i18n"));
    if (msg) el.textContent = msg;
  });

  const defaultSoundName = browser.i18n.getMessage("soundDefault");

  const data = await browser.storage.local.get({
    importantEmails: [],
    manualEmails: [],
    enableSound: false,
    audioData: null,
    audioName: defaultSoundName,
    alertColorId: "blue"
  });

  document.getElementById("enableSound").checked = data.enableSound;
  document.getElementById("fileName").textContent = data.audioName || defaultSoundName;
  document.getElementById("emailsList").value = (data.manualEmails || []).join("\n");
  savedAudioData = data.audioData;
  selectedColorId = data.alertColorId || "blue";

  // 2. Render color swatches
  const paletteContainer = document.getElementById("palette");
  paletteContainer.replaceChildren();
  PALETTE.forEach(c => {
    const el = document.createElement("div");
    el.className = "color-swatch" + (c.id === selectedColorId ? " active" : "");
    el.style.backgroundColor = c.dot;
    el.title = browser.i18n.getMessage("color_" + c.id);
    el.addEventListener("click", () => {
      selectedColorId = c.id;
      document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      el.classList.add("active");
      updatePreview(c.id);
    });
    paletteContainer.appendChild(el);
  });

  // Init live preview card
  updatePreview(selectedColorId);

  // 3. Load connected Thunderbird accounts
  const accountsContainer = document.getElementById("accountsList");
  
  const loadingItalic = document.createElement("i");
  loadingItalic.textContent = browser.i18n.getMessage("loadingAccounts");
  accountsContainer.replaceChildren(loadingItalic);

  try {
    const accounts = await browser.accounts.list();
    if (accounts.length === 0) {
      const noAccItalic = document.createElement("i");
      noAccItalic.textContent = browser.i18n.getMessage("noAccounts");
      accountsContainer.replaceChildren(noAccItalic);
      return;
    }
    accountsContainer.replaceChildren();
    accounts.forEach(acc => {
      if (!acc.identities) return;
      acc.identities.forEach(identity => {
        if (!identity.email) return;
        const emailLower = identity.email.toLowerCase().trim();
        const isChecked = data.importantEmails.includes(emailLower);

        const row = document.createElement("div");
        row.className = "account-item";

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.id = "chk_" + emailLower;
        chk.value = emailLower;
        chk.checked = isChecked;

        const lbl = document.createElement("label");
        lbl.htmlFor = "chk_" + emailLower;
        lbl.style.cursor = "pointer";

        const nameSpan = document.createElement("span");
        nameSpan.className = "account-name";
        nameSpan.textContent = acc.name || "";

        const emailSpan = document.createElement("span");
        emailSpan.className = "account-email";
        emailSpan.textContent = ` (${identity.email})`;

        lbl.append(nameSpan, emailSpan);
        row.append(chk, lbl);
        accountsContainer.appendChild(row);
      });
    });
  } catch (err) {
    const errSpan = document.createElement("span");
    errSpan.style.color = "red";
    errSpan.textContent = browser.i18n.getMessage("accountsError") + (err.message || "");
    accountsContainer.replaceChildren(errSpan);
  }
});

// Audio file picker handler
document.getElementById("audioFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById("fileName").textContent = file.name;
  const reader = new FileReader();
  reader.onload = (event) => { savedAudioData = event.target.result; };
  reader.readAsDataURL(file);
});

// Test audio playback
document.getElementById("testAudioBtn").addEventListener("click", () => {
  if (savedAudioData) {
    new Audio(savedAudioData).play().catch(e => alert(browser.i18n.getMessage("soundError") + e.message));
  } else {
    alert(browser.i18n.getMessage("soundNotSelected"));
  }
});

// Test alert window with live color preview
document.getElementById("testWindowBtn").addEventListener("click", () => {
  browser.runtime.sendMessage({ 
    action: "testAlert", 
    colorId: selectedColorId 
  });
});

// Persist options to local storage
document.getElementById("saveBtn").addEventListener("click", async () => {
  const checkedBoxes = document.querySelectorAll("#accountsList input[type='checkbox']:checked");
  const selectedAccs = Array.from(checkedBoxes).map(cb => cb.value);

  const manualEmails = document.getElementById("emailsList").value
    .split("\n")
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);

  const allTargetEmails = Array.from(new Set([...selectedAccs, ...manualEmails]));

  await browser.storage.local.set({
    importantEmails: allTargetEmails,
    manualEmails: manualEmails,
    enableSound: document.getElementById("enableSound").checked,
    audioData: savedAudioData,
    audioName: document.getElementById("fileName").textContent,
    alertColorId: selectedColorId
  });

  const status = document.getElementById("status");
  status.textContent = browser.i18n.getMessage("savedSuccess");
  setTimeout(() => status.textContent = "", 2500);
});