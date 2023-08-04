/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 */
define([], function() {

  //7/14/21 Latest comment - more details, additional change
  //New comments to this script - typo here
  //change to compare in env
  //First Conflict
	/*
	
		This is just an experiment with form validation, conditionally
		hiding fields, etc.	To test it, deploy it against the Employee 
		record type.
	
	*/
	
	
    return {
        fieldChanged: fieldChanged,
        pageInit: pageInit,
        saveRecord: saveRecord
    };		
		

    function fieldChanged( context ) {
    
    	// Shows an alert if the Job field is changed.
    	// If the job is changed to "Accountant," then the notes field is hidden.

        if ( context.fieldId == 'job' ) {
        
        	// Get the text value if the selected job.
        	var jobValue = context.currentRecord.getText( { fieldId: 'job' } );
        
        	alert( 'You changed the job to: ' + jobValue );
        	
        	// Get the comments field (object).
        	var commentsField = context.currentRecord.getField( { fieldId: 'comments' } );
        	
        	if ( jobValue == 'Accountant' ) {
        		commentsField.isDisplay = false; 
        	} else {
        		commentsField.isDisplay = true; 
        	}

        }
        
    }



    function pageInit(context) {
    
    	// Shows an alert when the page loads.
        alert( 'Welcome to the form.' );
           
    }


    function saveRecord(context) {
    
    	// Executed after the submit button is pressed, but before the form is submitted.
    	// If the phone is "5555555555," an alert is shown, and the form is rejected.

		if ( context.currentRecord.getText('phone') == '5555555555' ) {
			alert ('Sorry, but that phone number is not allowed.');
			return false;
		}

        return true;
    }

    
});
