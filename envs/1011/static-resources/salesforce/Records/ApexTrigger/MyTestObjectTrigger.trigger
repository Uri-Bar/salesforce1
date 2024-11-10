trigger MyTestObjectTrigger on MyTestObject__c (before insert) {
    for (MyTestObject__c rec : Trigger.new) {
        rec.Name = String.valueOf(System.now());
    }
}