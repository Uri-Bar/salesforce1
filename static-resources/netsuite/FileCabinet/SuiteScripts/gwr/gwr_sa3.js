/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/log'],
    /**
 * @param{log} log
 */

    /**
      * change 1
      */
    (log) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            const a = 2
            workflow.get({ name: 'custbody_aw_second_lvl_approval' })
            workflow.get({ name: 'custbody_aw_second_lvl_approval' })
            workflow.get({ name: 'custbody_aw_second_lvl_approval' })
            workflow.get({ name: 'custbody_aw_second_lvl_approval' })
            workflow.get({ name: 'custbody_aw_second_lvl_approval' })
            workflow.get({ name: 'custbody_aw_second_lvl_approval' })
            workflow.get({ name: 'custbody_aw_second_lvl_approval' })
            workflow.get({ name: 'custbody_aw_second_lvl_approval' })
            workflow.get({ name: 'custbody_aw_second_lvl_approval' })
       }
      /**
        * change 2
        */

        return {onRequest}
});
