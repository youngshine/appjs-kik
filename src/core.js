App._core = function (window, document, Swapper, App, utils, Events, Dialog, Scroll, Pages) {
	var STACK_KEY  = '__APP_JS_STACK__' + window.location.pathname,
		STACK_TIME = '__APP_JS_TIME__'  + window.location.pathname,
		EVENTS = {
			SHOW        : 'appShow'    ,
			HIDE        : 'appHide'    ,
			BACK        : 'appBack'    ,
			FORWARD     : 'appForward' ,
			BEFORE_BACK : 'appBeforeBack' ,
			LAYOUT      : 'appLayout'  ,
			ONLINE      : 'appOnline'  ,
			OFFLINE     : 'appOffline'
		},
		DEFAULT_TRANSITION_IOS            = 'slide-left',
		DEFAULT_TRANSITION_ANDROID        = 'implode-out',
		DEFAULT_TRANSITION_ANDROID_OLD    = 'fade-on',
		DEFAULT_TRANSITION_ANDROID_GHETTO = 'instant',
		REVERSE_TRANSITION = {
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

	var stack        = [],
		navQueue     = [],
		navLock      = false,
		defaultTransition, reverseTransition,
		current, currentNode;

	if (utils.os.ios) {
		setDefaultTransition(DEFAULT_TRANSITION_IOS);
	}
	else if (utils.os.android) {
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

	App.current = function () {
		return current;
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

		return loadPage(pageName, args, options, callback);
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

	App.setDefaultTransition = function (transition) {
		if (typeof transition === 'object') {
			switch (utils.os.name) {
				case 'android':
					if ((utils.os.version < 4) && transition.androidFallback) {
						transition = transition.androidFallback;
					}
					else {
						transition = transition.android;
					}
					break;

				case 'ios':
					if ((utils.os.version < 5) && transition.iosFallback) {
						transition = transition.iosFallback;
					}
					else {
						transition = transition.ios;
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

	App.restore = setupRestoreFunction();
	App._layout = setupListeners();

	return {};



	function setDefaultTransition (transition) {
		defaultTransition = transition;
		reverseTransition = REVERSE_TRANSITION[defaultTransition];
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



	function loadPage (pageName, args, options, callback) {
		navigate(function (unlock) {
			var oldNode     = currentNode,
				pageManager = {},
				page        = Pages.startGeneration(pageName, pageManager, args),
				restoreData = stack[stack.length-1],
				restoreNode = restoreData && restoreData[1];

			Events.init(page, EVENTS);
			populatePageBackButton(page, oldNode || restoreNode);

			if ( !current ) {
				App.restore = null;
				document.body.appendChild(page);
				updatePageData();
				finish();
			}
			else {
				Scroll.saveScrollPosition(currentNode);

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
					Events.fire(oldNode, EVENTS.FORWARD);
				}
			}

			function finish () {
				Scroll.saveScrollStyle(oldNode);
				Pages.finishGeneration(pageName, pageManager, page, args);

				unlock();
				callback();

				if (oldNode) {
					Events.fire(oldNode, EVENTS.HIDE);
				}
				Events.fire(page, EVENTS.SHOW);
			}
		});

		if ( !Pages.has(pageName) ) {
			return false;
		}
	}

	function navigateBack (options, callback) {
		if (Dialog.status() && Dialog.close()) {
			return;
		}

		var stackLength = stack.length,
			cancelled   = false;

		var navigatedImmediately = navigate(function (unlock) {
			if (stack.length < 2) {
				unlock();
				return;
			}

			var oldPage = stack[stack.length-1];

			if ( !Events.fire(oldPage[1], EVENTS.BEFORE_BACK) ) {
				cancelled = true;
				unlock();
				return;
			}
			else {
				stack.pop();
			}

			var data       = stack[stack.length - 1],
				pageName   = data[0],
				page       = data[1],
				oldOptions = oldPage[2];

			Events.fire(oldPage[1], EVENTS.BACK);

			Pages.fixContent(page);

			Pages.startDestruction(oldPage[0], oldPage[4], oldPage[1], oldPage[3]);

			Scroll.restoreScrollPosition(page);

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
				Scroll.restoreScrollStyle(page);

				Events.fire(oldPage[1], EVENTS.HIDE);
				Events.fire(page, EVENTS.SHOW);

				setTimeout(function () {
					Pages.finishDestruction(oldPage[0], oldPage[4], oldPage[1], oldPage[3]);

					unlock();
					callback();
				}, 0);
			}, true);

			current     = pageName;
			currentNode = page;
		});

		if (cancelled || (navigatedImmediately && (stackLength < 2))) {
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
			Pages.startDestruction(pageData[0], pageData[4], pageData[1], pageData[3]);
			Pages.finishDestruction(pageData[0], pageData[4], pageData[1], pageData[3]);
		});
	}

	function removeFromStack (startIndex, endIndex) {
		navigate(function (unlock) {
			removeFromStackNow(startIndex, endIndex);
			unlock();
		});
	}

	// you must manually save the stack if you choose to use this method
	function addToStackNow (index, newPages, restored) {
		var pageDatas = [],
			lastPage;

		newPages.forEach(function (pageData) {
			var pageManager = { restored : restored },
				page        = Pages.startGeneration(pageData[0], pageManager, pageData[1]);
			Events.init(page, EVENTS);
			populatePageBackButton(page, lastPage);

			Pages.finishGeneration(pageData[0], pageManager, page, pageData[1]);

			Scroll.saveScrollPosition(page);
			Scroll.saveScrollStyle(page);

			pageDatas.push([pageData[0], page, pageData[2], pageData[1], pageManager]);

			lastPage = page;
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

	function populatePageBackButton (page, oldPage) {
		if ( !oldPage ) {
			return;
		}
		var backButton = page.querySelector('.app-topbar .left.app-button'),
			oldTitle   = oldPage.querySelector('.app-topbar .app-title');
		if (!backButton || !oldTitle) {
			return;
		}
		var oldText = oldTitle.textContent,
			newText = backButton.textContent;
		if (!oldText || newText) {
			return;
		}
		if (oldText.length > 13) {
			oldText = oldText.substr(0, 12) + '..';
		}
		backButton.textContent = oldText;
	}



	function processNavigationQueue () {
		if ( navQueue.length ) {
			navigate( navQueue.shift() );
		}

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
		if ( !options.duration ) {
			options.duration = utils.os.ios ? 325 : 270;
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
		var oldPage     = currentNode,
			slideLeft   = (options.transition === 'slide-left'),
			topPage     = slideLeft ? page : oldPage ,
			transitions = getTransitionList(page, oldPage, slideLeft);

		if ( !transitions ) {
			// proper iOS transition not possible, fallback to normal
			Swapper(oldPage, page, options, callback);
			return;
		}

		var oldPosition   = topPage.style.position,
			oldZIndex     = topPage.style.zIndex,
			oldBackground = topPage.style.background;
		topPage.style.position   = 'fixed';
		topPage.style.zIndex     = '10000';
		topPage.style.background = 'none';

		if (slideLeft) {
			oldPage.parentNode.insertBefore(page, oldPage);
		}
		else if (oldPage.nextSibling) {
			oldPage.parentNode.insertBefore(page, oldPage.nextSibling);
		}
		else {
			oldPage.parentNode.appendChild(page);
		}

		utils.animate(transitions, options.duration, 'ease-in-out', function () {
			oldPage.parentNode.removeChild(oldPage);

			topPage.style.position   = oldPosition;
			topPage.style.zIndex     = oldZIndex;
			topPage.style.background = oldBackground;

			callback();
		});
	}

	function getTransitionList (page, oldPage, slideLeft) {
		var currentBar     = oldPage.querySelector('.app-topbar'),
			currentTitle   = oldPage.querySelector('.app-topbar .app-title'),
			currentBack    = oldPage.querySelector('.app-topbar .left.app-button'),
			currentContent = oldPage.querySelector('.app-content'),
			newBar         = page.querySelector('.app-topbar'),
			newTitle       = page.querySelector('.app-topbar .app-title'),
			newBack        = page.querySelector('.app-topbar .left.app-button'),
			newContent     = page.querySelector('.app-content'),
			transitions    = [];

		if (!currentBar || !newBar || !currentContent || !newContent || !isVisible(currentBar) || !isVisible(newBar)) {
			return;
		}

		if (currentBack && currentBack.getAttribute('data-noslide')) {
			currentBack = undefined;
		}
		if (newBack && newBack.getAttribute('data-noslide')) {
			newBack = undefined;
		}

		// fade topbar
		if (slideLeft) {
			transitions.push({
				opacityStart : 0 ,
				opacityEnd   : 1 ,
				elem         : newBar
			});
		}
		else {
			transitions.push({
				opacityStart : 1 ,
				opacityEnd   : 0 ,
				elem         : currentBar
			});
		}

		// slide titles
		if (currentTitle) {
			transitions.push({
				transitionStart : 'translate3d(0,0,0)' ,
				transitionEnd   : 'translate3d('+getTitleTransform(newBack, slideLeft)+'px,0,0)' ,
				elem            : currentTitle
			});
		}
		if (newTitle) {
			transitions.push({
				transitionStart : 'translate3d('+getTitleTransform(currentBack, !slideLeft)+'px,0,0)' ,
				transitionEnd   : 'translate3d(0,0,0)' ,
				elem            : newTitle
			});
		}

		// slide back button
		if (utils.os.version >= 5) {
			if (currentBack) {
				transitions.push({
					transitionStart : 'translate3d(0,0,0)' ,
					transitionEnd   : 'translate3d('+getBackTransform(currentBack, newBack, !slideLeft)+'px,0,0)' ,
					elem            : currentBack
				});
			}
			if (newBack) {
				transitions.push({
					transitionStart : 'translate3d('+getBackTransform(newBack, currentBack, slideLeft)+'px,0,0)' ,
					transitionEnd   : 'translate3d(0,0,0)' ,
					elem            : newBack
				});
			}
		}

		// slide contents
		transitions.push({
			transitionStart : 'translate3d(0,0,0)' ,
			transitionEnd   : 'translate3d('+(slideLeft?-100:100)+'%,0,0)' ,
			elem            : currentContent
		}, {
			transitionStart : 'translate3d('+(slideLeft?100:-100)+'%,0,0)' ,
			transitionEnd   : 'translate3d(0,0,0)' ,
			elem            : newContent
		});

		return transitions;
	}

	function getBackTransform (backButton, oldButton, toCenter) {
		var fullWidth = backButton.textContent.length * 10,
			oldWidth  = oldButton ? (oldButton.textContent.length*15) : 0;

		if ( !toCenter ) {
			return (oldWidth-window.innerWidth) / 2;
		}
		else {
			return (window.innerWidth-fullWidth) / 2;
		}
	}

	function getTitleTransform (backButton, toLeft) {
		var fullWidth = 0;
		if (backButton && (utils.os.version >= 5)) {
			fullWidth = backButton.textContent.length * 10;
		}

		if ( !toLeft ) {
			return (window.innerWidth / 2);
		}
		else {
			return (fullWidth-window.innerWidth) / 2;
		}
	}

	function isVisible (elem) {
		var styles = utils.getStyles(elem);
		return (styles.display !== 'none' && styles.opacity !== '0');
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
				Events.fire(currentNode, EVENTS.LAYOUT);
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
				Events.fire(pageInfo[1], EVENTS.ONLINE);
			});
		}, false);
		window.addEventListener('offline', function () {
			stack.forEach(function (pageInfo) {
				Events.fire(pageInfo[1], EVENTS.OFFLINE);
			});
		}, false);

		return triggerSizeFix;
	}



	function saveStack () {
		try {
			var storedStack = [];
			for (var i=0, l=stack.length; i<l; i++) {
				if (stack[i][4].restorable === false) {
					break;
				}
				storedStack.push([stack[i][0], stack[i][3], stack[i][2]]);
			}
			localStorage[STACK_KEY] = JSON.stringify(storedStack);
			localStorage[STACK_TIME] = +new Date() + '';
		}
		catch (err) {}
	}

	function destroyStack () {
		delete localStorage[STACK_KEY];
		delete localStorage[STACK_TIME];
	}

	function setupRestoreFunction (options) {
		var storedStack, lastPage;

		try {
			storedStack = JSON.parse( localStorage[STACK_KEY] );
			storedTime  = parseInt( localStorage[STACK_TIME] );
			lastPage    = storedStack.pop();
		}
		catch (err) {
			return;
		}

		return function (options, callback) {
			switch (typeof options) {
				case 'function':
					callback = options;
				case 'undefined':
					options = {};
				case 'object':
					if (options !== null) {
						break;
					}
				default:
					throw TypeError('restore options must be an object if defined, got ' + options);
			}

			switch (typeof callback) {
				case 'undefined':
					callback = function () {};
				case 'function':
					break;
				default:
					throw TypeError('restore callback must be a function if defined, got ' + callback);
			}

			if (+new Date()-storedTime >= options.maxAge) {
				throw TypeError('restore content is too old');
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
				addToStackNow(0, storedStack, true);
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
}(window, document, Swapper, App, App._utils, App._Events, App._Dialog, App._Scroll, App._Pages);
