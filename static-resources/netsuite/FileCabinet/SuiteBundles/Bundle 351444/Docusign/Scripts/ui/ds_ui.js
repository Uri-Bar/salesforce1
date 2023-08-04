/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NAmdConfig ./JsLibraryConfig.json
 */
define(["require", "exports", "N/record", "N/runtime", "N/log", "N/ui/serverWidget", "N/url", "../ds_common", "../ds_cache", "./ds_ui_please_configure", "./ds_ui_admin_btn"], function (require, exports, record, runtime, log, ui, url, dc, dsc, plzcongif, dsAdmin) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var API_SUITELET_SCRIPTID = "customscript_ds_api_sl";
    var API_SUITELET_DEPLOYMENTID = "customdeploy_ds_api_sl";
    /**
     * @desc Add the DocuSign UI elements to the Opportunity, Estimate and Customer object.
     *    Here is the list of DocuSign UI elements:
     *      - "Send with DocuSign" button
     *      - "Sign with DocuSign" button
     *      - DocuSign Custom Button(s)
     *      - "DocuSign" tab
     *      - "Update" button
     *      - DocuSign Envelope Status Record(Name, Status, Envelope Id, Date Created and Document)
     *      - "Open DocuSign Admin Console" button
     *      - "Open DocuSign Account Settings" button
     * @param  {nlobjRequest} type - the view mode(view, edit) of the Opportunity object
     * @param  {nlobjForm} form - the object object used to encapsulate a NetSuite-looking form
     * @return {nlobjForm} - the form including all DocuSign UI elements
     */
    exports.beforeLoad = function (context) {
        var type = context.type.toString();
        var form = context.form;
        var dsSubtab;
        var localizationJSON = "";
        try {
            var recordType = context.newRecord.type;
            var user = runtime.getCurrentUser();
            var isRecordTypeSupported = dc.isSupportedRecordType(recordType.toString());
            log.debug("addDocuSignUIElements()", "Role = " +
                user.role +
                ", role ID = " +
                user.roleId +
                ", user = " +
                user.name +
                ", context = " +
                runtime.executionContext +
                ", record type = " +
                recordType +
                ", supported record type = " +
                isRecordTypeSupported);
            if (runtime.executionContext.toString().toLowerCase() === "userinterface" &&
                type == "view" &&
                isRecordTypeSupported) {
                var language = "EN";
                localizationJSON = dc.getLocalizationJSON(language);
                // test to make sure the installation has an encryption key configured for storing
                // docusign credentials. If we don't have this then show the user a friendly error message
                if (!dc.isOneTimeConfigured()) {
                    plzcongif.showPleaseConfigureTab(form, 'DocuSign configuration needed by administrator - "One Time Configuration" not complete', localizationJSON);
                    return;
                }
                if (dc.isDSAccountChanged()) {
                    plzcongif.showPleaseConfigureTab(form, "Your NetSuite Administrator has configured NetSuite with a new DocuSign account. Please log out and log back in to access the updated DocuSign account information.", localizationJSON);
                    return;
                }
                //Check if SOBO account is setup
                if (dc.isSOBOAcctSetup()) {
                    var currentRecord = context.newRecord;
                    var loadingImage = dc.getFileUrl("ds_preloader.gif");
                    addDocuSignButtons(form, localizationJSON, currentRecord, loadingImage);
                    dsSubtab = addDocuSignSubtab(form, localizationJSON);
                    if (dsSubtab) {
                        var dsSublist = addDocuSignSublist(form, localizationJSON);
                        if (dsSublist) {
                            addEnvelopesToSublist(dsSublist, localizationJSON, currentRecord, loadingImage);
                            addAdministratorButtons(dsSublist, localizationJSON);
                        }
                    }
                }
                else {
                    //Check if user is NetSuite Admin
                    if (user.role === 3) {
                        //add "Configure DocuSign" Button
                        form.addButton({
                            id: "custpage_button_docusign_setup",
                            label: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsConfigure"),
                            functionName: "ds_openDSAcctConfigPage",
                        });
                    }
                }
                // set the script on the client side
                form.clientScriptModulePath = "./ds_ui_cs.js";
            }
        }
        catch (e) {
            log.error(e.name, { message: e.message, stack: e.stack });
            addErrorMessage(e, !!dsSubtab, localizationJSON, form);
        }
    };
    var addDocuSignButtons = function (form, localizationJSON, currentRecord, loadingImage) {
        try {
            var recordType = (currentRecord.type || "").toString();
            // use the cache to get account settings
            var acct_sett_cache = dsc.dsCache(runtime.getCurrentUser().id).get({
                key: dsc.createKey({
                    method: "getAccountSettingRecord",
                    soboAcct: false,
                    dsUserEmail: runtime.getCurrentUser().email,
                }),
                loader: dc.getAcctSettingsCache,
                ttl: 600,
            });
            var dsRecordSettings = dc.getRecordSettings(recordType);
            if (dsRecordSettings) {
                //add "Send with DocuSign" button
                if (dsRecordSettings.getValue("custrecord_send_with_docusign") &&
                    dsRecordSettings.getValue("custrecord_send_with_docusign") == true) {
                    form.addButton({
                        id: "custpage_button_docusign_send",
                        label: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsSend"),
                        functionName: "docusign_process('send', false)",
                    });
                }
                //add "Sign with DocuSign" button
                if (dsRecordSettings.getValue("custrecord_sign_with_docusign") &&
                    dsRecordSettings.getValue("custrecord_sign_with_docusign") == true) {
                    form.addButton({
                        id: "custpage_button_docusign_sign",
                        label: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsSign"),
                        functionName: "docusign_process('sign', false)",
                    });
                }
            }
            if (recordType && recordType !== "") {
                var dsCustomBtnSrch = dc.getDSCustomButtons(recordType.toString());
                dsCustomBtnSrch.run().each(function (result) {
                    if (result.getValue("custrecord_docusign_custom_btn_enable") === true) {
                        var btnValues = dc.getCustomButtonFormValues(result.id);
                        // Use merge fields if they've selected a template & enabled it.
                        var useMergeFields = btnValues.usedatamerge && btnValues.template ? true : false;
                        // add DocuSign Custom Button
                        form.addButton({
                            id: "custpage_button_docusign_custom_" + result.id,
                            label: result.getValue("name").toString(),
                            functionName: "docusign_process('automate', " + useMergeFields + ", '" + result.id + "')",
                        });
                    }
                    return true;
                });
            }
        }
        catch (err) {
            /*
              On some customer accounts, after approving a Sales Order the Docusign components
              error when being added to the form.  As of now (2020-09-18) we are unsure
              what causes this and have been unable to reproduce the error on multiple NS Accounts.
              For now, logging the full error message in hopes we can determine the cause but allowing the remainder
              of the page to load.
            */
            log.error("ds_ui.beforeLoad: Error Creating DocuSign Buttons", err);
        }
    };
    var addDocuSignSubtab = function (form, localizationJSON) {
        try {
            //Add "DocuSign" tab
            var subtab = form.addTab({
                id: "custpage_docusign_tab",
                label: dc.getLocalizationText(localizationJSON, dc.DS_HEADER, "docusign"),
            });
            //add jquery and jquery block ui scripts
            var scriptFiles = form.addField({
                id: "custpage_field_jquery_files",
                type: ui.FieldType.INLINEHTML,
                container: "custpage_docusign_tab",
                label: " ",
            });
            var blockUIHtml = "<script type=\"text/javascript\" src=\"https://cdnjs.cloudflare.com/ajax/libs/jquery.blockUI/2.66.0-2013.10.09/jquery.blockUI.min.js\"></script>";
            scriptFiles.defaultValue = blockUIHtml;
            return subtab;
        }
        catch (err) {
            log.error("ds_ui.beforeLoad: Error Creating DocuSign Subtab", err);
        }
        return null;
    };
    var addDocuSignSublist = function (form, localizationJSON) {
        try {
            //Add "DocuSign Envelope Status Record" sublist to "DocuSign Envelope Status" sub-tab
            var docStatusSublist = form.addSublist({
                id: "custpage_docusign_envelope_sublist",
                type: ui.SublistType.STATICLIST,
                label: "DocuSign Envelope Status",
                tab: "custpage_docusign_tab",
            });
            docStatusSublist.addField({
                id: "custpage_docusign_envelope_name",
                type: ui.FieldType.TEXT,
                label: dc.getLocalizationText(localizationJSON, dc.DS_ENVELOPE_STATUS, "name"),
            });
            docStatusSublist.addField({
                id: "custpage_docusign_envelope_status",
                type: ui.FieldType.TEXT,
                label: dc.getLocalizationText(localizationJSON, dc.DS_ENVELOPE_STATUS, "status"),
            });
            docStatusSublist.addField({
                id: "custpage_docusign_envelope_id",
                type: ui.FieldType.TEXT,
                label: dc.getLocalizationText(localizationJSON, dc.DS_ENVELOPE_STATUS, "envelopeId"),
            });
            docStatusSublist.addField({
                id: "custpage_docusign_envelope_data_created",
                type: ui.FieldType.TEXT,
                label: dc.getLocalizationText(localizationJSON, dc.DS_ENVELOPE_STATUS, "dateCreated"),
            });
            docStatusSublist.addField({
                id: "custpage_docusign_envelope_doc_location",
                type: ui.FieldType.TEXT,
                label: dc.getLocalizationText(localizationJSON, dc.DS_ENVELOPE_STATUS, "document"),
            });
            return docStatusSublist;
        }
        catch (err) {
            /*
              On some customer accounts, after approving a Sales Order the Docusign components
              error when being added to the form.  As of now (2020-09-18) we are unsure
              what causes this and have been unable to reproduce the error on multiple NS Accounts.
              For now, logging the full error message in hopes we can determine the cause but allowing the remainder
              of the page to load.
            */
            log.error("ds_ui.beforeLoad: Error Creating DocuSign Envelope Status Sublist", err);
        }
    };
    var addEnvelopesToSublist = function (docStatusSublist, localizationJSON, currentRecord, loadingImage) {
        if (!docStatusSublist)
            return;
        try {
            var creds = dc.getDSUserCustomSettings();
            //Search all the DocuSign Envelope Records and add to "DocuSign Envelope Status Record" sublist
            var srch = dc.getDSEnvelopeStatusList(dc.getDSEnvironmentName(), creds.accountid.toString(), currentRecord.type.toString(), currentRecord.id.toString());
            var user_1 = runtime.getCurrentUser();
            var numResults = srch.runPaged().count;
            var numOfEnvelopeOwnedByUser_1 = 0;
            log.debug("related docs found", numResults);
            if (numResults > 0) {
                var dsUpdateBtn = docStatusSublist.addButton({
                    id: "custpage_docusign_update_status",
                    label: dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsUpdate"),
                    functionName: "docusign_update('" + loadingImage + "')",
                });
                var sublistLineNumber_1 = 0;
                var _url_1 = url.resolveScript({
                    scriptId: API_SUITELET_SCRIPTID,
                    deploymentId: API_SUITELET_DEPLOYMENTID,
                    params: {
                        action: "viewenvelope",
                    },
                });
                srch.run().each(function (result) {
                    var dsEnvelopeStatus = record.load({
                        id: Number(result.id),
                        type: "customrecord_docusign_envelope_status",
                        isDynamic: true,
                    });
                    var envelopeid = dsEnvelopeStatus
                        .getValue("custrecord_docusign_status_envelope_id")
                        .toString();
                    docStatusSublist.setSublistValue({
                        id: "custpage_docusign_envelope_name",
                        line: sublistLineNumber_1,
                        value: dsEnvelopeStatus.getValue("name").toString(),
                    });
                    docStatusSublist.setSublistValue({
                        id: "custpage_docusign_envelope_status",
                        line: sublistLineNumber_1,
                        value: dsEnvelopeStatus
                            .getValue("custrecord_docusign_status")
                            .toString(),
                    });
                    docStatusSublist.setSublistValue({
                        id: "custpage_docusign_envelope_id",
                        line: sublistLineNumber_1,
                        value: envelopeid,
                    });
                    docStatusSublist.setSublistValue({
                        id: "custpage_docusign_envelope_data_created",
                        line: sublistLineNumber_1,
                        value: dsEnvelopeStatus
                            .getValue("custrecord_docusign_status_date_created")
                            .toString(),
                    });
                    var recordOwner = dsEnvelopeStatus.getValue("owner");
                    //Check user is the owner of the DocuSign Envelope Record
                    if (recordOwner == user_1.id) {
                        //Add the "View Doc" link if user is the owner of the DocuSign Envelope Record
                        docStatusSublist.setSublistValue({
                            id: "custpage_docusign_envelope_doc_location",
                            line: sublistLineNumber_1,
                            value: '<a target="_blank" href=' +
                                _url_1 +
                                "&envelopeid=" +
                                envelopeid +
                                ">View Doc</a>",
                        });
                        numOfEnvelopeOwnedByUser_1++;
                    }
                    sublistLineNumber_1++; // increment the sublist line counter
                    return true;
                });
                //Check if user owns any of the envelope
                if (numOfEnvelopeOwnedByUser_1 <= 0) {
                    //Disable the "Update" button if user doesn't own any envelope
                    dsUpdateBtn.isDisabled = true;
                }
            }
        }
        catch (err) {
            log.error("ds_ui.beforeLoad: Error Adding Envelopes to Envelope Status Sublist", err);
        }
    };
    var addAdministratorButtons = function (dsSublist, localizationJSON) {
        if (!dsSublist)
            return;
        try {
            var openAdminLabel = dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsOpenDSAdminConsole");
            dsAdmin.addAdministratorButtons(runtime.getCurrentUser(), dsSublist, openAdminLabel, localizationJSON);
        }
        catch (err) {
            log.error("ds_ui.beforeLoad: Error Adding DS Administrator buttons", err);
        }
    };
    var addErrorMessage = function (error, subTabAdded, localizationJSON, form) {
        try {
            if (!subTabAdded) {
                var label = localizationJSON
                    ? dc.getLocalizationText(localizationJSON, dc.DS_HEADER, "docusign")
                    : "DocuSign";
                form.addTab({
                    id: "custpage_docusign_tab",
                    label: label,
                });
            }
            form.addField({
                id: "custpage_docusign_error_label",
                type: ui.FieldType.LABEL,
                label: error.message,
                container: "custpage_docusign_tab",
            });
        }
        catch (e) {
            log.error("Add Error Message Failed", {
                message: error.message,
                stack: error.stack,
            });
        }
    };
});
