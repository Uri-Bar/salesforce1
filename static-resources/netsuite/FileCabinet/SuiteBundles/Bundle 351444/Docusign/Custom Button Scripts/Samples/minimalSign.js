function minimalSignMain() {
	var files = api.docusignGetFiles(docusignContext);
	return api.docusignSignEnvelope(docusignContext, files);
}
