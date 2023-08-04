function errorHandling() {
    throw "Example of how errors are handled";
	var recipients = api.docusignGetRecipients(docusignContext);
	var files = api.docusignGetFiles(docusignContext);
	return api.docusignPopulateEnvelope(docusignContext, recipients, files);
}
