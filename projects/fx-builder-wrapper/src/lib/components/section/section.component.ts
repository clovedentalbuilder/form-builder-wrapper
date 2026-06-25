import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { DndModule } from 'ngx-drag-drop';
import {
  FxBaseComponent,
  FxComponent,
  FxComponentResolver,
  FxMode,
  FxSetting,
  FxStringSetting,
  FxValidation,
} from '@instantsys-labs/fx';

/**
 * Section box: a heading card that acts as a drop-zone container.
 * Mirrors the built-in fx-panel-layout pattern (empty <fx-component> for the
 * builder chrome + a separate droppable card so the dropzone is not trapped
 * under fx-component's pointer-events-none wrapper), with a richer header
 * (number badge, title, subtitle, field-count chip) to match the mockup.
 *
 * Dropped fields are appended to fxData.elements by the inherited addElement()
 * and rendered recursively via <fx-component-resolver>.
 */
@Component({
  selector: 'lib-section',
  standalone: true,
  imports: [CommonModule, DndModule, FxComponent, FxComponentResolver],
  templateUrl: './section.component.html',
  styleUrl: './section.component.css',
})
export class SectionComponent extends FxBaseComponent {
  constructor(private cdr: ChangeDetectorRef) {
    super(cdr);
    this.onInit.subscribe(() => {
      // Treat this custom box as a layout container so the builder's outline
      // tree nests dropped elements inside it (onDrop branches on type === 'LAYOUT').
      // The canvas dropzone itself is template-driven and works regardless.
      this.fxData.type = 'LAYOUT';
    });
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'heading', $title: 'Section Title', value: 'Section' }),
      new FxStringSetting({ key: 'subtitle', $title: 'Subtitle', value: '' }),
      new FxStringSetting({
        key: 'anchorKey',
        $title: 'Anchor Key',
        value: '',
        $description: 'Stable id the Stepper targets for scroll (e.g. basic-info). Falls back to the title if blank.',
      }),
      new FxStringSetting({
        key: 'columns',
        $title: 'Columns',
        value: 2,
        $description: 'Number of columns in the field grid (1-4).',
      }),
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
