/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/record'], function (record) {
    var setValue = {};
    var oFieldMapping = {
        custentity_aw_vat_id: 'custbody_vat_id', // VAT ID
        custentity_customer_portal: 'custbody47', // Customer Portal
        custentity_customer_portal_type: 'custbody48', // Portal Type
        custentity_link_invoice_portal: 'custbody49' // Link to Invoice Portal
    };
    // custbody_vat_id customworkflowworkflow5_v2_2_3.custworkflow13_2
    var otherFieldList = ['custbody_jg_quote_number','custbody32','custbody39','otherrefnum','leadsource','partner','department','intercotransaction'];
    setValue.beforeSubmit = function (context) {
        var oRec = context.newRecord;
        var oCustRec = record.load({
            type: 'customer',
            id: oRec.getValue({fieldId: 'entity'})
        });

        for (var sCustField in oFieldMapping){
            var sVal = oCustRec.getValue({fieldId: sCustField});
            log.debug('Values', '[ ' + sCustField + ' | ' + oFieldMapping[sCustField] + ' ] = ' + sVal);

            oRec.setValue({
                fieldId: oFieldMapping[sCustField],
                value: sVal
            });
        }
    }

    return setValue;
})