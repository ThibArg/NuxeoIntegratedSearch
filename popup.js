/**
 * Nuxeo Google Images Search Extension
 * 
 * When searching on images.google.com, the extension also searches
 * in the Nuxeo server for DAM assets, using the keywords of the user.
 *
 *
 * Things to remember about Chrome extensions:
 *		- To call nuxeo server and avoid cross scripting security policy to apply,
 *		  add the appropriate URL(s) to the manifest
 *		- Also, inline JS is not allowed (http://developer.chrome.com/extensions/contentSecurityPolicy.html#JSExecution)
 *		  so you can't write things like
 *				img = document.createElement('img');
 *				img.setAttribute("onclick", "some-inline-JavaScript"
 *		- If needed, we use HTML5 features, we don't care if they don't exist in IE ;->
 *		  For example, we use theElement.classList.add() to add a css class
 *		  Or jQuery. depends on our mood.
 *  
 * --------------------------------------
 * DEPENDENCIES
 * --------------------------------------
 * The following scripts need to be loaded before this code runs. This is done by adding
 * the appropriate <SCRIPT .../> tag in popup.htmlies. If it is not loaded, all id hidden
 * in the DOMContentLoaded event
 * 
 * We need:
 *		jQuery and jQuery UI (for the accordion effect)
 *		UTILS (in utils.js)
 *      NUXEO (in NUXEO.js)
 * 
 * --------------------------------------
 * IMPORTANT
 * --------------------------------------
 * Please, see the comment for the forceGetEachThumbnail function
 */

/**
 * Get our DOM elements once for all, instead of calling $()"#theID") several times.
 * Using "jq" instead of "$" because of double-click issues depending on the editor.
 */

var _jqEnableSearch,	
	_jqAskParams,
	_jsParams,
	_jqNuxeoHostLabel,
	_jqNuxeoHost,
	_jqLogin,
	_jqPwd,
	_jqRememberMe,
	_jqPopupSubmit,
	_jqBigError,
	_jqConnError,
	_jqResultTitle,
	_jqResults,
	_jqAccordion;


// Initializae the accordion, hide the connection error
if(typeof $ !== "undefined") {
	$(function() {
		$("#accordion").accordion();
		$("#connectionError").hide();
	});
}

/* 
 * _init
 * 
 * Called once the DOM is loaded:
 * 		- Initialize our variables
 * 		- Extend jQuery
 */
function _init() {
	_jqEnableSearch = $("#enableSearch");	
	_jqAskParams = $("#askParams");	
	_jsParams = $("#params");
	_jqNuxeoHostLabel = $("#nuxeoHostLabel");
	_jqNuxeoHost = $("#nuxeoHost");
	_jqLogin = $("#login");
	_jqPwd = $("#pwd");
	_jqRememberMe = $("#rememberMe");
	_jqPopupSubmit = $("#popupSubmit");
	_jqBigError = $("#bigError");
	_jqConnError = $("#connectionError");
	_jqResultTitle = $("#resutTitle");
	_jqResults = $("#displayResults");
	_jqAccordion = $("#accordion");
	
	//..error-check none are null...
	

	// No built-in easy way to check/uncheck/test a check box. "easy" means a basic boolean stuff.
	// The same goes for enable/disable.
	// => Add to the jQuery object
	// NOTE: giving long names just in case a future verison of jQuery implements such
	// behavior with regular names (isChecked, ...), don't want to add hidden collisions.
	jQuery.fn.extend({
		
		// Will have the checkbox functions for all kind of elements. I don't care ;-)
		checkTheBox : function(inValue) {
			this.get(0).checked = inValue ? true : false;
			return this;
		},
		isBoxChecked : function() {
			return this.get(0).checked;
		},
		
		doEnable : function(inEnable) {
			this.get(0).disabled = inEnable ? false : true;// reverted: "inEnable" set "disabled"
			return this;
		},
		
		isObjectEnabled	: function() {
			return this.get(0).disabled ? true : false;
		}
	});
}
/*	Add event listeners once the DOM has fully loaded by listening for the
	DOMContentLoaded` event on the document, and adding your listeners to
	specific elements when it triggers.
*/
document.addEventListener('DOMContentLoaded', function (inEvt) {

	// We need NUXEO and jQuery
	if(		typeof NUXEO === "undefined"
		||  typeof UTILS === "undefined"
		||  typeof jQuery === "undefined"
		||  typeof $ === "undefined" ) {
		// Need to use direct HTML APIs (not jQuery: It's eventually not here)
		// Actually, we don't need jQuery to add/remove class, right? ;->
		// Note: Not all browsers implement classList as of today (june, 2013) but we
		// sure don't care: This is Chrome extension, and Chrome handles classList.
		document.getElementById("askParams").classList.add("doHide");
		document.getElementById("bigError").classList.remove("doHide");
		document.getElementById("bigError").classList.add("doShow");

	// ==================================================
		return; // We sure don't want to continue.
	// ==================================================
	}
	
	_init();
		
	_jqEnableSearch.on("click", updateInterface)
					.checkTheBox(true /*NUXEO.doDAMQuery*/);
	_jqPopupSubmit.on("click", doSaveInfos);
	_jqNuxeoHostLabel.on("click", doFillWithDefault);
	
	_jqNuxeoHost.val(NUXEO.nuxeoHost);
	_jqLogin.val(NUXEO.login);
	_jqPwd.val(NUXEO.pwd);
	_jqRememberMe.checkTheBox(NUXEO.remember);
	
	updateInterface();
	
	queryIfPossible();
		
});

