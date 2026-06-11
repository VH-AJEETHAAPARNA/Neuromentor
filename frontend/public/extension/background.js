// Chrome SidePanel API activation on action click (extension icon)
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Listen for messages from content scripts to open the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_sidepanel" && sender.tab) {
    chrome.sidePanel.open({ tabId: sender.tab.id })
      .then(() => {
        sendResponse({ status: "opened" });
      })
      .catch((error) => {
        console.error("Error opening side panel:", error);
        sendResponse({ status: "error", error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});
