/**
 * NUXEO.js
 * 
 * TODO: Doc for WARNING about accessors ("remember" will save/remove params from the local storage for example)
 */
if(typeof NUXEO !== 'undefined') {
	console.log("[WARN] Nuxeo initialization called more than once");
}

NUXEO = null;

(function scope_NUXEO() {
	"use strict";
	
	//--------------------------------------
	//Constants
	//--------------------------------------
	// Using an object so toString() is easier to write
	var K =  {
		REST_PATTERN		: "/site/automation/",
		QUERY_OPERATION		: "Document.Query",
		QUERY_PICT_STATEMENT:     "SELECT * FROM Document WHERE ecm:mixinType IN ('Picture')"
								+ " AND ecm:mixinType != 'HiddenInNavigation' AND ecm:isCheckedInVersion = 0"
								+ " AND ecm:currentLifeCycleState != 'deleted'",
		QUERY_LIMIT_DEFAULT	: 12,// 4 rows of 3 for example
		QUERY_LIMIT_MAX		: 24,
		LOGIN_PATH			: "site/automation/login",
	
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
	function _NUXEO() {
		var _doDAMQuery = false,
			_nuxeoHost = "",
			_login = "",
			_pwd = "",
			_basicAuth = "",
			_remember = false;
	
		//--------------------------------------
		// Properties
		//--------------------------------------
		this.__defineGetter__('doDAMQuery', function() { return _doDAMQuery; });
		this.__defineSetter__('doDAMQuery', function(inValue) { _doDAMQuery = inValue ? true : false; });
		
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
		this.__defineGetter__('REST_PATTERN', function() { return K.REST_PATTERN; });
		this.__defineGetter__('QUERY_OPERATION', function() { return K.QUERY_OPERATION; });
		this.__defineGetter__('QUERY_PICT_STATEMENT', function() { return K.QUERY_PICT_STATEMENT; });
		this.__defineGetter__('QUERY_LIMIT_DEFAULT', function() { return K.QUERY_LIMIT_DEFAULT; });
		this.__defineGetter__('QUERY_LIMIT_MAX', function() { return K.QUERY_LIMIT_MAX; });
		this.__defineGetter__('LOGIN_PATH', function() { return K.LOGIN_PATH; });
		this.__defineGetter__('TEST_LOCALHOST', function() { return K.TEST_LOCALHOST; });
		this.__defineGetter__('TEST_LOGIN', function() { return K.TEST_LOGIN; });
		this.__defineGetter__('TEST_PWD', function() { return K.TEST_PWD; });
		this.__defineGetter__('TEST_B64_ADMIN', function() { return K.TEST_B64_ADMIN; });
		
		this.__defineSetter__('REST_PATTERN', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('QUERY_OPERATION', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('QUERY_PICT_STATEMENT', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('QUERY_LIMIT_DEFAULT', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('QUERY_LIMIT_MAX', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('LOGIN_PATH', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('TEST_LOCALHOST', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('TEST_B64_ADMIN', function(inValue) { throw new TypeError("This property is read-only"); });
				
		//--------------------------------------
		//Private functions
		//--------------------------------------
		/**
		 * _setRESTQueryHeaders
		 *
		 * @param {string} inReq The XHR object to update
		 * @param {string} inMoreHeaders Added with a call to the regular setRequestHeader() XHR API
		 *
		 * @private
		 */
		function _setRESTQueryHeaders(inReq, inMoreHeaders) {
	
			inReq.setRequestHeader("Content-Type", "application/json+nxrequest");
			inReq.setRequestHeader("Accept", "application/json+nxentity, */*");
			// see http://doc.nuxeo.com/display/NXDOC/REST+API
			// Here we want no data from the document (just uid, path and title),
			// so we don't use the X-NXDocumentProperties header.
			// To get all avilable fields for a document:
			//inReq.setRequestHeader("X-NXDocumentProperties", "*");
		
			if(_basicAuth !== "") {
				inReq.setRequestHeader("Authorization", _basicAuth);
			}
			if(inMoreHeaders.length > 0) {
				inMoreHeaders.forEach( function(inElt) {
					inReq.setRequestHeader(inElt.header, inElt.value);
				});
			}
		} //_setRESTQueryHeaders
	
		/**
		 * _getRESTQueryParams
		 * Build the request body, as expected by the Document.Query REST operation
		 *
		 * @param {string} inKeywords, the words to full-text query
		 * @param {boolean} inAsText. If true, the JSON.stringify value is returned, else it's the JSON object itself
		 *
		 * @private
		 */
		function _getRESTQueryParams(inKeywords, inLimit, inAsText) {
			var params = {	params: { query: K.QUERY_PICT_STATEMENT },
							context: {}
						};
			
			if(typeof inKeywords === "string" && inKeywords !== '') {
				params.params.query += " AND ecm:fulltext = '" + inKeywords + "'";
			}
		
			if(typeof(inLimit) === "number" && inLimit > 0) {
				if(inLimit > K.QUERY_LIMIT_MAX) {
					inLimit = K.QUERY_LIMIT_MAX;
				}
				
			} else {
				inLimit = K.QUERY_LIMIT_DEFAULT;
			}
			params.params.query += " LIMIT " + inLimit;
		
			if(typeof inAsText === 'boolean' && inAsText) {
				return JSON.stringify(params);
			} else {	
				return params;
			} 
		} // _getRESTQueryParams
		
		/**
		 * _buildBasicAuth
		 *
		 * @private
		 */
		function _buildBasicAuth() {
			_basicAuth = "";
			if(_login !== "") {
				_basicAuth = "Basic " + btoa(_login + ":" + _pwd);
			}
		}
		
		/**
		 * _poorManStringXOR
		 * Just to obfuscate a bit the stored password
		 * As it's an XOR operation:
		 * 	- It's called "poorMan" ;->
		 *  - The same sring can be alternatively retreived by calling _poorManStringXOR
		 * 
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
		 * Loads persistent data
		 */
		function _loadSavedParams() {
			
			_nuxeoHost = "";
			_login = "";
			_pwd = "";
			_basicAuth = "";
			_doDAMQuery = false;
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

					if("doDAMQuery" in values && typeof values.doDAMQuery === "boolean") {
						_doDAMQuery = values.doDAMQuery;
					}
					_remember = true; // We had values, so we wanted to remember
					_buildBasicAuth();
				}
				
			} catch(e) {
				// No values or pb in storage
			}
		}

		/**
		 * _saveParams
		 * We don't try-catch. It's bad.
		 */
		function _saveParams() {
			window.localStorage.setItem(K.KEY_FOR_STORAGE,
										JSON.stringify({
											nuxeoHost		: _nuxeoHost,
											login			: _login,
											pwd				: _poorManStringXOR(_pwd),
											doDAMQuery		: _doDAMQuery
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
				
					_doDAMQuery	: _doDAMQuery,
					_nuxeoHost	: _nuxeoHost,
					_login		: _login,
					_pwd		: -pwd
				});
		};
		
		this.getTestValues = function() {
			return { nuxeoHost	: K.TEST_LOCALHOST,
					 login		: K.TEST_LOGIN,
					 pwd		: K.TEST_PWD
					};
		};
		
		/**
		 * queryDAM
		 * Does the query (setup headers, body, callbacks, ...)
		 *
		 * @param {object}	inOptions, all the different parameters (embedded in an object):
		 *	moreHeaders: Array of headers to add to the request - OPTIONNAL
		 *	keywords: String, the keywords to query. OPTIONNAL
		 *	limit: used for SELECT.... LIMIT. Optionnal. Max will be _LIMIT_MAX
		 *	onSuccess:	Function, called for XHR.onload. MANDATORY
		 *				Receives the response from NUxeo as JSON: receives JSON.parse( response.target.responseText) )
		 *				The code tests the status code. If it's not 200, then the
		 *				onError callback is called.
		 *	onError: Function, called for HXR.onerror. OPTIONNAL (but recommended)
		 *			Receives the HXR response as JSON
		 */
		this.queryDAM = function(inOptions) {
			var xhr,
				goOn = false,
				hasBasicAuth,
				moreHeaders, hasMoreHeaders,
				keywords,
				limit,
				successCB, errorCB, hasErrorCB;
			
			// Get the params
			keywords = "";
			if("keywords" in inOptions) {
				keywords = inOptions.keywords;
			}
			
			limit = 0;
			if("limit" in inOptions) {
				limit = inOptions.limit;
			}
			
			moreHeaders = [];
			if(    "moreHearers" in inOptions
				&& typeof inOptions.moreHeaders === "object"
				&& Array.isArray(inOptions.moreHeaders) ) {
				moreHearers = inOptions.moreHeaders;	
			}
			hasMoreHeaders = moreHeaders.length > 0;
			
			successCB = "onSuccess" in inOptions ? inOptions.onSuccess : null;
			errorCB = "onError" in inOptions ? inOptions.onError : null;
			hasErrorCB = typeof errorCB  === "function";
			hasBasicAuth = _basicAuth !== "";
			
			// Errorcheck
			if(typeof _nuxeoHost !== "string" || _nuxeoHost === "") {
				throw new TypeError("URL is invalid");
			} else if(!hasBasicAuth && !hasMoreHeaders) {
				throw new TypeError("Missing authentication");
			} else if(typeof successCB !== "function") {
				throw new TypeError("inSuccessCB should be a function");
			} else {
				goOn = true;
			}
			
			// Query
			if(this.doDAMQuery && goOn) {
				xhr = new XMLHttpRequest();

				xhr.open("POST", _nuxeoHost + K.REST_PATTERN + K.QUERY_OPERATION, true);
				
				xhr.onload = function(inEvt) {
					if(inEvt.target.status === 200) {
						if(inEvt.target.responseText !== "") {
							successCB( JSON.parse(inEvt.target.responseText) );
						}
					} else {
						if(hasErrorCB) {
							errorCB( inEvt );
						}
					}
				}
				if(hasErrorCB) {
					xhr.onerror = function(inEvt) {
						errorCB( inEvt );
					}
				}
				
				_setRESTQueryHeaders(xhr, hasMoreHeaders ? moreHeaders : []);

				xhr.send( _getRESTQueryParams(keywords, limit, true) );
			}
		}; // queryDAM
		
		/**
		 * readyForQuery
		 * 
		 */
		this.readyToQuery = function() {
			return _doDAMQuery && _nuxeoHost !== "" && _login !== "" && _pwd !== "";
		};	
		
		/**
		 * needsConnectionInfos
		 * 
		 */
		this.needsConnectionInfos = function() {
			return _nuxeoHost === "" || _login === "" || _pwd === "";
		};
		

		/**
		 * getParams
		 * 
		 */
		this.getParams = function() {
			return { nuxeoHost	: _nuxeoHost,
					 login		: _login,
					 pwd		: _pwd,
					 doDAMQuery : _doDAMQuery,
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
			
			_buildBasicAuth();
			
			if(inRemember) {
				_saveParams();
			} else {
				_removeSavedParams();
			}
		};
		
		// All declared, time to initialized self
		_loadSavedParams();

	} // function _NUXEO()
	
	//--------------------------------------
	//Class methods
	//--------------------------------------
	/*
	_NUXEO.doThis = function(p1, p2) {
	
	}
	*/
	
	NUXEO = new _NUXEO();

}());

// --EOF--
 