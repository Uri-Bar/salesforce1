define(["require", "exports"], function (require, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    // this is the letiable assed to all docusign_restlet GET PUT POST DELETE
    // methods. I thought it would be easier to have all these letiables
    // available via an TS interface.
    exports.saveSuccess = "Save Successful";
    exports.saveFailure = "Save not Successful";
    exports.acctConfigSuccess = "Your DocuSign account is now configurated with NetSuite.";
    exports.acctNotConfigured = "NetSuite is not configured correctly to work with DocuSign. If you have recently configured your DocuSign account, please log out and back in.";
    var custom_button_type_name;
    (function (custom_button_type_name) {
        custom_button_type_name["emailsubject"] = "emailsubject";
        custom_button_type_name["emailaddress"] = "emailaddress";
        custom_button_type_name["emailbody"] = "emailbody";
        custom_button_type_name["searchbroad"] = "searchbroad";
        custom_button_type_name["searchexact"] = "searchexact";
        custom_button_type_name["searchphrase"] = "searchphrase";
        custom_button_type_name["document"] = "document";
        custom_button_type_name["template"] = "template";
        custom_button_type_name["loadrecordattachments"] = "loadrecordattachments";
        custom_button_type_name["loadrecordcontacts"] = "loadrecordcontacts";
        custom_button_type_name["envelopevoiddate"] = "envelopevoiddate";
        custom_button_type_name["usedatamerge"] = "usedatamerge";
    })(custom_button_type_name = exports.custom_button_type_name || (exports.custom_button_type_name = {}));
    exports.customBtnFields = {};
    exports.customBtnFields["emailsubject"] = "custpage_btn_email_subject";
    exports.customBtnFields["emailbody"] = "custpage_btn_email_message";
    exports.customBtnFields["loadrecordattachments"] = "custpage_use_ns_attachments";
    exports.customBtnFields["loadrecordcontacts"] = "custpage_use_ns_contacts";
    exports.customBtnFields["template"] = "custpage_template";
    exports.customBtnFields["envelopevoiddate"] = "custpage_env_void_date";
    exports.customBtnFields["document"] = "custpage_new_file";
    exports.customBtnFields["usedatamerge"] = "custpage_use_data_merge";
    /**
     * @description Enumeration for different NetSuite url endpoints
     */
    var urlEndpoint;
    (function (urlEndpoint) {
        urlEndpoint[urlEndpoint["restlet"] = 0] = "restlet";
        urlEndpoint[urlEndpoint["configuration_suitelet"] = 1] = "configuration_suitelet";
        urlEndpoint[urlEndpoint["api_suitelet"] = 2] = "api_suitelet";
        urlEndpoint[urlEndpoint["landingpage"] = 3] = "landingpage";
        urlEndpoint[urlEndpoint["signature_suitelet"] = 4] = "signature_suitelet";
    })(urlEndpoint = exports.urlEndpoint || (exports.urlEndpoint = {}));
});
