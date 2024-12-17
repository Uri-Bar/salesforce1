@isTest
public class MyApexTriggerTest{
    @isTest
    public static void testInsertRecord() {
        MyTestObject__c obj = new MyTestObject__c();
        insert obj;
    }
}