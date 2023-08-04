/**
 * @NApiVersion 2.1
 * @NAmdConfig ./JsLibraryConfig.json
 */
define(["require", "exports", "N/runtime", "N/ui/serverWidget", "../ds_common", "./ds_ui_admin_btn"], function (require, exports, runtime, ui, dc, dsAdmin) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @description If the users account is not fully configured then this
     * method will add the DocuSign tab with a message that the install
     * needs to be configured in order to continue.
     * @param form
     * @param message
     * @param localizationJSON
     */
    exports.showPleaseConfigureTab = function (form, message, localizationJSON) {
        //Add "DocuSign" tab
        form.addTab({
            id: "custpage_docusign_tab",
            label: dc.getLocalizationText(localizationJSON, dc.DS_HEADER, "docusign"),
        });
        var sublist = form.addSublist({
            id: "custpage_docusign_envelope_sublist",
            type: ui.SublistType.STATICLIST,
            label: message,
            tab: "custpage_docusign_tab",
        });
        var openAdminLabel = dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsOpenDSAdminConsole");
        dsAdmin.addAdministratorButtons(runtime.getCurrentUser(), sublist, openAdminLabel, localizationJSON);
    };
});
