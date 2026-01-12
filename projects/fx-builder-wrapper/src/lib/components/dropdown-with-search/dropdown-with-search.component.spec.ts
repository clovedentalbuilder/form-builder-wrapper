import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownWithSearchComponent } from './dropdown-with-search.component';

describe('DropdownWithSearchComponent', () => {
  let component: DropdownWithSearchComponent;
  let fixture: ComponentFixture<DropdownWithSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownWithSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropdownWithSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
