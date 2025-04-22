import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BibliothequePage } from './bibliotheque.page';

describe('BibliothequePage', () => {
  let component: BibliothequePage;
  let fixture: ComponentFixture<BibliothequePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BibliothequePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
