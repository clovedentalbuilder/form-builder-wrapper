import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import {
  FxBaseComponent,
  FxComponent,
  FxSetting,
  FxStringSetting,
  FxValidation,
  FxValidatorService
} from '@instantsys-labs/fx';
import { CalendarModule } from 'primeng/calendar';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'lib-date-picker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FxComponent, CalendarModule],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.css'
})
export class DatePickerComponent extends FxBaseComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);

  minDate!: string;
  maxDate!: string;

  @ViewChild('fxComponent') fxComponent!: FxComponent;
  private destroy$ = new Subject<boolean>();
  datePickerMap = new Map<string, any>();
  trtStartDatePatch!: string;

  public datePickerForm: FormGroup = this.fb.group({
    date: ['', [Validators.required]],
  });

  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private fxBuilderWrapperService: FxBuilderWrapperService
  ) {
    super(cdr);
    this.onInit.subscribe(() => {
      this._register(this.datePickerForm);
    });
  }

  ngOnInit(): void {
    this.fxBuilderWrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((variables: any) => {
        if (!variables) return;

        this.datePickerMap = new Map<string, any>();

        for (const [key, value] of Object.entries(variables) as [string, any][]) {
          if (value && typeof value === 'object' && 'date' in value) {
            this.datePickerMap.set(key, value);
          }

          if (key === 'trtStartDatePatch' && typeof value === 'string') {
            this.trtStartDatePatch = value.split('T')[0];
          }
        }
      });
  }

  get dateControl() {
    return this.datePickerForm.get('date');
  }

  ngAfterViewInit(): void {
    const key = this.fxComponent?.fxData?.name;

    if (key) {
      const datePatch = this.datePickerMap.get(key);

      // ── Build min / max ──────────────────────────────────────────────
      const todayDate = new Date();
      const todayFormatted = this.formatDate(todayDate);

      if (this.trtStartDatePatch) {
        this.minDate = this.trtStartDatePatch;
      } else {
        const defaultMin = new Date();
        defaultMin.setDate(todayDate.getDate() - 30);
        this.minDate = this.formatDate(defaultMin);
      }
      this.maxDate = todayFormatted;

      // ── Attach range validator (Safari / iOS fallback) ───────────────
      this.attachRangeValidator();

      // ── Patch initial value ──────────────────────────────────────────
      const rawDate = datePatch?.date ?? datePatch;
      const normalized = this.normalizeDate(rawDate) ?? todayFormatted;
      const clamped = this.clampToRange(normalized);
      this.datePickerForm.patchValue({ date: clamped });
    }

    this.getContextBaseId();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // The key handler — called on every (change) and (blur).
  // On iOS Safari the native wheel picker fires "change" AFTER the user
  // confirms. We read the value, clamp it, write it back to BOTH the
  // reactive form AND the native DOM element so the input visually resets.
  // ─────────────────────────────────────────────────────────────────────────
  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input?.value;

    const normalized = this.normalizeDate(raw);
    if (!normalized) return;

    const clamped = this.clampToRange(normalized);

    // 1. Update reactive form
    this.datePickerForm.patchValue({ date: clamped });

    // 2. Write back to the native input — REQUIRED for iOS Safari.
    //    Without this the picker wheel snaps back to the out-of-range date
    //    visually even though the form value is correct.
    if (input.value !== clamped) {
      input.value = clamped;
    }

    this.cdr.detectChanges();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Custom Angular validator — enforces range at form level.
  // This is the safety net for browsers that ignore HTML min/max.
  // ─────────────────────────────────────────────────────────────────────────
  private attachRangeValidator(): void {
    const ctrl = this.datePickerForm.get('date');
    if (!ctrl) return;

    ctrl.addValidators((control: AbstractControl): ValidationErrors | null => {
      const v = control.value;
      if (!v) return null;
      if (this.minDate && v < this.minDate) return { minDate: { min: this.minDate, actual: v } };
      if (this.maxDate && v > this.maxDate) return { maxDate: { max: this.maxDate, actual: v } };
      return null;
    });

    ctrl.updateValueAndValidity();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private clampToRange(date: string): string {
    if (this.minDate && date < this.minDate) return this.minDate;
    if (this.maxDate && date > this.maxDate) return this.maxDate;
    return date;
  }

  /**
   * Safely converts any date-like value to a YYYY-MM-DD string.
   * Returns null for invalid / empty values.
   *
   * NOTE: We avoid toISOString() because it converts to UTC, which can
   * shift the date by one day for users in IST (UTC+5:30) and other
   * positive-offset time zones.
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeDate(value: unknown): string | null {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : this.formatDate(value);
    }

    if (typeof value !== 'string') return null;

    const dateOnly = value.includes('T') ? value.split('T')[0] : value;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;

    // Parse as local midnight to avoid UTC-shift issues
    const parsed = new Date(`${dateOnly}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : this.formatDate(parsed);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Optional API-driven range (kept from original)
  // ─────────────────────────────────────────────────────────────────────────
  getRangeValues(): void {
    this.http.get<any>(this.setting('apiURL')).subscribe(response => {
      const today = new Date();

      const minOffset = response[this.setting('minDateKey')] || this.setting('minValidation');
      const maxOffset = response[this.setting('maxDateKey')] || this.setting('maxValidation');

      const min = new Date();
      min.setDate(today.getDate() + minOffset);

      const max = new Date();
      max.setDate(today.getDate() + maxOffset);

      this.minDate = this.formatDate(min);
      this.maxDate = this.formatDate(max);

      // Re-attach validator so the new range is enforced
      this.attachRangeValidator();
    });
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'minValidation', $title: 'Min Validation', value: '' }),
      new FxStringSetting({ key: 'maxValidation', $title: 'Max Validation', value: '' }),
      new FxStringSetting({ key: 'apiURL', $title: 'API Url', value: '' }),
      new FxStringSetting({ key: 'minDateKey', $title: 'Min Range API Key', value: '' }),
      new FxStringSetting({ key: 'maxDateKey', $title: 'Max Range API Key', value: '' }),
      new FxStringSetting({ key: 'placeHolder', $title: 'Placeholder', value: 'Select Date' }),
      new FxStringSetting({ key: 'label', $title: 'Label', value: '' }),
      new FxStringSetting({ key: 'datePickerErrorMessage', $title: 'Error Message', value: 'Please fill out the field' }),
    ];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}