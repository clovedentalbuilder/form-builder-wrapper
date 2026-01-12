import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploaderCheckboxComponent } from './uploader-checkbox.component';

describe('UploaderCheckboxComponent', () => {
  let component: UploaderCheckboxComponent;
  let fixture: ComponentFixture<UploaderCheckboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploaderCheckboxComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploaderCheckboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
