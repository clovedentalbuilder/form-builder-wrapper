import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  template: `
  <section style="display: flex; justify-content: center; padding: 20px; gap: 20px">
    <button routerLink="/builder" style="padding: 10px">Builder</button>
    <button routerLink="/form" style="padding: 10px">Form</button>
    <button routerLink="/dynamic-table" style="padding: 10px">Table</button>
  </section>

  <section style="height: 80%;">
    <router-outlet></router-outlet>
  </section>
    `,
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  constructor() { }

  public ngOnInit(): void { }
}
