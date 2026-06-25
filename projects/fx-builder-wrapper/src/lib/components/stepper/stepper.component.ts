import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import {
  FxBaseComponent,
  FxComponent,
  FxJsonSetting,
  FxSetting,
  FxStringSetting,
  FxUtils,
  FxValidation,
} from '@instantsys-labs/fx';

interface StepperStep {
  label: string;
  target: string;
}

/**
 * Configurable stepper. Steps are defined explicitly via a JSON setting
 * (each { label, target }); `target` matches a Section box's "Anchor Key"
 * (or its title). Clicking a step scrolls to that section's rendered DOM node
 * via FxUtils.scrollToElement (getElementById + scrollIntoView).
 *
 * If the JSON is empty/invalid, steps are auto-derived from the sibling
 * Section boxes so the stepper still works before being configured.
 */
@Component({
  selector: 'lib-stepper',
  standalone: true,
  imports: [CommonModule, FxComponent],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.css',
})
export class StepperComponent extends FxBaseComponent implements AfterViewInit, OnDestroy {
  public activeIndex = 0;
  private observer?: IntersectionObserver;

  constructor(private cdr: ChangeDetectorRef) {
    super(cdr);
  }

  protected settings(): FxSetting[] {
    return [
      new FxJsonSetting({
        key: 'steps',
        $title: 'Steps (JSON)',
        $description: 'Array of { "label": "...", "target": "<section anchor key or title>" }.',
        value: [
          { label: 'Basic Info', target: 'basic-info' },
          { label: 'Sitting & Duration', target: 'sitting-duration' },
        ],
      }),
      new FxStringSetting({ key: 'stepperClass', $title: 'Custom Class', value: '' }),
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }

  /** Steps from the JSON setting; falls back to auto-derived from sibling sections. */
  get steps(): StepperStep[] {
    const parsed = this.parseSteps(this.setting('steps'));
    if (parsed.length) return parsed;
    return this.sections().map((s) => ({
      label: this.settingOf(s, 'heading') || 'Section',
      target: this.settingOf(s, 'anchorKey') || this.settingOf(s, 'heading') || '',
    }));
  }

  goTo(step: StepperStep, i: number): void {
    this.activeIndex = i;
    const section = this.resolveSection(step, i);
    if (section) {
      FxUtils.scrollToElement(section);
    }
  }

  private parseSteps(raw: any): StepperStep[] {
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
      .filter((s) => s && s.label != null)
      .map((s) => ({ label: String(s.label), target: String(s.target ?? '') }));
  }

  /** Resolve the target section fxData for a step (by anchor key, then title, then position). */
  private resolveSection(step: StepperStep, i: number): any | undefined {
    const sections = this.sections();
    const t = this.norm(step.target);
    if (t) {
      const match = sections.find(
        (s) =>
          this.norm(this.settingOf(s, 'anchorKey')) === t ||
          this.norm(this.settingOf(s, 'heading')) === t ||
          this.slug(this.settingOf(s, 'heading')) === t,
      );
      if (match) return match;
    }
    return sections[i];
  }

  private norm(v: any): string {
    return String(v ?? '').trim().toLowerCase();
  }

  private slug(v: any): string {
    return this.norm(v).replace(/\s+/g, '-');
  }

  private settingOf(fxData: any, key: string): any {
    return fxData?.settings?.find((s: any) => s.key === key)?.value;
  }

  /** Ordered list of section boxes anywhere in the form. */
  private sections(): any[] {
    return this.collectSections(this.fxData?.$fxForm?.elements ?? []);
  }

  private collectSections(elements: any[]): any[] {
    const out: any[] = [];
    for (const el of elements) {
      if (el?.selector === 'lib-section') out.push(el);
      if (el?.elements?.length) out.push(...this.collectSections(el.elements));
    }
    return out;
  }

  ngAfterViewInit(): void {
    // Progressive enhancement: highlight the step whose section is in view.
    // Sections render asynchronously, so set up after a short delay.
    setTimeout(() => this.setupScrollSpy(), 500);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private setupScrollSpy(): void {
    try {
      if (typeof IntersectionObserver === 'undefined') return;
      this.observer?.disconnect();
      const steps = this.steps;
      const nodes: { node: Element; index: number }[] = [];
      steps.forEach((step, i) => {
        const section = this.resolveSection(step, i);
        const node = section?.id ? document.getElementById(section.id) : null;
        if (node) nodes.push({ node, index: i });
      });
      if (!nodes.length) return;
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const found = nodes.find((n) => n.node === entry.target);
              if (found) {
                this.activeIndex = found.index;
                this.detectChanges();
              }
            }
          }
        },
        { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
      );
      nodes.forEach((n) => this.observer!.observe(n.node));
    } catch {
      // scroll-spy is optional; click-to-scroll always works.
    }
  }
}
