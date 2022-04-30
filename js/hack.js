// global variable that stores the options.
let options
// var options = {
//     hideReviewedNode: bool
//     strikeThrough: bool
//     foldReviewedFolder: bool
//     autoResizeSideBar: bool
//     setResizeableSideBar: bool
//     visibilityIndicator: bool
// }

/**
 * Adds the css some iff it does not already exist.
 * If it exists, boolean value @p overwrite will decide if we actually rewrite the @p cssText.
 * @param cssText The new css text.
 * @param overwrite Will we overwrite the already existing css (in case the style already exists).
 * @param id The html id for the style node.
 * @returns {HTMLElement|HTMLStyleElement|null}
 */
function addStyle(cssText, overwrite = false, id = 'GHPR-sidebar-position') {
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

/**
 * Find the parent sub-graph of `folderGraph`.
 * @param fileTreeEntry The html tree entry. The algo will recursively extract the html parent until it finds a folder sub-graph.
 * @returns A html file tree entry. The recursive algo will stop when a folder sub-graph is found. Or null when we're on top of the tree.
 */
function findParentFolder(fileTreeEntry) { // TODO -> rename node + return null and deal with it + does it return a node or a graph?
    // If it's the root node, then there is no more father.
    // Note that `root` node is not a folder or file node.
    // It's a technical html node.
    const parentNode = fileTreeEntry.parentNode
    const parentNodeType = parentNode.getAttribute("data-tree-entry-type")
    if (parentNodeType === "root") {
        return null
    } else if (parentNodeType === "directory") {
        return parentNode
    } else {
        return findParentFolder(parentNode)
    }
}

/**
 * Returns the text of any tree node.
 * @param node
 * @returns {string}
 */
function getText(node) {
    try {
        const txt = node.querySelector(".ActionList-item-label")
        return txt.textContent.trim()
    } catch (err) {
        console.log("Could not find the text for some node...")
        return ""
    }
}

/**
 * Extracts the folder node from the folder sub-graph
 * @param folderGraph The folder sub-graph which root node will be returned
 * @returns An Element
 */
function getFolderNode(folderGraph) {
    return folderGraph.querySelector("button")
}

/**
 * Checks if a folder node is folded or not.
 * @param folderNode The node that can be folded.
 * @returns {boolean}
 */
function isFolded(folderNode) {
    return folderNode.getAttribute("aria-expanded") === "false"
}

/**
 * Sets the display of the `node` element, depending on global `options` and the current `isReviewed` state
 * @param node The node (can be a folder node, not meant to be a folder sub-graph)
 * @param isReviewed The current review state of the `node`.
 */
function setDisplay(node, isReviewed) {
    if (options.hideReviewedNode) {
        node.style.display = isReviewed ? "none" : ""
    }
    let txt = node.querySelector(".ActionList-item-label")
    if (options.strikeThrough) {
        txt.style.textDecoration = isReviewed ? "line-through" : ""
    }
    txt.style.color = isReviewed ? "var(--color-fg-subtle)" : ""

    console.log("".concat("Node '", getText(node), "' set to status ", isReviewed ? "'reviewed'" : "'non reviewed'"))
}

/**
 * Sets the display of the `folderNode` element, depending on global `options` and the current `isReviewed` state.
 * The function also deals with potential folding.
 * @param folderNode A folder node (that can be folded). Not meant to be a folder sub-graph.
 * @param isFolderReviewed The current review state of the `folderNode`.
 */
function setFolderDisplay(folderNode, isFolderReviewed) {
    setDisplay(folderNode, isFolderReviewed)

    function shouldClick() {
        if (options.foldReviewedFolder) {
            const isFolderFolded = isFolded(folderNode)
            return (isFolderReviewed && !isFolderFolded) || (!isFolderReviewed && isFolderFolded)
        } else {
            return false
        }
    }

    if (shouldClick()) {
        folderNode.click()
        // Sometimes `click` is not ready, so I fall back to attribute definition by hand (but I don't like it).
        if (shouldClick()) {
            const tmp = folderNode.getAttribute("aria-expanded")
            folderNode.setAttribute("aria-expanded", !tmp)
        }
        console.log("".concat("Folder '", getText(folderNode), "' clicked."))
    }
}

/**
 * Returns the review state of the `node`. Useful when walking the graph with folders.
 * @param node The node (can be a folder node, not meant to be a folder sub-graph)
 * @returns {boolean}
 */
function isReviewed(node) {
    if (node.getAttribute("data-tree-entry-type") === "file") {
        return node.hasAttribute("data-file-user-viewed")
    } else {
        // In case of directories, we rely on our "dim" information (GitHub does not tag directories)
        // Dimming is not optional, so we do not have to deal with `options`.
        const txt = node.querySelector(".ActionList-item-label")
        return txt.style.color === "var(--color-fg-subtle)"
    }
}

/**
 * Extracts the first level children of a folder sub graph in the tree.
 * @param folderGraph The folder sub graph (not meant to be a folder node).
 * @returns The first level children of the root node of the folder sub graph.
 */
function getChildrenOfFolder(folderGraph) {
    // TODO make a cleaner recursive algo? At least here, we fear no "infinite" loop.
    const level = parseInt(folderGraph.getAttribute('aria-level'))
    const children = folderGraph.querySelectorAll('li[aria-level="' + (level + 1).toString() + '"]')
    return Array.from(children)
}

/**
 * Recursively upward (in the parent direction) compute the display of folders.
 * @param folderGraph The folder root to start with. Parents will be considered until there is no more parent.
 */
function computeAndSetFoldersDisplay(folderGraph) {
    if (folderGraph == null) return
    const folderNode = getFolderNode(folderGraph)
    const isFolderReviewed = getChildrenOfFolder(folderGraph).every(isReviewed)
    setFolderDisplay(folderNode, isFolderReviewed)
    computeAndSetFoldersDisplay(findParentFolder(folderGraph))
}

/**
 * Adds the observer that will modify the tree when the review status of a file changes.
 * Also performs a first pass when the page is loaded such that we start with tree in sync.
 * @param filesBucket The `#files_bucket` element.
 */
function setTreeObservers(filesBucket) {
    // It may sound strange to observe the tree to check that a file is reviewed (the click is on the right part of the page)
    // But when a click is done (the review state of the file is changed), the attribute `data-file-user-viewed` is toggled.
    const nodesObserver = new MutationObserver(function (mutations, me) {
        mutations.filter(m => {
            return (m.attributeName === "data-file-user-viewed") && m.target.id.startsWith("file-tree-item-diff-")
        }).forEach(async m => {
            const node = m.target
            setDisplay(node, isReviewed(node))
            computeAndSetFoldersDisplay(findParentFolder(node))
        })
    })

    nodesObserver.observe(filesBucket, {
        childList: true,
        subtree: true,
        attributeFilter: ["data-file-user-viewed"]
    })

    let nodes = [...filesBucket.querySelectorAll('li')].filter(li => li.id.startsWith("file-tree-item-diff-"))
    nodes.forEach(node => {
        setDisplay(node, isReviewed(node))
        computeAndSetFoldersDisplay(findParentFolder(node))
    })
}

/**
 * Sets all the observers required to indicate in the tree if the diff/comparison boxes are visible on the right.
 * @param filesBucket The `#files_bucket` element.
 * @param threshold A small numerical precision to check if a box is visible or not.
 */
function setVisibilityObservers(filesBucket, threshold = 0.001) {
    // The topMargin is here because the diff/comparison boxes can hide behind the top ribbon.
    // Extracting the height of this ribbon will help us reduce the window size.
    const toolBar = document.querySelector(".pr-toolbar")
    const topMargin = toolBar ? getComputedStyle(toolBar).minHeight : "0px"

    // Tells if a comparison diff is open or close (even if it's reviewed)
    function isComparisonFolded(comparisonDiv) {
        return !comparisonDiv.classList.contains("open")
    }

    const intersectionObserver = new IntersectionObserver(es => { // IntersectionObserverEntry list
        Array.from(es).forEach(e => {
            let fileNode = document.getElementById("file-tree-item-" + e.target.id)
            if (fileNode) {
                fileNode.style.background = (e.intersectionRatio < threshold) || isComparisonFolded(e.target) ? "" : "var(--color-action-list-item-default-selected-bg)"
            }
        })
    }, {
        root: null,
        rootMargin: '-' + topMargin + ' 0px 0px 0px',
        threshold: threshold
    })

    const diffObservers = new MutationObserver(function (mutations, me) {
        // The mutations will trigger every time a diff/comparison box appears.
        // Then it initiates the observation of their visibility in order to update the tree visibility indicator
        mutations.filter(m => m.type === "childList").flatMap(m => [...m.addedNodes]).filter(i => {
            return (i.nodeType === 1) && (i.tagName === "DIV") && i.id.startsWith("diff-")
        }).forEach(i => intersectionObserver.observe(i))

        // In case a diff/comparison box appears is open, we need to adapt the tree visibility indicator accordingly.
        mutations.filter(m => m.type === "attributes").filter(m => m.target.id.startsWith("diff-")).map(m => m.target).forEach(n => {
            let fileNode = document.getElementById("file-tree-item-" + n.id)
            if (fileNode) {
                fileNode.style.background = isComparisonFolded(n) ? "" : "var(--color-action-list-item-default-selected-bg)"
            }
        })
    })

    const files = document.getElementById("files")
    if (!files) return

    diffObservers.observe(files, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    })

    Array.from(files.querySelectorAll('div[id^="diff-"]')).forEach(n => {
        const e = document.getElementById(n.id)
        if (e) intersectionObserver.observe(e)
    })
}


