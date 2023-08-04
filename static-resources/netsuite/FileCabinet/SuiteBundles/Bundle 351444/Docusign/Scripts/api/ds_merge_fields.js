/**
 * @NApiVersion 2.1
 * This file includes the APIs required for supporting Merge Fields.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define(["require", "exports", "N/https", "N/log", "../types/ds_types", "./ds_api_common"], function (require, exports, https, log, dst, apicommon) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     *
     * @param envelopeId
     * @param recipientId
     * @param mergeFields
     */
    exports.setMergeFields = function (envelopeId, recipientId, mergeFields) {
        /* TODO Decide a valuable return type for this and update accordingly. */
        var tabs = exports.generateTabs(mergeFields);
        var url = apicommon.getBaseUrl(false) + "/envelopes/" + envelopeId + "/recipients/" + recipientId + "/tabs";
        var response = https.put({
            url: url,
            body: tabs,
            headers: apicommon.getHeaders(false),
        });
        if (response.code !== 200) {
            log.error("Unable to set Merge Fields for envelope: " + envelopeId + " and recipient: " + recipientId, { response: response.body, data: tabs });
            return;
        }
        try {
            var updatedTabs = JSON.parse(response.body);
            return updatedTabs;
        }
        catch (err) {
            log.error("Error parsing Updated Tabs", {
                error: err,
                response: response.body,
            });
            return null;
        }
    };
    /**
     * @description Validates that the Template has the same amount of recipients as the value being passed in.
     * @param templateId - The Template ID
     * @param recipients - The Recipients object populated with all recipients for the envelope.
     */
    exports.validateMergeFieldRecipients = function (templateRecipients, recipients) {
        var success = true;
        var message = "";
        var properties = Object.keys(templateRecipients);
        for (var i = 0; i < properties.length; i++) {
            var prop = properties[i];
            if (!templateRecipients[prop] && !recipients[prop])
                continue;
            var tempData = templateRecipients[prop] || [];
            var recipData = recipients[prop] || [];
            if (tempData.length > recipData.length) {
                success = false;
                message = "The template has more recipients (" + prop + ") than were provided.";
                break;
            }
            else if (recipData.length > tempData.length) {
                success = false;
                message = "The template has less recipients (" + prop + ") than were provided.";
                break;
            }
        }
        return {
            success: success,
            message: message,
        };
    };
    /**
     * @description Convert a collection of BaseRecipientTabs into a Tab object.
     * @param mergeFields - The BaseRecipientTabs
     */
    exports.generateTabs = function (mergeFields) {
        if (!mergeFields)
            return null;
        var result = {};
        mergeFields.forEach(function (field) {
            var type = exports.getTabCategoryFromType(field.tabType);
            if (type == null)
                return; // The type is not a supported merge field.
            var tab = {
                tabLabel: field.tabLabel,
                tabId: field.tabId,
                value: field.value,
            };
            switch (type) {
                case dst.TabType.DateSigned:
                    if (!result.dateSignedTabs)
                        result.dateSignedTabs = [];
                    result.dateSignedTabs.push(__assign({}, tab));
                    break;
                case dst.TabType.Number:
                    if (!result.numberTabs)
                        result.numberTabs = [];
                    result.numberTabs.push(__assign({}, tab));
                    break;
                case dst.TabType.CheckBox:
                    if (!result.checkboxTabs)
                        result.checkboxTabs = [];
                    result.checkboxTabs.push({
                        tabId: tab.tabId,
                        selected: tab.value,
                    });
                    break;
                case dst.TabType.List:
                    if (!result.listTabs)
                        result.listTabs = [];
                    result.listTabs.push(__assign({}, tab));
                    break;
                case dst.TabType.Note:
                    if (!result.noteTabs)
                        result.noteTabs = [];
                    result.noteTabs.push(__assign({}, tab));
                    break;
                case dst.TabType.Text:
                    if (!result.textTabs)
                        result.textTabs = [];
                    result.textTabs.push(__assign({}, tab));
                    break;
                default:
                    log.audit("Unsupported Merge Field", "Cannot merge fields of type " + field.tabType);
            }
        });
        return result;
    };
    /**
     * @description Convert a "tabType" string into the TabType for which it belongs.
     * @param tabType - The tabType string, found in the DocuSign response for tabs.
     */
    exports.getTabCategoryFromType = function (tabType) {
        var type = tabType.toLowerCase();
        switch (type) {
            case "datesigned":
            case dst.TabType.DateSigned.toLowerCase():
                return dst.TabType.DateSigned;
            case "number":
            case dst.TabType.Number.toLowerCase():
                return dst.TabType.Number;
            case "note":
            case dst.TabType.Note.toLowerCase():
                return dst.TabType.Note;
            case "checkbox":
            case dst.TabType.CheckBox.toLowerCase():
                return dst.TabType.CheckBox;
            case "list":
            case dst.TabType.List.toLowerCase():
                return dst.TabType.List;
            case "text":
                return dst.TabType.Text;
            default:
                log.audit("getTabCategoryFromType", "Unsupported Tab Type: [" + type + "]");
                return null;
        }
    };
    /**
     * @desc Get a collection of BaseRecipientTab objects detailing all of the merge fields for the recipient on the template.
     * @param templateId - The ID of the template.
     * @param recipientId - The ID of the recipient
     */
    exports.getTemplateMergeFields = function (templateId, recipientId, includeUnsupportedTypes) {
        var headers = apicommon.getHeaders(false);
        var _url = apicommon.getBaseUrl(false);
        var response = https.get({
            url: _url + "/templates/" + templateId + "/recipients/" + recipientId + "/tabs",
            headers: headers,
        });
        if (response.code !== 200) {
            log.error("dsapi_getTemplateMergeFields response failed", response);
            return;
        }
        var results = [];
        try {
            var data_1 = JSON.parse(response.body);
            Object.keys(data_1).forEach(function (key) {
                var mergeFields = getMergeFieldsFromRecipientTabResponse(data_1[key]);
                results.push.apply(results, mergeFields);
            });
        }
        catch (e) {
            log.error("dsapi_getTemplateMergeFields parse error", e.stack);
        }
        /*
              We need to remove any types that cannot be set since they cannot
              be used for Merge Fields.
              -- Including an optional parameter to allow for overriding this behavior
          */
        if (includeUnsupportedTypes === true)
            return results;
        var supportedTypes = [];
        results.map(function (r) {
            if (exports.getTabCategoryFromType(r.tabType) !== null) {
                supportedTypes.push(r);
            }
        });
        return supportedTypes;
    };
    var getMergeFieldsFromRecipientTabResponse = function (response) {
        var mergeFields = [];
        response.forEach(function (mf) {
            mergeFields.push({
                tabId: mf["tabId"],
                tabLabel: mf["tabLabel"],
                tabType: mf["tabType"],
                recipientId: mf["recipientId"],
                value: null,
            });
        });
        return mergeFields;
    };
});
