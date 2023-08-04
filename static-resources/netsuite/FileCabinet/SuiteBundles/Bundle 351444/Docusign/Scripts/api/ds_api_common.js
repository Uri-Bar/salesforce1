/**
 * @NApiVersion 2.1
 * Common methods used across API files.
 */
define(["require", "exports", "N/config", "N/encode", "N/error", "N/file", "N/https", "N/log", "N/record", "N/render", "N/runtime", "N/search", "../types/ns_types", "../ds_common", "../ds_cache"], function (require, exports, config, encode, error, file, https, log, record, render, runtime, search, n, dc, dsc) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @desc  Create and return the headers for making API calls to DocuSign
     * @param verifyDSAccts
     * @param logInAsSobo
     * @param username
     * @param password
     */
    exports.getHeaders = function (logInAsSobo, username, password, verifyDSAcct) {
        var userCreds = dc.getDSUserCustomSettings();
        var dsUsernameParam = userCreds.username;
        var dsUser = typeof username !== "undefined" && username !== null
            ? username
            : dsUsernameParam;
        var dsPass = typeof password !== "undefined" && password !== null
            ? password
            : dc.decryptString(userCreds.encrypted_password);
        var creds = {
            Username: dsUser,
            Password: dsPass,
            IntegratorKey: dc.INTEGRATION_KEY,
        };
        if (logInAsSobo || dc.isSOBOAcctOwner() || verifyDSAcct) {
            log.debug("_getHeaders(" + logInAsSobo + ")", "Logging into DS as SOBO...");
        }
        else {
            log.debug("_getHeaders(" + logInAsSobo + ")", "Logging into DS as a normal user...");
            // need to validate this user
            var user = runtime.getCurrentUser();
            var datain = {
                dsUserEmail: user.email,
                dsUserName: user.name,
                userId: user.id.toString(),
            };
            exports.validateDSUser(datain);
            var actSettings = dc.getAccountSettingRecord(logInAsSobo, runtime.getCurrentUser().email);
            if (!actSettings) {
                throw new Error("This config page needs access to DocuSign templates to work properly. Please add [" + user.email + "] to DocuSign account [" + userCreds.username + "] - Acct. No: " + userCreds.accountid);
            }
            var custrecord_docusign_email = actSettings.getValue("custrecord_docusign_email");
            creds.SendOnBehalfOf = custrecord_docusign_email;
        }
        var correlationToken = dc.getCorrelationToken();
        var headers = {
            "X-DocuSign-Authentication": JSON.stringify(creds),
            "Content-Type": "application/json",
            "User-Agent": dc.INTEGRATION_VERSION,
            "x-correlation-id": correlationToken,
            "x-client-transaction-id": correlationToken,
            "x-docusign-correlationtoken": correlationToken,
        };
        return headers;
    };
    /**
     * @desc  Get the base URL (for REST API calls)
     * @return  string - the base URL
     * @param logInAsSobo
     */
    exports.getBaseUrl = function (logInAsSobo) {
        var baseURL = "";
        var json = JSON.parse(exports.restLogin(logInAsSobo).body);
        if ("errorCode" in json) {
            log.error("dsapi_getBaseUrl()", json.message);
            throw error.create({
                name: json.errorCode,
                message: json.message,
            });
        }
        var accountId = runtime.getCurrentScript().getParameter({
            name: "custscript_docusign_account_id",
        });
        for (var i in json.loginAccounts) {
            if (json.loginAccounts[i].accountId === accountId) {
                baseURL = json.loginAccounts[i].baseUrl;
                break;
            }
        }
        return baseURL;
    };
    /**
     * @description Login into DocuSign
     * @param logInAsSobo
     * @param dsEnvironmentId
     * @param username
     * @param password
     * @param verifyDSAcct
     */
    exports.restLogin = function (logInAsSobo, dsEnvironmentId, username, password, verifyDSAcct) {
        log.debug("restLogin", JSON.stringify({
            logInAsSobo: logInAsSobo,
            dsEnv: dsEnvironmentId,
            username: username,
            password: "Not shown in logs",
            verifyDSAcct: verifyDSAcct,
        }));
        var env = dc.getDSEnvironmentName(dsEnvironmentId);
        var _url = "https://" +
            env +
            ".docusign.net/restapi/v2.1/login_information?api_password=true&include_account_id_guid=true&login_settings=all";
        var headers = exports.getHeaders(logInAsSobo, username, password, verifyDSAcct);
        var restLoginCacheResponse = dsc.dsCache(runtime.getCurrentUser().id).get({
            key: dsc.createKey({
                method: "restLogin",
                url: _url,
                headers: headers,
            }),
            loader: exports.restLoginCache,
            ttl: 300,
        });
        var response = JSON.parse(restLoginCacheResponse);
        var json = JSON.parse(response.body);
        if ("errorCode" in json) {
            log.error("restLogin() error", json.message);
        }
        return response;
    };
    /**
     * @desc  Validate if NetSuite user is configured to use DocuSign
     *        - if the NS user is not yet configured to use DocuSign
     *          - if the NS user(User name + email) is already a member of the DS SOBO account, create a new "DocuSign Account Settings" record and then proceed
     *          - if the NS user(User name + email) is not a member of the DS SOBO account:
     *            - if the NS user (User name + email) already exists in DocuSign
     *              return "OpenProvisioningDialogBox" - a Provisioning Dialog Box will be opened for user to enter an unique user name and email
     *            - if the NS user (User name + email) does not exist in DocuSign, create a new "DocuSign Account Settings" record and then proceed
     *        - proceed if the NS user is already configured to use DocuSign.
     * @param {string} env - the configured DocuSign environment
     * @param {Object} datain - the input data
     * @return {string} response - the result of the validation
     */
    exports.validateDSUser = function (datain) {
        log.debug("validateDSUser()", "See if NS user is configured for DS...");
        var response = "";
        //Find DS Account Settings Record for current user
        // let asr = dc.getAccountSettingRecord(false);
        // use the cache to get account settings
        var acct_sett_cache = dsc.dsCache(runtime.getCurrentUser().id).get({
            key: dsc.createKey({
                method: "getAccountSettingRecord",
                soboAcct: false,
                dsUserEmail: runtime.getCurrentUser().email,
            }),
            loader: dc.getAcctSettingsCache,
            ttl: 600,
        });
        // the cache returns a string so we parse the output
        // into the typed json we want
        var asr = JSON.parse(acct_sett_cache);
        // sobo user returns out immediately, we do this b/c the sobo user has all the permissions
        // necesary and we can jump right back to sending/signing
        if (dc.isSOBOAcctOwner()) {
            log.debug("validateDSUser()", "Exiting.  We think this user is the SOBO account owner.");
            return "";
        }
        var start = new Date().getTime();
        // if account changed, return out immediately
        if (dc.isDSAccountChanged()) {
            log.debug("validateDSUser()", "Exiting.  Telling the user to log out and back in.");
            return "Your NetSuite Administrator has configured NetSuite with a new DocuSign account. Please log out and log back in to access the updated DocuSign account information.";
        }
        var end = new Date().getTime();
        var userId = "";
        log.debug("validateDSUser()", "isAccountChanged took " + (end - start) + "ms. Account not changed.");
        // https://jira.corp.docusign.com/confu/display/PAR/Authentication+and+User+Flow
        // link above is how we should go about validating a uesr
        if (asr == null) {
            var userEmail = datain.dsUserEmail;
            var userName = datain.dsUserName;
            var createNewRecord = false;
            var dsAccountFound = false;
            var nsUserEmail = runtime.getCurrentUser().email.toLowerCase();
            //User Selected this user account to be configured with DS
            if (datain.dsUserId) {
                var userById = exports.getUserById(datain.dsUserId);
                if (userById) {
                    dsAccountFound = true;
                    userEmail = userById.email;
                    userName = userById.userName;
                    userId = userById.userId;
                    log.debug("Valid DocuSign User", "Use Selected User Account:(" + datain.dsUserId + ") =" + userName);
                }
            }
            // make sure the user is active and check if the users email address is the same we the current
            // netsuite users email address.  If multiple active emails exist, punt to the account selection dialog
            if (!dsAccountFound) {
                var usersByEmail = exports.getUsersByEmail(nsUserEmail, true, false);
                if (usersByEmail.length === 1) {
                    var currentUser = usersByEmail[0];
                    dsAccountFound = true;
                    createNewRecord = true;
                    userEmail = currentUser.email;
                    userName = currentUser.userName;
                    userId = currentUser.userId;
                    log.debug("Valid DocuSign User", "Found User Account:" + userName);
                }
                else if (usersByEmail.length > 1) {
                    // Found second match so throw this to the AccountSelectionDialog
                    log.debug("Valid DocuSign User", "Found Multiple User Account: for user with email(" +
                        nsUserEmail +
                        ")");
                    return "OpenDSUserAcctSelectionDialogBox:" + nsUserEmail;
                }
            }
            if (!dsAccountFound) {
                response =
                    "A user with the email address " +
                        nsUserEmail +
                        " does not exist on the DocuSign account tied to this NetSuite instance. Please contact your administrator";
                log.debug("DocuSign account not found", response);
            }
            if (createNewRecord) {
                // Create a mapping record in NetSuite to identify the corresponding DocuSign user info
                log.debug("validateDSUser()", "We believe we need to create a new mapping record for this user.");
                start = new Date().getTime();
                var accountId = runtime
                    .getCurrentScript()
                    .getParameter({ name: "custscript_docusign_account_id" });
                if (!userEmail)
                    userEmail = runtime.getCurrentUser().email;
                if (!userName)
                    userName = runtime.getCurrentUser().name;
                var env = runtime
                    .getCurrentScript()
                    .getParameter({ name: "custscript_docusign_environment" });
                var asr_1 = record.create({
                    type: "customrecord_docusign_account_settings",
                });
                asr_1.setValue("name", "" + runtime.getCurrentUser().name);
                asr_1.setValue("custrecord_docusign_account_id", accountId);
                asr_1.setValue("custrecord_docusign_userid", userId);
                asr_1.setValue("custrecord_docusign_email", userEmail);
                asr_1.setValue("custrecord_docusign_username", userName);
                asr_1.setValue("custrecord_docusign_account_environment", env);
                asr_1.save();
                end = new Date().getTime();
                log.debug("validateDSUser()", "New record created, took " + (end - start) + " milliseconds.");
            }
        }
        if (response !== "") {
            return response;
        }
        log.debug("validateDSUser()", "Verify if the created account is activated...");
        var userInfo = exports.getUserInformation(userId);
        if (userInfo.userStatus) {
            switch (userInfo.userStatus.toLowerCase()) {
                case "activationsent": {
                    response +=
                        "An account activation email has been sent to the following address (" +
                            asr.custrecord_docusign_email +
                            ").  Please check your email and activate your DocuSign account.";
                    break;
                }
                case "closed": {
                    response +=
                        "You DocuSign account is closed.  Please notify the administrator to reopen your DocuSign account.";
                    break;
                }
            }
        }
        return response;
    };
    /**
     * @desc  Get the list of users in the DS account
     * @return  array accountUsers - a list of DS users
     * @param additionalInfo
     */
    exports.getUsers = function (additionalInfo) {
        var url = additionalInfo
            ? exports.getBaseUrl(true) + "/users?additional_info=true"
            : exports.getBaseUrl(true) + "/users";
        var serverResponse = https.request({
            url: url,
            headers: exports.getHeaders(true),
            method: "GET",
        });
        log.debug("Get User List JSON Response", serverResponse.body);
        var users;
        try {
            users = JSON.parse(serverResponse.body).users;
        }
        catch (e) {
            log.debug("dsapi_getUsers() error!", JSON.stringify(e));
        }
        return users;
    };
    exports.getUsersByEmail = function (email, activeOnly, additionalInfo) {
        var url = exports.getBaseUrl(true) + "/users?email=" + encodeURIComponent(email);
        var users = [];
        if (activeOnly !== false) {
            url += "&status=active";
        }
        if (additionalInfo) {
            url += "&additional_info=true";
        }
        var resp = https.get({
            url: url,
            headers: exports.getHeaders(true),
        });
        if (resp.code !== 200) {
            log.error("Error retrieving DS Users by Email.", {
                code: resp.code,
                message: resp.body,
            });
            return users;
        }
        try {
            users = JSON.parse(resp.body).users;
        }
        catch (err) {
            log.error("Error getting DS User by email", err);
        }
        return users;
    };
    exports.getUserById = function (userId) {
        var url = exports.getBaseUrl(true) + "/users/" + userId;
        var resp = https.get({
            url: url,
            headers: exports.getHeaders(true),
        });
        try {
            return JSON.parse(resp.body);
        }
        catch (err) {
            log.error("Error getting DS User by email", err);
        }
        return null;
    };
    /**
     * @description - This method calls the DocuSign API rest login method
     * and caches the result for future use. The set ofinput parameters,
     * which are stored in the cache.LoaderContext.key string, can vary.
     * Each input parameter variance is executed below and cached for reuse.
     * @param context cache.LoaderContext type from N/cache NetSuite type
     */
    exports.restLoginCache = function (context, retryAttempts) {
        var attempts = 0;
        if (!retryAttempts) {
            retryAttempts = 3;
        }
        //Occasional network errors when attempting to hit the API.  Throwing this in a retry to minimize impact.
        while (attempts < retryAttempts) {
            attempts++;
            try {
                var key = JSON.parse(context.key);
                //Validate the cache key.
                if (!key || !key.url || key.url.substr(0, 4) !== "http")
                    throw new Error("restLoginCache: Invalid Key " + (key || {}).toString());
                var res = https.get({
                    url: key.url,
                    headers: key.headers,
                });
                var resp = {
                    body: res.body,
                    code: res.code,
                    headers: res.headers,
                };
                return JSON.stringify(resp);
            }
            catch (e) {
                log.error({
                    title: e.message,
                    details: {
                        attempts: "Attempt # " + attempts + " of " + retryAttempts,
                        cacheContext: context.key,
                        errorStack: e.stack,
                    },
                });
                if (attempts === retryAttempts) {
                    //Throw error on the last attempt.
                    throw new Error("restLoginCache error: " + e.stack);
                }
            }
        }
    };
    /**
     * Gets information for a user from the current account
     *
     * @userId  guid
     * @return  userInfo object
     */
    exports.getUserInformation = function (userId) {
        var start = new Date().getTime();
        var _url = exports.getBaseUrl(true) + "/users/" + userId;
        var headers = exports.getHeaders(true);
        var serverResponse = https.get({
            url: _url,
            headers: headers,
        });
        var userInfo;
        try {
            userInfo = JSON.parse(serverResponse.body);
        }
        catch (e) {
            log.debug("dsapi_getUserInformation() error!", JSON.stringify(e));
        }
        var end = new Date().getTime();
        log.debug("dsapi_getUserInformation", "Runtime (ms): " + (end - start) + " Info response: " + serverResponse.body);
        return userInfo;
    };
    /**
     * @desc  (Helper Function) Return an array with all contacts attached to the specific NetSuite object
     * @param {string} recordType - the NetSuite record type
     * @param {string} recordId - the NetSuite record id
     * @param {nlobjSearchResult} recordSettings - the Record Settings JSON
     * @param {int} orderNumber - the order number of the recipients
     * @param {int} idBegin - the starting id number of the recipients
     * @param {int} fileNum - the file order number the recipient will be added to.  Each recipient will be assigned the same file id
     * @return {string} response - return an array with all contacts attached to the specific NetSuite object
     */
    exports.getAttachedContactsArray = function (recordType, recordId, recordSettings, orderNumber, idBegin, fileNum) {
        idBegin = idBegin ? idBegin - 1 : 0;
        fileNum = fileNum ? fileNum : 1;
        // this is what we're returning to the caller
        var contactResults = [];
        var results = [];
        var filters = [];
        // getting a list of contacts will be dependant upon the record type from
        // which the envelope is being created. right now we support the types below
        var primaryOnly = recordSettings.getValue("custrecord_primary_contact_only");
        if (primaryOnly !== null) {
            primaryOnly = primaryOnly.toString() === "false" ? false : true;
        }
        else {
            primaryOnly = false;
        }
        recordType = recordType.toLocaleLowerCase();
        switch (recordType) {
            case "customer":
                filters[0] = search.createFilter({
                    name: "internalidnumber",
                    operator: search.Operator.EQUALTO,
                    values: recordId,
                });
                if (primaryOnly) {
                    filters[1] = search.createFilter({
                        name: "role",
                        join: "contact",
                        operator: search.Operator.ANYOF,
                        values: "-10",
                    });
                    results = attachedContactsParamSearch(filters, "customer", "contactPrimary");
                }
                else {
                    results = attachedContactsParamSearch(filters, "customer", "contact");
                }
                break;
            case "opportunity":
            case "estimate":
            case "invoice":
            case "purchaseorder":
            case "salesorder":
                if (primaryOnly) {
                    filters[0] = search.createFilter({
                        name: "internalid",
                        operator: search.Operator.IS,
                        values: recordId,
                    });
                    filters[1] = search.createFilter({
                        name: "mainline",
                        operator: search.Operator.IS,
                        values: "T",
                    });
                    results = attachedContactsParamSearch(filters, "transaction", "contactPrimary");
                }
                else {
                    filters[0] = search.createFilter({
                        name: "internalidnumber",
                        join: "transaction",
                        operator: search.Operator.EQUALTO,
                        values: recordId,
                    });
                    results = attachedContactsParamSearch(filters, "contact", null);
                }
                break;
            default:
                log.debug("recordType not found", "couldnt find the record type for this search.");
                break;
        }
        for (var i = 0; i < results.length; i++) {
            var role = typeof results[i].role !== "undefined" &&
                results[i].role !== null &&
                results[i].role !== ""
                ? results[i].role
                : "";
            var name_1 = typeof results[i].name !== "undefined" &&
                results[i].name !== null &&
                results[i].name !== ""
                ? results[i].name
                : "";
            contactResults.push({
                fileNum: fileNum,
                id: idBegin + i + 1,
                order: orderNumber,
                email: results[i].email,
                name: name_1,
                role: role,
            });
        }
        log.debug("attached contacts array", JSON.stringify(contactResults));
        return contactResults;
    };
    /**
     * @desc  (Helper Function) Return an array with all files attached to the specific NetSuite object
     * @param {string} recordType - the NetSuite record type
     * @param {string} recordId - the NetSuite record id
     * @return {string} response - return an array with all files attached to the specific NetSuite object
     */
    exports.getAttachedFilesArray = function (recordType, recordId) {
        var attachedFilesArray = [];
        var filters = [
            search.createFilter({
                name: "internalid",
                operator: search.Operator.IS,
                values: recordId,
            }),
            search.createFilter({
                name: "name",
                join: "file",
                operator: search.Operator.DOESNOTCONTAIN,
                values: "DOCUSIGNED",
            }),
        ];
        var columns = [
            search.createColumn({
                name: "internalid",
                join: "file",
            }),
            search.createColumn({
                name: "name",
                join: "file",
                sort: search.Sort.ASC,
            }),
        ];
        var srch;
        try {
            srch = search.create({
                columns: columns,
                filters: filters,
                type: recordType,
            });
        }
        catch (e) {
            var errorMsg = "";
            if (e.code === "INSUFFICIENT_PERMISSION" &&
                e.message.indexOf("Permission Violation") !== -1 &&
                e.message.indexOf("Transactions -> Find Transaction") !== -1) {
                errorMsg =
                    "NOTE: When sending a document through DocuSign, you must have Find Transaction permission in NetSuite.  This is required in order for DocuSign to access the files from the File Cabinet for this object to send.  You currently do not have sufficient permissions to perform this action.  This is not an error, and nothing is broken, this is a note explaining why you cannot send with DocuSign from this object.";
            }
            else {
                errorMsg = "[" + e.code + "] " + e.message;
            }
            log.error({ title: e.toString, details: errorMsg });
            throw error.create({
                name: e.code,
                message: errorMsg,
            });
        }
        if (srch) {
            var uniqueFileMap_1 = [];
            srch.run().each(function (result) {
                var fileId = result
                    .getValue({ name: "internalid", join: "file" })
                    .toString();
                if (fileId && fileId !== "" && !uniqueFileMap_1[fileId]) {
                    attachedFilesArray.push(fileId);
                    uniqueFileMap_1[fileId] = fileId;
                }
                return true;
            });
        }
        log.debug("attached files array", JSON.stringify(attachedFilesArray));
        return attachedFilesArray;
    };
    /**
     * @desc  Get the recipients associated with the current record
     *      For example, let’s say there are 3 recipients saved in the NetSuite records.
     *      If the number "3" is passed in through this parameter, then the first recipient will have the id number 3,
     *      the second recipient will have the id number 4, and the third recipient will have the id number 5.
     * @param fileNum
     * @param context
     * @param orderNumber
     * @param idBegin
     */
    exports.getRecipients = function (context, orderNumber, idBegin, fileNum) {
        if (typeof context === "undefined" || context === null) {
            // let asr = dc.getAccountSettingRecord(false);
            // use the cache to get account settings
            var acct_sett_cache = dsc.dsCache(runtime.getCurrentUser().id).get({
                key: dsc.createKey({
                    method: "getAccountSettingRecord",
                    soboAcct: false,
                    dsUserEmail: runtime.getCurrentUser().email,
                }),
                loader: dc.getAcctSettingsCache,
                ttl: 600,
            });
            // the cache returns a string so we parse the output
            // into the typed json we want
            var asr = JSON.parse(acct_sett_cache);
            return [
                {
                    id: 1,
                    order: 1,
                    name: asr.custrecord_docusign_username,
                    email: asr.custrecord_docusign_email,
                },
            ];
        }
        if (typeof orderNumber === "undefined" || orderNumber === null) {
            orderNumber = 1;
        }
        // check the parameters
        exports.validateContext(context);
        if (typeof orderNumber !== "number") {
            throw error.create({
                name: '"orderNumber" argument must be an integer.',
                message: '"orderNumber" argument must be an integer.',
            });
        }
        if (idBegin && typeof idBegin !== "number") {
            throw error.create({
                name: '"idBegin" argument must be an integer.',
                message: '"idBegin" argument must be an integer.',
            });
        }
        // check if user has "Contacts" permission
        if (dc.getPermission("LIST_CONTACT") === 0) {
            return [];
        }
        var recordSettings = dc.getRecordSettings(context.recordType);
        var recipients = exports.getAttachedContactsArray(context.recordType, context.recordId, recordSettings, orderNumber, idBegin, fileNum);
        return recipients;
    };
    /**
     * @desc  Get the files associated with the current record
     * @param searches
     * @param context
     */
    exports.getFiles = function (context, searches) {
        exports.validateContext(context);
        var files = [];
        //Check if user has "File Cabinet" permission
        if (dc.getPermission("LIST_FILECABINET") === 0) {
            return files;
        }
        if (context.recordType === "estimate" && !dc.isNotNull(searches)) {
            try {
                var entityId = parseInt(context.recordId);
                var quote = render.transaction({
                    entityId: entityId,
                    printMode: render.PrintMode.PDF,
                });
                files.push({
                    name: quote.name,
                    content: quote.getContents(),
                });
            }
            catch (e) {
                log.error("nlapiPrintRecord error: " + e.name, e.stack);
            }
        }
        // let's see if we can load up the files
        if (context.recordType !== "estimate" ||
            (context.recordType === "estimate" &&
                dc
                    .getRecordSettings(context.recordType)
                    .getValue("custrecord_docusign_use_attached_file") === "T") ||
            (context.recordType === "estimate" && dc.isNotNull(searches))) {
            var fileIds = exports.getAttachedFilesArray(context.recordType, context.recordId);
            var _loop_1 = function (i) {
                var fileName = "";
                try {
                    var f = file.load({ id: fileIds[i] });
                    log.debug("file object docusignGetFiles()", JSON.stringify(f));
                    fileName = f.name;
                    // only include matched documents, if searches are passed in
                    if (dc.isNotNull(searches) && !dc.matchFound(fileName, searches)) {
                        return "continue";
                    }
                    var fileType = f.fileType.toString();
                    var value = void 0;
                    if (fileType === "CSV" ||
                        fileType === "HTMLDOC" ||
                        fileType === "JAVASCRIPT" ||
                        fileType === "PLAINTEXT" ||
                        fileType === "STYLESHEET" ||
                        fileType === "XMLDOC") {
                        value = encode.convert({
                            string: f.getContents(),
                            inputEncoding: encode.Encoding.UTF_8,
                            outputEncoding: encode.Encoding.BASE_64,
                        });
                    }
                    else {
                        value = f.getContents();
                    }
                    files.push({ name: fileName, content: value });
                    log.debug("n.dsFile[] array", JSON.stringify(files));
                }
                catch (e) {
                    var filters = [];
                    filters[0] = search.createFilter({
                        name: "internalid",
                        operator: search.Operator.IS,
                        values: fileIds[i],
                    });
                    var columns = [];
                    columns[0] = search.createColumn({ name: "name" });
                    try {
                        var srch = search.create({
                            columns: columns,
                            filters: filters,
                            type: "file",
                        });
                        srch.run().each(function (result) {
                            fileName = result.getValue("name").toString();
                            return true;
                        });
                    }
                    catch (e) {
                        /*Do nothing if unable to find fileName*/
                    }
                    // only include matched documents, if searches are passed in
                    if (typeof searches !== "undefined" &&
                        searches !== null &&
                        !dc.matchFound(fileName, searches)) {
                        return "continue";
                    }
                    var errorMessage = "The file (name:" +
                        fileName +
                        " | id:" +
                        fileIds[i] +
                        ") is invalid and cannot be included in DS envelope due to the following reason: ";
                    var errorReason = "";
                    errorReason = "[" + e.id + "] " + e.name + ": " + e.message;
                    if (e.name === "SSS_FILE_SIZE_EXCEEDED") {
                        files.push({ name: fileName, content: errorReason });
                    }
                    log.debug("Validate Attached Files", errorMessage + errorReason);
                }
            };
            for (var i in fileIds) {
                _loop_1(i);
            }
        }
        return files;
    };
    /**
     * @desc  Get the email associated with the current record
     * @return  array - an email object
     * @param context
     */
    exports.getEmail = function (context) {
        exports.validateContext(context);
        // check the parameters
        var email = { subject: "", blurb: "" };
        var recordSettings = dc.getRecordSettings(context.recordType);
        if (recordSettings) {
            email.subject = recordSettings
                .getValue("custrecord_default_email_subject")
                .toString();
            email.blurb = recordSettings
                .getValue("custrecord_default_email_message")
                .toString();
        }
        return email;
    };
    /**
     * @desc  Parse the DocuSign REST API Error Message
     * @return  string result - the parsed error message
     * @param serverResponse
     */
    exports.parseRestErrorMessage = function (serverResponse) {
        return JSON.parse(serverResponse).message;
    };
    /**
     * @desc  Parse the DocuSign SOAP API Error Message
     * @return  string result - the parsed error message
     * @param severResponse
     */
    exports.parseSoapErrorMessage = function (severResponse) {
        var result = "";
        if (severResponse && severResponse !== "") {
            var regEx = /<ErrorReason([^<]*)<\/ErrorReason>/g;
            var element = severResponse.match(regEx);
            if (element) {
                result = element
                    .toString()
                    .replace('<ErrorReason xmlns="missing in Web.Config">', "")
                    .replace("</ErrorReason>", "");
            }
            else {
                regEx = /\<soap\:Text xml\:lang\=\"en\">([^<]*)<\/soap\:Text>/g;
                element = severResponse.match(regEx);
                if (element) {
                    result = element
                        .toString()
                        .replace('<soap:Text xml:lang="en">', "")
                        .replace("</soap:Text>", "");
                }
                else {
                    result = severResponse;
                }
            }
            if (result !== "" && runtime.getCurrentUser().role !== 3) {
                result += " Please notify the administrator.";
            }
        }
        return result;
    };
    /**
     * @desc  Check the file names to see if they are supported by DS
     * @return  string - a string containing all unsupported files
     * @param files
     */
    exports.checkFileTypes = function (files) {
        var url = exports.getBaseUrl(true) + "/unsupported_file_types";
        var serverResponse = https.request({
            url: url,
            headers: exports.getHeaders(true),
            method: "GET",
        });
        var blacklist = {};
        var fileTypes = null;
        try {
            fileTypes = JSON.parse(serverResponse.body).fileTypes;
        }
        catch (error) {
            log.error("parse error dsapi_checkFileTypes", error);
            throw Error(error);
        }
        for (var i in fileTypes) {
            blacklist[fileTypes[i].fileExtension] = null;
        }
        var unsupported = [];
        for (var i in files) {
            var _file = files[i];
            if (!dc.isNotNull(_file.type)) {
                var fileName = files[i].name;
                var fileExtension = fileName.substr(fileName.lastIndexOf(".") + 1);
                if (fileName === fileExtension)
                    unsupported.push(fileName + "(no file extension)");
                if (fileExtension in blacklist)
                    unsupported.push(fileName + "(file type not supported)");
            }
        }
        return unsupported.join(", ");
    };
    /**
     * @desc  Validate the DocuSign Context, throw error if the arguments are not correctly formatted
     * @param context
     */
    exports.validateContext = function (context) {
        // check if docusignContext is null
        if (typeof context !== "object") {
            throw error.create({
                name: '"docusignContext" argument must be an object.',
                message: '"docusignContext" argument must be an object.',
            });
        }
        // check the parameters
        var prop = dc.checkProperties(context, [
            "action",
            "recordType",
            "recordId",
            "domain",
        ]);
        if (prop !== "") {
            throw error.create({
                name: prop,
                message: '"' +
                    prop +
                    '" must be provided as a property of the docusignContext argument.',
            });
        }
        return "";
    };
    /**
     * @desc  Validate the files list, throw error if the arguments are not correctly formatted
     * @param docusignContext
     * @param files
     */
    exports.validateFiles = function (docusignContext, files) {
        if (Object.prototype.toString.call(files) !== "[object Array]") {
            throw new Error("file not array type: files argument is not an array.");
        }
        // check for invalid and large files ( > 5MB )
        var namesOfLargeFiles = [];
        for (var i in files) {
            var _file = files[i];
            var type = _file.type ? _file.type.toLowerCase() : "document";
            var prop = void 0;
            switch (type) {
                case "document":
                    prop = dc.checkProperties(_file, ["name", "content"]);
                    if (prop !== "") {
                        throw new Error(prop +
                            " must be provided as a property of the files argument for document type.");
                    }
                    if (_file.name === "") {
                        throw new Error("The file name cannot be empty. The file name cannot be empty.");
                    }
                    if (_file.content === "") {
                        throw new Error(_file.name + " - the content is empty.");
                    }
                    if (dc.isLargeFile(_file)) {
                        namesOfLargeFiles.push(_file.name);
                    }
                    break;
                case "template":
                    prop = dc.checkProperties(_file, ["id"]);
                    if (prop !== "") {
                        throw new Error(prop +
                            '"' +
                            prop +
                            '" must be provided as a property of the files argument for template type.');
                    }
                    if (dc.isNotNull(_file.signers)) {
                        for (var j in _file.signers) {
                            var signer = _file.signers[j];
                            var prop_1 = dc.checkProperties(signer, [
                                "id",
                                "order",
                                "name",
                                "email",
                                "role",
                            ]);
                            if (prop_1 !== "") {
                                throw new Error(prop_1 +
                                    '" must be provided as a property of the signer argument for template type.');
                            }
                        }
                    }
                    break;
                case "attachment":
                    if (dc.isNotNull(_file.searches)) {
                        for (var k in _file.searches) {
                            var search_1 = _file.searches[k];
                            prop = dc.checkProperties(search_1, ["keyword", "type"]);
                            if (prop !== "") {
                                throw new Error(prop +
                                    '" must be provided as a property of the search argument for attachment type.');
                            }
                        }
                    }
                    break;
                default:
                    throw new Error("unsupported file type: " + type);
            }
        }
        if (namesOfLargeFiles.length > 0) {
            throw new Error("Found files too large: " +
                'NetSuite currently has a size limitation for files you can send out of, or into NetSuite CRM+.  That limit is currently 5MB.  The file(s), named "' +
                namesOfLargeFiles.join(", ") +
                '", exceeds that limit.  You can still send these documents through DocuSign, but you must download them, and upload them manually to DocuSign if you wish to proceed.');
        }
        if (files.length < 1 && docusignContext.recordType !== "estimate") {
            if (docusignContext.action === "sign") {
                if (dc.getPermission("LIST_FILECABINET") === 0) {
                    // user has no "File Cabinet" permission
                    throw new Error("File Cabinet Permission Missing: " +
                        "You are attempting to Sign with DocuSign as a user who has no access to the Documents in the File Cabinet associated with this object.  Signing with DocuSign requires access to the File Cabinet in NetSuite.");
                }
                else {
                    // no doc is provided when using "Sign with DocuSign" Button
                    throw new Error("File missing: A valid file is missing from this record.");
                }
            }
            else if (docusignContext.action === "automate" &&
                docusignContext.dsAction === dc.DS_SIGN) {
                // no doc is provided when using the automation docusignSignEnvelope method with custom button
                throw error.create({
                    name: "Valid File Missing",
                    message: "No valid file is provided for the files argument of docusignSignEnvelope().",
                });
            }
        }
        // check the validity of the files
        var unsupportedFiles = exports.checkFileTypes(files);
        if (unsupportedFiles !== "") {
            log.error("unsupported file type(s)", unsupportedFiles);
            throw new Error("File not supported The following file(s) are not supported by DocuSign: " +
                unsupportedFiles);
        }
        return "";
    };
    /**
     * @desc  Validate the configured DocuSign SOBO account
     * @return  string response - empty string (if success) or the error message (if fails)
     */
    exports.validateSoboAccount = function () {
        var response = "";
        var creds = dc.getDSUserCustomSettings();
        if (!creds ||
            !creds.username ||
            creds.username === "" ||
            !creds.encrypted_password ||
            creds.encrypted_password === "") {
            log.debug("dsapi_getSoboAccountId()", "DS username and password are empty.");
            if (runtime.getCurrentUser().role !== 3) {
                response +=
                    "There seems to be an issue with the way NetSuite is configured to work with DocuSign. Notify the Administrator that the DocuSign Configuration are not setup correctly.";
            }
            else {
                response += n.acctNotConfigured;
            }
        }
        else {
            if (response === "") {
                var accountID = creds.accountid;
                log.debug("dsapi_validateSoboAccount()", "DS username and password are not empty. Logging into DS as SOBO...");
                var resp = exports.restLogin(true);
                var json = JSON.parse(resp.body);
                var code = resp.code;
                if (code === 200) {
                    if (json.message) {
                        response += "SOBO Account Setup Error: " + json.message;
                    }
                    else {
                        var validAccount = false;
                        var accounts = json.loginAccounts;
                        log.debug("dsapi_validateSoboAccount2()", "Trying to match login account. Accounts found: " +
                            JSON.stringify(accounts));
                        for (var i = 0; i < accounts.length; i++) {
                            if (accounts[i] && accounts[i].accountId) {
                                log.debug("dsapi_validateSoboAccount3()", "Checking if accountID " +
                                    accountID +
                                    " matches " +
                                    accounts[i].accountId);
                                if (accounts[i].accountId == accountID) {
                                    validAccount = true;
                                    break;
                                }
                            }
                        }
                        log.debug("Found valid account?", validAccount === true);
                        if (!validAccount) {
                            response =
                                "It looks like you have more than one DocuSign user account, and the account you are trying to log in to is currently not active. You need to pick a different, active user account.  If you aren't sure which account is active, try logging in directly at www.docusign.net to ensure sure your credentials work properly.";
                        }
                    }
                }
                else if (code === 401) {
                    response += n.acctNotConfigured;
                    var companyConfiguration = config.load({
                        type: config.Type.COMPANY_PREFERENCES,
                    });
                    companyConfiguration.setValue("custscript_docusign_username", "");
                    companyConfiguration.setValue("custscript_docusign_password", "");
                    companyConfiguration.setValue("custscript_docusign_environment", "");
                    companyConfiguration.setValue("custscript_docusign_account_id", "");
                    companyConfiguration.setValue("custscript_docusign_api_account_id", "");
                    companyConfiguration.save();
                }
                else {
                    response += json.message;
                }
            }
        }
        return response;
    };
    /**
     * @desc  Validate the recipients list, throw error if the arguments are not correctly formatted
     * @param recipients
     */
    exports.validateRecipients = function (recipients) {
        if (Object.prototype.toString.call(recipients) !== "[object Array]") {
            throw error.create({
                name: "wrong argument type",
                message: "recipients argument is not an array.",
            });
        }
        var uniqueIds = [];
        for (var i in recipients) {
            var prop = dc.checkProperties(recipients[i], [
                "id",
                "order",
                "name",
                "email",
            ]);
            if (prop !== "") {
                throw error.create({
                    name: "checkProperties error",
                    message: '"' +
                        prop +
                        '" must be provided as a property of the recipients argument.',
                });
            }
            // check if recipient id is a number
            if (!dc.isNumber(recipients[i].id.toString())) {
                throw error.create({
                    name: "recipientid is not a number",
                    message: "The recipient(" +
                        recipients[i].email +
                        ") has an invalid id number(" +
                        recipients[i].id +
                        ").",
                });
            }
            // check if recipient order is a number
            if (!dc.isNumber(recipients[i].order.toString())) {
                throw error.create({
                    name: "recipient order is not a number",
                    message: "The recipient(" +
                        recipients[i].email +
                        ") has an invalid order number(" +
                        recipients[i].order +
                        ").",
                });
            }
            // check if recipient email is a valid email address
            if (!dc.isValidEmail(recipients[i].email)) {
                throw error.create({
                    name: "recipient email not a valid address",
                    message: '"' + recipients[i].email + '" is not a valid email address.',
                });
            }
            // check if recipient id is unique
            if (!uniqueIds[recipients[i].id]) {
                uniqueIds[recipients[i].id] = recipients[i].email;
            }
            else {
                throw error.create({
                    name: "recipient id is not unique",
                    message: "The recipients(" +
                        uniqueIds[i] +
                        ", " +
                        recipients[i].email +
                        ") have the same id(" +
                        recipients[i].id +
                        ").",
                });
            }
        }
    };
    /**
     * @desc  Validate the email object, throw error if the arguments are not correctly formatted
     * @param email
     */
    exports.validateEmail = function (email) {
        if (typeof email !== "object") {
            throw error.create({
                name: "email argument is not a object.",
                message: "email argument is not a object",
            });
        }
        // check the parameters
        var prop = dc.checkProperties(email, ["subject", "blurb"]);
        if (prop !== "") {
            throw error.create({
                name: prop + " error",
                message: '"' + prop + '" must be provided as a property of the email argument.',
            });
        }
    };
    /**
     * @desc This is a child function of getAttachedContactsArray
     * We're searching for contacts related to the record type passed in
     * @param {Array} filters - an array or type nlobjSearchFilter
     * @param {String} recordType - The netsuite record type
     * @param {String} joinType - A record name to join to for dynamic results, nulls are okay
     * @return {Array} response - array of search results ready to go into attachedContactArray
     */
    var attachedContactsParamSearch = function (filters, recordType, joinType) {
        var results = [];
        try {
            var srch = search.create({
                filters: filters,
                type: recordType,
                columns: [
                    search.createColumn({
                        name: "firstname",
                        join: joinType,
                    }),
                    search.createColumn({
                        name: "email",
                        join: joinType,
                    }),
                    search.createColumn({
                        name: "lastname",
                        join: joinType,
                    }),
                    search.createColumn({
                        name: "middlename",
                        join: joinType,
                    }),
                    search.createColumn({
                        name: "internalid",
                        join: joinType,
                    }),
                    search.createColumn({
                        name: "entityid",
                        join: joinType,
                    }),
                ],
            });
            srch.run().each(function (result) {
                var email = result.getValue({ name: "email", join: joinType });
                var name = result.getValue({ name: "firstname", join: joinType }) !== "" ||
                    result.getValue({ name: "lastname", join: joinType }) !== ""
                    ? result.getValue({ name: "firstname", join: joinType }) +
                        " " +
                        result.getValue({ name: "middlename", join: joinType }) +
                        " " +
                        result.getValue({ name: "lastname", join: joinType })
                    : result.getValue({ name: "entityid", join: joinType });
                var role = result.getValue({
                    name: "custentity_docusign_role",
                    join: joinType,
                });
                if (email !== "") {
                    results.push({
                        email: email,
                        name: name,
                        role: role,
                    });
                }
                return true;
            });
        }
        catch (e) {
            log.debug("search exception", e.toString());
            return [];
        }
        return results;
    };
});
