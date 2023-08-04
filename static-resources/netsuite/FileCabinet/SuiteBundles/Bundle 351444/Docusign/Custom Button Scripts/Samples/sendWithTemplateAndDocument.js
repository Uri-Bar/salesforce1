function customSendMain() {
  /*
   *  This sample script will create a sending envelope with the following documents:
   *  - DocuSign Template with 2 Signers
   *  - The minimalPdf.pdf
   *  - An attached document 'Partnership Agreement.doc' (if exists)
   *  - DocuSign Template
   */

  var minimalPdf =
    "JVBERi0xLjENCiXCpcKxw6sNCg0KMSAwIG9iag0KICA8PCAvVHlwZSAvQ2F0YWxvZw0KICAgICAvUGFnZXMgMiAwIFINCiAgPj4NCmVuZG9iag0KDQoyIDAgb2JqDQogIDw8IC9UeXBlIC9QYWdlcw0KICAgICAvS2lkcyBbMyAwIFJdDQogICAgIC9Db3VudCAxDQogICAgIC9NZWRpYUJveCBbMCAwIDMwMCAxNDRdDQogID4+DQplbmRvYmoNCg0KMyAwIG9iag0KICA8PCAgL1R5cGUgL1BhZ2UNCiAgICAgIC9QYXJlbnQgMiAwIFINCiAgICAgIC9SZXNvdXJjZXMNCiAgICAgICA8PCAvRm9udA0KICAgICAgICAgICA8PCAvRjENCiAgICAgICAgICAgICAgIDw8IC9UeXBlIC9Gb250DQogICAgICAgICAgICAgICAgICAvU3VidHlwZSAvVHlwZTENCiAgICAgICAgICAgICAgICAgIC9CYXNlRm9udCAvVGltZXMtUm9tYW4NCiAgICAgICAgICAgICAgID4+DQogICAgICAgICAgID4+DQogICAgICAgPj4NCiAgICAgIC9Db250ZW50cyA0IDAgUg0KICA+Pg0KZW5kb2JqDQoNCjQgMCBvYmoNCiAgPDwgL0xlbmd0aCA1NSA+Pg0Kc3RyZWFtDQogIEJUDQogICAgL0YxIDE4IFRmDQogICAgMCAwIFRkDQogICAgKEhlbGxvIFdvcmxkKSBUag0KICBFVA0KZW5kc3RyZWFtDQplbmRvYmoNCg0KeHJlZg0KMCA1DQowMDAwMDAwMDAwIDY1NTM1IGYgDQowMDAwMDAwMDE4IDAwMDAwIG4gDQowMDAwMDAwMDc3IDAwMDAwIG4gDQowMDAwMDAwMTc4IDAwMDAwIG4gDQowMDAwMDAwNDU3IDAwMDAwIG4gDQp0cmFpbGVyDQogIDw8ICAvUm9vdCAxIDAgUg0KICAgICAgL1NpemUgNQ0KICA+Pg0Kc3RhcnR4cmVmDQo1NjUNCiUlRU9G";

  var recipients = api.docusignGetRecipients(docusignContext);
  var files = [
    {
      type: "template",
      id: "ENTER_YOUR_TEMPLATE_1_ID_HERE",
      signers: [
        {
          id: 1,
          order: 1,
          name: "ENTER_SIGNER_1_NAME_HERE",
          email: "ENTER_SIGNER_1_EMAIL_HERE",
          role: "ENTER_SIGNER_1_ROLE_ID_HERE",
        },
        {
          id: 2,
          order: 1,
          name: "ENTER_SIGNER_2_NAME_HERE",
          email: "ENTER_SIGNER_2_EMAIL_HERE",
          role: "ENTER_SIGNER_2_ROLE_ID_HERE",
        },
      ],
    },
    { name: " minimalPdf.pdf", content: minimalPdf },
    {
      type: "attachment",
      searches: [{ keyword: "Partnership Agreement.doc", type: "exact" }],
    },
    { type: "template", id: "ENTER_YOUR_TEMPLATE_2_ID_HERE" },
  ];
  return api.docusignPopulateEnvelope(docusignContext, recipients, files);
}
