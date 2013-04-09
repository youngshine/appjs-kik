App._Pages = function () {
	var PAGE_NAME = 'data-page';

	var pages = {};

	function addPage (page, pageName) {
		if ( !pageName ) {
			pageName = page.getAttribute(PAGE_NAME);
		}

		if ( !pageName ) {
			var className = page.className || '',
				matcher   = /\b(\S+)\-page\b/g,
				match;
			//TODO: figure out why this doesnt work on old android
			while (match = matcher.exec(className)) {
				if (match[1] !== 'app') {
					pageName = match[1];
					break;
				}
			}
		}

		if ( !pageName ) {
			throw TypeError('page name was not specified');
		}

		page.setAttribute(PAGE_NAME, pageName);
		if (page.parentNode) {
			page.parentNode.removeChild(page);
		}
		pages[pageName] = page.cloneNode(true);
	}

	function hasPage (pageName) {
		return (pageName in pages);
	}

	function clonePage (pageName) {
		return pages[pageName].cloneNode(true);
	}

	return {
		add   : addPage   ,
		has   : hasPage   ,
		clone : clonePage
	};
}();


// addPopulator

// startPageGeneration
// finishPageGeneration
// startPageDestruction
// finishPageDestruction
// generatePage

// setupScrollers
// getScrollableElems
// savePageScrollPosition
// savePageScrollStyle
// restorePageScrollPosition
// restorePageScrollStyle

// fixPageTitle
// setContentHeight
