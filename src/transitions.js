App._Transitions = function (window, document, Swapper, App, Utils, Scroll, Stack) {
	var TRANSITION_CLASS                  = 'app-transition',
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
			'glideon-down'   : 'glideoff-down'  ,
			'glideoff-down'  : 'slideon-down'   ,
			'glideon-up'     : 'glideoff-up'    ,
			'glideoff-up'    : 'slideon-up'
		},
		WALL_RADIUS = 10;


	var defaultTransition, reverseTransition, dragLock;

	if (Utils.os.ios) {
		setDefaultTransition(DEFAULT_TRANSITION_IOS);
	} else if (Utils.os.android) {
		if (Utils.os.version >= 4) {
			setDefaultTransition(DEFAULT_TRANSITION_ANDROID);
		} else if ((Utils.os.version < 2.3) || /LT15a/i.test(navigator.userAgent)) {
			setDefaultTransition(DEFAULT_TRANSITION_ANDROID_GHETTO);
		} else {
			setDefaultTransition(DEFAULT_TRANSITION_ANDROID_OLD);
		}
	}


	App.setDefaultTransition = function (transition) {
		if (typeof transition === 'object') {
			switch (Utils.os.name) {
				case 'android':
					if ((Utils.os.version < 4) && transition.androidFallback) {
						transition = transition.androidFallback;
					} else {
						transition = transition.android;
					}
					break;
				case 'ios':
					if ((Utils.os.version < 5) && transition.iosFallback) {
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


	return {
		REVERSE_TRANSITION : REVERSE_TRANSITION        ,
		run                : performTransition         ,
		enableDrag         : enableIOS7DragTransition  ,
		disableDrag        : disableIOS7DragTransition
	};



	function setDefaultTransition (transition) {
		defaultTransition = transition;
		reverseTransition = REVERSE_TRANSITION[defaultTransition];
	}

	function shouldUseNativeIOSTransition (transition) {
		if ( !Utils.os.ios ) {
			return false;
		} else if (transition === 'slide-left') {
			return true;
		} else if (transition === 'slide-right') {
			return true;
		} else {
			return false;
		}
	}



	function performTransition (oldPage, page, options, callback, reverse) {
		if ( !options.transition ) {
			options.transition = (reverse ? reverseTransition : defaultTransition);
		}
		var isIOS7SlideUp = (Utils.os.ios && (Utils.os.version >= 7) && { 'slideon-down':1, 'slideoff-down':1 }[options.transition]);
		if ( !options.duration ) {
			if ( !Utils.os.ios ) {
				options.duration = 270;
			} else if (Utils.os.version < 7) {
				options.duration = 325;
			} else if (isIOS7SlideUp) {
				options.duration = 475;
			} else {
				options.duration = 425;
			}
		}
		if (!options.easing && isIOS7SlideUp) {
			options.easing = 'cubic-bezier(0.4,0.6,0.05,1)';
		}

		document.body.className += ' ' + TRANSITION_CLASS;

		if (options.transition === 'instant') {
			Swapper(oldPage, page, options, function () {
				//TODO: this is stupid. let it be synchronous if it can be.
				//TODO: fix the root of the race in core navigation.
				setTimeout(finish, 0);
			});
		} else if ( shouldUseNativeIOSTransition(options.transition) ) {
			performNativeIOSTransition(oldPage, page, options, finish);
		} else {
			Swapper(oldPage, page, options, finish);
		}

		function finish () {
			document.body.className = document.body.className.replace(new RegExp('\\b'+TRANSITION_CLASS+'\\b'), '');
			callback();
		}
	}



	function performNativeIOSTransition (oldPage, page, options, callback) {
		var slideLeft   = (options.transition === 'slide-left'),
			topPage     = slideLeft ? page : oldPage ,
			transitions = getNativeIOSTransitionList(page, oldPage, slideLeft);

		if ( !transitions ) {
			// proper iOS transition not possible, fallback to normal
			Swapper(oldPage, page, options, callback);
			return;
		}

		var oldPosition   = topPage.style.position,
			oldZIndex     = topPage.style.zIndex,
			oldBackground = topPage.style.background;
		topPage.style.position   = 'fixed';
		topPage.style.zIndex     = '4000';
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

		if (Utils.os.version < 7) {
			options.easing = 'ease-in-out';
		} else {
			options.easing = 'cubic-bezier(0.4,0.6,0.2,1)';
		}

		Utils.animate(transitions, options.duration, options.easing, function () {
			oldPage.parentNode.removeChild(oldPage);

			topPage.style.position   = oldPosition;
			topPage.style.zIndex     = oldZIndex;
			topPage.style.background = oldBackground;

			callback();
		});
	}

	function getNativeIOSTransitionList (page, oldPage, slideLeft) {
		var currentBar     = oldPage.querySelector('.app-topbar'),
			currentTitle   = oldPage.querySelector('.app-topbar .app-title'),
			currentBack    = oldPage.querySelector('.app-topbar .left.app-button'),
			currentContent = oldPage.querySelector('.app-content'),
			newBar         = page.querySelector('.app-topbar'),
			newTitle       = page.querySelector('.app-topbar .app-title'),
			newBack        = page.querySelector('.app-topbar .left.app-button'),
			newContent     = page.querySelector('.app-content'),
			transitions    = [];

		if (!currentBar || !newBar || !currentContent || !newContent || !Utils.isVisible(currentBar) || !Utils.isVisible(newBar)) {
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
		} else {
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
		if (Utils.os.version >= 5) {
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
		if (Utils.os.version < 7) {
			transitions.push({
				transitionStart : 'translate3d(0,0,0)' ,
				transitionEnd   : 'translate3d('+(slideLeft?-100:100)+'%,0,0)' ,
				elem            : currentContent
			}, {
				transitionStart : 'translate3d('+(slideLeft?100:-100)+'%,0,0)' ,
				transitionEnd   : 'translate3d(0,0,0)' ,
				elem            : newContent
			});
		} else {
			transitions.push({
				transitionStart : 'translate3d(0,0,0)' ,
				transitionEnd   : 'translate3d('+(slideLeft?-30:100)+'%,0,0)' ,
				elem            : currentContent
			}, {
				transitionStart : 'translate3d('+(slideLeft?100:-30)+'%,0,0)' ,
				transitionEnd   : 'translate3d(0,0,0)' ,
				elem            : newContent
			});
		}

		return transitions;
	}

	function getBackTransform (backButton, oldButton, toCenter) {
		var fullWidth = backButton.textContent.length * (Utils.os.version<7?10:12),
			oldWidth  = oldButton ? (oldButton.textContent.length*15) : 0;
		if ( !toCenter ) {
			return (oldWidth-window.innerWidth) / 2;
		} else {
			return (window.innerWidth-fullWidth) / 2;
		}
	}

	function getTitleTransform (backButton, toLeft) {
		var fullWidth = 0;
		if (backButton && (Utils.os.version >= 5)) {
			fullWidth = backButton.textContent.length * (Utils.os.version<7?10:12);
		}
		if ( !toLeft ) {
			return (window.innerWidth / 2);
		} else {
			return (fullWidth-window.innerWidth) / 2;
		}
	}



	//TODO: make generic slide drag as well
	function enableIOS7DragTransition () {
		if (!Utils.os.ios || (Utils.os.version < 7)) {
			return;
		}

		var pages        = Stack.get().slice(-2),
			previousPage = pages[0],
			currentPage  = pages[1],
			draggingTouch, lastTouch, navigationLock, dead;
		if (!previousPage || !currentPage) {
			return;
		}

		var currentNode    = currentPage[3],
			currentBar     = currentPage[3].querySelector('.app-topbar'),
			currentTitle   = currentPage[3].querySelector('.app-topbar .app-title'),
			currentBack    = currentPage[3].querySelector('.app-topbar .left.app-button'),
			currentContent = currentPage[3].querySelector('.app-content'),
			oldNode        = previousPage[3],
			oldBar         = previousPage[3].querySelector('.app-topbar'),
			oldTitle       = previousPage[3].querySelector('.app-topbar .app-title'),
			oldBack        = previousPage[3].querySelector('.app-topbar .left.app-button'),
			oldContent     = previousPage[3].querySelector('.app-content');

		if (!currentNode || !currentBar || !currentContent || !oldNode || !oldBar || !oldContent) {
			return;
		}

		if ((currentPage[4].transition !== 'slide-left') && (currentPage[4].transition || defaultTransition !== 'slide-left')) {
			return;
		}

		//TODO: put previous page underneath
		var oldPosition   = currentPage[3].style.position,
			oldZIndex     = currentPage[3].style.zIndex,
			oldBackground = currentPage[3].style.background; //TODO
		currentPage[3].style.position   = 'fixed';
		currentPage[3].style.zIndex     = '4000';
		currentPage[3].style.background = 'none';//TODO
		if (currentPage[3].nextSibling) {
			currentPage[3].parentNode.insertBefore(previousPage[3], currentPage[3].nextSibling);
		}
		else {
			currentPage[3].parentNode.appendChild(previousPage[3]);
		}

		window.addEventListener('touchstart' , startDrag , false);
		window.addEventListener('touchmove'  , dragMove  , false);
		window.addEventListener('touchcancel', finishDrag, false);
		window.addEventListener('touchend'   , finishDrag, false);

		var goBack = false;

		dragLock = function () {
			unbindListeners();
			cleanupElems();
		};

		function unbindListeners () {
			window.removeEventListener('touchstart' , startDrag );
			window.removeEventListener('touchmove'  , dragMove  );
			window.removeEventListener('touchcancel', finishDrag);
			window.removeEventListener('touchend'   , finishDrag);
		}

		function cleanupElems () {
			currentPage[3].style.position   = oldPosition;
			currentPage[3].style.zIndex     = oldZIndex;
			currentPage[3].style.background = oldBackground;
			if (previousPage[3].parentNode) {
				previousPage[3].parentNode.removeChild(previousPage[3]);
			}
		}

		function startDrag (e) {
			if (draggingTouch || navigationLock || dead) {
				return;
			}
			var touch = (e.touches && e.touches[0]);
			if (!touch || (touch.pageX > WALL_RADIUS)) {
				return;
			}

			e.preventDefault();

			App._Navigation.enqueue(function (unlock) {
				navigationLock = unlock;
				//TODO: what if transition is already over?
			}, true);

			document.body.className += ' ' + TRANSITION_CLASS;

			draggingTouch = lastTouch = { x: touch.pageX, y: touch.pageY };
			//TODO: actual transitions
			currentBar.style.webkitTransition = 'all 0s linear';
			if (currentTitle) {
				currentTitle.style.webkitTransition = 'all 0s linear';
			}
			if (currentBack) {
				currentBack.style.webkitTransition = 'all 0s linear';
			}
			currentContent.style.webkitTransition = 'all 0s linear';
			oldBar.style.webkitTransition = 'all 0s linear';
			if (oldTitle) {
				oldTitle.style.webkitTransition = 'all 0s linear';
			}
			if (oldBack) {
				oldBack.style.webkitTransition = 'all 0s linear';
			}
			oldContent.style.webkitTransition = 'all 0s linear';
		}

		function dragMove (e) {
			if (draggingTouch && e.touches && e.touches[0] && !dead) {
				if (lastTouch) {
					goBack = (lastTouch.x < e.touches[0].pageX);
				}
				lastTouch = { x: e.touches[0].pageX, y: e.touches[0].pageY };
				var progress = Math.min(Math.max(0, (lastTouch.x-draggingTouch.x)/window.innerWidth), 1);
				//TODO: actual transitions
				setDragPosition(progress);
			}
		}

		function finishDrag (e) {
			if (!draggingTouch || !navigationLock || dead) {
				return;
			}

			unbindListeners();

			lastTouch = (e.touches && e.touches[0]) || lastTouch;
			var progess = 0;
			if (lastTouch) {
				progress = (lastTouch.x-draggingTouch.x)/window.innerWidth;
			}

			if (0.1 < progress && progress < 0.9) {
				currentBar.style.webkitTransitionDuration = '0.15s';
				if (currentTitle) {
					currentTitle.style.webkitTransitionDuration = '0.15s';
				}
				if (currentBack) {
					currentBack.style.webkitTransitionDuration = '0.15s';
				}
				currentContent.style.webkitTransitionDuration = '0.15s';
				oldBar.style.webkitTransitionDuration = '0.15s';
				if (oldTitle) {
					oldTitle.style.webkitTransitionDuration = '0.15s';
				}
				if (oldBack) {
					oldBack.style.webkitTransitionDuration = '0.15s';
				}
				oldContent.style.webkitTransitionDuration = '0.15s';
			}

			if (goBack) {
				//TODO: page events
				setDragPosition(1);
			} else {
				//TODO: page events
				setDragPosition(0);
			}
			draggingTouch = lastTouch = null;

			if (0.1 < progress && progress < 0.9) {
				currentPage[3].addEventListener('webkitTransitionEnd', finishTransition, false);
			} else {
				finishTransition();
			}

			function finishTransition () {
				currentPage[3].removeEventListener('webkitTransitionEnd', finishTransition);

				if (goBack) {
					if (currentPage[3].parentNode) {
						currentPage[3].parentNode.removeChild(currentPage[3]);
					}
				} else {
					if (previousPage[3].parentNode) {
						previousPage[3].parentNode.removeChild(previousPage[3]);
					}
				}

				currentPage[3].style.position   = oldPosition;
				currentPage[3].style.zIndex     = oldZIndex;
				currentPage[3].style.background = oldBackground;

				currentBar.style.webkitTransition = 'none';
				currentBar.style.webkitTransform = 'none';
				if (currentTitle) {
					currentTitle.style.webkitTransition = 'none';
					currentTitle.style.webkitTransform = 'none';
				}
				if (currentBack) {
					currentBack.style.webkitTransition = 'none';
					currentBack.style.webkitTransform = 'none';
				}
				currentContent.style.webkitTransition = 'none';
				currentContent.style.webkitTransform = 'none';
				oldBar.style.webkitTransition = 'none';
				oldBar.style.webkitTransform = 'none';
				if (oldTitle) {
					oldTitle.style.webkitTransition = 'none';
					oldTitle.style.webkitTransform = 'none';
				}
				if (oldBack) {
					oldBack.style.webkitTransition = 'none';
					oldBack.style.webkitTransform = 'none';
				}
				oldContent.style.webkitTransition = 'none';
				oldContent.style.webkitTransform = 'none';

				document.body.className = document.body.className.replace(new RegExp('\\b'+TRANSITION_CLASS+'\\b'), '');

				if (goBack) {
					//TODO
					Stack.pop();
					App._Navigation.update();
				}

				//TODO: page events

				dragLock = null;
				navigationLock();
			}
		}

		function setDragPosition (progress) {
			//TODO: opacity in topbar is shit
			currentBar.style.opacity = 1-progress;
			if (currentTitle) {
				currentTitle.style.webkitTransform = 'translate3d('+(progress*window.innerWidth/2)+'px,0,0)';
			}
			if (currentBack) {
				currentBack.style.webkitTransform = 'translate3d('+(progress*(window.innerWidth-currentBack.textContent.length*12)/2)+'px,0,0)';
			}
			currentContent.style.webkitTransform = 'translate3d('+(progress*100)+'%,0,0)';
			if (oldTitle) {
				oldTitle.style.webkitTransform = 'translate3d('+((1-progress)*(window.innerWidth-currentBack.textContent.length*12)/-2)+'px,0,0)';
			}
			if (oldBack) {
				oldBack.style.webkitTransform = 'translate3d('+((1-progress)*-150)+'%,0,0)';
			}
			oldContent.style.webkitTransform = 'translate3d('+((1-progress)*-30)+'%,0,0)';
		}
	}

	function disableIOS7DragTransition () {
		if (dragLock) {
			dragLock();
			dragLock = null;
		}
	}
}(window, document, Swapper, App, App._Utils, App._Scroll, App._Stack);
