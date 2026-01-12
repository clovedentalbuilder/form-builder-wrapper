import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent {
  public tableConfig = {
    // columns: [
    //   { header: 'Column 1', cellType: 'text' },
    //   { header: 'Column 2', cellType: 'text' },
    //   { header: 'Column 3', cellType: 'text' },
    //   { header: 'Column 4', cellType: 'text' },
    //   { header: 'Column 5', cellType: 'text' },
    // ],
    // rows: [
    //   {'Column 1': 'Row 1 Column 1', 'Column 2': 'Row 1 Column 2', 'Column 3': 'Row 1 Column 3', 'Column 4': 'Row 1 Column 4', 'Column 5': 'Row 1 Column 5'},
    // ]
  }
}
