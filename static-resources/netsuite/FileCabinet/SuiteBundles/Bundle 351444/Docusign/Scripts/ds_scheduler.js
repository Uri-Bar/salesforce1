/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NAmdConfig  ./lib/JsLibraryConfig.json
 *
 *	Version: NetSuite 2020.03
 * 	This file includes the DocuSign Sweeper/Scheduler Service.
 *
 * 	Here is how DocuSign Sweeper/Scheduler works in NetSuite
 *
 * 	Setting:  NetSuite Admin set how often the DocuSign Sweeper will run
 *  Logic:  what the sweeper does
 *
 *  Envelope Refresh Rule
 *  - Any envelope sent from NetSuite should have the envelope's correct status refreshed in a timely manner
 *    - When envelope's status changes due to action on NetSuite side (example: from Created to Sent)
 *    - When envelope's status changed due to action on DocuSign side (example: Sent to Signed/Completed)
 *  - Any completed envelope should have all the completed and signed documents attached to it
 *
 *	 Sample api response from listStatusChanges
 *	 {
 *	 'resultSetSize': number,
 *	 'totalSetSize': number,
 *	 'startPosition': number,
 *	 'endPosition': number,
 *	 'nextUri': '',
 *	 'previousUri': '',
 *	 'envelopes': [
 *	   {
 *	     'status': 'created',
 *	     'documentsUri': '/envelopes/{{ guid }}/documents',
 *	     'recipientsUri': '/envelopes/{{ guid }}/recipients',
 *	     'attachmentsUri': '/envelopes/{{ guid }}/attachments',
 *	     'envelopeUri': '/envelopes/{{ guid }}',
 *	     'envelopeId': '{{ guid }}',
 *	     'customFieldsUri': '/envelopes/{{ guid }}/custom_fields',
 *	     'notificationUri': '/envelopes/{{ guid }}/notification',
 *	     'statusChangedDateTime': '2020-03-11T20:10:22.3630000Z',
 *	     'documentsCombinedUri': '/envelopes/{{ guid }}/documents/combined',
 *	     'certificateUri': '/envelopes/{{ guid }}/documents/certificate',
 *	     'templatesUri': '/envelopes/{{ guid }}/templates'
 *	   }]
 * 	}
 */
