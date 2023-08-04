/**
*
* @NApiVersion 2.x
* @NScriptType ClientScript
*
*/

define(["N/search"],  function(){

function search(){
var currentUrl = document.location.href;
var url = new URL(currentUrl);
var recordid = url.searchParams.get("id");
var invoicegroupSearchObj = search.load("");
var searchResultCount = invoicegroupSearchObj.runPaged().count;
log.debug("invoicegroupSearchObj result count",searchResultCount);
invoicegroupSearchObj.run().each(function(result){
   // .run().each has a limit of 4,000 results
   return true;
});
}

function print(getfield){
var currentUrl = document.location.href;
    var url = new URL(currentUrl);
    var recordid = url.searchParams.get("id");
    var newurl = "/app/common/custom/advancedprint/printsearchresults.nl?printType=SEARCH&l=T&e=T&id=654&Transaction_GROUPEDTO=" + recordid +"&style=NORMAL&searchid=654&dle=&sortcol=Transaction_NUMBER_raw&sortdir=ASC&pdf=&size=1000&twbx=F&csv=Export&printtemplate=121&whence=";
window.open(newurl);
}

function download(getfield){
var currentUrl = document.location.href;
    var url = new URL(currentUrl);
    var recordid = url.searchParams.get("id");
	var csvurl = "/app/common/search/searchresults.csv?printType=SEARCH&l=T&e=T&id=661&Transaction_GROUPEDTO=" + recordid +"&style=NORMAL&searchid=661&dle=T&sortcol=Transaction_NUMBER_raw&sortdir=ASC&size=1000&twbx=F&csv=Export&printtemplate=121&whence=%27";
window.open(csvurl, 'visible=none', '');
}

return {
pageInit: search,
buttonPrint : print,
buttonDownload : download