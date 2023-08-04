/**
 * Dashboard Refresh Portlet
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */
define([
  'N/runtime',
  'N/ui/serverWidget',
  './dashboard-refresh-lib',
],
  /**
   * @param {runtime} runtime
   * @param {serverWidget} sw
   * @param {Object} refreshLib
   */
  function (
    runtime,
    sw,
    refreshLib,
  ) {
    /**
     * Creates a Portlet with Fields for setting refresh intervals for each portlet.
     * @param {Object} params - The params parameter is a JavaScript object.
     * @param {Portlet} params.portlet - The portlet object used for rendering
     * @param {string} params.column - left column (1), center column (2) or right column (3)
     * @param {string} params.entity - Customer ID for the selected customer
     * @since 2015.2
     */
    const render = (params) => {
      const portlet = params.portlet;
      portlet.clientScriptModulePath = './dashboard-refresh-pl-cl.js';
      portlet.title = refreshLib.CFG.PORTLET_NAME;
      portlet.setSubmitButton({ url: '#', label: 'Submit' });

      const portletsJSONField = portlet.addField({
        id: 'custpage_pl_refresh_portlets',
        type: sw.FieldType.LONGTEXT,
        label: 'PORTLETSOBJ'
      });
      portletsJSONField.updateDisplayType({displayType: sw.FieldDisplayType.NODISPLAY});

      refreshLib.getRefreshConfigForEmployee(runtime.getCurrentUser().id);
      if (!refreshLib.CFG.data) {
        return;
      }
      for (const [id, module] of Object.entries(refreshLib.CFG.data)) {
        portlet.addField({
          id: `custpage_fld_${id}`,
          label: module.name,
          type: sw.FieldType.INTEGER,
        }).defaultValue = module.mins || '';
      }
    }

    return { render }

  });
