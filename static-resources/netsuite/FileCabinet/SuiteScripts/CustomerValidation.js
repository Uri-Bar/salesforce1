/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["./lib"], function (lib) {
  function beforeLoad(context) {
    log.debug("running");
    log.debug("val", lib.props);
  }

  return {
    beforeLoad,
  };
});
