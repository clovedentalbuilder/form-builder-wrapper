import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FxBaseComponent, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';

@Component({
  selector: 'lib-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css'
})
export class ButtonComponent extends FxBaseComponent {
  constructor(private cdr: ChangeDetectorRef) {
    super(cdr)
  }

  protected settings(): FxSetting[] {
    return [new FxStringSetting({ key: 'heading-text', $title: 'Heading Text', value: 'My Default Value' })];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }
}
