/**
 * Client script for Dashboard Refresh
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
  'N/currentRecord',
  'N/ui/dialog',
  'N/portlet',
  'N/runtime',
  './dashboard-refresh-lib'
],
  /**
   * @param {currentRecord} currentRecord
   * @param {portlet} portlet
   * @param {runtime} runtime
   * @param {Object} refreshLib
   */
  function (
    currentRecord,
    dialog,
    portlet,
    runtime,
    refreshLib
  ) {
    /**
     * Get Portlet Elements start refresh intervals
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
      try {
        refreshLib.CFG.employee = runtime.getCurrentUser().id;
        startRefresh(scriptContext);
      } catch (error) {
        console.error('ERROR!!');
        console.error(error);
      }
    }

    /**
     * Update Configuration on Field Change
     * @param {Object} scriptContext 
     * @returns 
     */
    function fieldChanged(scriptContext) {
      if(!scriptContext.fieldId.includes('custpage_fld_')){
        return;
      }

      if(!validateMinimumValue(scriptContext)){
        return;
      }
      const portletId = scriptContext.fieldId.split('_')[2];
      
      const mins = scriptContext.currentRecord.getValue({ fieldId: scriptContext.fieldId });
      const portletsObj = JSON.parse(scriptContext.currentRecord.getValue({ fieldId: 'custpage_pl_refresh_portlets' }));
      if (!portletsObj) {
        return;
      }
      if (portletsObj && portletsObj[portletId]) {
        portletsObj[portletId].mins = mins
        scriptContext.currentRecord.setValue({ 
          fieldId: 'custpage_pl_refresh_portlets', 
          value: JSON.stringify(portletsObj), 
          ignoreFieldChange: true 
        });
      }
    }

    /**
     * Validate Minimum Value and set
     * @param {Object} scriptContext 
     * @return {Boolean}
     */
    function validateMinimumValue(scriptContext) {
      const fieldValue = scriptContext.currentRecord.getValue({ fieldId: scriptContext.fieldId });
      if (scriptContext.fieldId && scriptContext.fieldId.includes('custpage_fld_')) {
        if (fieldValue !== '' && Number(fieldValue) < refreshLib.CFG.MODULE_DEFAULT_MINS) {
          dialog.alert({
            title: `Minimum Refresh is ${refreshLib.CFG.MODULE_DEFAULT_MINS} minutes`,
            message: `Setting to ${refreshLib.CFG.MODULE_DEFAULT_MINS} minutes.`
          })
            .then((result) => {
              if (result) {
                scriptContext.currentRecord.setValue({
                  fieldId: scriptContext.fieldId,
                  value: refreshLib.CFG.MODULE_DEFAULT_MINS
                });
              }
            });
            return false;
        }
      }
      return true;
    }

    /**
     * Push Configuration entries to Custom Record.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
      const refreshPortletsObj = JSON.parse(scriptContext.currentRecord.getValue({ fieldId: 'custpage_pl_refresh_portlets' }));
      refreshLib.mergeConfigEntries(refreshLib.CFG.employee, refreshPortletsObj, scriptContext.currentRecord);
      portlet.refresh();
      return false;
    }

    /**
     * Start Refresh Intervals for Dashboard Page.
     * @param {Object} scriptContext 
     */
    const startRefresh = (scriptContext) => {
      const refreshPortlets = refreshLib.getRefreshPortlets();
      const reloadPortet = refreshLib.mergeConfigEntries(refreshLib.CFG.employee, refreshPortlets, scriptContext.currentRecord);
      scriptContext.currentRecord.setValue({
        fieldId: 'custpage_pl_refresh_portlets',
        value: JSON.stringify(refreshPortlets)
      });
      if (reloadPortet) {
        portlet.refresh();
      } else {
        refreshLib.startRefresh(refreshPortlets, scriptContext.currentRecord);
      }
    };

    return {
      pageInit,
      fieldChanged,
      saveRecord,
    };

  });
