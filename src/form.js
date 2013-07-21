App._Form = function (window, document, App, utils) {
	App.form = function (form, callback) {
		if ( !App._utils.isNode(form) ) {
			throw TypeError('form must be a DOM node, got ' + form);
		}
		if (typeof callback !== 'function') {
			throw TypeError('callback must be a function, got '+callback);
		}

		setupForm(form, callback);
	};

	return {};

	function setupForm (form, callback) {
		var isForm = (form.nodeName === 'FORM'),
			locked = false,
			submitButtons;

		if (isForm) {
			var submit = document.createElement('input');
			submit.style.display = 'none';
			submit.type = 'submit';
			form.appendChild(submit);
			form.addEventListener('submit', function (e) {
				e.preventDefault();
				submitForm();
			}, false);
			submitButtons = form.querySelectorAll('.app-submit');
		} else {
			submitButtons = [form];
		}

		App._utils.forEach(submitButtons, function (submitButton) {
			if (submitButton.nodeName === 'TEXTAREA') {
				isText = true;
			} else if (submitButton.nodeName !== 'INPUT') {
				isText = false;
			} else {
				switch ((submitButton.type || '').toLowerCase()) {
					case 'button':
					case 'submit':
					case 'reset':
					case 'hidden':
						isText = false;
						break;
					default:
						isText = true;
						break;
				}
			}
			if (isText) {
				submitButton.addEventListener('keydown', function (e) {
					if (e.which === 13) {
						e.preventDefault();
						submitForm();
					}
				}, false);
			} else {
				submitButton.addEventListener('click', function (e) {
					e.preventDefault();
					submitForm();
				}, false);
			}
		});

		function submitForm () {
			if (locked) {
				return;
			}
			locked = true;
			form.disabled = true;

			var params = {},
				inputs = isForm ? form.querySelectorAll('[name]') : [form],
				done   = false;

			if (isForm) {
				App._utils.forEach(
					form.querySelectorAll('[name]'),
					function (elem) {
						params[elem.name] = elem.value;
					}
				);
			} else {
				params.value = form.value;
				if (form.name) {
					params[form.name] = form.value;
				}
			}

			App._utils.forEach(inputs, function (elem) {
				elem.disabled = true;
			});

			callback.call(this, params, function () {
				if (done) {
					return;
				}
				done = true;

				App._utils.forEach(inputs, function (elem) {
					elem.disabled = false;
				});

				locked = false;
				form.disabled = false;
			});
		}
	}
}(window, document, App, App._utils);
