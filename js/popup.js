'use strict';

function f(event) {
    const id = event.target.id

    chrome.storage.local.get("options", function (result) {
        result.options[id] = event.target.checked
        chrome.storage.local.set({"options": result.options});
    });
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("GHPR-checkboxes").addEventListener("click", f)
})

document.addEventListener("DOMContentLoaded", function () {
    // Setting the checkboxes with the correct values
    chrome.storage.local.get("options", function (result) {
        for (let [id, value] of Object.entries(result.options)) {
            document.getElementById(id).checked = value
        }
    });
})
