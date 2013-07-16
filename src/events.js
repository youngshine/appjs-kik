App._Events = function () {
	var APPJS_EVENTS_VAR = '__appjsCustomEventing';

	var hasCustomEvents = supportsCustomEventing();

	return {
		init : setupCustomEventing ,
		fire : fireEvent
	};



	function supportsCustomEventing () {
		try {
			var elem = document.createElement('div'),
				evt  = document.createEvent('CustomEvent');
			evt.initEvent('fooBarFace', false, true);
			elem.dispatchEvent(evt);
			return true;
		}
		catch (err) {
			return false;
		}
	}

	function setupCustomEventing (elem, names) {
		if (hasCustomEvents) {
			return;
		}
		if ( elem[APPJS_EVENTS_VAR] ) {
			names.forEach(elem[APPJS_EVENTS_VAR].addEventType);
			return;
		}

		elem[APPJS_EVENTS_VAR] = {
			fire                : fireElemEvent ,
			addEventType        : addEventType ,
			addEventListener    : elem.addEventListener ,
			removeEventListener : elem.removeEventListener
		};

		var listeners = {};
		names.forEach(function (name) {
			listeners[name] = [];
		});

		function addEventType (name) {
			if (names.indexOf(name) !== -1) {
				return;
			}
			names.push(name);
			listeners[name] = [];
		}

		function fireElemEvent (name) {
			if (names.indexOf(name) === -1) {
				return;
			}

			listeners[name].forEach(function (listener) {
				setTimeout(function () {
					listener.call(elem, {});
				}, 0);
			});
		}

		elem.addEventListener = function (name, listener) {
			if (names.indexOf(name) === -1) {
				elem._addEventListener.apply(this, arguments);
				return;
			}

			var eventListeners = listeners[name];

			if (eventListeners.indexOf(listener) === -1) {
				eventListeners.push(listener);
			}
		};

		elem.removeEventListener = function (name, listener) {
			if (names.indexOf(name) === -1) {
				elem._removeEventListener.apply(this, arguments);
				return;
			}

			var eventListeners = listeners[name],
				index          = eventListeners.indexOf(listener);

			if (index !== -1) {
				eventListeners.splice(index, 1);
			}
		};
	}

	function fireEvent (elem, eventName) {
		if (elem[APPJS_EVENTS_VAR]) {
			elem[APPJS_EVENTS_VAR].fire(eventName);
			return;
		}
		else {
			var evt = document.createEvent('CustomEvent');
			evt.initEvent(eventName, false, true);//TODO
			elem.dispatchEvent(evt);
		}
	}
}();
