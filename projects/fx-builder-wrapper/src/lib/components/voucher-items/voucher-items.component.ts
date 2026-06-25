import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
  FxBaseComponent,
  FxComponent,
  FxMode,
  FxSetting,
  FxStringSetting,
  FxToggleSetting,
  FxValidation,
} from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';

interface VoucherItem {
  type: string;
  amount: number | null;
  validity: number | null;
  image: string | null;
  startDate: string | null;
  endDate: string | null;
  enablePartial: boolean;
  transferrable: boolean;
  createdAt: number | null;
}

/** Max image size (bytes) accepted for inline base64 storage. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Voucher / Coupon items: a fixed-field repeatable group. "Add Item" appends a
 * box, × removes one. Each box is a reactive FormGroup; the field value is a
 * FormArray (one object per box). Patching mirrors the other custom components
 * (uploader, dropdown-with-other): we self-patch from the wrapper's variables$.
 */
@Component({
  selector: 'lib-voucher-items',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FxComponent],
  templateUrl: './voucher-items.component.html',
  styleUrl: './voucher-items.component.css',
})
export class VoucherItemsComponent extends FxBaseComponent implements OnDestroy {
  public items = new FormArray<FormGroup>([]);
  private destroy$ = new Subject<void>();
  private destroyed = false;
  private _typeOptions?: string[];

