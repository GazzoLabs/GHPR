function loadOnFilesBucket() {
    console.log("Setting files bucket observers")

    function isFilesBucketReady(fb) {
        // A page will be a PR page if there's a `#files_bucket` element
        // which contains `file-tree` nodes.
        // There may be cases where the `#files_bucket` element it there
        // but not its tree nodes. In that precise case, we wait for the tree nodes to appear.
        return fb && fb.getElementsByTagName("file-tree").length > 0
    }
    const filesBucketObserver = new MutationObserver(function (mutations, me) {
        const filesBucketAppeared = mutations.filter(m => {
            // In order not to miss the files bucket, we _search_ for it for any mutation.
            return isFilesBucketReady(m.target.querySelector("#files_bucket"))
        })
        if (filesBucketAppeared.length > 0) {
            me.disconnect()
            console.log("Filled 'files_bucket' found.")
            extend(document.getElementById("files_bucket"))
        }
    })

    filesBucketObserver.observe(document, {
        childList: true,
        subtree: true
    })

    // In case the observer is late, we perform another check here.
    const filesBucket = document.getElementById("files_bucket");
    if (isFilesBucketReady(filesBucket)) {
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
