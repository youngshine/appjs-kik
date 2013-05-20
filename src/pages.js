App._Pages = function () {
	var PAGE_NAME = 'data-page';

	var pages        = {},
		populators   = [],
		unpopulators = [];


	function addPage (page, pageName) {
		if ( !pageName ) {
			pageName = page.getAttribute(PAGE_NAME);
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


	function addPopulator (pageName, populator) {
		if ( !populators[pageName] ) {
			populators[pageName] = [ populator ];
		}
		else {
			populators[pageName].push(populator);
		}
	}

	function addUnpopulator (pageName, unpopulator) {
		if ( !unpopulators[pageName] ) {
			unpopulators[pageName] = [ unpopulator ];
		}
		else {
			unpopulators[pageName].push(unpopulator);
		}
	}

	function populatePage (pageName, pageManager, page, args) {
		var pagePopulators = populators[pageName] || [];
		pagePopulators.forEach(function (populator) {
			populator.call(pageManager, page, args);
		});
	}

	function unpopulatePage (pageName, pageManager, page, args) {
		var pageUnpopulators = unpopulators[pageName] || [];
		pageUnpopulators.forEach(function (unpopulator) {
			unpopulator.call(pageManager, page, args);
		});
	}


	return {
		add            : addPage        ,
		has            : hasPage        ,
		clone          : clonePage      ,
		addPopulator   : addPopulator   ,
		addUnpopulator : addUnpopulator ,
		populate       : populatePage   ,
		unpopulate     : unpopulatePage
	};
}();


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
