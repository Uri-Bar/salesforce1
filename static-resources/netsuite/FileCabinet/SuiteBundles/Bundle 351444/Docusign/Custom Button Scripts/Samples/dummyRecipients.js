function dummyRecipientsMain() {
	var dummyRecipients = [
		{ id: 1
                , order: 1
		, name: 'An Approver'
		, email: 'a.approver@mailinator.com'
	},
		{ id: 10
                , order: 3
		, name: 'International Person'
		, email: 'i.person@mailinator.com'
	}];
	var nsRecipients = api.docusignGetRecipients(docusignContext, 2, 2);
	var recipients = dummyRecipients.concat(nsRecipients);
	var files = api.docusignGetFiles(docusignContext);
	return api.docusignPopulateEnvelope(docusignContext, recipients, files);
}
