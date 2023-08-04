/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
define(["require", "exports", "N/currentRecord", "N/ui/message", "N/record", "N/log", "N/https", "N/search", "N/ui/message", "N/ui/dialog", "../types/ns_types", "../ds_common_cs"], function (require, exports, currentRec, message, record, log, https, search, msg, dialog, n, dcc) {
    var _this = this;
    Object.defineProperty(exports, "__esModule", { value: true });
    var headers = [];
    headers["Content-Type"] = "application/json";
    headers["Accept"] = "application/json";
    headers["User-Agent-x"] = "SuiteScript Call";
    var recipients = {};
    exports.saveRecord = function (context) {
        /* Validate before we submit the form. */
        var cr = currentRec.get();
        var _msg = msg.create({
            type: msg.Type.INFORMATION,
            duration: 30000,
            message: "please wait",
            title: "Saving",
        });
        _msg.show({
            duration: 30000,
        });
        //NOTE: This method applies for every config Suitelet screen, the validation is only valid for Custom Button pages.
        if (isCustomButtonPage()) {
            var buttonId = String(cr.getValue("custpage_button_id")) || null;
            var recordType = cr.getValue("custpage_record_type").toString();
            var buttonName = cr.getValue("custpage_btn_name").toString();
            var cbError = getCustomButtonValidationErrorMessage(recordType, buttonName, buttonId);
            if (cbError) {
                alert(cbError.toString());
                return false;
            }
        }
        return true;
    };
    exports.pageInit = function (context) {
        var config_acct_response = context.currentRecord.getValue("custpage_config_acct_response");
        var save_record_response = context.currentRecord.getValue("custpage_save_record_response");
        var cr = currentRec.get();
        if (save_record_response) {
            var type = message.Type.CONFIRMATION;
            if (save_record_response !== n.saveSuccess)
                type = message.Type.ERROR;
            var myMsg = message.create({
                title: "DocuSign Account",
                message: save_record_response.toString(),
                type: type,
            });
            // show the message for 15 seconds
            myMsg.show({ duration: 15000 });
        }
        if (config_acct_response) {
            var type = message.Type.CONFIRMATION;
            if (config_acct_response !== n.acctConfigSuccess)
                type = message.Type.ERROR;
            var myMsg = message.create({
                title: "Configure DocuSign Account",
                message: config_acct_response.toString(),
                type: type,
            });
            // show the message for 30 seconds
            myMsg.show({ duration: 30000 });
        }
    };
    exports.fieldChanged = function (context) {
        var field = context.fieldId;
        var cr = currentRec.get();
        switch (field) {
            case "custpage_selected_record_type":
                var _url = dcc.getNetSuiteUrl(n.urlEndpoint.configuration_suitelet);
                var selected_record = cr.getValue("custpage_selected_record_type");
                // this supresses the 'Are you sure you want to leave this site?' message
                window.onbeforeunload = null;
                window.open(_url + "&selected_record=" + selected_record, "_self", "false");
                break;
            case "custpage_btn_name":
                var buttonId = String(cr.getValue("custpage_button_id")) || null;
                var recordType = cr.getValue("custpage_record_type").toString();
                var buttonName = cr.getValue("custpage_btn_name").toString();
                var error = getCustomButtonValidationErrorMessage(recordType, buttonName, buttonId);
                if (error) {
                    var errorMessage = message.create({
                        title: "DocuSign Account",
                        message: error.toString(),
                        type: message.Type.ERROR,
                    });
                    // show the message for 5 seconds
                    errorMessage.show({ duration: 5000 });
                }
                break;
            case "custpage_template":
                loadMergeFields(cr);
                break;
            default:
                break;
        }
    };
    var loadMergeFields = function (cr) {
        var template = cr.getValue("custpage_template");
        if (template) {
            var _url = dcc.getNetSuiteUrl(n.urlEndpoint.restlet) + "\n      &method=getTemplateRecipients&action=mergeFieldRequest&templateId=" + template;
            https.get
                .promise({
                url: _url,
                headers: headers,
            })
                .then(function (response) {
                var templateRecipients = JSON.parse(response.body);
                if (templateRecipients && templateRecipients.signers) {
                    var result = getAllRecipients(template.toString(), templateRecipients);
                    loadTabLabels(cr, result);
                }
            })
                .catch(function (error) {
                log.error("loadRecipientDropDown parse error", error);
            });
        }
    };
    var getAllRecipients = function (template, templateRecipients) { return __awaiter(_this, void 0, void 0, function () {
        var allPromises;
        return __generator(this, function (_a) {
            allPromises = [];
            templateRecipients.signers.forEach(function (s) {
                // map the recipientid to the rolename so we can use it later
                recipients[s.recipientId] = s.roleName;
                var _url = dcc.getNetSuiteUrl(n.urlEndpoint.restlet) + "&action=mergeFieldRequest&method=getTemplateMergeFields&templateId=" + template + "&recipientId=" + s.recipientId;
                allPromises.push(https.get.promise({
                    url: _url,
                    headers: headers,
                }));
            });
            return [2 /*return*/, Promise.all(allPromises)];
        });
    }); };
    var loadTabLabels = function (cr, promises) {
        var template = cr.getValue("custpage_template");
        var buttonId = cr.getValue("custpage_button_id") || " "; // On create this is null, we need it to be an empty space in the sublist to prevent errors
        var record_id = cr.getValue("custpage_selected_record"); // this needs a double check
        if (template) {
            clearSublist(cr);
            var idx_1 = 0;
            promises
                .then(function (responses) {
                responses.forEach(function (x) {
                    var tabs = JSON.parse(x.body);
                    tabs.forEach(function (r) {
                        cr.insertLine({
                            sublistId: "custpage_merge_field_sublist",
                            line: idx_1,
                            ignoreRecalc: true,
                        });
                        cr.setCurrentSublistValue({
                            sublistId: "custpage_merge_field_sublist",
                            fieldId: "button_id",
                            value: buttonId,
                        });
                        cr.setCurrentSublistValue({
                            sublistId: "custpage_merge_field_sublist",
                            fieldId: "record_id",
                            value: record_id,
                        });
                        cr.setCurrentSublistValue({
                            sublistId: "custpage_merge_field_sublist",
                            fieldId: "template_id",
                            value: template,
                        });
                        cr.setCurrentSublistValue({
                            sublistId: "custpage_merge_field_sublist",
                            fieldId: "recipient_id",
                            value: r.recipientId,
                        });
                        cr.setCurrentSublistValue({
                            sublistId: "custpage_merge_field_sublist",
                            fieldId: "recipient_role",
                            value: recipients[r.recipientId],
                        });
                        cr.setCurrentSublistValue({
                            sublistId: "custpage_merge_field_sublist",
                            fieldId: "tab_id",
                            value: r.tabId,
                        });
                        cr.setCurrentSublistValue({
                            sublistId: "custpage_merge_field_sublist",
                            fieldId: "tab_type",
                            value: r.tabType,
                        });
                        cr.setCurrentSublistValue({
                            sublistId: "custpage_merge_field_sublist",
                            fieldId: "tab_label",
                            value: r.tabLabel,
                        });
                        cr.setCurrentSublistValue({
                            sublistId: "custpage_merge_field_sublist",
                            fieldId: "ns_field",
                            value: " ",
                        });
                        cr.commitLine({
                            sublistId: "custpage_merge_field_sublist",
                        });
                        idx_1++;
                    });
                });
            })
                .catch(function (error) {
                log.error("loadTabLabels call error", error.stack);
            });
        }
    };
    exports.configureDocuSignAccount = function () {
        var _url = dcc.getNetSuiteUrl(n.urlEndpoint.configuration_suitelet);
        window.onbeforeunload = null;
        window.open(_url + "&configacct=true", "_self", "false");
        return true;
    };
    exports.ds_openDSAcctConfigPage = function (selected_record, urlParameter) {
        if (urlParameter === void 0) { urlParameter = ""; }
        var _url = dcc.getNetSuiteUrl(n.urlEndpoint.configuration_suitelet);
        if (urlParameter.length > 0)
            _url += urlParameter;
        if (selected_record)
            _url += "&selected_record=" + selected_record;
        window.open(_url, "_self", "false");
    };
    exports.showCustomButtonPage = function (type) {
        var selected_record = currentRec
            .get()
            .getValue("custpage_selected_record_type");
        var _url = dcc.getNetSuiteUrl(n.urlEndpoint.configuration_suitelet);
        window.onbeforeunload = null;
        window.open(_url +
            "&createcustombutton" +
            type +
            "=true&selected_record=" +
            selected_record, "_self", "false");
        return true;
    };
    exports.removeCustomButton = function (buttonId, selected_record) {
        jQuery.blockUI({
            message: "",
            css: {
                border: "none",
                backgroundColor: "transparent",
                color: "gray",
                opacity: 0.7,
            },
        });
        dialog
            .confirm({
            title: "Delete this button?",
            message: "Are you sure?",
        })
            .then(function (result) {
            if (!result)
                return;
            exports.removeCustomButtonExec(buttonId);
            exports.ds_openDSAcctConfigPage(selected_record, "&save_response=Button Deleted");
        })
            .catch(function (e) {
            log.error({
                title: e.message,
                details: e.stack,
            });
        })
            .finally(function () {
            jQuery.unblockUI({ fadeOut: 0 });
        });
    };
    exports.removeCustomButtonExec = function (buttonId) {
        var dRecs = [];
        // need to check if the button has dependencies and remove those first
        // look for these types:
        // 1. customrecord_docusign_custom_button_attr
        // 2. customrecord_ds_custom_btn_recipient
        dRecs.push.apply(dRecs, findDependantRecs(buttonId, "customrecord_docusign_custom_button_attr", "custrecord_ds_custom_button.internalidnumber"));
        dRecs.push.apply(dRecs, findDependantRecs(buttonId, "customrecord_ds_custom_btn_recipient", "custrecord_ds_custom_button_recip_parent.internalidnumber"));
        dRecs.push.apply(dRecs, findDependantRecs(buttonId, "customrecord_ds_merge_field", "custrecord_ds_mrg_cust_btn.internalidnumber"));
        var promises = [];
        dRecs.forEach(function (r) {
            promises.push(record.delete
                .promise({
                id: r.id,
                type: r.type,
            })
                .then(function (value) {
                // console.log(`Deleted record: ${value}`);
            })
                .catch(function (e) {
                console.log("Error deleting record: " + e);
                log.error("error deleting record", e.stack);
            })
                .finally(function () {
                /* not sure what to do here */
            }));
        });
        Promise.all(promises)
            .then(function (value) {
            record.delete({
                id: buttonId,
                type: "customrecord_docusign_custom_button",
            });
        })
            .catch(function (e) {
            console.log("Error deleting button: " + e);
            log.error("error deleting record", e.stack);
        });
    };
    var findDependantRecs = function (buttonId, type, filterType) {
        var dRecs = [];
        var srch = search.create({
            type: type,
            filters: [[filterType, "equalto", buttonId]],
            columns: ["internalid"],
        });
        srch.run().each(function (result) {
            dRecs.push({
                id: result.id,
                type: type,
            });
            return true;
        });
        return dRecs;
    };
    var getCustomButtonValidationErrorMessage = function (recordType, buttonName, buttonId) {
        var _url = dcc.getNetSuiteUrl(n.urlEndpoint.restlet) + "&action=validatecustombutton&recordType=" + recordType + "&dsCustomBtnName=" + buttonName + "&dsCustomBtnId=" + buttonId;
        var error = "";
        if (recordType) {
            var response = https.request({
                method: https.Method.GET,
                url: _url,
                headers: headers,
            });
            error = response.body;
        }
        return error.toString();
    };
    var isCustomButtonPage = function () {
        return window.location
            .toString()
            .toLowerCase()
            .includes("createcustombutton");
    };
    var clearSublist = function (cr) {
        while (cr.getLineCount("custpage_merge_field_sublist") || 0 > 0) {
            cr.removeLine({
                line: 0,
                sublistId: "custpage_merge_field_sublist",
            });
        }
    };
});
