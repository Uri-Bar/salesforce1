/**
@NApiVersion 2.0
@NScriptType ClientScript
@NModuleScope Public
*/
define([], function () {
    function showMessage(context) {
        //dev-change2
        //devchange4
        //featureAchange
        //feature-C
        var message = "This customer has not provided an email address. Additional!:)";
        var email = context.currentRecord.getValue({
            "fieldId": "email"
        });

        //FeatureB
        if (!email) {
            alert(message);
        }
    }

    return {
        pageInit: showMessage
    };
});