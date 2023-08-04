/**
 * Dashboard Refresh Library
 * dashboard-refresh-lib.js
 * @NApiVersion 2.1
 * @ModuleScope Public
 */
define([
  'N/format',
  'N/record',
  'N/search'
], (
  format,
  record,
  search
) => {

  const MOD = {};
  MOD.CFG = {
    employee: '',
    recordid: '',
    PORTLET_NAME: 'Dashboard Refresh',
    MODULE_DEFAULT_MINS: 2,
    MIN_MS: 60000,
    recordtype: 'customrecord_dash_refresh_config',
    fields: {
      employee: 'custrecord_drc_employee',
      data: 'custrecord_drc_data'
    }
  };

  /**
   * Get JSON Config for Employee
   * @param {Number} employee 
   * @return {Object} configObj
   */
  MOD.getRefreshConfigForEmployee = (employee) => {
    MOD.CFG.employee = employee;
    MOD.CFG.recordid = '';
    search.create({
      type: MOD.CFG.recordtype,
      columns: [MOD.CFG.fields.data],
      filters: [[MOD.CFG.fields.employee, 'anyof', employee]]
    })
      .run()
      .each((result) => {
        MOD.CFG.recordid = result.id;
        MOD.CFG.data = JSON.parse(result.getValue(result.columns[0]));
      });
  };

  /**
   * Push Config for Employee
   * @param {Number} employee 
   * @param {Object} portletsObj 
   */
  MOD.pushRefreshConfigForEmployee = (employee, portletsObj) => {
    MOD.getRefreshConfigForEmployee(employee);
    if (!MOD.CFG.recordid) {
      const configRec = record.create({
        type: MOD.CFG.recordtype,
        isDynamic: true
      });
      configRec.setValue({ fieldId: MOD.CFG.fields.employee, value: employee });
      configRec.setValue({ fieldId: MOD.CFG.fields.data, value: JSON.stringify(portletsObj) });
      MOD.CFG.recordid = configRec.save();
    } else {
      const fieldVals = {};
      fieldVals[MOD.CFG.fields.data] = JSON.stringify(portletsObj);
      record.submitFields({
        type: MOD.CFG.recordtype,
        id: MOD.CFG.recordid,
        values: fieldVals
      });
    }
  };

  /**
   * Push Refresh Objects to Configuration
   * Optionally refresh required to gather new elements.
   * @param {number} employee 
   * @param {Object} refreshObj 
   * @param {record} currentRecord 
   * @return {Boolean} refreshPortlet
   */
  MOD.mergeConfigEntries = (employee, refreshObj, currentRecord) => {
    for (const [id, module] of Object.entries(refreshObj)) {
      MOD.CFG.data = MOD.CFG.data || {};
      module.mins = currentRecord.getValue({ fieldId: `custpage_fld_${id}` }) || 0;
      if (module.mins && module.mins >= MOD.CFG.MODULE_DEFAULT_MINS) {
        MOD.CFG.data[id] = { name: module.name, mins: module.mins };
      } else {
        MOD.CFG.data[id] = { name: module.name, mins: '' };
      }
      // stop processing refreshes
      if(module.interval){
        window.clearInterval(module.interval);
      }
    }
    currentRecord.setValue({ fieldId: 'custpage_pl_refresh_portlets', value: JSON.stringify(refreshObj) });
    MOD.pushRefreshConfigForEmployee(employee, MOD.CFG.data);

    // refresh portlet if there's a new configuration
    return Object.keys(refreshObj).filter((id) => {
      return !Object.keys(MOD.CFG.data).includes(id)
    }).length > 0;
  }

  /**
   * Start Portlet refreshes based on configured minutes.
   * @param {Object} refreshPortlets 
   * @param {Object} currentRecord 
   */
  MOD.startRefresh = (refreshPortlets, currentRecord) => {
    for (const [id, module] of Object.entries(refreshPortlets)) {
      if (!module.mins || (module.mins && module.mins < MOD.CFG.MODULE_DEFAULT_MINS)) {
        continue;
      }
      module.mins = module.mins || MOD.CFG.MODULE_DEFAULT_MINS;
      module.refreshPortlet = (module, currentRecord) => {
        module.element.click();
        const portletConfigField = currentRecord.getField({ fieldId: `custpage_fld_${id}` });
        const dateArr = format.format({ type: format.Type.DATETIME, value: new Date() }).split(' ');
        const timeArr = dateArr[1].split(':');
        const time = `${timeArr[0]}:${timeArr[1]} ${dateArr[2]}`
        portletConfigField.label = `${module.name}  (${time})`;

      };
      module.interval = window.setInterval(module.refreshPortlet, (module.mins * MOD.CFG.MIN_MS), module, currentRecord)
    }
  };

  /**
  * Get Refresh Portlet Objects from Dashboard Page
  * @return {Object} portletsObj
  */
  MOD.getRefreshPortlets = () => {
    const portletsObj = {};
    const portletElements = window.parent.document.querySelectorAll('[data-action="refresh"]');
    portletElements.forEach((el) => {
      const portletObj = {};
      portletObj.id = Math.abs(Number(el.parentNode.parentNode.parentNode.getAttribute('data-portlet-id')));
      portletObj.name = el.parentNode.parentNode.getAttribute('aria-label');
      portletObj.element = el;
      portletsObj[portletObj.id] = portletObj;
      if (portletObj.name === MOD.CFG.PORTLET_NAME) {
        delete portletsObj[portletObj.id];
      }
    });
    return portletsObj;
  }

  return MOD;
});