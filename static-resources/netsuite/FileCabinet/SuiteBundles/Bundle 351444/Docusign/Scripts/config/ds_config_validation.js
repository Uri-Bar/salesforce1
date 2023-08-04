/**
 * @NApiVersion 2.1
 * @NAmdConfig ./JsLibraryConfig.json
 */
define(["require", "exports", "N/log", "N/ui/serverWidget", "../ds_common"], function (require, exports, log, ui, dc) {
    Object.defineProperty(exports, "__esModule", { value: true });
    ("use strict");
    /**
     * @description Validate whether or not the custom button is valid.
     * When editing an existing custom button, provide the `id`, it will be used to ignore the same button when checking for duplicates.
     * @param recordType - The record type the custom button belongs to.
     * @param buttonName - The name of the custom button.
     * @param editedButtonId - The id of the custom button being edited. Should be provided during edit and null during create.
     */
    exports.customButtonIsValid = function (recordType, buttonName, editedButtonId) {
        var customButtons = dc.getDSCustomButtons(recordType, buttonName);
        var isValid = true;
        var message = "";
        if (!buttonName) {
            isValid = false;
            message = "You must enter a name for the Custom Button";
        }
        else {
            // Loop through all custom buttons with the same name.
            // If no 'editedButtonId' was provided, assume the button is being created and any duplicate names are invalid.
            // if a 'editedButtonId' is provided, assume the button is being edited and make sure the duplicate doesn't have the same id.
            customButtons.run().each(function (btn) {
                isValid = editedButtonId === null ? false : btn.id === editedButtonId;
                if (!isValid) {
                    log.audit("Custom Button Validation", "A Duplicate custom button already exists for the record type [" + recordType + "] with name [" + buttonName + "]");
                    message = "A Custom Button with the name [" + buttonName + "] already exists.  Please try again with a different name.";
                }
                return isValid;
            });
        }
        return {
            success: isValid,
            message: message,
        };
    };
    exports.displayAccountSettingsNotifications = function (form, params) {
        var maxNotificationLength = 300;
        if (params.config_response) {
            var config_response = form.addField({
                id: "custpage_config_acct_response",
                label: " ",
                type: ui.FieldType.TEXT,
            });
            config_response.defaultValue = dc.getTruncatedString(params.config_response, maxNotificationLength);
            config_response.updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN,
            });
        }
        if (params.save_response) {
            var save_response = form.addField({
                id: "custpage_save_record_response",
                label: " ",
                type: ui.FieldType.TEXT,
            });
            save_response.defaultValue = dc.getTruncatedString(params.save_response, maxNotificationLength);
            save_response.updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN,
            });
        }
    };
});
