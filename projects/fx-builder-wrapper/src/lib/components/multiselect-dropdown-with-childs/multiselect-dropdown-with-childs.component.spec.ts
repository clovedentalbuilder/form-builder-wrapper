import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiselectDropdownWithChildsComponent } from './multiselect-dropdown-with-childs.component';

describe('MultiselectDropdownWithChildsComponent', () => {
  let component: MultiselectDropdownWithChildsComponent;
  let fixture: ComponentFixture<MultiselectDropdownWithChildsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiselectDropdownWithChildsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultiselectDropdownWithChildsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
