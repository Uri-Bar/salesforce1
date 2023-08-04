/**
 * @NApiVersion 2.1
 * @NAmdConfig ./JsLibraryConfig.json
 */
define(["require", "exports", "../ds_common"], function (require, exports, dc) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @description Adds buttons on the sublist that only the admin can see
     * @param user The current user
     * @param sublist the sublist we're working on
     * @param label the label we want the sublist to have
     * @param localizationJSON localization string
     */
    exports.addAdministratorButtons = function (user, sublist, label, localizationJSON) {
        if (user.role === 3 || user.roleId === "customrole_docusign_admin") {
            sublist.addButton({
                label: label,
                functionName: "ds_cs_openDSAdminConsole",
                id: "custpage_admin_console_button",
            });
            var openAcctSettingsLabel = dc.getLocalizationText(localizationJSON, dc.DS_BUTTON, "dsOpenDSAccountSettings");
            sublist.addButton({
                label: openAcctSettingsLabel,
                functionName: "ds_cs_openDSAcctSettingsPage",
                id: "custpage_open_acct_setting_button",
            });
        }
    };
});
