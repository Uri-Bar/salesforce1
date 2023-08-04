/**
 * @NApiVersion 2.1
 * @NAmdConfig ./JsLibraryConfig.json
 */
define(["require", "exports", "N/log", "N/ui/serverWidget", "N/search", "N/record", "N/https", "N/file", "../ds_common", "../ds_api", "./ds_record_setting", "../types/ns_types", "../types/ds_t_telemetry", "./ds_config_validation", "../api/ds_telemetry", "../utils/ds_benchmark"], function (require, exports, log, ui, search, record, https, file, dc, api, dsrcd, n, dsttelemetry, valid, apitelemetry, ds_benchmark_1) {
    Object.defineProperty(exports, "__esModule", { value: true });
    ("use strict");
    exports.buildCustomButtonForm = function (form, params) {
        if (!params.selected_record)
            return null;
        valid.displayAccountSettingsNotifications(form, params);
        var record = dsrcd.getSelectedRecord(params.selected_record);
        form.title = "Adding Custom Button to " + record.name + " Record";
        form.addButton({
            label: "Back to DocuSign Configuration",
            id: "custpage_back_to_config_home",
            functionName: "ds_openDSAcctConfigPage",
        });
        form.addField({
            id: "custpage_new_file",
            label: "Add a Document (you can add more after saving)",
            type: ui.FieldType.FILE,
        });
        form.addFieldGroup({
            id: "custpage_custom_btn_fldgrp",
            label: "DocuSign Custom Button Configuration",
        });
        // field for displaying the name
        var customButtonName = form.addField({
            id: "custpage_btn_name",
            label: "Name to appear on Custom Button",
            type: ui.FieldType.TEXT,
            container: "custpage_custom_btn_fldgrp",
        });
        // field for displaying email subject
        var emailSubject = form.addField({
            id: "custpage_btn_email_subject",
            label: "Email Subject",
            type: ui.FieldType.TEXT,
            container: "custpage_custom_btn_fldgrp",
        });
        emailSubject.updateDisplaySize({
            height: 1,
            width: 100,
        });
        // field for displaying email subject
        var emailMessage = form.addField({
            id: "custpage_btn_email_message",
            label: "Email Message",
            type: ui.FieldType.TEXTAREA,
            container: "custpage_custom_btn_fldgrp",
        });
        emailMessage.updateDisplaySize({
            height: 5,
            width: 100,
        });
        // checkbox indicating whether to show the button or not
        var enableCustomButton = form.addField({
            id: "custpage_btn_enable",
            label: "Show This Custom Button?",
            type: ui.FieldType.CHECKBOX,
            container: "custpage_custom_btn_fldgrp",
        });
        enableCustomButton.updateBreakType({
            breakType: ui.FieldBreakType.STARTCOL,
        });
        enableCustomButton.defaultValue = "T";
        form.addField({
            id: "custpage_use_ns_attachments",
            label: "Load Record Attachments",
            type: ui.FieldType.CHECKBOX,
            container: "custpage_custom_btn_fldgrp",
        });
        form.addField({
            id: "custpage_use_ns_contacts",
            label: "Load Record Contacts",
            type: ui.FieldType.CHECKBOX,
            container: "custpage_custom_btn_fldgrp",
        });
        form.addField({
            id: "custpage_env_void_date",
            label: "Envelope Void Date",
            type: ui.FieldType.DATE,
            container: "custpage_custom_btn_fldgrp",
        });
        var attributes = dc.getExistingCustomButtonAttributeValues(params.btn_internalid);
        createRecipientSublist(form);
        createFilesSublist(form);
        createMergeFieldSublist(form, record, attributes);
        // need to add a list of files attached to this custom button
        var btn = exports.buildEditForm(customButtonName, enableCustomButton, record, params, form, attributes);
        addHiddenContextFields(record, btn, form);
        return {
            pageObject: form,
        };
    };
    exports.buildEditForm = function (customButtonName, enableCustomButton, record, params, form, attributes) {
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
                buildEditFormAttributes(attributes, params.btn_internalid, form);
                loadRecipientSublist(params.btn_internalid, form);
                loadMergeFieldSublist(params.btn_internalid, form);
                return btn;
            }
        }
        else {
            form.addSubmitButton({
                label: "Create Custom Button",
            });
        }
        return null;
    };
    var buildEditFormAttributes = function (attributes, buttonInternalId, form) {
        attributes.forEach(function (a) {
            if (a && a.value) {
                var attrField = form.getField({ id: a.columnName });
                attrField.defaultValue = a.value;
            }
        });
        // we do the attached files separately b/c netsuite handles them totally different
        var sl = form.getSublist({ id: "custpage_file_sublist" });
        var ctr = 0;
        attributes.forEach(function (attr) {
            if (attr.type === n.custom_button_type_name.document &&
                attr.documentFileId) {
                var _file = file.load(attr.documentFileId);
                if (!file)
                    throw Error("File not found on button id: " + buttonInternalId);
                var fileId = _file.id.toString();
                sl.setSublistValue({
                    id: "file_internalid",
                    line: ctr,
                    value: fileId,
                });
                var name_1 = _file.name;
                sl.setSublistValue({
                    id: "file_name",
                    line: ctr,
                    value: name_1,
                });
                ctr++;
            }
        });
    };
    exports.processCustomButtonByFormForm = function (context) {
        var params = context.request.parameters;
        var benchmarkResults = ds_benchmark_1.benchmark(function () {
            var response = {
                success: true,
                buttonInternalId: null,
            };
            var buttonValidation = valid.customButtonIsValid(params.custpage_record_type, params.custpage_btn_name, params.custpage_edit_button ? params.custpage_button_id : null);
            if (!buttonValidation.success) {
                response.responseMessage = buttonValidation.message;
                response.selectedRecord = params.custpage_selected_record;
                response.success = false;
            }
            var custBtnRec = null;
            // at this point we have a collection of form data
            // just need to edit or update the result
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
            if (custBtnRec) {
                response.buttonInternalId = exports.updateOrCreateCustomButton(custBtnRec, context);
                try {
                    updateOrCreateCustomButtonAttributes(response.buttonInternalId, context);
                    custBtnRec.save();
                    response.responseMessage = n.saveSuccess;
                    response.selectedRecord = params.custpage_selected_record;
                }
                catch (error) {
                    log.error("processCustomButtonFormForm error", error.message + " " + error.stack);
                    response.responseMessage = error.toString();
                    response.success = false;
                }
            }
            return response;
        });
        logSaveCustomButton(context, params, benchmarkResults.returnValue.buttonInternalId, params.custpage_record_type, benchmarkResults.duration, benchmarkResults.returnValue.success);
        return {
            save_response: n.saveSuccess,
            selected_record: benchmarkResults.returnValue.selectedRecord,
            createcustombuttonform: true,
            btn_internalid: benchmarkResults.returnValue.buttonInternalId,
        };
    };
    exports.updateOrCreateCustomButton = function (button, context) {
        var params = context.request.parameters;
        // base custom button fields we need to create/update
        // 1. Record Type custrecord_ds_custom_btn_record_type
        // 2. DocuSign Automation Script Folder ID custrecord_docusign_autoscript_folder_id
        // 3. DocuSidn Automation Script ID custrecord_docusign_automation_script_id
        // 4. Enable? custrecord_docusign_custom_btn_enable
        button.setValue({
            fieldId: "name",
            value: params.custpage_btn_name,
        });
        // the value for custpage_record_type comes from hidden field
        // on form from which these values were posted
        if (params.custpage_record_type)
            button.setValue({
                fieldId: "custrecord_ds_custom_btn_record_type",
                value: params.custpage_record_type,
            });
        // netsuite won't let us do this inline, I don't understand why
        var enableBool = params.custpage_btn_enable === "T" ? true : false;
        // set the enabled value on the record
        button.setValue({
            fieldId: "custrecord_docusign_custom_btn_enable",
            value: enableBool,
        });
        try {
            return button.save();
        }
        catch (error) {
            log.error("processCustomButtonFormForm", error.message + " " + error.stack);
        }
    };
    var updateOrCreateCustomButtonAttributes = function (buttonInternalId, context) {
        var params = context.request.parameters;
        var buttonTypes = getButtonTypes();
        var attributes = dc.getExistingCustomButtonAttributeValues(buttonInternalId.toString());
        /**
         * List of attribute records we need to create/update
         * 1. Button base record (customrecord_docusign_custom_button)
         * 2. List of attributes. We only save/edit if they exist from the form
         *   - customrecord_docusign_custom_button_attr
         *    a. email subject
         *    b. email message
         *    c. choose a template
         *    d. load record attachments
         *    e. load record contacts
         *    f. envelope void date
         *    g. attached document (there can be more than one)
         *    h. recipient list
         *
         * Build a method for each standard field and a method that will handle the
         * fields which can have multiple values
         */
        for (var type in n.customBtnFields) {
            var paramToGet = n.customBtnFields[type];
            // look for the value in the request object
            var fieldValue = params[paramToGet];
            if (fieldValue || type === "document") {
                addOrUpdateAttribute(buttonTypes, attributes, fieldValue, type, buttonInternalId, context);
            }
            else if (type !== "document") {
                removeAttributeIfExists(attributes, type);
            }
        }
        addOrUpdateRecipientSublist(buttonInternalId, context);
        updateFileSublist(context);
        addOrUpdateMergeFieldSublist(buttonInternalId, context);
    };
    var addOrUpdateAttribute = function (buttonTypes, attributes, value, type, buttonInternalId, context) {
        // check the map to see if we have the attribute
        var convertedValue = convertToDataType(n.custom_button_type_name[type], value);
        // documents are handled differently in netsuite post events, the
        // files object is on it's own, see below
        if (n.custom_button_type_name[type] !== n.custom_button_type_name.document) {
            // does this attribute already exist
            var attribute = attributes.find(function (x) { return x.type === type; });
            if (attribute) {
                // we don't even have to load the record, we can just send it a
                // set of values to be updated
                record.submitFields({
                    id: attribute.internalid,
                    type: "customrecord_docusign_custom_button_attr",
                    values: {
                        custrecord_ds_btn_value: convertedValue,
                    },
                });
            }
            else {
                // if we don't then we need to create it
                var attrRecord = createBtnAttributeRecord(buttonTypes, type, buttonInternalId);
                attrRecord.setValue({
                    fieldId: "custrecord_ds_btn_value",
                    value: convertedValue,
                });
                attrRecord.save();
            }
        }
        else if (n.custom_button_type_name[type] === n.custom_button_type_name.document) {
            // extract the file from the request object
            var _file = context.request.files["custpage_new_file"];
            if (!_file) {
                log.audit("No files uploaded", "custpage_new_file was empty");
                return;
            }
            log.audit("File submitted", JSON.stringify(_file));
            var fileExtension = _file.name
                .substr(_file.name.lastIndexOf(".") + 1)
                .toLowerCase();
            // check the file extension against the list of supported types to make
            // sure we can use it.
            var url = api.dsapi_getBaseUrl(true) + "/unsupported_file_types";
            var serverResponse = https.get({
                url: url,
                headers: api._getHeaders(true),
            });
            var fileTypes = JSON.parse(serverResponse.body).fileTypes;
            if (fileTypes.map(function (type) { return type.fileExtension; }).includes(fileExtension))
                throw Error("Uploaded files type " + fileExtension + " is not a supported file type");
            /** we need to save the document to the file cabinet and then
             * specify the file id on this record */
            var folderId = dc.getFolderId("Custom Button Template Files");
            _file.folder = folderId;
            var fileId = _file.save();
            var attrRecord = createBtnAttributeRecord(buttonTypes, type, buttonInternalId);
            attrRecord.setValue({
                fieldId: "custrecord_ds_attr_document",
                value: fileId,
            });
            attrRecord.save();
        }
    };
    var removeAttributeIfExists = function (attributes, type) {
        var attr = attributes.find(function (x) { return x.type === type; });
        if (attr && attr.internalid) {
            record.delete({
                id: attr.internalid,
                type: "customrecord_docusign_custom_button_attr",
            });
        }
    };
    var convertToDataType = function (type, value) {
        switch (type) {
            case n.custom_button_type_name.emailaddress:
            case n.custom_button_type_name.emailbody:
            case n.custom_button_type_name.emailsubject:
            case n.custom_button_type_name.searchbroad:
            case n.custom_button_type_name.searchexact:
            case n.custom_button_type_name.searchphrase:
            case n.custom_button_type_name.template:
                return value;
            case n.custom_button_type_name.envelopevoiddate:
                // convert the value to the ns date format
                // edit: this seems to work without conversion
                return value;
            case n.custom_button_type_name.loadrecordattachments:
            case n.custom_button_type_name.loadrecordcontacts:
            case n.custom_button_type_name.usedatamerge:
                // convert the 'T' or 'F' to a boolean, yes this is annoying
                return value === "T" ? true : false;
            case n.custom_button_type_name.document:
                // we need to take the document payload and attach it to
                // this custom button record attribute
                return value;
            default:
                break;
        }
    };
    var getButtonTypes = function () {
        var results = [];
        var srch = search.create({
            type: "customrecord_docusign_btn_attr_type",
            filters: [],
            columns: [
                search.createColumn({
                    name: "name",
                    sort: search.Sort.ASC,
                }),
                "custrecord_ds_btn_scrpt_name",
            ],
        });
        srch.run().each(function (result) {
            var type = n.custom_button_type_name[result
                .getValue({
                name: "custrecord_ds_btn_scrpt_name",
            })
                .toString()
                .toLowerCase()];
            var name = result
                .getValue({
                name: "name",
            })
                .toString();
            results.push({
                id: result.id,
                scriptid: type,
                name: name,
            });
            return true;
        });
        return results;
    };
    var loadMergeFieldSublist = function (buttonInternalId, form) {
        var mrgFields = dc.getMergeFieldSublistRecords(buttonInternalId);
        log.debug("mrgFields", JSON.stringify(mrgFields));
        var sl = form.getSublist({
            id: "custpage_merge_field_sublist",
        });
        mrgFields.forEach(function (x, idx) {
            sl.setSublistValue({
                id: "id",
                line: idx,
                value: x.id,
            });
            sl.setSublistValue({
                id: "button_id",
                line: idx,
                value: x.button_id,
            });
            sl.setSublistValue({
                id: "record_id",
                line: idx,
                value: x.record_id,
            });
            sl.setSublistValue({
                id: "template_id",
                line: idx,
                value: x.template_id,
            });
            sl.setSublistValue({
                id: "recipient_role",
                line: idx,
                value: x.recipient_role,
            });
            sl.setSublistValue({
                id: "recipient_id",
                line: idx,
                value: x.recipient_id,
            });
            sl.setSublistValue({
                id: "tab_id",
                line: idx,
                value: x.tab_id,
            });
            sl.setSublistValue({
                id: "tab_type",
                line: idx,
                value: x.tab_type,
            });
            sl.setSublistValue({
                id: "tab_label",
                line: idx,
                value: x.tab_label,
            });
            sl.setSublistValue({
                id: "ns_field",
                line: idx,
                value: !!x.ns_field ? x.ns_field : " ",
            });
        });
    };
    var loadRecipientSublist = function (buttonInternalId, form) {
        var recipients = dc.getRecipientSublistRecords(buttonInternalId);
        var sl = form.getSublist({
            id: "custpage_recipient_sublist",
        });
        recipients.forEach(function (r, idx) {
            sl.setSublistValue({
                id: "recipient_internalid",
                line: idx,
                value: r.id,
            });
            if (r.firstName) {
                sl.setSublistValue({
                    id: "recipient_list_first",
                    line: idx,
                    value: r.firstName,
                });
            }
            if (r.lastName) {
                sl.setSublistValue({
                    id: "recipient_list_last",
                    line: idx,
                    value: r.lastName,
                });
            }
            if (r.email) {
                sl.setSublistValue({
                    id: "recipient_list_email",
                    line: idx,
                    value: r.email,
                });
            }
        });
    };
    var createFilesSublist = function (form) {
        var fileSublist = form.addSublist({
            id: "custpage_file_sublist",
            label: "Attached Files",
            type: ui.SublistType.LIST,
        });
        var internalid = fileSublist.addField({
            id: "file_internalid",
            label: " ",
            type: ui.FieldType.INTEGER,
        });
        internalid.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        fileSublist.addField({
            id: "file_name",
            label: "File Name",
            type: ui.FieldType.TEXT,
        });
        fileSublist.addField({
            id: "file_remove",
            label: "Delete File",
            type: ui.FieldType.CHECKBOX,
        });
    };
    var createRecipientSublist = function (form) {
        var recipientSublist = form.addSublist({
            id: "custpage_recipient_sublist",
            label: "Additional Recipients",
            type: ui.SublistType.INLINEEDITOR,
        });
        var internalid = recipientSublist.addField({
            id: "recipient_internalid",
            label: " ",
            type: ui.FieldType.INTEGER,
        });
        internalid.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        var first = recipientSublist.addField({
            id: "recipient_list_first",
            label: "First Name",
            type: ui.FieldType.TEXT,
        });
        first.isMandatory = true;
        var last = recipientSublist.addField({
            id: "recipient_list_last",
            label: "Last Name",
            type: ui.FieldType.TEXT,
        });
        last.isMandatory = true;
        var email = recipientSublist.addField({
            id: "recipient_list_email",
            label: "Email Address",
            type: ui.FieldType.EMAIL,
        });
        email.isMandatory = true;
    };
    var updateFileSublist = function (context) {
        var fileIdsToDelete = [];
        var linesCount = context.request.getLineCount({
            group: "custpage_file_sublist",
        });
        for (var i = 0; i < linesCount; i++) {
            var internalid = context.request.getSublistValue({
                group: "custpage_file_sublist",
                line: i,
                name: "file_internalid",
            });
            var remove = context.request.getSublistValue({
                group: "custpage_file_sublist",
                line: i,
                name: "file_remove",
            });
            if (remove === "T")
                fileIdsToDelete.push(internalid);
        }
        for (var _i = 0, fileIdsToDelete_1 = fileIdsToDelete; _i < fileIdsToDelete_1.length; _i++) {
            var id = fileIdsToDelete_1[_i];
            file.delete({
                id: id,
            });
        }
    };
    var addOrUpdateRecipientSublist = function (buttonInternalId, context) {
        // we need to find the rows in this list that aren't in the list which
        // is posted back so we can mark then for deletion.
        var existingRecips = dc.getRecipientSublistRecords(buttonInternalId.toString());
        var toDelete = existingRecips.map(function (e) { return e.id; });
        var linesCount = context.request.getLineCount({
            group: "custpage_recipient_sublist",
        });
        for (var i = 0; i < linesCount; i++) {
            var internalid = context.request.getSublistValue({
                group: "custpage_recipient_sublist",
                line: i,
                name: "recipient_internalid",
            });
            var firstName = context.request.getSublistValue({
                group: "custpage_recipient_sublist",
                line: i,
                name: "recipient_list_first",
            });
            var lastName = context.request.getSublistValue({
                group: "custpage_recipient_sublist",
                line: i,
                name: "recipient_list_last",
            });
            var email = context.request.getSublistValue({
                group: "custpage_recipient_sublist",
                line: i,
                name: "recipient_list_email",
            });
            var _record = null;
            if (internalid) {
                var idx = toDelete.indexOf(internalid);
                if (idx !== -1)
                    toDelete.splice(idx, 1);
                _record = record.load({
                    id: internalid,
                    type: "customrecord_ds_custom_btn_recipient",
                    isDynamic: true,
                });
            }
            else {
                _record = record.create({
                    type: "customrecord_ds_custom_btn_recipient",
                });
            }
            if (_record) {
                _record.setValue({
                    fieldId: "custrecord_ds_custom_button_recip_parent",
                    value: buttonInternalId,
                });
                _record.setValue({
                    fieldId: "custrecord_ds_cust_btn_first_name",
                    value: firstName,
                });
                _record.setValue({
                    fieldId: "custrecord_ds_cust_btn_last_name",
                    value: lastName,
                });
                _record.setValue({
                    fieldId: "custrecord_ds_cust_btn_email",
                    value: email,
                });
                _record.save();
            }
        }
        toDelete.forEach(function (id) {
            record.delete({
                id: id,
                type: "customrecord_ds_custom_btn_recipient",
            });
        });
    };
    var createMergeFieldSublist = function (form, record, attributes) {
        createMergeFieldTab(form);
        var sublist = form.addSublist({
            id: "custpage_merge_field_sublist",
            label: "Data Merge Fields",
            type: ui.SublistType.INLINEEDITOR,
            tab: "custpage_mrg_fld_tab",
        });
        // this is the internalid of the customrecord_ds_merge_field
        var id = sublist.addField({
            id: "id",
            label: " ",
            type: ui.FieldType.TEXT,
        });
        id.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        var button_id = sublist.addField({
            id: "button_id",
            label: " ",
            type: ui.FieldType.TEXT,
        });
        button_id.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        var record_id = sublist.addField({
            id: "record_id",
            label: " ",
            type: ui.FieldType.TEXT,
        });
        record_id.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        var template_id = sublist.addField({
            id: "template_id",
            label: " ",
            type: ui.FieldType.TEXT,
        });
        template_id.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        var recipient_id = sublist.addField({
            id: "recipient_id",
            label: " ",
            type: ui.FieldType.TEXT,
        });
        recipient_id.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        var tab_id = sublist.addField({
            id: "tab_id",
            label: " ",
            type: ui.FieldType.TEXT,
        });
        tab_id.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        var tab_type = sublist.addField({
            id: "tab_type",
            label: " ",
            type: ui.FieldType.TEXT,
        });
        tab_type.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        var recipient_role = sublist.addField({
            id: "recipient_role",
            label: "Recipient Role",
            type: ui.FieldType.TEXT,
        });
        recipient_role.updateDisplayType({
            displayType: ui.FieldDisplayType.DISABLED,
        });
        var tabLabel = sublist.addField({
            id: "tab_label",
            label: "DocuSign Data Label",
            type: ui.FieldType.TEXT,
        });
        tabLabel.updateDisplayType({
            displayType: ui.FieldDisplayType.DISABLED,
        });
        var mf = sublist.addField({
            id: "ns_field",
            label: "NetSuite Field ID",
            type: ui.FieldType.SELECT,
        });
        populateMergeFieldDropDown(record, mf);
    };
    var addOrUpdateMergeFieldSublist = function (buttonInternalId, context) {
        // we need to find the rows in this list that aren't in the list which
        // is posted back so we can mark then for deletion.
        var existingMergeFields = dc.getMergeFieldSublistRecords(buttonInternalId.toString());
        var toDelete = existingMergeFields.map(function (e) { return e.id; });
        var linesCount = context.request.getLineCount({
            group: "custpage_merge_field_sublist",
        });
        for (var i = 0; i < linesCount; i++) {
            var id = context.request.getSublistValue({
                group: "custpage_merge_field_sublist",
                line: i,
                name: "id",
            });
            var button_id = context.request.getSublistValue({
                group: "custpage_merge_field_sublist",
                line: i,
                name: "button_id",
            });
            var record_id = context.request.getSublistValue({
                group: "custpage_merge_field_sublist",
                line: i,
                name: "record_id",
            });
            var template_id = context.request.getSublistValue({
                group: "custpage_merge_field_sublist",
                line: i,
                name: "template_id",
            });
            var recipient_id = context.request.getSublistValue({
                group: "custpage_merge_field_sublist",
                line: i,
                name: "recipient_id",
            });
            var recipient_role = context.request.getSublistValue({
                group: "custpage_merge_field_sublist",
                line: i,
                name: "recipient_role",
            });
            var tab_id = context.request.getSublistValue({
                group: "custpage_merge_field_sublist",
                line: i,
                name: "tab_id",
            });
            var tab_type = context.request.getSublistValue({
                group: "custpage_merge_field_sublist",
                line: i,
                name: "tab_type",
            });
            var tab_label = context.request.getSublistValue({
                group: "custpage_merge_field_sublist",
                line: i,
                name: "tab_label",
            });
            var merge_field = context.request.getSublistValue({
                group: "custpage_merge_field_sublist",
                line: i,
                name: "ns_field",
            });
            var _record = null;
            if (id) {
                var idx = toDelete.indexOf(id);
                if (idx !== -1)
                    toDelete.splice(idx, 1);
                _record = record.load({
                    id: id,
                    type: "customrecord_ds_merge_field",
                    isDynamic: true,
                });
            }
            else if (record_id &&
                template_id &&
                recipient_id &&
                tab_id &&
                tab_type &&
                tab_label &&
                recipient_role &&
                merge_field) {
                _record = record.create({
                    type: "customrecord_ds_merge_field",
                });
            }
            if (_record) {
                _record.setValue({
                    fieldId: "custrecord_ds_mrg_cust_btn",
                    value: buttonInternalId,
                });
                _record.setValue({
                    fieldId: "custrecord_ds_mrg_rcd_id",
                    value: record_id,
                });
                _record.setValue({
                    fieldId: "custrecord_ds_template_id",
                    value: template_id,
                });
                _record.setValue({
                    fieldId: "custrecord_ds_recipient_id",
                    value: recipient_id,
                });
                _record.setValue({
                    fieldId: "custrecord_ds_recipient_role",
                    value: recipient_role,
                });
                _record.setValue({
                    fieldId: "custrecord_ds_mrg_tab_id",
                    value: tab_id,
                });
                _record.setValue({
                    fieldId: "custrecord_ds_tab_type",
                    value: tab_type,
                });
                _record.setValue({
                    fieldId: "custrecord_ds_tab_label",
                    value: tab_label,
                });
                _record.setValue({
                    fieldId: "custrecord_ds_ns_fld",
                    value: merge_field,
                });
                _record.save();
            }
        }
        toDelete.forEach(function (id) {
            record.delete({
                id: id,
                type: "customrecord_ds_merge_field",
            });
        });
    };
    var addHiddenContextFields = function (record, btn, form) {
        var recordType = form.addField({
            id: "custpage_record_type",
            type: ui.FieldType.TEXT,
            label: " ",
        });
        recordType.defaultValue = record.custrecord_ns_internal_id;
        recordType.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        if (btn && btn.id) {
            var buttonInternalId = form.addField({
                id: "custpage_button_id",
                label: " ",
                type: ui.FieldType.TEXT,
            });
            buttonInternalId.defaultValue = btn.id;
            buttonInternalId.updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN,
            });
        }
        var hiddenField = form.addField({
            id: "custpage_create_custom_form_btn",
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
        selected_record.defaultValue = record.id.toString();
        selected_record.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
    };
    var createBtnAttributeRecord = function (types, type, buttonInternalId) {
        var attrRecord = record.create({
            type: "customrecord_docusign_custom_button_attr",
            isDynamic: true,
        });
        var buttonType = types.find(function (x) { return x.scriptid === type; });
        attrRecord.setValue({
            fieldId: "custrecord_ds_btn_type",
            value: buttonType.id,
        });
        attrRecord.setValue({
            fieldId: "custrecord_ds_custom_button",
            value: buttonInternalId,
        });
        return attrRecord;
    };
    /**
     * @description Gets a list of the fields on a record type
     * @param type the type of record for which you want the fields
     */
    exports.getFields = function (type) {
        var recId = null;
        var srch = search.create({
            type: type,
            filters: [["internalidnumber", "greaterthan", "0"]],
            columns: ["internalid"],
        });
        srch.run().each(function (result) {
            recId = result.id;
            return false;
        });
        if (!recId)
            return [];
        var rec = record.load({
            type: type,
            id: recId,
        });
        if (rec) {
            var recordFields_1 = [];
            var fields = rec.getFields();
            fields.forEach(function (f) {
                var fld = rec.getField({ fieldId: f });
                recordFields_1.push({
                    fieldId: f,
                    fieldLabel: fld && fld.label ? fld.label + " - " + f : f,
                });
            });
            return recordFields_1.sort(function (a, b) {
                if (a.fieldLabel.toLowerCase() < b.fieldLabel.toLowerCase())
                    return -1;
                if (a.fieldLabel.toLowerCase() > b.fieldLabel.toLowerCase())
                    return 1;
                return 0;
            });
        }
        return [];
    };
    var populateMergeFieldDropDown = function (record, mf) {
        var fields = exports.getFields(record.custrecord_ns_internal_id);
        mf.addSelectOption({
            text: " -- Please Select -- ",
            value: " ",
        });
        fields.forEach(function (f) {
            mf.addSelectOption({
                text: f.fieldLabel,
                value: f.fieldId,
            });
        });
    };
    var createMergeFieldTab = function (form) {
        form.addTab({
            id: "custpage_mrg_fld_tab",
            label: "Data Merge Settings (Optional)",
        });
        form.addFieldGroup({
            id: "custpage_template_fldgrp",
            label: "Merge Field Settings",
            tab: "custpage_mrg_fld_tab",
        });
        var template = form.addField({
            id: "custpage_template",
            label: "DocuSign Template",
            type: ui.FieldType.SELECT,
            container: "custpage_template_fldgrp",
        });
        form.addField({
            id: "custpage_use_data_merge",
            label: "Use Data Merging",
            type: ui.FieldType.CHECKBOX,
            container: "custpage_template_fldgrp",
        });
        var templates = api.getListOfTemplates();
        // add an empty slot so user an de-select
        template.addSelectOption({
            text: " -- Please select --",
            value: "",
        });
        if (templates && templates.envelopeTemplates) {
            templates.envelopeTemplates.forEach(function (t) {
                template.addSelectOption({
                    text: t.name,
                    value: t.templateId,
                });
            });
        }
    };
    var logSaveCustomButton = function (context, params, customButtonId, recordType, duration, success) {
        var currentUser = dc.getCurrentDocuSignUser();
        var counters = [];
        var action = params.custpage_edit_button
            ? dsttelemetry.TelemetryConfigurationEvents.CustomButtonUpdate
            : dsttelemetry.TelemetryConfigurationEvents.CustomButtonCreate;
        var dataPoints = {
            AccountId: dc.getDSUserCustomSettings().api_accountid,
            AppVersion: dc.INTEGRATION_VERSION,
            UserId: currentUser ? currentUser.userId : "",
            CustomButtonId: customButtonId.toString(),
            RecordType: recordType,
            Action: action,
            ElapsedTime: duration,
            Success: success,
        };
        // When no documents/recipients are present on create this number can be -1
        // This is handled below when setting the value in FeatureUsage.
        var numRecipients = context.request.getLineCount({
            group: "custpage_recipient_sublist",
        });
        var numDocuments = context.request.getLineCount({
            group: "custpage_file_sublist",
        });
        var formValues = dc.getCustomButtonFormValues(customButtonId.toString());
        var features = {
            ShowCustomButton: params.custpage_btn_enable === "T" ? 1 : 0,
            NumAdditionalDocuments: numDocuments < 0 ? 0 : 1,
            NumAdditionalRecipients: numRecipients < 0 ? 0 : 1,
            CustomButtonWithForm: 1,
            CustomButtonWithScript: 0,
            DefaultBody: !!formValues.emailbody ? 1 : 0,
            DefaultSubject: !!formValues.emailsubject ? 1 : 0,
            LoadRecordAttachments: formValues.loadrecordattachments ? 1 : 0,
            LoadRecordContacts: formValues.loadrecordcontacts ? 1 : 0,
            VoidDate: formValues.envelopeVoidDate ? 1 : 0,
            UseMergeFields: formValues.usedatamerge ? 1 : 0,
            UseTemplate: !!formValues.template ? 1 : 0,
        };
        counters.push(apitelemetry.getRequestTimeCounter(action, duration, success));
        apitelemetry.captureMetric(dsttelemetry.TelemetryType.Configuration, {
            DataPoints: dataPoints,
            FeatureUsage: features,
        }, counters);
    };
});
