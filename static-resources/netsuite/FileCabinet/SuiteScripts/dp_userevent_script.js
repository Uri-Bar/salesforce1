                    /*
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 */

define (['N/currentRecord', 'N/runtime', 'N/ui/serverWidget'], function (currentRecord, runtime, serverWidget) {
    function customUI_SalesOrderBeforeLoad(context) {
      	log.debug("DP was here")
        if (context.UserEventType === context.UserEventType.CREATE) {
            if (runtime.executionContext === runtime.ContextType.USEREVENT) {
                var fieldId = 'custpage_eom_promotion';
                var fieldLabel = 'Eligible EOM promotion';
                var today = new Date();
                var month = today.getMonth();
                var date = today.getDate();

                log.debug({
                    title: 'month date',
                    details: month + ' ' + date
                });

                // February
                if (month === 1) {
                    if (date === 24 | date === 25 | date === 26 | date === 27 | date === 28 | date === 29) {
                        context.form.addField({
                            id: fieldId,
                            label: fieldLabel,
                            type: serverWidget.FieldType.CHECKBOX
                        });
                    }
                // 31-day months
                } else if (month === 0 | month === 2 | month === 4 | month === 6 | month === 7 |
                           month === 9 | month === 11) {
                    if (date === 27 | date === 28 | date === 29 | date === 30 | date === 31) {
                        context.form.addField({
                            id: fieldId,
                            label: fieldLabel,
                            type: serverWidget.FieldType.CHECKBOX
                        });
                    }
                } else {
                    if (date === 26 | date ===27 | date === 28 | date === 29 | date === 30) {
                        context.form.addField({
                            id: fieldId,
                            label: fieldLabel,
                            type: serverWidget.FieldType.CHECKBOX

                        });
                    }
                }
            }
        }
    }
    
    return {
        beforeLoad: customUI_SalesOrderBeforeLoad
    };
}); 