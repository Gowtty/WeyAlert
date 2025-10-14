import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AlertService, Alert, AlertCategory } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';

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

  constructor(
    private alertService: AlertService,
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadMyAlerts();
    this.loadAllAlerts();
    this.currentUser = this.authService.getCurrentUser();
  }

  ngAfterViewInit(): void {
    // Inicializar mapa después de que la vista esté lista
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  private initMap(): void {
    if (!this.mapContainer) {
      return;
    }

    try {
      // Inicializar mapa centrado en una ubicación por defecto (CDMX)
      this.map = L.map(this.mapContainer.nativeElement).setView([19.4326, -99.1332], 12);

      // Añadir capa de tiles de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.map);

      // Añadir marcadores cuando las alertas estén cargadas
      this.addMarkersToMap();
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private addMarkersToMap(): void {
    if (!this.map || this.allAlerts.length === 0) return;

    // Limpiar marcadores existentes
    this.markers.forEach(marker => {
      if (this.map) this.map.removeLayer(marker);
    });
    this.markers = [];

    // Añadir marcadores para cada alerta
    this.allAlerts.forEach(alert => {
      const customIcon = this.createCustomIcon(alert.category_detail);
      
      const marker = L.marker([alert.latitude, alert.longitude], { icon: customIcon })
        .addTo(this.map!)
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-sm">${alert.title}</h3>
            <p class="text-xs text-gray-600">${alert.description}</p>
            <p class="text-xs mt-1"><strong>Categoría:</strong> ${alert.category_detail?.name || 'Sin categoría'}</p>
            <p class="text-xs"><strong>Estado:</strong> ${alert.status || 'active'}</p>
          </div>
        `);

      marker.on('click', () => {
        this.viewAlertDetail(alert);
      });

      this.markers.push(marker);
    });
  }

  private createCustomIcon(category: AlertCategory | undefined): L.DivIcon {
    const color = category?.color || '#3B82F6'; // azul por defecto
    const iconName = category?.icon || 'warning';
    
    return L.divIcon({
      html: `
        <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white" 
             style="background-color: ${color};">
          <span class="material-symbols-outlined text-white text-lg">${iconName}</span>
        </div>
      `,
      className: 'custom-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });
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
          // Centrar en ubicación por defecto si no se puede obtener la ubicación
          this.map!.setView([19.4326, -99.1332], 10);
        }
      );
    }
  }

  showAllAlertsOnMap(): void {
    if (!this.map || this.allAlerts.length === 0) return;

    const group = L.featureGroup(this.markers);
    this.map.fitBounds(group.getBounds().pad(0.1));
  }

  loadMyAlerts(): void {
    this.alertService.getMyAlerts().subscribe({
      next: (alerts) => {
        this.myAlerts = alerts;
        this.isLoading = false;
        // Actualizar marcadores en el mapa después de cargar las alertas
        if (this.map) {
          setTimeout(() => this.addMarkersToMap(), 500);
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
        // Actualizar marcadores en el mapa después de cargar las alertas
        if (this.map) {
          setTimeout(() => this.addMarkersToMap(), 500);
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
    
    // Centrar el mapa en la alerta seleccionada
    if (this.map) {
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
  }

  editAlert(alert: Alert): void {
    if (alert.id) {
      this.router.navigate(['/alert-edit', alert.id]);
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
}