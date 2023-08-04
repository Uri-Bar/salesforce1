/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(["require", "exports", "N/ui/message"], function (require, exports, message) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.saveRecord = function (context) {
        //Display loading dialog when the button is clicked.
        jQuery.blockUI({
            message: "<div style=\"text-align: center;\">Creating Envelope...</div>",
            css: {
                top: "0px",
                left: "0px",
                height: "100%",
                fontWeight: "bold",
                padding: "20px",
                width: "100%",
                border: "none",
                backgroundColor: "transparent",
                color: "white",
                opacity: 0.9,
            },
        });
        return true;
    };
    exports.pageInit = function (context) {
        /*
          Display a message to the user if there are no NetSuite contacts
          to bind to the template roles.
        */
        var numRecips = context.currentRecord
            .getValue("custpage_num_recips")
            .toString();
        if (!numRecips || parseInt(numRecips) === 0 || parseInt(numRecips) === NaN) {
            var warning = message.create({
                title: "Missing NetSuite Recipients",
                message: "We couldn't find any contacts on this record or 'Load Record Contacts' is not configured for this custom button. You may still submit without recipients and enter them manually or go back and attach recipients in NetSuite.",
                type: message.Type.INFORMATION,
            });
            warning.show({});
        }
    };
});
