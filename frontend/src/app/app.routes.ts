import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { SignupComponent } from './pages/signup/signup';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard';
import { UserDashboardComponent } from './pages/user-dashboard/user-dashboard';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },

  
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard]
  },
      
 
  {
    path: 'user-dashboard',
    component: UserDashboardComponent,
    canActivate: [authGuard]
  }
];
