/*global define*/
(function (global, undefined) {
	"use strict";

	var document = global.document,
	    Alertify;

	Alertify = function () {

		var $, addListeners, bind, build, close, hide, init, notify, setup, unbind,
		    dialog, extend, log,
		    cover, dialogs, delay, element, isopen, keys, labels, logElement, queue;

		dialogs = {
			buttons : {
				holder : "<nav class=\"alertify-buttons\">{{buttons}}</nav>",
				ok     : "<button class=\"alertify-button alertify-button-ok\" id=\"aOK\">{{ok}}</button>",
				cancel : "<button class=\"alertify-button alertify-button-cancel\" id=\"aCancel\">{{cancel}}</button>"
			},
			input   : "<input type=\"text\" class=\"alertify-text\" id=\"aText\">",
			message : "<p class=\"alertify-message\">{{message}}</p>",
			log     : "<article class=\"alertify-log{{class}}\">{{message}}</article>"
		};

		delay   = 5000;
		keys    = { ENTER: 13, ESC: 27 };
		labels  = { ok: "OK", cancel: "Cancel" };
		queue   = [];
		isopen  = false;

		/**
		 * Shorthand for document.getElementById()
		 * 
		 * @param  {String} id    A specific element ID

		 * @return {Object}       HTML element
		 */
		$ = function (id) {
			return document.getElementById(id);
		};

		/**
		 * Set the proper button click events
		 *
		 * @param {Function} fn    [Optional] Callback function
		 *
		 * @return {undefined}
		 */
		addListeners = function (fn) {
			var btnOK     = $("aOK")     || undefined,
			    btnCancel = $("aCancel") || undefined,
			    input     = $("aText")   || undefined,
			    hasOK     = (typeof btnOK !== "undefined"),
			    hasCancel = (typeof btnCancel !== "undefined"),
			    val       = "",
			    ok, cancel, common, key;

			// ok event handler
			ok = function (event) {
				common(event);
				if (typeof input !== "undefined") val = input.value;
				if (typeof fn === "function") fn(true, val);
				if (typeof event.preventDefault !== "undefined") event.preventDefault();
			};

			// cancel event handler
			cancel = function (event) {
				common(event);
				if (typeof fn === "function") fn(false);
				if (typeof event.preventDefault !== "undefined") event.preventDefault();
			};

			// common event handler (keyup, ok and cancel)
			common = function (event) {
				hide();
				unbind(document.body, "keyup", key);				
			};

			// keyup handler
			key = function (event) {
				var keyCode = event.keyCode;
				if (keyCode === keys.ENTER && hasOK) ok(event);
				else if (keyCode === keys.ESC && hasCancel) cancel(event);
			};

			// handle OK click
			if (hasOK) bind(btnOK, "click", ok);
			// handle Cancel click
			if (hasCancel) bind(btnCancel, "click", cancel);
			
			// clear focus off activeElement element to ensure
			// the ENTER key triggers the correct behaviour
			// Firefox has an issue if this isn't done and the current
			// focus is an anchor
			document.activeElement.blur();
			// listen for keys, OK => ENTER, Cancel => ESC
			bind(document.body, "keyup", key);
		};

		/**
		 * Bind events to elements
		 * 
		 * @param  {Object}   el       HTML Object
		 * @param  {Event}    event    Event to attach to element
		 * @param  {Function} fn       Callback function
		 * 
		 * @return {undefined}
		 */
		bind = function (el, event, fn) {
			if (typeof el.addEventListener === "function") {
				el.addEventListener(event, fn, false);
			} else if (el.attachEvent) {
				el.attachEvent("on" + event, fn);
			}
		};

		/**
		 * Build the proper message box
		 * 
		 * @param  {Object} item    Current object in the queue
		 * @return {String}         An HTML string of the message box
		 */
		build = function (item) {
			var html    = "",
			    type    = item.type,
			    message = item.message;

			html += "<div class=\"alertify-dialog\">";
			html += "<article class=\"alertify-inner\">";
			html += dialogs.message.replace("{{message}}", message);

			if (type === "prompt") { html += dialogs.input; }

			html += dialogs.buttons.holder;
			html += "</article>";
			html += "</div>";

			switch (type) {
			case "confirm":
			case "prompt":
				html = html.replace("{{buttons}}", dialogs.buttons.cancel + dialogs.buttons.ok);
				html = html.replace("{{ok}}", labels.ok).replace("{{cancel}}", labels.cancel);
				break;
			case "alert":
				html = html.replace("{{buttons}}", dialogs.buttons.ok);
				html = html.replace("{{ok}}", labels.ok);
				break;
			default:
				break;
			}

			element.className = "alertify alertify-show alertify-" + type;
			cover.className   = "alertify-cover";
			return html;
		};

		/**
		 * Close the log messages
		 * 
		 * @return {undefined}
		 */
		close = function () {
			setTimeout(function () {
				var child = logElement.childNodes[logElement.childNodes.length - 1];
				if (typeof child !== "undefined") logElement.removeChild(child);
			}, delay);
		};

		/**
		 * Hide the dialog and rest to defaults
		 *
		 * @return {undefined}
		 */
		hide = function () {
			// remove reference from queue
			queue.splice(0,1);
			// if items remaining in the queue
			if (queue.length > 0) setup();
			else {
				isopen = false;
				element.className = "alertify alertify-hide alertify-hidden";
				cover.className   = "alertify-cover alertify-hidden";
			}
		};

		/**
		 * Initialize Alertify
		 * Create the 2 main elements
		 *
		 * @return {undefined}
		 */
		init = function () {
			// ensure legacy browsers support html5 tags
			document.createElement("nav");
			document.createElement("article");
			document.createElement("section");
			// cover
			cover = document.createElement("div");
			cover.setAttribute("id", "alertifycover");
			cover.className = "alertify-cover alertify-hidden";
			document.body.appendChild(cover);
			// main element
			element = document.createElement("section");
			element.setAttribute("id", "alertify");
			element.className = "alertify alertify-hidden";
			document.body.appendChild(element);
			// main element
			logElement = document.createElement("section");
			logElement.setAttribute("id", "alertifylogs");
			logElement.className = "alertify-logs";
			document.body.appendChild(logElement);
		};

		/**
		 * Add new log message
		 * If a type is passed, a class name "alertify-log-{type}" will get added.
		 * This allows for custom look and feel for various types of notifications.
		 * 
		 * @param  {String} message    The message passed from the callee
		 * @param  {String} type       [Optional] Type of log message
		 * 
		 * @return {undefined}
		 */
		notify = function (message, type) {
			var log = document.createElement("article");
			log.className = "alertify-log" + ((typeof type === "string" && type !== "") ? " alertify-log-" + type : "");
			log.innerHTML = message;
			// prepend child
			logElement.insertBefore(log, logElement.firstChild);
			// triggers the CSS animation
			setTimeout(function() { log.className = log.className + " alertify-log-show"; }, 50);
			close();
		};

		/**
		 * Initiate all the required pieces for the dialog box
		 *
		 * @return {undefined}
		 */
		setup = function () {
			var item = queue[0];
			
			isopen = true;
			element.innerHTML = build(item);
			addListeners(item.callback);
			// adding focus to prompt input box
			// doesn't work without a setTimeout... 
			if (item.type === "prompt") global.setTimeout(function () { document.getElementById("aText").focus(); }, 0);
		};

		/**
		 * Unbind events to elements
		 * 
		 * @param  {Object}   el       HTML Object
		 * @param  {Event}    event    Event to detach to element
		 * @param  {Function} fn       Callback function
		 * 
		 * @return {undefined}
		 */
		unbind = function (el, event, fn) {
			if (typeof el.removeEventListener === "function") {
				el.removeEventListener(event, fn, false);
			} else if (el.detachEvent) {
				el.detachEvent("on" + event, fn);
			}
		};

		/**
		 * Create a dialog box
		 * 
		 * @param  {String}   message    The message passed from the callee
		 * @param  {String}   type       Type of dialog to create
		 * @param  {Function} fn         [Optional] Callback function
		 * 
		 * @return {Object}
		 */
		dialog = function (message, type, fn) {
			// error catching
			if (typeof message !== "string") throw new Error("message must be a string");
			if (typeof type !== "string") throw new Error("type must be a string");
			if (typeof fn !== "undefined" && typeof fn !== "function") throw new Error("fn must be a function");

			queue.push({ type: type, message: message, callback: fn });
			if (!isopen) setup();

			return this;
		};

		/**
		 * Extend the log method to create custom methods
		 * 
		 * @param  {String} type    Custom method name
		 * @return {Function}
		 */
		extend = function (type) {
			return function (message) { log(message, type); };
		};

		/**
		 * Show a new log message box
		 * 
		 * @param  {String} message    The message passed from the callee
		 * @param  {String} type       [Optional] Optional type of log message
		 * 
		 * @return {Object}
		 */
		log = function (message, type) {
			notify(message, type);
			return this;
		};

		// Bootstrap
		init();

		return {
			alert   : function (message, fn) { dialog(message, "alert", fn); return this; },
			confirm : function (message, fn) { dialog(message, "confirm", fn); return this; },
			extend  : extend,
			log     : log,
			prompt  : function (message, fn) { dialog(message, "prompt", fn); return this; },
			success : function (message) { log(message, "success"); return this; },
			error   : function (message) { log(message, "error"); return this; },
			delay   : delay,
			labels  : labels
		};
	};

	// AMD and window support
	if (typeof define === "function") {
		define([], function () { return new Alertify(); });
	} else {
		if (typeof global.alertify === "undefined") { global.alertify = new Alertify(); }
	}

}(this));