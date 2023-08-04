function customSendMain() {
  /*
   *  This sample script will create a DocuSign Envelope with no document.
   */
  var searches = [{ keyword: "NO_DOCUMENT", type: "exact" }];
  var recipients = api.docusignGetRecipients(docusignContext);
  var files = api.docusignGetFiles(docusignContext, searches);
  return api.docusignPopulateEnvelope(docusignContext, recipients, files);
}
