// Universal handler for toolbar button click (compatible with both browser.action and browser.browserAction)
const actionApi = browser.action || browser.browserAction;
if (actionApi) {
  actionApi.onClicked.addListener(async () => {
    try {
      await browser.runtime.openOptionsPage();
    } catch (err) {
      console.warn("[AlertPlugin] openOptionsPage failed, opening popup window fallback:", err);
      await browser.windows.create({
        url: browser.runtime.getURL("options.html"),
        type: "popup",
        width: 680,
        height: 600
      });
    }
  });
}

// Handle test alert window requests from the options page
browser.runtime.onMessage.addListener((request) => {
  if (request.action === "testAlert") {
    spawnAlertWindow("Test Sender <test@domain.com>", "Alert Window Test", null, request.colorId);
  }
});

// Primary listener for incoming messages (monitors all folders)
browser.messages.onNewMailReceived.addListener(async (folder, messageList) => {
  if (!messageList || !messageList.messages) return;

  const data = await browser.storage.local.get({ importantEmails: [] });
  const importantEmails = (data.importantEmails || []).map(e => e.toLowerCase().trim());
  if (importantEmails.length === 0) return;

  let accountEmails = [];
  if (folder && folder.accountId) {
    try {
      const account = await browser.accounts.get(folder.accountId);
      if (account && account.identities) {
        accountEmails = account.identities.map(id => (id.email || "").toLowerCase().trim());
      }
    } catch (e) {
      console.error("[AlertPlugin] Failed to read account identities:", e);
    }
  }

  for (const msg of messageList.messages) {
    let isTarget = accountEmails.some(acc => importantEmails.includes(acc));

    if (!isTarget && msg.recipients) {
      const rec = msg.recipients.join(" ").toLowerCase();
      isTarget = importantEmails.some(target => rec.includes(target));
    }

    if (isTarget) {
      await spawnAlertWindow(msg.author, msg.subject, msg.id);
      break;
    }
  }
}, true);

// Create the alert window positioned at the bottom-right of the screen
async function spawnAlertWindow(author, subject, messageId, customColorId = null) {
  const data = await browser.storage.local.get({ alertColorId: "blue" });

  const winWidth = 440;
  const winHeight = 210;
  const margin = 20;

  const screenWidth = screen.availWidth || 1920;
  const screenHeight = screen.availHeight || 1080;
  const screenLeft = screen.availLeft || 0;
  const screenTop = screen.availTop || 0;

  const posX = Math.round(screenLeft + screenWidth - winWidth - margin);
  const posY = Math.round(screenTop + screenHeight - winHeight - margin);

  const authorEnc = encodeURIComponent(author || "");
  const subjectEnc = encodeURIComponent(subject || "");
  const activeColorId = customColorId || data.alertColorId || "blue";
  const colorId = encodeURIComponent(activeColorId);
  const msgParam = messageId ? `&messageId=${messageId}` : "";

  const targetUrl = browser.runtime.getURL(
    `alert.html?author=${authorEnc}&subject=${subjectEnc}&colorId=${colorId}${msgParam}`
  );

  try {
    const win = await browser.windows.create({
      url: targetUrl,
      type: "popup",
      width: winWidth,
      height: winHeight,
      left: posX,
      top: posY
    });

    await browser.windows.update(win.id, { drawAttention: true });
  } catch (err) {
    console.error("[AlertPlugin] Failed to create alert window:", err);
  }
}