function queryIfPossible() {
	if(NUXEO.readyToQuery()) {
		chrome.tabs.getSelected(null, function(inTab) {
			var kw = UTILS.getKeywordsFromGoogleUrl(inTab.url);
			if(kw.isGooglePage) {
				runTheQuery(kw.keywords);
			} else {
				// ...Display something...
			}
		});
	} else {
		// ...Display something...
	}
}

function clickOnThumbnail(inEvt) {
	var url = inEvt.srcElement.getAttribute("nuxeo_url");
	if(typeof url === "string" && url !== "") {
		window.open(url, '_blank');
	}
}

function updateInterface() {
	
	var queryAllowed = _jqEnableSearch.isBoxChecked();
	
	_jqNuxeoHost.doEnable(queryAllowed);
	_jqLogin.doEnable(queryAllowed);
	_jqPwd.doEnable(queryAllowed);
	_jqRememberMe.doEnable(queryAllowed);
	
	if(queryAllowed) {
		_jsParams.removeClass("disabled");
	} else {
		_jsParams.addClass("disabled");
	}
}

function displayResults(inResults, inKeywords) {
	var i, max, allDocs, aDoc, img, label, div, dispRes, has2KwAtLeast;
	
	// Update accordion title
	formatResultTitle(inResults, inKeywords);
	
	// Remove previous if any
	_jqResults.empty();
	
	has2KwAtLeast = false;
	if(typeof inKeywords === "string") {
		if(inKeywords === "") {
			inKeywords = "(no keyword: Query on all Pictures)";
		} else {
			inKeywords = inKeywords.replace(" ", ", ");
			has2KwAtLeast = inKeywords.indexOf(" ") > 0;
		}
	}
	_jqResults.append("<p id='resultLabel'>" + (has2KwAtLeast ? "Keywords" : "keyword") + ": " + inKeywords + "</p>")
	
	// To just add basic div/img, let's use standard DOM APIs
	dispRes = document.getElementById("displayResults");
	
	// . . . check error . . .
	if(inResults["entity-type"] !== "documents") {
		//. . . error. . .
	} else {
		allDocs = inResults.entries;
		for (i = 0, max = allDocs.length; i < max; i++) {
			aDoc = allDocs[i];
			
			img = document.createElement('img');
			if(aDoc["entity-type"] === "document") {
				img.src = getThumbnailURL(aDoc);
				img.id = aDoc.uid;
				img.alt = aDoc.title;
				img.setAttribute("class", "nuxeoThumbnail");
				img.setAttribute("nuxeo_url", getNuxeoDocURL(aDoc));
			} else {
				img.src = "";
				img.setAttribute('alt', "ERROR: entity-type is not a Nuxeo document");
			}
		
			label = document.createElement("span");
			label.appendChild( document.createTextNode( aDoc.title ) );
			label.setAttribute("class", "thumbnailLabel");
			
			div = document.createElement("div");
			div.setAttribute("class", "thumbnailContainer");
			div.appendChild(img);
			div.appendChild(label);
		
			dispRes.appendChild(div);
		}

		dispRes.addEventListener('click', clickOnThumbnail, false);
		
		// Display 2d tab
		_jqAccordion.accordion( "option", "active", 1);
	}
}
/*
 * forceGetEachThumbnail
 * 
 * We do have a big problem. When forst connecting to the Nuxoe server
 * (very first connection of after a "clear browsing data"), even if the
 * connection is ok, the thumbnails are not displayed, there is an error
 * that I could not clearly identify: The extension receives text/html
 * for each thumbnail once the src attribute of the img is set. You needed
 * to click on the extension icon 2 more times, and then all was ok.
 * 
 * I could not find a good explanation to this, but I thought it could be
 * because the host of the img.src was nuxeo_host (localhost:8080, or
 * dam.cloud.nuxeo.com, or whatever the Nuxeo server address), and not
 * chrome://{my extension}/. So, because after 1-2 more clicks, it worked,
 * I had the idea of forcing the fetching of each image. This is the purpose
 * of this function.
 *
 * There is a drawback: It is call for every request, while an optimization
 * should detect it has been called once, whoch would use a flag in the local
 * storage for example.
 *
 * @param {object} The JSON objects as received after the query
 * @param {function} the callback to run once the job is done. This callback
 * expects no parameters, it's just a way to say "Ok, forceGetEachThumbnail
 * has finish the job, you can try to display the results"
 */
