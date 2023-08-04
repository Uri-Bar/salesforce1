function minimalSendMain() {
	var recipients = api.docusignGetRecipients(docusignContext);
	var files = api.docusignGetFiles(docusignContext);
	return api.docusignPopulateEnvelope(docusignContext, recipients, files);
}
