/**
 * @NApiVersion 2.1
 * @NAmdConfig ./JsLibraryConfig.json
 * This file includes all the DocuSign API Services.
 */
define(["require", "exports", "N/record", "N/runtime", "N/search", "N/log", "N/config", "../ds_common", "../ds_api", "../ds_cache", "../types/ns_types"], function (require, exports, record, runtime, search, log, config, dc, api, dsc, n) {
    Object.defineProperty(exports, "__esModule", { value: true });
    ("use strict");
    /**
     * @desc  This function provides the following DocuSign Service:
     *        - Provision a DocuSign SOBO account
     * @param username
     * @param password
     * @param environmentId
     * @param accountid
     * @param accountIdGuid
     * @return {n.setupSoboResponse}
     */
    exports.soboApiCall = function (username, password, environmentId, accountid, accountIdGuid) {
        var restResp = {
            response: "",
            restLogin: null,
        };
        log.debug('Clicking "Configure DocuSign" or "Switch DocuSign Account" button', "Employee Name: " +
            runtime.getCurrentUser().name +
            " | ID:" +
            runtime.getCurrentUser().id);
        log.debug("setupSOBOAccount", "Setting up DS account...");
        var response = "";
        var soboEmail = "";
        var soboUserName = "";
        var resp = api.dsapi_restLogin(true, environmentId, username, password);
        try {
            restResp.restLogin = JSON.parse(resp.body);
        }
        catch (e) {
            log.error("soboApiCall() parse error", e.stack);
        }
        if (resp.code === 200) {
            // if the accounts array has one entry then we just take it and run
            // otherwise we have to present choices to the user so they can pick the one
            // they want to use
            if (restResp.restLogin.loginAccounts.length === 1) {
                var dsAccount = restResp.restLogin.loginAccounts[0];
                soboEmail = dsAccount.email;
                soboUserName = dsAccount.userName;
                accountid = dsAccount.accountId;
                accountIdGuid = dsAccount.accountIdGuid;
                // Since we only have one account we go ahead and setup the SOBO Account
                restResp.response = exports.createSoboRecords(restResp.restLogin.apiPassword, username, environmentId, accountid, accountIdGuid, soboEmail);
            }
        }
        else {
            try {
                var error = JSON.parse(resp.body);
                if (error.message) {
                    restResp.response = error.message;
                }
                log.error("Setup DocuSign Account error", response);
            }
            catch (error) { }
        }
        return restResp;
    };
    exports.createSoboRecords = function (apiPassword, username, environmentId, accountid, accountIdGuid, soboEmail) {
        // error check the inputs
        var errorChecks = "";
        if (!apiPassword || apiPassword.length == 0) {
            errorChecks += "Password cannot be empty. ";
        }
        if (!username || username.length == 0) {
            errorChecks += "Username cannot be empty. ";
        }
        if (!environmentId) {
            errorChecks += "EnvironmentId cannot be empty. ";
        }
        if (!accountid || accountid.length == 0) {
            errorChecks += "AccountId cannot be empty. ";
        }
        if (!accountIdGuid || accountIdGuid.length == 0) {
            errorChecks += "AccountIdGuid cannot be empty. ";
        }
        if (!soboEmail || soboEmail.length == 0) {
            errorChecks += "Sobo email cannot be empty. ";
        }
        if (errorChecks.length > 0) {
            log.error("createSoboRecords() input checks failed", errorChecks);
            return errorChecks;
        }
        var encryptedApiPassword = dc.encryptString(apiPassword);
        log.debug("company setup parameters", JSON.stringify({
            username: username,
            encryptedApiPassword: encryptedApiPassword,
            environmentId: environmentId,
            accountid: accountid,
            accountIdGuid: accountIdGuid,
        }));
        try {
            var companyConfig = config.load({
                type: config.Type.COMPANY_PREFERENCES,
            });
            companyConfig.setValue("custscript_docusign_username", soboEmail);
            companyConfig.setValue("custscript_docusign_password", encryptedApiPassword);
            companyConfig.setValue("custscript_docusign_environment", environmentId);
            companyConfig.setValue("custscript_docusign_account_id", accountid);
            companyConfig.setValue("custscript_docusign_api_account_id", accountIdGuid);
            companyConfig.save();
        }
        catch (e) {
            var errorTitle = "Error saving Company Config createSoboRecords()";
            log.error(errorTitle, e.name + " " + e.stack);
            return errorTitle + e.stack;
        }
        //Delete login information for all users
        var srch = search.create({ type: "customrecord_docusign_account_settings" });
        srch.run().each(function (result) {
            record.delete({
                id: result.id,
                type: result.recordType.toString(),
            });
            return true;
        });
        try {
            //Create DS account setting record for the Admin user who created the DS SOBO account.
            var dsAcctSettingsRecord = record.create({
                type: "customrecord_docusign_account_settings",
            });
            dsAcctSettingsRecord.setValue("name", runtime.getCurrentUser().name);
            dsAcctSettingsRecord.setValue("custrecord_docusign_netsuite_user", runtime.getCurrentUser().id);
            dsAcctSettingsRecord.setValue("custrecord_docusign_account_id", accountid);
            dsAcctSettingsRecord.setValue("custrecord_docusign_userid", accountIdGuid);
            dsAcctSettingsRecord.setValue("custrecord_docusign_email", soboEmail);
            dsAcctSettingsRecord.setValue("custrecord_docusign_account_environment", environmentId);
            dsAcctSettingsRecord.setValue("custrecord_docusign_username", username);
            dsAcctSettingsRecord.save();
        }
        catch (e) {
            var errorTitle = "Error saving DocuSign Account Record createSoboRecords()";
            log.error(errorTitle, e.stack);
            return errorTitle + e.stack;
        }
        log.debug("setupSOBOAccount", n.acctConfigSuccess);
        dsc.clearAll();
        return n.acctConfigSuccess;
    };
});
