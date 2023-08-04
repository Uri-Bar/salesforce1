/**
 * @NApiVersion 2.1
 * This file includes all the DocuSign API Services.
 */
define(["require", "exports", "N/https", "N/log", "./api/ds_api_common", "./api/ds_envelope", "./api/ds_merge_fields", "./api/ds_api_public"], function (require, exports, https, log, apicommon, apienv, apimergefields, apipublic) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /* NetSuite Public Interface (Used in CustomButton Scripts -- BE CAREFUL MODIFYING) */
    exports.docusignPopulateEnvelope = apipublic.docusignPopulateEnvelope;
    exports.docusignSignEnvelope = apipublic.docusignSignEnvelope;
    exports.docusignGetRecipients = apipublic.docusignGetRecipients;
    exports.docusignGetFiles = apipublic.docusignGetFiles;
    exports.docusignGetEmail = apipublic.docusignGetEmail;
    exports.docusignGetTemplateSigners = apipublic.docusignGetTemplateSigners;
    /* Common API Methods */
    exports._getHeaders = apicommon.getHeaders;
    exports.dsapi_getBaseUrl = apicommon.getBaseUrl;
    exports.dsapi_restLogin = apicommon.restLogin;
    exports.validateDSUser = apicommon.validateDSUser;
    exports.restLoginCache = apicommon.restLoginCache;
    exports.dsapi_getUsers = apicommon.getUsers;
    exports.dsapi_getUserInformation = apicommon.getUserInformation;
    exports.dsapi_validateSoboAccount = apicommon.validateSoboAccount;
    /* Envelopes */
    exports.dsapi_createSenderView = apienv.createSenderView;
    exports.dsapi_createRecipientView = apienv.createRecipientView;
    exports.dsapi_createEnvelope = apienv.createEnvelope;
    exports.dsapi_getEnvelopeInfo = apienv.getEnvelopeInfo;
    exports.dsapi_getEnvelopeName = apienv.getEnvelopeName;
    exports.dsapi_getEnvelopeDocumentSet = apienv.getEnvelopeDocumentSet;
    exports.dsapi_getTemplateName = apienv.getTemplateName;
    exports.dsapi_getTemplateRecipients = apienv.getTemplateRecipients;
    exports.getListOfTemplates = apienv.getListOfTemplates;
    /* Merge Fields */
    exports.dsapi_getTemplateMergeFields = apimergefields.getTemplateMergeFields;
    /**
     * @desc  This function provides the following DocuSign Service:
     *        - Get the DocuSign Admin Console View
     * @return  string response - the url of the DS admin console view (if success) or the error message (if fail)
     * @param envelopeId
     */
    exports.dsapi_openConsole = function (envelopeId) {
        var response = null;
        var url = exports.dsapi_getBaseUrl(false) + "/views/console";
        var data = {};
        if (typeof envelopeId !== "undefined" && envelopeId !== null) {
            data["envelopeId"] = envelopeId;
        }
        data = JSON.stringify(data);
        log.debug("dsapi_openConsole() request:", JSON.stringify({
            url: url,
            data: data,
        }));
        var serverResponse = https.post({
            url: url,
            body: data,
            headers: exports._getHeaders(false),
        });
        log.debug("dsapi_openConsole() Response: ", serverResponse.body);
        var consoleViewUrl = null;
        var resp_json = JSON.parse(serverResponse.body);
        if (resp_json.url)
            consoleViewUrl = resp_json.url;
        if (consoleViewUrl && consoleViewUrl !== "") {
            response = consoleViewUrl;
        }
        else {
            response = apicommon.parseRestErrorMessage(serverResponse.body);
            log.error("Open Console", response);
        }
        return response;
    };
    /**
     * @desc  Get the account provisioning information
     * @return  object response - the NS server response
     * @param env
     */
    exports.dsapi_provision = function (env) {
        var url = "https://" + env + ".docusign.net/restapi/v2/accounts/provisioning";
        var headers = exports._getHeaders(false);
        headers["X-DocuSign-AppToken"] = "CRM_SOBO";
        // return nlapiRequestURL(url, null, headers);
        return https.request({
            url: url,
            headers: headers,
            method: "GET",
        });
    };
    /**
     * @desc  Create and return the html code of the Select DS Account drop down menu
     * @param dsPassword
     * @param dsEnvironmentId
     * @param dsUserName
     */
    exports.dsapi_getDsAcctDropDownHtml = function (dsEnvironmentId, dsUserName, dsPassword) {
        var dsDSAcctDropDownHTML = ': <select id="ds_accounts_dropdown">';
        var serverResponse = exports.dsapi_restLogin(true, dsEnvironmentId, dsUserName, dsPassword);
        if (serverResponse.code === 200) {
            var resp = JSON.parse(serverResponse.body);
            if (resp && resp.loginAccounts && resp.loginAccounts.length > 0) {
                for (var i = 0; i < resp.loginAccounts.length; i++) {
                    var accountName = resp.loginAccounts[i].name;
                    var accountId = resp.loginAccounts[i].accountId;
                    var accountIdGuid = resp.loginAccounts[i].accountIdGuid;
                    dsDSAcctDropDownHTML +=
                        '<option value="' +
                            accountId +
                            "," +
                            accountIdGuid +
                            '">' +
                            accountName +
                            " - " +
                            accountId +
                            (resp.loginAccounts[i].isDefault === "true" ? " (Default)" : "") +
                            "</option>";
                }
            }
        }
        dsDSAcctDropDownHTML += "</select>";
        return dsDSAcctDropDownHTML;
    };
    /**
     * @desc  Create and return the html code of the Select DS User Account drop down menu
     * @return  string dsDSUserAcctDropDownHTML - the html of the DS User Account Selection drop down
     * @param userEmail
     */
    exports.dsapi_getDsUserAcctDropDownHtml = function (userEmail) {
        var dsDSUserAcctDropDownHTML = ': <select id="ds_user_accounts_dropdown">';
        var accountUsers = exports.dsapi_getUsers();
        for (var i in accountUsers) {
            var user = accountUsers[i];
            if (userEmail &&
                user.email.toLowerCase() === userEmail.toLowerCase() &&
                user.userStatus === "active")
                dsDSUserAcctDropDownHTML +=
                    '<option value="' + user.userId + '">' + user.userName + "</option>";
        }
        dsDSUserAcctDropDownHTML += "</select>";
        return dsDSUserAcctDropDownHTML;
    };
});
