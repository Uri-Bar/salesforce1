function customSignMain() {
  /*
   *  This sample script will create a signing envelope using DocuSign Template.
   *  The envelope will also include the an attached document 'Partnership Agreement.doc' (if exists).
   */
  var files = [
    {
      type: "template",
      id: "ENTER_YOUR_TEMPLATE_ID_HERE",
      role: "ENTER_ROLE_ID_HERE",
    },
    {
      type: "attachment",
      searches: [{ type: "exact", keyword: "Partnership Agreement.doc" }],
    },
  ];
  return api.docusignSignEnvelope(docusignContext, files);
}
