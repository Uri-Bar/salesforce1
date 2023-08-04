/**
 * @NApiVersion 2.1
 * @NAmdConfig ./JsLibraryConfig.json
 */
define(["require", "exports", "N/record", "N/ui/serverWidget", "../ds_common", "../ds_cache", "../types/ns_types", "../types/ds_t_telemetry", "./ds_config_validation", "../api/ds_telemetry", "../utils/ds_benchmark"], function (require, exports, record, ui, dc, dsc, n, dsttelemetry, valid, apitelemetry, ds_benchmark_1) {
    Object.defineProperty(exports, "__esModule", { value: true });
    ("use strict");
    exports.buildAcctSettingsForm = function (form, acct_settings, params) {
        valid.displayAccountSettingsNotifications(form, params);
        if (acct_settings === null)
            return form;
        var settings_field_group = form.addFieldGroup({
            id: "custpage_account_settings_group",
            label: "The following DocuSign account is configured with NetSuite",
        });
        settings_field_group.isSingleColumn = true;
        form.addField({
            id: "custpage_account_setting_id",
            label: "DocuSign Account id: " + acct_settings.custrecord_docusign_account_id,
            type: ui.FieldType.LABEL,
            container: "custpage_account_settings_group",
        });
        var dsEnvironmentName = dc.getDSEnvironmentName();
        form.addField({
            id: "custpage_account_env_field",
            label: "DocuSign Environment: " + dsEnvironmentName,
            type: ui.FieldType.LABEL,
            container: "custpage_account_settings_group",
        });
        var coc = form.addField({
            id: "custpage_account_setting_coc",
            label: "Attach the Certificate of Completion (CoC) in the signed document (if checked)",
            type: ui.FieldType.CHECKBOX,
            container: "custpage_account_settings_group",
        });
        coc.defaultValue =
            acct_settings.custrecord_docusign_include_coc === true ? "T" : "F";
        var acct_setting_pdf_label = form.addField({
            id: "custpage_postback_file_format",
            type: ui.FieldType.SELECT,
            label: "Completed PDF File Name",
            source: "customlist_ds_list_filename",
            container: "custpage_account_settings_group",
        });
        acct_setting_pdf_label.defaultValue =
            acct_settings.custrecord_docusign_postback_file_format.toString();
        var account_settings_id = form.addField({
            id: "custpage_account_settings_internalid",
            label: " ",
            type: ui.FieldType.INTEGER,
        });
        account_settings_id.defaultValue = acct_settings.internalid.toString();
        account_settings_id.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        return form;
    };
    exports.processAcctSettingsRecord = function (params) {
        if (!params.custpage_account_settings_internalid)
            return;
        var benchmarkResults = ds_benchmark_1.benchmark(function () {
            var success = true;
            var accountSettings = getAccountSettings(params);
            var settings_rec = record.load({
                id: accountSettings.id,
                type: "customrecord_docusign_account_settings",
                isDynamic: true,
            });
            // now we need to process each data point correctly
            settings_rec.setValue({
                fieldId: "custrecord_docusign_postback_file_format",
                value: accountSettings.postbackFileFormat,
            });
            settings_rec.setValue({
                fieldId: "custrecord_docusign_include_coc",
                value: accountSettings.attachCOC,
            });
            try {
                dsc.clearAll();
                settings_rec.save();
            }
            catch (e) {
                success = false;
            }
            return {
                accountSettings: accountSettings,
                success: success,
            };
        });
        logSaveAccountSettings(benchmarkResults.returnValue.accountSettings, benchmarkResults.duration, benchmarkResults.returnValue.success);
        var saveReponse = benchmarkResults.returnValue.success
            ? n.saveSuccess
            : n.saveFailure;
        return {
            save_response: saveReponse,
        };
    };
    var getAccountSettings = function (params) {
        return {
            id: params.custpage_account_settings_internalid,
            postbackFileFormat: Number(params.custpage_postback_file_format),
            attachCOC: params.custpage_account_setting_coc === "T",
        };
    };
    var logSaveAccountSettings = function (accountSettings, duration, success) {
        var currentUser = dc.getCurrentDocuSignUser();
        var counters = [];
        var dataPoints = {
            AccountId: dc.getDSUserCustomSettings().api_accountid,
            AppVersion: dc.INTEGRATION_VERSION,
            UserId: currentUser ? currentUser.userId : "",
            Action: dsttelemetry.TelemetryConfigurationEvents.UpdateDocuSignAccount,
            ElapsedTime: duration,
            Success: success,
        };
        var features = {
            PostbackFileFormat: accountSettings.postbackFileFormat,
            AttachCOC: accountSettings.attachCOC ? 1 : 0,
        };
        counters.push(apitelemetry.getRequestTimeCounter(dsttelemetry.TelemetryConfigurationEvents.UpdateDocuSignAccount, duration, success));
        apitelemetry.captureMetric(dsttelemetry.TelemetryType.Configuration, {
            DataPoints: dataPoints,
            FeatureUsage: features,
        }, counters);
    };
});
