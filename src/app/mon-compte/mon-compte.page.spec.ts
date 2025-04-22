import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonComptePage } from './mon-compte.page';

describe('MonComptePage', () => {
  let component: MonComptePage;
  let fixture: ComponentFixture<MonComptePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MonComptePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
