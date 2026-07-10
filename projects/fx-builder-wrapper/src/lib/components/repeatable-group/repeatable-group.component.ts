import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostBinding, OnDestroy } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DndModule } from 'ngx-drag-drop';
import {
  FxBaseComponent,
  FxComponent,
  FxFormComponent,
  FxMode,
  FxScope,
  FxSetting,
  FxStringSetting,
  FxToggleSetting,
  FxUtils,
  FxValidation,
} from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { RepeatableGroupSettingsPanelComponent } from './repeatable-group-settings-panel.component';
import { GateConfig, isApplicable, parseConditions } from '../shared/applicability';
import { resolveSiblingControl } from '../shared/conditional-disable';

/**
 * Repeatable group: outer header (title + "Add Item") over a list of boxes.
 * Each box is a sub-form rendered via <fx-form> bound to its own FormGroup;
 * the aggregate value is a FormArray (one object per box).
 *
 * KEY DESIGN POINT — structure vs data:
 *   The builder saves only ONE template box (Add Item is disabled there).
 *   Runtime-added boxes are DATA (the submitted array), not structure. So on
 *   re-render/edit we cannot rely on fxData.elements to know how many boxes to
 *   show — the saved VALUE ARRAY is the source of truth. We rebuild that many
 *   boxes (clones of the template), then patch each.
 *
 * Two correctness guards:
 *   1. The wrapper registers custom fields with value:"" (a string). The base
 *      _register() runs FormArray.patchValue(value) before addControl(), and
 *      patchValue("") THROWS — which would leave the FormArray unattached and
 *      submit empty. We normalise value to [] first.
 *   2. Box clones must keep field NAMES (regenerate ids only) so a saved value,
 *      keyed by name, patches back on edit. FxUtils.copyForm renames fields.
 *
 * Hidden groups always keep their FormArray registered and value included in
 * the form — there is no "exclude from form when hidden" option; only visual
 * visibility is gated.
 */
@Component({
  selector: 'lib-repeatable-group',
  standalone: true,
  imports: [CommonModule, DndModule, FxComponent, FxFormComponent, RepeatableGroupSettingsPanelComponent],
  templateUrl: './repeatable-group.component.html',
  styleUrl: './repeatable-group.component.css',
})
export class RepeatableGroupComponent extends FxBaseComponent implements OnDestroy {
  public formArray = new FormArray<FormGroup>([]);
  /** Per-box values, fed to each inner <fx-form> [value] for lifecycle-timed patching. */
  public rowValues: any[] = [];
  private varsSub?: Subscription;

