import { LightningElement, api } from 'lwc';
export default class HelloWorld extends LightningElement {
  @api recordId
  @api contact
  greeting = 'World';
  changeHandler(event) {
    this.greeting = event.target.value;
  }
  showFields = true; 
  toggleFields() { 
    this.showFields = !this.showFields
  }
}