function setResizerObservers(filesBucket) {
    let originalStyle, customCss
    { // scope reduction
        const fileTreeFilterField = document.getElementById("file-tree-filter-field")
        if (!fileTreeFilterField) return
        originalStyle = getComputedStyle(fileTreeFilterField)
        if (options.autoResizeSideBar) {
            customCss = addStyle('.Layout--flowRow-until-lg {--Layout-sidebar-width: auto;}')
        } else {
            customCss = addStyle('.Layout--flowRow-until-lg {--Layout-sidebar-width: ' + originalStyle.width + '}')
        }
    }

    if (options.setResizeableSideBar) {
        const cssText = 'div[data-target="diff-layout.sidebarContainer"] { padding-right: var(--Layout-gutter) } div[data-target="diff-layout.mainContainer"] { margin-left: calc(var(--Layout-gutter) * -1) }'
        addStyle(cssText, true,  "GHPR-sidebar-width")

        // `sideBar` should always exist since `fileTreeFilterField` has already been tested.
        let sideBar = filesBucket.querySelector('[data-target="diff-layout.sidebarContainer"]')
        sideBar.style.borderRightStyle = "solid"
        sideBar.style.borderRightColor = originalStyle.borderColor

        let startX, startWidth

        function initDrag(event) {
            if (event.which !== 1) return // left click
            if (event.target !== event.currentTarget) return

            startX = event.clientX
            startWidth = parseInt(document.defaultView.getComputedStyle(sideBar).width, 10)
            document.documentElement.addEventListener('mousemove', doDrag, false)
            document.documentElement.addEventListener('mouseup', stopDrag, false)
        }

        function doDrag(event) {
            customCss.textContent = '.Layout--flowRow-until-lg {--Layout-sidebar-width: ' + (startWidth + event.clientX - startX) + 'px;}'
        }

        function stopDrag(event) {
            document.documentElement.removeEventListener('mousemove', doDrag, false)
            document.documentElement.removeEventListener('mouseup', stopDrag, false)
        }

        sideBar.addEventListener('mousedown', initDrag, false)
    }
    console.log("Resize listeners defined.")
}

function extend(filesBucket) {
    setTreeObservers(filesBucket)
    setResizerObservers(filesBucket)
    if (options.visibilityIndicator) setVisibilityObservers(filesBucket)
}
