import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

interface StepperStepRow {
  label: string;
  target: string;
}

type SettingsTab = 'basic' | 'steps' | 'import';
type ImportMode = 'upload' | 'paste';

/**
 * Custom settings panel for the Stepper — same chrome/tab pattern as
 * lib-section / lib-custom-textarea. Steps are edited as structured rows
 * (Step Label + Anchor) via Add/Remove buttons, never as raw JSON — "steps"
 * is still persisted as a JSON-string setting under the hood (same reason
 * every other custom panel here stores list settings as JSON strings rather
 * than FxJsonSetting: FxJsonSetting renders the fx library's generic raw-JSON
 * `fx-json-editor` control, which is exactly what this panel replaces), but
 * that's an internal storage detail — the user only ever sees label/anchor
 * text fields.
 */
@Component({
  selector: 'lib-stepper-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './stepper-settings-panel.component.html',
  styleUrl: './stepper-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class StepperSettingsPanelComponent extends FxComponent {
  @Output() configuration = new EventEmitter<any>();

  visible = false;
  protected override readonly FxMode = FxMode;

  activeTab: SettingsTab = 'basic';

  steps: StepperStepRow[] = [];

  importMode: ImportMode = 'upload';
  jsonInput = '';
  jsonImportError = '';
  uploadedFileName = '';

  settingsForm = new FormGroup({
    stepperClass: new FormControl<string>(''),
  });

  openDialog(): void {
    this.settingsForm.patchValue({
      stepperClass: this.read('stepperClass', ''),
    });
    this.steps = this.parseSteps(this.read('steps', '[]'));

    this.activeTab = 'basic';
    this.importMode = 'upload';
    this.jsonInput = '';
    this.jsonImportError = '';
    this.uploadedFileName = '';
    this.visible = true;
  }

  saveSettings(): void {
    const raw = this.settingsForm.getRawValue();
    const steps = this.steps.filter((s) => this.isStepConfigured(s));

    this.write('stepperClass', raw.stepperClass);
    this.write('steps', JSON.stringify(steps));

    this.configuration.emit({ ...raw, steps });
    this.visible = false;
  }

  closeDialog(): void {
    this.visible = false;
  }

  addStep(): void {
    this.steps.push({ label: '', target: '' });
  }

  removeStep(index: number): void {
    this.steps.splice(index, 1);
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
      stepperClass: parsed.stepperClass ?? '',
    });
    this.steps = this.parseSteps(parsed.steps);

    this.activeTab = 'basic';
    this.jsonInput = '';
    this.uploadedFileName = '';
    this.jsonImportError = '';
  }

  exportCurrentConfig(): void {
    const raw = this.settingsForm.getRawValue();
    const config = {
      ...raw,
      steps: this.steps.filter((s) => this.isStepConfigured(s)),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stepper-${this.fxData?.name || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private isStepConfigured(step: StepperStepRow): boolean {
    return !!(step?.label?.trim() || step?.target?.trim());
  }

  private parseSteps(raw: any): StepperStepRow[] {
    let val = raw;
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(val)) return [];
    return val
      .filter((s) => s && (s.label != null || s.target != null))
      .map((s) => ({ label: String(s.label ?? ''), target: String(s.target ?? '') }));
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
