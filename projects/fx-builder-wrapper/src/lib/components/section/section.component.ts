import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostBinding } from '@angular/core';
import { DndModule } from 'ngx-drag-drop';
import {
  FxBaseComponent,
  FxComponent,
  FxComponentResolver,
  FxMode,
  FxSetting,
  FxStringSetting,
  FxToggleSetting,
  FxValidation,
} from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { SectionSettingsPanelComponent } from './section-settings-panel.component';
import { GateConfig, isApplicable, parseConditions } from '../shared/applicability';
import { resolveSiblingControl } from '../shared/conditional-disable';

/**
 * Section box: a heading card that acts as a drop-zone container.
 * Settings (title, subtitle, columns, anchor key, privilege gate) are edited
 * via the custom SectionSettingsPanelComponent, which also provides the builder
 * chrome. Dropped fields render recursively via <fx-component-resolver>.
 *
 * Hidden fields inside always keep their control registered (and their value
 * included in the submitted form) — there is no "exclude from form when
 * hidden" option; only visual visibility is gated.
 */
@Component({
  selector: 'lib-section',
  standalone: true,
  imports: [CommonModule, DndModule, FxComponent, FxComponentResolver, SectionSettingsPanelComponent],
  templateUrl: './section.component.html',
  styleUrl: './section.component.css',
})
export class SectionComponent extends FxBaseComponent {
  constructor(private cdr: ChangeDetectorRef, private wrapperService: FxBuilderWrapperService) {
    super(cdr);
    this.onInit.subscribe(() => {
      // Treat this custom box as a layout container so the builder's outline
      // tree nests dropped elements inside it.
      this.fxData.type = 'LAYOUT';
    });
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'heading', $title: 'Section Title', value: 'Section' }),
      new FxStringSetting({ key: 'subtitle', $title: 'Subtitle', value: '' }),
      new FxStringSetting({ key: 'anchorKey', $title: 'Anchor Key', value: '' }),
      new FxStringSetting({ key: 'columns', $title: 'Columns', value: 2 }),
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

  get fieldCount(): number {
    return this.fxData?.elements?.length ?? 0;
  }

  get gridCols(): string {
    const c = Math.max(1, Math.min(4, Number(this.setting('columns')) || 1));
    return `repeat(${c}, minmax(0, 1fr))`;
  }

  get isEditing(): boolean {
    return this.fxData?.$fxForm?.$mode !== FxMode.VIEW;
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
   * Runtime-only: disable the whole section when the user's privileges don't
   * satisfy the configured requirement. Always editable in the builder. Uses
   * native disabled/inert (not FormControl.disable) so values still emit.
   */
  get privilegeDisabled(): boolean {
    if (this.isEditing) return false;
    return !this.applicability.enabled;
  }

  /**
   * Runtime-only: hide the whole section when the visibility rule/code says so.
   * Always visible in the builder. Uses [hidden] (not *ngIf) so dropped fields
   * stay registered and keep emitting values while hidden.
   */
  get sectionHidden(): boolean {
    if (this.isEditing) return false;
    return !this.applicability.visible;
  }

  /**
   * Bound on the component's OWN host element (<lib-section>), not just an
   * inner wrapper — so hiding collapses the whole custom element, including
   * the settings-panel's projected chrome, not just the fields inside it.
   */
  @HostBinding('hidden')
  get hostHidden(): boolean {
    return this.sectionHidden;
  }

  @HostBinding('attr.inert')
  get hostInert(): string | null {
    return this.sectionHidden ? '' : null;
  }

  onSettingsChanged(_config: any): void {
    this.detectChanges();
  }

  /** 1-based position among sibling section boxes (drives the badge number). */
  get stepNumber(): number {
    const all = this.collectSections(this.fxData?.$fxForm?.elements ?? []);
    const idx = all.indexOf(this.fxData);
    return idx >= 0 ? idx + 1 : 1;
  }

  private collectSections(elements: any[]): any[] {
    const out: any[] = [];
    for (const el of elements) {
      if (el?.selector === 'lib-section') out.push(el);
      if (el?.elements?.length) out.push(...this.collectSections(el.elements));
    }
    return out;
  }
}
