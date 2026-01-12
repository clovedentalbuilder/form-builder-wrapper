import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownWithOtherComponent } from './dropdown-with-other.component';

describe('DropdownWithOtherComponent', () => {
  let component: DropdownWithOtherComponent;
  let fixture: ComponentFixture<DropdownWithOtherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownWithOtherComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropdownWithOtherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
