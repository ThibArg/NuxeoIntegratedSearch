/**
 * background-main.js
 * This code just shows-hides the icon, depending on the fact
 * that we do have some keywords to fetch.
 */
//console.log("Here is the background page");

chrome.tabs.onUpdated.addListener(function (inTabId, inChangeInfo, inTab) {
	var r =  UTILS.getKeywordsFromGoogleUrl(inTab.url);
	
	console.log(r);
	console.log(UTILS_NUXEO.nuxeoHost);
	
	if( r.isGooglePage && r.keywords !== "") {
		chrome.pageAction.show(inTabId);
	} else {
		chrome.pageAction.hide(inTabId);
	}
});

 //--EOF--