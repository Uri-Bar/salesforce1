/**
 * @NApiVersion 2.1
 * @NAmdConfig ./JsLibraryConfig.json
 */
define(["require", "exports", "N/log", "N/ui/serverWidget", "N/search", "N/record", "N/file", "../ds_common", "./ds_record_setting", "../types/ns_types", "../types/ds_t_telemetry", "./ds_config_validation", "../api/ds_telemetry", "../utils/ds_benchmark"], function (require, exports, log, ui, search, record, file, dc, dsrcd, n, dsttelemetry, valid, apitelemetry, ds_benchmark_1) {
    Object.defineProperty(exports, "__esModule", { value: true });
    ("use strict");
    exports.buildCustomButtonCodeForm = function (form, params) {
        if (!params.selected_record)
            return null;
        valid.displayAccountSettingsNotifications(form, params);
        var record = dsrcd.getSelectedRecord(params.selected_record);
        form.title = "Adding Custom Button to " + record.name + " Record";
        var btnFieldGrp = form.addFieldGroup({
            id: "custpage_custom_btn_fldgrp",
            label: "Please choose name for your custom button and a javascript file to support it",
        });
        btnFieldGrp.isSingleColumn = true;
        var automationFolderId = getAutomationFolderId();
        var folderContents = dc.getFolderContents(automationFolderId);
        form.addButton({
            label: "Back to DocuSign Configuration",
            id: "custpage_back_to_config_home",
            functionName: "ds_openDSAcctConfigPage",
        });
        // checkbox indicating whether to show the form or not
        var enableCustomButton = form.addField({
            id: "custpage_btn_enable",
            label: "Show This Custom Button?",
            type: ui.FieldType.CHECKBOX,
            container: "custpage_custom_btn_fldgrp",
        });
        enableCustomButton.defaultValue = "T";
        // field for displaying the name
        var customButtonName = form.addField({
            id: "custpage_btn_name",
            label: "Name to appear on Custom Button",
            type: ui.FieldType.TEXT,
            container: "custpage_custom_btn_fldgrp",
        });
        var fileDropDown = form.addField({
            id: "custpage_selected_file",
            type: ui.FieldType.SELECT,
            label: "Please select your custom button javascript file",
            container: "custpage_custom_btn_fldgrp",
        });
        folderContents.forEach(function (file) {
            fileDropDown.addSelectOption({
                value: file.internalid.toString(),
                text: file.name,
            });
        });
        var recordType = form.addField({
            id: "custpage_record_type",
            type: ui.FieldType.TEXT,
            label: " ",
        });
        recordType.defaultValue = record.custrecord_ns_internal_id;
        recordType.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        var hiddenField = form.addField({
            id: "custpage_create_custom_code_btn",
            label: " ",
            type: ui.FieldType.CHECKBOX,
        });
        hiddenField.defaultValue = "T";
        hiddenField.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        var selected_record = form.addField({
            id: "custpage_selected_record",
            label: " ",
            type: ui.FieldType.TEXT,
        });
        selected_record.defaultValue = params.selected_record;
        selected_record.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        // if we have a btn_internalid then we can load the values for
        // this particular button so the user can edit this instance
        var btn = null;
        if (params.btn_internalid) {
            btn = dc.getSingleCustomButton(params.btn_internalid);
            if (btn != null) {
                form.title =
                    'You are editing an existing custom buttom named "' +
                        btn.name +
                        '" attached to the ' +
                        record.name +
                        " record";
                fileDropDown.defaultValue =
                    btn.custrecord_docusign_automation_script_id.toString();
                customButtonName.defaultValue = btn.name;
                // set the value of the custom button to the format the form object likes
                enableCustomButton.defaultValue =
                    btn.custrecord_docusign_custom_btn_enable ? "T" : "F";
                // add hidden field so we know which button we're working
                // on when we postback
                var button_id = form.addField({
                    id: "custpage_button_id",
                    label: " ",
                    type: ui.FieldType.TEXT,
                });
                button_id.defaultValue = params.btn_internalid;
                button_id.updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN,
                });
                // add hidden field that tells the page we're editing a record
                // and not creating a new one
                var isEditing = form.addField({
                    id: "custpage_edit_button",
                    label: " ",
                    type: ui.FieldType.CHECKBOX,
                });
                isEditing.defaultValue = "T";
                isEditing.updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN,
                });
                form.addButton({
                    label: "Delete This Custom Button",
                    functionName: "removeCustomButton(" +
                        params.btn_internalid +
                        ", " +
                        params.selected_record +
                        ")",
                    id: "custpage_delete_custom_button",
                });
                form.addSubmitButton({
                    label: "Save Custom Button",
                });
            }
        }
        else {
            form.addSubmitButton({
                label: "Create Custom Button",
            });
        }
        return {
            pageObject: form,
        };
    };
    exports.processCustomButtonByCodeForm = function (params) {
        log.debug("processCustomButtonCodeForm", params);
        var benchmarkResults = ds_benchmark_1.benchmark(function () {
            var response = {
                isNew: !!params.custpage_edit_button,
                recordType: params.custpage_record_type,
                showButton: params.custpage_btn_enable === "T",
                customButtonId: "",
                duration: 0,
                success: true,
            };
            var custBtnRec = null;
            var buttonValidation = valid.customButtonIsValid(params.custpage_record_type, params.custpage_btn_name, params.custpage_edit_button ? params.custpage_button_id : null);
            if (!buttonValidation.success) {
                response.success = false;
                response.responseMessage = buttonValidation.message;
                response.selectedRecord = params.custpage_selected_record;
                return response;
            }
            if (params.custpage_edit_button) {
                custBtnRec = record.load({
                    id: params.custpage_button_id,
                    type: "customrecord_docusign_custom_button",
                    isDynamic: true,
                });
            }
            else {
                custBtnRec = record.create({
                    type: "customrecord_docusign_custom_button",
                    isDynamic: true,
                });
            }
            if (custBtnRec !== null) {
                custBtnRec.setValue({
                    fieldId: "name",
                    value: params.custpage_btn_name,
                });
                // set the enabled value on the record
                custBtnRec.setValue({
                    fieldId: "custrecord_docusign_custom_btn_enable",
                    value: response.showButton,
                });
                custBtnRec.setValue({
                    fieldId: "custrecord_ds_custom_btn_record_type",
                    value: response.recordType,
                });
                var _file = file.load({
                    id: params.custpage_selected_file,
                });
                custBtnRec.setValue({
                    fieldId: "custrecord_docusign_autoscript_folder_id",
                    value: _file.folder,
                });
                custBtnRec.setValue({
                    fieldId: "custrecord_docusign_automation_script_id",
                    value: params.custpage_selected_file,
                });
                try {
                    response.customButtonId = custBtnRec.save();
                    response.responseMessage = n.saveSuccess;
                    response.selectedRecord = params.custpage_selected_record;
                }
                catch (error) {
                    log.error("processCustomButtonForm", error.message + " " + error.stack);
                    response.responseMessage = n.saveFailure;
                    response.success = false;
                }
                return response;
            }
        });
        var resp = benchmarkResults.returnValue;
        logSaveCustomButton(resp.isNew, resp.recordType, resp.showButton, resp.customButtonId, benchmarkResults.duration, resp.success);
        var result = {
            save_response: resp.responseMessage,
        };
        if (!resp.success) {
            result.createcustombuttoncode = true;
            result.selected_record = resp.selectedRecord;
        }
        return result;
    };
    var logSaveCustomButton = function (isCreating, recordType, showButton, customButtonId, duration, success) {
        var user = dc.getCurrentDocuSignUser();
        var counters = [];
        var action = isCreating
            ? dsttelemetry.TelemetryConfigurationEvents.CustomButtonCreate
            : dsttelemetry.TelemetryConfigurationEvents.CustomButtonUpdate;
        var features = {
            CustomButtonWithScript: 1,
            ShowCustomButton: showButton ? 1 : 0,
            CustomButtonWithForm: 0,
            DefaultBody: 0,
            DefaultSubject: 0,
            LoadRecordAttachments: 0,
            LoadRecordContacts: 0,
            NumAdditionalDocuments: 0,
            NumAdditionalRecipients: 0,
            UseMergeFields: 0,
            UseTemplate: 0,
            VoidDate: 0,
        };
        counters.push(apitelemetry.getRequestTimeCounter(action, duration, success));
        apitelemetry.captureMetric(dsttelemetry.TelemetryType.Configuration, {
            DataPoints: {
                AccountId: dc.getDSUserCustomSettings().api_accountid,
                UserId: user ? user.userId : "",
                AppVersion: dc.INTEGRATION_VERSION,
                Action: action,
                CustomButtonId: customButtonId,
                RecordType: recordType,
                ElapsedTime: duration,
                Success: success,
            },
            FeatureUsage: features,
        }, counters);
    };
    var getAutomationFolderId = function () {
        var internalid = null;
        var folderSearchObj = search.create({
            type: "folder",
            filters: [["name", "is", "Custom Button Scripts"]],
            columns: ["internalid"],
        });
        folderSearchObj.run().each(function (result) {
            internalid = Number(result.id);
            return true;
        });
        return internalid;
    };
});
