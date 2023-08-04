function customSendMain() {
  /*
   *  This sample script will create a sending envelope using DocuSign Template.
   */
  var recipients = api.docusignGetRecipients(docusignContext);
  var files = [
    {
      type: "template",
      id: "ENTER_YOUR_TEMPLATE_ID_HERE",
      signers: [
        {
          id: 1,
          order: 1,
          name: "ENTER_SIGNER_NAME_HERE",
          email: "ENTER_SIGNER_EMAIL_HERE",
          role: "ENTER_ROLE_ID_HERE",
        },
      ],
    },
  ];
  return api.docusignPopulateEnvelope(docusignContext, recipients, files);
}
