App._Pages = function (window, document, utils) {
	var PAGE_NAME  = 'data-page',
		PAGE_CLASS = 'app-page',
		APP_LOADED = 'app-loaded';

	var preloaded    = false,
		pages        = {},
		populators   = [],
		unpopulators = [];

	return {
		add            : addPage        ,
		has            : hasPage        ,
		clone          : clonePage      ,
		addPopulator   : addPopulator   ,
		addUnpopulator : addUnpopulator ,
		populate       : populatePage   ,
		unpopulate     : unpopulatePage ,
		fixTitle       : fixPageTitle   ,
		fixContent     : fixContentHeight
	};



	/* Page elements */

	function preloadPages () {
		if (preloaded) {
			return;
		}
		preloaded = true;

		var pageNodes = document.getElementsByClassName(PAGE_CLASS);

		for (var i=pageNodes.length; i--;) {
			addPage( pageNodes[i] );
		}

		document.body.className += ' ' + APP_LOADED;
	}

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
		preloadPages();
		return (pageName in pages);
	}

	function clonePage (pageName) {
		if ( !hasPage(pageName) ) {
			throw TypeError(pageName + ' is not a known page');
		}
		return pages[pageName].cloneNode(true);
	}



	/* Page populators */

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



	/* Page layout */

	function fixContentHeight (page) {
		var topbar  = page.querySelector('.app-topbar'),
			content = page.querySelector('.app-content');

		if ( !content ) {
			return;
		}

		var height = window.innerHeight;

		if ( !topbar ) {
			content.style.height = height + 'px';
			return;
		}

		var topbarStyles = document.defaultView.getComputedStyle(topbar, null),
			topbarHeight = utils.os.android ? 48 : 44;

		if (topbarStyles.height) {
			topbarHeight = parseInt(topbarStyles.height) || 0;
		}

		content.style.height = (height - topbarHeight) + 'px';
	}

	function fixPageTitle (page) {
		var topbar = page.querySelector('.app-topbar');

		if ( !topbar ) {
			return;
		}

		var title = topbar.querySelector('.app-title');

		if (!title || !title.getAttribute('data-autosize') ) {
			return;
		}

		var margin      = 0,
			leftButton  = topbar.querySelector('.left.app-button'),
			rightButton = topbar.querySelector('.right.app-button');

		if (leftButton) {
			var leftStyles = utils.getStyles(leftButton),
				leftPos    = utils.getTotalWidth(leftStyles) + parseInt(leftStyles.left || 0) + 4;
			margin = Math.max(margin, leftPos);
		}

		if (rightButton) {
			var rightStyles = utils.getStyles(rightButton),
				rightPos    = utils.getTotalWidth(rightStyles) + parseInt(rightStyles.right || 0) + 4;
			margin = Math.max(margin, rightPos);
		}

		title.style.width = (window.innerWidth-margin*2) + 'px';
	}
}(window, document, App._utils);


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
