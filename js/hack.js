// ==UserScript==
// @name         Resize tree
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://github.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

// function extractIdFromViewedButton(button) {
//     return button.parentNode.id ? button.parentNode.id : extractIdFromViewedButton(button.parentNode)
// }

// global variable that stores the options.
var options;
// var options = {
//     hideReviewedNode: false,
//     strikeThrough: true,
//     foldReviewedFolder: true,
//     autoResizeSideBar: true,
//     setResizeableSideBar: true
// }

/**
 * Adds the css some iff it does not already exists.
 * If it exists, boolean value @p overwrite will decide if we actually rewrite the @p cssText.
 * @param cssText The new css text.
 * @param overwrite Will we overwrite the already existing css (in case the style already exists).
 * @param id The html id for the style node.
 * @returns {HTMLElement|HTMLStyleElement|null}
 */
function addStyle(cssText, overwrite = false, id = 'GHPR-sidebar') {
    let s = document.getElementById(id)
    if (s) {
        if (overwrite) {
            s.textContent = cssText
        }
        return s
    }

    let head = document.getElementsByTagName('head')[0]
    if (head) {
        let style = document.createElement('style')
        style.setAttribute('type', 'text/css')
        // style.setAttribute('id', 'GHPR-' + Math.random().toString(36).substring(2))
        style.setAttribute('id', id)
        style.textContent = cssText
        head.appendChild(style)
        return style
    }

    return null
}

// Returns a folderGraph (or null)
function findParentFolder(fileTreeEntry) { // TODO -> rename node + return null and deal with it + does it return a node or a graph?
    // If it's the root node, then there is no more father.
    // Note that `root` node is not a folder or file node.
    // It's a technical html node.
    var parentNode = fileTreeEntry.parentNode
    var parentNodeType = parentNode.getAttribute("data-tree-entry-type")
    if (parentNodeType == "root") {
        return null
    } else if (parentNodeType == "directory") {
        return parentNode
    } else {
        return findParentFolder(parentNode)
    }
}

function getText(node) {
    try {
        var txt = node.querySelector(".ActionList-item-label")
        return txt.textContent.trim()
    }
    catch(err) {
        console.log("Could not find the text for some node...")
        return ""
    }
}

function getFolderNode(folderGraph) {
    return folderGraph.querySelector("button")
}

function isFolded(folderNode) {
    return folderNode.getAttribute("aria-expanded") == "false"
}

function setDisplay(node, isReviewed) {
    // const hideReviewedNode = false
    if (options.hideReviewedNode) node.style.display = isReviewed ? "none": ""
    let txt = node.querySelector(".ActionList-item-label")
    if (options.strikeThrough) {
        txt.style.textDecoration = isReviewed ? "line-through" : ""
    }
    // TODO deal with options
    txt.style.color = isReviewed ? "var(--color-fg-subtle)" : ""

    console.log("".concat("Node '", getText(node), "' set to status ", isReviewed ? "'reviewed'" : "'non reviewed'"))
}

function setFolderDisplay(folderNode, isFolderReviewed) {
    setDisplay(folderNode, isFolderReviewed)

    // TODO deal with options
    function shouldClick() {
        const isFolderFolded = isFolded(folderNode)
        return (isFolderReviewed && ! isFolderFolded) || (! isFolderReviewed && isFolderFolded)
    }

    // const isFolderFolded = isFolded(folderNode)
    // const shouldClick = (isFolderReviewed && ! isFolderFolded) || (! isFolderReviewed && isFolderFolded)
    if (shouldClick()){
        // debugger
        folderNode.click()
        // Safety check
        if (shouldClick()) {
            const tmp = folderNode.getAttribute("aria-expanded")
            folderNode.setAttribute("aria-expanded", !tmp)
        }
        console.log("".concat("Folder '", getText(folderNode), "' clicked."))
    }
}

function isReviewed(node) {
    // TODO deal with options
    if (node.getAttribute("data-tree-entry-type") == "file") {
        return node.hasAttribute("data-file-user-viewed")
    } else {
        // In case of directories, we rely on our line-trough information (GH does not tag directories)
        let txt = node.querySelector(".ActionList-item-label")
        return txt.style.textDecoration == "line-through"
    }
}

// Extracts the first level children of a folder sub graph in the tree.
function getChildrenOfFolder(folderGraph) {
    // TODO make a cleaner recursive algo? At least here, we fear no "infinite" loop.
    var level = parseInt(folderGraph.getAttribute('aria-level'))
    var children = folderGraph.querySelectorAll('li[aria-level="' + (level + 1).toString() + '"]')
    return children
}

