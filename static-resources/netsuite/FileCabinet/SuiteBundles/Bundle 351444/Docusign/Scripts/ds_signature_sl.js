/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NAmdConfig ./lib/JsLibraryConfig.json
 */
define(["require", "exports", "N/log", "N/ui/serverWidget", "N/redirect", "N/https", "./ds_common", "./types/ns_types", "./api/ds_envelope"], function (require, exports, log, ui, rd, nshttps, dc, n, env) {
    Object.defineProperty(exports, "__esModule", { value: true });
    ("use strict");
    var convertParameters = function (req) {
        return {
            action: req.parameters.action.toLowerCase(),
            recordId: req.parameters.recordId,
            recordType: req.parameters.recordType,
            dsCustomBtnId: req.parameters.dsCustomBtnId,
            domain: req.parameters.domain,
            mergeFields: req.parameters.mergeFields == "true",
        };
    };
    /**
     * @desc Suitelet to handle data merge contact mapping
     *    NetSuite Script Type: Suitelet
     * @param context
     */
    exports.onRequest = function (context) {
        log.debug("params", context.request.parameters);
        if (context.request.method === nshttps.Method.GET) {
            var params = convertParameters(context.request);
            var form = getForm();
            try {
                if (!!params.mergeFields) {
                    getMergeFieldsForm(context, form);
                }
                else {
                    addHiddenFields(form, params);
                }
            }
            catch (e) {
                log.error("Send Envelope Error", e);
                var errorMessage = e.message ||
                    "There was an error sending your document to DocuSign.  Please try again.";
                createErrorMessage(errorMessage, form);
            }
            context.response.writePage(form);
        }
        else {
            try {
                postRequest(context);
            }
            catch (e) {
                context.response.write("<h1>Error - " + e.name + "</h1> " + e.toString());
                return;
            }
        }
    };
    var renderDataMergeSublist = function (form, mrgFldRecips) {
        var sl = form.addSublist({
            id: "custpage_mrg_sl",
            label: "Please match DocuSign Role to NetSuite Recipient",
            type: ui.SublistType.LIST,
        });
        var ds_name = sl.addField({
            id: "custpage_ds_role",
            label: "DocuSign Role",
            type: ui.FieldType.TEXT,
        });
        ds_name.updateDisplayType({
            displayType: ui.FieldDisplayType.DISABLED,
        });
        var ds_id = sl.addField({
            id: "custpage_ds_id",
            label: " ",
            type: ui.FieldType.TEXT,
        });
        ds_id.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        var ns_select = sl.addField({
            id: "custpage_ns_recipient",
            label: "NetSuite Recipient",
            type: ui.FieldType.SELECT,
        });
        populateNsRecipSelect(mrgFldRecips, ns_select);
        mrgFldRecips.template.forEach(function (r, idx) {
            log.debug("ds recipient", JSON.stringify(r));
            sl.setSublistValue({
                id: "custpage_ds_role",
                line: idx,
                value: r.role,
            });
            sl.setSublistValue({
                id: "custpage_ds_id",
                line: idx,
                value: !!r.id ? r.id.toString() : " ",
            });
        });
    };
    var populateNsRecipSelect = function (mrgFldRecipients, fld) {
        fld.addSelectOption({
            text: " -- Please Select -- ",
            value: " ",
        });
        mrgFldRecipients.netsuite.forEach(function (t) {
            log.debug("opts", JSON.stringify(t));
            fld.addSelectOption({
                text: t.name + " " + t.email,
                value: t.email,
            });
        });
    };
    var getForm = function () {
        var form = ui.createForm({
            title: " ",
            hideNavBar: true,
        });
        form.clientScriptModulePath = "./ds_signature_sl_cs.js";
        //add jquery and jquery block ui scripts
        var scriptFiles = form.addField({
            id: "custpage_mrg_field_jquery_files",
            type: ui.FieldType.INLINEHTML,
            label: " ",
        });
        var blockUIHtml = "<script type=\"text/javascript\" src=\"https://cdnjs.cloudflare.com/ajax/libs/jquery.blockUI/2.66.0-2013.10.09/jquery.blockUI.min.js\"></script>";
        scriptFiles.defaultValue = blockUIHtml;
        return form;
    };
    var getMergeFieldsForm = function (context, form) {
        var params = context.request.parameters;
        form.title = "Contact Recipient Mapping";
        addHiddenFields(form, params);
        /* todo: what should I return if the input parameters aren't valid? */
        var mrgFldRecips = null;
        var recordType = params.recordType;
        var recordId = params.recordId;
        var dsCustomBtnId = params.dsCustomBtnId;
        mrgFldRecips = getMrgFldRecips(recordType, recordId, dsCustomBtnId);
        if (mrgFldRecips)
            renderDataMergeSublist(form, mrgFldRecips);
        var numRecips = mrgFldRecips && mrgFldRecips.netsuite ? mrgFldRecips.netsuite.length : 0;
        var numRecipField = form.addField({
            id: "custpage_num_recips",
            label: " ",
            type: ui.FieldType.TEXT,
        });
        numRecipField.defaultValue = numRecips.toString();
        numRecipField.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        form.addSubmitButton({
            label: "Submit to DocuSign",
        });
        return form;
    };
    var postRequest = function (context) {
        var mrgFldRecips = null;
        var nsContacts = {};
        var dsCustomBtnId = context.request.parameters.custpage_dscustombtnid;
        var recordType = context.request.parameters.custpage_recordtype;
        var recordId = context.request.parameters.custpage_recordid;
        if (dsCustomBtnId) {
            mrgFldRecips = getMrgFldRecips(recordType, recordId, dsCustomBtnId);
            mrgFldRecips.netsuite.forEach(function (r) {
                nsContacts[r.email] = r.name;
            });
        }
        var linesCount = context.request.getLineCount({
            group: "custpage_mrg_sl",
        });
        var contactMap = [];
        for (var i = 0; i < linesCount; i++) {
            var role = context.request.getSublistValue({
                group: "custpage_mrg_sl",
                line: i,
                name: "custpage_ds_role",
            });
            var email = context.request.getSublistValue({
                group: "custpage_mrg_sl",
                line: i,
                name: "custpage_ns_recipient",
            });
            contactMap.push({
                role: role,
                email: email,
                name: nsContacts[email],
            });
        }
        var p = context.request.parameters;
        var dsContext = {
            action: p.custpage_action,
            recordId: p.custpage_recordid,
            recordType: p.custpage_recordtype,
            domain: p.custpage_domain,
        };
        if (p.custpage_dscustombtnid)
            dsContext.dsCustomBtnId = p.custpage_dscustombtnid;
        if (contactMap.length > 0)
            dsContext.contactMap = contactMap;
        var response = dc.automate(dsContext);
        rd.redirect({
            url: response.viewUrl,
        });
    };
    var addHiddenFields = function (form, params) {
        addHiddenField(form, "custpage_action", params.action);
        addHiddenField(form, "custpage_recordid", params.recordId);
        addHiddenField(form, "custpage_recordtype", params.recordType);
        addHiddenField(form, "custpage_dscustombtnid", params.dsCustomBtnId);
        addHiddenField(form, "custpage_domain", params.domain);
        addHiddenField(form, "custpage_merge_fields", params.mergeFields.toString());
    };
    var getMrgFldRecips = function (recordType, recordId, dsCustomBtnId) {
        if (recordType && recordId && dsCustomBtnId) {
            var btns = dc.getExistingCustomButtonAttributeValues(dsCustomBtnId);
            var btn = btns.find(function (x) { return x.type === n.custom_button_type_name.template; });
            if (btn) {
                return env.getMergeFieldRecipients(recordType, recordId, btn.value, dsCustomBtnId);
            }
        }
        return null;
    };
    var createErrorMessage = function (error, form) {
        var maxErrorLength = 300;
        addHiddenField(form, "docusign_send_env_error", dc.getTruncatedString(error, maxErrorLength));
    };
    var addHiddenField = function (form, id, value) {
        var hiddenField = form.addField({
            id: id,
            label: " ",
            type: ui.FieldType.TEXT,
        });
        hiddenField.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
        hiddenField.defaultValue = value;
    };
});