define(["require", "exports", "N/file", "N/https", "N/record", "N/runtime", "N/search", "N/log", "./ds_common", "./ds_api", "moment"], function (require, exports, file, https, record, runtime, search, log, dc, api, moment) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * this is the method called when the update scheduler is started
     * @param {string} type the entrypoint type from NetSuite
     */
    exports.execute = function (context) {
        // log the start of this execution, this is important b/c we'll
        // need this log entry the next time we execute.
        var started = new Date();
        log.audit("Begin Update", JSON.stringify({
            begin: started,
        }));
        log.debug("DocuSign Update Scheduler", "Started... [type=" + context.type + "]");
        // this gets an array of api calls to make to docusign's listStatusChagnes endpoint
        var urls_to_call = dsUpdateSchedulerGetListOfDocuSignCalls();
        // this method builds the X-DocuSign-Authentication header required for api calls
        var headers = api._getHeaders(true);
        // log how many calls we need to make
        log.debug("dsUpdateScheduler()", "There are " + urls_to_call.length + " docusign api calls to make.");
        // now we iterate through our list of API calls and process the responses
        for (var i = 0; i < urls_to_call.length; i++) {
            var _url = urls_to_call[i];
            var res = https.get({
                url: _url,
                headers: headers,
            });
            var json = JSON.parse(res.body);
            log.debug("dsUpdateScheduler()", "DocuSign response results to process " + JSON.stringify(json));
            processDsResponse(json);
        }
        log.debug("DocuSign Update Scheduler", "Ended...");
    };
    /**
     * @desc Get the last run date of the docusign_scheduler script
     * @return {moment} last run date of scheduled script, empty if non-existent
     */
    var dsUpdateSchedulerGetLastRunDate = function () {
        var logSearch = search.create({
            type: "scriptexecutionlog",
            filters: [
                ["scripttype", "anyof", "557"],
                "AND",
                ["type", "anyof", "AUDIT"],
            ],
            columns: [
                search.createColumn({ name: "date", summary: search.Summary.MAX }),
                search.createColumn({ name: "detail", summary: search.Summary.MAX }),
            ],
        });
        var momentTime = null;
        logSearch.run().each(function (result) {
            var details = result.getValue({
                name: "detail",
                summary: search.Summary.MAX,
            });
            if (!details)
                return null;
            var detailJson = JSON.parse(details.toString());
            if (detailJson && detailJson.begin)
                momentTime = moment(detailJson.begin);
            return true;
        });
        return momentTime;
    };
    /**
     * @desc Get a list of envelope ids from NetSuite that needs to be checked (?)
     *  - Exclude if the envelope is already Completed and downloaded (currently not tracking downloaded)
     *  - Exclude if the envelope status is not in Created, Sent, Delivered, Signed, Completed
     * @returns {array} Array of envelope ids
     */
    var dsUpdateSchedulerGetNetSuiteEnvelopIds = function () {
        var envelope_ids = [];
        var columns = [
            "internalid",
            "custrecord_docusign_status",
            "custrecord_docusign_status_envelope_id",
            "custrecord_docusign_recordtype",
            "custrecord_docusign_recordid",
        ];
        var filters = [
            [
                ["custrecord_docusign_document_saved", "is", "F"],
                "AND",
                ["custrecord_docusign_status", "is", "completed"],
            ],
            "OR",
            [
                ["custrecord_docusign_status", "is", "created"],
                "OR",
                ["custrecord_docusign_status", "is", "sent"],
                "OR",
                ["custrecord_docusign_status", "is", "delivered"],
                "OR",
                ["custrecord_docusign_status", "is", "signed"],
            ],
        ];
        var envelope_statuses = search.create({
            type: "customrecord_docusign_envelope_status",
            filters: filters,
            columns: columns,
        });
        envelope_statuses.run().each(function (result) {
            var envelope_id = result.getValue({
                name: "custrecord_docusign_status_envelope_id",
            });
            envelope_ids.push(envelope_id.toString());
            return true;
        });
        return envelope_ids;
    };
    /**
     * @desc builds a list of urls we need to call for updates
     * @returns {array} - array of url strings
     */
    var dsUpdateSchedulerGetListOfDocuSignCalls = function () {
        // this returns a moment object.
        var from_date = dsUpdateSchedulerGetLastRunDate();
        // a place to store the list of api urls we're going to call later
        var urls_to_call = [];
        // we need the account id for the docusign api calls
        var accountId = runtime.getCurrentScript().getParameter({
            name: "custscript_docusign_account_id",
        });
        // this is the list of statuses we are going to query for
        var statuses = "completed,sent,delivered,signed,created,voided";
        var env = dc.getDSEnvironmentName();
        // this is the base url we're going to use/reuse for getting envelope information
        var ds_api_url = "https://" +
            env +
            ".docusign.net/restapi/v2/accounts/" +
            accountId +
            "/envelopes?accountId=" +
            accountId +
            "&status=" +
            statuses;
        // when we have a lastRunDate we query listStatusChanges with from_date
        if (from_date !== null) {
            // build a query for using from_date
            log.debug("querying listStatusChages by from_date", "from_date: " + from_date.format());
            urls_to_call.push(ds_api_url + "&from_date=" + from_date.format());
        }
        else {
            // when lastRunDate is null we build a list of envelopeids for listStatusChanges query
            log.debug("querying by envelope_ids", "ids will be listed as they are queried");
            // this gets the list of envelope ids stored in NS that we need to get updates on
            var envelope_ids = dsUpdateSchedulerGetNetSuiteEnvelopIds();
            // it's possible that a NS account could return hundreds or thousands of envelope ids
            // so we're only going to query the ds api for 20 envelopes at a time so we need to
            // spilt the envelope_ids into piles of 20 each
            // log.debug( 'envelope_ids', JSON.stringify(envelope_ids));
            var arrays_of_20 = [];
            var nums = Math.ceil(envelope_ids.length / 20);
            for (var i = 0; i < nums; i++) {
                arrays_of_20.push(envelope_ids.slice(i * 20, i * 20 + 20));
            }
            // log.debug( 'arrays_of_20', JSON.stringify(arrays_of_20));
            // this will store the list of api urls to call
            for (var u = 0; u < arrays_of_20.length; u++) {
                var this_array = arrays_of_20[u];
                // log.debug( 'this_array', JSON.stringify(this_array));
                urls_to_call.push(ds_api_url + "&envelope_ids=" + this_array.toString());
            }
        }
        return urls_to_call;
    };
    /**
     * This method handles the response from the docusign api call
     * @param {object} json the JSON response from docusign api
     */
    var processDsResponse = function (json) {
        // this is the array of envelopes that came back from ds listStatusChanges call
        var envelopes = json.envelopes;
        // this is the number of envelopes in the array
        var num_envelopes = json.resultSetSize;
        var _loop_1 = function (v) {
            var env = envelopes[v];
            // query the netsuite database for details about this particular envelope
            var env_srch = dsUpdateSchedulerGetEnvSrch(env.envelopeId);
            // check to make sure the record exists
            env_srch.run().each(function (result) {
                // pull the current status on the NetSuite record
                var env_ns_status = result.getValue("custrecord_docusign_status");
                // pull the internalid of the status record
                var env_ns_internalid = parseInt(result.id);
                // we need to pull out the record id and record type so we can attacch the downloaded file later
                var env_ns_recordid = parseInt(result.getValue("custrecord_docusign_recordid").toString());
                // pull the type of record (opportunity, purchase order, etc...)
                var env_ns_recordtype = result
                    .getValue("custrecord_docusign_recordtype")
                    .toString();
                // pull the boolean that indicates whether the envelope file has been previously d/l'ed and saved
                var _env_ns_downloaded = result.getValue("custrecord_docusign_env_downloaded");
                var env_ns_downloaded = _env_ns_downloaded !== null && _env_ns_downloaded.toString() === "true"
                    ? true
                    : false;
                // log execution data about this elvelope for testing clarity
                log.debug("processDsResponse() env: " +
                    env.envelopeId +
                    " internalid: " +
                    env_ns_internalid, JSON.stringify({
                    ns_status: env_ns_status,
                    internalid: env_ns_internalid,
                    recordid: env_ns_recordid,
                    recordtype: env_ns_recordtype,
                    downloaded: env_ns_downloaded,
                    ds_env: env,
                }));
                switch (env.status) {
                    case "sent":
                    case "voided":
                    case "declined":
                        record.submitFields({
                            type: "customrecord_docusign_envelope_status",
                            id: env_ns_internalid,
                            values: {
                                custrecord_docusign_status: env.status,
                            },
                        });
                        break;
                    case "completed":
                        handleCompletedEnvelope(env, env_ns_recordtype, env_ns_recordid, env_ns_internalid, env_ns_downloaded);
                        break;
                    default:
                        log.debug("envelope status not found", env.envelopeId);
                        break;
                }
                return true;
            });
        };
        // we're going to iterate on the enveopes and update their status, one at a time
        for (var v = 0; v < num_envelopes; v++) {
            _loop_1(v);
        }
    };
    /**
     * Description - this method is called when an envelope has reached 'completed' status and needs to be updated in NetSuite
     * @param {object} env the invelope object from the docusign api call
     * @param {string} env_ns_recordtype the netsuite record type which created this status (opportunity, sales order, etc...)
     * @param {integer} env_ns_recordid the internal id of the record which this envelope was created from
     * @param {integer} env_status_internalid the internal id of this envelope status
     * @param {boolean} env_downloaded a bool which indicates if this envelope has been successfully downloaded
     */
    var handleCompletedEnvelope = function (env, env_ns_recordtype, env_ns_recordid, env_status_internalid, env_downloaded) {
        // if the pdf hasn't been downloaded then we try to download it
        downloadAndSaveCompletedEnvelopeFile(env_downloaded, env, env_status_internalid, env_ns_recordtype, env_ns_recordid);
        // update the status of the envelope in netsuite with the what came back
        // from the docusign api
        try {
            record.submitFields({
                type: "customrecord_docusign_envelope_status",
                id: env_status_internalid,
                values: {
                    custrecord_docusign_status: "completed",
                },
            });
            log.debug("Update Success", "envelope status internalid: " + env_status_internalid);
        }
        catch (e) {
            var errorReason = "";
            if (e) {
                errorReason = "[" + e.name + "] " + e.message;
            }
            else {
                errorReason = e;
            }
            log.debug("Update Failure", "Unable to attach the documents to the NetSuite record due to the following reason: " +
                errorReason);
        }
    };
    /**
     * Description - This method downloads the completed PDF from docusign, saves it in the netsuite file
     * cabinet and attaches the file to the record which generated it.
     * @param {bool} env_downloaded tells us if the envelope was previously downloaded or not
     * @param {object} env the JSON data containing envelope information
     * @param {number} env_status_internalid the internal id of the envelope status record
     * @param {string} env_ns_recordtype the type of record from which the envelope was generated (opportunity, sales order, etc...)
     * @param {number} env_ns_recordid the internal id of the netsuite record which generated this envelope
     */
    var downloadAndSaveCompletedEnvelopeFile = function (env_downloaded, env, env_status_internalid, env_ns_recordtype, env_ns_recordid) {
        if (!env_downloaded) {
            // gather some information before moving forward
            // convert the timestamp from listStatusChanges to a moment object
            var moment_time = moment(env.statusChangedDateTime);
            // format the moment oject for use in the saved file name
            var completed_date_time = moment_time.format("YYYY-MM-DDTHH:mm:ss");
            // retreive the envelope file name from docusign api
            var fileName = api.dsapi_getEnvelopeName(env.envelopeId);
            // concatenate the file name for the downloaded document
            var singedDocName = fileName + " - (UTC)" + completed_date_time + " - DOCUSIGNED.pdf";
            // retreive the completed PDF document from docusign api
            var serverResponse = api.dsapi_getEnvelopeDocumentSet(env.envelopeId);
            // check the response code from the api call for success/failure
            if (serverResponse.code != 200) {
                // anything other than 200 indicates failure
                // log the error in the execution logs
                log.debug("Update Failure", "Unable to get the documents from DocuSign due to the following reason: " +
                    serverResponse.body);
                // now we save the error reason to the envelope status record
                record.submitFields({
                    type: "customrecord_docusign_envelope_status",
                    id: env_status_internalid,
                    values: {
                        custrecord_docusign_env_error_msg: serverResponse.body,
                    },
                });
            }
            else {
                // if we get here then the document downnload was successful
                try {
                    //create the document in NetSuite
                    var _file = file.create({
                        name: singedDocName,
                        fileType: file.Type.PDF,
                        contents: serverResponse.body,
                    });
                    // get the internal id of the file cabinet folder we're going to put this pdf in
                    var dsFolderId = dc.getFolderId(dc.DOCUSIGNED_FOLDER_NAME);
                    // put the file in the folder
                    _file.folder = dsFolderId;
                    // submit/save the file to finalize the operation
                    var file_id = _file.save();
                    // Attach the document to the record
                    record.attach({
                        record: {
                            id: file_id,
                            type: "file",
                        },
                        to: {
                            id: env_ns_recordid,
                            type: env_ns_recordtype,
                        },
                    });
                    // format a completed date using moment
                    var completed_date = moment().format("MM/DD/YYYY h:mm:ss a");
                    // Update Envelope Status and Completed date
                    // send all the changes to this envelope status record at once
                    record.submitFields({
                        type: "customrecord_docusign_envelope_status",
                        id: env_status_internalid,
                        values: {
                            custrecord_docusign_document_saved: "T",
                            custrecord_docusign_env_downloaded: completed_date,
                        },
                    });
                }
                catch (e) {
                    var errorReason = "";
                    if (e) {
                        errorReason = "[" + e.name + "] " + e.message;
                    }
                    else {
                        errorReason = e;
                    }
                    log.debug("Update Failure", "Unable to attach the documents to the NetSuite record due to the following reason: " +
                        errorReason);
                }
            }
        }
    };
    /**
     * Desc - This method creates and executes a search for an envelope status
     * update record. The search result set is returned to the caller.
     * @param {string} envelope_id The docusign envelope id we're querying on
     */
    var dsUpdateSchedulerGetEnvSrch = function (envelope_id) {
        return search.create({
            type: "customrecord_docusign_envelope_status",
            filters: [
                // filter on the envelope id
                ["custrecord_docusign_status_envelope_id", "is", envelope_id],
            ],
            columns: [
                "name",
                "id",
                "scriptid",
                "custrecord_docusign_envelope_environment",
                "custrecord_docusign_envelope_accountid",
                "custrecord_docusign_document_name",
                "custrecord_docusign_status",
                "custrecord_docusign_status_envelope_id",
                "custrecord_docusign_status_date_created",
                "custrecord_docusign_document_saved",
                "custrecord_docusign_recordtype",
                "custrecord_docusign_recordid",
                "custrecord_docusign_env_downloaded",
                "custrecord_docusign_env_error_msg",
                "custrecord_docusign_exc_from_update",
                "custrecord_docusign_download_attempts",
            ],
        });
    };
});
