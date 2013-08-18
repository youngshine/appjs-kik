App._Scroll = function (Scrollable, Utils) {
	var TAGS = {
		APP_CONTENT    : 'app-content' ,
		APP_SCROLLABLE : 'app-scrollable' ,
		APP_SCROLLHACK : 'app-scrollhack' ,
		NO_SCROLL      : 'data-no-scroll' ,
		SCROLLABLE     : 'data-scrollable' ,
		LAST_SCROLL    : 'data-last-scroll' ,
		SCROLL_STYLE   : 'data-scroll-style' ,
		TOUCH_SCROLL   : '-webkit-overflow-scrolling'
	};

	return {
		setup                 : setupScrollers            ,
		disable               : disableScrolling          ,
		saveScrollPosition    : savePageScrollPosition    ,
		saveScrollStyle       : savePageScrollStyle       ,
		restoreScrollPosition : restorePageScrollPosition ,
		restoreScrollStyle    : restorePageScrollStyle
	};



	function setupScrollers (page) {
		Utils.forEach(
			page.querySelectorAll('.'+TAGS.APP_CONTENT),
			function (content) {
				if ( !content.getAttribute(TAGS.NO_SCROLL) ) {
					setupScroller(content);
				}
			}
		);

		Utils.forEach(
			page.querySelectorAll('['+TAGS.SCROLLABLE+']'),
			function (content) {
				setupScroller(content);
			}
		);
	}

	function setupScroller (content) {
		var forceIScroll = !!window['APP_FORCE_ISCROLL'];
		Scrollable(content, forceIScroll);
		content.className += ' '+TAGS.APP_SCROLLABLE;
		if (!forceIScroll && Utils.os.ios && Utils.os.version < 6) {
			content.className += ' '+TAGS.APP_SCROLLHACK;
		}
	}

	function disableScrolling (page) {
		Utils.forEach(
			page.querySelectorAll('*'),
			function (elem) {
				elem.style[TAGS.TOUCH_SCROLL] = '';
			}
		);
	}

	function getScrollableElems (page) {
		var elems = [];

		if (page) {
			Utils.forEach(
				page.querySelectorAll('.'+TAGS.APP_SCROLLABLE),
				function (elem) {
					if (elem._scrollable) {
						elems.push(elem);
					}
				}
			);
		}

		return elems;
	}

	function savePageScrollPosition (page) {
		Utils.forEach(
			getScrollableElems(page),
			function (elem) {
				if (elem._iScroll) {
					return;
				}

				var scrollTop = elem._scrollTop();
				elem.setAttribute(TAGS.LAST_SCROLL, scrollTop+'');
			}
		);
	}

	function savePageScrollStyle (page) {
		Utils.forEach(
			getScrollableElems(page),
			function (elem) {
				if (elem._iScroll) {
					return;
				}

				var scrollStyle = elem.style[TAGS.TOUCH_SCROLL] || '';
				elem.style[TAGS.TOUCH_SCROLL] = '';
				elem.setAttribute(TAGS.SCROLL_STYLE, scrollStyle);
			}
		);
	}

	function restorePageScrollPosition (page, noTimeout) {
		Utils.forEach(
			getScrollableElems(page),
			function (elem) {
				if (elem._iScroll) {
					return;
				}

				var scrollTop = parseInt( elem.getAttribute(TAGS.LAST_SCROLL) );

				if (scrollTop) {
					if ( !noTimeout ) {
						setTimeout(function () {
							elem._scrollTop(scrollTop);
						}, 0);
					}
					else {
						elem._scrollTop(scrollTop);
					}
				}
			}
		);
	}

	function restorePageScrollStyle (page) {
		Utils.forEach(
			getScrollableElems(page),
			function (elem) {
				if (elem._iScroll) {
					return;
				}

				var scrollStyle = elem.getAttribute(TAGS.SCROLL_STYLE) || '';

				if (scrollStyle) {
					elem.style[TAGS.TOUCH_SCROLL] = scrollStyle;
				}

			}
		);

		restorePageScrollPosition(page, true);
	}
}(Scrollable, App._Utils);
