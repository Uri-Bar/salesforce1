/**
 * @NApiVersion 2.1
 * @NScriptType RESTlet
 * @NAmdConfig  ./lib/JsLibraryConfig.json
 *    This file includes all the DocuSign Services for NetSuite.
 */
define(["require", "exports", "N/file", "N/record", "N/runtime", "N/search", "N/log", "./ds_common", "./ds_api", "./api/ds_envelope", "./api/ds_telemetry", "./config/ds_config_validation", "./types/ds_t_telemetry"], function (require, exports, file, record, runtime, search, log, dc, api, apienv, apitelemetry, valid, dsttelemetry) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @desc  This is the core function of the DocuSign Services for NetSuite.
     *      Here is the list of DocuSign Services:
     *        - Setup DocuSign SOBO Account to work with NetSuite
     *        - Create new DocuSign Account
     *        - Save DocuSign User Account Settings
     *        - Send with DocuSign
     *        - Sign with DocuSign
     *        - Update DocuSign Envelope Status
     *        - View Envelope with DocuSign Admin Console
     *        - Open DocuSign Admin Console
     *        - Get the file url from NetSuite File System
     *        - Get the Record Settings JSON
     * @param {Object} datain - the input data
     * @return {string} response - the response of the DocuSign Services for NetSuite
     */
    var dsGet = function (datain) {
        log.debug("datain json", JSON.stringify(datain));
        var response = "";
        var env = dc.getDSEnvironmentName();
        if (datain.action === "getfileurl") {
            var fileName = datain.fileName;
            response =
                fileName && fileName !== ""
                    ? dc.getFileUrl(fileName)
                    : "Invalid File Name.";
        }
        else if (datain.action === "getrecordsettingsjson") {
            response = getRcordSettingsJSON(datain);
        }
        else if (datain.action === "updaterecordsettings") {
            response = updateRecordSettings(datain);
        }
        else if (datain.action === "getdscustombtnlisthtml") {
            response = dc.getDSCustomBtnHTML(datain.recordType);
        }
        else if (datain.action === "getdsautoscriptfileslisthtml") {
            response = dc.getNSFileDropDownHTML(datain.nsFolderId);
        }
        else if (datain.action === "updatecustombottonsettings") {
            response = updateCustomButtonSettings(datain);
        }
        else if (datain.action === "verifyaccount") {
            response = verifyAccount(datain);
        }
        else if (datain.action === "saveacctsettings") {
            response = saveAccountSettings(datain);
        }
        else if (datain.action === "validatecustombutton") {
            response = validateCustomButtonName(datain);
        }
        else if (datain.action === "mergeFieldRequest") {
            response = mergeFieldReequest(datain);
        }
        else if (datain.action === "getmergefieldrecipients") {
            response = JSON.stringify(getMergeFieldRecipients(datain));
        }
        else {
            response = api.dsapi_validateSoboAccount();
        }
        if (response === "") {
            response = api.validateDSUser(datain);
            if (response === "") {
                if (datain.action === "opendsadminconsole")
                    return api.dsapi_openConsole();
                response = dc.validateFilePermission(datain);
                if (response === "") {
                    try {
                        switch (datain.action) {
                            case "send":
                                return api.docusignPopulateEnvelope(datain);
                            case "sign":
                                return api.docusignSignEnvelope(datain);
                            case "automate":
                                return dc.automate(datain);
                            case "update":
                                response = dc.validateUserPermission(datain);
                                return response !== ""
                                    ? response
                                    : updateEnvelopeStatus(env, datain.envelopeId, datain.recordType, datain.recordId);
                        }
                    }
                    catch (e) {
                        return JSON.stringify(e);
                    }
                }
            }
            else {
                log.debug("DocuSign Service", response);
            }
        }
        return response;
    };
    exports.get = dsGet;
    var getMergeFieldRecipients = function (docusignContext) {
        var response = {
            template: [],
            netsuite: [],
        };
        if (!docusignContext ||
            !docusignContext.dsCustomBtnId ||
            !docusignContext.recordType ||
            !docusignContext.recordId)
            return response;
        var mergeFields = dc.getMergeFieldSublistRecords(docusignContext.dsCustomBtnId);
        if (!mergeFields || mergeFields.length === 0)
            return response;
        var templateId = mergeFields[0].template_id;
        if (!templateId)
            return response;
        response = apienv.getMergeFieldRecipients(docusignContext.recordType, docusignContext.recordId, templateId, docusignContext.dsCustomBtnId);
        return response;
    };
    /**
     * @desc  Helper Function: Get the first valid document name of the file array
     * @param {[]} attachedFilesArray - the file array
     * @return {string} firstDocName - the first document name of the file array
     */
    var getFirstDocName = function (attachedFilesArray) {
        var firstDocName = "";
        if (attachedFilesArray) {
            for (var i = 0; i < attachedFilesArray.length; i++) {
                var fileId = attachedFilesArray[i];
                if (fileId && fileId !== "") {
                    var _file = void 0;
                    try {
                        _file = file.load({ id: _file.fileId });
                        _file.getValue();
                        if (_file && _file.name.indexOf("DOCUSIGNED") === -1) {
                            firstDocName = _file.name;
                            break;
                        }
                    }
                    catch (e) {
                        //No need to handle this error, because we are just trying to get the first document name
                    }
                }
            }
        }
        return firstDocName;
    };
    /**
     * @desc  This function provides the following DocuSign Service:
     *        - Verify DocuSign account
     * @param {Object} datain - the input data
     * @return {string} response - return "ACCOUNTVERIFIED" + userName (if a DocuSign account is verified) or the error message (if fail)
     */
    var verifyAccount = function (datain) {
        var response = "Unable to verify your DocuSign.";
        var logInAsSobo = false;
        var username = datain.username;
        var password = datain.password;
        var resp = api.dsapi_restLogin(logInAsSobo, null, username, password, true);
        var json = JSON.parse(resp.body);
        var code = resp.code;
        if (code === 200 && !json.message) {
            response = "ACCOUNTVERIFIED" + json.loginAccounts[0].userName;
        }
        else {
            response = json.message && json.message !== "" ? json.message : resp.body;
            log.error("Verify DocuSign Account", response);
        }
        return response;
    };
    /**
     * @desc This function validates whether the custom button name is valid.
     * @param dsAction - the DocuSign action
     * @param datain - the input data
     */
    var validateCustomButtonName = function (datain) {
        var recordType = datain.recordType;
        var buttonName = datain.dsCustomBtnName;
        var buttonId = datain.dsCustomBtnId;
        var response = valid.customButtonIsValid(recordType, buttonName, buttonId);
        return response.message;
    };
    /**
     * @desc  This function provides the following DocuSign Services:
     *        - If targetEnvelopeId is provided, only update the envelope with the targeted envelope id
     *        - else update all the envelope with non-completed status
     * @param {string} env - the selected DocuSign environment
     * @param {string} targetEnvelopeId - the envelope id to be updated
     * @param {string} recordType - the record type
     * @param {string} recordId - the record ID
     * @return {string} response - the success message
     */
    var updateEnvelopeStatus = function (env, targetEnvelopeId, recordType, recordId) {
        var response = "";
        var accountId = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_account_id" })
            .toString();
        var dsDSFolderId = dc.getDocuSignedFolderId();
        if (!dsDSFolderId || dsDSFolderId === "") {
            return "Unable to find DocuSign folder.";
        }
        var searchStatus = dc.getDSEnvelopeStatusList(env, accountId, recordType, recordId);
        searchStatus.run().each(function (status) {
            var envStatusRecordId = (status.getValue("internalid") || "").toString();
            if (!envStatusRecordId)
                return true; //Continue looping
            var dsEnvelopeStatus = record.load({
                type: "customrecord_docusign_envelope_status",
                id: envStatusRecordId,
            });
            var envelopeId = dsEnvelopeStatus
                .getValue("custrecord_docusign_status_envelope_id")
                .toString();
            var recordOwner = dsEnvelopeStatus.getValue("owner");
            var currentUser = runtime.getCurrentUser().id;
            if ((targetEnvelopeId && targetEnvelopeId !== envelopeId) ||
                recordOwner !== currentUser) {
                return true;
            }
            var envelopeStatus = dsEnvelopeStatus
                .getValue("custrecord_docusign_status")
                .toString();
            if (envelopeStatus === "completed") {
                return true;
            }
            var envelope = api.dsapi_getEnvelopeInfo(envelopeId);
            if (dsEnvelopeStatus.getValue("name") !== envelope.emailSubject) {
                record.submitFields({
                    type: "customrecord_docusign_envelope_status",
                    id: envStatusRecordId,
                    values: { name: envelope.emailSubject },
                });
            }
            var completedDateTime = envelope && envelope.completedDateTime
                ? envelope.completedDateTime.replace(/\.\d*Z/i, "")
                : "";
            var newDocuSignStatus = envelope.status.toString();
            if (newDocuSignStatus === envelopeStatus) {
                return true;
            }
            record.submitFields({
                type: "customrecord_docusign_envelope_status",
                id: envStatusRecordId,
                values: { custrecord_docusign_status: newDocuSignStatus },
            });
            //check if doc is already saved in repository.  If not, save the doc
            if (newDocuSignStatus !== "completed" ||
                dsEnvelopeStatus.getValue("custrecord_docusign_document_saved") === "T") {
                return true;
            }
            // generate the completed document name
            var fileName = api.dsapi_getEnvelopeName(envelopeId);
            // get the document set from DS and save it into NS
            var serverResponse = api.dsapi_getEnvelopeDocumentSet(envelopeId);
            if (serverResponse.code !== 200) {
                return JSON.parse(serverResponse.body).message;
            }
            var singedDocName = fileName + " - (UTC)" + completedDateTime + " - DOCUSIGNED.pdf";
            try {
                var _file = file.create({
                    name: singedDocName,
                    fileType: file.Type.PDF,
                    contents: serverResponse.body,
                });
                var dsFolderId = dc.getFolderId(dc.DOCUSIGNED_FOLDER_NAME);
                _file.folder = dsFolderId;
                var signedDocId = _file.save();
                //attach doc to record
                record.attach({
                    record: {
                        type: "file",
                        id: signedDocId,
                    },
                    to: {
                        type: recordType,
                        id: recordId,
                    },
                });
                //Update Envelope Status Record
                record.submitFields({
                    type: "customrecord_docusign_envelope_status",
                    id: envStatusRecordId,
                    values: {
                        custrecord_docusign_document_saved: "T",
                    },
                });
            }
            catch (e) {
                var errorReason = "";
                errorReason = "[" + e.code + "] " + e.message;
                if (e.code === "SSS_FILE_SIZE_EXCEEDED") {
                    return 'NetSuite has a limit of 5MB for documents uploaded programmatically to NetSuite CRM+.  The PDFs containing documents signed in DocuSign are greater in size than NetSuite\'s limit of 5MB, so those documents cannot be uploaded to NetSuite.  The documents were still signed, however, and can be viewed by clicking the "View Doc" link in the DocuSign Status list.   If you wish to upload signed PDFs manually to NetSuite, you can download them from the View Doc links.';
                }
                return errorReason;
            }
        });
        return response;
    };
    /**
     * @desc  This function provides the following DocuSign Services:
     *        - Update the "Attached the Certificate of Completion (CoC) in the signed document" setting
     *        - Update the "Show thank you page after sending/signing a document" setting
     * @param {Object} datain - the input data
     * @return {string} response - the success message
     */
    var saveAccountSettings = function (datain) {
        var response = "DocuSign Account Settings have been updated successfully.";
        var dsAcctSettingsRecord = dc.getAccountSettingRecord(true);
        var attachCoc = datain.attachCoc;
        var fileformat = datain.fileformat;
        if (attachCoc) {
            if (attachCoc === "true") {
                dsAcctSettingsRecord.setValue("custrecord_docusign_include_coc", "T");
            }
            else if (attachCoc === "false") {
                dsAcctSettingsRecord.setValue("custrecord_docusign_include_coc", "F");
            }
        }
        if (fileformat && dc.isNumber(fileformat)) {
            dsAcctSettingsRecord.setValue("custrecord_docusign_postback_file_format", fileformat);
        }
        dsAcctSettingsRecord.save();
        return response;
    };
    /**
     * @desc
     * @param {string} recordType - the record type
     * @return {string} response - the response message indicating the update is done
     */
    var getRcordSettingsJSON = function (datain) {
        var result = "";
        var recordType = datain.recordType;
        if (recordType && recordType !== "") {
            var recordSettings = dc.getRecordSettings(recordType);
            if (recordSettings) {
                var recordSettingsJSON = {
                    recordName: recordSettings.getValue("name"),
                    nsInternalId: recordSettings.getValue("custrecord_ns_internal_id"),
                    sendWithDocuSign: recordSettings.getValue("custrecord_send_with_docusign"),
                    signWithDocuSign: recordSettings.getValue("custrecord_sign_with_docusign"),
                    addPrimaryContactOnly: recordSettings.getValue("custrecord_primary_contact_only"),
                    defaultEmailSubject: recordSettings.getValue("custrecord_default_email_subject"),
                    defaultEmailBlurb: recordSettings.getValue("custrecord_default_email_message"),
                    includeAttachedFile: recordSettings.getValue("custrecord_docusign_use_attached_file"),
                };
                try {
                    result = JSON.stringify(recordSettingsJSON);
                }
                catch (e) {
                    result = "";
                }
            }
        }
        return result;
    };
    /**
     * @desc  This function provides the following DocuSign Services:
     *        - Add New Record Settings
     *        - Remove Record Settings
     *              - Update Record Settings
     * @param {Object} datain - the input data
     * @return {string} response - the response message indicating the update is done
     */
    var updateRecordSettings = function (datain) {
        var response = "";
        var internalId = datain.internalId;
        var dsInternaID = "customrecord_docusign_record_settings";
        var recordSettings = dc.getRecordSettings(internalId);
        if (recordSettings) {
            var recordID = recordSettings.getValue("internalid").toString();
            var recordName = recordSettings.getValue("name");
            if (datain.actionType === "removerecordsettings") {
                //Remove Record Settings
                record.delete({
                    id: recordID,
                    type: dsInternaID,
                });
                response = recordName + " Removed.";
            }
            else if (datain.actionType === "saverecordsettings") {
                //Update Record Settings
                record.submitFields({
                    type: dsInternaID,
                    id: recordID,
                    values: {
                        name: datain.recordName,
                    },
                });
                record.submitFields({
                    type: dsInternaID,
                    id: recordID,
                    values: {
                        custrecord_ns_internal_id: datain.internalId,
                    },
                });
                record.submitFields({
                    type: dsInternaID,
                    id: recordID,
                    values: {
                        custrecord_send_with_docusign: datain.sendWithDocuSign,
                    },
                });
                record.submitFields({
                    type: dsInternaID,
                    id: recordID,
                    values: {
                        custrecord_sign_with_docusign: datain.signWithDocuSign,
                    },
                });
                record.submitFields({
                    type: dsInternaID,
                    id: recordID,
                    values: {
                        custrecord_primary_contact_only: datain.parimaryContactOnly,
                    },
                });
                record.submitFields({
                    type: dsInternaID,
                    id: recordID,
                    values: {
                        custrecord_default_email_subject: datain.emailSubject,
                    },
                });
                record.submitFields({
                    type: dsInternaID,
                    id: recordID,
                    values: {
                        custrecord_default_email_message: datain.emailBlurb,
                    },
                });
                if (internalId === "estimate") {
                    record.submitFields({
                        type: dsInternaID,
                        id: recordID,
                        values: {
                            custrecord_docusign_use_attached_file: datain.includeAttachedFiles,
                        },
                    });
                }
                if (recordName === datain.recordName) {
                    response = recordName + " Updated.";
                }
                else {
                    response =
                        "(" + recordName + ") is updated to (" + datain.recordName + ").";
                }
            }
        }
        else {
            //Save New Record Settings
            var newRecord = record.create({ type: dsInternaID });
            newRecord.setValue("name", datain.recordName);
            newRecord.setValue("custrecord_ns_internal_id", datain.internalId);
            newRecord.setValue("custrecord_send_with_docusign", datain.sendWithDocuSign);
            newRecord.setValue("custrecord_sign_with_docusign", datain.signWithDocuSign);
            newRecord.setValue("custrecord_primary_contact_only", datain.parimaryContactOnly);
            newRecord.setValue("custrecord_default_email_subject", datain.emailSubject);
            newRecord.setValue("custrecord_default_email_message", datain.emailBlurb);
            if (internalId === "estimate") {
                newRecord.setValue("custrecord_docusign_use_attached_file", datain.includeAttachedFiles);
            }
            newRecord.save();
            response = datain.recordName + " Saved.";
        }
        if (response === "") {
            response = "Invalid Record Type.";
        }
        return response;
    };
    /**
     * @desc  This function provides the following DocuSign Services:
     *        - Add Custom Button
     *        - Remove Custom Button
     *              - Edit Custom Button
     *              - Enable Custom Button
     *              - Disable Custom Button
     * @param {Object} datain - the input data
     * @return {string} response - the response message indicating the update is done
     */
    var updateCustomButtonSettings = function (datain) {
        var response = "";
        switch (datain.actionType) {
            case "addcustombutton":
                //Save New DocuSign Custom Button
                var newCustomBtn = record.create({
                    type: "customrecord_docusign_custom_button",
                });
                newCustomBtn.setValue("name", datain.dsCustomBtnName);
                newCustomBtn.setValue("custrecord_dc.DS_custom_btn_record_type", datain.recordType);
                newCustomBtn.setValue("custrecord_docusign_autoscript_folder_id", datain.dsAutoScriptFolderId);
                newCustomBtn.setValue("custrecord_docusign_automation_script_id", datain.dsCustomBtnId);
                newCustomBtn.setValue("custrecord_docusign_custom_btn_enable", "T");
                newCustomBtn.save();
                response = datain.dsCustomBtnName + " Saved.";
                break;
            case "editcustombutton":
                //Update DocuSign Custom Button
                var dsInternalID = "customrecord_docusign_custom_button";
                var filters = [];
                filters[0] = search.createFilter({
                    name: "internalid",
                    operator: search.Operator.IS,
                    values: datain.dsCustomBtnId,
                });
                var srch = search.create({
                    type: dsInternalID,
                    filters: filters,
                });
                if (srch && srch.runPaged().count > 0) {
                    record.submitFields({
                        type: dsInternalID,
                        id: datain.dsCustomBtnId,
                        values: {
                            name: datain.dsCustomBtnName,
                        },
                    });
                    record.submitFields({
                        type: dsInternalID,
                        id: datain.dsCustomBtnId,
                        values: {
                            custrecord_docusign_autoscript_folder_id: datain.dsAutoScriptFolderId,
                        },
                    });
                    record.submitFields({
                        type: dsInternalID,
                        id: datain.dsCustomBtnId,
                        values: {
                            custrecord_docusign_automation_script_id: datain.dsCustomBtnId,
                        },
                    });
                }
                response = datain.dsCustomBtnName + " Saved.";
                break;
            case "removecustombutton":
                //Remove DocuSign Custom Button
                var dsCustomBtnId = datain.dsCustomBtnId;
                if (dsCustomBtnId && dsCustomBtnId !== "") {
                    record.delete({
                        type: "customrecord_docusign_custom_button",
                        id: datain.dsCustomBtnId,
                    });
                    response = datain.dsCustomBtnName + " Removed.";
                }
                else {
                    response = "Invalid DocuSign Custom Button Id.";
                }
                logTelemetry(dsttelemetry.TelemetryConfigurationEvents.CustomButtonDelete, datain.envelopeId, dsttelemetry.TelemetryType.Configuration, dsCustomBtnId);
                break;
            case "enablecustombutton":
                //Enable or Disable DocuSign Custom Button
                dsCustomBtnId = datain.dsCustomBtnId;
                if (dsCustomBtnId && dsCustomBtnId !== "") {
                    var dsCustomBtn = record.load({
                        type: "customrecord_docusign_custom_button",
                        id: dsCustomBtnId,
                    });
                    if (dsCustomBtn) {
                        var dsEnableCustomBtn = datain.dsEnableCustomBtn && datain.dsEnableCustomBtn === "true"
                            ? "T"
                            : "F";
                        record.submitFields({
                            type: "customrecord_docusign_custom_button",
                            id: dsCustomBtnId,
                            values: {
                                custrecord_docusign_custom_btn_enable: dsEnableCustomBtn,
                            },
                        });
                    }
                    else {
                        response =
                            "Unable to find the DocuSign Custom Button [ID = " +
                                dsCustomBtn +
                                "]";
                    }
                }
                else {
                    response = "Invalid DocuSign Custom Button Id.";
                }
                break;
            default:
                break;
        }
        return response;
    };
    /**
     * @description exposes merge fields functions
     * through the restlet
     * @param datain n.datain
     */
    var mergeFieldReequest = function (datain) {
        var output = null;
        switch (datain.method) {
            case "getTemplateMergeFields":
                output = api.dsapi_getTemplateMergeFields(datain.templateId, datain.recipientId);
                break;
            case "getTemplateRecipients":
                output = api.dsapi_getTemplateRecipients(datain.templateId);
                break;
            default:
                break;
        }
        var recipString = "";
        if (output) {
            try {
                recipString = JSON.stringify(output);
            }
            catch (error) {
                log.error("getTemplateRecipients parse error", error);
            }
        }
        return recipString;
    };
    /**
     * @desc  This function provides the following DocuSign Services:
     *        - Remove all the DocuSign Custom Button records
     *        - Remove all the DocuSign Account Information records
     *        - Remove all the DocuSign Envelope Statu records
     * @param {Object} datain - the input data
     */
    var dsDelete = function (datain) {
        log.debug("dsDelete called datain parameters", JSON.stringify(datain));
        var srch = null;
        var userId = runtime.getCurrentUser().id;
        var userName = runtime.getCurrentUser().name;
        if (datain.dsAction === "deletedsenvelopestatusrecord") {
            var filters = [];
            if (datain.envelopeId !== "all") {
                filters[0] = search.createFilter({
                    name: "custrecord_docusign_status_envelope_id",
                    operator: search.Operator.IS,
                    values: datain.envelopeId,
                });
            }
            srch = search.create({
                type: "customrecord_docusign_envelope_status",
                filters: filters,
            });
            log.debug("Envelope creation cancelled, removing envelope", JSON.stringify({
                Employee_Name: userName,
                ID: userId,
                envelopeId: datain.envelopeId,
            }));
        }
        if (srch !== null) {
            srch.run().each(function (result) {
                record.delete({
                    type: result.recordType.toString(),
                    id: result.id,
                });
                return true;
            });
        }
        return "ok";
    };
    exports.delete = dsDelete;
    var dsPost = function (datain) {
        log.debug("dsPost called", { action: datain.action });
        if (datain.action === "telemetry") {
            logTelemetry(datain.telemetryAction, datain.envelopeId, datain.telemetryType, datain.dsCustomBtnId);
        }
        return "dsPost called";
    };
    exports.post = dsPost;
    var dsPut = function (datain) {
        return "dsPut called";
    };
    exports.put = dsPut;
    /**
     * @description Capture the telemetry from the action.
     * @param datain
     */
    var logTelemetry = function (action, envelopeId, type, customButtonId) {
        var currentUser = dc.getCurrentDocuSignUser();
        var dataPoints = {
            Action: action,
            AccountId: dc.getDSUserCustomSettings().api_accountid,
            UserId: currentUser ? currentUser.userId : "",
            EnvelopeId: envelopeId,
            AppVersion: dc.INTEGRATION_VERSION,
        };
        if (customButtonId) {
            dataPoints.CustomButtonId = customButtonId;
        }
        var logData = {
            DataPoints: dataPoints,
        };
        apitelemetry.captureMetric(type || dsttelemetry.TelemetryType.Telemetry, logData);
    };
});
