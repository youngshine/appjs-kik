var App = function (utils, metrics, Pages, window, document, Swapper, Clickable, Dialog, Scrollable) {
	var PAGE_NAME                         = 'data-page',
		APP_IOS                           = 'app-ios',
		APP_ANDROID                       = 'app-android',
		APP_NO_SCROLLBAR                  = 'app-no-scrollbar',
		PAGE_SHOW_EVENT                   = 'appShow',
		PAGE_HIDE_EVENT                   = 'appHide',
		PAGE_BACK_EVENT                   = 'appBack',
		PAGE_FORWARD_EVENT                = 'appForward',
		PAGE_LAYOUT_EVENT                 = 'appLayout',
		PAGE_ONLINE_EVENT                 = 'appOnline',
		PAGE_OFFLINE_EVENT                = 'appOffline',
		STACK_KEY                         = '__APP_JS_STACK__' + window.location.pathname,
		DEFAULT_TRANSITION_IOS            = 'slide-left',
		DEFAULT_TRANSITION_ANDROID        = 'implode-out',
		DEFAULT_TRANSITION_ANDROID_OLD    = 'fade-on',
		DEFAULT_TRANSITION_ANDROID_GHETTO = 'instant',
		REVERSE_TRANSITION                = {
			'instant'        : 'instant'        ,
			'fade'           : 'fade'           ,
			'fade-on'        : 'fade-off'       ,
			'fade-off'       : 'fade-on'        ,
			'scale-in'       : 'scale-out'      ,
			'scale-out'      : 'scale-in'       ,
			'rotate-left'    : 'rotate-right'   ,
			'rotate-right'   : 'rotate-left'    ,
			'cube-left'      : 'cube-right'     ,
			'cube-right'     : 'cube-left'      ,
			'swap-left'      : 'swap-right'     ,
			'swap-right'     : 'swap-left'      ,
			'explode-in'     : 'explode-out'    ,
			'explode-out'    : 'explode-in'     ,
			'implode-in'     : 'implode-out'    ,
			'implode-out'    : 'implode-in'     ,
			'slide-left'     : 'slide-right'    ,
			'slide-right'    : 'slide-left'     ,
			'slide-up'       : 'slide-down'     ,
			'slide-down'     : 'slide-up'       ,
			'slideon-left'   : 'slideoff-left'  ,
			'slideon-right'  : 'slideoff-right' ,
			'slideon-up'     : 'slideoff-up'    ,
			'slideon-down'   : 'slideoff-down'  ,
			'slideoff-left'  : 'slideon-left'   ,
			'slideoff-right' : 'slideon-right'  ,
			'slideoff-up'    : 'slideon-up'     ,
			'slideoff-down'  : 'slideon-down'   ,
			'glideon-right'  : 'glideoff-right' ,
			'glideoff-right' : 'slideon-right'  ,
			'glideon-left'   : 'glideoff-left'  ,
			'glideoff-left'  : 'slideon-left'   ,
			'glideon-down'  : 'glideoff-down'   ,
			'glideoff-down' : 'slideon-down'    ,
			'glideon-up'    : 'glideoff-up'     ,
			'glideoff-up'   : 'slideon-up'
		};

	var App          = {},
		stack        = [],
		navQueue     = [],
		navLock      = false,
		customEvents = null,
		forceIScroll = ('APP_FORCE_ISCROLL' in window) ? !!window['APP_FORCE_ISCROLL'] : false,
		defaultTransition, reverseTransition,
		current, currentNode;



	function setDefaultTransition (transition) {
		defaultTransition = transition;
		reverseTransition = REVERSE_TRANSITION[defaultTransition];
	}

	function config () {
		if (utils.os.ios) {
			document.body.className += ' ' + APP_IOS;
			setDefaultTransition(DEFAULT_TRANSITION_IOS);
		}
		else if (utils.os.android) {
			document.body.className += ' ' + APP_ANDROID;

			if (utils.os.version >= 4) {
				setDefaultTransition(DEFAULT_TRANSITION_ANDROID);
			}
			else if ((utils.os.version < 2.3) || /LT15a/i.test(navigator.userAgent)) {
				setDefaultTransition(DEFAULT_TRANSITION_ANDROID_GHETTO);
			}
			else {
				setDefaultTransition(DEFAULT_TRANSITION_ANDROID_OLD);
			}
		}

		if (utils.os.faked || (!utils.os.ios && !utils.os.android)) {
			document.body.className += ' ' + APP_NO_SCROLLBAR;
		}
	}



	function startPageGeneration (pageName, args, pageManager) {
		var page = Pages.clone(pageName);

		insureCustomEventing(page, [PAGE_SHOW_EVENT, PAGE_HIDE_EVENT, PAGE_BACK_EVENT, PAGE_FORWARD_EVENT, PAGE_LAYOUT_EVENT, PAGE_ONLINE_EVENT, PAGE_OFFLINE_EVENT]);

		metrics.watchPage(page, pageName, args);

		Pages.fixContent(page);

		utils.forEach(
			page.querySelectorAll('.app-button'),
			function (button) {
				Clickable(button);

				var target = button.getAttribute('data-target'),
					back   = button.getAttribute('data-back');

				if (back) {
					Clickable.sticky(button, function (callback) {
						return navigateBack({}, callback);
					});
				}
				else if (target) {
					Clickable.sticky(button, function (callback) {
						return loadPage(target, {}, {}, callback);
					});
				}
			}
		);

		Pages.populate(pageName, pageManager, page, args);

		firePageEvent(page, PAGE_LAYOUT_EVENT);

		page.addEventListener('DOMNodeInsertedIntoDocument', function () {
			Pages.fixTitle(page);
			firePageEvent(page, PAGE_LAYOUT_EVENT);
		}, false);

		return page;
	}

	function startPageDestruction (pageName, page, args, pageManager) {
		if (utils.os.ios && utils.os.version >= 6) {
			return;
		}
		utils.forEach(
			page.querySelectorAll('*'),
			function (elem) {
				elem.style['-webkit-overflow-scrolling'] = '';
			}
		);
	}

	function finishPageDestruction (pageName, page, args, pageManager) {
		Pages.unpopulate(pageName, pageManager, page, args);
	}



	function navigate (handler) {
		if (navLock) {
			navQueue.push(handler);
			return false;
		}

		navLock = true;

		handler(function () {
			navLock = false;
			saveStack();
			processNavigationQueue();
		});

		return true;
	}



	function generatePage (pageName, args) {
		var pageManager = {},
			page        = startPageGeneration(pageName, args, pageManager);

		Pages.finishGeneration(pageName, pageManager, page, args);

		return page;
	}

	function destroyPage (page) {
		var pageName = page.getAttribute(PAGE_NAME);
		startPageDestruction(pageName, page, {}, {});
		finishPageDestruction(pageName, page, {}, {});
	}

	function loadPage (pageName, args, options, callback) {
		navigate(function (unlock) {
			var oldNode     = currentNode,
				pageManager = {},
				page        = startPageGeneration(pageName, args, pageManager);

			if ( !current ) {
				App.restore = null;
				document.body.appendChild(page);
				updatePageData();
				finish();
			}
			else {
				Pages.saveScrollPosition(currentNode);

				var newOptions = {};
				for (var key in options) {
					newOptions[key] = options[key];
				}
				performTransition(page, newOptions, finish);
				//TODO: what if instant swap?
				updatePageData();
			}

			function updatePageData () {
				current     = pageName;
				currentNode = page;
				stack.push([ pageName, page, options, args, pageManager ]);
				if (oldNode) {
					firePageEvent(oldNode, PAGE_FORWARD_EVENT);
				}
			}

			function finish () {
				Pages.saveScrollStyle(oldNode);
				Pages.finishGeneration(pageName, pageManager, page, args);

				unlock();
				callback();

				if (oldNode) {
					firePageEvent(oldNode, PAGE_HIDE_EVENT);
				}
				firePageEvent(page, PAGE_SHOW_EVENT);
			}
		});

		if ( !Pages.has(pageName) ) {
			return false;
		}
	}

	function navigateBack (options, callback) {
		if ( Dialog.status() ) {
			Dialog.close();
			return;
		}

		var stackLength = stack.length;

		var navigatedImmediately = navigate(function (unlock) {
			if (stack.length < 2) {
				unlock();
				return;
			}

			var oldPage    = stack.pop(),
				data       = stack[stack.length - 1],
				pageName   = data[0],
				page       = data[1],
				oldOptions = oldPage[2];

			firePageEvent(oldPage[1], PAGE_BACK_EVENT);

			Pages.fixContent(page);

			startPageDestruction(oldPage[0], oldPage[1], oldPage[3], oldPage[4]);

			Pages.restoreScrollPosition(page);

			var newOptions = {};
			for (var key in oldOptions) {
				if (key === 'transition') {
					newOptions[key] = REVERSE_TRANSITION[ oldOptions[key] ] || oldOptions[key];
				}
				else {
					newOptions[key] = oldOptions[key];
				}
			}
			for (var key in options) {
				newOptions[key] = options[key];
			}

			performTransition(page, newOptions, function () {
				Pages.restoreScrollStyle(page);

				firePageEvent(oldPage[1], PAGE_HIDE_EVENT);
				firePageEvent(page, PAGE_SHOW_EVENT);

				setTimeout(function () {
					finishPageDestruction(oldPage[0], oldPage[1], oldPage[3], oldPage[4]);

					unlock();
					callback();
				}, 0);
			}, true);

			current     = pageName;
			currentNode = page;
		});

		if (navigatedImmediately && (stackLength < 2)) {
			return false;
		}
	}



	// function customLoadTransition (pageName, args, options, handlePartialTransition) {
		//TODO
		// function (setPosition, callback) {
		// 	setPosition(0.5);
		// 	setPosition(0.6);
		// 	setPosition(0.7);
		// 	setPosition(0.8);
		// 	setPosition(0.9);

		// 	finishTransition(function () {
		// 		// finished
		// 	});
		// }
	// }

	function customBackTransition (handlePartialTransition) {
		if ( Dialog.status() ) {
			Dialog.close();
			return;
		}

		var stackLength = stack.length;

		var navigatedImmediately = navigate(function (unlock) {
			if (stack.length < 2) {
				unlock();
				return;
			}

			var oldData = stack[stack.length - 1],
				newData = stack[stack.length - 2],
				oldPage = oldData[1],
				newPage = newData[1],
				options = oldData[2];

			Pages.fixContent(newPage);

			Pages.restoreScrollPosition(newPage);

			var newOptions = {};
			for (var key in options) {
				if (key === 'transition') {
					newOptions[key] = REVERSE_TRANSITION[ options[key] ] || options[key];
				}
				else {
					newOptions[key] = options[key];
				}
			}

			if ( !newOptions.transition ) {
				newOptions.transition = reverseTransition;
			}

			uiBlockedTask(function (unblockUI) {
				handlePartialTransition(oldPage, newPage, function (status) {
					finishTransition(status, unblockUI);
				});
			});

			function finishTransition (status, callback) {
				if ( !status ) {
					unlock();
					callback();
					return;
				}

				stack.pop();

				startPageDestruction(oldData[0], oldData[1], oldData[3], oldData[4]);

				firePageEvent(oldPage, PAGE_BACK_EVENT);
				Pages.restoreScrollStyle(newPage);
				firePageEvent(oldPage, PAGE_HIDE_EVENT);
				firePageEvent(newPage, PAGE_SHOW_EVENT);

				setTimeout(function () {
					finishPageDestruction(oldData[0], oldData[1], oldData[3], oldData[4]);
					unlock();
					callback();
				}, 0);

				current     = newData[0];
				currentNode = newPage;
			}
		});

		if (navigatedImmediately && (stackLength < 2)) {
			return false;
		}
	}



	function fetchStack () {
		return stack.slice().map(function (pageData) {
			var pageName = pageData[0],
				pageArgs = {};

			for (var key in pageData[3]) {
				pageArgs[key] = pageData[3][key];
			}

			return [ pageName, pageArgs ];
		});
	}

	function fetchPage (index) {
		var pageData = stack[index];

		if (pageData) {
			return pageData[1];
		}
	}

	// you must manually save the stack if you choose to use this method
	function removeFromStackNow (startIndex, endIndex) {
		var deadPages = stack.splice(startIndex, endIndex - startIndex);

		deadPages.forEach(function (pageData) {
			startPageDestruction(pageData[0], pageData[1], pageData[3], pageData[4]);
			finishPageDestruction(pageData[0], pageData[1], pageData[3], pageData[4]);
		});
	}

	function removeFromStack (startIndex, endIndex) {
		navigate(function (unlock) {
			removeFromStackNow(startIndex, endIndex);
			unlock();
		});
	}

	// you must manually save the stack if you choose to use this method
	function addToStackNow (index, newPages) {
		var pageDatas = [];

		newPages.forEach(function (pageData) {
			var pageManager = {},
				page        = startPageGeneration(pageData[0], pageData[1], pageManager);

			Pages.finishGeneration(pageData[0], pageManager, page, pageData[1]);

			Pages.saveScrollPosition(page);
			Pages.saveScrollStyle(page);

			pageDatas.push([pageData[0], page, pageData[2], pageData[1], pageManager]);
		});

		pageDatas.unshift(0);
		pageDatas.unshift(index);
		Array.prototype.splice.apply(stack, pageDatas);
	}

	function addToStack (index, newPages) {
		navigate(function (unlock) {
			addToStackNow(index, newPages);
			unlock();
		});
	}



	function processNavigationQueue () {
		if ( navQueue.length ) {
			navigate( navQueue.shift() );
		}

	}



	function supportsCustomEventing () {
		if (customEvents === null) {
			try {
				var elem = document.createElement('div'),
					evt  = document.createEvent('CustomEvent');
				evt.initEvent('fooBarFace', false, true);
				elem.dispatchEvent(evt);
				customEvents = true;
			}
			catch (err) {
				customEvents = false;
			}
		}

		return customEvents;
	}

	function insureCustomEventing (page, names) {
		if (page._brokenEvents || supportsCustomEventing()) {
			return;
		}

		page._brokenEvents = true;
		page._addEventListener    = page.addEventListener;
		page._removeEventListener = page.removeEventListener;

		var listeners = {};

		names.forEach(function (name) {
			listeners[name] = [];
		});

		page.addEventListener = function (name, listener) {
			if (names.indexOf(name) === -1) {
				page._addEventListener.apply(this, arguments);
				return;
			}

			var eventListeners = listeners[name];

			if (eventListeners.indexOf(listener) === -1) {
				eventListeners.push(listener);
			}
		};

		page.removeEventListener = function (name, listener) {
			if (names.indexOf(name) === -1) {
				page._removeEventListener.apply(this, arguments);
				return;
			}

			var eventListeners = listeners[name],
				index          = eventListeners.indexOf(listener);

			if (index !== -1) {
				eventListeners.splice(index, 1);
			}
		};

		page._trigger = function (name) {
			if (names.indexOf(name) === -1) {
				return;
			}

			listeners[name].forEach(function (listener) {
				setTimeout(function () {
					listener.call(page, {});
				}, 0);
			});
		};
	}

	function firePageEvent (page, eventName) {
		if (page._brokenEvents) {
			page._trigger(eventName);
			return;
		}

		var event = document.createEvent('CustomEvent');
		event.initEvent(eventName, false, true);
		page.dispatchEvent(event);
	}



	// blocks UI interaction during some aysnchronous task
	// is not locked because multiple calls dont effect eachother
	function uiBlockedTask (task) {
		var taskComplete = false;

		var clickBlocker = document.createElement('div');
		clickBlocker.className = 'app-clickblocker';
		document.body.appendChild(clickBlocker);
		clickBlocker.addEventListener('touchstart', function (e) {
			e.preventDefault();
		}, false);

		task(function () {
			if (taskComplete) {
				return;
			}
			taskComplete = true;

			document.body.removeChild(clickBlocker);
		});
	}



	function shouldUseNativeIOSTransition (options) {
		if ( !utils.os.ios ) {
			return false;
		}

		if (options.transition === 'slide-left') {
			return true;
		}
		else if (options.transition === 'slide-right') {
			return true;
		}
		else {
			return false;
		}
	}

	function performTransition (page, options, callback, reverse) {
		if ( !options.transition ) {
			options.transition = (reverse ? reverseTransition : defaultTransition);
		}

		uiBlockedTask(function (unblockUI) {
			if ( shouldUseNativeIOSTransition(options) ) {
				performNativeIOSTransition(page, options, cleanup);
			}
			else if (options.transition === 'instant') {
				Swapper(currentNode, page, options, function () {
					setTimeout(cleanup, 0);
				});
			}
			else {
				Swapper(currentNode, page, options, cleanup);
			}

			function cleanup () {
				Pages.fixContent(currentNode);
				unblockUI();
				callback();
			}
		});
	}

	function performNativeIOSTransition (page, options, callback) {
		var oldPage        = currentNode,
			currentBar     = oldPage.querySelector('.app-topbar'),
			currentContent = oldPage.querySelector('.app-content'),
			newBar         = page.querySelector('.app-topbar'),
			newContent     = page.querySelector('.app-content'),
			currentTitle, newTitle;

		if (currentBar) {
			currentTitle = currentBar.querySelector('.app-title');
		}
		if (newBar) {
			newTitle = newBar.querySelector('.app-title');
		}

		if (!currentBar || !newBar || !currentContent || !newContent || !isVisible(currentBar) || !isVisible(newBar)) {
			// proper iOS transition not possible, fallback to normal
			Swapper(oldPage, page, options, callback);
			return;
		}

		var slideLeft   = (options.transition === 'slide-left'),
			slideLength = window.innerWidth * 0.5,
			transitions = [
				{
					opacityEnd : 0 ,
					elem       : currentBar
				},
				{
					transitionStart : 'translate3d(0,0,0)' ,
					transitionEnd   : 'translate3d('+(slideLeft?-100:100)+'%,0,0)' ,
					elem            : currentContent
				},
				{
					transitionStart : 'translate3d('+(slideLeft?100:-100)+'%,0,0)' ,
					transitionEnd   : 'translate3d(0,0,0)' ,
					elem            : newContent
				}
			];

		if (currentTitle) {
			transitions.push({
				opacityStart    : 1 ,
				opacityEnd      : 0 ,
				transitionStart : 'translate3d(0,0,0)' ,
				transitionEnd   : 'translate3d('+(slideLeft?-slideLength:slideLength)+'px,0,0)' ,
				elem            : currentTitle
			});
		}
		if (newTitle) {
			transitions.push({
				opacityStart    : 0 ,
				opacityEnd      : 1 ,
				transitionStart : 'translate3d('+(slideLeft?slideLength:-slideLength)+'px,0,0)' ,
				transitionEnd   : 'translate3d(0,0,0)' ,
				elem            : newTitle
			});
		}

		var oldPosition = page.style.position;
		page.style.position = 'fixed';
		oldPage.parentNode.insertBefore(page, oldPage);
		oldPage.style.background = 'none';

		utils.animate(transitions, 300, 'ease-in-out', function () {
			oldPage.parentNode.removeChild(oldPage);
			page.style.position = oldPosition;

			callback();
		});
	}

	function isVisible (elem) {
		var styles = utils.getStyles(elem);
		return (styles.display !== 'none' && styles.opacity !== '0');
	}



	function addPopulator (pageName, populator, unpopulator) {
		if (populator) {
			Pages.addPopulator(pageName, populator  );
		}
		if (unpopulator) {
			Pages.addUnpopulator(pageName, unpopulator);
		}
	}



	function setupListeners () {
		function fixContentHeight () {
			if (currentNode) {
				Pages.fixContent(currentNode);
			}
		}
		function fixSizing () {
			fixContentHeight();
			if (currentNode) {
				firePageEvent(currentNode, PAGE_LAYOUT_EVENT);
			}
		}
		function triggerSizeFix () {
			fixSizing();

			//TODO: can we remove this yet? it would increase performance
			// In an ideal world we wouldnt have to do this.
			// Android client lies about its dimensions after
			// events on occasion.
			setTimeout(fixContentHeight, 0);
			setTimeout(fixContentHeight, 10);
			setTimeout(fixContentHeight, 100);
		}

		window.addEventListener('orientationchange', triggerSizeFix);
		window.addEventListener('resize'           , triggerSizeFix);
		window.addEventListener('load'             , triggerSizeFix);
		setTimeout(triggerSizeFix, 0);

		window.addEventListener('online', function () {
			stack.forEach(function (pageInfo) {
				firePageEvent(pageInfo[1], PAGE_ONLINE_EVENT);
			});
		}, false);
		window.addEventListener('offline', function () {
			stack.forEach(function (pageInfo) {
				firePageEvent(pageInfo[1], PAGE_OFFLINE_EVENT);
			});
		}, false);

		return triggerSizeFix;
	}



	function saveStack () {
		try {
			var storedStack = stack.map(function (pageData) {
				return [ pageData[0], pageData[3], pageData[2] ];
			});

			localStorage[STACK_KEY] = JSON.stringify(storedStack);
		}
		catch (err) {}
	}

	function destroyStack () {
		delete localStorage[STACK_KEY];
	}

	function setupRestoreFunction () {
		var storedStack, lastPage;

		try {
			storedStack = JSON.parse( localStorage[STACK_KEY] );
			lastPage    = storedStack.pop();
		}
		catch (err) {
			return;
		}

		return function (callback) {
			switch (typeof callback) {
				case 'undefined':
					callback = function () {};
				case 'function':
					break;

				default:
					throw TypeError('restore callback must be a function if defined, got ' + callback);
			}

			if ( !Pages.has(lastPage[0]) ) {
				throw TypeError(lastPage[0] + ' is not a known page');
			}

			storedStack.forEach(function (pageData) {
				if ( !Pages.has(pageData[0]) ) {
					throw TypeError(pageData[0] + ' is not a known page');
				}
			});

			try {
				addToStackNow(0, storedStack);
			}
			catch (err) {
				removeFromStackNow(0, stack.length);
				throw Error('failed to restore stack');
			}

			saveStack();

			try {
				loadPage(lastPage[0], lastPage[1], lastPage[2], callback);
			}
			catch (err) {
				removeFromStackNow(0, stack.length);
				throw Error('failed to restore stack');
			}
		};
	}



	App.current = function () {
		return current;
	};



	App.add = function (pageName, page) {
		if (typeof pageName !== 'string') {
			page     = pageName;
			pageName = undefined;
		}

		if ( !utils.isNode(page) ) {
			throw TypeError('page template node must be a DOM node, got ' + page);
		}

		Pages.add(page, pageName);
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

		addPopulator(pageName, populator, unpopulator);
	};



	App.load = function (pageName, args, options, callback) {
		if (typeof pageName !== 'string') {
			throw TypeError('page name must be a string, got ' + pageName);
		}

		switch (typeof args) {
			case 'function':
				callback = args;
				args     = {};
				options  = {};
				break;

			case 'undefined':
				args = {};
				break;

			case 'string':
				callback = options;
				options  = args;
				args     = {};
				break;

			case 'object':
				break;

			default:
				throw TypeError('page arguments must be an object if defined, got ' + args);
		}

		switch (typeof options) {
			case 'function':
				callback = options;
				options  = {};
				break;

			case 'undefined':
				options = {};
				break;

			case 'string':
				options = { transition : options };
				break;

			case 'object':
				break;

			default:
				throw TypeError('options must be an object if defined, got ' + options);
		}

		switch (typeof callback) {
			case 'undefined':
				callback = function () {};
				break;

			case 'function':
				break;

			default:
				throw TypeError('callback must be a function if defined, got ' + callback);
		}

		loadPage(pageName, args, options, callback);
	};



	App.back = function (options, callback) {
		switch (typeof options) {
			case 'function':
				callback = options;
				options  = {};
				break;

			case 'undefined':
				options  = {};
				break;

			case 'string':
				options = { transition : options };
				break;

			case 'object':
				break;

			default:
				throw TypeError('options must be an object if defined, got ' + options);
		}

		switch (typeof callback) {
			case 'undefined':
				callback = function () {};
				break;

			case 'function':
				break;

			default:
				throw TypeError('callback must be a function if defined, got ' + callback);
		}

		return navigateBack(options, callback);
	};



	// App.customLoad = function (pageName, args, options, handleCustomTransition) {
	// 	if (typeof pageName !== 'string') {
	// 		throw TypeError('page name must be a string, got ' + pageName);
	// 	}

	// 	switch (typeof args) {
	// 		case 'function':
	// 			handleCustomTransition = args;
	// 			args     = {};
	// 			options  = {};
	// 			break;

	// 		case 'undefined':
	// 			args = {};
	// 			break;

	// 		case 'string':
	// 			options = args;
	// 			args    = {};
	// 			break;

	// 		case 'object':
	// 			break;

	// 		default:
	// 			throw TypeError('page arguments must be an object if defined, got ' + args);
	// 	}

	// 	switch (typeof options) {
	// 		case 'function':
	// 			handleCustomTransition = options;
	// 			options  = {};
	// 			break;

	// 		case 'undefined':
	// 			options = {};
	// 			break;

	// 		case 'string':
	// 			options = { transition : options };
	// 			break;

	// 		case 'object':
	// 			break;

	// 		default:
	// 			throw TypeError('options must be an object if defined, got ' + options);
	// 	}

	// 	if (typeof handleCustomTransition !== 'function') {
	// 		throw TypeError('transition handler must be a function, got ' + handleCustomTransition);
	// 	}

	// 	customLoadTransition(pageName, args, options, handleCustomTransition);
	// };



	App.customBack = function (handleCustomTransition) {
		if (typeof handleCustomTransition !== 'function') {
			throw TypeError('transition handler must be a function, got ' + handleCustomTransition);
		}

		customBackTransition(handleCustomTransition);
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



	App.setDefaultTransition = function (transition) {
		if (typeof transition === 'object') {
			switch (utils.os.name) {
				case 'android':
					transition = transition.android;
					if ((utils.os.version < 4) && transition.androidFallback) {
						transition = transition.androidFallback;
					}
					break;

				case 'ios':
					transition = transition.ios;
					if ((utils.os.version < 5) && transition.iosFallback) {
						transition = transition.iosFallback;
					}
					break;

				default:
					transition = transition.fallback;
					break;
			}

			if ( !transition ) {
				return;
			}
		}

		if (typeof transition !== 'string') {
			throw TypeError('transition must be a string if defined, got ' + transition);
		}

		if ( !(transition in REVERSE_TRANSITION) ) {
			throw TypeError('invalid transition type, got ' + transition);
		}

		setDefaultTransition(transition);
	};

	App.getDefaultTransition = function () {
		return defaultTransition;
	};

	App.getReverseTransition = function () {
		return reverseTransition;
	};



	App.getStack = function () {
		return fetchStack();
	};

	App.getPage = function (index) {
		var stackSize = stack.length - 1;

		switch (typeof index) {
			case 'undefined':
				index = stackSize;
				break;
			case 'number':
				if (Math.abs(index) > stackSize) {
					throw TypeError('absolute index cannot be greater than stack size, got ' + index);
				}
				if (index < 0) {
					index = stackSize + index;
				}
				break;
			default:
				throw TypeError('page index must be a number if defined, got ' + index);
		}
		return fetchPage(index);
	};



	App.removeFromStack = function (startIndex, endIndex) {
		// minus 1 because last item on stack is current page (which is untouchable)
		var stackSize = stack.length - 1;

		switch (typeof startIndex) {
			case 'undefined':
				startIndex = 0;
				break;

			case 'number':
				if (Math.abs(startIndex) > stackSize) {
					throw TypeError('absolute start index cannot be greater than stack size, got ' + startIndex);
				}
				if (startIndex < 0) {
					startIndex = stackSize + startIndex;
				}
				break;

			default:
				throw TypeError('start index must be a number if defined, got ' + startIndex);
		}

		switch (typeof endIndex) {
			case 'undefined':
				endIndex = stackSize;
				break;

			case 'number':
				if (Math.abs(endIndex) > stackSize) {
					throw TypeError('absolute end index cannot be greater than stack size, got ' + endIndex);
				}
				if (endIndex < 0) {
					endIndex = stackSize + endIndex;
				}
				break;

			default:
				throw TypeError('end index must be a number if defined, got ' + endIndex);
		}

		if (startIndex > endIndex) {
			throw TypeError('start index cannot be greater than end index');
		}

		removeFromStack(startIndex, endIndex);
	};



	App.addToStack = function (index, newPages) {
		// minus 1 because last item on stack is current page (which is untouchable)
		var stackSize = stack.length - 1;

		switch (typeof index) {
			case 'undefined':
				index = 0;
				break;

			case 'number':
				if (Math.abs(index) > stackSize) {
					throw TypeError('absolute index cannot be greater than stack size, got ' + index);
				}
				if (index < 0) {
					index = stackSize + index;
				}
				break;

			default:
				throw TypeError('index must be a number if defined, got ' + index);
		}

		if ( !utils.isArray(newPages) ) {
			throw TypeError('added pages must be an array, got ' + newPages);
		}

		newPages = newPages.slice();

		newPages.forEach(function (page, i) {
			if (typeof page === 'string') {
				page = [page, {}];
			}
			else if ( utils.isArray(page) ) {
				page = page.slice();
			}
			else {
				throw TypeError('page description must be an array (page name, arguments), got ' + page);
			}

			if (typeof page[0] !== 'string') {
				throw TypeError('page name must be a string, got ' + page[0]);
			}

			switch (typeof page[1]) {
				case 'undefined':
					page[1] = {};
					break;

				case 'object':
					break;

				default:
					throw TypeError('page arguments must be an object if defined, got ' + page[1]);
			}

			switch (typeof page[2]) {
				case 'undefined':
					page[2] = {};
					break;

				case 'object':
					break;

				default:
					throw TypeError('page options must be an object if defined, got ' + page[2]);
			}

			newPages[i] = page;
		});

		addToStack(index, newPages);
	};



	App.saveStack = function () {
		saveStack();
	};

	App.destroyStack = function () {
		destroyStack();
	};



	App.enableGoogleAnalytics = function () {
		metrics.enableGoogleAnalytics();
	};



	App.stickyButton = function (button, holdFunction) {
		Clickable.sticky(button, holdFunction);
	};



	App.dialog = Dialog;



	config();


	App.platform        = utils.os.name;
	App.platformVersion = utils.os.version;
	App.restore         = setupRestoreFunction();
	App._layout         = setupListeners();

	return App;
}(App._utils, App._metrics, App._Pages, window, document, Swapper, Clickable, Dialog, Scrollable);
