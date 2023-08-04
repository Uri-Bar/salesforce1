/**
 * @NApiVersion 2.1
 * This file includes all of the APIs exposed to NetSuite scripts in the Custom Button with Script.
 *
 * BE CAREFUL MODIFYING THESE METHODS
 *
 * Any changes to the method signatures/etc could cause issues with existing client's custom button scripts.
 * We need to be very very cautious moving forward with these.
 */
define(["require", "exports", "./ds_api_common", "./ds_envelope"], function (require, exports, apicommon, apienv) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @desc  Creates the DS envelope with the given information that can be sent to multiple recipients. The view shows the populated envelope.
     *      string order - the routing order number
     *      string name - the name of the recipient
     *      string email - the email address of the recipient
     *      string name - the file name
     *      string content - base64-encoded file content
     *      string subject - the email subject title
     *      string blurb - the email body message
     * @param docusignContext
     * @param recipients
     * @param files
     * @param email
     */
    exports.docusignPopulateEnvelope = function (docusignContext, recipients, files, email) {
        return apienv.populateEnvelope(docusignContext, recipients, files, email);
    };
    /**
     * @desc  Creates the DS envelope with the given information. The view is presented for the user to sign.
     *      string name - the file name
     *      string content - base64-encoded file content
     *      string subject - the email subject title
     *      string blurb - the email body message
     * @param docusignContext
     * @param files
     * @param email
     */
    exports.docusignSignEnvelope = function (docusignContext, files, email) {
        return apienv.signEnvelope(docusignContext, files, email);
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
    exports.docusignGetRecipients = function (context, orderNumber, idBegin, fileNum) {
        return apicommon.getRecipients(context, orderNumber, idBegin, fileNum);
    };
    /**
     * @desc  Get the files associated with the current record
     * @param searches
     * @param context
     */
    exports.docusignGetFiles = function (context, searches) {
        return apicommon.getFiles(context, searches);
    };
    /**
     * @desc  Get the email associated with the current record
     * @return  array - an email object
     * @param context
     */
    exports.docusignGetEmail = function (context) {
        return apicommon.getEmail(context);
    };
    /**
     * @desc Retrieve a list of dsFile objects with all of the signers from a template.
     * @param templateId
     */
    exports.docusignGetTemplateSigners = function (templateId) {
        return apienv.getTemplateSigners(templateId);
    };
});
