import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Condition, ConditionSource, isConditionConfigured, parseConditions } from '../shared/applicability';
import { toYesNo } from '../shared/yes-no-setting';

type SettingsTab = 'basic' | 'validations' | 'import';
type ImportMode = 'upload' | 'paste';

/**
 * Custom settings panel for the custom Password field (same chrome pattern as
 * lib-custom-textbox). Three tabs — Basic Config (display/label), Validations
 * (validation rules + visibility/enable), and Import (JSON import; export lives
 * in the footer).
 *
 * Visibility/Enable conditions are grouped into three fixed sections —
 * Privilege, Supporting Data, Other Field's Value — each with its own
 * "+ Add". Custom-code gating is not exposed here; on save the panel forces
 * visibilityUseCode/enableUseCode to false so re-saving an old field falls
 * back to conditions.
 *
 * Yes/No options (showInListing, isRequired) are stored merge-safely (default
 * false), so the fx deepMergeObjects boolean quirk can't revert a saved false
 * to the class default.
 */
@Component({
  selector: 'lib-custom-password-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './custom-password-settings-panel.component.html',
  styleUrl: './custom-password-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class CustomPasswordSettingsPanelComponent extends FxComponent {
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

  settingsForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    label: new FormControl<string>('Label'),
    placeholder: new FormControl<string>(''),
    helpText: new FormControl<string>(''),
    showInListing: new FormControl<'true' | 'false'>('false'),

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
      showInListing: this.read('showInListing', false) ? 'true' : 'false',

      isRequired: toYesNo(this.read('isRequired', false)),
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
    this.write('showInListing', raw.showInListing === 'true');

    this.write('isRequired', raw.isRequired === 'true' ? 'true' : 'false');
    this.write('requiredMessage', raw.requiredMessage);
    this.write('minLength', raw.minLength);
    this.write('minLengthMessage', raw.minLengthMessage);
    this.write('maxLength', raw.maxLength);
    this.write('maxLengthMessage', raw.maxLengthMessage);
    this.write('pattern', raw.pattern);
    this.write('patternMessage', raw.patternMessage);

    // Custom-code gating is hidden in this panel — force it off so re-saving an old
    // field (that may have had it on) falls back to conditions-only.
    this.write('enableUseCode', 'false');
    this.write('enableCode', '');
    this.write('enableConditions', JSON.stringify(this.combineSections(this.enablePrivilegeConditions, this.enableSupportingDataConditions, this.enableFieldConditions)));

    this.write('visibilityUseCode', 'false');
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
      showInListing: parsed.showInListing ?? 'false',

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
    a.download = `custom-password-${raw.name || 'export'}.json`;
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
