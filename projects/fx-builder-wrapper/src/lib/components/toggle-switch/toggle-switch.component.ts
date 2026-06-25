import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DoCheck, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
  FxBaseComponent,
  FxComponent,
  FxSetting,
  FxStringSetting,
  FxToggleSetting,
  FxValidation,
} from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { ConditionalDisableController, conditionalDisableSettings } from '../shared/conditional-disable';

/**
 * Toggle switch (label + slider + on/off text).
 *
 * Conditional disable: configure a control name + value(s); on every change
 * detection (ngDoCheck) the watched control's value is compared, and when it
 * matches, this toggle is disabled. The disabled value is preserved in the
 * submission (getRawValue includes disabled controls).
 */
@Component({
  selector: 'lib-toggle-switch',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FxComponent],
  templateUrl: './toggle-switch.component.html',
  styleUrl: './toggle-switch.component.css',
})
export class ToggleSwitchComponent extends FxBaseComponent implements DoCheck, OnDestroy {
  public toggleControl = new FormControl<boolean>(false);
  public isDisabled = false;
  private destroy$ = new Subject<void>();
  private destroyed = false;

  private disableController = new ConditionalDisableController(
    () => this.fxData,
    () => this.toggleControl,
    (key) => this.setting(key),
  );

  constructor(private cdr: ChangeDetectorRef, private wrapperService: FxBuilderWrapperService) {
    super(cdr);
    this.onInit.subscribe(() => this.initToggle());
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'label', $title: 'Label', value: 'Enable' }),
      new FxStringSetting({ key: 'onText', $title: 'On Text', value: 'On' }),
      new FxStringSetting({ key: 'offText', $title: 'Off Text', value: 'Off' }),
      new FxToggleSetting({ key: 'defaultOn', $title: 'Default On', value: false }),
      ...conditionalDisableSettings(),
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }

  ngDoCheck(): void {
    this.isDisabled = this.disableController.update();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── init / patch ────────────────────────────────────────────────────────

  private initToggle(): void {
    const defaultOn = this.setting('defaultOn');
    if (defaultOn === true || defaultOn === 'true') {
      this.toggleControl.setValue(true, { emitEvent: false });
    }
    this._register(this.toggleControl);

    // Pre-fill on edit — same variables$ self-patch pattern as the other custom fields.
    this.wrapperService.variables$.pipe(takeUntil(this.destroy$)).subscribe((vars) => {
      if (this.destroyed || !vars || !this.fxData?.name) return;
      if (!(this.fxData.name in vars)) return;
      const bool = this.toBool(vars[this.fxData.name]);
      if (this.toggleControl.value !== bool) {
        this.toggleControl.setValue(bool, { emitEvent: false });
        this.safeDetect();
      }
    });
  }

  private toBool(v: any): boolean {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return ['true', '1', 'yes', 'on'].includes(v.trim().toLowerCase());
    return !!v;
  }

  private safeDetect(): void {
    if (!this.destroyed) this.detectChanges();
  }
}
