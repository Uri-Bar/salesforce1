function customSendMain() {
  /*
   * Ex: A NetSuite Record has the following attached documents:
   * 1.	Contact Part 1.pdf
   * 2.	Contact Part 2.pdf
   * 3.	Partnership Agreement.doc
   * 4.	NDA.docx
   * 5.	Sales_Internal_info.xlsx
   *
   *  This script will only include "Partnership Agreement.doc" in the DocuSign Envelope.
   */
  var searches = [
    {
      keyword: "Partnership Agreement.doc",
      type: "exact",
    },
  ];
  var recipients = api.docusignGetRecipients(docusignContext);
  var files = api.docusignGetFiles(docusignContext, searches);
  return api.docusignPopulateEnvelope(docusignContext, recipients, files);
}
