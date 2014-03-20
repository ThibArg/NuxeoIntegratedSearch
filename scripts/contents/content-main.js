/**
 * content-main.js
 * 	The only purpose here is to get the keywords and give them to
 *	to the backgound page, so the popup can get them.
 * 
 */
console.log("[CS] Here is the content-script ([CS] in logs)");
/*
// Receiving a call from the background
chrome.runtime.onMessage.addListener(
	function(inRequest, inSender, inSendResponse) {
		switch(inRequest.what) {
		case "getKeywords":
			inSendResponse({what:"keywords", keywords: "one deux 3 on saute"});
			break;
			
		default:
			inSendResponse({what: "error", error:"ContentScript page received an unknow selector"});
			break;
		}
	}
);

function getSearchBoxValue() {
	var keywords = "";
		googleSearchBox = document.querySelector("input[name='q']");

	if(googleSearchBox && googleSearchBox.value) {
		if(box && box.value) {
			keywords = googleSearchBox.value.trim();
		}
	}
	
	return keywords;
}
*/
/*
document.addEventListener(
	"DOMNodeInserted",
	function(evt) {
		if(evt.srcElement.id == "ires"){
			getSearchBoxValue();
		}
	}
);
*/

/*
var parse_google_url = function (url)
{
    var hash_position = url.indexOf('#'),
    query_string = url.substr(hash_position === -1 ? url.indexOf('?') : hash_position);
    return decodeURI((RegExp('q=(.+?)(&|$)').exec(query_string) || [,null])[1]);
}
*/

 //--EOF--