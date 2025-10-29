import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AlertService, Alert } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { API_BASE_URL } from '../../config';

// Importación correcta de Leaflet
import * as L from 'leaflet';

@Component({
  selector: 'app-alert-list',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './alert-list.component.html',
  styleUrl: './alert-list.component.css'
})
export class AlertListComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  myAlerts: Alert[] = [];
  allAlerts: Alert[] = [];
  isLoading: boolean = true;
  activeView: 'list' | 'map' = 'list';
  selectedAlert: Alert | null = null;
  currentUser: any;
  
  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  private mapInitialized = false;

  constructor(
    private alertService: AlertService,
    private authService: AuthService,
    public router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadMyAlerts();
    this.loadAllAlerts();
    this.currentUser = this.authService.getCurrentUser();
    
    // Check for query parameters from map navigation
    this.route.queryParams.subscribe(params => {
      if (params['view'] === 'map') {
        this.activeView = 'map';
        
        // If alertId is provided, select that alert after loading
        if (params['alertId']) {
          const alertId = parseInt(params['alertId'], 10);
          setTimeout(() => {
            const alert = this.allAlerts.find(a => a.id === alertId);
            if (alert) {
              this.viewAlertDetail(alert);
            }
          }, 500);
        }
      }
    });
  }

  ngAfterViewInit(): void {
    // Inicializar el mapa después de un pequeño delay
    setTimeout(() => {
      this.initMap();
    }, 300);
  }

  private initMap(): void {
    if (this.mapInitialized) return;
    
    const mapContainer = document.getElementById('map-container');
    
    if (!mapContainer) {
      console.error('Map container not found');
      setTimeout(() => this.initMap(), 200);
      return;
    }

    // Verificar dimensiones del contenedor
    if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
      console.warn('Map container has zero dimensions, retrying...');
      setTimeout(() => this.initMap(), 200);
      return;
    }

    try {
      // Limpiar mapa existente si hay uno
      if (this.map) {
        this.map.remove();
        this.map = null;
      }

      this.map = L.map(mapContainer).setView([19.4326, -99.1332], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.map);

      // Forzar redimensionamiento
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          this.mapInitialized = true;
          // Añadir marcadores si ya hay alertas cargadas
          if (this.allAlerts.length > 0) {
            this.addMarkersToMap();
          }
        }
      }, 300);
      
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private addMarkersToMap(): void {
    if (!this.map || !this.allAlerts.length) return;

    // Limpiar marcadores existentes
    this.clearMarkers();

    this.allAlerts.forEach(alert => {
      try {
        const marker = this.createMarker(alert);
        if (marker) {
          this.markers.push(marker);
        }
      } catch (error) {
        console.error('Error creating marker for alert:', alert.id, error);
      }
    });

    // Si hay marcadores, ajustar la vista
    if (this.markers.length > 0) {
      setTimeout(() => {
        this.showAllAlertsOnMap();
      }, 100);
    }
  }

  private createMarker(alert: Alert): L.Marker | null {
    if (!this.map) return null;

    try {
      const color = alert.category_detail?.color || '#3B82F6';
      const iconName = alert.category_detail?.icon || 'warning';

      const customIcon = L.divIcon({
        html: `
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white" 
               style="background-color: ${color};">
            <span class="material-symbols-outlined text-white text-sm">${iconName}</span>
          </div>
        `,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([alert.latitude, alert.longitude], { icon: customIcon })
        .addTo(this.map!)
        .bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="font-weight: bold; color: #ffffff; font-size: 14px; margin: 0 0 8px 0;">${alert.title}</h3>
            <p style="font-size: 11px; color: #6b7280; margin: 0 0 6px 0;">Por: ${alert.user?.username || 'Anónimo'}</p>
            <p style="font-size: 12px; color: #9ca3af; margin: 0 0 12px 0;">${alert.description.substring(0, 100)}...</p>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="padding: 4px 8px; border-radius: 9999px; font-size: 11px; ${this.getStatusBadgeStyle(alert.status)}">
                ${alert.status || 'active'}
              </span>
              <span style="padding: 4px 8px; border-radius: 9999px; font-size: 11px; background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.5);">
                ${alert.category_detail?.name || 'General'}
              </span>
            </div>
            <div style="display: flex; gap: 12px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <span style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #10b981;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.85-1.26l3.03-7.08c.09-.23.12-.47.12-.66v-2z"/></svg>
                ${alert.likes_count || 0}
              </span>
              <span style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #ef4444;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3H6c-.83 0-1.54.5-1.85 1.26l-3.03 7.08c-.09.23-.12.47-.12.66v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                ${alert.dislikes_count || 0}
              </span>
            </div>
          </div>
        `);

      marker.on('click', () => {
        this.viewAlertDetail(alert);
      });

      return marker;
    } catch (error) {
      console.error('Error creating marker:', error);
      return null;
    }
  }

  private clearMarkers(): void {
    this.markers.forEach(marker => {
      if (this.map) {
        this.map.removeLayer(marker);
      }
    });
    this.markers = [];
  }

  centerMapOnUser(): void {
    if (!this.map) return;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.map!.setView([lat, lng], 13);
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          this.map!.setView([19.4326, -99.1332], 10);
        }
      );
    }
  }

  showAllAlertsOnMap(): void {
    if (!this.map || this.markers.length === 0) return;

    const group = L.featureGroup(this.markers);
    this.map.fitBounds(group.getBounds().pad(0.1));
  }

  loadMyAlerts(): void {
    this.alertService.getMyAlerts().subscribe({
      next: (alerts) => {
        this.myAlerts = alerts;
        this.isLoading = false;
        // Actualizar mapa si está en vista de mapa
        if (this.activeView === 'map' && this.mapInitialized) {
          setTimeout(() => this.addMarkersToMap(), 100);
        }
      },
      error: (error) => {
        console.error('Error loading my alerts', error);
        this.isLoading = false;
      }
    });
  }

  loadAllAlerts(): void {
    this.alertService.getAlerts().subscribe({
      next: (alerts) => {
        this.allAlerts = alerts;
        // Actualizar mapa si está en vista de mapa
        if (this.activeView === 'map' && this.mapInitialized) {
          setTimeout(() => this.addMarkersToMap(), 100);
        }
      },
      error: (error) => {
        console.error('Error loading all alerts', error);
      }
    });
  }

  viewAlertDetail(alert: Alert): void {
    this.selectedAlert = alert;
    this.activeView = 'map';
    
    // Si el mapa no está inicializado, inicializarlo
    if (!this.mapInitialized) {
      setTimeout(() => {
        this.initMap();
        // Después de inicializar, centrar en la alerta
        setTimeout(() => {
          this.centerMapOnAlert(alert);
        }, 500);
      }, 100);
    } else {
      this.centerMapOnAlert(alert);
    }
  }

  private centerMapOnAlert(alert: Alert): void {
    if (!this.map) return;
    
    this.map.setView([alert.latitude, alert.longitude], 15);
    
    // Abrir popup del marcador correspondiente
    const marker = this.markers.find(m => {
      const latLng = m.getLatLng();
      return latLng.lat === alert.latitude && latLng.lng === alert.longitude;
    });
    if (marker) {
      marker.openPopup();
    }
  }

  editAlert(alert: Alert): void {
    if (alert.id) {
      this.router.navigate(['/alert-edit', alert.id]);
    } else {
      console.error('Alert ID is undefined');
      window.alert('Error: No se puede editar esta alerta');
    }
  }

  deleteAlert(alert: Alert): void {
    if (!alert.id) {
      console.error('Alert ID is undefined');
      return;
    }

    if (confirm('¿Estás seguro de que quieres eliminar esta alerta?')) {
      this.alertService.deleteAlert(alert.id).subscribe({
        next: () => {
          this.myAlerts = this.myAlerts.filter(a => a.id !== alert.id);
          this.allAlerts = this.allAlerts.filter(a => a.id !== alert.id);
          if (this.selectedAlert?.id === alert.id) {
            this.selectedAlert = null;
          }
          // Actualizar marcadores en el mapa
          this.addMarkersToMap();
        },
        error: (error) => {
          console.error('Error deleting alert', error);
          window.alert('Error al eliminar la alerta');
        }
      });
    }
  }

  isOwner(alert: Alert): boolean {
    return this.currentUser && alert.user && alert.user.id === this.currentUser.id;
  }

  handleReaction(alert: Alert, reactionType: 'like' | 'dislike'): void {
    if (!alert.id) {
      console.error('Alert ID is undefined');
      return;
    }

    if (!this.currentUser) {
      // Redirect to login if not authenticated
      this.router.navigate(['/login']);
      return;
    }

    // Determine the action to take
    let action: 'like' | 'dislike' | 'remove';
    if (alert.user_reaction === reactionType) {
      // User is clicking the same reaction, so remove it
      action = 'remove';
    } else {
      // User is setting a new reaction
      action = reactionType;
    }

    this.alertService.reactToAlert(alert.id, action).subscribe({
      next: (updatedAlert) => {
        // Update the alert in both lists
        const updateAlertInList = (list: Alert[]) => {
          const index = list.findIndex(a => a.id === alert.id);
          if (index !== -1) {
            list[index] = { ...list[index], ...updatedAlert };
          }
        };

        updateAlertInList(this.myAlerts);
        updateAlertInList(this.allAlerts);

        // Update selected alert if it's the same
        if (this.selectedAlert?.id === alert.id) {
          this.selectedAlert = { ...this.selectedAlert, ...updatedAlert };
        }
      },
      error: (error) => {
        console.error('Error reacting to alert', error);
        if (error.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  getStatusBadgeClass(status: string | undefined): string {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getCategoryBadgeClass(category: any): string {
    if (!category) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
    
    // Mapeo de colores para evitar errores de Tailwind
    const colorMap: {[key: string]: string} = {
      'red': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'blue': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'green': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'yellow': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'indigo': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'purple': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'pink': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    };
    
    return colorMap[category.color] || colorMap['blue'];
  }
  
  private getStatusBadgeStyle(status: string | undefined): string {
    switch (status) {
      case 'active':
        return 'background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.5);';
      case 'resolved':
        return 'background: rgba(34, 197, 94, 0.2); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.5);';
      case 'expired':
        return 'background: rgba(107, 114, 128, 0.2); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.5);';
      default:
        return 'background: rgba(107, 114, 128, 0.2); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.5);';
    }
  }

  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) {
      return '';
    }
    // If it's already a full URL, return it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // If it starts with /media/, prepend the API base URL
    if (imagePath.startsWith('/media/')) {
      return `${API_BASE_URL}${imagePath}`;
    }
    // Otherwise, prepend the API base URL with /media/
    return `${API_BASE_URL}/media/${imagePath}`;
  }
}