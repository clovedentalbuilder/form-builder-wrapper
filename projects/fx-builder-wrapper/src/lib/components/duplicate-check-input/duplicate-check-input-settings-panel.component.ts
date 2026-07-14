import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Condition, ConditionSource, isConditionConfigured, parseConditions } from '../shared/applicability';

type SettingsTab = 'basic' | 'validations' | 'import';
type ImportMode = 'upload' | 'paste';

/**
 * Custom settings panel for the Duplicate Check Input field — same chrome/tab
 * pattern as lib-custom-textarea: three tabs (Basic Config — display/label/
 * check-mode/API/messages, Validations, Import), Export Config in the
 * footer. Configures the API call used to check for an existing value, the
 * check mode (auto-as-you-type vs. manual search button), and all messages,
 * in addition to validation and the enable/visibility gates — writing
 * directly to fxData.settings.
 *
 * Visibility/Enable conditions are grouped into three fixed sections —
 * Privilege, Supporting Data, Other Field's Value — each with its own
 * "+ Add" in the section header, instead of a single mixed list with a
 * per-row source picker (same as lib-custom-textarea/lib-section). Custom-
 * code gating is hidden here for now (the underlying gate.useCode support in
 * shared/applicability.ts is untouched — this panel just no longer offers a
 * way to configure it, and forces it off on save so re-saving an old field
 * falls back to conditions).
 *
 * "Exclude Form Control When Hidden" (excludeControlsWhenHidden) is
 * intentionally never read, written, or shown here — DuplicateCheckInputComponent's
 * own settings()/ngDoCheck/FieldControlIncludeController still declare and evaluate
 * it at runtime exactly as before, so any already-configured production field's
 * value is left completely untouched (not reset) when re-saved through this dialog;
 * only the editing UI is gone.
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

  activeTab: SettingsTab = 'basic';

  visibilityPrivilegeConditions: Condition[] = [];
  visibilitySupportingDataConditions: Condition[] = [];
  visibilityFieldConditions: Condition[] = [];
  enablePrivilegeConditions: Condition[] = [];
  enableSupportingDataConditions: Condition[] = [];
  enableFieldConditions: Condition[] = [];

  importMode: ImportMode = 'upload';
  jsonInput = '';
  jsonImportError = '';
  uploadedFileName = '';

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
    });

    this.splitIntoSections(
      parseConditions(this.read('visibilityConditions', '[]')),
      (p, s, f) => { this.visibilityPrivilegeConditions = p; this.visibilitySupportingDataConditions = s; this.visibilityFieldConditions = f; },
    );
    this.splitIntoSections(
      parseConditions(this.read('enableConditions', '[]')),
      (p, s, f) => { this.enablePrivilegeConditions = p; this.enableSupportingDataConditions = s; this.enableFieldConditions = f; },
    );

    this.activeTab = 'basic';
    this.importMode = 'upload';
    this.jsonInput = '';
    this.jsonImportError = '';
    this.uploadedFileName = '';
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
    // excludeControlsWhenHidden is intentionally never written here — see class doc.

    // Custom-code gating is hidden in this panel for now — force it off so re-saving
    // an old field (that may have had it on) falls back to conditions-only.
    this.write('enableUseCode', false);
    this.write('enableCode', '');
    this.write('enableConditions', JSON.stringify(this.combineSections(this.enablePrivilegeConditions, this.enableSupportingDataConditions, this.enableFieldConditions)));

    this.write('visibilityUseCode', false);
    this.write('visibilityCode', '');
    this.write('visibilityConditions', JSON.stringify(this.combineSections(this.visibilityPrivilegeConditions, this.visibilitySupportingDataConditions, this.visibilityFieldConditions)));

    this.configuration.emit(raw);
    this.visible = false;
  }

  closeDialog(): void {
    this.visible = false;
  }

  addCondition(list: Condition[], source: ConditionSource): void {
    list.push({ source, key: '', operator: source === 'privilege' ? 'truthy' : 'equals', value: '', grouped: false });
  }

  removeCondition(list: Condition[], index: number): void {
    list.splice(index, 1);
  }

  conditionKeyPlaceholder(source: ConditionSource): string {
    switch (source) {
      case 'field': return 'Other Field Name';
      case 'supportingData':
      default: return 'Supporting Data Key';
    }
  }

  // ── JSON import / export ─────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadedFileName = file.name;
    this.jsonImportError = '';
    const reader = new FileReader();
    reader.onload = (e) => { this.jsonInput = (e.target?.result as string) ?? ''; };
    reader.readAsText(file);
  }

  importFromJson(): void {
    this.jsonImportError = '';
    if (!this.jsonInput.trim()) {
      this.jsonImportError = this.importMode === 'upload' ? 'Please select a .json file first.' : 'Please paste a JSON configuration.';
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(this.jsonInput);
    } catch {
      this.jsonImportError = 'Invalid JSON — please check the format and try again.';
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      this.jsonImportError = 'JSON must be a configuration object, not an array or primitive.';
      return;
    }

    this.settingsForm.patchValue({
      name: parsed.name ?? this.settingsForm.value.name,
      label: parsed.label ?? 'Label',
      placeholder: parsed.placeholder ?? '',
      helpText: parsed.helpText ?? '',
      customClass: parsed.customClass ?? '',

      checkMode: parsed.checkMode ?? 'auto',
      debounceTime: parsed.debounceTime ?? '500',
      minCharsToCheck: parsed.minCharsToCheck ?? '1',
      searchButtonLabel: parsed.searchButtonLabel ?? 'Search',

      serviceName: parsed.serviceName ?? '',
      apiUrl: parsed.apiUrl ?? '',
      httpMethod: parsed.httpMethod ?? 'GET',
      paramKey: parsed.paramKey ?? 'value',
      extraParams: parsed.extraParams ?? '{}',
      responsePath: parsed.responsePath ?? 'exists',
      invertResult: parsed.invertResult ?? 'false',
      onApiError: parsed.onApiError ?? 'allow',
      apiErrorMessage: parsed.apiErrorMessage ?? 'Unable to verify right now. Please try again.',

      duplicateMessage: parsed.duplicateMessage ?? 'This value already exists',
      checkingMessage: parsed.checkingMessage ?? 'Checking...',
      showAvailableMessage: parsed.showAvailableMessage ?? 'true',
      availableMessage: parsed.availableMessage ?? 'Available',

      isRequired: parsed.isRequired ?? 'false',
      requiredMessage: parsed.requiredMessage ?? 'This field is required',
      minLength: parsed.minLength ?? '',
      minLengthMessage: parsed.minLengthMessage ?? 'Value is too short',
      maxLength: parsed.maxLength ?? '',
      maxLengthMessage: parsed.maxLengthMessage ?? 'Value is too long',
      pattern: parsed.pattern ?? '',
      patternMessage: parsed.patternMessage ?? 'Invalid format',
    });

    this.splitIntoSections(
      Array.isArray(parsed.visibilityConditions) ? parsed.visibilityConditions : [],
      (p, s, f) => { this.visibilityPrivilegeConditions = p; this.visibilitySupportingDataConditions = s; this.visibilityFieldConditions = f; },
    );
    this.splitIntoSections(
      Array.isArray(parsed.enableConditions) ? parsed.enableConditions : [],
      (p, s, f) => { this.enablePrivilegeConditions = p; this.enableSupportingDataConditions = s; this.enableFieldConditions = f; },
    );

    this.activeTab = 'basic';
    this.jsonInput = '';
    this.uploadedFileName = '';
    this.jsonImportError = '';
  }

  exportCurrentConfig(): void {
    const raw = this.settingsForm.getRawValue();
    const config = {
      ...raw,
      visibilityConditions: this.combineSections(this.visibilityPrivilegeConditions, this.visibilitySupportingDataConditions, this.visibilityFieldConditions),
      enableConditions: this.combineSections(this.enablePrivilegeConditions, this.enableSupportingDataConditions, this.enableFieldConditions),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duplicate-check-input-${raw.name || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private splitIntoSections(list: Condition[], assign: (privilege: Condition[], supportingData: Condition[], field: Condition[]) => void): void {
    const privilege = list.filter((c) => c?.source === 'privilege');
    const supportingData = list.filter((c) => c?.source === 'supportingData');
    const field = list.filter((c) => c?.source !== 'privilege' && c?.source !== 'supportingData');
    assign(privilege, supportingData, field);
  }

  private combineSections(privilege: Condition[], supportingData: Condition[], field: Condition[]): Condition[] {
    return [...privilege, ...supportingData, ...field].filter(isConditionConfigured);
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
