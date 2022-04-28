chrome.runtime.onInstalled.addListener(() => {
    const defaultOptions = {
        "Hide reviewed node": false,
        "Strike through reviewed file": true,
        "Fold reviewed folder": true,
        "Auto resize sidebar": true,
        "Set sidebar resizeable": true,
        "Highlight visible files in tree": true
    }

    chrome.storage.local.set({"options": defaultOptions})
})
