import { inject, Injectable, Type } from '@angular/core';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import { FxBaseComponent, FxComponentRegistryService, FxForm, FxUtils, FxValidatorService } from '@instantsys-labs/fx';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FxBuilderWrapperService {
  public variables$ = new BehaviorSubject<any | null>(null);
  /** Current user's granted privileges, supplied by the consumer. Used by
   *  container components to compute editability at the package level. */
  public privileges: string[] = [];
  /** Consumer-supplied data bag for visibility rules/code (e.g. clinic type,
   *  feature flags). Used by container components alongside `privileges` to
   *  compute visibility at the package level. */
  public supportingData: any = {};
   private fxApiRegistryService = inject(ApiServiceRegistry)
  constructor(private fxComponentRegistry: FxComponentRegistryService) {
    // this.isolateValidationDefaults();
  }

  /**
   * The fx library exposes each validation default as a SHARED static object
   * (FxValidatorService.required, .pattern, …). Every field of a type references
   * the same instance, so configuring one field's validation / error message
   * mutates it for ALL fields of that type. Redefine each static as a getter that
   * returns a fresh clone per access, so every field's validations() call yields
   * independent objects. Runs once (root singleton). */
  private static _validationsIsolated = false;
  private isolateValidationDefaults(): void {
    if (FxBuilderWrapperService._validationsIsolated) return;
    FxBuilderWrapperService._validationsIsolated = true;
    const svc: any = FxValidatorService as any;
    const keys = ['required', 'email', 'alphaOnly', 'numberOnly', 'pattern', 'minLength', 'maxLength', 'selectOne'];
    for (const key of keys) {
      const current = svc[key];
      if (!current || typeof current !== 'object') continue;
      const pristine = JSON.parse(JSON.stringify(current)); // capture defaults once
      try {
        Object.defineProperty(svc, key, {
          configurable: true,
          enumerable: true,
          get: () => JSON.parse(JSON.stringify(pristine)), // fresh copy every access
        });
      } catch {
        /* non-configurable / already patched — ignore */
      }
    }
  }

  public setPrivileges(privileges: string[] | null | undefined): void {
    this.privileges = Array.isArray(privileges) ? privileges : [];
  }

  public setSupportingData(supportingData: any): void {
    this.supportingData = supportingData ?? {};
  }

  public registerCustomComponent(title: string, selector: string, component: Type<FxBaseComponent>
  ): void {
    this.fxComponentRegistry.registerComponent(selector, component, {
      registeringAs: "CUSTOM",
      libraryItem: {
        title,
        icon: 'fa-eye',
        fxData: {
          id: null,
          name: selector,
          value: "",
          selector: selector,
          elements: [],
          events: []
        }
      },
    })
  }

  public getComponent(selector: string): Type<FxBaseComponent> | undefined {
    return this.fxComponentRegistry.getComponent(selector);
  }

   public getInitializedFxForm(): FxForm {
      return FxUtils.createNewForm(); 
    }

    public setService(object:any){
      this.fxApiRegistryService.registerService(object)
    }
}
