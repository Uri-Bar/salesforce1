/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(["require", "exports", "N/ui/message", "N/https", "./ds_common_cs", "./types/ns_types"], function (require, exports, message, https, dcc, n) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.saveRecord = function (context) {
        //Display loading dialog when the button is clicked.
        displayMessage("Creating Envelope...");
        return true;
    };
    exports.pageInit = function (context) {
        /*
          Display a message to the user if there was an error
          creating the envelope or there are no NetSuite
          contacts to bind to the template roles.
        */
        var numRecips = context.currentRecord.getValue("custpage_num_recips") || "";
        var action = context.currentRecord.getValue("custpage_action") || "";
        var domain = context.currentRecord.getValue("custpage_domain") || "";
        var recordId = context.currentRecord.getValue("custpage_recordid") || "";
        var recordType = context.currentRecord.getValue("custpage_recordtype") || "";
        var customButtonId = context.currentRecord.getValue("custpage_dscustombtnid") || "";
        var mergeFieldsVal = context.currentRecord.getValue("custpage_merge_fields") || "";
        var mergeFields = mergeFieldsVal === "true";
        var errorMessage = context.currentRecord.getValue("docusign_send_env_error");
        if (errorMessage) {
            renderMessage("Error Sending Envelope", errorMessage.toString(), message.Type.ERROR);
        }
        else if (!mergeFields && action) {
            createEnvelope(action.toString(), recordId.toString(), recordType.toString(), domain.toString(), customButtonId.toString());
        }
        else if (mergeFields) {
            if (!numRecips ||
                parseInt(numRecips.toString()) === 0 ||
                parseInt(numRecips.toString()) === NaN) {
                renderMessage("Missing NetSuite Recipients", "We couldn't find any contacts on this record or 'Load Record Contacts' is not configured for this custom button. You may still submit without recipients and enter them manually or go back and attach recipients in NetSuite.", message.Type.INFORMATION);
            }
        }
    };
    var createEnvelope = function (action, recordId, recordType, domain, buttonId) {
        displayMessage("Creating Envelope...");
        var params = {
            action: action,
            recordId: recordId,
            recordType: recordType,
            domain: domain,
            time: new Date().getTime(),
            dsCustomBtnId: buttonId,
        };
        var _url = dcc.getNetSuiteUrl(n.urlEndpoint.restlet, params);
        https.get
            .promise({
            url: _url,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "User-Agent-x": "SuiteScript Call",
            },
        })
            .then(function (response) {
            jQuery.unblockUI({ fadeOut: 0 });
            var responseBody = trimResponseMessage(response.body);
            var parsedResponse = null;
            try {
                parsedResponse = JSON.parse(responseBody);
                if (parsedResponse.viewUrl) {
                    window.location.href = parsedResponse.viewUrl;
                }
                else {
                    var parsedError = parseError(parsedResponse);
                    renderMessage(parsedError.title, parsedError.message, message.Type.ERROR);
                }
            }
            catch (error) {
                renderMessage("Error Creating Envelope", responseBody, message.Type.ERROR);
            }
        })
            .catch(function (error) {
            jQuery.unblockUI({ fadeOut: 0 });
            var parsedError = parseError(error);
            renderMessage(parsedError.title, parsedError.message, message.Type.ERROR);
        });
    };
    var displayMessage = function (message) {
        jQuery.blockUI({
            message: "<div style=\"margin: auto; text-align: center;\">" + message + "</div>",
            css: {
                top: "0px",
                left: "0px",
                height: "100%",
                fontWeight: "bold",
                padding: "20px",
                width: "100%",
                border: "none",
                backgroundColor: "transparent",
                color: "white",
                opacity: 0.9,
            },
        });
    };
    var renderMessage = function (title, body, type) {
        var msg = message.create({
            title: title,
            message: body,
            type: type,
        });
        msg.show({});
    };
    /**
     * @desc  Helper Function: Trim the response message
     * @param {string} response - the response of the api call
     * @return {string} - the value of the parameter
     */
    var trimResponseMessage = function (response) {
        var result = response;
        if (response.substring(0, 1) === '"' &&
            response.substring(response.length - 1, response.length) === '"') {
            result = response.substring(1, response.length - 1);
        }
        return result;
    };
    var parseError = function (error) {
        var _a;
        var envError = {
            title: ((_a = error) === null || _a === void 0 ? void 0 : _a.name) || "Error Creating Envelope",
            message: error,
        };
        if (error.message) {
            try {
                var message_1 = JSON.parse(error.message);
                if (message_1.name) {
                    envError.title = message_1.name;
                }
                envError.message = message_1.message || message_1;
            }
            catch (_b) {
                envError.message = error.message;
            }
        }
        return envError;
    };
});
