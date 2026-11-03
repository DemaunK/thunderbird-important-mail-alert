// Open the options page when clicking the toolbar icon
if (browser.action) {
  browser.action.onClicked.addListener(() => {
    browser.runtime.openOptionsPage();
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

  // Retrieve email addresses (identities) of the target mailbox
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
    // Check 1: Match against target Thunderbird account identity
    let isTarget = accountEmails.some(acc => importantEmails.includes(acc));
    
    // Check 2: Fallback check against message recipients (To / CC)
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

  // Calculate coordinates taking the Windows taskbar into account
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
  const msgParam =