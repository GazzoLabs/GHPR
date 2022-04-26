function loadOnFilesBucket() {
    const waitingForFilesBucket = new MutationObserver(function (mutations, me) {
        const filesBucketAppeared = mutations.flatMap(m => [...m.addedNodes]).filter(i => i.nodeType <= 2).filter(i => i.id === "files_bucket");
        if (filesBucketAppeared.length > 0) {
            me.disconnect()
            console.log("'files_bucket' found.")
            let filesBucket = filesBucketAppeared[0]
            extend(filesBucket)
        }
    })

    waitingForFilesBucket.observe(document, {
        childList: true,
        subtree: true
    })

    let filesBucket = document.getElementById("files_bucket");
    if (filesBucket != null) {
        waitingForFilesBucket.disconnect();
        extend(filesBucket)
    }
}

function loadOnTitleChange() {
    let titleObserver = new MutationObserver(function (mutations, me) {
        let titleAppeared = mutations.flatMap(m => [...m.addedNodes]).filter(i => i.nodeType === 3)
        if (titleAppeared.length > 0) {
            console.log("'title' changed.")
            loadOnFilesBucket()
        }
    })

    titleObserver.observe(document.querySelector("head").querySelector("title"), {
        childList: true
    })

    // loadOnFilesBucket() // TODO ?
}

function loadOnTitleAppears() {
    let titleObserver = new MutationObserver(function (mutations, me) {
        let titleAppeared = mutations.flatMap(m => [...m.addedNodes]).filter(i => i.nodeType < 2).filter(i => i.tagName === "TITLE")
        if (titleAppeared.length > 0) {
            console.log("'title' node appeared.")
            me.disconnect()
            loadOnTitleChange()
            loadOnFilesBucket() // TODO ?
        }
    })

    titleObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    })

    // loadOnTitleChange() // Please remove!
}

function main() {
    'use strict';
    console.log("Loading the GitHub PR script")

    // chrome.storage.local.get(['tree_reviewed_style'], function (result) {
    //     // hideReviewedNode = result.tree_reviewed_style == 'hide'
    //     options.hideReviewedNode = result.tree_reviewed_style == 'hide'
    // });
    // options.hideReviewedNode = false
    // options.strikeThrough = true

    loadOnTitleAppears()
    // Loading the options before we add our listeners, resize the sidebar, etc.
    chrome.storage.local.get("options", function (result) {
        // console.log("toto")
        options = {
            hideReviewedNode: result.options["Hide_reviewed_node"],
            strikeThrough: result.options["Strike through reviewed file"],
            foldReviewedFolder: result.options["Fold reviewed folder"],
            autoResizeSideBar: result.options["Auto resize sidebar"],
            setResizeableSideBar: result.options["Set sidebar resizeable"]
        }
        // debugger
        // loadOnTitleAppears()
    })

}

main()
