import { inject, Injectable, Type } from '@angular/core';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import { FxBaseComponent, FxComponentRegistryService, FxForm, FxUtils } from '@instantsys-labs/fx';
import { BehaviorSubject, Subject } from 'rxjs';

// @instantsys-labs/fx defines its built-in validations (required, pattern, minLength, ...)
// as static objects on FxValidatorService and hands out those SAME object references to every
// native field (fx-text-field, fx-textarea, fx-password-field, ...) via FxBaseComponent.init().
// Because they're shared by reference, editing one field's validation settings (e.g. toggling
// "required" or changing a min/max length) mutates the shared object in place and the change
// shows up on every other field of that type. Deep-cloning validations right after init()
// gives each field instance its own independent copy, breaking that shared reference.
let fxValidationIsolationPatched = false;
function patchFxValidationIsolation(): void {
  if (fxValidationIsolationPatched) {
    return;
  }
  fxValidationIsolationPatched = true;
  const originalInit = FxBaseComponent.prototype.init;
  FxBaseComponent.prototype.init = function (this: FxBaseComponent, fxData: any, fxRegistryService: any) {
    originalInit.call(this, fxData, fxRegistryService);
    const validations = (this as any).fxData?.validations;
    if (Array.isArray(validations) && validations.length > 0) {
      (this as any).fxData.validations = JSON.parse(JSON.stringify(validations));
    }
  };
}

@Injectable({
  providedIn: 'root'
})
export class FxBuilderWrapperService {
  public variables$ = new BehaviorSubject<any | null>(null);
   private fxApiRegistryService = inject(ApiServiceRegistry)
  constructor(private fxComponentRegistry: FxComponentRegistryService) {
    patchFxValidationIsolation();
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
