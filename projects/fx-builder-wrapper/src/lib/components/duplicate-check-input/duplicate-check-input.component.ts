import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DoCheck, OnDestroy, HostBinding } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FxBaseComponent,
  FxMode,
  FxSelectSetting,
  FxSetting,
  FxStringSetting,
  FxToggleSetting,
  FxValidation,
} from '@instantsys-labs/fx';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import { Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { DuplicateCheckInputSettingsPanelComponent } from './duplicate-check-input-settings-panel.component';
import { GateConfig, isApplicable, parseConditions } from '../shared/applicability';
import { resolveSiblingControl } from '../shared/conditional-disable';
import { FieldControlIncludeController } from '../shared/form-control-visibility';

type CheckState = 'idle' | 'checking' | 'duplicate' | 'available' | 'error';

/**
 * Duplicate Check Input: a text field that verifies against a backend API
 * whether the typed value already exists, marking the form control invalid
 * (with a message below the input) when it does.
 *
 * Two check modes (configurable in settings, see the settings panel):
 *   - 'auto': hits the API automatically as the user types, via
 *     debounceTime + distinctUntilChanged + switchMap so only the latest
 *     in-flight request "wins" and stale keystrokes never fire a call.
 *   - 'manual': a Search button next to the input triggers the same check
 *     on click instead of on every keystroke.
 *
 * The API call, request shape (GET query param or POST body key), response
 * path used to read the "exists" flag, and all messages are fully
 * configurable — see settings() below and the settings panel.
 */
@Component({
  selector: 'lib-duplicate-check-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DuplicateCheckInputSettingsPanelComponent],
  templateUrl: './duplicate-check-input.component.html',
  styleUrl: './duplicate-check-input.component.css',
})
export class DuplicateCheckInputComponent extends FxBaseComponent implements DoCheck, OnDestroy {
  private destroy$ = new Subject<boolean>();

  public control = new FormControl<string>('');
  public state: CheckState = 'idle';

  private controlToggler = new FieldControlIncludeController(
    () => this.fxData?.$formGroup,
    () => (this.fxData?.name ? [this.fxData.name] : []),
  );

  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private fxApiService: ApiServiceRegistry,
    private wrapperService: FxBuilderWrapperService,
  ) {
    super(cdr);
    this.onInit.subscribe(() => {
      this._register(this.control);
      this.applyValidators();
      if (this.checkMode === 'auto') {
        this.setupAutoCheck();
      } else {
        // Manual mode: typing invalidates any previous check result instead of triggering a new one.
        this.control.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.resetCheckState());
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  ngDoCheck(): void {
    const exclude = this.setting('excludeControlsWhenHidden') === true;
    const shouldInclude = !this.fieldHidden || !exclude;
    this.controlToggler.update(shouldInclude);
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'label', $title: 'Label', value: 'Label' }),
      new FxStringSetting({ key: 'placeholder', $title: 'Placeholder', value: '' }),
      new FxStringSetting({ key: 'helpText', $title: 'Help Text', value: '' }),
      new FxStringSetting({ key: 'customClass', $title: 'Custom Class Name', value: '' }),

      // Check mode
      new FxSelectSetting({ key: 'checkMode', $title: 'Check Mode', value: 'auto' }, [
        { option: 'Auto (as you type)', value: 'auto' },
        { option: 'Manual (search button)', value: 'manual' },
      ]),
      new FxStringSetting({ key: 'debounceTime', $title: 'Debounce Time (ms)', value: '500' }),
      new FxStringSetting({ key: 'minCharsToCheck', $title: 'Min Characters Before Checking', value: '1' }),
      new FxStringSetting({ key: 'searchButtonLabel', $title: 'Search Button Label', value: 'Search' }),

      // API
      new FxSelectSetting({ key: 'serviceName', $title: 'Service', value: '' }, [
        { option: 'User Service', value: 'user_service' },
        { option: 'Patient Service', value: 'patient_service' },
        { option: 'Workflow Service', value: 'workflow_service' },
      ]),
      new FxStringSetting({ key: 'apiUrl', $title: 'API Url', value: '' }),
      new FxSelectSetting({ key: 'httpMethod', $title: 'HTTP Method', value: 'GET' }, [
        { option: 'GET', value: 'GET' },
        { option: 'POST', value: 'POST' },
      ]),
      new FxStringSetting({ key: 'paramKey', $title: 'Param / Body Key', value: 'value' }),
      new FxStringSetting({ key: 'extraParams', $title: 'Extra Static Params (JSON)', value: '{}' }),
      new FxStringSetting({ key: 'responsePath', $title: 'Response Path (dot notation)', value: 'exists' }),
      new FxToggleSetting({ key: 'invertResult', $title: 'Invert Result (truthy = available)', value: false }),
      new FxSelectSetting({ key: 'onApiError', $title: 'On API Error', value: 'allow' }, [
        { option: 'Allow (treat as valid)', value: 'allow' },
        { option: 'Block (mark invalid)', value: 'block' },
      ]),
      new FxStringSetting({ key: 'apiErrorMessage', $title: 'API Error Message', value: 'Unable to verify right now. Please try again.' }),

      // Messages
      new FxStringSetting({ key: 'duplicateMessage', $title: 'Duplicate Message', value: 'This value already exists' }),
      new FxStringSetting({ key: 'checkingMessage', $title: 'Checking Message', value: 'Checking...' }),
      new FxToggleSetting({ key: 'showAvailableMessage', $title: 'Show Available Message', value: true }),
      new FxStringSetting({ key: 'availableMessage', $title: 'Available Message', value: 'Available' }),

      // Validation
      new FxToggleSetting({ key: 'isRequired', $title: 'Required', value: false }),
      new FxStringSetting({ key: 'requiredMessage', $title: 'Required Message', value: 'This field is required' }),
      new FxStringSetting({ key: 'minLength', $title: 'Min Length', value: '' }),
      new FxStringSetting({ key: 'minLengthMessage', $title: 'Min Length Message', value: 'Value is too short' }),
      new FxStringSetting({ key: 'maxLength', $title: 'Max Length', value: '' }),
      new FxStringSetting({ key: 'maxLengthMessage', $title: 'Max Length Message', value: 'Value is too long' }),
      new FxStringSetting({ key: 'pattern', $title: 'Pattern (Regex)', value: '' }),
      new FxStringSetting({ key: 'patternMessage', $title: 'Pattern Message', value: 'Invalid format' }),

      // Enable/disable gate: a condition list (privilege/supportingData/field rows, freely
      // combined via any/all) OR custom code — see shared/applicability.ts.
      new FxToggleSetting({ key: 'enableUseCode', $title: 'Enable: Use Custom Code', value: false }),
      new FxStringSetting({ key: 'enableConditions', $title: 'Enable Conditions', value: '[]' }),
      new FxStringSetting({ key: 'enableConditionsMatch', $title: 'Enable Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'enableCode', $title: 'Enable Code', value: '' }),

      // Visibility gate: same condition-list-or-code shape as enable.
      new FxToggleSetting({ key: 'visibilityUseCode', $title: 'Visibility: Use Custom Code', value: false }),
      new FxStringSetting({ key: 'visibilityConditions', $title: 'Visibility Conditions', value: '[]' }),
      new FxStringSetting({ key: 'visibilityConditionsMatch', $title: 'Visibility Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'visibilityCode', $title: 'Visibility Code', value: '' }),
      // Default MUST be false — see form-control-visibility.ts / the deepMergeObjects note elsewhere in the codebase.
      new FxToggleSetting({ key: 'excludeControlsWhenHidden', $title: 'Exclude Form Control When Hidden', value: false }),
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }

  get isEditing(): boolean {
    return this.fxData?.$fxForm?.$mode !== FxMode.VIEW;
  }

  get checkMode(): 'auto' | 'manual' {
    return this.setting('checkMode') === 'manual' ? 'manual' : 'auto';
  }

  /** Computes { visible, enabled } from privileges + supportingData + another field's live value. See shared/applicability.ts. */
  private get applicability(): { visible: boolean; enabled: boolean } {
    const visibility: GateConfig = {
      useCode: this.setting('visibilityUseCode') === true,
      code: this.setting('visibilityCode'),
      conditions: parseConditions(this.setting('visibilityConditions')),
      conditionsMatch: this.setting('visibilityConditionsMatch'),
    };
    const enable: GateConfig = {
      useCode: this.setting('enableUseCode') === true,
      code: this.setting('enableCode'),
      conditions: parseConditions(this.setting('enableConditions')),
      conditionsMatch: this.setting('enableConditionsMatch'),
    };
    return isApplicable(
      { visibility, enable },
      {
        privileges: this.wrapperService.privileges,
        supportingData: this.wrapperService.supportingData,
        resolveField: (name) => resolveSiblingControl(this.fxData, name)?.value,
      },
    );
  }

  /** Runtime-only: always visible/editable in the builder. */
  get fieldHidden(): boolean {
    if (this.isEditing) return false;
    return !this.applicability.visible;
  }

  get fieldDisabled(): boolean {
    if (this.isEditing) return false;
    return !this.applicability.enabled;
  }

  /** Bound on this component's OWN host element so hiding collapses the whole field, label included. */
  @HostBinding('hidden')
  get hostHidden(): boolean {
    return this.fieldHidden;
  }

  @HostBinding('attr.inert')
  get hostInert(): string | null {
    return this.fieldHidden ? '' : null;
  }

  onSettingsChanged(_config: any): void {
    this.applyValidators();
    this.detectChanges();
  }

  get isChecking(): boolean {
    return this.state === 'checking';
  }

  get statusMessage(): string | null {
    if (this.state === 'checking') return this.setting('checkingMessage') || 'Checking...';
    if (this.state === 'available' && this.setting('showAvailableMessage') === true) {
      return this.setting('availableMessage') || 'Available';
    }
    return null;
  }

  /** Sync-validator errors take priority; the duplicate-check error is only surfaced once those pass. */
  get errorMessage(): string | null {
    if (!this.control.touched) return null;
    if (this.control.hasError('required')) return this.setting('requiredMessage') || 'This field is required';
    if (this.control.hasError('minlength')) return this.setting('minLengthMessage') || 'Value is too short';
    if (this.control.hasError('maxlength')) return this.setting('maxLengthMessage') || 'Value is too long';
    if (this.control.hasError('pattern')) return this.setting('patternMessage') || 'Invalid format';
    if (this.control.hasError('duplicate')) return this.setting('duplicateMessage') || 'This value already exists';
    if (this.control.hasError('checkFailed')) return this.setting('apiErrorMessage') || 'Unable to verify right now. Please try again.';
    return null;
  }

  onSearchClick(): void {
    if (this.checkMode !== 'manual' || this.isChecking) return;
    this.control.markAsTouched();
    this.runCheck(this.control.value ?? '');
  }

  private setupAutoCheck(): void {
    this.control.valueChanges
      .pipe(
        debounceTime(this.debounceMs),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((value) => this.runCheck(value ?? ''));
  }

  private get debounceMs(): number {
    const parsed = Number(this.setting('debounceTime'));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 500;
  }

  private get minChars(): number {
    const parsed = Number(this.setting('minCharsToCheck'));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
  }

  private resetCheckState(): void {
    this.state = 'idle';
    this.clearCheckErrors();
  }

  private clearCheckErrors(): void {
    const errors = { ...(this.control.errors ?? {}) };
    delete errors['duplicate'];
    delete errors['checkFailed'];
    this.control.setErrors(Object.keys(errors).length ? errors : null);
  }

  private setCheckError(key: 'duplicate' | 'checkFailed'): void {
    const errors = { ...(this.control.errors ?? {}) };
    delete errors['duplicate'];
    delete errors['checkFailed'];
    errors[key] = true;
    this.control.setErrors(errors);
  }

  private runCheck(rawValue: string): void {
    const value = (rawValue ?? '').trim();

    if (!value || value.length < this.minChars) {
      this.state = 'idle';
      this.clearCheckErrors();
      this.detectChanges();
      return;
    }

    const apiUrl = this.setting('apiUrl');
    if (!apiUrl) {
      this.state = 'idle';
      return;
    }

    this.state = 'checking';
    this.detectChanges();

    this.buildRequest(apiUrl, value)
      .pipe(
        catchError(() => of({ __checkFailed: true })),
        takeUntil(this.destroy$),
      )
      .subscribe((response: any) => {
        if (response?.__checkFailed) {
          if (this.setting('onApiError') === 'block') {
            this.state = 'error';
            this.setCheckError('checkFailed');
          } else {
            this.state = 'idle';
            this.clearCheckErrors();
          }
          this.detectChanges();
          return;
        }

        const exists = this.extractExists(response);
        if (exists) {
          this.state = 'duplicate';
          this.setCheckError('duplicate');
        } else {
          this.state = 'available';
          this.clearCheckErrors();
        }
        this.detectChanges();
      });
  }

  private buildRequest(apiUrl: string, value: string) {
    const serviceUrl = this.fxApiService.getServiceUrl(this.setting('serviceName')) || '';
    const finalUrl = serviceUrl + apiUrl;
    const paramKey = this.setting('paramKey') || 'value';
    const extraParams = this.parseExtraParams();
    const payload = { ...extraParams, [paramKey]: value };

    if (this.setting('httpMethod') === 'POST') {
      return this.http.post<any>(finalUrl, payload);
    }
    return this.http.get<any>(finalUrl, { params: payload });
  }

  private parseExtraParams(): Record<string, any> {
    const raw = this.setting('extraParams');
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  /** Reads a dot-path (e.g. "data.exists") off the API response and applies the Invert Result setting. */
  private extractExists(response: any): boolean {
    const path = String(this.setting('responsePath') || 'exists');
    let cursor = response;
    for (const segment of path.split('.').filter(Boolean)) {
      cursor = cursor?.[segment];
    }
    const truthy = Boolean(cursor);
    return this.setting('invertResult') === true ? !truthy : truthy;
  }

  private applyValidators(): void {
    const validators = [];
    if (this.setting('isRequired') === true) validators.push(Validators.required);
    const minLength = Number(this.setting('minLength'));
    if (minLength > 0) validators.push(Validators.minLength(minLength));
    const maxLength = Number(this.setting('maxLength'));
    if (maxLength > 0) validators.push(Validators.maxLength(maxLength));
    const pattern = this.setting('pattern');
    if (pattern) validators.push(Validators.pattern(pattern));
    this.control.setValidators(validators);
    this.control.updateValueAndValidity({ emitEvent: false });
  }
}
