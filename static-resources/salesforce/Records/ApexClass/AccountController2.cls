public with sharing class AccountController2 {
  public static List<Account> getAllActiveAccounts() {
    return [SELECT Id,Name,AccountSource, Rating, Tier__c FROM Account WHERE Tier__c = 'Small Business'];
  }
}