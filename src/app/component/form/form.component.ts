import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';

import { sampleFxForm } from '../../constants';
import { FxForm } from '@instantsys-labs/fx';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import { HttpClient } from '@angular/common/http';
import { FxFormWrapperComponent } from 'fx-builder-wrapper';


export const sampleTableConfig = {
  "rows": [
      {
          "SKU": "Leanne Graham",
          "Reject": 0,
          "Rejection Reasons": "Reason 1",
          "Files": 'https://cdn.pixabay.com/photo/2014/06/03/19/38/board-361516_1280.jpg'
      },
      {
          "SKU": "Ervin Howell",
          "Reject": 0,
          "Rejection Reasons": "Reason 1"
      },
      {
          "SKU": "Clementine Bauch",
          "Reject": true,
          "Rejection Reasons": "Reason 2"
      },
      {
          "SKU": "Patricia Lebsack",
          "Reject": 0,
          "Rejection Reasons": "Reason 1"
      },
      {
          "SKU": "Chelsey Dietrich",
          "Reject": true,
          "Rejection Reasons": "Reason 1"
      },
      {
          "SKU": "Mrs. Dennis Schulist",
          "Reject": 0,
          "Rejection Reasons": "Reason 1",
          "Files": 'https://cdn.pixabay.com/photo/2022/01/14/15/05/teddy-bear-6937569_1280.jpg'
      },
      {
          "SKU": "Kurtis Weissnat",
          "Reject": true,
          "Rejection Reasons": "Reason 1"
      },
      {
          "SKU": "Nicholas Runolfsdottir V",
          "Reject": 0,
          "Rejection Reasons": "Reason 1"
      },
      {
          "SKU": "Glenna Reichert",
          "Reject": 1,
          "Rejection Reasons": "Reason 2"
      },
      {
          "SKU": "Clementina DuBuque",
          "Reject": 0,
          "Rejection Reasons": "Reason 1"
      }
  ],
  "columns": [
      {
          "apiKey": "name",
          "apiUrl": "",
          "header": "SKU",
          "options": [],
          "cellType": "text",
          "labelKey": "",
          "valueKey": "",
          "className": "",
          "placeholder": ""
      },
      {
          "apiKey": "id",
          "apiUrl": "",
          "header": "Reject",
          "options": [],
          "cellType": "checkbox",
          "labelKey": "",
          "valueKey": "",
          "className": "",
          "placeholder": ""
      },
      {
          "apiKey": "",
          "apiUrl": "",
          "header": "Rejection Reasons",
          "options": [
              {
                  "optionName": "Reason 1",
                  "optionValue": "Reason 1"
              },
              {
                  "optionName": "Reason 2",
                  "optionValue": "Reason 2"
              }
          ],
          "cellType": "dropdown",
          "labelKey": "",
          "valueKey": "Reason 2",
          "className": "",
          "placeholder": ""
      },
      {
          "apiKey": "",
          "apiUrl": "",
          "header": "Files",
          "options": [],
          "cellType": "file-upload",
          "labelKey": "",
          "valueKey": "",
          "className": "",
          "placeholder": ""
      }
  ]
}

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, FxFormWrapperComponent],
  template: `
    <section style="padding: 20px">
    <fx-form-component [fxForm]="sampleForm" [variables]="variables" (fxFormSubmit)="onSubmit($event)" #form></fx-form-component>
    
    <div>
      <button (click)="form.submit()" style="padding: 10px; border: 1px solid black;">Submit Form</button>
    </div>
  </section>
  `,
})
export class FormComponent implements OnInit {
  public sampleForm = sampleFxForm as any;
  public variables: any;

  private fxApiRegistryService = inject(ApiServiceRegistry);
  public ngOnInit(): void {
      this.fxApiRegistryService.registerService({
        service: 'User Service',
        url: 'http://local.prm2.com:9007',
        name: 'User Service',
        swagger_url: '/v3/api-docs',
        description: 'User Service APIs'
      })

      setTimeout(() => {
        this.variables = {
            start_date: {
                date:'2025-11-12'
            },
              end_date: {
                date:'2025-11-13'
            }
        }
      }, 2000)
  }

  public onSubmit(event: any): void {
    console.log(event);
  }
}
