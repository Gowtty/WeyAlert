import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="toastService.toast$ | async as toast"
         class="fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 z-50"
         [ngClass]="{
           'bg-green-500 text-white': toast.type === 'success',
           'bg-red-500 text-white': toast.type === 'error',
           'bg-blue-500 text-white': toast.type === 'info',
           'bg-yellow-500 text-white': toast.type === 'warning'
         }">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined">
          {{ getIcon(toast.type) }}
        </span>
        <span>{{ toast.message }}</span>
        <button (click)="toastService.hide()" 
                class="ml-2 hover:opacity-70 transition-opacity">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  `
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }
}