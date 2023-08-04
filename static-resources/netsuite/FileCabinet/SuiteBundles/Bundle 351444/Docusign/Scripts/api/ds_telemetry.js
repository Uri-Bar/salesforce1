/**
 * @NApiVersion 2.1
 * This file includes the Telemetry APIs
 */
define(["require", "exports", "N/https", "N/log", "uuid", "../ds_common", "../types/ds_t_telemetry"], function (require, exports, https, log, uuid, dc, dsttelemetry) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var telemetrySettings = {
        application: "Integrations.NetSuite",
        eventCategory: "NetSuite",
        eventType: "DocuSign.Monitoring.IntegrationsEvent",
    };
    exports.captureMetric = function (type, telemetryData, counters, correlationToken) {
        exports.captureMetrics(type, [telemetryData], counters, correlationToken);
    };
    exports.captureMetrics = function (type, telemetryData, counters, correlationToken) {
        try {
            var url = "https://telemetry.docusign.net";
            var telemetryEvents_1 = [];
            var clientContext_1 = getClientContext();
            telemetryData.map(function (data) {
                return telemetryEvents_1.push({
                    clientContext: clientContext_1,
                    eventCategory: telemetrySettings.eventCategory,
                    eventName: getEventName(type),
                    eventType: telemetrySettings.eventType,
                    data: data,
                    correlationToken: correlationToken || dc.getCorrelationToken(),
                    traceToken: getTraceToken(),
                    appVersion: dc.INTEGRATION_VERSION,
                });
            });
            prepareCounters(counters, clientContext_1);
            var body = {
                Events: telemetryEvents_1,
            };
            if (counters) {
                body.Counters = counters;
            }
            var headers = {
                Authorization: "kazmon " + dc.DS_TELEMETRY_KEY,
                "Content-Type": "application/json",
            };
            var response = https.post({
                url: url + "/api/v1/telemetry",
                headers: headers,
                body: JSON.stringify(body),
            });
            if (response.code === 207 || response.code >= 300) {
                log.debug("Telemetry Log Error", {
                    code: response.code,
                    body: response.body,
                });
            }
        }
        catch (err) {
            log.debug("Telemetry Log Error", { err: err });
        }
    };
    exports.getRequestTimeCounter = function (action, duration, success) {
        return {
            counterCategory: telemetrySettings.application,
            counterName: "Load Time",
            metrics: [
                {
                    Instance: action,
                    Measure: duration,
                    Success: success,
                },
            ],
            displayUnit: "milliseconds",
            hasErrorCount: true,
            hasInstance: true,
            hasMeasure: true,
            hideCountChart: false,
            showVolume: false,
        };
    };
    var getClientContext = function () {
        var env = dc.getDSEnvironment();
        return {
            application: telemetrySettings.application,
            environment: env.environment || "prod",
            site: env.site || "prod",
        };
    };
    var prepareCounters = function (counters, clientContext) {
        if (!counters)
            return;
        if (counters) {
            var defaultRanges = [
                10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
            ];
            for (var i = 0; i < counters.length; i++) {
                if (!counters[i].clientContext) {
                    counters[i].clientContext = clientContext;
                }
                if (!counters[i].ranges) {
                    counters[i].ranges = defaultRanges;
                }
            }
        }
    };
    var getEventName = function (type) {
        return "Integrations " + (type || dsttelemetry.TelemetryType.Telemetry);
    };
    var _traceToken = "";
    var getTraceToken = function () {
        if (!_traceToken) {
            _traceToken = uuid.v4();
        }
        return _traceToken;
    };
});
