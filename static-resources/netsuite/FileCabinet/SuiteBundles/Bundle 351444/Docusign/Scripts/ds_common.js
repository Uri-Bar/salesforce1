/**
 * @NApiVersion 2.1
 * @NAmdConfig  ./lib/JsLibraryConfig.json
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
define(["require", "exports", "N/error", "N/file", "N/record", "N/runtime", "N/search", "N/log", "N/util", "N/config", "crypto-js", "uuid", "./types/ns_types", "./config/ds_keys", "./ds_cache", "./ds_api", "./api/ds_api_common", "./ds_custom_script_executor"], function (require, exports, error, file, record, runtime, search, log, util, config, CryptoJS, uuid, n, key, dsc, api, apicommon, customScriptRunner) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     *      Version: NetSuite 2020.05
     *    This file includes all the common functions used by the following DocuSign Scripts:
     *      - DocuSign Landing Page
     *      - DocuSign RESTLet
     *      - DocuSign Suitelet
     *      - DocuSign UI
     *      - DocuSign API
     */
    exports.INTEGRATION_KEY = "NETS-a93519ae-4fb7-4d19-8bb4-c9b0ef693ad6"; //NetSuite Integration Key
    exports.INTEGRATION_VERSION = "NetSuite/2021.12";
    exports.PROD_PLAN_ID = "0da91b18-7a49-40cf-b5ea-84c3df155c8d";
    exports.DEMO_PLAN_ID = "084cd95d-f5bb-4b66-8d08-0163a8984123";
    exports.ENCRYPTION_ALGORITHM = "aes"; //the encryption algorithm for encrypting sensitive data
    exports.DOCUSIGN_FOLDER_NAME = "DocuSign"; //The folder name to hold all DocuSign Files
    exports.DOCUSIGNED_FOLDER_NAME = "DocuSigned"; //The folder name to hold all DocuSigned documents
    exports.DOCUSIGN_RECORD_SETTINGS_FILE = "DocuSign_RecordType_Settings.txt";
    exports.DS_HEADER = "dsHeaderLabel";
    exports.DS_LABEL = "dsLabel";
    exports.DS_BUTTON = "dsButton";
    exports.DS_ENVELOPE_STATUS = "dsEnvelopeStatus";
    exports.DS_CONTENT = "dsContent";
    exports.DS_ERROR = "dsError";
    exports.DS_SEND = "DsSend";
    exports.DS_SIGN = "DsSign";
    exports.DS_TELEMETRY_KEY = "da66e606-6686-4917-aabf-e9ebd3be5206";
    exports.getDSEnvironment = function (environmentId) {
        // the currently configured environment (demo, prod, stage) is
        // stored in this general settings record 'custscript_docusign_environment'
        // sometimes this record can be empty, such as when the app not yet configured
        // in this case the user should be passing in the environmantId
        if (!environmentId) {
            var configParam = runtime
                .getCurrentScript()
                .getParameter({ name: "custscript_docusign_environment" });
            if (configParam) {
                environmentId = Number(configParam.valueOf());
            }
        }
        var env = {
            endpoint: "",
            environment: "",
            name: "",
            site: "",
        };
        if (environmentId) {
            // if we're here then we have a valid environmentId
            var srch = search.lookupFields({
                columns: [
                    "custrecord_docusign_endpoint",
                    "name",
                    "custrecord_docusign_site",
                    "custrecord_docusign_env_abbr",
                ],
                id: environmentId,
                type: "customrecord_docusign_environment",
            });
            if (srch) {
                env.endpoint = srch.custrecord_docusign_endpoint;
                env.name = srch.name;
                env.site = srch.custrecord_docusign_site;
                env.environment = srch.custrecord_docusign_env_abbr;
            }
        }
        else {
            log.error(n.acctNotConfigured, "Missing DocuSign Environment ID: getDSEnvironment(): This method requires a valid environment id in order to lookup and return the correct customrecord_docusign_environment");
            throw new Error(n.acctNotConfigured);
        }
        return env;
    };
    /**
     * @desc Get the field value of the selected DocuSign Environment record
     * @param {number} environmentId - the field name of the DocuSign Environment record
     * @return {string} fieldValue - the field value of the selected DocuSign Environment record
     */
    exports.getDSEnvironmentName = function (environmentId) {
        return exports.getDSEnvironment(environmentId).endpoint;
    };
    /**
     * @desc  Get the DocuSign Account Settings Record
     * @param {string} soboAcct - if true, get the DocuSign Account Settings of the SOBO user
     * @return {object} dsAcctSettingsRecord - the DocuSign Account Settings Record
     */
    exports.getAccountSettingRecord = function (soboAcct, dsUserEmail) {
        log.debug("getAccountSettingRecord(" + soboAcct + "," + dsUserEmail + ")", "getAccountSettingRecord(" + soboAcct + "," + dsUserEmail + ")");
        var start = new Date().getTime();
        var dsAcctSettingsRecord = null;
        var filters = null;
        if (soboAcct) {
            var soboEmail = runtime
                .getCurrentScript()
                .getParameter({ name: "custscript_docusign_username" });
            if (!soboEmail)
                return null; // account is not setup yet
            filters = [["custrecord_docusign_email", "is", soboEmail]];
        }
        else {
            filters = [["custrecord_docusign_email", "is", dsUserEmail]];
        }
        var columns = [];
        columns[0] = search.createColumn({ name: "internalid" });
        var searchObj = search.create({
            columns: columns,
            filters: filters,
            type: "customrecord_docusign_account_settings",
        });
        searchObj.run().each(function (result) {
            var recordId = result.id;
            if (recordId) {
                dsAcctSettingsRecord = record.load({
                    id: recordId,
                    type: "customrecord_docusign_account_settings",
                    isDynamic: true,
                });
            }
            return false;
        });
        var end = new Date().getTime();
        // log.debug(
        //   "getAccountSettingRecord(" + soboAcct + "," + dsUserEmail + ")",
        //   "dsAcctSettingsRecord: " +
        //   JSON.stringify(dsAcctSettingsRecord) +
        //   " took " +
        //   (end - start) +
        //   " milliseconds"
        // );
        if (dsAcctSettingsRecord == null) {
            log.debug("User not found", "User: " +
                dsUserEmail +
                " was not found in record type customrecord_docusign_account_settings");
        }
        return dsAcctSettingsRecord;
    };
    exports.getAcctSettingsCache = function (context) {
        var key = JSON.parse(context.key);
        var rec = exports.getAccountSettingRecord(key.soboAcct, key.dsUserEmail);
        if (rec == null)
            return null;
        var account_environment = rec
            .getValue({ fieldId: "custrecord_docusign_account_environment" })
            .toString();
        var account_id = rec
            .getValue({ fieldId: "custrecord_docusign_account_id" })
            .toString();
        var userid = rec
            .getValue({ fieldId: "custrecord_docusign_userid" })
            .toString();
        var email = rec.getValue({ fieldId: "custrecord_docusign_email" }).toString();
        var username = rec
            .getValue({ fieldId: "custrecord_docusign_username" })
            .toString();
        var include_coc = Boolean(rec.getValue({ fieldId: "custrecord_docusign_include_coc" }));
        var postback_file_format = Number(rec.getValue({ fieldId: "custrecord_docusign_postback_file_format" }));
        var settings = {
            internalid: rec.id,
            custrecord_docusign_account_environment: account_environment,
            custrecord_docusign_account_id: account_id,
            custrecord_docusign_userid: userid,
            custrecord_docusign_email: email,
            custrecord_docusign_username: username,
            custrecord_docusign_include_coc: include_coc,
            custrecord_docusign_postback_file_format: postback_file_format,
        };
        return JSON.stringify(settings);
    };
    /**
     * @desc  Check if the object is a number
     * @param {object} o - the object to be checked
     * @return {boolean} - true if the object is a number else return false
     */
    exports.isNumber = function (o) {
        return !isNaN(Number(o) - 0) && o !== null;
    };
    /**
     * @desc  Convert a date object into the date string (Format: "mm/dd/yyyy hh/mm/ss")
     * @param {date} date - the date object to be converted
     * @return {string} result - the formatted string of the date object
     */
    exports.getDateTimeString = function (date) {
        var result = "";
        result += date.getMonth() + 1;
        result += "/";
        result += date.getDate();
        result += "/";
        result += date.getFullYear();
        result += " ";
        result += exports.formatDigit(date.getHours().toString());
        result += ":";
        result += exports.formatDigit(date.getMinutes().toString());
        result += ":";
        result += exports.formatDigit(date.getSeconds().toString());
        return result;
    };
    /**
     * @desc  Format the digit to the following fomrat: dd
     * @param {string} d - the digit string to be formatted
     * @return {string} result - the formatted digit string
     */
    exports.formatDigit = function (d) {
        var result = d;
        if (parseInt(d) < 10) {
            result = "0" + d;
        }
        return result;
    };
    /**
     * @desc  Get the internal NetSuite id of the folder
     * @param  {string} folderName - the name of the folder
     * @return  {string} dsFolderId - the internal NetSuite id of the folder
     */
    exports.getFolderId = function (folderName) {
        var dsFolderId;
        var filters = [];
        filters[0] = search.createFilter({
            name: "name",
            operator: search.Operator.IS,
            values: folderName,
        });
        var columns = [];
        columns[0] = search.createColumn({
            name: "internalid",
        });
        var srch = search.create({
            columns: columns,
            filters: filters,
            type: "folder",
        });
        srch.run().each(function (result) {
            dsFolderId = Number(result.getValue("internalid"));
            return true;
        });
        return dsFolderId;
    };
    /**
     * @desc  Get the internal NetSuite id of the DocuSigned folder
     * @return {string} docuSignedFolderId - the internal NetSuite id of the DocuSigned folder
     */
    exports.getDocuSignedFolderId = function () {
        var docuSignedFolderId;
        var dsFolderId = exports.getFolderId(exports.DOCUSIGN_FOLDER_NAME);
        if (dsFolderId !== null) {
            var filters = [];
            filters[0] = search.createFilter({
                name: "name",
                operator: search.Operator.IS,
                values: exports.DOCUSIGNED_FOLDER_NAME,
            });
            filters[1] = search.createFilter({
                name: "parent",
                operator: search.Operator.IS,
                values: dsFolderId,
            });
            // filters[0] = new nlobjSearchFilter('name', null, 'is', DOCUSIGNED_FOLDER_NAME);
            // filters[1] = new nlobjSearchFilter('parent', null, 'is', dsFolderId);
            var columns = [];
            columns[0] = search.createColumn({ name: "internalid" });
            // columns[0] = new nlobjSearchColumn('internalid');
            var searchResults = search.create({
                columns: columns,
                filters: filters,
                type: "folder",
            });
            // const searchResults = nlapiSearchRecord('folder', null, filters, columns);
            var rows = searchResults.runPaged().count;
            if (searchResults && rows > 0) {
                searchResults.run().each(function (result) {
                    docuSignedFolderId = Number(result.getValue("internalid"));
                    return false;
                });
                // docuSignedFolderId = searchResults[0].getValue("internalid");
            }
            else {
                //Create the folder if it doesnt exist
                var docusignedFolder = record.create({
                    type: record.Type.FOLDER,
                });
                // const docusignedFolder = nlapiCreateRecord('folder');
                docusignedFolder.setValue("name", exports.DOCUSIGNED_FOLDER_NAME);
                docusignedFolder.setValue("parent", dsFolderId);
                docuSignedFolderId = docusignedFolder.save();
                // docuSignedFolderId = nlapiSubmitRecord(docusignedFolder);
            }
        }
        return docuSignedFolderId.toString();
    };
    /**
     * @desc  Get the file url of the specific file
     * @param {string} fileName - the name of the file
     * @param {string} folderName - the name of the folder (optional)
     * @return {string} result - the file url of the file
     */
    exports.getFileUrl = function (fileName, folderName) {
        var result = "File Not Found.";
        var filters = [];
        filters[0] = search.createFilter({
            name: "name",
            operator: search.Operator.IS,
            values: fileName,
        });
        if (exports.isNotNull(folderName)) {
            var folderId = exports.getFolderId(folderName);
            if (exports.isNotNull(folderId)) {
                filters[0] = search.createFilter({
                    name: "name",
                    operator: search.Operator.IS,
                    values: fileName,
                });
            }
        }
        var searchResults = search.create({
            filters: filters,
            type: "file",
        });
        searchResults.run().each(function (res) {
            var fileId = res.id;
            var f = file.load({ id: fileId });
            if (f) {
                result = f.url;
            }
            return true;
        });
        if (exports.isNotNull(folderName) && result === "File Not Found.") {
            //Unable to find the file in the specific folder location.
            //Try searching it on any folder location.
            return exports.getFileUrl(fileName, "");
        }
        return result;
    };
    /**
     * @desc  Get the file content of the specific file
     * @param {string} fileName - the name of the filder
     * @return {string} result - the file content of the file
     */
    exports.getFileContent = function (fileName) {
        var result = "File Not Found.";
        var filters = [];
        filters[0] = search.createFilter({
            name: "name",
            operator: search.Operator.IS,
            values: fileName,
        });
        // filters[0] = new nlobjSearchFilter('name', null, 'is', fileName);
        var searchResults = search.create({
            filters: filters,
            type: "file",
        });
        // const searchResults = nlapiSearchRecord('file', null, filters, null);
        // let numResults = searchResults.runPaged().count;
        // if (searchResults && numResults > 0) {
        searchResults.run().each(function (res) {
            var fileId = res.id;
            var f = file.load({ id: fileId });
            if (f) {
                result = f.getContents();
            }
            return true;
        });
        return result;
    };
    /**
     * @desc  Get the JSON object including all the localization texts
     * @param {string} language - the name of the folder
     * @return {string} result - the JSON object including all the localization texts
     */
    exports.getLocalizationJSON = function (language) {
        var json;
        var dsFileId = "";
        var dsLocalizationFile = "DocuSign_" + language + ".txt";
        var filters = [];
        filters[0] = search.createFilter({
            name: "name",
            operator: search.Operator.IS,
            values: dsLocalizationFile,
        });
        var columns = [];
        columns[0] = search.createColumn({
            name: "internalid",
        });
        var searchResults = search.create({
            columns: columns,
            filters: filters,
            type: "file",
        });
        searchResults.run().each(function (result) {
            dsFileId = result.getValue("internalid").toString();
            return true;
        });
        var f = file.load({ id: dsFileId });
        if (f) {
            json = JSON.parse(f.getContents());
        }
        return json;
    };
    /**
     * @desc  Get the localization text
     * @param {JSON} json - the localization JSON object
     * @param {string} type - the type of the localization text
     * @param {string} id - the id of the localization text
     * @param {string} defaultText - the default text to be displayed if the text is not found
     * @return {string} result - the targeted message, label or header
     */
    exports.getLocalizationText = function (json, type, id, defaultText) {
        var result = defaultText;
        if (json) {
            if (json[type] && json[type][id]) {
                result = json[type][id];
            }
        }
        return result;
    };
    /**
     * @desc  Get all the DocuSign Envelope Status Records
     * @param {string} dsEnvironment - the selected DocuSign environment
     * @param {string} accountId - the SOBO account id
     * @param {string} recordType - the record type of the current object(Opportunity)
     * @param {string} recordId - the record id of the current object(Opportunity)
     * @return {object} searchResults - the search results
     */
    exports.getDSEnvelopeStatusList = function (dsEnvironment, accountId, recordType, recordId) {
        if (!recordId || !recordType) {
            return null;
        }
        var filters = [];
        filters[0] = search.createFilter({
            name: "custrecord_docusign_envelope_environment",
            operator: search.Operator.IS,
            values: dsEnvironment,
        });
        filters[1] = search.createFilter({
            name: "custrecord_docusign_envelope_accountid",
            operator: search.Operator.IS,
            values: accountId,
        });
        filters[2] = search.createFilter({
            name: "custrecord_docusign_recordtype",
            operator: search.Operator.IS,
            values: recordType,
        });
        filters[3] = search.createFilter({
            name: "custrecord_docusign_recordid",
            operator: search.Operator.IS,
            values: recordId,
        });
        var columns = [];
        columns[0] = search.createColumn({
            name: "internalid",
            sort: search.Sort.ASC,
        });
        return search.create({
            columns: columns,
            filters: filters,
            type: "customrecord_docusign_envelope_status",
        });
        // return nlapiSearchRecord('customrecord_docusign_envelope_status', null, filters, columns);
    };
    /**
     * @desc  Check if the NetSuite user is the DocuSign SOBO account owner
     * @return {boolean} result - true if the NetSuite user is the DocuSign SOBO account owner, else return false
     */
    exports.isSOBOAcctOwner = function () {
        var result = false;
        // use the cache to get account settings
        var acct_sett_cache = dsc.dsCache(runtime.getCurrentUser().id).get({
            key: dsc.createKey({
                method: "getAccountSettingRecord",
                soboAcct: false,
                dsUserEmail: runtime.getCurrentUser().email,
            }),
            loader: exports.getAcctSettingsCache,
            ttl: 600,
        });
        // the cache returns a string so we parse the output
        // into the typed json we want
        if (acct_sett_cache) {
            var asr = JSON.parse(acct_sett_cache);
            var soboUserId = runtime
                .getCurrentScript()
                .getParameter({ name: "custscript_docusign_api_account_id" });
            if (asr) {
                log.debug("isSOBOAcctOwner", JSON.stringify({
                    ds_userid: asr.custrecord_docusign_userid,
                    sobo: soboUserId,
                }));
                if (asr.custrecord_docusign_userid === soboUserId) {
                    result = true;
                }
            }
        }
        return result;
    };
    /**
     * @desc  Check if the NetSuite is configured with DocuSign (SOBO account is setup)
     * @return {boolean} result - true if the DocuSign SOBO account is setup, else return false
     */
    exports.isSOBOAcctSetup = function () {
        var result = false;
        var username = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_username" });
        var encryptedPassword = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_password" });
        var accountID = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_account_id" });
        var environment = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_environment" });
        var apiAccountId = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_api_account_id" });
        if (exports.isNotNull(username) &&
            username !== "" &&
            exports.isNotNull(encryptedPassword) &&
            encryptedPassword !== "" &&
            exports.isNotNull(accountID) &&
            accountID !== "" &&
            exports.isNotNull(environment) &&
            environment !== "" &&
            exports.isNotNull(apiAccountId) &&
            apiAccountId !== "") {
            result = true;
        }
        log.debug("isSOBOAcctSetup result:", {
            username: {
                value: username,
                isNotNull: exports.isNotNull(username),
                notEmpty: username !== "",
            },
            encryptedPassword: {
                value: encryptedPassword,
                isNotNull: exports.isNotNull(encryptedPassword),
                notEmpty: encryptedPassword !== "",
            },
            accountID: {
                value: accountID,
                isNotNull: exports.isNotNull(accountID),
                notEmpty: accountID !== "",
            },
            environment: {
                value: environment,
                isNotNull: exports.isNotNull(environment),
                notEmpty: environment !== "",
            },
            result: result,
        });
        return result;
    };
    /**
     * @desc  Find the number of non-docusigned documents of an object(Oppurtunity)
     * @param {array} attachedFilesArray - the array of attached files
     * @return {number} numOfDocToSign - the number of non-docusigned documents
     */
    exports.numOfNonDocuSignedDoc = function (attachedFilesArray) {
        var numOfDocToSign = 0;
        if (attachedFilesArray && attachedFilesArray.length > 0) {
            for (var i = 0; i < attachedFilesArray.length; i++) {
                var fileId = attachedFilesArray[i];
                if (fileId) {
                    var f = file.load({ id: fileId });
                    if (f && f.name && f.name.indexOf("DOCUSIGNED") === -1) {
                        numOfDocToSign++;
                    }
                }
            }
        }
        return numOfDocToSign;
    };
    /**
     * @desc  Create a random string with the specific size
     * @param {number} size - the size of the random string
     * @return {string} text - the random string
     */
    exports.getRandomString = function (size) {
        var wordArray = CryptoJS.lib.WordArray.random(256);
        var base64 = CryptoJS.enc.Base64.stringify(wordArray);
        var alpha = base64.replace(/[\W_]+/g, "");
        var text = alpha.substring(0, size);
        return text;
    };
    /**
     * @desc  Create a random hex string with the specific size
     * @param {number} size - the size of the random string
     * @return {string} text - the random string
     */
    exports.getRandomHexString = function (size) {
        var wordArray = CryptoJS.lib.WordArray.random(256);
        var hex = CryptoJS.enc.Hex.stringify(wordArray);
        var text = hex.substring(0, size);
        return text;
    };
    /**
     * @desc  Get the encrypted string
     * @param {string} input - the string to encrypt
     * @return {string} password - the encrypted string
     */
    exports.encryptString = function (input) {
        var output = "";
        try {
            output = CryptoJS.AES.encrypt(input, key.encryption_key).toString();
        }
        catch (e) {
            exports.logError(e);
            throw error.create({
                name: e.name,
                message: e.message,
            });
        }
        return output;
    };
    /**
     * @desc  Get the Decrypted Password
     * @param {string} input - the encrypted string
     * @return {string} password - the decrypted string
     */
    exports.decryptString = function (input) {
        var output = "";
        try {
            output = CryptoJS.AES.decrypt(input, key.encryption_key).toString(CryptoJS.enc.Utf8);
        }
        catch (e) {
            // Crypto JS will throw a "Malformed UTF-8 Bytes" error in certain failed combinations.
            // The result we want/expect is an empty string
            // More Info: https://eclipsesource.com/blogs/2016/06/08/decoding-symmetric-cyphers-with-crypto-js/
            log.debug("Decrypting password failure", {
                message: e.message,
                stack: e.stack,
            });
        }
        if (output === "") {
            throw Error("There was an error with the DocuSign account.  Please try logging out and back in and trying again.  If the problem persists, please contact the NetSuite Administrator to re enter the DocuSign account credentials.");
        }
        return output;
    };
    /**
     * @desc  Check if the DocuSign SOBO account is changed by NetSuite Admin
     * @return {boolean} result - true if the DocuSign SOBO account is changed by NetSuite Admin else return false
     */
    exports.isDSAccountChanged = function () {
        log.debug("isDSAccountChanged()", "Checking to see if DS account has been changed...");
        var result = false;
        var soboEmail = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_username" });
        if (!soboEmail) {
            log.error(n.acctNotConfigured, "Missing custscript_docusign_username");
            throw new Error(n.acctNotConfigured);
        }
        var srch = search.create({
            type: "customrecord_docusign_account_settings",
            columns: ["custrecord_docusign_email"],
            filters: [["custrecord_docusign_email", "IS", soboEmail]],
        });
        var dsSOBOAcctRrdEmail = "";
        srch.run().each(function (result) {
            var resultEmail = result.getValue("custrecord_docusign_email");
            if (resultEmail) {
                dsSOBOAcctRrdEmail = resultEmail.toString();
            }
            return false;
        });
        log.debug("isDSAccountChanged", JSON.stringify({
            soboEmail: soboEmail,
            dsSOBOAcctRrdEmail: dsSOBOAcctRrdEmail,
        }));
        if (dsSOBOAcctRrdEmail) {
            if (soboEmail &&
                runtime
                    .getCurrentScript()
                    .getParameter({ name: "custscript_docusign_password" }) &&
                runtime
                    .getCurrentScript()
                    .getParameter({ name: "custscript_docusign_environment" }) &&
                runtime
                    .getCurrentScript()
                    .getParameter({ name: "custscript_docusign_username" }) !== "" &&
                runtime
                    .getCurrentScript()
                    .getParameter({ name: "custscript_docusign_password" }) !== "" &&
                runtime
                    .getCurrentScript()
                    .getParameter({ name: "custscript_docusign_environment" }) !== "") {
                if (dsSOBOAcctRrdEmail !== soboEmail) {
                    result = true;
                }
            }
            else {
                result = true;
            }
        }
        else {
            result = true;
        }
        log.debug("isDSAccountChanged()", "Has it changed? " + (result === true));
        return result;
    };
    /**
     * @desc  Convert the date object to xsd date string
     * @param {date} date - the date object to be converted
     * @return {string} - the formatted date string
     */
    exports.xsdDateTime = function (date) {
        function pad(n) {
            var s = n.toString();
            return s.length < 2 ? "0" + s : s;
        }
        var yyyy = date.getFullYear();
        var mm1 = pad(date.getMonth() + 1);
        var dd = pad(date.getDate());
        var hh = pad(date.getHours());
        var mm2 = pad(date.getMinutes());
        var ss = pad(date.getSeconds());
        return yyyy + "-" + mm1 + "-" + dd + "T" + hh + ":" + mm2 + ":" + ss;
    };
    /**
     * @desc  Encode the special XML characters
     * @param {string} xml - the xml to be encoded
     * @return {string} result - the encoded xml
     */
    exports.encodeSpecialXMLChars = function (xml) {
        var result = "";
        if (xml) {
            result = xml
                .replace(/&/g, "&#x26;")
                .replace(/</g, "&#x3C;")
                .replace(/>/g, "&#x3E;");
        }
        return result;
    };
    /**
     * @desc  Create and return the html code of the DS environment drop down menu
     * @return {string} dsEnvDropDownHTML - the html of the DS environment drop down
     */
    exports.getDSEnvDropDownHTML = function () {
        var dsEnvDropDownHTML = ': <select id="ds_environments_dropdown">';
        var filters = [];
        filters[0] = search.createFilter({
            name: "isinactive",
            operator: search.Operator.IS,
            values: "F",
        });
        var searchResults = search.create({
            filters: filters,
            type: "customrecord_docusign_environment",
        });
        searchResults.run().each(function (result) {
            //Backwards so that Production shows first.
            var type = result.recordType.toString(); //.getValue("type").toString();
            var dsEnvRecord = record.load({
                id: result.id,
                type: type,
            });
            if (dsEnvRecord) {
                dsEnvDropDownHTML +=
                    '<option value="' +
                        dsEnvRecord.getValue("custrecord_docusign_endpoint").toString();
                if (dsEnvRecord.getValue("name").toString() === "Production") {
                    dsEnvDropDownHTML +=
                        '"selected>' + dsEnvRecord.getValue("name").toString() + "</option>";
                }
                else {
                    dsEnvDropDownHTML +=
                        '">' + dsEnvRecord.getValue("name").toString() + "</option>";
                }
            }
            return true;
        });
        dsEnvDropDownHTML += "</select>";
        return dsEnvDropDownHTML;
    };
    /**
     * @desc  Create and return the html code of the DS Custom Button list
     * @param {string} recordType - the NetSuite record type
     * @return {string} dsDSCustomBtnHTML - the html of the DS Custom Button list
     */
    exports.getDSCustomBtnHTML = function (recordType) {
        var dsDSCustomBtnHTML = "";
        var filters = [];
        filters[0] = search.createFilter({
            name: "custrecord_ds_custom_btn_record_type",
            operator: search.Operator.IS,
            values: recordType,
        });
        var columns = [];
        columns[0] = search.createColumn({ name: "internalid" });
        columns[1] = search.createColumn({ name: "name" });
        columns[2] = search.createColumn({
            name: "custrecord_docusign_autoscript_folder_id",
        });
        columns[3] = search.createColumn({
            name: "custrecord_docusign_automation_script_id",
        });
        columns[4] = search.createColumn({
            name: "custrecord_docusign_custom_btn_enable",
        });
        var searchResults = search.create({
            filters: filters,
            columns: columns,
            type: "customrecord_docusign_custom_button",
        });
        var numResults = searchResults.runPaged().count;
        if (searchResults) {
            searchResults.run().each(function (result) {
                if (result) {
                    dsDSCustomBtnHTML +=
                        "&nbsp;&nbsp;&nbsp;&nbsp;<input type='checkbox' class='enableDSCustomBtnCheckbox' id='" +
                            result.getValue("internalid").toString() +
                            "' " +
                            (result.getValue("custrecord_docusign_custom_btn_enable") === "T"
                                ? "checked"
                                : "").toString() +
                            ">&nbsp;" +
                            result.getValue("name").toString() +
                            "&nbsp;&nbsp;&nbsp;<a href='#' class='editDSCustomBtnLink' id='" +
                            result.getValue("internalid") +
                            "' name='" +
                            result.getValue("name").toString() +
                            "' dsAutoScriptFolderId='" +
                            result
                                .getValue("custrecord_docusign_autoscript_folder_id")
                                .toString() +
                            "' dsAutoScriptId='" +
                            result
                                .getValue("custrecord_docusign_automation_script_id")
                                .toString() +
                            "'>Edit</a>&nbsp;&nbsp;<a href='#' class='removeDSCustomBtnLink' id='" +
                            result.getValue("internalid").toString() +
                            "' name='" +
                            result.getValue("name").toString() +
                            "'>Remove</a><br><br>";
                }
                return true;
            });
        }
        return dsDSCustomBtnHTML;
    };
    /**
     * @desc  Create and return the html code of the NS Folder selection drop-down menu
     * @return {string} nsFoldersListHTML - the html of the NS Folder selection drop-down menu
     */
    exports.getNSFolderDropDownHTML = function () {
        var nsFoldersListHTML = '<option value="">Select a folder...</option>';
        var nsFolderJson = {};
        var columns = [];
        columns[0] = search.createColumn({
            name: "internalid",
            sort: search.Sort.ASC,
        });
        columns[1] = search.createColumn({ name: "name" });
        columns[2] = search.createColumn({ name: "parent" });
        var filters = [];
        // log.debug('getNSFolderDropDownHTML()', 'Pre-search: remaining usage = ' + nlapiGetContext().getRemainingUsage());
        var searchResults = search.create({
            columns: columns,
            type: "folder",
        });
        // major changes to this method on 11/24/19 - CH
        var completeResultSet = exports.getAllResults(searchResults);
        if (completeResultSet && completeResultSet.length > 0) {
            for (var i = 0; i < completeResultSet.length; i++) {
                var ident = Number(completeResultSet[i].getValue("internalid"));
                nsFolderJson[ident] = {
                    name: completeResultSet[i].getValue("name"),
                    parent: completeResultSet[i].getValue("parent"),
                };
            }
        }
        for (var nsFolder in nsFolderJson) {
            var folderPath = "";
            var folderParent = "";
            var folderJson = nsFolderJson[nsFolder];
            do {
                if (typeof folderJson !== "undefined" && folderJson !== null) {
                    folderParent =
                        typeof folderJson.parent !== "undefined" && folderJson.parent !== null
                            ? folderJson.parent
                            : "";
                    var folderName = typeof folderJson.name !== "undefined" && folderJson.name !== null
                        ? folderJson.name
                        : "...";
                    folderPath = "\\" + folderName + folderPath;
                    if (folderParent !== "") {
                        folderJson = nsFolderJson[folderParent];
                    }
                }
                else {
                    break;
                }
            } while (folderParent !== "");
            nsFoldersListHTML +=
                '<option value="' + nsFolder + '">' + folderPath + "</option>";
        }
        return nsFoldersListHTML;
    };
    /**
     * @desc  Create and return the html code of the NS file selection drop-down menu
     * @return {string} nsFoldersListHTML - the html of the NS file selection drop-down menu
     */
    exports.getNSFileDropDownHTML = function (folderInternalId) {
        var nsFilesListHTML = "";
        var filters = [];
        filters[0] = search.createFilter({
            name: "folder",
            operator: search.Operator.IS,
            values: folderInternalId,
        });
        filters[1] = search.createFilter({
            name: "filetype",
            operator: search.Operator.IS,
            values: "JAVASCRIPT",
        });
        var columns = [];
        columns[0] = search.createColumn({ name: "internalid" });
        columns[1] = search.createColumn({ name: "name" });
        var searchResults = search.create({
            columns: columns,
            filters: filters,
            type: "file",
        });
        var numResults = searchResults.runPaged().count;
        if (searchResults && numResults > 0) {
            searchResults.run().each(function (result) {
                nsFilesListHTML +=
                    "<option value='" +
                        result.getValue("internalid") +
                        "'>" +
                        result.getValue("name") +
                        "</option>";
                return true;
            });
        }
        return nsFilesListHTML;
    };
    /**
     * @desc  Check if the record type has a record type settings
     * @return {boolean} result -
     */
    exports.isSupportedRecordType = function (recordType) {
        var result = false;
        if (recordType && recordType !== "") {
            var recordSettings = exports.getRecordSettings(recordType);
            log.debug("isSupportedRecordType()", "Record type = " +
                recordType +
                ", recordSettings = " +
                JSON.stringify(recordSettings));
            if (recordSettings) {
                result = true;
            }
        }
        return result;
    };
    /**
     * @desc  Return the columns array for searching Record Settings object
     * @return {columns} - array of all the search column for searching Record Settings object
     */
    exports.getRcdSttgsSearchColumns = function () {
        var columns = [];
        columns[0] = search.createColumn({
            name: "internalid",
            sort: search.Sort.ASC,
        });
        columns[1] = search.createColumn({ name: "name" });
        columns[2] = search.createColumn({ name: "custrecord_ns_internal_id" });
        columns[3] = search.createColumn({ name: "custrecord_send_with_docusign" });
        columns[4] = search.createColumn({ name: "custrecord_sign_with_docusign" });
        columns[5] = search.createColumn({ name: "custrecord_primary_contact_only" });
        columns[6] = search.createColumn({
            name: "custrecord_default_email_subject",
        });
        columns[7] = search.createColumn({
            name: "custrecord_default_email_message",
        });
        columns[8] = search.createColumn({
            name: "custrecord_docusign_use_attached_file",
        });
        return columns;
    };
    /**
     * @desc  Return all the Record Settings object
     * @return {Object} - the search result of all the Record Settings object
     */
    exports.getAllRecordSettings = function () {
        var columns = exports.getRcdSttgsSearchColumns();
        return search.create({
            type: "customrecord_docusign_record_settings",
            columns: columns,
        });
    };
    /**
     * @desc  Return the Record Settings JSON of the specific record type
     * @param {string} recordType - the NetSuite record type
     * @return {JSON} - the record settings JSON of the specific record type
     */
    exports.getRecordSettings = function (recordType) {
        if (recordType && recordType !== "") {
            var columns = exports.getRcdSttgsSearchColumns();
            var filters = [];
            filters[0] = search.createFilter({
                name: "custrecord_ns_internal_id",
                operator: search.Operator.IS,
                values: recordType,
            });
            var srch = search.create({
                columns: columns,
                filters: filters,
                type: "customrecord_docusign_record_settings",
            });
            var retResult_1 = null;
            srch.run().each(function (result) {
                retResult_1 = result;
                return true;
            });
            return retResult_1;
        }
    };
    /**
     * @desc  Return all the DocuSign Custom Button of the specific record type
     * @param {String} recordType - the NetSuite record type
     * @param {String} buttonName - [Optional] filter by the display name for the Custom Button
     * @return {Object} - a list of all the DocuSign Custom Button of the specific record type
     */
    exports.getDSCustomButtons = function (recordType, buttonName) {
        var columns = [
            "name",
            "custrecord_docusign_automation_script_id",
            "custrecord_docusign_custom_btn_enable",
            "custrecord_ds_custom_btn_record_type",
            "custrecord_docusign_autoscript_folder_id",
        ];
        var filters = [
            search.createFilter({
                name: "custrecord_ds_custom_btn_record_type",
                operator: search.Operator.IS,
                values: recordType,
            }),
        ];
        if (buttonName) {
            filters.push(search.createFilter({
                name: "name",
                operator: search.Operator.IS,
                values: buttonName,
            }));
        }
        var srch = search.create({
            type: "customrecord_docusign_custom_button",
            filters: filters,
            columns: columns,
        });
        return srch;
    };
    exports.getExistingCustomButtonAttributeValues = function (buttonInternalId) {
        if (!buttonInternalId)
            return null;
        var results = [];
        // query for attached button attributes
        var srch = search.create({
            type: "customrecord_docusign_custom_button_attr",
            filters: [
                [
                    "custrecord_ds_custom_button.internalidnumber",
                    "equalto",
                    buttonInternalId,
                ],
            ],
            columns: [
                search.createColumn({
                    name: "internalid",
                    sort: search.Sort.ASC,
                }),
                "custrecord_ds_btn_type.custrecord_ds_btn_scrpt_name",
                "custrecord_ds_btn_value",
                "custrecord_ds_custom_button",
                "custrecord_ds_btn_type.custrecord_ds_attr_data_type",
                "custrecord_ds_attr_document",
            ],
        });
        srch.run().each(function (result) {
            var type = n.custom_button_type_name[result
                .getValue({
                join: "custrecord_ds_btn_type",
                name: "custrecord_ds_btn_scrpt_name",
            })
                .toString()
                .toLowerCase()];
            var columnName = n.customBtnFields[type];
            var value = result
                .getValue({
                name: "custrecord_ds_btn_value",
            })
                .toString();
            var parentButton = Number(result.getValue({
                name: "custrecord_ds_custom_button",
            }));
            var dataType = result
                .getValue({
                join: "custrecord_ds_btn_type",
                name: "custrecord_ds_attr_data_type",
            })
                .toString();
            var documentId = "";
            var document = result.getValue({
                name: "custrecord_ds_attr_document",
            });
            if (util.isString(document.valueOf())) {
                documentId = document.toString();
            }
            results.push({
                internalid: result.id,
                type: type,
                value: value,
                parentButton: parentButton,
                dataType: dataType,
                documentFileId: documentId,
                columnName: columnName,
            });
            return true;
        });
        return results;
    };
    /**
     * @desc  Checks that the properties of a given object all exist
     * @param {object} obj - a JavaScript object
     * @param {array} properties - a list of property names to check for
     * @return {string} - name of property if that property does not exist, empty string otherwise
     */
    exports.checkProperties = function (obj, properties) {
        for (var i in properties) {
            var prop = properties[i];
            if (!(prop in obj)) {
                return prop;
            }
        }
        return "";
    };
    /**
     * @desc  Checks if the given file is larger than the NS limit
     * @param {object} file - a File object (its content should be base64-encoded)
     * @return {boolean} - true if file is large, false otherwise
     */
    exports.isLargeFile = function (f) {
        /*
         * According to Wikipedia, this is the formula to calculate the length
         * of a base64-encoded string:
         *
         * bytes = (string_length(encoded_string) - 814) / 1.37
         *
         * However, this is only approximate. To be on the safe side, a ratio
         * of 1.35 is used to make the number of bytes larger than it is. This
         * will trigger the warning when the file size is near the limit, which
         * is what we want anyway.
         */
        var bytes = f.content.length / 1.35;
        return bytes > 5242880; // larger than 5MB?
    };
    /**
     * @desc  Get the permisson level
     * @param {string} permissionName - the name of the permission
     * @return {int} - the NetSuite permission level
     */
    exports.getPermission = function (permissionName) {
        return runtime.getCurrentUser().getPermission({ name: permissionName });
        // return nlapiGetContext().getPermission(permissionName);
    };
    /**
     * @desc  Validate if the user has required file cabinet permissons to use DocuSign for NetSuite
     * @param {Object} docusignContext - An opaque object that contains various information about the current context.
     * @return {string} - error message if user doesn't have required file cabinet permissions, otherwise return empty string
     */
    exports.validateFilePermission = function (docusignContext) {
        //Check if the user has at least "View" permission for "File Cabinet" in NetSuite
        if (exports.getPermission("LIST_FILECABINET") < 1) {
            return "NOTE: When sending a document through DocuSign, you must have at least 'View' permissions to the File Cabinet in NetSuite.  This is required in order for DocuSign to access the files from the File Cabinet for this object to send.  You currently do not have sufficient permissions and access to the File Cabinet to perform this action.  This is not an error, and nothing is broken, this is a note explaining why you cannot send with DocuSign from this object.  If you believe you have received this message incorrectly, contact your NetSuite administrator.";
        }
        return "";
    };
    /**
     * @desc  Validate if the user has all the required permissons to use DocuSign Update
     * @param {Object} docusignContext - An opaque object that contains various information about the current context.
     * @return {string} - error message if user doesnt have the required permissions to use DocuSign Update, otherwise return empty string
     */
    exports.validateUserPermission = function (docusignContext) {
        //Check if the user has Edit(3) or Full(4) permission for "File Cabinet" in NetSuite
        if (exports.getPermission("LIST_FILECABINET") < 3) {
            return "NOTE: When updating a DocuSign envelope manually, using the Update button, you must have either Edit or Full permissions to the File Cabinet in NetSuite.  This is required in order for DocuSign to save the files to the File Cabinet.  You currently do not have sufficient permissions to perform this action.  Note that documents will automatically write back to NetSuite (Signed PDF) on a schedule, so you might not even need to click the Update button.  This is not an error, and nothing is broken, this is a note explaining why you cannot update the DocuSign envelopes.  If you believe you have received this message incorrectly, contact your NetSuite administrator.";
        }
        //Check if the user has permission to access the object(opportunity, estimate etc...)
        var signedDocId;
        try {
            var f = file.create({
                // const file = nlapiCreateFile(
                name: "TEST",
                fileType: file.Type.PLAINTEXT,
                contents: "Test File for validating user permission.",
            });
            var dsFolderId = exports.getFolderId(exports.DOCUSIGNED_FOLDER_NAME);
            f.folder = dsFolderId;
            signedDocId = f.save();
            var id = record.attach({
                record: {
                    type: "file",
                    id: signedDocId,
                },
                to: {
                    type: docusignContext.recordType,
                    id: docusignContext.recordId,
                },
            });
        }
        catch (e) {
            var errorMessage = "Insufficient Permission Error: ";
            // if (e instanceof ) {
            if (e.name === "INSUFFICIENT_PERMISSION") {
                return "NOTE: When updating a DocuSign envelope manually, using the Update button, you must have either Edit or Full permissions to the object in NetSuite you are updating from.  You currently do not have sufficient permissions and access to the object (such as Opportunity, Estimate, or Customer) to perform this action.  Note that documents will automatically write back to NetSuite (Signed PDF) on a schedule, so you might not even need to click the Update button.  This is not an error, and nothing is broken, this is a note explaining why you cannot send with DocuSign from this object.";
            }
            else {
                errorMessage += "[" + e.message + "] " + e.toString();
            }
            // } else {
            //   errorMessage += e;
            // }
            log.debug("validateUserPermission()", errorMessage);
            return errorMessage;
        }
        finally {
            if (signedDocId) {
                try {
                    record.detach({
                        record: {
                            type: "file",
                            id: signedDocId,
                        },
                        from: {
                            type: docusignContext.recordType,
                            id: docusignContext.recordId,
                        },
                    });
                }
                catch (e) {
                    /*Do Nothing if the user doesnt have permission to detach the test file from record*/
                }
            }
        }
        return "";
    };
    /**
     * @desc  Check if an object is null
     * @param {Object} obj - an object
     * @return {boolean} - return true if the obj is not null, false otherwise
     */
    exports.isNotNull = function (obj) {
        return typeof obj !== "undefined" && obj !== null;
    };
    /**
     * @desc  Check if the file name match any of the searches
     * @param {string} fileName - the file name
     * @param {list} searches - the list of searches (with keywords and search type)
     * @return {boolean} - true if file name match any of the searches, false otherwise
     */
    exports.matchFound = function (fileName, searches) {
        var result = false;
        if (exports.isNotNull(fileName)) {
            for (var i in searches) {
                var search_1 = searches[i];
                if (exports.isNotNull(search_1) &&
                    exports.isNotNull(search_1.type) &&
                    exports.isNotNull(search_1.keyword)) {
                    switch (search_1.type.toLowerCase()) {
                        case "broad":
                            var keywords = search_1.keyword.split(" ");
                            for (var j in keywords) {
                                if (exports.isNotNull(keywords[j])) {
                                    if (fileName.toLowerCase().indexOf(keywords[j].toLowerCase()) !==
                                        -1)
                                        return true;
                                }
                            }
                            break;
                        case "phrase":
                            if (exports.isNotNull(search_1.keyword)) {
                                if (fileName.toLowerCase().indexOf(search_1.keyword.toLowerCase()) !==
                                    -1)
                                    return true;
                            }
                            break;
                        case "exact":
                            if (fileName === search_1.keyword)
                                return true;
                            break;
                        default:
                            break;
                    }
                }
            }
        }
        return result;
    };
    /**
     * @desc  Check if the files array include any template
     * @param  {array} file.File - the file array
     * @return  {boolean} - true if files array include template, otherwise false
     */
    exports.includeTemplate = function (files) {
        var result = false;
        if (exports.isNotNull(files)) {
            for (var i in files) {
                var f = files[i];
                if (exports.isNotNull(f.type) && f.type.toLowerCase() === "template") {
                    result = true;
                    break;
                }
            }
        }
        return result;
    };
    /**
     * @desc Check if an email address is properly formatted.
     * @param {string} email - The email address to validate.
     * @returns {boolean} True if the email is formatted properly, false otherwise.
     */
    exports.isValidEmail = function (email) {
        var emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])$/i;
        return emailRegex.test(email);
    };
    exports.getAllResults = function (search) {
        var results = search.run();
        var searchResults = [];
        var searchid = 0;
        do {
            var resultslice = results.getRange({
                start: searchid,
                end: searchid + 1000,
            });
            resultslice.forEach(function (slice) {
                searchResults.push(slice);
                searchid++;
            });
        } while (resultslice.length >= 1000);
        return searchResults;
    };
    /**
     * @desc  Gets the uesrs username and password. Also returns the decrypted password as well.
     * @return  {dsCredentials} - object containing username, encypted_password
     */
    exports.getDSUserCustomSettings = function () {
        var username = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_username" });
        if (username === null) {
            username = "";
        }
        else {
            username = username.toString();
        }
        var encrypted_password = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_password" });
        if (encrypted_password === null) {
            encrypted_password = "";
        }
        else {
            encrypted_password = encrypted_password.toString();
        }
        var environment = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_environment" });
        if (environment === null) {
            environment = "";
        }
        else {
            environment = environment.toString();
        }
        var accountid = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_account_id" });
        if (accountid === null || accountid === undefined) {
            accountid = 0;
        }
        else {
            accountid = parseInt(accountid.toString());
        }
        var api_accountid = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_api_account_id" });
        if (api_accountid === null) {
            api_accountid = "";
        }
        else {
            api_accountid = api_accountid.toString();
        }
        return {
            username: username,
            encrypted_password: encrypted_password,
            environment: environment,
            accountid: accountid,
            api_accountid: api_accountid,
        };
    };
    exports.getApiAcctId = function () {
        return runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_api_account_id" })
            .toString();
    };
    exports.createEncryptionKey = function () {
        var encryption_key = exports.getRandomHexString(32);
        var key_file = null;
        var folderid = exports.getFolderIdForFile("ds_config_sl.js");
        var contents = "/**\n    * @NApiVersion 2.1\n    */\n    define([\"require\", \"exports\"], function (require, exports) {\n    Object.defineProperty(exports, \"__esModule\", { value: true });\n      exports.encryption_key = '" +
            encryption_key +
            "';\n    });";
        try {
            key_file = file.load({
                id: "./ds_keys.js",
            });
        }
        catch (e) {
            log.debug("ds_keys.js not found", "continuing ... ");
        }
        if (key_file !== null) {
            file.delete({
                id: key_file.id,
            });
        }
        // create the file
        key_file = file.create({
            fileType: file.Type.JAVASCRIPT,
            name: "ds_keys.js",
            contents: contents,
            folder: folderid,
        });
        key_file.save();
    };
    /**
     * @description Feed in a filename and get the id of it's parent folder back
     * @param filename the name of the file which resides in the
     * the folder whose id will be returned
     */
    exports.getFolderIdForFile = function (filename) {
        var folderid = null;
        var fileSearchObj = search.create({
            type: "file",
            filters: [["name", "is", filename]],
            columns: ["folder"],
        });
        fileSearchObj.run().each(function (result) {
            folderid = Number(result.getValue({ name: "folder" }).toString());
            return true;
        });
        return folderid;
    };
    /**
     * @description - this lets the config screen know if the installing Admin
     * has clicked the 'One Time Configuration' button. This method will return
     * true is that has been completed.
     */
    exports.isOneTimeConfigured = function () {
        // need a way to test if we have the key created
        var k = key.encryption_key;
        if (k && k.length === 32) {
            return true;
        }
        return false;
    };
    /**
     * @description This will return an object containing a list of folder contents
     * @param folderId internalid of the netsuite file cabinet folder
     */
    exports.getFolderContents = function (folderId) {
        var list = [];
        var fileSrch = search.create({
            type: "file",
            filters: [["folder", "anyof", folderId]],
            columns: [
                search.createColumn({
                    name: "name",
                    sort: search.Sort.ASC,
                }),
            ],
        });
        fileSrch.run().each(function (result) {
            list.push({
                internalid: Number(result.id),
                name: result.getValue({ name: "name" }).toString(),
            });
            return true;
        });
        return list;
    };
    /**
     * @description Retreives a custom button record from NetSuite DB and returns the
     * record's values
     * @param btnInternalid The internalidof the custom button record in NetSuite
     */
    exports.getSingleCustomButton = function (btnInternalid) {
        var btn = null;
        var btnSrch = search.create({
            type: "customrecord_docusign_custom_button",
            filters: [["internalid", "anyof", btnInternalid]],
            columns: [
                "name",
                "custrecord_ds_custom_btn_record_type",
                "custrecord_docusign_autoscript_folder_id",
                "custrecord_docusign_automation_script_id",
                "custrecord_docusign_custom_btn_enable",
            ],
        });
        btnSrch.run().each(function (result) {
            var name = result.getValue({ name: "name" }).toString();
            var type = result
                .getValue({ name: "custrecord_ds_custom_btn_record_type" })
                .toString();
            var folderId = result
                .getValue({ name: "custrecord_docusign_autoscript_folder_id" })
                .toString();
            var scriptId = result
                .getValue({ name: "custrecord_docusign_automation_script_id" })
                .toString();
            // get the value from the ns search object
            var enableVal = result.getValue({
                name: "custrecord_docusign_custom_btn_enable",
            });
            var enable = false;
            // if we have an object we can do the comparison
            if (enableVal)
                enable = enableVal == true;
            btn = {
                name: name,
                custrecord_ds_custom_btn_record_type: type,
                custrecord_docusign_automation_script_id: Number(scriptId),
                custrecord_docusign_autoscript_folder_id: Number(folderId),
                custrecord_docusign_custom_btn_enable: enable,
            };
            return false;
        });
        return btn;
    };
    exports.getRecipientSublistRecords = function (buttonInternalId) {
        var recipients = [];
        var srch = search.create({
            type: "customrecord_ds_custom_btn_recipient",
            filters: [
                [
                    "custrecord_ds_custom_button_recip_parent.internalidnumber",
                    "equalto",
                    buttonInternalId,
                ],
            ],
            columns: [
                search.createColumn({
                    name: "scriptid",
                    sort: search.Sort.ASC,
                }),
                "custrecord_ds_custom_button_recip_parent",
                "custrecord_ds_cust_btn_first_name",
                "custrecord_ds_cust_btn_last_name",
                "custrecord_ds_cust_btn_email",
            ],
        });
        srch.run().each(function (result) {
            var first = result.getValue({ name: "custrecord_ds_cust_btn_first_name" });
            var firstName = util.isString(first) ? first.toString() : "";
            var last = result.getValue({ name: "custrecord_ds_cust_btn_last_name" });
            var lastName = util.isString(last) ? last.toString() : "";
            var _email = result.getValue({ name: "custrecord_ds_cust_btn_email" });
            var email = util.isString(_email) ? _email : "";
            var id = result.id;
            recipients.push({
                id: id,
                firstName: firstName,
                lastName: lastName,
                email: email,
            });
            return true;
        });
        return recipients;
    };
    exports.getMergeFieldSublistRecords = function (buttonInternalId) {
        var mrg_fields = [];
        var srch = search.create({
            type: "customrecord_ds_merge_field",
            filters: [
                [
                    "custrecord_ds_mrg_cust_btn.internalidnumber",
                    "equalto",
                    buttonInternalId,
                ],
            ],
            columns: [
                "custrecord_ds_mrg_cust_btn",
                "custrecord_ds_mrg_rcd_id",
                "custrecord_ds_template_id",
                "custrecord_ds_recipient_id",
                "custrecord_ds_recipient_role",
                "custrecord_ds_mrg_tab_id",
                "custrecord_ds_tab_type",
                "custrecord_ds_tab_label",
                "custrecord_ds_ns_fld",
            ],
        });
        srch.run().each(function (result) {
            var btn = result.getValue({ name: "custrecord_ds_mrg_cust_btn" });
            var button_id = util.isString(btn) ? btn.toString() : "";
            var recid = result.getValue({ name: "custrecord_ds_mrg_rcd_id" });
            var record_id = util.isString(recid) ? recid.toString() : "";
            var template = result.getValue({ name: "custrecord_ds_template_id" });
            var template_id = util.isString(template) ? template.toString() : "";
            var recipient = result.getValue({ name: "custrecord_ds_recipient_id" });
            var recipient_id = util.isString(recipient) ? recipient.toString() : "";
            var recipientR = result.getValue({ name: "custrecord_ds_recipient_role" });
            var recipient_role = util.isString(recipientR) ? recipientR.toString() : "";
            var tabT = result.getValue({ name: "custrecord_ds_tab_type" });
            var tab_type = util.isString(tabT) ? tabT.toString() : "";
            var tab = result.getValue({ name: "custrecord_ds_mrg_tab_id" });
            var tab_id = util.isString(tab) ? tab.toString() : "";
            var label = result.getValue({ name: "custrecord_ds_tab_label" });
            var tab_label = util.isString(label) ? label.toString() : "";
            var ns = result.getValue({ name: "custrecord_ds_ns_fld" });
            var ns_field = util.isString(ns) ? ns.toString() : "";
            var id = result.id;
            mrg_fields.push({
                id: id,
                button_id: button_id,
                record_id: record_id,
                template_id: template_id,
                recipient_id: recipient_id,
                recipient_role: recipient_role,
                tab_id: tab_id,
                tab_type: tab_type,
                tab_label: tab_label,
                ns_field: ns_field,
            });
            return true;
        });
        return mrg_fields;
    };
    exports.getCustomButtonFile = function (documentFileId) {
        var _file = file.load({ id: documentFileId });
        return {
            name: _file.name,
            content: _file.getContents(),
        };
    };
    /**
     * @description Tries to remove sensitive data from a JSON object for logging.
     * Any non-json object will be returned as is.
     * @param json - Expected to be JSON or a stringified JSON object.
     */
    exports.sanitizeJsonForLogs = function (json) {
        if (typeof json !== "object" || !json)
            return json;
        var fieldsToSanitize = [
            "password",
            "custpage_ds_password",
            "encryptedapipassword",
            "encryptedPassword",
        ];
        var data = __assign({}, json);
        Object.keys(data).forEach(function (prop) {
            if (fieldsToSanitize.includes(prop.toLowerCase())) {
                data[prop] = "NOT INCLUDED IN LOGS";
            }
        });
        return JSON.stringify(data);
    };
    exports.logError = function (e) {
        log.error({
            title: e.message,
            details: e.message + " " + e.stack,
        });
    };
    exports.removeSoboUserSettings = function () {
        var companyConfig = config.load({ type: config.Type.COMPANY_PREFERENCES });
        companyConfig.setValue("custscript_docusign_username", "");
        companyConfig.setValue("custscript_docusign_password", "");
        companyConfig.setValue("custscript_docusign_environment", "");
        companyConfig.setValue("custscript_docusign_account_id", "");
        companyConfig.setValue("custscript_docusign_api_account_id", "");
        companyConfig.save();
        // clear the cache
        dsc.clearAll();
    };
    /**
     * @desc  This function provides the following DocuSign Service:
     *        - Automate DS operations in NS
     * @param {object} docusignContext - a complex object holding letious information about the current Netsuite record, such as recordType and recordId
     * @return {Object} - an object containing the following fields:
     * {string} viewUrl - the URL of the DS envelope view
     * {string} envelopeId - the DS envelope ID
     */
    exports.automate = function (docusignContext) {
        var script = null;
        // we should get the button id from the restlet call so we go and
        // look for it, if it's not there all we can do is bail out
        if (!docusignContext.dsCustomBtnId) {
            throw error.create({
                name: "Custom button record id not found",
                message: "Custom button id was not passed into 'automate()' function",
            });
        }
        // see if the button acutally exists
        var btn = record.load({
            id: docusignContext.dsCustomBtnId,
            type: "customrecord_docusign_custom_button",
            isDynamic: true,
        });
        if (!btn) {
            throw error.create({
                name: "Custom button record not found",
                message: "Custom button id: " + docusignContext.dsCustomBtnId + " not found.",
            });
        }
        // try pulling the scriptId from the button's record, if it's there then assume
        // this will be a script button call
        var scriptFileId = btn.getValue({
            fieldId: "custrecord_docusign_automation_script_id",
        });
        if (scriptFileId) {
            docusignContext.dsAutomationScriptId = scriptFileId.toString();
            // note the extra '()' around the line below, we're invoking the value
            return customScriptRunner.executeCustomScript(docusignContext);
        }
        else {
            return runFormButton(docusignContext, btn);
        }
    };
    exports.getCustomButtonRecipients = function (recordType, recordId, btnId) {
        var formValues = exports.getCustomButtonFormValues(btnId);
        var allRecipients = !formValues.loadrecordcontacts
            ? []
            : apicommon.getAttachedContactsArray(recordType, recordId, exports.getRecordSettings(recordType), 1, 1, 1);
        /** Get and add additional recipients sublist values */
        var addlRecipients = exports.getRecipientSublistRecords(btnId);
        /** get the starting point for id from current recipient list */
        var maxId = allRecipients.length === 0
            ? 1
            : Math.max.apply(Math, allRecipients.map(function (recip) {
                return recip.id;
            })) + 1;
        addlRecipients.forEach(function (r, idx) {
            allRecipients.push({
                id: idx + maxId,
                email: r.email,
                name: r.firstName + " " + r.lastName,
                order: 1,
            });
        });
        return allRecipients;
    };
    var runFormButton = function (docusignContext, btn) {
        var formValues = exports.getCustomButtonFormValues(btn.id.toString());
        var recipients = [];
        var email = {
            blurb: formValues.emailbody,
            subject: formValues.emailsubject,
        };
        var files = formValues.loadrecordattachments
            ? api.docusignGetFiles(docusignContext)
            : [];
        var allRecipients = exports.getCustomButtonRecipients(docusignContext.recordType, docusignContext.recordId, btn.id.toString());
        if (formValues.document) {
            files.push(exports.getCustomButtonFile(formValues.document));
        }
        /*
          Apply merge fields
          When using merge fields, all recipients will be added to the template.signers,
          otherwise they'll be added as recipients collection
        */
        if (formValues.template) {
            var template = api.docusignGetTemplateSigners(formValues.template);
            if (formValues.usedatamerge) {
                var mergeFields = exports.getMergeFields(docusignContext.dsCustomBtnId, docusignContext.recordId);
                // Map template roles to their matching contact...
                var mappedSigners = exports.mapRecipientRoles(docusignContext.contactMap, template.signers, allRecipients);
                log.debug("Applying Merge Fields", {
                    map: docusignContext.contactMap,
                    allRecipients: allRecipients,
                    formValues: formValues,
                });
                var _loop_1 = function (i) {
                    var recip = mappedSigners[i];
                    if (!recip.role)
                        return "continue"; //No role, nothing to match
                    recip.tabs = mergeFields.filter(function (mf) { return mf.recipientId == recip.id; });
                };
                //Apply merge fields.
                for (var i = 0; i < mappedSigners.length; i++) {
                    _loop_1(i);
                }
                template.signers = mappedSigners;
            }
            else {
                //If we don't use merge fields, make sure recipients are added.
                recipients = allRecipients;
            }
            log.debug("Mapped Template", template.signers);
            files.push(template);
        }
        else {
            // Not using merge fields, attach recipients to be added to the envelope.
            recipients = allRecipients;
        }
        return api.docusignPopulateEnvelope(docusignContext, recipients, files, email);
    };
    var runScriptButton = function (docusignContext) {
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
        // check if file is empty
        if (_file.getContents() === "")
            throw error.create({
                name: "Empty Script",
                message: "The script file(" + _file.name + ") is empty.",
            });
        // check if either docusignPopulateEnvelope() or docusignSignEnvelope() will be called.
        if (_file.getContents().indexOf("docusignPopulateEnvelope") === -1 &&
            _file.getContents().indexOf("docusignSignEnvelope") === -1)
            throw error.create({
                name: "Wrong Script Call",
                message: "The script file(" +
                    _file.name +
                    ") must call either docusignPopulateEnvelope() or docusignSignEnvelope().",
            });
        return eval(_file.getContents());
    };
    /**
     * @description Returns an array of tabs with their values for
     * use in envelope creation
     * @param buttonId A custom button internal id
     * @param recordId An internal id of a supported record type
     */
    exports.getMergeFields = function (buttonId, recordId) {
        var mergeFields = [];
        var recMrgFlds = exports.getMergeFieldSublistRecords(buttonId);
        var recTypes = {};
        recMrgFlds.forEach(function (f) {
            var recType = null;
            if (recTypes[f.record_id]) {
                recType = recTypes[f.record_id];
            }
            else {
                recType = search.lookupFields({
                    columns: ["custrecord_ns_internal_id"],
                    id: f.record_id,
                    type: "customrecord_docusign_record_settings",
                });
                if (recType) {
                    recTypes[f.record_id] = recType.custrecord_ns_internal_id;
                    recType = recTypes[f.record_id];
                }
            }
            var value = null;
            if (recType) {
                try {
                    value = search.lookupFields({
                        columns: [f.ns_field],
                        id: recordId,
                        type: recType,
                    });
                }
                catch (error) {
                    // supress this error, user can choose vaules that can and
                    // should not work
                    // logError(error);
                }
                var val = "";
                if (value && value[f.ns_field]) {
                    if (typeof value[f.ns_field] === "object") {
                        if (value[f.ns_field].length > 0) {
                            if (value[f.ns_field][0].text) {
                                val = value[f.ns_field][0].text;
                            }
                        }
                    }
                    else {
                        val = value[f.ns_field];
                    }
                }
                mergeFields.push({
                    value: val || "",
                    tabLabel: f.tab_label,
                    tabId: f.tab_id,
                    tabType: f.tab_type,
                    recipientId: f.recipient_id,
                });
            }
        });
        return mergeFields;
    };
    /**
     * @description Get an object representing the custom button with form values.
     * @param btnId
     */
    exports.getCustomButtonFormValues = function (btnId) {
        var vals = {
            emailsubject: "",
            usedatamerge: false,
            loadrecordattachments: false,
            loadrecordcontacts: false,
            emailbody: "",
            document: "",
            template: "",
            envelopeVoidDate: "",
        };
        // pull down the list of button attributes for this form button
        var attributes = exports.getExistingCustomButtonAttributeValues(btnId);
        attributes.forEach(function (attribute) {
            switch (attribute.type) {
                case n.custom_button_type_name.emailsubject:
                    vals.emailsubject = attribute.value;
                    break;
                case n.custom_button_type_name.emailbody:
                    vals.emailbody = attribute.value;
                    break;
                case n.custom_button_type_name.loadrecordattachments:
                    vals.loadrecordattachments = attribute.value === "T";
                    break;
                case n.custom_button_type_name.loadrecordcontacts:
                    vals.loadrecordcontacts = attribute.value === "T";
                    break;
                case n.custom_button_type_name.template:
                    vals.template = attribute.value;
                    break;
                case n.custom_button_type_name.document:
                    vals.document = attribute.documentFileId;
                    break;
                case n.custom_button_type_name.usedatamerge:
                    vals.usedatamerge = attribute.value === "T";
                case n.custom_button_type_name.envelopevoiddate:
                    vals.envelopeVoidDate = attribute.value;
            }
        });
        return vals;
    };
    /**
     * @description Generate an array of signers from the Template Roles and NS Recipients.  These will be mapped together where applicable.
     * @param contactMap - The mapping between an email and their desired template role
     * @param templateSigners - The list of recipients from the template (Generally empty name/email with an assigned role)
     * @param recipients - List of n.recipient[] NetSuite Recipients.  This will either be custom recipients and/or contacts on the record.
     */
    exports.mapRecipientRoles = function (contactMap, templateSigners, recipients) {
        var results = [];
        if (!contactMap)
            contactMap = [];
        if (!templateSigners)
            templateSigners = [];
        if (!recipients)
            recipients = [];
        log.audit("mapRecipientRoles", "Mapping recipients to template roles.");
        var roleToContactMap = {};
        var emailToContactMap = {};
        var recipMap = {};
        var mappedRecips = {};
        var getRecipKey = function (name, email) {
            return name + "|" + email;
        };
        for (var i = 0; i < contactMap.length; i++) {
            var current = contactMap[i];
            roleToContactMap[current.role] = current;
            emailToContactMap[current.email] = current;
        }
        for (var i = 0; i < recipients.length; i++) {
            var current = recipients[i];
            recipMap[getRecipKey(current.name, current.email)] = current;
        }
        // // Try to map template roles to matching recipients.
        for (var i = 0; i < templateSigners.length; i++) {
            var current = templateSigners[i];
            var roleMap = roleToContactMap[current.role];
            var recipKey = roleMap ? getRecipKey(roleMap.name, roleMap.email) : null;
            var recip = recipMap[recipKey];
            if (recip) {
                //We have a recipient match, let's combine them
                results.push(getMappedSigner(current, recip));
                mappedRecips[recipKey] = true;
            }
            else {
                //This template role was not mapped to a Contact, let's add it for mapping.
                results.push(getMappedSigner(current, null));
            }
        }
        for (var i = 0; i < recipients.length; i++) {
            var current = recipients[i];
            //If we already mapped the contact don't add them again.
            var alreadyMapped = mappedRecips[getRecipKey(current.name, current.email)];
            if (alreadyMapped)
                continue;
            results.push(getMappedSigner(null, current));
        }
        return results;
    };
    var _correlationToken = "";
    /**
     * @description Create a correlation token to ensure all API calls can be correlated
     */
    exports.getCorrelationToken = function () {
        if (!_correlationToken) {
            _correlationToken = uuid.v4();
        }
        return _correlationToken;
    };
    /**
     * @description Get the currently logged in user's DocuSign ID.
     */
    exports.getCurrentDocuSignUser = function () {
        var currentUser = apicommon.getUsersByEmail(runtime.getCurrentUser().email);
        if (!currentUser || currentUser.length === 0)
            return null;
        return currentUser[0];
    };
    /**
     * @description Combine a Template Signer and/or Recipient into a Signer object.
     *  This will handle either the role or the recipient being null.
     * @param templateRole
     * @param recipient
     */
    var getMappedSigner = function (templateRole, recipient) {
        var email = recipient ? recipient.email : "";
        var name = recipient ? recipient.name : "";
        var role = templateRole ? templateRole.role : "";
        //Prefer the ID given from the template
        var id = "1";
        if (templateRole && templateRole.id) {
            id = templateRole.id;
        }
        else if (recipient && recipient.id) {
            id = recipient.id.toString();
        }
        //Prefer the Order given from the template
        var order = "1";
        if (templateRole && templateRole.order) {
            order = templateRole.order.toString();
        }
        else if (recipient && recipient.order) {
            order = recipient.order.toString();
        }
        return {
            id: id,
            email: email,
            name: name,
            role: role,
            order: order,
        };
    };
    exports.getTruncatedString = function (message, maxLength, ellipses) {
        if (ellipses === void 0) { ellipses = "..."; }
        var response = message || "";
        if (response.length >= maxLength) {
            log.debug("getTruncatedString() - Non-truncated string: ", response);
            response = response.substr(0, maxLength - ellipses.length - 1) + " ...";
        }
        return response;
    };
});
