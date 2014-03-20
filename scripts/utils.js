/**
 * utils.js
 * 
 */
if(typeof UTILS !== 'undefined') {
	console.log("[WARN] UTILS initialization called more than once");
}

UTILS = {};

UTILS.getKeywordsFromGoogleUrl = function (inUrl)
{
    var a, hashPos, queryStr, keywords, result;

	result = {isGooglePage: false, keywords: "", host: ""};
	
	// Classical tip to parse the url (instead of playing with the string)
	// We need this because we're in the popup => no access to the actual page.
	a = document.createElement('a');
	a.href = inUrl;
	
	result.hostName = a.hostname;
	if(a.hostname.toLowerCase().indexOf("google") > 0) {
		result.isGooglePage = true;
		// OK, now we can play with the URL.
		// Depending on the origin of the query, the url may contain
		// the regular "?" as query string separator, or a dash
		// Found this on the internet but can't remember where...
		hashPos= inUrl.indexOf('#'),
	    queryStr = inUrl.substr(hashPos === -1 ? inUrl.indexOf('?') : hashPos);
		
		keywords = decodeURI((RegExp('q=(.+?)(&|$)').exec(queryStr) || [,null])[1]);
		if(keywords !== "" && keywords !== "null") {
			result.keywords = keywords.replace("+", " ");
		}
	}
	
	return result;
}

UTILS.pluralize = function(inNumber, inStrForZeroOrOne, inStrForMore) {
	var r = "";
	if(typeof inNumber === "number" && typeof inStrForZeroOrOne === "string") {
		if( inNumber >= -1 && inNumber <= 1) {
			r = inNumber + " " + inStrForZeroOrOne
		} else {
			if(typeof inStrForMore === "string") {
				r = inNumber + " " + inStrForMore;
			} else {
				r = inNumber + " " + inStrForZeroOrOne + "s";
			}
		}
	}
	return r;
}

// --EOF--
 