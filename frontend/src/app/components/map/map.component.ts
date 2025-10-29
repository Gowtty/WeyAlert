import { Component, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, NgIf, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AlertService, Alert } from '../../services/alert.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, NgIf, DecimalPipe], 
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements AfterViewInit, OnDestroy {
  // Map properties
  private map: L.Map | undefined;
  private marker: L.Marker | undefined;
  private userMarker: L.Marker | undefined;
  private alertMarkers: L.Marker[] = [];
  
  // Inputs for alert display
  @Input() showAlerts: boolean = false;
  @Input() alerts: Alert[] = [];
  @Output() alertClicked = new EventEmitter<Alert>();
  
  // State for alert creation
  selectedLatitude: number | null = null;
  selectedLongitude: number | null = null;
  
  // Alert visualization state
  alertsVisible: boolean = true;
  availableCategories: any[] = [];
  selectedCategories: Set<string> = new Set();
  lastUpdateTime: Date | null = null;
  private refreshInterval: any;
  
  // Base coordinates 
  private readonly DEFAULT_LAT = 19.4326;
  private readonly DEFAULT_LNG = -99.1332;
  private readonly DEFAULT_ZOOM = 13;

  private readonly NOMINATIM_API = 'https://nominatim.openstreetmap.org/search?format=json&limit=1';

  constructor(
    private http: HttpClient, 
    private router: Router, 
    private authService: AuthService,
    private alertService: AlertService
  ) { }

  ngAfterViewInit(): void {
    this.initMap();
    this.locateUser();
    
    // Always load alerts for real-time visualization
    this.loadAlerts();
    this.loadCategories();
    
    // Set up auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadAlerts();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
    
    // Clear refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  /**
   * Initializes the Leaflet map instance, tile layer, and click listener.
   */
  private initMap(): void {
    // Check if map is already initialized or container exists
    if (!document.getElementById('map-container')) {
        console.error('Map container not found.');
        return;
    }

    this.map = L.map('map-container', {
      zoomControl: false
    }).setView(
      [this.DEFAULT_LAT, this.DEFAULT_LNG], 
      this.DEFAULT_ZOOM
    );

    this.map.invalidateSize();

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    // Add click listener to select location for creating alerts
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      // Only place marker for alert creation if not clicking on an existing alert marker
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.custom-alert-marker')) {
        this.placeMarker(e.latlng.lat, e.latlng.lng);
      }
    });
  }

  /**
   * Load and display alerts on the map
   */
  private loadAlerts(): void {
    this.alertService.getAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts;
        this.lastUpdateTime = new Date();
        if (this.alertsVisible) {
          this.displayAlertsOnMap();
        }
      },
      error: (error) => {
        console.error('Error loading alerts for map:', error);
      }
    });
  }
  
  /**
   * Load available categories for filtering
   */
  private loadCategories(): void {
    this.alertService.getAlertCategories().subscribe({
      next: (categories) => {
        this.availableCategories = categories;
        // Initialize all categories as selected
        categories.forEach(cat => this.selectedCategories.add(cat.key));
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  /**
   * Display alerts as markers on the map
   */
  private displayAlertsOnMap(): void {
    if (!this.map) return;

    // Clear existing alert markers
    this.alertMarkers.forEach(marker => {
      this.map!.removeLayer(marker);
    });
    this.alertMarkers = [];

    // Filter alerts based on selected categories
    const filteredAlerts = this.alerts.filter(alert => 
      this.selectedCategories.has(alert.category)
    );

    // Add markers for each filtered alert
    filteredAlerts.forEach(alert => {
      const alertIcon = this.createAlertIcon(alert);
      
      const marker = L.marker([alert.latitude, alert.longitude], { 
        icon: alertIcon,
        title: alert.title
      }).addTo(this.map!);

      // Bind popup with alert information
      const popupContent = `
        <div style="min-width: 250px;">
          <h3 style="font-weight: bold; color: #ffffff; font-size: 14px; margin: 0 0 8px 0;">${alert.title}</h3>
          <p style="font-size: 11px; color: #6b7280; margin: 0 0 6px 0;">Por: ${alert.user?.username || 'Anónimo'}</p>
          <p style="font-size: 12px; color: #d1d5db; margin: 0 0 12px 0; line-height: 1.4;">
            ${alert.description.substring(0, 100)}${alert.description.length > 100 ? '...' : ''}
          </p>
          <div style="display: flex; gap: 12px; padding: 8px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); border-bottom: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 12px;">
            <span style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #10b981;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.85-1.26l3.03-7.08c.09-.23.12-.47.12-.66v-2z"/></svg>
              ${alert.likes_count || 0}
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #ef4444;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3H6c-.83 0-1.54.5-1.85 1.26l-3.03 7.08c-.09.23-.12.47-.12.66v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
              ${alert.dislikes_count || 0}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="padding: 4px 8px; border-radius: 9999px; font-size: 11px; ${this.getStatusBadgeStyle(alert.status)}">
              ${alert.status || 'active'}
            </span>
            <button id="alert-detail-${alert.id}" 
                    style="padding: 6px 12px; background: #00d0a7; color: white; font-size: 12px; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; transition: background 0.2s;"
                    onmouseover="this.style.backgroundColor='rgb(0, 169, 135)'" 
                    onmouseout="this.style.backgroundColor='#00d0a7'">
              Ver detalles
            </button>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent, {
        className: 'dark-popup',
        closeButton: true,
        minWidth: 250
      });
      
      // Add event listener for the button after popup opens
      marker.on('popupopen', () => {
        const button = document.getElementById(`alert-detail-${alert.id}`);
        if (button) {
          button.addEventListener('click', () => {
            this.router.navigate(['/alerts'], { 
              queryParams: { alertId: alert.id, view: 'map' } 
            });
          });
        }
      });

      // Add click event
      marker.on('click', () => {
        this.alertClicked.emit(alert);
      });

      this.alertMarkers.push(marker);
    });
  }

  /**
   * Create custom icon for alert markers
   */
  private createAlertIcon(alert: Alert): L.DivIcon {
    const category = alert.category_detail;
    const color = category?.color || '#3B82F6';
    const iconName = category?.icon || 'warning';

    return L.divIcon({
      html: `
        <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white" 
             style="background-color: ${color};">
          <span class="material-symbols-outlined text-white text-lg">${iconName}</span>
        </div>
      `,
      className: 'custom-alert-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });
  }

  /**
   * Get CSS class for status badge
   */
  private getStatusBadgeClass(status: string | undefined): string {
    switch (status) {
      case 'active':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'resolved':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'expired':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  }
  
  /**
   * Get inline styles for status badge in popup
   */
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
  
  /**
   * Clears the existing marker and places a new one at the specified coordinates.
   * Updates the selected latitude and longitude state.
   */
  private placeMarker(lat: number, lng: number): void {
    if (!this.map) return;
    
    // Clear existing alert marker
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }

    const latLng = L.latLng(lat, lng);
    
    this.marker = L.marker(latLng, { draggable: true }).addTo(this.map);
    this.selectedLatitude = lat;
    this.selectedLongitude = lng;
    
    this.marker.on('dragend', (event) => {
      const newLatLng = event.target.getLatLng();
      this.selectedLatitude = newLatLng.lat;
      this.selectedLongitude = newLatLng.lng;
    });

    this.map.setView(latLng, this.map.getZoom());
  }
  
  /**
   * Uses the browser's Geolocation API to find the user's current position.
   * Connected to the Locate Me button.
   */
  locateUser(): void {
    if (!this.map) return;
    const currentMap = this.map; 
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const userLocation = L.latLng(lat, lng);

          if (this.userMarker) {
              currentMap.removeLayer(this.userMarker);
          }
          const customIcon = L.divIcon({
            className: 'custom-user-marker',
            html: '<span class="material-symbols-outlined text-primary text-3xl" style="background: white; border-radius: 50%; padding: 2px; box-shadow: 0 0 5px rgba(0,0,0,0.5);">my_location</span>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          });
          
          this.userMarker = L.marker(userLocation, { icon: customIcon }).addTo(currentMap);
          
          // Center on user location
          currentMap.setView(userLocation, 16);
        },
        (error) => {
          console.error('Geolocation failed:', error);
          alert('No se pudo obtener la ubicación. Asegúrate de que la geolocalización esté activada.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      alert('Tu navegador no soporta geolocalización.');
    }
  }

  /**
   * Searches for a location using the Nominatim API and centers the map.
   * Connected to the search input's (keyup.enter) event.
   */
  searchLocation(query: string): void {
    if (!this.map || !query.trim()) return;

    this.http.get<any[]>(`${this.NOMINATIM_API}&q=${encodeURIComponent(query)}`)
      .subscribe({
        next: (results) => {
          if (results && results.length > 0) {
            const result = results[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            const newLocation = L.latLng(lat, lng);

            this.map!.setView(newLocation, 15);
            
            // Place marker for alert creation
            this.placeMarker(lat, lng);
          } else {
            alert(`No se encontraron resultados para "${query}"`);
          }
        },
        error: (err) => {
          console.error('Search API error:', err);
          alert('Error al buscar la ubicación. Intenta de nuevo más tarde.');
        }
      });
  }
  
  /**
   * Increases the map zoom level. Connected to the '+' button.
   */
  zoomIn(): void {
    this.map?.zoomIn();
  }

  /**
   * Decreases the map zoom level. Connected to the '-' button.
   */
  zoomOut(): void {
    this.map?.zoomOut();
  }

  /**
   * Handles navigation when the user clicks the "Crear Alerta" button.
   */
  onCreateAlert(): void {
    if (this.selectedLatitude !== null && this.selectedLongitude !== null && this.authService.isAuthenticated()) {
      this.router.navigate(['/alerts/create'], {
        queryParams: { 
          lat: this.selectedLatitude.toFixed(6), 
          lng: this.selectedLongitude.toFixed(6) 
        }
      });
    } else {
      this.router.navigate(['/login'])
      alert('Por favor, inicia sesión para crear una alerta.');
    }
  }
  
  /**
   * Toggle visibility of alerts on the map
   */
  toggleAlerts(): void {
    this.alertsVisible = !this.alertsVisible;
    if (this.alertsVisible) {
      this.displayAlertsOnMap();
    } else {
      // Clear alert markers
      this.alertMarkers.forEach(marker => {
        this.map!.removeLayer(marker);
      });
      this.alertMarkers = [];
    }
  }
  
  /**
   * Toggle category filter
   */
  toggleCategory(categoryKey: string): void {
    if (this.selectedCategories.has(categoryKey)) {
      this.selectedCategories.delete(categoryKey);
    } else {
      this.selectedCategories.add(categoryKey);
    }
    if (this.alertsVisible) {
      this.displayAlertsOnMap();
    }
  }
  
  /**
   * Manually refresh alerts
   */
  refreshAlerts(): void {
    this.loadAlerts();
  }
  
  /**
   * Get time since last update
   */
  getTimeSinceUpdate(): string {
    if (!this.lastUpdateTime) return 'Nunca';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - this.lastUpdateTime.getTime()) / 1000);
    
    if (diff < 60) return `Hace ${diff} segundos`;
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} minutos`;
    return `Hace ${Math.floor(diff / 3600)} horas`;
  }
  
  /**
   * Get filtered alert count
   */
  getAlertCount(): number {
    return this.alerts.filter(alert => 
      this.selectedCategories.has(alert.category)
    ).length;
  }
}