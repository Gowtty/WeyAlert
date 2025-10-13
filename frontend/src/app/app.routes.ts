import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { MapComponent } from './components/map/map.component';
import { LoginComponent } from './components/login/login.component';
import { AlertListComponent } from './components/alert-list/alert-list.component';
import { AlertCreateComponent } from './components/alert-create/alert-create.component';
import { ProfileComponent } from './components/profile/profile.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'map', component: MapComponent },
  { path: 'login', component: LoginComponent },
  { path: 'alerts', component: AlertListComponent },
  { path: 'alerts/create', component: AlertCreateComponent },
  { path: 'profile', component: ProfileComponent },
  { path: '**', redirectTo: '' }
];