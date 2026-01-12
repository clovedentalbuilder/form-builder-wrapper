import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import {
  FxBaseComponent,
  FxComponent,
  FxSelectSetting,
  FxSetting,
  FxStringSetting,
  FxValidation,
  FxValidatorService
} from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { Subject, takeUntil } from 'rxjs';

interface SubOption {
  label: string;
  value: string;
}

interface CustomDropdownOption {
  label: string;
  value: string;
  info?: string;
  selected: boolean;
  subOptions?: SubOption[];
  subSelection?: string | null;
  disabled?: boolean;
  touched?: boolean;
}

interface CustomDropdownConfig {
  displayMode?: 'compact' | 'ellipsis';
  placeholderLabel?: string;
}

@Component({
  selector: 'lib-customize-dropdown',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FxComponent],
  templateUrl: './customize-dropdown.component.html',
  styleUrls: ['./customize-dropdown.component.css']
})
export class CustomizeDropdownComponent extends FxBaseComponent implements OnInit , AfterViewInit{
  private destroy$ = new Subject<boolean>();
  form!: FormGroup;
  formObject: object = {};
  dropdownOpen = false;
  formSubmitted = false;
  @ViewChild('fxComponent') fxComponent!: FxComponent;

  findingsOptions: CustomDropdownOption[] = [];

