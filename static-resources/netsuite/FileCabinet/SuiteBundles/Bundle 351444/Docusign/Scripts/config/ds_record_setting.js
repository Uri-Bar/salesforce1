/**
 * @NApiVersion 2.1
 * @NAmdConfig ./JsLibraryConfig.json
 */
define(["require", "exports", "N/record", "N/ui/serverWidget", "N/search", "N/url", "../ds_cache", "../ds_common", "../types/ns_types", "../types/ds_t_telemetry", "../api/ds_telemetry", "../utils/ds_benchmark"], function (require, exports, record, ui, search, url, dsc, dc, n, dsttelemetry, apitelemetry, ds_benchmark_1) {
    Object.defineProperty(exports, "__esModule", { value: true });
    ("use strict");
    /**
     * @description Adds form object for changing
     *  customrecord_docusign_record_settings values
     * @param selected_record the internalid of the record type
     * @param form the form object that will draw the screen
     */
    exports.buildRecordForm = function (selected_record, form) {
        var record = exports.getSelectedRecord(selected_record);
        form.addButton({
            label: "Add Custom Button with Form",
            id: "custpage_add_custom_button_form",
            functionName: "showCustomButtonPage(" + '"form"' + ")",
        });
        form.addButton({
            label: "Add Custom Button with Code",
            id: "custpage_add_custom_button_code",
            functionName: "showCustomButtonPage(" + '"code"' + ")",
        });
        form.addFieldGroup({
            id: "custpage_record_settings_group",
            label: "Record Settings",
        });
        var name_field = form.addField({
            id: "custpage_name",
            label: "Name",
            type: ui.FieldType.TEXT,
            container: "custpage_record_settings_group",
        });
        name_field.defaultValue = record.name;
        var record_internalid = form.addField({
            id: "custrecord_ns_internal_id",
            label: "Record Internal ID",
            type: ui.FieldType.TEXT,
            container: "custpage_record_settings_group",
        });
        record_internalid.defaultValue = record.custrecord_ns_internal_id;
        form.addFieldGroup({
            id: "custpage_button_settings_group",
            label: "Button Settings",
        });
        var send_field = form.addField({
            id: "custpage_send_with_docusign",
            label: "Send with DocuSign",
            type: ui.FieldType.CHECKBOX,
            container: "custpage_button_settings_group",
        });
        send_field.defaultValue = record.custrecord_send_with_docusign ? "T" : "F";
        var sign_field = form.addField({
            id: "custpage_sign_with_docusign",
            label: "Sign with DocuSign",
            type: ui.FieldType.CHECKBOX,
            container: "custpage_button_settings_group",
        });
        sign_field.defaultValue = record.custrecord_sign_with_docusign ? "T" : "F";
        form.addFieldGroup({
            id: "custpage_contact_settings_group",
            label: "DocuSign Envelope Recipient Settings",
        });
        var primary_contact_field = form.addField({
            id: "custpage_primary_contact_only",
            label: "Only Add Primary Contact to the DocuSign Envelope",
            type: ui.FieldType.CHECKBOX,
            container: "custpage_contact_settings_group",
        });
        primary_contact_field.defaultValue = record.custrecord_primary_contact_only
            ? "T"
            : "F";
        form.addFieldGroup({
            id: "custpage_email_settings_group",
            label: "DocuSign Envelope Email Settings",
        });
        var email_subject_field = form.addField({
            id: "custpage_default_email_subject",
            label: "Default Email Subject",
            type: ui.FieldType.TEXT,
            container: "custpage_email_settings_group",
        });
        email_subject_field.defaultValue = record.custrecord_default_email_subject;
        var email_message_field = form.addField({
            id: "custpage_default_email_message",
            label: "Default Email Message",
            type: ui.FieldType.TEXTAREA,
            container: "custpage_email_settings_group",
        });
        email_message_field.defaultValue = record.custrecord_default_email_message;
        // hidden fields for context
        var docusign_record_settings_id = form.addField({
            id: "custpage_docusign_record_settings_id",
            label: " ",
            type: ui.FieldType.INTEGER,
        });
        docusign_record_settings_id.defaultValue = record.id.toString();
        docusign_record_settings_id.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        form = buildCustomButtonSublist(form, record);
        return form;
    };
    /**
     * @description Returns the current vales of an instance of
     * customrecord_docusign_record_settings
     * @param selected_record the internalid of the record type
     */
    exports.getSelectedRecord = function (selected_record) {
        // declare a return value
        var setting = null;
        // create the search to execute against the ns db
        var srch = search.create({
            type: "customrecord_docusign_record_settings",
            filters: [["internalidnumber", "equalto", selected_record]],
            columns: [
                "name",
                "custrecord_ns_internal_id",
                "custrecord_send_with_docusign",
                "custrecord_sign_with_docusign",
                "custrecord_primary_contact_only",
                "custrecord_docusign_use_attached_file",
                "custrecord_default_email_subject",
                "custrecord_default_email_message",
            ],
        });
        // run the search and iterate the results
        srch.run().each(function (result) {
            // pull the desired values from this search result instance
            var id = result.id;
            var name = result.getValue("name").toString();
            var custrecord_ns_internal_id = result
                .getValue("custrecord_ns_internal_id")
                .toString();
            var custrecord_send_with_docusign = Boolean(result.getValue("custrecord_send_with_docusign"));
            var custrecord_sign_with_docusign = Boolean(result.getValue("custrecord_sign_with_docusign"));
            var custrecord_primary_contact_only = Boolean(result.getValue("custrecord_primary_contact_only"));
            var custrecord_docusign_use_attached_file = Boolean(result.getValue("custrecord_docusign_use_attached_file"));
            var custrecord_default_email_subject = result
                .getValue("custrecord_default_email_subject")
                .toString();
            var custrecord_default_email_message = result
                .getValue("custrecord_default_email_message")
                .toString();
            setting = {
                id: Number(id),
                name: name,
                custrecord_ns_internal_id: custrecord_ns_internal_id,
                custrecord_send_with_docusign: custrecord_send_with_docusign,
                custrecord_sign_with_docusign: custrecord_sign_with_docusign,
                custrecord_primary_contact_only: custrecord_primary_contact_only,
                custrecord_docusign_use_attached_file: custrecord_docusign_use_attached_file,
                custrecord_default_email_subject: custrecord_default_email_subject,
                custrecord_default_email_message: custrecord_default_email_message,
            };
            // we return false here in order to stop iteration after the first result
            return false;
        });
        return setting;
    };
    var buildCustomButtonSublist = function (form, record) {
        // get the url for the back button
        var _url = url.resolveScript({
            scriptId: "customscript_ds_config_sl",
            deploymentId: "customdeploy_ds_config_sl",
        });
        // create the sublist object and give it a description
        var btnSublist = form.addSublist({
            id: "custpage_custom_btn_sublist",
            label: "Existing Custom Buttons on " + record.name + " record",
            type: ui.SublistType.LIST,
        });
        // retrieve the custom buttons for this record type
        var buttons = dc.getDSCustomButtons(record.custrecord_ns_internal_id);
        // add an EDIT column to the sublist
        var editLink = btnSublist.addField({
            id: "custpage_sl_btn_link",
            label: "Edit",
            type: ui.FieldType.TEXT,
        });
        // add a Custom Button name column to the sublist
        btnSublist.addField({
            id: "custpage_sl_btn_name",
            label: "Custom Button Text",
            type: ui.FieldType.TEXT,
        });
        // add a field to show if the button is enabled
        var enabled = btnSublist.addField({
            id: "custpage_sl_btn_enabled",
            label: "Enabled?",
            type: ui.FieldType.CHECKBOX,
        });
        enabled.updateDisplayType({
            displayType: ui.FieldDisplayType.DISABLED,
        });
        // add a column to hold the name of the javascript file
        btnSublist.addField({
            id: "custpage_sl_script_name",
            label: "JavaScript File",
            type: ui.FieldType.TEXT,
        });
        // add a column to show which folder the javascript file is in
        btnSublist.addField({
            id: "custpage_sl_script_folder",
            label: "Folder",
            type: ui.FieldType.TEXT,
        });
        // line numbers for a sublist start at zero and we track them manually
        var line = 0;
        // iterate the list of buttons for this record type and add each to the form
        buttons.run().each(function (btn) {
            var fileId = btn.getValue({
                name: "custrecord_docusign_automation_script_id",
            });
            var thisButton = null;
            var buttonType = "createcustombuttonform";
            if (fileId) {
                // pull info about the button as effeciently as possible
                thisButton = search.lookupFields({
                    columns: ["name", "folder"],
                    id: fileId,
                    type: "file",
                });
                buttonType = "createcustombuttoncode";
            }
            var href = _url +
                "&btn_internalid=" +
                btn.id +
                "&" +
                buttonType +
                "=true&selected_record=" +
                record.id;
            // populate the EDIT link url
            btnSublist.setSublistValue({
                id: "custpage_sl_btn_link",
                line: line,
                value: '<a class="dottedlink" href="' + href + '">EDIT</a>',
            });
            // show the name of the custom button as it's shown on the record
            btnSublist.setSublistValue({
                id: "custpage_sl_btn_name",
                line: line,
                value: btn.getValue({ name: "name" }).toString(),
            });
            // retrieve the value and put it in the sublist display format
            var enableVal = btn
                .getValue({
                name: "custrecord_docusign_custom_btn_enable",
            })
                .toString() === "true"
                ? "T"
                : "F";
            // set the value on the form
            btnSublist.setSublistValue({
                id: "custpage_sl_btn_enabled",
                line: line,
                value: enableVal,
            });
            var btnName = "Form Buttom";
            var btnFolder = "N/A";
            if (thisButton) {
                btnName = thisButton.name || " ";
                if (thisButton.folder && thisButton.folder.length > 0) {
                    btnFolder = thisButton.folder[0].text;
                }
                else {
                    btnFolder = " ";
                }
            }
            // show the name of javascript file for the custom button
            btnSublist.setSublistValue({
                id: "custpage_sl_script_name",
                line: line,
                value: btnName,
            });
            // show the name of the folder in which the javascript file is located
            btnSublist.setSublistValue({
                id: "custpage_sl_script_folder",
                line: line,
                value: btnFolder,
            });
            // bump the link counter up one
            line++;
            return true;
        });
        return form;
    };
    exports.processDocusignRecordSettings = function (params) {
        if (!params.custpage_docusign_record_settings_id)
            return;
        var benchmarkResult = ds_benchmark_1.benchmark(function () {
            var success = true;
            // pull a reference to the record fro the ns database
            var cfg_rec = record.load({
                id: params.custpage_docusign_record_settings_id,
                type: "customrecord_docusign_record_settings",
                isDynamic: true,
            });
            var recordSettings = getRecordSettings(params);
            cfg_rec.setValue({
                fieldId: "name",
                value: recordSettings.name,
            });
            cfg_rec.setValue({
                fieldId: "custrecord_ns_internal_id",
                value: recordSettings.recordType,
            });
            cfg_rec.setValue({
                fieldId: "custrecord_send_with_docusign",
                value: recordSettings.showSendButton,
            });
            cfg_rec.setValue({
                fieldId: "custrecord_sign_with_docusign",
                value: recordSettings.showSignButton,
            });
            cfg_rec.setValue({
                fieldId: "custrecord_primary_contact_only",
                value: recordSettings.primaryContactOnly,
            });
            cfg_rec.setValue({
                fieldId: "custrecord_docusign_use_attached_file",
                value: recordSettings.useAttachedFile,
            });
            cfg_rec.setValue({
                fieldId: "custrecord_default_email_subject",
                value: recordSettings.defaultSubject,
            });
            cfg_rec.setValue({
                fieldId: "custrecord_default_email_message",
                value: recordSettings.defaultBody,
            });
            cfg_rec.setValue({
                fieldId: "custrecord_docusign_postback_file_format",
                value: recordSettings.postbackFileFormat,
            });
            try {
                dsc.clearAll();
                cfg_rec.save();
            }
            catch (e) {
                success = false;
            }
            return {
                recordSettings: recordSettings,
                success: success,
            };
        });
        logSaveRecordSettings(benchmarkResult.returnValue.recordSettings, benchmarkResult.duration, benchmarkResult.returnValue.success);
        var saveResponse = benchmarkResult.returnValue.success
            ? n.saveSuccess
            : n.saveFailure;
        return {
            save_response: saveResponse,
        };
    };
    var logSaveRecordSettings = function (recordSettings, duration, success) {
        var counters = [];
        var features = {
            DefaultBody: recordSettings.defaultBody ? 1 : 0,
            DefaultSubject: recordSettings.defaultSubject ? 1 : 0,
            PrimaryContactOnly: recordSettings.primaryContactOnly ? 1 : 0,
            ShowSendButton: recordSettings.showSendButton ? 1 : 0,
            ShowSignButton: recordSettings.showSignButton ? 1 : 0,
            UseAttachedFiles: recordSettings.useAttachedFile ? 1 : 0,
        };
        var user = dc.getCurrentDocuSignUser();
        counters.push(apitelemetry.getRequestTimeCounter(dsttelemetry.TelemetryConfigurationEvents.UpdateRecordSettings, duration, success));
        apitelemetry.captureMetric(dsttelemetry.TelemetryType.Configuration, {
            DataPoints: {
                AccountId: dc.getDSUserCustomSettings().api_accountid,
                UserId: user ? user.userId : "",
                AppVersion: dc.INTEGRATION_VERSION,
                Action: dsttelemetry.TelemetryConfigurationEvents.UpdateRecordSettings,
                RecordType: recordSettings.recordType,
                ElapsedTime: duration,
                Success: success,
            },
            FeatureUsage: features,
        }, counters);
    };
    var getRecordSettings = function (params) {
        return {
            name: params.custpage_name,
            recordType: params.custrecord_ns_internal_id,
            showSendButton: params.custpage_send_with_docusign === "T",
            showSignButton: params.custpage_sign_with_docusign === "T",
            primaryContactOnly: params.custpage_primary_contact_only === "T",
            useAttachedFile: params.custpage_docusign_use_attached_file === "T",
            defaultSubject: params.custpage_default_email_subject,
            defaultBody: params.custpage_default_email_message,
            postbackFileFormat: params.custpage_postback_file_format,
        };
    };
});
