import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { FxBaseComponent, FxComponent, FxIconSetting, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';

@Component({
  selector: 'lib-toggle-button',
  standalone: true,
  imports: [CommonModule, FxComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './toggle-button.component.html',
  styleUrl: './toggle-button.component.css'
})
export class ToggleButtonComponent extends FxBaseComponent { 
  public toggleBtnControl = new UntypedFormControl(false);
  public isToggled = false;

  constructor(private cdr: ChangeDetectorRef) {
    super(cdr);
    this.onInit.subscribe((fxData)=>{
      this._register(this.toggleBtnControl);
    })
  }

  public toggle(): void {
    this.isToggled = !this.toggleBtnControl.value;
    this.toggleBtnControl.setValue(this.isToggled);
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'classes', $title: 'Classes', value: '' }),
      new FxStringSetting({ key: 'active-text', $title: 'Active Text', value: 'On' }),
      new FxStringSetting({ key: 'inactive-text', $title: 'Inactive Text', value: 'Off' }),
    ];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }
}
