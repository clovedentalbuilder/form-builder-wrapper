import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { FxComponent, FxData, FxMode, FxSettingComponent, FxSettingsService, FxUtils } from '@instantsys-labs/fx';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfigurationPanelComponent } from '../configuration-panel/configuration-panel.component';

@Component({
  selector: 'fx-settings-panel',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, ConfigurationPanelComponent],
  templateUrl: './settings-panel.component.html',
  styleUrl: './settings-panel.component.css'
})
export class SettingsPanelComponent extends FxComponent implements OnInit ,OnChanges {
 
    @Output() configuration = new EventEmitter<any>();
    public visible: boolean = false;
    @Input() tableData:any;
    tableConfig:any;

    ngOnChanges(changes: SimpleChanges): void {
     this.tableConfig = this.tableData;
    }

    public openSettingDialog(): void {
      this.visible = true;
    }
}
