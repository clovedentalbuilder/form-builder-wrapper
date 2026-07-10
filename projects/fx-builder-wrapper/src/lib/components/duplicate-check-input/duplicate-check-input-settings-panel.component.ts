import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Condition, ConditionSource, parseConditions } from '../shared/applicability';

/**
 * Custom settings panel for the Duplicate Check Input field (same chrome
 * pattern as Section/Repeatable Group/Custom Textbox/Dropdown with Search).
 * Configures the API call used to check for an existing value, the check
 * mode (auto-as-you-type vs. manual search button), all messages, plus
 * validation and the enable/visibility gates — writing directly to
 * fxData.settings.
 */
@Component({
  selector: 'lib-duplicate-check-input-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './duplicate-check-input-settings-panel.component.html',
  styleUrl: './duplicate-check-input-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class DuplicateCheckInputSettingsPanelComponent extends FxComponent {
  @Output() configuration = new EventEmitter<any>();

  visible = false;
  protected override readonly FxMode = FxMode;

  visibilityConditions: Condition[] = [];
  enableConditions: Condition[] = [];

  readonly serviceOptions = [
    { label: 'User Service', value: 'user_service' },
    { label: 'Patient Service', value: 'patient_service' },
    { label: 'Workflow Service', value: 'workflow_service' },
  ];

  settingsForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    label: new FormControl<string>('Label'),
    placeholder: new FormControl<string>(''),
    helpText: new FormControl<string>(''),
    customClass: new FormControl<string>(''),

    checkMode: new FormControl<'auto' | 'manual'>('auto'),
    debounceTime: new FormControl<string>('500'),
    minCharsToCheck: new FormControl<string>('1'),
    searchButtonLabel: new FormControl<string>('Search'),

    serviceName: new FormControl<string>(''),
    apiUrl: new FormControl<string>(''),
    httpMethod: new FormControl<'GET' | 'POST'>('GET'),
    paramKey: new FormControl<string>('value'),
    extraParams: new FormControl<string>('{}'),
    responsePath: new FormControl<string>('exists'),
    invertResult: new FormControl<'true' | 'false'>('false'),
    onApiError: new FormControl<'allow' | 'block'>('allow'),
    apiErrorMessage: new FormControl<string>('Unable to verify right now. Please try again.'),

    duplicateMessage: new FormControl<string>('This value already exists'),
    checkingMessage: new FormControl<string>('Checking...'),
    showAvailableMessage: new FormControl<'true' | 'false'>('true'),
    availableMessage: new FormControl<string>('Available'),

    isRequired: new FormControl<'true' | 'false'>('false'),
    requiredMessage: new FormControl<string>('This field is required'),
    minLength: new FormControl<string>(''),
    minLengthMessage: new FormControl<string>('Value is too short'),
    maxLength: new FormControl<string>(''),
    maxLengthMessage: new FormControl<string>('Value is too long'),
    pattern: new FormControl<string>(''),
    patternMessage: new FormControl<string>('Invalid format'),

    enableUseCode: new FormControl<'true' | 'false'>('false'),
    enableConditionsMatch: new FormControl<'any' | 'all'>('any'),
    enableCode: new FormControl<string>(''),

    visibilityUseCode: new FormControl<'true' | 'false'>('false'),
    visibilityConditionsMatch: new FormControl<'any' | 'all'>('any'),
    visibilityCode: new FormControl<string>(''),
    excludeControlsWhenHidden: new FormControl<'true' | 'false'>('false'),
  });

  /** Strips the auto-appended id fragment (e.g. "-ae7f1950") from a freshly-dropped field's name for editing. */
  private cleanName(name: string | undefined): string {
    if (!name) return '';
    return name.replace(/-[0-9a-f]{8,}$/i, '');
  }

  openDialog(): void {
    this.settingsForm.patchValue({
      name: this.cleanName(this.fxData?.name),
      label: this.read('label', 'Label'),
      placeholder: this.read('placeholder', ''),
      helpText: this.read('helpText', ''),
      customClass: this.read('customClass', ''),

      checkMode: this.read('checkMode', 'auto'),
      debounceTime: this.read('debounceTime', '500'),
      minCharsToCheck: this.read('minCharsToCheck', '1'),
      searchButtonLabel: this.read('searchButtonLabel', 'Search'),

      serviceName: this.read('serviceName', ''),
      apiUrl: this.read('apiUrl', ''),
      httpMethod: this.read('httpMethod', 'GET'),
      paramKey: this.read('paramKey', 'value'),
      extraParams: this.read('extraParams', '{}'),
      responsePath: this.read('responsePath', 'exists'),
      invertResult: this.read('invertResult', false) ? 'true' : 'false',
      onApiError: this.read('onApiError', 'allow'),
      apiErrorMessage: this.read('apiErrorMessage', 'Unable to verify right now. Please try again.'),

      duplicateMessage: this.read('duplicateMessage', 'This value already exists'),
      checkingMessage: this.read('checkingMessage', 'Checking...'),
      showAvailableMessage: this.read('showAvailableMessage', true) ? 'true' : 'false',
      availableMessage: this.read('availableMessage', 'Available'),

      isRequired: this.read('isRequired', false) ? 'true' : 'false',
      requiredMessage: this.read('requiredMessage', 'This field is required'),
      minLength: this.read('minLength', ''),
      minLengthMessage: this.read('minLengthMessage', 'Value is too short'),
      maxLength: this.read('maxLength', ''),
      maxLengthMessage: this.read('maxLengthMessage', 'Value is too long'),
      pattern: this.read('pattern', ''),
      patternMessage: this.read('patternMessage', 'Invalid format'),

      enableUseCode: this.read('enableUseCode', false) ? 'true' : 'false',
      enableConditionsMatch: this.read('enableConditionsMatch', 'any'),
      enableCode: this.read('enableCode', ''),

      visibilityUseCode: this.read('visibilityUseCode', false) ? 'true' : 'false',
      visibilityConditionsMatch: this.read('visibilityConditionsMatch', 'any'),
      visibilityCode: this.read('visibilityCode', ''),
      excludeControlsWhenHidden: this.read('excludeControlsWhenHidden', false) ? 'true' : 'false',
    });
    this.visibilityConditions = parseConditions(this.read('visibilityConditions', '[]'));
    this.enableConditions = parseConditions(this.read('enableConditions', '[]'));
    this.visible = true;
  }

  saveSettings(): void {
    this.settingsForm.get('name')?.markAsTouched();
    if (this.settingsForm.get('name')?.invalid) return;

    const raw = this.settingsForm.getRawValue();
    if (this.fxData && raw.name) {
      this.fxData.name = raw.name;
    }
    this.write('label', raw.label);
    this.write('placeholder', raw.placeholder);
    this.write('helpText', raw.helpText);
    this.write('customClass', raw.customClass);

    this.write('checkMode', raw.checkMode);
    this.write('debounceTime', raw.debounceTime);
    this.write('minCharsToCheck', raw.minCharsToCheck);
    this.write('searchButtonLabel', raw.searchButtonLabel);

    this.write('serviceName', raw.serviceName);
    this.write('apiUrl', raw.apiUrl);
    this.write('httpMethod', raw.httpMethod);
    this.write('paramKey', raw.paramKey);
    this.write('extraParams', raw.extraParams);
    this.write('responsePath', raw.responsePath);
    this.write('invertResult', raw.invertResult === 'true');
    this.write('onApiError', raw.onApiError);
    this.write('apiErrorMessage', raw.apiErrorMessage);

    this.write('duplicateMessage', raw.duplicateMessage);
    this.write('checkingMessage', raw.checkingMessage);
    this.write('showAvailableMessage', raw.showAvailableMessage === 'true');
    this.write('availableMessage', raw.availableMessage);

    this.write('isRequired', raw.isRequired === 'true');
    this.write('requiredMessage', raw.requiredMessage);
    this.write('minLength', raw.minLength);
    this.write('minLengthMessage', raw.minLengthMessage);
    this.write('maxLength', raw.maxLength);
    this.write('maxLengthMessage', raw.maxLengthMessage);
    this.write('pattern', raw.pattern);
    this.write('patternMessage', raw.patternMessage);

    this.write('enableUseCode', raw.enableUseCode === 'true');
    this.write('enableConditionsMatch', raw.enableConditionsMatch);
    this.write('enableCode', raw.enableCode);
    this.write('enableConditions', JSON.stringify(this.cleanConditions(this.enableConditions)));

    this.write('visibilityUseCode', raw.visibilityUseCode === 'true');
    this.write('visibilityConditionsMatch', raw.visibilityConditionsMatch);
    this.write('visibilityCode', raw.visibilityCode);
    this.write('visibilityConditions', JSON.stringify(this.cleanConditions(this.visibilityConditions)));
    this.write('excludeControlsWhenHidden', raw.excludeControlsWhenHidden === 'true');

    this.configuration.emit(raw);
    this.visible = false;
  }

  closeDialog(): void {
    this.visible = false;
  }

  addCondition(list: Condition[]): void {
    list.push({ source: 'supportingData', key: '', operator: 'equals', value: '' });
  }

  removeCondition(list: Condition[], index: number): void {
    list.splice(index, 1);
  }

  conditionKeyPlaceholder(source: ConditionSource): string {
    switch (source) {
      case 'privilege': return 'Privilege Name';
      case 'field': return 'Other Field Name';
      case 'supportingData':
      default: return 'Supporting Data Key';
    }
  }

  private cleanConditions(list: Condition[]): Condition[] {
    return list.filter((c) => String(c?.key ?? '').trim());
  }

  private read(key: string, def: any): any {
    const v = this.fxData?.settings?.find((s: any) => s.key === key)?.value;
    return v === undefined || v === null ? def : v;
  }

  private write(key: string, value: any): void {
    const s = this.fxData?.settings?.find((x: any) => x.key === key);
    if (s) s.value = value;
  }
}
