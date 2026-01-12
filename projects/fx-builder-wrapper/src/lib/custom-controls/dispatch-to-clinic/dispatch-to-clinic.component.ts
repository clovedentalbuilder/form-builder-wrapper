import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators, FormBuilder, FormsModule } from '@angular/forms';
import { FxBaseComponent, FxComponent, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { BehaviorSubject, take } from 'rxjs';

@Component({
  selector: 'lib-dispatch-to-clinic',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FxComponent],
  templateUrl: './dispatch-to-clinic.component.html'
})
export class DispatchToClinicComponent extends FxBaseComponent {
  private fb = inject(FormBuilder);

  public clinicAddress$: BehaviorSubject<any> = new BehaviorSubject<any>({});

  public dispatchForm: FormGroup = this.fb.group({
    courierName: ['', Validators.required],
    trackingNumber: ['', Validators.required],
    trackingUrl: ['', [Validators.required, Validators.pattern('https?://.+')]],
    notes: ['', Validators.required]
  })

  constructor(private cdr: ChangeDetectorRef) {
    super(cdr);

    this.onInit.subscribe(() => {
      this._register(this.dispatchForm);
    });
  }

  protected settings(): FxSetting[] {
    return [new FxStringSetting({ key: 'heading-text', $title: 'Heading Text', value: 'My Default Value' })];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }

  public copyToClipboard(address: any): void {
    navigator.clipboard.writeText(address);
  }
}
