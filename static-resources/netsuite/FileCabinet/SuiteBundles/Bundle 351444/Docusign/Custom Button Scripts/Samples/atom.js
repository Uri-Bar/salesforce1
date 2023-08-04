function atomMain() {
  var minimalPdf =
    "JVBERi0xLjENCiXCpcKxw6sNCg0KMSAwIG9iag0KICA8PCAvVHlwZSAvQ2F0YWxvZw0KICAgICAvUGFnZXMgMiAwIFINCiAgPj4NCmVuZG9iag0KDQoyIDAgb2JqDQogIDw8IC9UeXBlIC9QYWdlcw0KICAgICAvS2lkcyBbMyAwIFJdDQogICAgIC9Db3VudCAxDQogICAgIC9NZWRpYUJveCBbMCAwIDMwMCAxNDRdDQogID4+DQplbmRvYmoNCg0KMyAwIG9iag0KICA8PCAgL1R5cGUgL1BhZ2UNCiAgICAgIC9QYXJlbnQgMiAwIFINCiAgICAgIC9SZXNvdXJjZXMNCiAgICAgICA8PCAvRm9udA0KICAgICAgICAgICA8PCAvRjENCiAgICAgICAgICAgICAgIDw8IC9UeXBlIC9Gb250DQogICAgICAgICAgICAgICAgICAvU3VidHlwZSAvVHlwZTENCiAgICAgICAgICAgICAgICAgIC9CYXNlRm9udCAvVGltZXMtUm9tYW4NCiAgICAgICAgICAgICAgID4+DQogICAgICAgICAgID4+DQogICAgICAgPj4NCiAgICAgIC9Db250ZW50cyA0IDAgUg0KICA+Pg0KZW5kb2JqDQoNCjQgMCBvYmoNCiAgPDwgL0xlbmd0aCA1NSA+Pg0Kc3RyZWFtDQogIEJUDQogICAgL0YxIDE4IFRmDQogICAgMCAwIFRkDQogICAgKEhlbGxvIFdvcmxkKSBUag0KICBFVA0KZW5kc3RyZWFtDQplbmRvYmoNCg0KeHJlZg0KMCA1DQowMDAwMDAwMDAwIDY1NTM1IGYgDQowMDAwMDAwMDE4IDAwMDAwIG4gDQowMDAwMDAwMDc3IDAwMDAwIG4gDQowMDAwMDAwMTc4IDAwMDAwIG4gDQowMDAwMDAwNDU3IDAwMDAwIG4gDQp0cmFpbGVyDQogIDw8ICAvUm9vdCAxIDAgUg0KICAgICAgL1NpemUgNQ0KICA+Pg0Kc3RhcnR4cmVmDQo1NjUNCiUlRU9G";

  var recipients = [
    {
      id: 1,
      order: 1,
      name: "A Person",
      email: "person31415@mailinator.com",
    },
    {
      id: 2,
      order: 2,
      name: "Another Person",
      email: "person51413@mailinator.com",
    },
  ];
  var files = [
    {
      name: "myDocument.pdf",
      content: minimalPdf,
    },
  ];
  return api.docusignPopulateEnvelope(docusignContext, recipients, files);
}