  constructor(private cdr: ChangeDetectorRef, private wrapperService: FxBuilderWrapperService) {
    super(cdr);
    this.onInit.subscribe(() => this.initGroup());
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'groupTitle', $title: 'Group Title', value: 'COUPON / VOUCHER ITEMS' }),
      new FxStringSetting({ key: 'addButtonText', $title: 'Add Button Text', value: 'Add Item' }),
      new FxStringSetting({ key: 'itemLabel', $title: 'Item Label', value: 'ITEM' }),
      new FxStringSetting({ key: 'typeOptions', $title: 'Type Options (comma-separated)', value: 'Coupon,Voucher' }),
      new FxStringSetting({ key: 'minItems', $title: 'Minimum Items', value: 1 }),
      new FxStringSetting({ key: 'maxItems', $title: 'Maximum Items (0 = unlimited)', value: 0 }),
      new FxToggleSetting({ key: 'showCreatedAt', $title: 'Show Created At', value: true }),
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }

  // ── view helpers ──────────────────────────────────────────────────────────

  get isView(): boolean {
    return this.fxData?.$fxForm?.$mode === FxMode.VIEW;
  }

  get typeOptions(): string[] {
    // Memoised: settings don't change at runtime, and returning a fresh array
    // each change-detection cycle would re-render the <option> *ngFor needlessly.
    if (!this._typeOptions) {
      this._typeOptions = String(this.setting('typeOptions') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return this._typeOptions;
  }

  get minItems(): number {
    const n = Number(this.setting('minItems'));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  get maxItems(): number {
    const n = Number(this.setting('maxItems'));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; // 0 = unlimited
  }

  get canAdd(): boolean {
    return this.maxItems === 0 || this.items.length < this.maxItems;
  }

  canDelete(): boolean {
    return this.items.length > this.minItems;
  }

  asFG(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  showError(item: AbstractControl, key: string): boolean {
    const c = (item as FormGroup).get(key);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  imageOf(item: AbstractControl): string | null {
    return ((item as FormGroup).get('image')?.value as string) ?? null;
  }

  createdAtLabel(item: AbstractControl): string {
    const ts = (item as FormGroup).get('createdAt')?.value;
    return ts ? this.formatTs(Number(ts)) : '';
  }

  // ── actions ─────────────────────────────────────────────────────────────

  addItem(): void {
    if (!this.isView || !this.canAdd) return;
    this.items.push(this.makeItem());
    this.safeDetect();
  }

  removeItem(i: number): void {
    if (!this.canDelete() || !this.items.at(i)) return;
    this.items.removeAt(i);
    this.safeDetect();
  }

  onImageSelect(event: Event, i: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_IMAGE_BYTES) {
      const ctrl = this.items.at(i)?.get('image');
      ctrl?.setErrors({ maxSize: true });
      ctrl?.markAsTouched();
      this.safeDetect();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (this.destroyed) return;
      const ctrl = this.items.at(i)?.get('image');
      ctrl?.setValue(reader.result as string);
      ctrl?.markAsDirty();
      ctrl?.updateValueAndValidity();
      this.safeDetect();
    };
    reader.readAsDataURL(file);
  }

  removeImage(i: number): void {
    const ctrl = this.items.at(i)?.get('image');
    ctrl?.setValue(null);
    ctrl?.markAsTouched();
    this.safeDetect();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** detectChanges() guarded against firing after the view is destroyed. */
  private safeDetect(): void {
    if (this.destroyed) return;
    this.detectChanges();
  }

  // ── init / register / patch ───────────────────────────────────────────────

  private initGroup(): void {
    // Group value is an array; set it BEFORE _register so the base class's
    // patchValue(value) doesn't throw on the wrapper's default value:"".
    if (!Array.isArray(this.fxData.value)) this.fxData.value = [];

    this.items = new FormArray<FormGroup>([]);
    const initial = Math.max(this.minItems, 1); // always start with at least one box
    for (let i = 0; i < initial; i++) {
      this.items.push(this.makeItem());
    }
    this._register(this.items);

    // Self-patch from stored values (edit mode). Deferred to avoid re-entrant CD.
    this.wrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((vars) => setTimeout(() => this.applyPatch(vars), 0));
  }

  private applyPatch(vars: any): void {
    if (this.destroyed || !vars || !this.isView) return;
    const arr = vars[this.fxData?.name];
    if (!Array.isArray(arr)) return;

    const target = Math.max(this.minItems, arr.length);
    while (this.items.length < target) this.items.push(this.makeItem());
    while (this.items.length > target && this.items.length > 0) {
      this.items.removeAt(this.items.length - 1);
    }
    arr.forEach((row: any, i: number) => {
      const fg = this.items.at(i);
      if (fg) fg.patchValue(this.normalizeRow(row), { emitEvent: false });
    });
    this.safeDetect();
  }

  // ── factory / normalisers ──────────────────────────────────────────────────

  private makeItem(value?: Partial<VoucherItem>): FormGroup {
    const opts = this.typeOptions;
    return new FormGroup({
      type: new FormControl(value?.type ?? opts[0] ?? '', Validators.required),
      amount: new FormControl(value?.amount ?? null, [Validators.required, Validators.min(0)]),
      validity: new FormControl(value?.validity ?? null, [Validators.required, Validators.min(0)]),
      image: new FormControl(value?.image ?? null, Validators.required),
      startDate: new FormControl(value?.startDate ?? null),
      endDate: new FormControl(value?.endDate ?? null),
      enablePartial: new FormControl(value?.enablePartial ?? false),
      transferrable: new FormControl(value?.transferrable ?? false),
      createdAt: new FormControl(value?.createdAt ?? this.nowTs()),
    });
  }

  /** Coerce a stored row into the shapes the controls expect. */
  private normalizeRow(row: any): Partial<VoucherItem> {
    if (!row || typeof row !== 'object') return {};
    const out: any = { ...row };
    if ('amount' in out) out.amount = this.toNum(out.amount);
    if ('validity' in out) out.validity = this.toNum(out.validity);
    if ('startDate' in out) out.startDate = this.toDateInput(out.startDate);
    if ('endDate' in out) out.endDate = this.toDateInput(out.endDate);
    if ('enablePartial' in out) out.enablePartial = !!out.enablePartial;
    if ('transferrable' in out) out.transferrable = !!out.transferrable;
    return out;
  }

  private toNum(v: any): number | null {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private toDateInput(v: any): string | null {
    if (!v) return null;
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  private nowTs(): number {
    try {
      return new Date().getTime();
    } catch {
      return 0;
    }
  }

  private formatTs(ts: number): string {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
