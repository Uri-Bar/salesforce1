/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(["require", "exports", "N/currentRecord", "N/https", "../ds_common_cs", "../types/ns_types", "../types/ds_t_telemetry"], function (require, exports, currentRec, https, dcc, n, dsttelemetry) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pageInit = function (context) {
        // this is a necessary placeholder. This will compile without this
        // function but NetSuite will not allow the file to be uploaded to
        // the file cabinet without at least one formal script entry point.
    };
    /**
     * @desc  Helper Function: Create and return the header array for making api call to DocuSign services for NetSuite
     * @return {object} - the header array for making api call to DocuSign services for NetSuite
     */
    exports.getRequestHeaders = function () {
        return {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent-x": "SuiteScript Call",
        };
    };
    /**
     * @desc  Helper Function: Trim the response message
     * @param {string} response - the response of the api call
     * @return {string} - the value of the parameter
     */
    exports.trimResponseMessage = function (response) {
        var result = response;
        if (response.substring(0, 1) === '"' &&
            response.substring(response.length - 1, response.length) === '"') {
            result = response.substring(1, response.length - 1);
        }
        return result;
    };
    exports.ds_cs_openDSAdminConsole = function () {
        exports.logAction(dsttelemetry.TelemetryUserEvents.DocuSignAdminConsole, null).then(function () {
            var _url = dcc.getNetSuiteUrl(n.urlEndpoint.restlet);
            var parameter = "&action=opendsadminconsole" + "&time=" + new Date().getTime();
            var headers = exports.getRequestHeaders();
            var response = https.request({
                method: https.Method.GET,
                url: _url + parameter,
                headers: headers,
            });
            var responseBody = exports.trimResponseMessage(response.body);
            if (responseBody.substring(0, 5) === "https") {
                window.open(responseBody, "DocuSign");
            }
            else {
                alert(responseBody);
            }
        });
    };
    exports.ds_cs_openDSAcctSettingsPage = function () {
        exports.logAction(dsttelemetry.TelemetryUserEvents.DocuSignAccountSettings, null).then(function () {
            var _url = dcc.getNetSuiteUrl(n.urlEndpoint.configuration_suitelet);
            window.location.href = _url;
        });
    };
    exports.ds_openDSAcctConfigPage = function () {
        exports.logAction(dsttelemetry.TelemetryUserEvents.DocuSignConfigureAccount, null).then(function () {
            var _url = dcc.getNetSuiteUrl(n.urlEndpoint.configuration_suitelet);
            window.onbeforeunload = null;
            window.open(_url + "&configacct=true", "_self", "false");
        });
    };
    /**
     * @desc  Event triggered by: "Update" button
     *      Update the DocuSign Envelope Status record.  Save the Postback documents to NetSuite if the envelope is completed.
     * @param {string} loadingGif - the source of the loading gif image
     */
    exports.docusign_update = function (loadingGif) {
        exports.displayLoader(loadingGif);
        setTimeout(function () {
            var recordId = encodeURIComponent(currentRec.get().id || "");
            var recordType = encodeURIComponent(currentRec.get().type || "");
            var url = dcc.getNetSuiteUrl(n.urlEndpoint.restlet);
            url += "&action=update&time=" + new Date().getTime();
            url += "&recordId=" + recordId + "&recordType=" + recordType;
            var headers = exports.getRequestHeaders();
            exports.logAction(dsttelemetry.TelemetryUserEvents.DocumentUpdate, null).then(function () {
                try {
                    var response = https.get({
                        url: url,
                        headers: headers,
                    });
                    var responseBody = exports.trimResponseMessage(response.body);
                    if (responseBody !== "") {
                        alert(responseBody.replace(/\\"/g, '"'));
                    }
                    exports.refreshPage(true);
                }
                catch (error) {
                    exports.displayErrorMessage(error);
                }
                jQuery.unblockUI({ fadeOut: 500 });
            });
        }, 1000);
    };
    /**
     * @desc  Execute either a built-in DS function or a custom DS script
     *
     *    This function will do the followings:
     *      - Make an API call to DocuSign Services for NetSuite(DocuSign RESTLet)
     *        - if the API call returns a view url, create and display the sender view iFrame
     *          - if "Close" button or "Discard Changes" link is clicked, close the sender view iFrame
     *          - if "Send" button is clicked, show the thank you page(depending if "Show thank you .." checkbox is checked or not).
     *          - if "Save Draft" link is clicked, display the "Save Envelope" dialog box
     *        - if the API call returns "OpenVerifyAccountDialogBox", display the "Provisioning" dialog box
     *        - if the API call doesn't return a url, display the error message
     *
     * @param  {string} action - the DS action; gets passed to the restlet
     * @param  {boolean} mergeFields - Whether or not merge fields is being used to process the envelope.
     * @param  {string} dsCustomBtnId - ID of the DS custom script; gets passed to the restlet [optional]
     */
    exports.docusign_process = function (action, mergeFields, dsCustomBtnId) {
        var recordId = encodeURIComponent(currentRec.get().id || "");
        var recordType = encodeURIComponent(currentRec.get().type || "");
        var params = {
            action: action,
            recordId: recordId,
            recordType: recordType,
            dsCustomBtnId: dsCustomBtnId,
            domain: window.location.protocol + "//" + document.domain,
            mergeFields: mergeFields,
        };
        var _url = dcc.getNetSuiteUrl(n.urlEndpoint.signature_suitelet, params);
        window.open(_url, "_blank");
    };
    /**
     * @desc  Display the loading image
     * @param  {string} loadingGif - the source of the loading image
     */
    exports.displayLoader = function (loadingGif) {
        var windowWidth = exports.getWindowWidth();
        var windowHeight = exports.getWindowHeight();
        var imageHeight = 20;
        var imageWidth = 120;
        jQuery.blockUI({
            message: '<img src="' +
                loadingGif +
                '" height="' +
                imageHeight +
                'px" width="' +
                imageWidth +
                'px"  />',
            css: {
                top: (windowHeight - imageHeight) / 2 + "px",
                left: (windowWidth - imageWidth) / 2 + "px",
                height: imageHeight + "px",
                width: imageWidth + "px",
                border: "none",
                backgroundColor: "transparent",
                color: "gray",
                opacity: 0.9,
            },
        });
    };
    /**
     * @desc  Create and open the dialog box for sender and recipient view
     * @param  {string} content - the content of the dialog box
     * @param  {string} contentWidth - the width of the dialog box
     * @param  {string} contentHeight - the height of the dialog box
     */
    exports.displayDocuSignView = function (content, contentWidth, contentHeight) {
        var windowWidth = exports.getWindowWidth();
        var windowHeight = exports.getWindowHeight();
        var ds_iframe_width = windowWidth - 100;
        var ds_iframe_height = windowHeight - 25;
        if (contentWidth) {
            ds_iframe_width = contentWidth;
        }
        if (contentHeight) {
            ds_iframe_height = windowHeight;
        }
        jQuery.blockUI({
            message: '<div><button style="float:right" type="button" id="docusign_close" >Close</button><label>DocuSign - The Global Standard in eSignature</label>' +
                '<div style="clear:both;"></div></div>' +
                '<div><iframe id="docuSigniFrame" src=' +
                content +
                ' height="' +
                (ds_iframe_height - 34) +
                'px" width="' +
                (ds_iframe_width - 10) +
                'px" scrolling="auto"></iframe></div>',
            css: {
                top: "10px",
                left: (windowWidth - ds_iframe_width) / 2 + "px",
                width: ds_iframe_width + "px",
                height: ds_iframe_height + "px",
                position: "absolute",
            },
        });
    };
    /**
     * @desc  Event triggered by: "Remove all DocuSign Envelope Status" button
     *      Delete all the "DocuSign Envelope Status" Record
     */
    exports.deleteDSEnvelopeStatusRecord = function (envelopeId) {
        var _url = dcc.getNetSuiteUrl(n.urlEndpoint.restlet);
        var parameter = "&dsAction=deletedsenvelopestatusrecord&envelopeId=" +
            encodeURIComponent(envelopeId) +
            "&time=" +
            new Date().getTime();
        var headers = exports.getRequestHeaders();
        return https.delete.promise({
            url: _url + parameter,
            headers: headers,
        });
    };
    /**
     * @desc  Helper Function: Remove the dstab parameter and refresh the page
     * @param {boolean} openDSTab: flag indicating if the DocuSign tab should be open
     */
    exports.refreshPage = function (openDSTab) {
        if (openDSTab) {
            var newWindowLocation = window.location.href.replace("#", "");
            if (!exports.getURLParameter("dstab", newWindowLocation)) {
                newWindowLocation += "&dstab=true";
            }
            window.location.href = newWindowLocation;
        }
        else {
            window.location.href = window.location.href
                .replace("#", "")
                .replace("&dstab=true", "");
        }
    };
    /**
     * @desc  Helper Function: Return the value of a specific parameter
     * @param {string} parameterName - the name of the image
     * @param {string} url - the name of the image
     * @return {string} - the value of the parameter
     */
    exports.getURLParameter = function (parameterName, url) {
        return (decodeURIComponent((new RegExp("[?|&]" + parameterName + "=" + "([^&;]+?)(&|#|;|$)").exec(url) || [, ""])[1].replace(/\+/g, "%20")) || null);
    };
    /**
     * @desc  Create and open the "DS User Account Selection" dialog box
     * @param {string} action -
     * @param {string} userEmail - the email of the DocuSign user
     */
    exports.openDSUserAcctSelectionDialogBox = function (action, userEmail) {
        var windowHeight = exports.getWindowHeight();
        var windowWidth = exports.getWindowWidth();
        var dialogHeight = 200;
        var dialogWidth = 620;
        var content = dcc.getNetSuiteUrl(n.urlEndpoint.landingpage);
        content +=
            "&dsUserAction=selectdsuseraccount&userEmail=" +
                encodeURIComponent(userEmail) +
                "&time=" +
                new Date().getTime();
        jQuery.blockUI({
            message: '<iframe id="dsSelectUserAccountiFrame" marginheight="0" marginwidth="0" height="100%" width="100%" scrolling="no" frameborder="0" src=' +
                content +
                "></iframe>",
            css: {
                top: (windowHeight - dialogHeight) / 2 + "px",
                left: (windowWidth - dialogWidth) / 2 + "px",
                width: dialogWidth + "px",
                height: dialogHeight + "px",
                position: "absolute",
                border: "none",
                backgroundColor: "white",
                color: "black",
            },
        });
        jQuery("#dsSelectUserAccountiFrame").load(function () {
            setTimeout(function () {
                var dsSelectUserAccountiFrame = jQuery("#dsSelectUserAccountiFrame").contents();
                dsSelectUserAccountiFrame
                    .find("#ds_SelectUserAcct_DialogBox_close")
                    .click(function () {
                    jQuery.unblockUI({ fadeOut: 500 });
                    exports.refreshPage();
                    return false;
                });
                dsSelectUserAccountiFrame
                    .find("#ds_select_user_ds_account")
                    .click(function () {
                    var dsUserId = dsSelectUserAccountiFrame
                        .find("#ds_user_accounts_dropdown")
                        .val();
                    jQuery.unblockUI({ fadeOut: 500 });
                    exports.docusign_process(action, false, null);
                    return false;
                });
            }, 500);
        });
    };
    /**
     * @desc  Helper Function: Return the width of browser window
     * @return {windowWidth} - the height of browser window
     */
    exports.getWindowWidth = function () {
        var windowWidth = 0;
        if (typeof window.innerWidth === "number") {
            windowWidth = window.innerWidth; //Non-IE
        }
        else if (document.documentElement &&
            (document.documentElement.clientWidth ||
                document.documentElement.clientHeight)) {
            windowWidth = document.documentElement.clientWidth; //IE 6+ in 'standards compliant mode'
        }
        else if (document.body &&
            (document.body.clientWidth || document.body.clientHeight)) {
            windowWidth = document.body.clientWidth; //IE 4 compatible
        }
        return windowWidth;
    };
    /**
     * @desc  Helper Function: Return the height of browser window
     * @return {windowHeight} - the height of browser window
     */
    exports.getWindowHeight = function () {
        var windowHeight = 0;
        if (typeof window.innerWidth === "number") {
            windowHeight = window.innerHeight; //Non-IE
        }
        else if (document.documentElement &&
            (document.documentElement.clientWidth ||
                document.documentElement.clientHeight)) {
            windowHeight = document.documentElement.clientHeight; //IE 6+ in 'standards compliant mode'
        }
        else if (document.body &&
            (document.body.clientWidth || document.body.clientHeight)) {
            windowHeight = document.body.clientHeight; //IE 4 compatible
        }
        return windowHeight;
    };
    /**
     * @desc  Helper Function: Format and display the error message
     * @param {string} error: error message to be formatted and displayed
     */
    exports.displayErrorMessage = function (error) {
        var errorMessage = "";
        if (error.message &&
            error.message.indexOf("An Error Occurred during anchor tag processing.") !==
                -1) {
            errorMessage =
                "You have attempted to create an envelope, and map Anchor Tags to that document without first specifying a document.  To remedy this, add a file to the object you are Sending from (Communication>Files) before clicking the Send to DocuSign button.";
        }
        else {
            errorMessage = "[" + error.name + "] " + error.message;
        }
        alert(errorMessage);
    };
    exports.logAction = function (action, envelopeId) {
        var _url = dcc.getNetSuiteUrl(n.urlEndpoint.restlet);
        return https.post.promise({
            url: _url,
            headers: exports.getRequestHeaders(),
            body: {
                action: "telemetry",
                envelopeId: envelopeId,
                telemetryAction: action,
            },
        });
    };
});
