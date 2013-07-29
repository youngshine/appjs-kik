App._core = function (window, document, Swapper, App, utils, Dialog, Scroll, Pages, Stack) {
	var DEFAULT_TRANSITION_IOS            = 'slide-left',
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
			'glideon-down'   : 'glideoff-down'  ,
			'glideoff-down'  : 'slideon-down'   ,
			'glideon-up'     : 'glideoff-up'    ,
			'glideoff-up'    : 'slideon-up'
		};

	var navQueue     = [],
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
				options = args;
				args    = {};
			case 'string':
				callback = options;
				options  = args;
			case 'undefined':
				args = {};
			case 'object':
				break;
			default:
				throw TypeError('page arguments must be an object if defined, got ' + args);
		}
		switch (typeof options) {
			case 'function':
				callback = options;
			case 'undefined':
				options = {};
			case 'object':
				break;
			case 'string':
				options = { transition : options };
				break;
			default:
				throw TypeError('options must be an object if defined, got ' + options);
		}
		switch (typeof callback) {
			case 'undefined':
				callback = function () {};
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
			case 'undefined':
				options = {};
			case 'object':
				break;
			case 'string':
				options = { transition : options };
				break;
			default:
				throw TypeError('options must be an object if defined, got ' + options);
		}
		switch (typeof callback) {
			case 'undefined':
				callback = function () {};
			case 'function':
				break;
			default:
				throw TypeError('callback must be a function if defined, got ' + callback);
		}

		return navigateBack(options, callback);
	};

	App.pick = function (pageName, args, options, loadCallback, callback) {
		if (typeof pageName !== 'string') {
			throw TypeError('page name must be a string, got ' + pageName);
		}
		switch (typeof args) {
			case 'function':
				options = args;
				args    = {};
			case 'string':
				callback     = loadCallback;
				loadCallback = options;
				options      = args;
			case 'undefined':
				args = {};
			case 'object':
				break;
			default:
				throw TypeError('page arguments must be an object if defined, got ' + args);
		}
		switch (typeof options) {
			case 'function':
				callback     = loadCallback;
				loadCallback = options;
			case 'undefined':
				options = {};
			case 'object':
				break;
			case 'string':
				options = { transition : options };
				break;
			default:
				throw TypeError('options must be an object if defined, got ' + options);
		}
		if (typeof loadCallback !== 'function') {
			throw TypeError('callback must be a function, got ' + loadCallback);
		}
		switch (typeof callback) {
			case 'undefined':
				callback     = loadCallback;
				loadCallback = function () {};
			case 'function':
				break;
			default:
				throw TypeError('callback must be a function, got ' + callback);
		}

		return pickPage(pageName, args, options, loadCallback, callback);
	};

	App.setDefaultTransition = function (transition) {
		if (typeof transition === 'object') {
			switch (utils.os.name) {
				case 'android':
					if ((utils.os.version < 4) && transition.androidFallback) {
						transition = transition.androidFallback;
					} else {
						transition = transition.android;
					}
					break;
				case 'ios':
					if ((utils.os.version < 5) && transition.iosFallback) {
						transition = transition.iosFallback;
					} else {
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

	App._layout = setupListeners();
	App._navigate = navigate;

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
			Stack.save();
			processNavigationQueue();
		});

		return true;
	}



	function loadPage (pageName, args, options, callback, setupPickerMode) {
		navigate(function (unlock) {
			var oldNode     = currentNode,
				pageManager = Pages.createManager(false);

			if (setupPickerMode) {
				setupPickerMode(pageManager);
			}

			var page           = Pages.startGeneration(pageName, pageManager, args),
				restoreData    = Stack.getCurrent(),
				restoreNode    = restoreData && restoreData[3],
				restoreManager = restoreData && restoreData[2];

			if (!options.transition && pageManager.transition) {
				options.transition = pageManager.transition;
			}

			Pages.populateBackButton(page, oldNode || restoreNode);

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
				Stack.push([ pageName, args, pageManager, page, options ]);
				if (oldNode && restoreManager) {
					Pages.fire(restoreManager, oldNode, Pages.EVENTS.FORWARD);
				}
			}

			function finish () {
				Scroll.saveScrollStyle(oldNode);
				Pages.finishGeneration(pageName, pageManager, page, args);

				unlock();
				callback();

				if (oldNode && restoreManager) {
					restoreManager.showing = false
					Pages.fire(restoreManager, oldNode, Pages.EVENTS.HIDE);
				}
				pageManager.showing = true;
				Pages.fire(pageManager, page, Pages.EVENTS.SHOW);
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

		var stackLength = Stack.size(),
			cancelled   = false;

		var navigatedImmediately = navigate(function (unlock) {
			if (Stack.size() < 2) {
				unlock();
				return;
			}

			var oldPage = Stack.getCurrent();

			if ( !Pages.fire(oldPage[2], oldPage[3], Pages.EVENTS.BEFORE_BACK) ) {
				cancelled = true;
				unlock();
				return;
			}
			else {
				Stack.pop();
			}

			var data       = Stack.getCurrent(),
				pageName   = data[0],
				page       = data[3],
				oldOptions = oldPage[4];

			Pages.fire(oldPage[2], oldPage[3], Pages.EVENTS.BACK);

			Pages.fixContent(page);

			Pages.startDestruction(oldPage[0], oldPage[2], oldPage[3], oldPage[1]);

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

				oldPage[2].showing = false
				Pages.fire(oldPage[2], oldPage[3], Pages.EVENTS.HIDE);
				data[2].showing = true
				Pages.fire(data[2], page, Pages.EVENTS.SHOW);

				setTimeout(function () {
					Pages.finishDestruction(oldPage[0], oldPage[2], oldPage[3], oldPage[1]);

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

	function pickPage (pageName, args, options, loadCallback, callback) {
		var finished = false;
		loadPage(pageName, args, options, loadCallback, function (pageManager) {
			pageManager.restorable = false;
			pageManager.reply = function () {
				if ( !finished ) {
					finished = true;
					navigateBack({}, function(){});
					callback.apply(App, arguments);
				}
			};
		});
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
			var pageData = Stack.getCurrent();
			if (pageData) {
				Pages.fire(pageData[2], pageData[3], Pages.EVENTS.LAYOUT);
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
			utils.forEach(Stack.get(), function (pageInfo) {
				pageInfo[2].online = true;
				Pages.fire(pageInfo[2], pageInfo[3], Pages.EVENTS.ONLINE);
			});
		}, false);
		window.addEventListener('offline', function () {
			utils.forEach(Stack.get(), function (pageInfo) {
				pageInfo[2].online = false;
				Pages.fire(pageInfo[2], pageInfo[3], Pages.EVENTS.OFFLINE);
			});
		}, false);

		return triggerSizeFix;
	}
}(window, document, Swapper, App, App._utils, App._Dialog, App._Scroll, App._Pages, App._Stack);
