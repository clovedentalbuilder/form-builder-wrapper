import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FxForm, FxUtils } from '@instantsys-labs/fx';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import { FxBuilderWrapperComponent, FxFormWrapperComponent } from 'fx-builder-wrapper';

const LS_FORM_KEY = 'fx_test_form';
const LS_VARS_KEY  = 'fx_test_variables';

type Mode = 'build' | 'preview' | 'edit';

@Component({
  selector: 'app-form-test',
  standalone: true,
  imports: [CommonModule, FxBuilderWrapperComponent, FxFormWrapperComponent],
  template: `
    <!-- ── Top Bar ──────────────────────────────────────────────── -->
    <div class="ft-topbar">
      <div class="ft-brand">
        <span class="ft-brand-dot"></span>
        Form Playground
      </div>

      <div class="ft-tabs">
        <button class="ft-tab" [class.ft-tab--active]="mode === 'build'" (click)="goToBuild()">
          &#9998; Build
        </button>
        <span class="ft-arrow">&#8250;</span>
        <button class="ft-tab" [class.ft-tab--active]="mode === 'preview'" [disabled]="!hasSaved" (click)="goToPreview()">
          &#9654; Preview
        </button>
        <span class="ft-arrow">&#8250;</span>
        <button class="ft-tab" [class.ft-tab--active]="mode === 'edit'" [disabled]="!submittedData" (click)="goToEdit()">
          &#9998; Edit Submission
        </button>
      </div>

      <div class="ft-topbar-right">
        <span class="ft-saved-badge" *ngIf="hasSaved && mode === 'build'">&#10003; Saved</span>
        <button class="ft-btn ft-btn--ghost" (click)="newForm()">&#10005; New</button>
      </div>
    </div>

    <!-- ── Status strip ──────────────────────────────────────────── -->
    <div class="ft-strip ft-strip--{{ mode }}">
      <ng-container [ngSwitch]="mode">
        <span *ngSwitchCase="'build'">
          <strong>Build Mode</strong> &mdash; design your form then click
          <strong>Save &amp; Preview</strong>.
        </span>
        <span *ngSwitchCase="'preview'">
          <strong>Preview Mode</strong> &mdash; fill the form and click
          <strong>Submit</strong>.
        </span>
        <span *ngSwitchCase="'edit'">
          <strong>Edit Submission</strong> &mdash; form is pre-filled with your
          last submission. Update and re-submit.
        </span>
      </ng-container>
    </div>

    <!-- ── BUILD ─────────────────────────────────────────────────── -->
    <ng-container *ngIf="mode === 'build'">
      <div class="ft-content">
        <fx-builder-wrapper [fx-form]="fxForm" #builderRef></fx-builder-wrapper>
      </div>
      <div class="ft-footer">
        <button class="ft-btn ft-btn--primary" (click)="saveAndPreview(builderRef)">
          &#9654;&nbsp; Save &amp; Preview
        </button>
        <button class="ft-btn ft-btn--outline" (click)="saveForm(builderRef)">
          &#128190;&nbsp; Save
        </button>
      </div>
    </ng-container>

    <!-- ── PREVIEW (blank form) ───────────────────────────────────── -->
    <ng-container *ngIf="mode === 'preview' && savedForm">
      <div class="ft-content ft-content--form">
        <fx-form-component
          [fxForm]="savedForm"
          (fxFormSubmit)="onSubmit($event)"
          #previewRef
        ></fx-form-component>
      </div>
      <div class="ft-footer">
        <button class="ft-btn ft-btn--primary" (click)="previewRef.submit()">
          &#10003;&nbsp; Submit
        </button>
        <button class="ft-btn ft-btn--outline" (click)="goToBuild()">
          &#8592;&nbsp; Back to Builder
        </button>
      </div>
    </ng-container>

    <!-- ── EDIT (pre-filled with last submission) ─────────────────── -->
    <ng-container *ngIf="mode === 'edit' && savedForm">
      <div class="ft-content ft-content--form">

        <div class="ft-submitted-banner" *ngIf="submittedData">
          <span class="ft-submitted-label">Last submitted data (pre-filled below)</span>
          <pre class="ft-submitted-json">{{ submittedData | json }}</pre>
        </div>

        <fx-form-component
          [fxForm]="savedForm"
          [variables]="patchVariables"
          (fxFormSubmit)="onSubmit($event)"
          #editRef
        ></fx-form-component>
      </div>
      <div class="ft-footer">
        <button class="ft-btn ft-btn--primary" (click)="editRef.submit()">
          &#10003;&nbsp; Re-submit
        </button>
        <button class="ft-btn ft-btn--outline" (click)="goToPreview()">
          &#8592;&nbsp; Fresh Preview
        </button>
        <button class="ft-btn ft-btn--ghost" (click)="goToBuild()">
          &#9998;&nbsp; Builder
        </button>
      </div>
    </ng-container>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: #f1f5f9;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .ft-topbar {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      background: #0f172a;
      padding: 0 1.25rem;
      height: 52px;
      flex-shrink: 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    }
    .ft-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.88rem;
      font-weight: 700;
      color: #f1f5f9;
      white-space: nowrap;
    }
    .ft-brand-dot {
      width: 10px; height: 10px;
      background: #3b82f6;
      border-radius: 50%;
    }

    .ft-tabs {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex: 1;
    }
    .ft-tab {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.35rem 0.875rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .ft-tab:hover:not(:disabled) { background: rgba(255,255,255,0.07); color: #cbd5e1; }
    .ft-tab--active { background: #2563eb !important; color: #fff !important; }
    .ft-tab:disabled { opacity: 0.35; cursor: not-allowed; }
    .ft-arrow { color: #334155; font-size: 1rem; }

    .ft-topbar-right { display: flex; align-items: center; gap: 0.75rem; }
    .ft-saved-badge { font-size: 0.72rem; font-weight: 600; color: #4ade80; }

    .ft-strip {
      font-size: 0.8rem;
      padding: 0.45rem 1.25rem;
      border-bottom: 1px solid transparent;
      flex-shrink: 0;
    }
    .ft-strip--build   { background: #eff6ff; color: #1e40af; border-color: #dbeafe; }
    .ft-strip--preview { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
    .ft-strip--edit    { background: #fefce8; color: #713f12; border-color: #fde68a; }

    .ft-content { flex: 1; overflow: auto; }
    .ft-content--form {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .ft-submitted-banner {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .ft-submitted-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #92400e;
      background: #fefce8;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #fde68a;
    }
    .ft-submitted-json {
      margin: 0;
      padding: 1rem;
      background: #0f172a;
      color: #7dd3fc;
      font-family: 'Cascadia Code', monospace;
      font-size: 0.78rem;
      line-height: 1.6;
      max-height: 180px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .ft-footer {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
      background: #fff;
      border-top: 1px solid #e2e8f0;
      flex-shrink: 0;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
    }

    .ft-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.5rem 1.1rem;
      cursor: pointer;
      border: 1.5px solid transparent;
      transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
    }
    .ft-btn:active { transform: scale(0.97); }

    .ft-btn--primary {
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      color: #fff;
      box-shadow: 0 2px 8px rgba(59,130,246,0.3);
    }
    .ft-btn--primary:hover {
      background: linear-gradient(135deg, #1e3a8a, #2563eb);
      box-shadow: 0 4px 14px rgba(59,130,246,0.42);
    }
    .ft-btn--outline {
      background: #fff;
      color: #374151;
      border-color: #d1d5db;
    }
    .ft-btn--outline:hover { background: #f9fafb; border-color: #9ca3af; }
    .ft-btn--ghost {
      background: transparent;
      color: #94a3b8;
    }
    .ft-btn--ghost:hover { background: #f1f5f9; color: #475569; }
  `]
})
export class FormTestComponent implements OnInit {
  mode: Mode = 'build';

