define(["require", "exports"], function (require, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var TelemetryUserEvents;
    (function (TelemetryUserEvents) {
        TelemetryUserEvents["EnvelopeCreate"] = "EnvelopeCreated";
        TelemetryUserEvents["EnvelopeSend"] = "EnvelopeSent";
        TelemetryUserEvents["EnvelopeCancel"] = "EnvelopeCanceled";
        TelemetryUserEvents["EnvelopeStatusUpdate"] = "EnvelopeStatusUpdated";
        TelemetryUserEvents["DocumentView"] = "DocumentViewed";
        TelemetryUserEvents["DocumentUpdate"] = "DocumentUpdated";
        TelemetryUserEvents["DocuSignConfigure"] = "ConfigOpened";
        TelemetryUserEvents["DocuSignConfigureAccount"] = "ConfigAccountOpened";
        TelemetryUserEvents["DocuSignAccountSettings"] = "ConfigAccountSettingsOpened";
        TelemetryUserEvents["DocuSignAdminConsole"] = "DSAccountOpened";
    })(TelemetryUserEvents = exports.TelemetryUserEvents || (exports.TelemetryUserEvents = {}));
    var TelemetryConfigurationEvents;
    (function (TelemetryConfigurationEvents) {
        TelemetryConfigurationEvents["UpdateDocuSignAccount"] = "ConfigAccountSettingsUpdated";
        TelemetryConfigurationEvents["UpdateRecordSettings"] = "ConfigRecordSettingsUpdated";
        TelemetryConfigurationEvents["CustomButtonCreate"] = "ConfigCustomButtonCreated";
        TelemetryConfigurationEvents["CustomButtonUpdate"] = "ConfigCustomButtonUpdated";
        TelemetryConfigurationEvents["CustomButtonDelete"] = "ConfigCustomButtonDeleted";
    })(TelemetryConfigurationEvents = exports.TelemetryConfigurationEvents || (exports.TelemetryConfigurationEvents = {}));
    var TelemetryType;
    (function (TelemetryType) {
        TelemetryType["Telemetry"] = "Telemetry";
        TelemetryType["Performance"] = "Performance";
        TelemetryType["Configuration"] = "Config";
    })(TelemetryType = exports.TelemetryType || (exports.TelemetryType = {}));
});
