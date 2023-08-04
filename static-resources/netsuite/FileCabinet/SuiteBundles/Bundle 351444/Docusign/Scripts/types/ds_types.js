/**
 * @NApiVersion 2.1
 * This file contains types for data returned from docusign apis
 * This means we can take json responses and cast them to stronly
 * typed objects like this: let soapInfo: soapInfo = JSON.parse(json);
 * and have stronly types data to work with.
 */
define(["require", "exports"], function (require, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var TabType;
    (function (TabType) {
        TabType["DateSigned"] = "dateSignedTabs";
        TabType["Number"] = "numberTabs";
        TabType["Note"] = "noteTabs";
        TabType["CheckBox"] = "checkboxTabs";
        TabType["List"] = "listTabs";
        TabType["Text"] = "textTabs";
        /*
        //NOTE: Company and Title cannot be set according to the docs:
        //      We want to exclude them from showing up, for now, but
        //      may want/need to support them in the future.
        
        Company = "companyTabs",
        Title = "titleTabs",
      */
    })(TabType = exports.TabType || (exports.TabType = {}));
});
