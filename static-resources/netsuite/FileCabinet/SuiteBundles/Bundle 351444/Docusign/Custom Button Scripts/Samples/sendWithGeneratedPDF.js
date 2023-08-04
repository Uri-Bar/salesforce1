function customSendMain() {
  /*
    This example generates a PDF from a NetSuite transaction object (e.g. Sales Order, Invoice) and
    sends with DocuSign.

    1. Recipient list is generated from the record's contacts.
    2. A PDF is generated for the current record.
    3. The recipients and generated document are added to a DocuSign envelope.
    4. The DocuSign tagging and sending process is initiated.
 */
  var recipients = api.docusignGetRecipients(docusignContext);
  var recordId = parseInt(docusignContext.recordId);
  var record = render.transaction({
    entityId: recordId,
    printMode: render.PrintMode.PDF,
  });
  var files = [
    {
      name: record.name,
      content: record.getContents(),
      file: record,
    },
  ];
  return api.docusignPopulateEnvelope(docusignContext, recipients, files);
}