function forceGetEachThumbnail(inResults, inCallback) {
	var i, max,
		inDoc, url,
		countOfCallsDone, numberOfCallsToDo,
		headersNames, headersValues,
		xhr;
	
	if(inResults["entity-type"] !== "documents") {
		inCallback();
		return;
	}
	
	if(inResults.entries.length < 1) {
		inCallback();
		return
	}
	
	headersNames = ["Content-Type",
					"Accept",
					"Authorization"];
	headersValues = ["application/json+nxrequest",
					"image/*",
					"Basic " + btoa(NUXEO.login + ":" + NUXEO.pwd) ];
	
	numberOfCallsToDo = inResults.entries.length;
	countOfCallsDone = 0;
	
	function _utilCallback() {
		countOfCallsDone += 1;
		console.log("_utilCallback / countOfCallsDone: " + countOfCallsDone)
		if(countOfCallsDone >= numberOfCallsToDo) {
			inCallback();
		}
	}
	inResults.entries.forEach(function(inDoc) {
		console.log("inResults.entries.forEach: " + inDoc.title);
		
		url = getThumbnailURL(inDoc);
		
		xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		
		for(i = 0, max = headersNames.length; i < max; i++) {
			xhr.setRequestHeader( headersNames[i], headersValues[i] );
		}
		xhr.onload = _utilCallback;
		xhr.onerror = _utilCallback;
		
		xhr.send();
	});
}

function getThumbnailURL(inDoc) {
	//http://localhost:8080/nuxeo/nxthumb/default/a9bb0faa-75d9-4ac0-ad51-59a6b1ba826c/blobholder:0/bag-2.JPG
	return NUXEO.nuxeoHost + "/nxthumb/default/" + inDoc.uid + "/blobholder:0/" + inDoc.title;
}

function getNuxeoDocURL(inDoc) {
	// http://localhost:8080/nuxeo/nxdam/default/asset-library/bag-3.jpg@assets
	//return NUXEO.nuxeoHost + "/nxdam/default" + inDoc.path + "@assets?";
	
	// For a display in DM view:
	// http://localhost:8080//nuxeo/nxpath/default/asset-library/bag-3.jpg@assets@view_documents?mainTabId=MAIN_TABS ... etc ...
	return NUXEO.nuxeoHost + "/nxdam/default" + inDoc.path + "@view_documents?mainTabId=MAIN_TABS";
	
}

function formatResultTitle(inResults, inKeywords) {
	// jQuery UI has added a span for the arrow. Lets not remove it
	var title = _jqResultTitle.children()[0].outerHTML;
	
	title += "Results";
	if("entries" in inResults) {
		title += ": " + UTILS.pluralize(inResults.entries.length, "picture found", "pictures found");
	}
	_jqResultTitle.html(title);
}

function runTheQuery(inKeywords) {
	var r = "Results";
	NUXEO.queryDAM({
		keywords: inKeywords,
		//limit: some value
		//moreHeaders: [??],
		onSuccess: function(inResults) {
//			displayResults(inResults, inKeywords);
			forceGetEachThumbnail(inResults,
					function() {
						console.log("At last, calling displayResults")
						displayResults(inResults, inKeywords);
					});
		},
		onError: function(inEvt) {
			formatResultTitle({}, "");
			_jqAskParams.fadeOut(1000, function() {
				_jqConnError.fadeIn(1000, function() {
					setTimeout(function() {
						_jqConnError.fadeOut(1000);
						_jqAskParams.fadeIn(1000);
					}, 2000);
				});
			});
			
			// We could be more specific...
			/*
			if(inEvt.target.status == 0) {
				
			} else {
				
			}
			*/
		}
	});
}

function doSaveInfos(inEvt) {
	// ================================================= <TEST>
	if(inEvt.altKey) {
		//runTheQuery();
		
		chrome.tabs.getSelected(null, function(inTab) {
			var kw = UTILS.getKeywordsFromGoogleUrl(inTab.url);
			if(kw.isGooglePage) {
			//	console.log(kw.keywords);
				runTheQuery(kw.keywords);
			}
		});
		return;
	}
	// ================================================= </TEST>
	
	// In this version of the plug-in, query in DAM is always allowed
	_jqEnableSearch.checkTheBox(true);
	
	NUXEO.doDAMQuery = _jqEnableSearch.isBoxChecked();
	NUXEO.setParams(_jqNuxeoHost.val(),
					_jqLogin.val(),
					_jqPwd.val(),
					_jqRememberMe.isBoxChecked() );
	
	queryIfPossible();
	//window.close();
}

// This one is a backdoor (no danger here): alt/option-click on the URL label
// fills the values with the default one (localhost:8080, Administrator)
function doFillWithDefault(inEvt) {
	if(inEvt.altKey) {
		var val = NUXEO.getTestValues();
		
		_jqNuxeoHost.val(NUXEO.TEST_LOCALHOST);
		_jqLogin.val(NUXEO.TEST_LOGIN);
		_jqPwd.val(NUXEO.TEST_PWD);
		_jqEnableSearch.checkTheBox(true);
		
		updateInterface();
	} else if (inEvt.shiftKey) {
		_jqNuxeoHost.val("http://dam.cloud.nuxeo.com/nuxeo");
		_jqLogin.val("Administrator");
		_jqPwd.val("Administrator");
		
		_jqEnableSearch.checkTheBox(true);
	}
}

//--EOF--