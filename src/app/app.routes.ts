import { Routes } from '@angular/router';
import { BuilderComponent } from './component/builder/builder.component';
import { FormComponent } from './component/form/form.component';
import { TableComponent } from './component/table/table.component';

export const routes: Routes = [
    {
        path: 'builder',
        component: BuilderComponent
    },
    {
        path: 'form',
        component: FormComponent
    },
    {
        path: 'dynamic-table',
        component: TableComponent
    },
];
