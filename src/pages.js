App._Pages = function (window, document, Clickable, Scrollable, App, utils, Events, metrics, Scroll) {
	var PAGE_NAME  = 'data-page',
		PAGE_CLASS = 'app-page',
		APP_LOADED = 'app-loaded',
		EVENTS = {
			SHOW        : 'show'    ,
			HIDE        : 'hide'    ,
			BACK        : 'back'    ,
			FORWARD     : 'forward' ,
			BEFORE_BACK : 'beforeBack' ,
			DESTROY     : 'destroy' ,
			LAYOUT      : 'layout'  ,
			ONLINE      : 'online'  ,
			OFFLINE     : 'offline'
		};

	var preloaded       = false,
		forceIScroll    = !!window['APP_FORCE_ISCROLL'],
		pages           = {},
		populators      = {},
		unpopulators    = {};


	App.add = function (pageName, page) {
		if (typeof pageName !== 'string') {
			page     = pageName;
			pageName = undefined;
		}

		if ( !utils.isNode(page) ) {
			throw TypeError('page template node must be a DOM node, got ' + page);
		}

		addPage(page, pageName);
	};

	App.populator = function (pageName, populator, unpopulator) {
		if (typeof pageName !== 'string') {
			throw TypeError('page name must be a string, got ' + pageName);
		}

		if (typeof populator !== 'function') {
			throw TypeError('page populator must be a function, got ' + populator);
		}

		switch (typeof unpopulator) {
			case 'undefined':
				unpopulator = function () {};
				break;

			case 'function':
				break;

			default:
				throw TypeError('page unpopulator must be a function, got ' + unpopulator);
		}

		if (populator) {
			addPopulator(pageName, populator);
		}
		if (unpopulator) {
			addUnpopulator(pageName, unpopulator);
		}
	};

	App.generate = function (pageName, args) {
		if (typeof pageName !== 'string') {
			throw TypeError('page name must be a string, got ' + pageName);
		}

		switch (typeof args) {
			case 'undefined':
				args = {};
				break;

			case 'object':
				break;

			default:
				throw TypeError('page arguments must be an object if defined, got ' + args);
		}

		return generatePage(pageName, args);
	};

	App.destroy = function (page) {
		if ( !utils.isNode(page) ) {
			throw TypeError('page node must be a DOM node, got ' + page);
		}

		return destroyPage(page);
	};


	return {
		EVENTS                : EVENTS                ,
		has                   : hasPage               ,
		createManager         : createPageManager     ,
		startGeneration       : startPageGeneration   ,
		finishGeneration      : finishPageGeneration  ,
		fire                  : firePageEvent         ,
		startDestruction      : startPageDestruction  ,
		finishDestruction     : finishPageDestruction ,
		fixContent            : fixContentHeight
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
		populators[pageName] = populator;
	}

	function addUnpopulator (pageName, unpopulator) {
		unpopulators[pageName] = unpopulator;
	}

	function populatePage (pageName, pageManager, page, args) {
		var populator = populators[pageName];
		if ( !populator ) {
			return;
		}
		for (var prop in populator) {
			pageManager[prop] = populator[prop];
		}
		for (var prop in populator.prototype) {
			pageManager[prop] = populator.prototype[prop];
		}
		pageManager.page = page;
		pageManager.args = args;
		populator.call(pageManager, page, args);
	}

	function unpopulatePage (pageName, pageManager, page, args) {
		var unpopulator = unpopulators[pageName];
		if (unpopulator) {
			unpopulator.call(pageManager, page, args);
		}
		firePageEvent(pageManager, page, EVENTS.DESTROY);
	}



	/* Page generation */

	function createPageManager (restored) {
		var pageManager = {
			restored : restored ,
			showing  : false ,
			online   : navigator.onLine
		};

		var readyQueue = restored ? null : [];

		pageManager.ready = function (func) {
			if (typeof func !== 'function') {
				throw TypeError('ready must be called with a function, got ' + func);
			}

			if (restored) {
				utils.ready(function () {
					func.call(pageManager);
				});
			}
			else if (readyQueue) {
				readyQueue.push(func);
			}
			else {
				func.call(pageManager);
			}
		};

		pageManager.__appjsFlushReadyQueue = function () {
			if ( !readyQueue ) {
				return;
			}
			var queue = readyQueue.slice();
			readyQueue = null;
			utils.forEach(queue, function (func) {
				func.call(pageManager);
			});
		};

		return pageManager;
	}

	function generatePage (pageName, args) {
		var pageManager = {},
			page        = startPageGeneration(pageName, pageManager, args);

		finishPageGeneration(pageName, pageManager, page, args);

		return page;
	}

	function destroyPage (page) {
		var pageName = page.getAttribute(PAGE_NAME);
		startPageDestruction(pageName, {}, page, {});
		finishPageDestruction(pageName, {}, page, {});
	}

	function startPageGeneration (pageName, pageManager, args) {
		var page = clonePage(pageName);

		var eventNames = [];
		for (var evt in EVENTS) {
			eventNames.push( eventTypeToName(EVENTS[evt]) );
		}
		Events.init(page, eventNames);
		metrics.watchPage(page, pageName, args);

		fixContentHeight(page);

		utils.forEach(
			page.querySelectorAll('.app-button'),
			function (button) {
				Clickable(button);

				var target     = button.getAttribute('data-target'),
					targetArgs = button.getAttribute('data-target-args'),
					back       = button.getAttribute('data-back'),
					args;

				try {
					args = JSON.parse(targetArgs);
				} catch (err) {}
				if ((typeof args !== 'object') || (args === null)) {
					args = {};
				}

				if (back) {
					Clickable.sticky(button, function (callback) {
						return App.back({}, callback);
					});
				}
				else if (target) {
					Clickable.sticky(button, function (callback) {
						return App.load(target, args, {}, callback);
					});
				}
			}
		);

		populatePage(pageName, pageManager, page, args);

		page.addEventListener('DOMNodeInsertedIntoDocument', function () {
			firePageEvent(pageManager, page, EVENTS.LAYOUT);
		}, false);

		return page;
	}

	function firePageEvent (pageManager, page, eventType) {
		var eventName = eventTypeToName(eventType),
			funcName  = eventTypeToFunctionName(eventType),
			success   = true;
		if ( !Events.fire(page, eventName) ) {
			success = false;
		}
		if (typeof pageManager[funcName] === 'function') {
			if (pageManager[funcName]() === false) {
				success = false;
			}
		}
		return success;
	}

	function eventTypeToName (eventType) {
		return 'app' + eventType[0].toUpperCase() + eventType.slice(1);
	}

	function eventTypeToFunctionName (eventType) {
		return 'on' + eventType[0].toUpperCase() + eventType.slice(1);
	}

	function finishPageGeneration (pageName, pageManager, page, args) {
		Scroll.setup(page);
	}

	function startPageDestruction (pageName, pageManager, page, args) {
		if (!utils.os.ios || utils.os.version < 6) {
			Scroll.disable(page);
		}
	}

	function finishPageDestruction (pageName, pageManager, page, args) {
		unpopulatePage(pageName, pageManager, page, args);
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
}(window, document, Clickable, Scrollable, App, App._utils, App._Events, App._metrics, App._Scroll);