  // Passed to fx-builder-wrapper — builder mutates it in place
  fxForm: FxForm = FxUtils.createNewForm();

  // Clean plain-data form loaded from localStorage — passed to fx-form-component
  savedForm: FxForm | null = null;

  // Pre-fill variables for Edit mode (last submitted data)
  patchVariables: any = null;

  // Last submitted payload
  submittedData: any = null;

  hasSaved = false;

  private apiRegistry = inject(ApiServiceRegistry);

  ngOnInit(): void {
    this.apiRegistry.registerService({
      service: 'User Service',
      url: 'http://local.prm2.com:9007',
      name: 'User Service',
      swagger_url: '/v3/api-docs',
      description: 'User Service APIs'
    });

    // Restore saved form from localStorage (clean JSON — safe to assign directly)
    const savedForm = localStorage.getItem(LS_FORM_KEY);
    if (savedForm) {
      try { this.fxForm = JSON.parse(savedForm); this.hasSaved = true; } catch { /* ignore */ }
    }

    // Restore last submitted variables
    const savedVars = localStorage.getItem(LS_VARS_KEY);
    if (savedVars) {
      try { this.submittedData = JSON.parse(savedVars); } catch { /* ignore */ }
    }
  }

  // ── Save: use the library's own API to get a clean parsed form ──
  // builderRef.getParsedForm() returns a circular-ref-free FxForm
  // FxUtils.stringifyForm() is the library's safe serializer
  saveForm(builderRef: FxBuilderWrapperComponent): void {
    const parsedForm = builderRef.getParsedForm();
    localStorage.setItem(LS_FORM_KEY, FxUtils.stringifyForm(parsedForm));
    this.hasSaved = true;
  }

  saveAndPreview(builderRef: FxBuilderWrapperComponent): void {
    this.saveForm(builderRef);
    this.goToPreview();
  }

  goToPreview(): void {
    const saved = localStorage.getItem(LS_FORM_KEY);
    if (!saved) return;
    this.savedForm      = JSON.parse(saved);
    this.patchVariables = null;   // blank form — no pre-fill
    this.mode = 'preview';
  }

  goToEdit(): void {
    const saved = localStorage.getItem(LS_FORM_KEY);
    if (!saved) return;
    this.savedForm = JSON.parse(saved);

    // Pre-fill the form with the last submitted data
    const vars = localStorage.getItem(LS_VARS_KEY);
    this.patchVariables = vars ? JSON.parse(vars) : null;
    this.mode = 'edit';
  }

  goToBuild(): void {
    // Reload clean JSON from localStorage so the builder starts from a fresh plain object
    const saved = localStorage.getItem(LS_FORM_KEY);
    if (saved) {
      try { this.fxForm = JSON.parse(saved); } catch { /* ignore */ }
    }
    this.mode = 'build';
  }

  onSubmit(event: any): void {
    // fx-form emits the Angular FormGroup, not plain values.
    // getRawValue() recursively extracts all control values (including disabled)
    // as a plain JS object — safe to JSON.stringify and display with | json.
    const plainData = (typeof event?.getRawValue === 'function')
      ? event.getRawValue()
      : event;

    this.submittedData = plainData;
    localStorage.setItem(LS_VARS_KEY, JSON.stringify(plainData));
  }

  newForm(): void {
    localStorage.removeItem(LS_FORM_KEY);
    localStorage.removeItem(LS_VARS_KEY);
    this.fxForm        = FxUtils.createNewForm();
    this.savedForm     = null;
    this.patchVariables = null;
    this.submittedData  = null;
    this.hasSaved       = false;
    this.mode = 'build';
  }
}