// function computeAndSetFoldersDisplay(folderGraph) {
//     if (folderGraph == null) return
//     var folderNode = getFolderNode(folderGraph)
//     var childrenOfFolder = getChildrenOfFolder(folderGraph)
//     var isFolderReviewed = Array.from(childrenOfFolder).every(isReviewed)
//     setFolderDisplay(folderNode, isFolderReviewed)
//     // Go up, whatever the state // TODO stop if state has not changed...
//     computeAndSetFoldersDisplay(findParentFolder(folderGraph))
// }

function computeAndSetFoldersDisplay(folderGraph) {
    if (folderGraph == null) return
    var folderNode = getFolderNode(folderGraph)
    // const isFolderNodeInReviewedState = isReviewed(folderNode)
    var childrenOfFolder = getChildrenOfFolder(folderGraph)
    var isFolderReviewed = Array.from(childrenOfFolder).every(isReviewed)
    setFolderDisplay(folderNode, isFolderReviewed)
    computeAndSetFoldersDisplay(findParentFolder(folderGraph))
    // if (isFolderNodeInReviewedState != isFolderReviewed){
    //     setFolderDisplay(folderNode, isFolderReviewed)
    //     computeAndSetFoldersDisplay(findParentFolder(folderGraph))
    // }
}


/**
 * Adds the observer that will modify the tree when the review status of a file changes.
 * Also performs a first pass when the page is loaded such that we start with tree in sync.
 * @param filesBucket The `#files_bucket` element.
 */
function tree(filesBucket){
    var nodesObserver = new MutationObserver( function ( mutations, me ) {
        // For js noobs like me: `.filter(x => x)` filters null values.
        var newNodes = mutations.filter( m => m.attributeName == "data-file-user-viewed" ).map( m => m.target ).filter(li => li.id.startsWith("file-tree-item-diff-"))
        newNodes.forEach(async node => {
            setDisplay(node, isReviewed(node))
            computeAndSetFoldersDisplay(findParentFolder(node))
        })
    })

    nodesObserver.observe( filesBucket, {
        childList: true,
        subtree: true,
        attributeFilter: ["data-file-user-viewed"]
    } );

    let nodes = [...filesBucket.querySelectorAll('li')].filter( li => li.id.startsWith("file-tree-item-diff-" ))
    nodes.forEach(node => {
        setDisplay(node, isReviewed(node))
        computeAndSetFoldersDisplay(findParentFolder(node))
    })
}

function px2int(w) {
    return parseInt(w.slice(0, -2), 10)
}

function reviewFolder(folderNode) {
    document.querySelectorAll("[action=\"/GEOSX/GEOSX/pull/1880/file_review\"]") // Use the current URL?
    // addStyle button.ActionList-content width=...
}

function resizer(filesBucket) {
    if (options.autoResizeSideBar) {
        var customCss = addStyle('.Layout--flowRow-until-lg {--Layout-sidebar-width: auto;}')
        let fileTreeFilterField = document.getElementById("file-tree-filter-field")
        if (!fileTreeFilterField) return
        var originalStyle = getComputedStyle(fileTreeFilterField)
        // debugger
        // var toto = document.querySelector('.Layout--flowRow-until-lg[side="left"]')
        // const w = getComputedStyle(toto.childNodes[1]).width
        // const w = getComputedStyle(toto).gridTemplateColumns.split(" ")[0]
        // const w2 = getComputedStyle(toto.children[0]).width
        // const m = getComputedStyle(toto.children[0]).marginRight
        // const w = px2int(w2) - px2int(m)
        // addStyle('.Layout--flowRow-until-lg {--Layout-sidebar-width: '+ w + 'px}', true);




        // const w = toto.children[0].clientWidth
        // addStyle('.Layout--flowRow-until-lg {--Layout-sidebar-width: '+ w + '}', true);
        // const originalWidth = px2int(originalStyle.width)
        // const iconWidth = [...filesBucket.querySelectorAll(".ActionList-item-visual--trailing")].map(n => getComputedStyle(n).width).map(px2int).reduce((a, b) => Math.max(a, b), -Infinity)
        // const hasFilesOverflowing = [...filesBucket.querySelectorAll('.ActionList-item--subItem')].filter(n => n.scrollWidth < n.clientWidth).length > 0
        // const gitMarginRight = hasFilesOverflowing ? [...filesBucket.querySelectorAll(".ActionList-item-label--truncate")].map(n => getComputedStyle(n).marginRight).map(px2int).reduce((a, b) => Math.max(a, b), -Infinity) : 0;

        // addStyle('.Layout--flowRow-until-lg {--Layout-sidebar-width: '+ originalStyle.width + '}', true);
        // const w = originalWidth + iconWidth + gitMarginRight
        // addStyle('.Layout--flowRow-until-lg {--Layout-sidebar-width: '+ w + 'px}', true);

    } else {
        let fileTreeFilterField = document.getElementById("file-tree-filter-field")
        if (!fileTreeFilterField) return
        originalStyle = getComputedStyle(fileTreeFilterField)
        customCss = addStyle('.Layout--flowRow-until-lg {--Layout-sidebar-width: '+ originalStyle.width + '}');
    }

    if (options.setResizeableSideBar) {
        let sideBar = filesBucket.querySelector('[data-target="diff-layout.sidebarContainer"]')
        sideBar.style.borderRightStyle = "solid";
        sideBar.style.borderRightColor = originalStyle.borderColor;

        var startX, startWidth;

        function initDrag(event) {
            if (event.which != 1) return // left click
            if (event.target !== event.currentTarget) return;

            startX = event.clientX;
            startWidth = parseInt(document.defaultView.getComputedStyle(sideBar).width, 10);
            document.documentElement.addEventListener('mousemove', doDrag, false);
            document.documentElement.addEventListener('mouseup', stopDrag, false);
        }

        function doDrag(event) {
            customCss.textContent = '.Layout--flowRow-until-lg {--Layout-sidebar-width: ' + (startWidth + event.clientX - startX) + 'px;}'
        }

        function stopDrag(event) {
            document.documentElement.removeEventListener('mousemove', doDrag, false);
            document.documentElement.removeEventListener('mouseup', stopDrag, false);
        }

        sideBar.addEventListener('mousedown', initDrag, false);
    }
    console.log("Resize listeners defined.");
}