  constructor(private cdr: ChangeDetectorRef, private wrapperService: FxBuilderWrapperService) {
    super(cdr);
    this.onInit.subscribe((fxData: any) => this.initGroup(fxData));
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'groupTitle', $title: 'Group Title', value: 'ITEMS' }),
      new FxStringSetting({ key: 'addButtonText', $title: 'Add Button Text', value: 'Add Item' }),
      new FxStringSetting({ key: 'itemLabel', $title: 'Item Label', value: 'ITEM' }),
      new FxToggleSetting({ key: 'showCreatedAt', $title: 'Show Created At', value: true }),
      new FxStringSetting({ key: 'showInListing', $title: 'Show In Listing', value: false }),
      // Visibility gate: a condition list (privilege/supportingData/field rows, freely combined
      // via any/all) OR custom code — see shared/applicability.ts.
      new FxToggleSetting({ key: 'visibilityUseCode', $title: 'Visibility: Use Custom Code', value: false }),
      new FxStringSetting({ key: 'visibilityConditions', $title: 'Visibility Conditions', value: '[]' }),
      new FxStringSetting({ key: 'visibilityConditionsMatch', $title: 'Visibility Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'visibilityCode', $title: 'Visibility Code', value: '' }),
      // Enable/disable gate: same condition-list-or-code shape as visibility.
      new FxToggleSetting({ key: 'enableUseCode', $title: 'Enable: Use Custom Code', value: false }),
      new FxStringSetting({ key: 'enableConditions', $title: 'Enable Conditions', value: '[]' }),
      new FxStringSetting({ key: 'enableConditionsMatch', $title: 'Enable Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'enableCode', $title: 'Enable Code', value: '' }),
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }

  get isView(): boolean {
    return this.fxData?.$fxForm?.$mode === FxMode.VIEW;
  }

  get mode(): FxMode {
    return this.fxData?.$fxForm?.$mode ?? FxMode.VIEW;
  }

  /** Computes { visible, enabled } from privileges + supportingData + sibling fields. See shared/applicability.ts. */
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

  /**
   * Runtime-only: disable the whole group when privileges aren't satisfied.
   * Always editable in the builder. Native disabled/inert keeps values emitting.
   */
  get privilegeDisabled(): boolean {
    if (!this.isView) return false;
    return !this.applicability.enabled;
  }

  /**
   * Runtime-only: hide the whole group when the visibility rule/code says so.
   * Always visible in the builder. Uses [hidden] (not *ngIf) so rows stay
   * registered and keep emitting values while hidden.
   */
  get groupHidden(): boolean {
    if (!this.isView) return false;
    return !this.applicability.visible;
  }

  /**
   * Bound on the component's OWN host element (<lib-repeatable-group>), not just
   * an inner wrapper — so hiding collapses the whole custom element, including
   * the settings-panel's projected chrome, not just the fields inside it.
   */
  @HostBinding('hidden')
  get hostHidden(): boolean {
    return this.groupHidden;
  }

  @HostBinding('attr.inert')
  get hostInert(): string | null {
    return this.groupHidden ? '' : null;
  }

  onSettingsChanged(_config: any): void {
    this.detectChanges();
  }

  getFG(index: number): FormGroup {
    return this.formArray.at(index) as FormGroup;
  }

  /**
   * Each row is rendered by a nested <fx-form>, which sets $mode/$viewMode but
   * NOT $scope. The settings dialog gates every editor on
   * `$fxForm.$scope >= setting.scope`, so without this the nested fields show no
   * settings (and Name/Lock become read-only). Propagate the parent form's scope
   * onto the row before the inner form renders. Returns the row for template use.
   */
  withScope(row: any): any {
    if (row) row.$scope = this.fxData?.$fxForm?.$scope ?? FxScope.DEFAULT;
    return row;
  }

  /** Keep box DOM/form-state stable across add/delete so values aren't lost. */
  trackRow = (_: number, row: any): any => row?.id;

  addMore(): void {
    if (!this.isView || !this.fxData.elements?.length) return;
    this.fxData.elements.push(this.cloneRow(this.fxData.elements[0]));
    this.formArray.push(new FormGroup({}));
    this.fxData.$parent?.render();
  }

  delete(i: number): void {
    if (this.fxData.elements && this.fxData.elements.length > 1) {
      this.fxData.elements.splice(i, 1);
      this.formArray.removeAt(i);
      this.rowValues.splice(i, 1);
    }
  }

  createdAt(row: any): string {
    return row?.$createdAt ?? '';
  }

  ngOnDestroy(): void {
    this.varsSub?.unsubscribe();
  }

  // ── init / patch ────────────────────────────────────────────────────────

  private initGroup(fxData: any): void {
    if (!fxData.elements || fxData.elements.length === 0) {
      fxData.elements = [this.makeTemplateRow()];
    }
    // Must be an array BEFORE _register, else base patchValue("") throws.
    if (!Array.isArray(fxData.value)) fxData.value = [];

    this.formArray = new FormArray<FormGroup>([]);
    fxData.elements.forEach(() => this.formArray.push(new FormGroup({})));
    this._register(this.formArray);

    // fxData/$fxForm are set now, so the subscription (which replays the current
    // value immediately) runs with a valid context. Heavy work is deferred to a
    // microtask to stay off the init/change-detection stack.
    this.varsSub = this.wrapperService.variables$.subscribe(() => this.onValueArrived());
  }

  private onValueArrived(): void {
    if (!this.isView) return;
    setTimeout(() => this.syncFromValue(), 0);
  }

  /** Rebuild boxes to match the stored value array, then patch each box. */
  private syncFromValue(): void {
    if (!this.fxData?.elements?.length) return;
    const stored = this.storedValue();
    if (!stored.length) return;

    this.rowValues = stored;
    const target = Math.max(1, stored.length);
    const template = this.fxData.elements[0];

    while (this.fxData.elements.length < target) {
      this.fxData.elements.push(this.cloneRow(template));
      this.formArray.push(new FormGroup({}));
    }
    while (this.fxData.elements.length > target && this.fxData.elements.length > 1) {
      const last = this.fxData.elements.length - 1;
      this.fxData.elements.splice(last, 1);
      this.formArray.removeAt(last);
    }

    this.fxData.$parent?.render();

    // Backstop for already-rendered boxes (whose inner <fx-form> already passed
    // its own patch lifecycle): patch the FormArray once inner fields registered.
    setTimeout(() => {
      this.formArray.patchValue(this.rowValues);
      this.detectChanges();
    }, 200);
  }

  /** Current stored value for this field from the wrapper's variables stream. */
  private storedValue(): any[] {
    const vars = this.wrapperService.variables$.value;
    const arr = vars?.[this.fxData?.name];
    return Array.isArray(arr) ? arr : [];
  }

  // ── cloning ─────────────────────────────────────────────────────────────

  /** Deep clone a box keeping field NAMES (regenerate ids only) so values patch back. */
  private cloneRow(row: any): any {
    const clone = JSON.parse(JSON.stringify(row, (k, v) => (k.startsWith('$') ? undefined : v)));
    this.regenerateIds(clone);
    clone.$createdAt = this.now();
    return clone;
  }

  private regenerateIds(node: any): void {
    if (!node || typeof node !== 'object') return;
    if (typeof node.id === 'string') node.id = FxUtils.generateUUID();
    if (Array.isArray(node.elements)) node.elements.forEach((e: any) => this.regenerateIds(e));
    if (Array.isArray(node.forms)) node.forms.forEach((f: any) => this.regenerateIds(f));
  }

  private makeTemplateRow(): any {
    return {
      id: FxUtils.generateUUID(),
      name: 'item-row',
      type: 'FORM',
      elements: [
        {
          id: FxUtils.generateUUID(),
          name: 'layout',
          type: 'LAYOUT',
          selector: 'fx-layout',
          elements: [],
          settings: [new FxStringSetting({ key: 'columns', value: 3 })],
        },
      ],
      logics: [],
      before: [],
      after: [],
      $createdAt: this.now(),
    };
  }

  private now(): string {
    try {
      return new Date().toLocaleString();
    } catch {
      return '';
    }
  }
}
