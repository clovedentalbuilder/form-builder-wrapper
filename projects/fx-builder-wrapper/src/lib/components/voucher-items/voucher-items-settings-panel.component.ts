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
 * Custom settings panel for the Voucher / Coupon Items group — same chrome/tab
 * pattern as lib-repeatable-group. Three tabs: Basic Config (display/name,
 * titles/labels/item limits/listing), Validations (Visibility gate ONLY —
 * this component intentionally has no Enable/Disable gate), and Import (JSON
 * import; export lives in the footer).
 *
 * Visibility conditions are grouped into three fixed sections — Privilege,
 * Supporting Data, Other Field's Value — each with its own "+ Add" in the
 * section header, instead of a single mixed list with a per-row source
 * picker. Custom-code gating is hidden here for now (the underlying
 * gate.useCode support in shared/applicability.ts is untouched — this panel
 * just no longer offers a way to configure it, and forces it off on save so
 * re-saving an old field falls back to conditions).
 *
 * Display Settings (ID + Name) is included because VoucherItemsComponent's
 * submitted value is keyed by fxData.name (see applyPatch's `vars[this.fxData?.name]`),
 * so multiple Voucher Items groups on the same form need to be told apart.
 */
@Component({
  selector: 'lib-voucher-items-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './voucher-items-settings-panel.component.html',
  styleUrl: './voucher-items-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class VoucherItemsSettingsPanelComponent extends FxComponent {
  @Output() configuration = new EventEmitter<any>();

  visible = false;
  protected override readonly FxMode = FxMode;

  activeTab: SettingsTab = 'basic';

  visibilityPrivilegeConditions: Condition[] = [];
  visibilitySupportingDataConditions: Condition[] = [];
  visibilityFieldConditions: Condition[] = [];

  importMode: ImportMode = 'upload';
  jsonInput = '';
  jsonImportError = '';
  uploadedFileName = '';

  settingsForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    groupTitle: new FormControl<string>('COUPON / VOUCHER ITEMS'),
    addButtonText: new FormControl<string>('Add Item'),
    itemLabel: new FormControl<string>('ITEM'),
    typeOptions: new FormControl<string>('Coupon,Voucher'),
    minItems: new FormControl<number>(1),
    maxItems: new FormControl<number>(0),
    showCreatedAt: new FormControl<'true' | 'false'>('true'),
  });

  /** Strips the auto-appended id fragment (e.g. "-ae7f1950") from a freshly-dropped field's name for editing. */
  private cleanName(name: string | undefined): string {
    if (!name) return '';
    return name.replace(/-[0-9a-f]{8,}$/i, '');
  }

  openDialog(): void {
    this.settingsForm.patchValue({
      name: this.cleanName(this.fxData?.name),
      groupTitle: this.read('groupTitle', 'COUPON / VOUCHER ITEMS'),
      addButtonText: this.read('addButtonText', 'Add Item'),
      itemLabel: this.read('itemLabel', 'ITEM'),
      typeOptions: this.read('typeOptions', 'Coupon,Voucher'),
      minItems: this.read('minItems', 1),
      maxItems: this.read('maxItems', 0),
      showCreatedAt: this.read('showCreatedAt', true) ? 'true' : 'false',
    });

    this.splitIntoSections(
      parseConditions(this.read('visibilityConditions', '[]')),
      (p, s, f) => { this.visibilityPrivilegeConditions = p; this.visibilitySupportingDataConditions = s; this.visibilityFieldConditions = f; },
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
    this.write('groupTitle', raw.groupTitle);
    this.write('addButtonText', raw.addButtonText);
    this.write('itemLabel', raw.itemLabel);
    this.write('typeOptions', raw.typeOptions);
    this.write('minItems', raw.minItems);
    this.write('maxItems', raw.maxItems);
    this.write('showCreatedAt', raw.showCreatedAt === 'true');

    // Custom-code gating is hidden in this panel for now — force it off so re-saving
    // an old field (that may have had it on) falls back to conditions-only.
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
      groupTitle: parsed.groupTitle ?? 'COUPON / VOUCHER ITEMS',
      addButtonText: parsed.addButtonText ?? 'Add Item',
      itemLabel: parsed.itemLabel ?? 'ITEM',
      typeOptions: parsed.typeOptions ?? 'Coupon,Voucher',
      minItems: parsed.minItems ?? 1,
      maxItems: parsed.maxItems ?? 0,
      showCreatedAt: parsed.showCreatedAt ?? 'true',
    });

    this.splitIntoSections(
      Array.isArray(parsed.visibilityConditions) ? parsed.visibilityConditions : [],
      (p, s, f) => { this.visibilityPrivilegeConditions = p; this.visibilitySupportingDataConditions = s; this.visibilityFieldConditions = f; },
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
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voucher-items-${raw.name || 'export'}.json`;
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
