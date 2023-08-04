function taxMain() {
  var res = https.get({
    url: "https://www.irs.gov/pub/irs-pdf/fw4.pdf",
  });
  var recipients = api.docusignGetRecipients(docusignContext);
  var files = [{ name: "w4.pdf", content: res.body }];
  return api.docusignPopulateEnvelope(docusignContext, recipients, files);
}
