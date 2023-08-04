/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NAmdConfig  ./lib/JsLibraryConfig.json
 */
define(["require", "exports", "N/file", "N/xml", "N/log", "N/search", "N/record", "N/error", "./types/ds_t_telemetry", "./ds_common", "./ds_api", "./api/ds_telemetry", "./utils/ds_benchmark"], function (require, exports, file, xml, log, search, record, error, dsttelemetry, dc, api, apitelemetry, ds_benchmark_1) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     *		 	Version: NetSuite 2020.05
     * 		This file includes the DocuSign Connect Service.
     *
     * 		Here is how DocuSign Connect works in NetSuite:
     *
     * 		1.	User uses "Send with DocuSign" or "Sign with DocuSign" or "Custom Button"
     * 		2.	In NetSuite, Envelope Status Record is created with "created" or "sent" status
     * 		3.	The Envelope is completed/voided/declined by signers
     * 		4.	DocuSign sends an Event Notification to NetSuite
     * 			IF the envelope status is changed to:
     * 				Completed:
     * 					1.	Document(s) are post back to NetSuite and attached to the record
     * 					2.	Envelope Status Record is updated to "completed" status
     * 					3.	IF Post back fails, the Envelope status will remains the same.
     * 							User can still click the "Update" button to get the post back documents.
     * 				Declined:  Envelope Status Record is updated to "declined" status
     * 				Voided:  Envelope Status Record is updated to "voided" status
     */
    exports.onRequest = function (context) {
        log.debug("DS_CONNECT: Postback Received", null);
        if (!context) {
            log.audit("DS_CONNECT", "Invalid Request, unable to retrive context.");
            return;
        }
        if (!context.request ||
            !context.request.body ||
            context.request.body.length === 0) {
            log.audit("DS_CONNECT", "Invalid Request, no body");
            return;
        }
        var xmlDoc = null;
        try {
            xmlDoc = xml.Parser.fromString({ text: context.request.body });
        }
        catch (err) {
            //TODO: We need to scrub PII from this log.
            log.error("Error parsing body:  Expected XML", context.request.body);
            return;
        }
        try {
            processConnectRequest(xmlDoc);
        }
        catch (err) {
            log.error("DS_CONNECT: Error Processing Request", err);
        }
        log.debug("DS_CONNECT: Postback Complete", null);
    };
    var processConnectRequest = function (xmlDoc) {
        var updates = [];
        var envelopeStatusNodes = xml.XPath.select({
            node: xmlDoc,
            xpath: "//*[name()='EnvelopeStatus']",
        });
        if (!envelopeStatusNodes ||
            !Array.isArray(envelopeStatusNodes) ||
            envelopeStatusNodes.length === 0)
            return; // nothing to do
        var statusNodes = xml.XPath.select({
            node: envelopeStatusNodes[0],
            xpath: "//*[name()='Status']",
        });
        if (!statusNodes || !Array.isArray(statusNodes) || statusNodes.length === 0)
            return; // still nothing to do
        var envelopeStatus = null;
        statusNodes.forEach(function (status) {
            // there are multiple elements with same name 'Status' so we
            // have to make sure we're getting the correct one
            if (status.parentNode.localName === "EnvelopeStatus") {
                envelopeStatus = status.textContent;
            }
        });
        var envelopeId = null;
        var envelopeIdNodes = xml.XPath.select({
            node: envelopeStatusNodes[0],
            xpath: "//*[name()='EnvelopeID']",
        });
        if (!envelopeIdNodes ||
            !Array.isArray(envelopeIdNodes) ||
            envelopeIdNodes.length === 0)
            return; // still, still nothing to to
        envelopeId = envelopeIdNodes[0].textContent;
        if (!dc.isNotNull(envelopeId) || !dc.isNotNull(envelopeStatus)) {
            log.debug("DS_CONNECT: Postback Failure", "Unable to find the new Envelope Status or Envelope ID.");
        }
        else {
            envelopeStatus = envelopeStatus.toLowerCase();
            //Search for the DocuSign Envelope Status Record
            var columns = new Array();
            columns[0] = search.createColumn({ name: "internalid" });
            var filters = new Array();
            filters[0] = search.createFilter({
                name: "custrecord_docusign_status_envelope_id",
                operator: search.Operator.IS,
                values: envelopeId,
            });
            var searchResults = search.create({
                type: "customrecord_docusign_envelope_status",
                filters: filters,
                columns: columns,
            });
            searchResults.run().each(function (result) {
                var benchmarkResult = ds_benchmark_1.benchmark(function () {
                    var resp = {
                        processed: false,
                        success: true,
                        envelopeId: envelopeId,
                        errorMessage: "",
                    };
                    var envStatusRecordId = result.id;
                    var dsEnvelopeStatus = record.load({
                        type: "customrecord_docusign_envelope_status",
                        id: envStatusRecordId,
                        isDynamic: true,
                    });
                    var record_status = dsEnvelopeStatus.getValue("custrecord_docusign_status");
                    if (!dsEnvelopeStatus ||
                        record_status == "completed" ||
                        record_status == "voided" ||
                        record_status == "declined") {
                        //Break the process - the DocuSign Envelope Status Record is already updated
                        log.debug("DS_CONNECT: Postback Success [" + envelopeId + "]", "Record is already updated.");
                        return resp;
                    }
                    if (envelopeStatus == "voided" ||
                        envelopeStatus == "declined" ||
                        envelopeStatus == "sent") {
                        //Update the DocuSign Envelope Status
                        record.submitFields({
                            type: "customrecord_docusign_envelope_status",
                            id: envStatusRecordId,
                            values: {
                                custrecord_docusign_status: envelopeStatus,
                            },
                        });
                        resp.processed = true;
                        log.debug("DS_CONNECT: Postback Success [" + envelopeId + "]", "Record Status is updated to " + envelopeStatus);
                    }
                    else if (envelopeStatus == "completed") {
                        var completedDateTime = null;
                        var completedDateNodes = xml.XPath.select({
                            node: envelopeStatusNodes[0],
                            xpath: "//*[name()='Completed']",
                        });
                        if (!completedDateNodes ||
                            !Array.isArray(completedDateNodes) ||
                            completedDateNodes.length === 0)
                            return; // still, still, still nothing to to
                        completedDateTime = completedDateNodes[0].textContent.replace(/\.\d{2,3}/g, "");
                        //Get the document information from DocuSign
                        var fileName = api.dsapi_getEnvelopeName(envelopeId);
                        var singedDocName = fileName + " - (UTC)" + completedDateTime + " - DOCUSIGNED.pdf";
                        //Get the signed documents from DocuSign
                        var serverResponse = api.dsapi_getEnvelopeDocumentSet(envelopeId);
                        if (serverResponse.code != 200) {
                            //TODO: Possibly scrub this response for PII -- need to verify.
                            log.debug("DS_CONNECT: Postback Failure [" + envelopeId + "]", "Unable to get the documents from DocuSign due to the following reason: " +
                                serverResponse.body);
                        }
                        else {
                            try {
                                //Save the document in NetSuite
                                var dsFolderId = dc.getFolderId(dc.DOCUSIGNED_FOLDER_NAME);
                                var _file = file.create({
                                    name: singedDocName,
                                    fileType: file.Type.PDF,
                                    contents: serverResponse.body,
                                    folder: dsFolderId,
                                });
                                var signedDocId = _file.save();
                                //Attach the document to the record
                                var type = dsEnvelopeStatus
                                    .getValue("custrecord_docusign_recordtype")
                                    .toString();
                                var recordid = dsEnvelopeStatus
                                    .getValue("custrecord_docusign_recordid")
                                    .toString();
                                record.attach({
                                    record: {
                                        type: "file",
                                        id: signedDocId,
                                    },
                                    to: {
                                        type: type,
                                        id: recordid,
                                    },
                                });
                                //Update Envelope Status Record
                                record.submitFields({
                                    type: "customrecord_docusign_envelope_status",
                                    id: envStatusRecordId,
                                    values: {
                                        custrecord_docusign_document_saved: true,
                                        custrecord_docusign_status: "completed",
                                    },
                                });
                                resp.processed = true;
                                log.debug("DS_CONNECT: Postback Success [" + envelopeId + "]", "Doc Name: " +
                                    singedDocName +
                                    ", Status ID: " +
                                    envStatusRecordId);
                            }
                            catch (e) {
                                log.debug("DS_CONNECT: Postback Failure [" + envelopeId + "]", "Unable to attach the documents to the NetSuite record due to the following reason: " +
                                    e.name +
                                    " | " +
                                    e.message);
                                resp.success = false;
                                resp.errorMessage = e.stack;
                            }
                        }
                    }
                    return resp;
                });
                if (benchmarkResult.returnValue.processed) {
                    updates.push({
                        duration: benchmarkResult.duration,
                        success: benchmarkResult.returnValue.success,
                        envelopeId: benchmarkResult.returnValue.envelopeId,
                        errorMessage: benchmarkResult.returnValue.errorMessage,
                    });
                }
                return true;
            });
        }
        if (updates.length > 0) {
            logConnectAction(updates);
            //check for errors.
            var errorMessage = "";
            for (var i = 0; i < updates.length; i++) {
                var message = updates[i].errorMessage;
                if (updates[i].errorMessage) {
                    errorMessage += message + "\r\n";
                }
            }
            if (errorMessage) {
                throw error.create({
                    name: "Error Updating Envelope Statuses",
                    message: errorMessage,
                });
            }
        }
    };
    var logConnectAction = function (statusUpdates) {
        try {
            var events_1 = [];
            var counters_1 = [];
            statusUpdates.map(function (update) {
                var dataPoints = {
                    UserId: "",
                    AccountId: dc.getDSUserCustomSettings().api_accountid,
                    Action: dsttelemetry.TelemetryUserEvents.EnvelopeStatusUpdate,
                    AppVersion: dc.INTEGRATION_VERSION,
                    Success: update.success,
                    ElapsedTime: update.duration,
                };
                if (update.envelopeId) {
                    dataPoints.EnvelopeId = update.envelopeId;
                }
                counters_1.push(apitelemetry.getRequestTimeCounter(dsttelemetry.TelemetryUserEvents.EnvelopeStatusUpdate, update.duration, update.success));
                events_1.push({ DataPoints: dataPoints });
            });
            apitelemetry.captureMetrics(dsttelemetry.TelemetryType.Telemetry, events_1, counters_1);
        }
        catch (ex) {
            log.debug("DS_CONNECT", "Error logging connect event");
        }
    };
});
