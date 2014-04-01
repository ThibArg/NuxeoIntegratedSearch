/**
 *	nuxeo-utils.js
 *
 *	Utilities to:
 *		- Store values locally (url and credentials)
 *		- Get default values (mainly for testing)
 *	
 * 
 * TODO: Doc for WARNING about accessors ("remember" will save/remove params from the local storage for example)
 */
if(typeof UTILS_NUXEO !== 'undefined') {
	console.log("[WARN] Nuxeo initialization called more than once");
}

UTILS_NUXEO = null;

(function scope_UTILS_NUXEO() {
	"use strict";
	
	//--------------------------------------
	//Constants
	//--------------------------------------
	// Using an object so toString() is easier to write
	var K =  {
		QUERY_LIMIT_DEFAULT	: 12,// 4 rows of 3 for example
		QUERY_LIMIT_MAX		: 24,
	
	// Administrator/Administrator (for quick test)
		TEST_LOCALHOST		: "http://localhost:8080/nuxeo",
		TEST_LOGIN			: "Administrator",
		TEST_PWD			: "Administrator",
		TEST_B64_ADMIN		: "Basic QWRtaW5pc3RyYXRvcjpBZG1pbmlzdHJhdG9y",
	
		KEY_FOR_STORAGE		: "Nuxeo-IS"
	};
	
	//--------------------------------------
	// constructor and functions
	//--------------------------------------
	function _UTILS_NUXEO() {
		var _nuxeoHost = "",
			_login = "",
			_pwd = "",
			_queryLimit = K.QUERY_LIMIT_DEFAULT,
			_remember = false;
	
		//--------------------------------------
		// Properties
		//--------------------------------------
		this.__defineGetter__('nuxeoHost', function() { return _nuxeoHost; });
		this.__defineSetter__('nuxeoHost', function(inValue) { _nuxeoHost = inValue ? true : false; });
		
		this.__defineGetter__('login', function() { return _login; });
		this.__defineSetter__('login', function(inValue) {
											if(typeof(inValue) === "string") {
												_login = inValue;
												_buildBasicAuth();
											} else {
												throw new TypeError("This property is a string");
											}
										});
		
		this.__defineGetter__('pwd', function() { return _pwd; });
		this.__defineSetter__('pwd', function(inValue) {
											if(typeof(inValue) === "string") {
												_pwd = inValue;
												_buildBasicAuth();
											} else {
												throw new TypeError("This property is a string");
											}
										});

		this.__defineGetter__('queryLimit', function() { return _queryLimit; });
		this.__defineSetter__('queryLimit', function(inValue) { _queryLimit = inValue });

		this.__defineGetter__('remember', function() { return _remember; });
		this.__defineSetter__('remember', function(inValue) {
											_remember = inValue ? true : false;
											if(_remember) {
												_saveParams();
											} else {
												_removeSavedParams();
											}
										});
		
		// Constants
		this.__defineGetter__('QUERY_LIMIT_DEFAULT', function() { return K.QUERY_LIMIT_DEFAULT; });
		this.__defineGetter__('QUERY_LIMIT_MAX', function() { return K.QUERY_LIMIT_MAX; });
		this.__defineGetter__('TEST_LOCALHOST', function() { return K.TEST_LOCALHOST; });
		this.__defineGetter__('TEST_LOGIN', function() { return K.TEST_LOGIN; });
		this.__defineGetter__('TEST_PWD', function() { return K.TEST_PWD; });
		this.__defineGetter__('TEST_B64_ADMIN', function() { return K.TEST_B64_ADMIN; });
		this.__defineGetter__('KEY_FOR_STORAGE', function() { return K.KEY_FOR_STORAGE; });
		
		this.__defineSetter__('QUERY_LIMIT_DEFAULT', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('QUERY_LIMIT_MAX', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('TEST_LOCALHOST', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('TEST_LOGIN', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('TEST_PWD', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('TEST_B64_ADMIN', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('KEY_FOR_STORAGE', function(inValue) { throw new TypeError("This property is read-only"); });
				
		//--------------------------------------
		//Private functions
		//--------------------------------------
		/**
		 * _poorManStringXOR
		 * Just to obfuscate a bit the stored password
		 * As it's an XOR operation:
		 * 	- It's called "poorMan" ;->
		 *  - The same sring can be alternatively retreived by calling _poorManStringXOR
		 * 
		 * @param {string} inStr, the string to xor.
		 * 
		 */
		function _poorManStringXOR(inStr) {
			var result = "";
			var key = 12;
			for(var i = 0; i < inStr.length; i++) {
				result += String.fromCharCode(key ^ inStr.charCodeAt(i));
			}

			return result;
		}
		
		/**
		 * _loadSavedParams
		 */
		function _loadSavedParams() {
			
			_nuxeoHost = "";
			_login = "";
			_pwd = "";
			_queryLimit = K.QUERY_LIMIT_DEFAULT;
			_remember = false;
			
			try {
				var values = JSON.parse( window.localStorage[K.KEY_FOR_STORAGE] );
				
				if(values) {
					if("nuxeoHost" in values && typeof values.nuxeoHost === "string") {
						_nuxeoHost = values.nuxeoHost;
					}

					if("login" in values && typeof values.login === "string") {
						_login = values.login;
					}

					if("pwd" in values && typeof values.pwd === "string") {
						_pwd = _poorManStringXOR(values.pwd);
					}

					if("queryLimit" in values && typeof values.queryLimit === "string") {
						_queryLimit = parseInt( _poorManStringXOR(values.queryLimit) );
						if(isNaN(_queryLimit) || _queryLimit < 1) {
							_queryLimit = K.QUERY_LIMIT_DEFAULT;
						}
					}

					_remember = true; // We had values, so we wanted to remember
				}
				
			} catch(e) {
				// No values or pb in storage
			}
		}

		/**
		 * _saveParams
		 * We don't try-catch. It's bad (not doing it. try-catch is not bad)
		 *
		 * Numeric values are converted to string
		 */
		function _saveParams() {
			window.localStorage.setItem(K.KEY_FOR_STORAGE,
										JSON.stringify({
											nuxeoHost		: _nuxeoHost,
											login			: _login,
											pwd				: _poorManStringXOR(_pwd),
											queryLimit		: "" + _queryLimit
										}) );
		}
		
		/**
		 * _removeSavedParams
		 * 
		 */
		function _removeSavedParams() {
			window.localStorage.removeItem(K.KEY_FOR_STORAGE);
		}
		
		
		//--------------------------------------
		//Instance methods
		//--------------------------------------
		/**
		 * toString
		 * Mainly for quick debug/check values
		 */
		this.toString = function() {
			return JSON.stringify (
				{	constants	: K,
				
					_nuxeoHost	: _nuxeoHost,
					_login		: _login,
					_pwd		: _pwd
				});
		};
		
		this.getTestValues = function() {
			return { nuxeoHost	: K.TEST_LOCALHOST,
					 login		: K.TEST_LOGIN,
					 pwd		: K.TEST_PWD
					};
		};
		
		/**
		 * readyForQuery
		 * 
		 */
		this.readyToQuery = function() {
			return _nuxeoHost !== "" && _login !== "" && _pwd !== "";
		};

		/**
		 * getParams
		 * 
		 */
		this.getParams = function() {
			return { nuxeoHost	: _nuxeoHost,
					 login		: _login,
					 pwd		: _pwd,
					 remember	: _remember
					};
		};
		
		/**
		 * setParams
		 * 
		 */
		this.setParams = function(inNuxeoHost, inLogin, inPwd, inRemember) {
			
			/* . . . ERROR CHECK PARAMETERS . . . */
			
			_nuxeoHost = inNuxeoHost;
			if(_nuxeoHost[ _nuxeoHost.length - 1 ] === "/") {
				_nuxeoHost = _nuxeoHost.substring(0, _nuxeoHost.length - 1);
			}
			_login = inLogin;
			_pwd = inPwd;
			_remember = inRemember;
						
			if(inRemember) {
				_saveParams();
			} else {
				_removeSavedParams();
			}
		};

		/**
		 * updateNuxeoClient
		 *
		 * We need this wrapper because we are in a Chrome Extension
		 *		=> Not already connected to a nuxe server
		 *		=> We can't	use relative paths.
		 */
		this.updateNuxeoClient = function(inNuxeoClient) {
			// No error-check. Assume inNuxeoClient is a valid object
			// created with new nuxeo.Client().
			inNuxeoClient._baseURL = _nuxeoHost;
		 	inNuxeoClient._restURL = _nuxeoHost + "/site/api/v1";
			inNuxeoClient._automationURL = _nuxeoHost + "/site/automation";

			inNuxeoClient._username = _login;
			inNuxeoClient._password = _pwd;
		}
		
		// All declared, time to initialized self
		_loadSavedParams();

	} // function _UTILS_NUXEO()
	
	//--------------------------------------
	//Class methods
	//--------------------------------------
	/*
	_UTILS_NUXEO.doThis = function(p1, p2) {
	
	}
	*/
	
	UTILS_NUXEO = new _UTILS_NUXEO();

}());

// --EOF--
 