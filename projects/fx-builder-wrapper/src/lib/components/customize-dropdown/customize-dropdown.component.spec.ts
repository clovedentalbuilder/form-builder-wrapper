import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomizeDropdownComponent } from './customize-dropdown.component';

describe('CustomizeDropdownComponent', () => {
  let component: CustomizeDropdownComponent;
  let fixture: ComponentFixture<CustomizeDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomizeDropdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomizeDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
