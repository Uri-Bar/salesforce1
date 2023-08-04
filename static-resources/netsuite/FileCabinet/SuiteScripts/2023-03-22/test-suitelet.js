/**
 * test-suitelet.js
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/format', 'N/record', 'N/search'],
    /**
   * @param{format} format
   * @param{record} record
   * @param{search} search
   */
    (format, record, search) => {

        const RESPONSE_OBJ = {
            soRecId: '',
            soURL: '',
            error: '',
        };

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            const rmaRecId = scriptContext.request.parameters.rmaRecId;
            if (!rmaRecId) {
                RESPONSE_OBJ.error = 'RMA Record ID is required for Sales Order creation';
                scriptContext.response.write({ output: JSON.stringify(RESPONSE_OBJ) });
                return;
            }

            try {
              scriptContext.response.write({output: 'hey there!'})

            } catch (e) {
                log.error({ title: 'Error Creating Sales Order', details: { fileId: rmaRecId, error: e } });
                RESPONSE_OBJ.error = e.message;
                scriptContext.response.write({ output: JSON.stringify(RESPONSE_OBJ) });
            }

        }

        return { onRequest }

    });
