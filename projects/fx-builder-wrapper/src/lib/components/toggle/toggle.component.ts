import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FxBaseComponent, FxComponent, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';

@Component({
  selector: 'fx-toggle',
  standalone: true,
  imports: [CommonModule, FxComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './toggle.component.html',
  styleUrl: './toggle.component.css'
})
export class ToggleComponent extends FxBaseComponent {
  public toggleControl = new FormControl<boolean>(false)

  constructor(private cdr: ChangeDetectorRef) {
    super(cdr)
    this.onInit.subscribe((fxData)=>{
      this._register(this.toggleControl);
    })
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'accept', $title: 'Accept Text', value: 'Yes' }),
      new FxStringSetting({ key: 'reject', $title: 'Reject Text', value: 'No' })
    ];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }
}
