function customSignMain() {
  /*
   *  This sample script will create a signing envelope using DocuSign Template.
   */
  var files = [
    {
      type: "template",
      id: "ENTER_YOUR_TEMPLATE_ID_HERE",
      role: "ENTER_ROLE_ID_HERE",
    },
  ];
  return api.docusignSignEnvelope(docusignContext, files);
}
