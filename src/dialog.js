App._Dialog = function (window, document, Clickable, App, utils) {
	var currentCallback,
		dialogQueue;

	function preventDefault (e) {
		e.preventDefault();
	}

	function createDialog (options, callback) {
		var dialogContainer = document.createElement('div');
		dialogContainer.className += ' app-dialog-container';
		if (utils.os.ios && (utils.os.version <= 5)) {
			dialogContainer.className += ' ios5';
		}
		if (!utils.os.android || (utils.os.version >= 4)) {
			dialogContainer.addEventListener('touchstart', preventDefault, false);
		}

		if (options.cancelButton) {
			dialogContainer.addEventListener('touchstart', function (e) {
				if (e.target === dialogContainer) {
					closeDialog();
				}
			}, false);
		}

		var dialog = document.createElement('div');
		dialog.className += ' app-dialog';
		if (options.dark) {
			dialog.className += ' dark';
		}
		dialogContainer.appendChild(dialog);

		if (options.title) {
			var title = document.createElement('div');
			title.className += ' title';
			title.textContent = options.title;
			dialog.appendChild(title);
		}

		if (options.text) {
			var text = document.createElement('div');
			text.className += ' text';
			text.textContent = options.text;
			dialog.appendChild(text);
		}

		for (var key in options) {
			if (options[key] && (key.substr(key.length-6) === 'Button') && (key !== 'okButton') && (key !== 'cancelButton')) {
				var buttonName = key.substr(0, key.length-6),
					button     = document.createElement('div');
				button.className = 'button';
				button.setAttribute('data-button', buttonName);
				button.textContent = options[key];
				Clickable(button);
				button.addEventListener('click', handleChoice, false);
				dialog.appendChild(button);
			}
		}

		if (options.okButton) {
			var button = document.createElement('div');
			button.className = 'button ok';
			button.setAttribute('data-button', 'ok');
			button.textContent = options.okButton;
			Clickable(button);
			button.addEventListener('click', handleChoice, false);
			dialog.appendChild(button);
		}

		if (options.cancelButton) {
			var button = document.createElement('div');
			button.className = 'button cancel';
			button.setAttribute('data-button', 'cancel');
			button.textContent = options.cancelButton;
			Clickable(button);
			button.addEventListener('click', handleChoice, false);
			dialog.appendChild(button);
		}

		function handleChoice () {
			var buttonName = this.getAttribute('data-button');
			if (buttonName === 'cancel') {
				buttonName = false;
			}
			callback(buttonName);
		}

		return dialogContainer;
	}

	function showDialog (options, callback, force) {
		if (dialogQueue && !force) {
			dialogQueue.push([ options, callback ]);
			return;
		}
		dialogQueue = dialogQueue || [];

		var dialogLock  = false,
			dialog      = createDialog(options, dialogClosed),
			innerDialog = dialog.firstChild;
		currentCallback = dialogClosed;

		if (utils.os.ios) {
			dialog.className += ' fancy';
		}
		document.body.appendChild(dialog);
		setTimeout(function () {
			dialog.className += ' enabled';
		}, 50);

		function dialogClosed (status) {
			if (dialogLock) {
				return;
			}
			dialogLock = true;

			if ((typeof status !== 'string') && !options.cancelButton) {
				return;
			}

			currentCallback = null;

			dialog.className = dialog.className.replace(/\benabled\b/g, '');

			setTimeout(function () {
				processDialogQueue();
				callback(status);
			}, 0);

			setTimeout(function () {
				try {
					document.body.removeChild(dialog);
				}
				catch (err) {}
			}, 600);

			return true;
		}
	}

	function closeDialog () {
		if (currentCallback) {
			return currentCallback(false);
		}
	}

	function hasDialog () {
		return !!currentCallback;
	}

	function processDialogQueue () {
		if ( !dialogQueue ) {
			return;
		}

		if ( !dialogQueue.length ) {
			dialogQueue = null;
			return;
		}

		var args = dialogQueue.shift();
		args.push(true);
		showDialog.apply(window, args);
	}



	function Dialog (options, callback) {
		if ((typeof options !== 'object') || (options === null)) {
			throw TypeError('dialog options must be an object, got ' + options);
		}

		switch (typeof options.dark) {
			case 'undefined':
			case 'boolean':
				break;
			default:
				throw TypeError('dialog dark mode must a boolean if defined, got ' + options.dark);
		}

		switch (typeof options.title) {
			case 'undefined':
			case 'string':
				break;
			default:
				throw TypeError('dialog title must be a string if defined, got ' + options.title);
		}

		switch (typeof options.text) {
			case 'undefined':
			case 'string':
				break;
			default:
				throw TypeError('dialog text must be a string if defined, got ' + options.text);
		}

		for (var key in options) {
			if (key !== 'dark') {
				switch (typeof options[key]) {
					case 'undefined':
					case 'string':
						break;
					default:
						throw TypeError('dialog button ('+key+') must be a string if defined, got ' + options[key]);
				}
			}
		}

		switch (typeof callback) {
			case 'undefined':
				callback = function () {};
			case 'function':
				break;
			default:
				throw TypeError('callback must be a function if defined, got ' + callback);
		}

		return showDialog(options, callback);
	}

	Dialog.close = function () {
		closeDialog();
	};

	Dialog.status = function () {
		return hasDialog();
	};

	App.dialog = Dialog;
	return Dialog;
}(window, document, Clickable, App, App._utils);
