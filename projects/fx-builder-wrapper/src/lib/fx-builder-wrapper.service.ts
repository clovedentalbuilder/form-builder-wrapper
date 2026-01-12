import { inject, Injectable, Type } from '@angular/core';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import { FxBaseComponent, FxComponentRegistryService, FxForm, FxUtils } from '@instantsys-labs/fx';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FxBuilderWrapperService {
  public variables$ = new BehaviorSubject<any | null>(null);
   private fxApiRegistryService = inject(ApiServiceRegistry)
  constructor(private fxComponentRegistry: FxComponentRegistryService) { }

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