  type1Options: any[] = [    {
      label: 'Proclination',
      value: 'Proclination',
      info: 'Forward inclination of teeth',
      selected: false,
      subOptions: [
        { label: 'Mild', value: 'mild' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Severe', value: 'severe' }
      ]
    },
    {
      label: 'Crowding',
      value: 'Crowding',
      selected: false,
      subOptions: [
        { label: 'Mild', value: 'mild' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Severe', value: 'severe' }
      ]
    },
    {
      label: 'Spacing',
      value: 'Spacing',
      selected: false,
      subOptions: [
        { label: 'Mild', value: 'mild' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Severe', value: 'severe' }
      ]
    },
    {
      label: 'Retroclination',
      value: 'Retroclination',
      info: 'Backward inclination of teeth',
      selected: false,
       subOptions: [
        { label: 'Mild', value: 'mild' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Severe', value: 'severe' }
      ]

    },
    {
      label: 'Rotation',
      value: 'Rotation',
      selected: false,
       subOptions: [
        { label: 'Mild', value: 'mild' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Severe', value: 'severe' }
      ]
    }];

  type2Options: any[] = [
        {
      label: 'Normal',
      value: 'Normal',
      info: '',
      selected: false,
      subOptions: [
        { label: 'Mild', value: 'mild' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Severe', value: 'severe' }
      ]
    },
    {
      label: 'Deep Bite',
      value: 'Deep Bite',
      selected: false,
      subOptions: [
        { label: 'Mild', value: 'mild' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Severe', value: 'severe' }
      ]
    },
    {
      label: 'Open Bite',
      value: 'Open Bite',
      selected: false,
      subOptions: [
        { label: 'Mild', value: 'mild' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Severe', value: 'severe' }
      ]
    },
  ];

  isRequired: boolean = false;

  // @HostListener('document:click', ['$event'])
  // onClickOutside(event: MouseEvent) {
  //   if (this.dropdownOpen && !this.eRef.nativeElement.contains(event.target)) {
  //     this.dropdownOpen = false;
  //     this.cdr.detectChanges();
  //   }
  // }

  config: CustomDropdownConfig = {
    displayMode: 'ellipsis',
    placeholderLabel: 'Select Finding'
  };

  customizedDropDownMap = new Map<string, any>();

  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private fxBuilderWrapperService: FxBuilderWrapperService,
    private fxApiService: ApiServiceRegistry,
    private fb: FormBuilder,
    private eRef: ElementRef
  ) {
    super(cdr);
    this.form = this.fb.group({
      findings: [[]]
    });
    this.onInit.subscribe(() => this._register(this.form));
  }
  ngAfterViewInit(): void {
//     setTimeout(()=>{
//       const data = [
//   {
//     label: "Proclination",
//     value: "proclination",
//     subSelection: {
//       label: "Mild",
//       value: "mild"
//     }
//   },
//   {
//     label: "Overbite",
//     value: "overbite",
//     subSelection: {
//       label: "Moderate",
//       value: "moderate"
//     }
//   }
// ];

// this.patchExistingValues(data);
//     },2000);

        setTimeout(() => {
      const key = this.fxComponent?.fxData?.name;

      if (key && this.customizedDropDownMap.has(key)) {
        const data = this.customizedDropDownMap.get(key)?.findings;
        this.patchExistingValues(data);

      }
    }, 1000);

    setTimeout(() => {
          const mainControl = this.form.get('findings');
          if (this.setting('isFindingsRequired') === 'true') {
            this.isRequired = true;
            mainControl?.setValidators([Validators.required]);
            mainControl?.updateValueAndValidity();
          }
        }, 500)
  }

  ngOnInit(): void {
    if (this.setting('optionType') === 'type1') {
      this.findingsOptions = this.type1Options;

    }

    else if (this.setting('optionType') === 'type2') {
      this.findingsOptions = this.type2Options;
    }

    this.fxBuilderWrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((variables: any) => {

        if (!variables) return;
        for (const [key, value] of Object.entries(variables) as [string, any][]) {
          if (
            value &&
            typeof value === 'object' &&
            'findings' in value
          ) {
            this.customizedDropDownMap.set(key, value);
          }
        }
      });
    // const serviceUrl = this.fxApiService.getServiceUrl(this.setting('serviceName'));
    // this.getOptions(serviceUrl, this.setting('clinicalNotesURL'));
  }


  getOptions(serviceUrl: string, url: string) {
    const finalUrl = serviceUrl + url;
    this.http.get<any[]>(finalUrl).subscribe({
      next: (response: any) => {
        // Future API logic here
      },
      error: (err) => console.error('Error fetching options', err)
    });
  }

  protected settings(): FxSetting[] {
    return [
      new FxSelectSetting({ key: 'displayMode', $title: 'Display Mode', value: 'ellipsis' }, [{ option: 'Ellipsis', value: 'ellipsis' }, { option: 'Compact', value: 'compact' }]),
      new FxSelectSetting({ key: 'optionType', $title: 'Option Type', value: 'type1' }, [{ option: 'Finding Type Options', value: 'type1' }, { option: 'Vetical Type Options', value: 'type2' }]),
      new FxStringSetting({ key: 'placeholderLabel', $title: 'Placeholder', value: 'Select Options' }),
       new FxStringSetting({ key: 'findingLabel', $title: 'Label', value: 'Label' }),
       new FxSelectSetting({ key: 'isFindingsRequired', $title: 'Required', value: 'true' }, [{ option: 'Yes', value: 'true' }, { option: 'No', value: 'false' }]),
        new FxStringSetting({ key: 'errorFindingMessage', $title: 'Error Message', value: 'Please fill out the field' }),
    ];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }

  /** Dropdown Behavior **/
  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  toggleOption(option: CustomDropdownOption, event: Event) {
    event.stopPropagation();

    // Toggle checkbox value
    option.selected = !option.selected;

    // Reset radios when unchecked
    if (!option.selected) {
      option.subSelection = null;
      option.touched = false;
    }

    else{
      option.touched = true;
    }

    // ✅ Force UI refresh so radios appear instantly
    this.cdr.detectChanges();

    // Update reactive form
    this.updateFindings();
  }

  /** Form & Label Helpers **/
  get hasSelectedFindings(): boolean {
    return this.findingsOptions.some(f => f.selected);
  }

  get selectedFindingsLabel(): string {
    const selected = this.findingsOptions
      .filter(f => {
        if (f.selected) {
          // If finding has sub-options → only show if a sub-option is selected
          if (f.subOptions?.length) {
            return !!f.subSelection;
          }
          // If no sub-options → always show
          return true;
        }
        return false;
      })
      .map(f => f.label);

    if (selected.length === 0) return this.setting('placeholderLabel');

    // Display mode logic (Compact or Ellipsis)
    const maxCount = this.setting('displayMode') === 'compact' ? 2 : 3;
    if (this.setting('displayMode') === 'compact') {
      return selected.length <= maxCount
        ? selected.join(', ')
        : `${selected.slice(0, maxCount).join(', ')} +${selected.length - maxCount} more`;
    }

    if (this.setting('displayMode') === 'ellipsis') {
      return selected.length > maxCount
        ? `${selected.slice(0, maxCount).join(', ')}, ...`
        : selected.join(', ');
    }

    return selected.join(', ');
  }

  /** Update Findings + Validation **/
  // updateFindings() {
  //   const selected = this.findingsOptions
  //     .filter(f => {
  //       if (f.selected) {
  //         // Only include in final form if:
  //         //  - no subOptions, or
  //         //  - subOptions with valid subSelection
  //         if (f.subOptions?.length) {
  //           return !!f.subSelection;
  //         }
  //         return true;
  //       }
  //       return false;
  //     })
  //     .map(f => {
  //       const sub = f.subOptions?.find(s => s.value === f.subSelection) || null;
  //       return {
  //         label: f.label,
  //         value: f.value,
  //         subSelection: sub ? { label: sub.label, value: sub.value } : null
  //       };
  //     });

  //   // Update reactive form value
  //   this.form.patchValue({ findings: selected }, { emitEvent: false });

  //   // Validation logic remains same
  //   const invalidItems = this.findingsOptions.filter(
  //     f => f.selected && f.subOptions && !f.subSelection
  //   );
  //   this.form.get('findings')?.setErrors(
  //     invalidItems.length > 0 ? { missingSubSelection: true } : null
  //   );
  // }

  updateFindings() {
  // Filter selected options with valid subSelection (if subOptions exist)
  const selected = this.findingsOptions
    .filter(f => {
      if (f.selected) {
        // Only include in final form if:
        //  - no subOptions, or
        //  - subOptions with valid subSelection
        if (f.subOptions?.length) {
          return !!f.subSelection;
        }
        return true;
      }
      return false;
    })
    .map(f => {
      const sub = f.subOptions?.find(s => s.value === f.subSelection) || null;
      return {
        label: f.label,
        value: f.value,
        subSelection: sub ? { label: sub.label, value: sub.value } : null
      };
    });

  // Update reactive form value
  this.form.patchValue({ findings: selected }, { emitEvent: false });

  // Validation logic:
  // Check if there are any selected options with subOptions but without subSelection
  const invalidItems = this.findingsOptions.filter(
    f => f.selected && f.subOptions && !f.subSelection
  );

  // If there are any invalid items, mark the form as invalid with a custom error
  if (invalidItems.length > 0) {
    this.form.get('findings')?.setErrors({ missingSubSelection: true });
  } else {
    // Clear the error if everything is valid
    this.form.get('findings')?.setErrors(null);
  }
}


  onSubmit() {
    this.formSubmitted = true;
    if (this.form.invalid) {
      console.warn('⚠️ Please select a sub-option for all selected findings with sub-options.');
      return;
    }
    console.log('✅ Form Value:', this.form.value);
  }

  // patchExistingValues(data: any[]) {
  //   this.findingsOptions.forEach(opt => {
  //     const match = data.find(x => x.value === opt.value);
  //     opt.selected = !!match;
  //     opt.subSelection = match?.severity?.value || null;
  //   });
  //   this.updateFindings();
  // }

patchExistingValues(data: any[]) {
  // Iterate through the findingsOptions and find the corresponding option for each entry in data
  this.findingsOptions.forEach(opt => {
    const match = data.find(x => x.value === opt.value);
    
    if (match) {
      opt.selected = true;
      opt.subSelection = match.subSelection ? match.subSelection.value : null;

      // console.log("Matched Option:", opt);
      // console.log("SubSelection Set To:", this.findingsOptions);
    } else {
      opt.selected = false;
      opt.subSelection = null;
    }
  });

  // Manually trigger change detection if needed
  this.cdr.detectChanges();
  
  this.updateFindings();
}

selectSubOption(option: any, subOption: any) {
  // Set the subSelection to the clicked value
  option.subSelection = subOption.value;
  // Mark the option as touched, which will help in form validation
  option.touched = true;
  // Update the form state
  this.updateFindings();
}

}
