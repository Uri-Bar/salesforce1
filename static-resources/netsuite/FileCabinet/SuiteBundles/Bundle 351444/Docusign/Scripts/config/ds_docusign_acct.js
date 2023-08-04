/**
 * @NApiVersion 2.1
 * @NAmdConfig ./JsLibraryConfig.json
 */
define(["require", "exports", "N/log", "N/ui/serverWidget", "N/error", "N/redirect", "N/url", "N/runtime", "./ds_setup_sobo"], function (require, exports, log, ui, error, rd, url, runtime, sobo) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.buildDocuSignAcctConfigForm = function (context, form) {
        form.addButton({
            label: "Back to DocuSign Configuration",
            id: "custpage_back_to_config_home",
            functionName: "ds_openDSAcctConfigPage",
        });
        // pull the sobo settings and populate default values
        var envVal = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_environment" });
        var env = "";
        if (envVal)
            env = envVal.toString();
        var userVal = runtime
            .getCurrentScript()
            .getParameter({ name: "custscript_docusign_username" });
        var user = "";
        if (userVal)
            user = userVal.toString();
        var acct_field_group = form.addFieldGroup({
            id: "custpage_acct_config_group",
            label: "Configure DocuSign Account",
        });
        acct_field_group.isSingleColumn = true;
        var environment = form.addField({
            id: "custpage_ds_environment",
            label: "Select an Environment",
            type: ui.FieldType.SELECT,
            container: "custpage_acct_config_group",
            source: "customrecord_docusign_environment",
        });
        environment.isMandatory = true;
        environment.defaultValue = env;
        var username = form.addField({
            id: "custpage_ds_username",
            label: "DocuSign Username",
            type: ui.FieldType.TEXT,
            container: "custpage_acct_config_group",
        });
        username.isMandatory = true;
        username.defaultValue = user;
        var password = form.addField({
            id: "custpage_ds_password",
            label: "DocuSign Password",
            type: ui.FieldType.PASSWORD,
            container: "custpage_acct_config_group",
        });
        password.isMandatory = true;
        password.maxLength = 60;
        var configacct = form.addField({
            id: "custpage_ds_save_config",
            label: " ",
            type: ui.FieldType.CHECKBOX,
        });
        configacct.defaultValue = "T";
        configacct.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN,
        });
        form.addSubmitButton({
            label: "Save Configuration",
        });
        return form;
    };
    exports.processDocusignAcctConfig = function (params) {
        var environmentId = params.custpage_ds_environment;
        var username = params.custpage_ds_username;
        var password = params.custpage_ds_password;
        var soboResp = sobo.soboApiCall(username, password, environmentId);
        // if this user has multiple login accounts then we need to show them an account
        // chooser so they can choose which account from the list we need to store.
        if (soboResp &&
            soboResp.restLogin &&
            soboResp.restLogin.loginAccounts &&
            soboResp.restLogin.loginAccounts.length > 1) {
            // save the rest response in the user session so we can retrieve and use it later
            // when the user has made a choice
            var loginAcctString = JSON.stringify(soboResp);
            var userSession = runtime.getCurrentSession();
            userSession.set({
                name: "environmentId",
                value: environmentId,
            });
            userSession.set({
                name: "loginAccounts",
                value: loginAcctString,
            });
            return { accountchooser: true };
        }
        return { config_response: soboResp.response };
    };
    exports.buildAccountChooser = function (context) {
        var _url = url.resolveScript({
            scriptId: "customscript_ds_config_sl",
            deploymentId: "customdeploy_ds_config_sl",
        });
        // we should have stored a list of accounts as a session variable
        // now we go get it
        var accountsSession = runtime.getCurrentSession().get({
            name: "loginAccounts",
        });
        // the api docs say accountSession should be string or null, but it actually returns
        // a type == 'object', at least we can test for that reliably
        var acctSessType = typeof accountsSession;
        // this is here b/c accountSession can be lost due to timeout, if the customer tries to
        // refresh the screen it'll give them an error, in this case we just push them back to the
        // original config suitelet
        if (acctSessType == "object") {
            rd.toSuitelet({
                scriptId: "customscript_ds_config_sl",
                deploymentId: "customdeploy_ds_config_sl",
            });
            return null; // send back null, we check for this later on before rendering
        }
        // parse the session variable into an type safe object to make
        // if easier to work with
        var accounts = JSON.parse(accountsSession);
        // look for accountGuidId, if we have one then we have enough data to
        // save the users account choise
        var params = context.request.parameters;
        if (params.accountIdGuid) {
            saveAccountChoice(params.accountIdGuid, accounts);
            return null;
        }
        // if we get here then we need to build a list of choices for the user
        var list = ui.createList({
            title: "Account List",
        });
        // add a button so they uesr can get back to the suitelet main page if they
        // don't want to continue
        list.addButton({
            label: "Back to DocuSign Configuration",
            functionName: "ds_openDSAcctConfigPage",
            id: "custpage_back_btn",
        });
        // this list will have a single clickable column
        var url_column = list.addColumn({
            id: "account_url",
            type: ui.FieldType.TEXT,
            label: "Your DocuSign credentials are assigned to multiple accounts. Please select an account from the choices below",
            align: ui.LayoutJustification.LEFT,
        });
        // this is the base url for all the rows we'll add
        url_column.setURL({
            url: _url + "&accountchooser=true",
        });
        // this is where we modify the url per row so the user can make a choice
        url_column.addParamToURL({
            param: "accountIdGuid",
            value: "guid",
            dynamic: true,
        });
        // construct a single entry array full of objects that the list will consume
        var results = [];
        accounts.restLogin.loginAccounts.forEach(function (acct, index) {
            var res = {};
            res["account_url"] =
                acct.name + " - " + acct.email + " - " + acct.accountId;
            res["guid"] = acct.accountIdGuid;
            // results.push(res);
            list.addRow({ row: res });
        });
        // return the list back to the render method
        return { pageObject: list };
    };
    /**
     * @deec This method will set up the sobo account choice made by the user
     * @param accountIdGuid the unique GUID corresponding the account chosn by the user
     * @param accounts the list of accounts saved earlier as a session variable
     */
    var saveAccountChoice = function (accountIdGuid, accounts) {
        // make sure we have what we need before proceeding
        if (!accounts ||
            !accounts.restLogin ||
            !accounts.restLogin.loginAccounts ||
            accounts.restLogin.loginAccounts.length === 0) {
            log.error("accounts list session variable missing", accounts);
            rd.toSuitelet({
                scriptId: "customscript_ds_config_sl",
                deploymentId: "customdeploy_ds_config_sl",
                parameters: {
                    config_response: "User account list missing",
                },
            });
            return null;
        }
        // dig out the proper account from our saved list
        accounts.restLogin.loginAccounts.forEach(function (acct) {
            // test for the match, when we get a match we save
            if (acct.accountIdGuid === accountIdGuid) {
                // retrieve the environment session variable we saved eariler
                var environmentId = Number(runtime.getCurrentSession().get({ name: "environmentId" }));
                try {
                    // call the method that does the actual save work
                    var response = sobo.createSoboRecords(accounts.restLogin.apiPassword, acct.userName, environmentId, acct.accountId, acct.accountIdGuid, acct.email);
                    // set up a redicect back to this suitelets main page
                    rd.toSuitelet({
                        scriptId: "customscript_ds_config_sl",
                        deploymentId: "customdeploy_ds_config_sl",
                        parameters: {
                            config_response: response,
                        },
                    });
                }
                catch (e) {
                    log.error("error saveAccountChoice()", e.message);
                    throw error.create({
                        name: e.name,
                        message: e.message,
                    });
                }
            }
        });
        // return null to keep the page empty while the redirect happens
        return null;
    };
});