function extend(filesBucket) {
    // chrome.storage.local.get("options", function (result) {
    //     options = {
    //         hideReviewedNode: result.options["Hide_reviewed_node"],
    //         strikeThrough: result.options["Strike through reviewed file"],
    //         foldReviewedFolder: result.options["Fold reviewed folder"],
    //         autoResizeSideBar: result.options["Auto resize sidebar"],
    //         setResizeableSideBar: result.options["Set sidebar resizeable"]
    //     }
    //     tree(filesBucket)
    //     resizer(filesBucket)
    // })
    tree(filesBucket)
    resizer(filesBucket)
}

// function loadOnFilesBucket() {
//     var waitingForFilesBucket = new MutationObserver( function ( mutations, me ) {
//         var filesBucketAppeared = mutations.flatMap( m => [...m.addedNodes] ).filter( i => i.nodeType <= 2 ).filter( i => i.id === "files_bucket" )
//         if ( filesBucketAppeared.length > 0 ) {
//             me.disconnect()
//             console.log("'files_bucket' found.")
//             tree(filesBucketAppeared[0])
//             resizer(filesBucketAppeared[0])
//             // vis()
//         }
//     })
//
//     waitingForFilesBucket.observe( document, {
//         childList: true,
//         subtree: true
//     } )
//
//     let filesBucket = document.getElementById("files_bucket");
//     if (filesBucket != null){
//         waitingForFilesBucket.disconnect();
//         tree(filesBucket)
//         resizer(filesBucket)
//         // vis()
//         return
//     }
// }
//
// function loadOnTitleChange() {
//     let titleObserver = new MutationObserver(function (mutations, me) {
//         // let titleAppeared = mutations.flatMap( m => [...m.addedNodes] ).filter( i => i.nodeType < 2 ).filter( i => i.tagName == "TITLE" )
//         let titleAppeared = mutations.flatMap(m => [...m.addedNodes]).filter(i => i.nodeType == 3)
//         if (titleAppeared.length > 0) {
//             loadOnFilesBucket()
//         }
//     })
//
//     titleObserver.observe(document.querySelector("head").querySelector("title"), {
//         childList: true
//     })
//
//     loadOnFilesBucket()
// }
//
// function loadOnTitleAppears() {
//     let titleObserver = new MutationObserver(function (mutations, me) {
//         // debugger
//         let titleAppeared = mutations.flatMap(m => [...m.addedNodes]).filter(i => i.nodeType < 2).filter(i => i.tagName == "TITLE")
//         // let titleAppeared = mutations.flatMap( m => [...m.addedNodes] ).filter( i => i.nodeType == 3 )
//         if (titleAppeared.length > 0) {
//             console.log("'title' node appeared.")
//             me.disconnect()
//             loadOnTitleChange()
//         }
//     })
//
//     titleObserver.observe(document.documentElement, {
//         childList: true,
//         subtree: true
//     })
//
//     // loadOnTitleChange() // Please remove!
// }
//
// function main() {
//     'use strict';
//     console.log("Loading the GitHub PR script")
//
//     chrome.storage.local.get(['tree_reviewed_style'], function (result) {
//         hideReviewedNode = result.tree_reviewed_style == 'hide'
//     });
//
//     loadOnTitleAppears()
// }
//
// main()
