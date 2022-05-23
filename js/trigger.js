function loadOnFilesBucket() {
    const filesBucketObserver = new MutationObserver(function (mutations, me) {
        const filesBucketAppeared = mutations.flatMap(m => [...m.addedNodes]).filter(i => {
            // Multiple pages of GitHub have the "files_bucket" component.
            // Filtering on the "pull-request-tab-content" class should help trigger only on real pull request contexts.
            return (i.nodeType <= 2) && (i.id === "files_bucket") && (i.classList.contains("pull-request-tab-content"))
        })
        if (filesBucketAppeared.length > 0) {
            me.disconnect()
            console.log("'files_bucket' found.")
            extend(filesBucketAppeared[0])
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
    const titleObserver = new MutationObserver(function (mutations, me) {
        const titleAppeared = mutations.flatMap(m => [...m.addedNodes]).filter(i => i.nodeType === 3)
        if (titleAppeared.length > 0) {
            console.log("'title' changed.")
            loadOnFilesBucket()
        }
    })

    titleObserver.observe(document.querySelector("head").querySelector("title"), {
        childList: true
    })
}

function loadOnTitleAppears() {
    const titleObserver = new MutationObserver(function (mutations, me) {
        const titleAppeared = mutations.flatMap(m => [...m.addedNodes]).filter(i => i.nodeType < 2).filter(i => i.tagName === "TITLE")
        if (titleAppeared.length > 0) {
            console.log("'title' node appeared.")
            me.disconnect()
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
            setCommentsSizeToFit: result.options["Set comments size-to-fit"],
            visibilityIndicator: result.options["Highlight visible files in tree"]
        }
    })
}

main()
