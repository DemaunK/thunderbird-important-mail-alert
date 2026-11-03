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
      el.class