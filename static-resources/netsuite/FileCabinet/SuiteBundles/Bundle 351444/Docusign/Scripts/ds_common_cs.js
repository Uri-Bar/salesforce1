define(["require", "exports", "N/error", "N/url", "./types/ns_types"], function (require, exports, error, url, n) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RESTLET_SCRIPTID = "customscript_ds_restlet";
    exports.RESTLET_DEPLOYMENTID = "customdeploy_ds_restlet";
    exports.SUITELET_SCRIPTID = "customscript_ds_config_sl";
    exports.SUITELET_DEPLOYMENTID = "customdeploy_ds_config_sl";
    exports.API_SUITELET_SCRIPTID = "customscript_ds_api_sl";
    exports.API_SUITELET_DEPLOYMENTID = "customdeploy_ds_api_sl";
    exports.SIGNATURE_SUITELET_SCRIPTID = "customscript_ds_signature_sl";
    exports.SIGNATURE_SUITELET_DEPLOYMENTID = "customdeploy_ds_signature_sl";
    exports.getNetSuiteUrl = function (_endpoint, parameters, returnExternalUrl) {
        if (parameters === void 0) { parameters = {}; }
        if (returnExternalUrl === void 0) { returnExternalUrl = false; }
        switch (_endpoint) {
            case n.urlEndpoint.configuration_suitelet:
                return url.resolveScript({
                    scriptId: exports.SUITELET_SCRIPTID,
                    deploymentId: exports.SUITELET_DEPLOYMENTID,
                    params: parameters,
                    returnExternalUrl: returnExternalUrl,
                });
            case n.urlEndpoint.restlet:
                return url.resolveScript({
                    scriptId: exports.RESTLET_SCRIPTID,
                    deploymentId: exports.RESTLET_DEPLOYMENTID,
                    params: parameters,
                    returnExternalUrl: returnExternalUrl,
                });
            case n.urlEndpoint.api_suitelet:
                return url.resolveScript({
                    scriptId: exports.API_SUITELET_SCRIPTID,
                    deploymentId: exports.API_SUITELET_DEPLOYMENTID,
                    params: parameters,
                    returnExternalUrl: returnExternalUrl,
                });
            case n.urlEndpoint.signature_suitelet:
                return url.resolveScript({
                    scriptId: exports.SIGNATURE_SUITELET_SCRIPTID,
                    deploymentId: exports.SIGNATURE_SUITELET_DEPLOYMENTID,
                    params: parameters,
                    returnExternalUrl: returnExternalUrl,
                });
            default:
                throw error.create({
                    name: "getRestletUrl parameter missing",
                    message: "Endpoint parameter missing from call to getRestletUrl",
                });
        }
    };
});
