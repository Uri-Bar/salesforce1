/**
 * @NApiVersion 2.1
 * @NAmdConfig  ./lib/JsLibraryConfig.json
 */
define(["require", "exports", "N/error", "N/file", "N/record", "N/runtime", "N/search", "N/cache", "N/log", "N/util", "N/config", "N/https", "N/render", "crypto-js", "uuid", "./types/ds_types", "./config/ds_keys", "./ds_cache", "./ds_api", "./api/ds_api_common"], function (require, exports, error, file, record, runtime, search, cache, log, util, config, https, render, CryptoJS, uuid, d, key, dsc, api, apicommon) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.executeCustomScript = function (docusignContext) {
        // !!!! docusignContext is made available to the DS script
        // so DO NOT CHANGE THE NAME OF THIS VARIABLE !!!!
        if (!docusignContext) {
            log.error("Custom Button w/ Code Missing docusignContext", 'Script "eval" *cannot* function without the docusignContext.');
        }
        // check if file exists
        var filters = [];
        filters[0] = search.createFilter({
            name: "internalid",
            operator: search.Operator.IS,
            values: docusignContext.dsAutomationScriptId,
        });
        var fileCount = search
            .create({
            type: "file",
            filters: filters,
        })
            .runPaged().count;
        if (fileCount === 0)
            throw error.create({
                name: "File not found or not accessible",
                message: "NOTE: The button you just clicked is a custom button, defined in NetSuite to control a specific action with DocuSign.  In order to work properly, that button uses a script, which is located in an area of the File Cabinet which you do not have access to.  As a result, this means you cannot use this button until either the script is moved to a location you have access to, or you gain access to its current location.  This can also happen if the script file is deleted.  This is not an error, and nothing is broken.  If you believe you have received this message incorrectly, and you need to use this DocuSign button, contact your NetSuite administrator.",
            });
        //Load the script file
        var _file = file.load({ id: docusignContext.dsAutomationScriptId });
        var fileContents = _file.getContents();
        // check if file is empty
        if (fileContents === "")
            throw error.create({
                name: "Empty Script",
                message: "The script file(" + _file.name + ") is empty.",
            });
        // check if either docusignPopulateEnvelope() or docusignSignEnvelope() will be called.
        if (fileContents.indexOf("docusignPopulateEnvelope") === -1 &&
            fileContents.indexOf("docusignSignEnvelope") === -1)
            throw error.create({
                name: "Wrong Script Call",
                message: "The script file(" +
                    _file.name +
                    ") must call either docusignPopulateEnvelope() or docusignSignEnvelope().",
            });
        var customScriptFuncHolder = {
            customScript: function () {
                return {
                    viewUrl: "",
                    envelopeId: "",
                };
            },
        };
        try {
            eval("customScriptFuncHolder.customScript = " + fileContents);
        }
        catch (e) {
            throw error.create({
                name: "Invalid Custom Script",
                message: "Custom script could not be processed.  Please ensure custom scripts only contain a single function devoid of syntax errors.",
            });
        }
        try {
            return customScriptFuncHolder.customScript();
        }
        catch (e) {
            throw error.create({
                name: "Custom Script Error",
                message: "There was an error in the custom script. " + e,
            });
        }
    };
    /**
     * @description This function is required
     */
    var placeHolder = function () {
        return {
            render: render.PrintMode.PDF,
            https: https.get,
            error: error.create,
            file: file.Type.PDF,
            record: record.Type.ACCOUNT,
            runtime: runtime.EnvType.BETA,
            search: search.Type.ACCOUNT,
            cache: cache.Scope.PRIVATE,
            util: util.isArray([]),
            config: config.Type.ACCOUNTING_PERIODS,
            log: log.audit,
            cryptojs: CryptoJS.SHA512,
            uuid: uuid.v5,
            d: d.TabType.CheckBox,
            key: key.encryption_key,
            dsc: dsc.clearAll,
            api: api.docusignGetEmail,
            apicommon: apicommon.checkFileTypes,
        };
    };
});
