function loadOnFilesBucket() {
    console.log("Setting files bucket observers")
    const filesBucketObserver = new MutationObserver(function (mutations, me) {
        const filesBucketAppeared = mutations.filter(m => {
            // The #files_bucket div is inside another #repo-content-turbo-frame that is added.
            // It could be as simple as only checking for #files_bucket,
            // but the first id check was added not to search the tree everytime.
            // In case the extension does not trigger anymore, it can be interesting to challenge the following predicate.
            return m.target.id === "repo-content-turbo-frame" && m.target.querySelector("#files_bucket")
        })
        if (filesBucketAppeared.length > 0) {
            me.disconnect()
            console.log("'files_bucket' found.")
            extend(document.getElementById("files_bucket"))
        }
    })

    filesBucketObserver.observe(document, {
        childList: true,
        subtree: true
    })

    const filesBucket = document.getElementById("files_bucket");
    if (filesBucket && filesBucket.classList.contains("pull-request-tab-content")) {
        filesBucketObserver.disconnect();
        extend(filesBucket)
    }
}

function loadOnTitleChange() {
    console.log("Setting title change observers")
    const titleObserver = new MutationObserver(function (mutations, me) {
        const titleChanged = mutations.flatMap(m => [...m.addedNodes]).filter(i => i.nodeType === 3)
        if (titleChanged.length > 0) {
            console.log("'title' changed.")
            loadOnFilesBucket()
        }
    })

    titleObserver.observe(document.querySelector("head").querySelector("title"), {
        childList: true
    })
}

function loadOnTitleAppears() {
    console.log("Setting title appearance observers")
    const titleObserver = new MutationObserver(function (mutations, me) {
        const titleAppeared = mutations.flatMap(m => [...m.addedNodes]).filter(i => i.nodeType < 2).filter(i => i.tagName === "TITLE")
        if (titleAppeared.length > 0) {
            console.log("'title' node appeared.")
            // Belt and suspenders...
            loadOnTitleChange()
            loadOnFilesBucket()
        }
    })

    titleObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    })
}

function main() {
    'use strict'
    console.log("Loading the GitHub PR script")

    loadOnTitleAppears()
    // Loading the options before we add our listeners, resize the sidebar, etc.
    chrome.storage.local.get("options", function (result) {
        options = {
            strikeThrough: result.options["Strike through reviewed file"],
            foldReviewedFolder: result.options["Fold reviewed folder"],
            autoResizeSideBar: result.options["Auto resize sidebar"],
            setResizeableSideBar: result.options["Set sidebar resizeable"],
            visibilityIndicator: result.options["Highlight visible files in tree"]
        }
    })
}

main()
