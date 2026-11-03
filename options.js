const PALETTE = [
  { id: "blue",     preview: "#2b3640" },
  { id: "ocean",    preview: "#1e3842" },
  { id: "emerald",  preview: "#1e3831" },
  { id: "purple",   preview: "#35263b" },
  { id: "wine",     preview: "#3d262b" },
  { id: "bronze",   preview: "#382d24" },
  { id: "navy",     preview: "#212836" },
  { id: "olive",    preview: "#2c3323" },
  { id: "steel",    preview: "#30343a" },
  { id: "slate",    preview: "#1c2530" }
];

let savedAudioData = null;
let selectedColorId = "blue";

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

  // 2. Render color palette swatches
  const paletteContainer = document.getElementById("palette");
  paletteContainer.innerHTML = "";
  PALETTE.forEach(c => {
    const el = document.createElement("div");
    el.className = "color-swatch" + (c.id === selectedColorId ? " active" : "");
    el.style.backgroundColor = c.preview;
    el.title = browser.i18n.getMessage("color_" + c.id);
    el.addEventListener("click", () => {
      selectedColorId = c.id;
      document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      el.classList.add("active");
    });
    paletteContainer.appendChild(el);
  });

  // 3. Load connected Thunderbird accounts
  const accountsContainer = document.getElementById("accountsList");
  accountsContainer.innerHTML = `<i>${browser.i18n.getMessage("loadingAccounts")}</i>`;

  try {
    const accounts = await browser.accounts.list();
    if (accounts.length === 0) {
      accountsContainer.innerHTML = `<i>${browser.i18n.getMessage("noAccounts")}</i>`;
      return;
    }
    accountsContainer.innerHTML = "";
    accounts.forEach(acc => {
      if (!acc.identities) return;
      acc.identities.forEach(identity => {
        if (!identity.email) return;
        const emailLower = identity.email.toLowerCase().trim();
        const isChecked = data.importantEmails.includes(emailLower);

        const row = document.createElement("div");
        row.className = "account-item";
        row.innerHTML = `
          <input type="checkbox" id="chk_${emailLower}" value="${emailLower}" ${isChecked ? "checked" : ""}>
          <label for="chk_${emailLower}" style="cursor: pointer;">
            <span class="account-name">${acc.name}</span>
            <span class="account-email">(${identity.email})</span>
          </label>
        `;
        accountsContainer.appendChild(row);
      });
    });
  } catch (err) {
    accountsContainer.innerHTML = `<span style="color:red">${browser.i18n.getMessage("accountsError")}${err.message}</span>`;
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