import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  template: `
  <section style="display:flex;align-items:center;padding:0 20px;gap:8px;height:48px;background:#1e293b;box-shadow:0 2px 8px rgba(0,0,0,.2);">
    <a routerLink="/builder"   routerLinkActive="nav-active" class="nav-link">Builder</a>
    <a routerLink="/form"      routerLinkActive="nav-active" class="nav-link">Form</a>
    <a routerLink="/dynamic-table" routerLinkActive="nav-active" class="nav-link">Table</a>
    <a routerLink="/form-test" routerLinkActive="nav-active" class="nav-link nav-link--highlight">&#9711; Form Playground</a>
  </section>
  <section style="flex:1;overflow:auto;">
    <router-outlet></router-outlet>
  </section>
  `,
  styles: [`
    :host { display:flex; flex-direction:column; min-height:100vh; }
    .nav-link {
      color:#94a3b8; text-decoration:none; font-size:.82rem; font-weight:600;
      padding:.35rem .875rem; border-radius:6px; transition:background .15s,color .15s;
    }
    .nav-link:hover { background:rgba(255,255,255,.08); color:#e2e8f0; }
    .nav-active { background:#3b82f6 !important; color:#fff !important; }
    .nav-link--highlight { color:#7dd3fc; }
    .nav-link--highlight.nav-active { background:#1d4ed8 !important; }
  `],
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  constructor() { }

  public ngOnInit(): void { }
}
