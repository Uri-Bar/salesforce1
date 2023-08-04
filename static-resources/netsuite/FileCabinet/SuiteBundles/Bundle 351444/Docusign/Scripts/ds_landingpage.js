/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NAmdConfig  ./lib/JsLibraryConfig.json
 */
define(["require", "exports", "./ds_common", "./ds_api"], function (require, exports, dc, api) {
    Object.defineProperty(exports, "__esModule", { value: true });
    ("use strict");
    /**
     * @desc 	Version: NetSuite 2.1
     * 		NetSuite Script Type: Suitelet
     * 		Build and return the dialog box in HTML code.  Different dialog box will be returned based on the "dsUserAction" url parameter.
     * 		There are 5 types of dialog box:
     * 			- Loading Dialog Box (dsUserAction="load")
     * 			- Thank You Dialog Box (dsUserAction="thankyou")
     * 			- Save Envelope Dialog Box (dsUserAction="saveenvelope")
     * 			- Provisioning Dialog Box (dsUserAction="provision")
     * 			- Confirm DS Account Password Dialog Box (dsUserAction="confirmaccount")
     * 			- Configure DocuSign Dialog Box (dsUserAction="configureaccount")
     * 			- Log In to DocuSign Dialog Box (dsUserAction="loginaccount")
     * 			- Create New DocuSign Account Dialog Box (dsUserAction="createaccount")
     * @param 	nlobjRequest request - the object used to encapsulate an HTTP GET or POST request for Suitelets
     * @param 	nlobjResponse response - the object used for scripting web responses in Suitelets
     * @return nlobjResponse - the dialog box
     */
    // function docuSignSuitelet(request, response) {
    exports.onRequest = function (context) {
        var request = context.request;
        var response = context.response;
        var language = "EN";
        var localizationJSON = dc.getLocalizationJSON(language);
        var dsUserAction = request.parameters.dsUserAction;
        var templateName;
        var data;
        switch (dsUserAction) {
            case "load":
                //Build and return the Loading dialog box.
                templateName = "landingpage_load.ejs";
                data = {
                    loadingText: "Your envelope was sent successfully.  Please close this window.",
                };
                break;
            case "thankyou":
                //Build and return the Thank You dialog box.
                templateName = "landingpage_thankyou.ejs";
                data = {
                    sentImage: dc.getFileUrl("ds_sent.png"),
                    sentText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsSuccessfullySentDoc"),
                    successfulSendMessage: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsSuccessfulSendMessage"),
                };
                break;
            case "saveenvelope":
                //Build and return the Save Envelope dialog box.
                templateName = "landingpage_saveenvelope.ejs";
                data = {
                    backgroundImage: dc.getFileUrl("ds_header_gradient.png"),
                    checkImage: dc.getFileUrl("ds_header_check.jpg"),
                    closeImage: dc.getFileUrl("ds_header_close.jpg"),
                    buttonImage: dc.getFileUrl("dc.DS_BUTTON.png"),
                    dsCloseText: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsClose"),
                    savedText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsEnvelopeSavedAsDraft"),
                    accessText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsAccessDraftInstruction"),
                };
                break;
            case "provision":
                //Build and return the Provisioning dialog box.
                templateName = "landingpage_provision.ejs";
                data = {
                    backgroundImage: dc.getFileUrl("ds_header_gradient.png"),
                    closeImage: dc.getFileUrl("ds_header_close.jpg"),
                    buttonImage: dc.getFileUrl("dc.DS_BUTTON.png"),
                    dsSubmitText: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsSubmit"),
                    provisionText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsAccountProvisioning"),
                    enterInfoText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsEnterProvisioningInfo"),
                    ieMsgText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsIEMsgForProvisionAcct"),
                    userName: request.parameters.userName,
                };
                break;
            case "confirmaccount":
                //Build and return the Confirm DS Account Password dialog box.
                templateName = "landingpage_confirmaccount.ejs";
                data = {
                    backgroundImage: dc.getFileUrl("ds_header_gradient.png"),
                    closeImage: dc.getFileUrl("ds_header_close.jpg"),
                    buttonImage: dc.getFileUrl("dc.DS_BUTTON.png"),
                    dsConfirmText: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsConfirm"),
                    confirmText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsConfirmAccount"),
                    sentToText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsConfirmAcctInfo"),
                    instructionText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsConfirmAccountInstruction"),
                    email: request.parameters.email,
                };
                break;
            case "verifyaccount":
                //Build and return the Verify DS Account dialog box.
                templateName = "landingpage_verifyaccount.ejs";
                data = {
                    backgroundImage: dc.getFileUrl("ds_header_gradient.png"),
                    closeImage: dc.getFileUrl("ds_header_close.jpg"),
                    buttonImage: dc.getFileUrl("dc.DS_BUTTON.png"),
                    dsVerifyText: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsVerify"),
                    verifyText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsVerifyAccount"),
                    sentToText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsVerifyAcctInfo"),
                    instructionText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsVerifyAccountInstruction"),
                    ieMsgText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsIEMsgForVerifyAcct"),
                    email: request.parameters.email,
                };
                break;
            case "configureaccount":
                //Build and return the Configure DS Account dialog box.
                templateName = "landingpage_configureaccount.ejs";
                data = {
                    backgroundImage: dc.getFileUrl("ds_header_gradient.png"),
                    closeImage: dc.getFileUrl("ds_header_close.jpg"),
                    buttonImage: dc.getFileUrl("dc.DS_BUTTON.png"),
                    dsYesText: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsYes"),
                    dsNoText: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsNo"),
                    dsConfigureText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsConfigureDSAcctMsg"),
                };
                break;
            case "loginaccount":
                //Build and return the Login DS Account dialog box.
                templateName = "landingpage_loginaccount.ejs";
                var dsEnvDropDownHTML = dc.getDSEnvDropDownHTML();
                data = {
                    backgroundImage: dc.getFileUrl("ds_header_gradient.png"),
                    closeImage: dc.getFileUrl("ds_header_close.jpg"),
                    buttonImage: dc.getFileUrl("dc.DS_BUTTON.png"),
                    dsLogInText: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsLogin"),
                    headerLabelText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsLoginToDS"),
                    dsLoginDSAcctMsgText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsLoginDSAcctMsg"),
                    dsEnterYourDSCredentialsText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsEnterYourDSCredentials"),
                    dsEnvironmentText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsEnvironment"),
                    dsEmailAddressText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsEmailAddress"),
                    dsPasswordText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsPassword"),
                    dsEnvDropDownHTML: dsEnvDropDownHTML,
                };
                break;
            case "createaccount":
                //Build and return the Create DS Account dialog box.
                templateName = "landingpage_createaccount.ejs";
                dsEnvDropDownHTML = dc.getDSEnvDropDownHTML();
                data = {
                    backgroundImage: dc.getFileUrl("ds_header_gradient.png"),
                    closeImage: dc.getFileUrl("ds_header_close.jpg"),
                    buttonImage: dc.getFileUrl("dc.DS_BUTTON.png"),
                    dsCreateText: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsCreate"),
                    headerLabelText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsCreateNewDSAccount"),
                    dsEnvironmentText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsEnvironment"),
                    dsCompanyText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsCompany"),
                    dsFirstNameText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsFirstName"),
                    dsLastNameText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsLastName"),
                    dsEmailText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsEmail"),
                    dsIAgreeToText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsIAgreeTo"),
                    dsTermsAndConditionsText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsTermsAndConditions"),
                    dsEnvDropDownHTML: dsEnvDropDownHTML,
                };
                break;
            case "selectdsaccount":
                //Build and return the Select DS Account dialog box.
                templateName = "landingpage_selectaccount.ejs";
                var dsEnv = request.parameters.dsEnv;
                var dsUserName = request.parameters.dsUsername;
                var dsPassword = request.parameters.dsPassword;
                var dsAcctDropDownHTML = api.dsapi_getDsAcctDropDownHtml(dsEnv, dsUserName, dsPassword);
                data = {
                    backgroundImage: dc.getFileUrl("ds_header_gradient.png"),
                    closeImage: dc.getFileUrl("ds_header_close.jpg"),
                    buttonImage: dc.getFileUrl("dc.DS_BUTTON.png"),
                    headerLabelText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsSelectDSAccount"),
                    dsCloseText: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsSelect"),
                    dsAcctDropDownHTML: dsAcctDropDownHTML,
                };
                break;
            case "selectdsuseraccount":
                //Build and return the Select DS User Account dialog box.
                templateName = "landingpage_selectuseraccount.ejs";
                var userEmail = request.parameters.userEmail;
                var dsUserAcctDropDownHTML = api.dsapi_getDsUserAcctDropDownHtml(userEmail);
                data = {
                    backgroundImage: dc.getFileUrl("ds_header_gradient.png"),
                    closeImage: dc.getFileUrl("ds_header_close.jpg"),
                    buttonImage: dc.getFileUrl("dc.DS_BUTTON.png"),
                    headerLabelText: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsSelectDSAccount"),
                    dsSelectText: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsSelect"),
                    dsUserAcctDropDownHTML: dsUserAcctDropDownHTML,
                };
                break;
            case "addcustombutton":
                //Build and return the Add DS Custom Button dialog box.
                templateName = "landingpage_addcustombutton.ejs";
                var dsCustomBtnName = request.parameters.dsCustomBtnName;
                data = {
                    backgroundImage: dc.getFileUrl("ds_header_gradient.png"),
                    closeImage: dc.getFileUrl("ds_header_close.jpg"),
                    buttonImage: dc.getFileUrl("dc.DS_BUTTON.png"),
                    headerLabelText: dsCustomBtnName
                        ? dsCustomBtnName
                        : dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsCreateNewCustomBtn"),
                    dsSaveText: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsSave"),
                    dsCustomBtnName: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsCustomBtnName"),
                    dsAutoScriptId: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsAutoScriptId"),
                    dsAutoScriptFolder: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsAutoScriptFolder"),
                    dsAutoScriptFile: dc.getLocalizationText(localizationJSON, dc.DS_LABEL, "dsAutoScriptFile"),
                    nsFolderDropDownHTML: dc.getNSFolderDropDownHTML(),
                };
                break;
        }
        var contentUrl = dc.getFileUrl(templateName);
        var template = dc.getFileContent("docusign_landingpage_client.html");
        var client = template
            .replace("@EJS_DATA@", JSON.stringify(data))
            .replace("@EJS_URL@", contentUrl);
        response.write(client);
    };
});
