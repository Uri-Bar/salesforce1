/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NAmdConfig ./lib/JsLibraryConfig.json
 */
define(["require", "exports", "N/log", "./ds_api", "N/redirect", "./types/ds_t_telemetry", "./ds_common", "./api/ds_telemetry"], function (require, exports, log, api, redirect, dsttelemetry, dc, apitelemetry) {
    Object.defineProperty(exports, "__esModule", { value: true });
    ("use strict");
    var actions;
    (function (actions) {
        actions["viewenvelope"] = "viewenvelope";
    })(actions = exports.actions || (exports.actions = {}));
    /**
     * @desc  Version: NetSuite 2020.xx
     * @param context
     */
    exports.onRequest = function (context) {
        log.debug("params", JSON.stringify(context.request.parameters));
        var action = context.request.parameters.action;
        switch (action) {
            case actions.viewenvelope:
                var envelopeid = context.request.parameters.envelopeid;
                if (envelopeid) {
                    var ds_url = getViewEnvelopeUrl(envelopeid);
                    log.debug("ds_url", ds_url);
                    redirect.redirect({
                        url: ds_url,
                    });
                }
                break;
            default:
                break;
        }
    };
    var getViewEnvelopeUrl = function (envelopeId) {
        var currentUser = dc.getCurrentDocuSignUser();
        var dataPoints = {
            AccountId: dc.getDSUserCustomSettings().api_accountid,
            UserId: currentUser ? currentUser.userId : "",
            Action: dsttelemetry.TelemetryUserEvents.DocumentView,
            EnvelopeId: envelopeId,
            AppVersion: dc.INTEGRATION_VERSION,
        };
        apitelemetry.captureMetric(dsttelemetry.TelemetryType.Telemetry, {
            DataPoints: dataPoints,
        });
        return api.dsapi_openConsole(envelopeId);
    };
});
