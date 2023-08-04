/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * 
 * 
 * Description: Disable form fields.
 * 
 * Author: Roach
 * Date: Sep 17, 2021
 */
 define(['N/record','N/render','N/email','N/runtime','N/file','N/search'],

 function(record,render,email,runtime,file,search) {
    
     /**
      * Definition of the Suitelet script trigger point.
      *
      * @param {Object} scriptContext
      * @param {Record} scriptContext.newRecord - New record
      * @param {Record} scriptContext.oldRecord - Old record
      * @Since 2016.1
      */
     function onAction(scriptContext) {
         
         try{
             var rec = scriptContext.newRecord;
             var form = scriptContext.form;
             disableFields(rec,form);
 
         }catch(e){
             log.debug('Error', e.message);
         }
 
 
     }
     
     function disableFields(rec,form){
         var fieldList = rec.getFields(); 
         log.debug('fieldList',JSON.stringify(fieldList));
        // customworkflowworkflow5_v2_2_3.custworkflow13_2 
         var otherFieldList = ['custbody_jg_quote_number','custbody32','custbody39','otherrefnum','leadsource','partner','department','intercotransaction'];
         var otherFieldList2 = ['job','salesrep','custbody_document_date','custbody_ava_billtousecode','custbody_document_date','custbody_ava_shiptousecode'];
         var otherFieldList3 = ['discountitem','discountrate','custbody25','custbody_ava_taxoverride','custbody34','custbody_ava_taxoverridedate'];
         
         for(var i = 0; i< otherFieldList.length; i++){
             fieldList.push(otherFieldList[i]);
         }
         for(var i = 0; i< otherFieldList2.length; i++){
             fieldList.push(otherFieldList2[i]);
         }
         for(var i = 0; i< otherFieldList3.length; i++){
             fieldList.push(otherFieldList3[i]);
         }
         
 
         for (var i = 0; i < fieldList.length; i++){
             var fld = form.getField(fieldList[i]);
             if (fld) {
                 //disableField(fld, 'inline');     
                 fld.updateDisplayType({displayType: 'inline'});	 
             }
             /*if(fld == 'custbody4'){
                 disableField(fld, 'disabled');
             }*/
         }
         
         //var itemColumnFieldList = ['description','item','units','quantity','rate','amount','expectedreceiptdate','isclosed','custcol2','department','class'];
         var itemColumnFieldList = ['description','item','units','quantity','rate','amount'];
         
         for (var i = 0; i < itemColumnFieldList.length; i++){
             var fld = form.getSublist('item').getField(itemColumnFieldList[i])
             //var fld = form.getSublist('item').getColumn(itemColumnFieldList[i])
             if (fld && fld.id != '') {
                 log.debug('line field', JSON.stringify(fld));
                 //fld.updateDisplayType({displayType: 'disabled'});	  	
                 fld.isDisabled = true;
             }
             
             
 
         }
         
         
        /* var objSblAssignee = scriptContext.form.getSublist({
             id: 'assignee'
         });
         var fldUnitPrice = objSblAssignee.getField({
             id: 'unitprice'
         });
         fldUnitPrice.isMandatory = true;*/
         
     }
 
     return {
         onAction : onAction
     };
     
 });