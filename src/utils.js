App._utils = function (window, document, App) {
	var query = function (queryString) {
		var re           = /([^&=]+)=([^&]+)/g,
			decodedSpace = /\+/g;

		var result = {},
			m, key, value;

		if (queryString) {
			queryString = queryString.replace(decodedSpace, '%20');

			while ((m = re.exec(queryString))) {
				key   = decodeURIComponent( m[1] );
				value = decodeURIComponent( m[2] );
				result[ key ] = value;
			}
		}

		return result;
	}( window.location.href.split('?')[1] );

	var os = function (userAgent) {
		var faked = false,
			name, version, match;

		if (query['_app_platform'] === 'android') {
			faked   = true;
			name    = 'android';
			version = '4.2';
		}
		else if (query['_app_platform'] === 'ios') {
			faked   = true;
			name    = 'ios';
			version = '6.0';
		}
		else if (match = /\bCPU.*OS (\d+(_\d+)?)/i.exec(userAgent)) {
			name    = 'ios';
			version = match[1].replace('_', '.');
		}
		else if (match = /\bAndroid (\d+(\.\d+)?)/.exec(userAgent)) {
			name    = 'android';
			version = match[1];
		}

		var data = {
			faked         : faked   ,
			name          : name    ,
			versionString : version ,
			version       : version && parseFloat(version)
		};

		data[ name ] = true;

		if (data.ios) {
			document.body.className += ' app-ios';
		}
		else if (data.android) {
			document.body.className += ' app-android';
		}
		if (data.faked || (!data.ios && !data.android)) {
			document.body.className += ' app-no-scrollbar';
		}

		return data;
	}(navigator.userAgent);

	var forEach = function (forEach) {
		if (forEach) {
			return function (arr, callback, self) {
				return forEach.call(arr, callback, self);
			};
		}
		else {
			return function (arr, callback, self) {
				for (var i=0, len=arr.length; i<len; i++) {
					if (i in arr) {
						callback.call(self, arr[i], i, arr);
					}
				}
			};
		}
	}(Array.prototype.forEach);

	function isArray (arr) {
		if (Array.isArray) {
			return Array.isArray(arr);
		}
		else {
			return Object.prototype.toString.call(arr) !== '[object Array]';
		}
	}

	function isNode (elem) {
		if ( !elem ) {
			return false;
		}

		try {
			return (elem instanceof Node) || (elem instanceof HTMLElement);
		} catch (err) {}

		if (typeof elem !== 'object') {
			return false;
		}

		if (typeof elem.nodeType !== 'number') {
			return false;
		}

		if (typeof elem.nodeName !== 'string') {
			return false;
		}

		return true;
	}

	function setTransform (elem, transform) {
		elem.style['-webkit-transform'] = transform;
		elem.style[   '-moz-transform'] = transform;
		elem.style[    '-ms-transform'] = transform;
		elem.style[     '-o-transform'] = transform;
		elem.style[        'transform'] = transform;
	}

	function setTransition (elem, transition) {
		if (transition) {
			elem.style['-webkit-transition'] = '-webkit-'+transition;
			elem.style[   '-moz-transition'] =    '-moz-'+transition;
			elem.style[    '-ms-transition'] =     '-ms-'+transition;
			elem.style[     '-o-transition'] =      '-o-'+transition;
			elem.style[        'transition'] =            transition;
		}
		else {
			elem.style['-webkit-transition'] = '';
			elem.style[   '-moz-transition'] = '';
			elem.style[    '-ms-transition'] = '';
			elem.style[     '-o-transition'] = '';
			elem.style[        'transition'] = '';
		}
	}

	function getStyles (elem, notComputed) {
		var styles;

		if (notComputed) {
			styles = elem.style;
		}
		else {
			styles = document.defaultView.getComputedStyle(elem, null);
		}

		return {
			display          : styles.display          ,
			opacity          : styles.opacity          ,
			paddingRight     : styles.paddingRight     ,
			paddingLeft      : styles.paddingLeft      ,
			marginRight      : styles.marginRight      ,
			marginLeft       : styles.marginLeft       ,
			borderRightWidth : styles.borderRightWidth ,
			borderLeftWidth  : styles.borderLeftWidth  ,
			top              : styles.top              ,
			left             : styles.left             ,
			height           : styles.height           ,
			width            : styles.width            ,
			position         : styles.position
		};
	}

	function getTotalWidth (styles) {
		var width = 0;
		width += parseInt(styles.width            || 0);
		width += parseInt(styles.paddingLeft      || 0);
		width += parseInt(styles.paddingRight     || 0);
		width += parseInt(styles.borderLeftWidth  || 0);
		width += parseInt(styles.borderRightWidth || 0);
		width += parseInt(styles.marginLeft       || 0);
		width += parseInt(styles.marginRight      || 0);
		return width;
	}

	// this is tuned for use with the iOS transition
	// be careful if using this elsewhere
	function transitionElems (transitions, timeout, easing, callback) {
		if (typeof transitions.length !== 'number') {
			transitions = [ transitions ];
		}

		var opacities = transitions.map(function (transition) {
			return transition.elem.style.opacity;
		});

		setInitialStyles(function () {
			animateElems(function () {
				restoreStyles(function () {
					callback();
				});
			});
		});

		function setInitialStyles (callback) {
			transitions.forEach(function (transition) {
				if (typeof transition.transitionStart !== 'undefined') {
					setTransform(transition.elem, transition.transitionStart);
				}
				if (typeof transition.opacityStart !== 'undefined') {
					transition.elem.style.opacity = transition.opacityStart + '';
				}
			});

			setTimeout(function () {
				var transitionString = 'transform '+(timeout/1000)+'s ease-in-out, opacity '+(timeout/1000)+'s ease-in-out';
				transitions.forEach(function (transition) {
					setTransition(transition.elem, transitionString);
				});

				setTimeout(callback, 0);
			}, 0);
		}

		function animateElems (callback) {
			transitions.forEach(function (transition) {
				if (typeof transition.transitionEnd !== 'undefined') {
					setTransform(transition.elem, transition.transitionEnd);
				}
				if (typeof transition.opacityEnd !== 'undefined') {
					transition.elem.style.opacity = transition.opacityEnd + '';
				}
			});

			transitions.forEach(function (transition) {
				transition.elem.addEventListener('webkitTransitionEnd' , transitionFinished , false);
				transition.elem.addEventListener('transitionend'       , transitionFinished , false);
				transition.elem.addEventListener('oTransitionEnd'      , transitionFinished , false);
				transition.elem.addEventListener('otransitionend'      , transitionFinished , false);
				transition.elem.addEventListener('MSTransitionEnd'     , transitionFinished , false);
				transition.elem.addEventListener('transitionend'       , transitionFinished , false);
			});

			var done = false;

			function isTransitionElem (elem) {
				for (var i=0, l=transitions.length; i<l; i++) {
					if (elem === transitions[i].elem) {
						return true;
					}
				}
				return false;
			}

			function transitionFinished (e) {
				if (done || !isTransitionElem(e.target)) {
					return;
				}
				done = true;

				transitions.forEach(function (transition) {
					transition.elem.removeEventListener('webkitTransitionEnd' , transitionFinished);
					transition.elem.removeEventListener('transitionend'       , transitionFinished);
					transition.elem.removeEventListener('oTransitionEnd'      , transitionFinished);
					transition.elem.removeEventListener('otransitionend'      , transitionFinished);
					transition.elem.removeEventListener('MSTransitionEnd'     , transitionFinished);
					transition.elem.removeEventListener('transitionend'       , transitionFinished);
				});

				callback();
			}
		}

		function restoreStyles (callback) {
			transitions.forEach(function (transition) {
				setTransition(transition.elem, '');
			});

			setTimeout(function () {
				transitions.forEach(function (transition, i) {
					setTransform(transition.elem, '');
					transition.elem.style.opacity = opacities[i];
				});

				callback();
			}, 0);
		}
	}



	App.platform        = os.name;
	App.platformVersion = os.version;

	return {
		query         : query         ,
		os            : os            ,
		forEach       : forEach       ,
		isArray       : isArray       ,
		isNode        : isNode        ,
		setTransform  : setTransform  ,
		setTransition : setTransition ,
		animate       : transitionElems ,
		getStyles     : getStyles     ,
		getTotalWidth : getTotalWidth
	};
}(window, document, App);
