// Color mapping pairs for [Dark theme] / [Light theme]
const THEME_MAP = {
  blue:    { dark: { bg: "#2b3640", text: "#e2e8f0", title: "#64b5f6", border: "rgba(255,255,255,0.12)", closeBg: "rgba(255,255,255,0.08)" }, light: { bg: "#e2edf8", text: "#1e293b", title: "#1e40af", border: "rgba(0,0,0,0.1)", closeBg: "rgba(0,0,0,0.05)" } },
  ocean:   { dark: { bg: "#1e3842", text: "#e2e8f0", title: "#4dd0e1", border: "rgba(255,255,255,0.12)", closeBg: "rgba(255,255,255,0.08)" }, light: { bg: "#e0f2f1", text: "#0f172a", title: "#00695c", border: "rgba(0,0,0,0.1)", closeBg: "rgba(0,0,0,0.05)" } },
  emerald: { dark: { bg: "#1e3831", text: "#e2e8f0", title: "#81c784", border: "rgba(255,255,255,0.12)", closeBg: "rgba(255,255,255,0.08)" }, light: { bg: "#e8f5e9", text: "#0f172a", title: "#2e7d32", border: "rgba(0,0,0,0.1)", closeBg: "rgba(0,0,0,0.05)" } },
  olive:   { dark: { bg: "#2c3323", text: "#e2e8f0", title: "#aed581", border: "rgba(255,255,255,0.12)", closeBg: "rgba(255,255,255,0.08)" }, light: { bg: "#f1f8e9", text: "#141e0b", title: "#3f6212", border: "rgba(0,0,0,0.1)", closeBg: "rgba(0,0,0,0.05)" } },
  bronze:  { dark: { bg: "#382d24", text: "#e2e8f0", title: "#ffb74d", border: "rgba(255,255,255,0.12)", closeBg: "rgba(255,255,255,0.08)" }, light: { bg: "#efebe9", text: "#1c1917", title: "#78350f", border: "rgba(0,0,0,0.1)", closeBg: "rgba(0,0,0,0.05)" } },
  wine:    { dark: { bg: "#3d262b", text: "#e2e8f0", title: "#f06292", border: "rgba(255,255,255,0.12)", closeBg: "rgba(255,255,255,0.08)" }, light: { bg: "#fce4ec", text: "#1c1917", title: "#9d174d", border: "rgba(0,0,0,0.1)", closeBg: "rgba(0,0,0,0.05)" } },
  purple:  { dark: { bg: "#35263b", text: "#e2e8f0", title: "#ba68c8", border: "rgba(255,255,255,0.12)", closeBg: "rgba(255,255,255,0.08)" }, light: { bg: "#f3e5f5", text: "#1e1b4b", title: "#6b21a8", border: "rgba(0,0,0,0.1)", closeBg: "rgba(0,0,0,0.05)" } },
  navy:    { dark: { bg: "#212836", text: "#e2e8f0", title: "#7986cb", border: "rgba(255,255,255,0.12)", closeBg: "rgba(255,255,255,0.08)" }, light: { bg: "#e8eaf6", text: "#0f172a", title: "#3730a3", border: "rgba(0,0,0,0.1)", closeBg: "rgba(0,0,0,0.05)" } },
  steel:   { dark: { bg: "#30343a", text: "#e2e8f0", title: "#90a4ae", border: "rgba(255,255,255,0.12)", closeBg: "rgba(255,255,255,0.08)" }, light: { bg: "#eceff1", text: "#1e293b", title: "#374151", border: "rgba(0,0,0,0.1)", closeBg: "rgba(0,0,0,0.05)" } },
  slate:   { dark: { bg: "#1c2530", text: "#e2e8f0", title: "#5eead4", border: "rgba(255,255,255,0.12)", closeBg: "rgba(255,255,255,0.08)" }, light: { bg: "#e6f4f8", text: "#0f172a", title: "#0e7490", border: "rgba(0,0,0,0.1)", closeBg: "rgba(0,0,0,0.05)" } }
};

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Localize static UI elements
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const msg = browser.i18n.getMessage(el.getAttribute("data-i18n"));
    if (msg) el.textContent = msg;
  });

  const urlParams = new URLSearchParams(window.location.search);
  const colorId = urlParams.get("colorId") || "blue";

  // 2. Detect system theme (Dark vs Light)
  const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const themeGroup = THEME_MAP[colorId] || THEME_MAP.blue;
  const activeTheme = isDark ? themeGroup.dark : themeGroup.light;

  // Apply CSS custom properties dynamically to the card
  const root = document.documentElement;
  root.style.setProperty("--card-bg", activeTheme.bg);
  root.style.setProperty("--text-main", activeTheme.text);
  root.style.setProperty("--title-color", activeTheme.title);
  root.style.setProperty("--border-color", activeTheme.border);
  root.style.setProperty("--btn-close-bg", activeTheme.closeBg);

  // 3. Populate mail info
  document.getElementById("author").textContent = urlParams.get("author") || browser.i18n.getMessage("unknownSender");
  document.getElementById("subject").textContent = urlParams.get("subject") || browser.i18n.getMessage("noSubject");

  // 4. Play audio if configured
  try {
    const data = await browser.storage.local.get({ enableSound: false, audioData: null });
    if (data.enableSound && data.audioData) {
      new Audio(data.audioData).play().catch(() => {});
    }
  } catch (e) {}

  // 5. Open email action
  const messageId = parseInt(urlParams.get("messageId"), 10);
  const openBtn = document.getElementById("openBtn");

  if (!messageId) {
    openBtn.textContent = browser.i18n.getMessage("btnGotIt");
  }

  openBtn.addEventListener("click", async () => {
    if (messageId) {
      try {
        await browser.messageDisplay.open({ messageId: messageId });
        const allWins = await browser.windows.getAll({ windowTypes: ["normal"] });
        if (allWins.length > 0) {
          await browser.windows.update(allWins[0].id, { focused: true });
        }
      } catch (err) {
        console.error("[AlertPlugin] Failed to display message:", err);
      }
    }
    window.close();
  });

  // 6. Close button
  document.getElementById("closeBtn").addEventListener("click", () => {
    window.close();
  });
});