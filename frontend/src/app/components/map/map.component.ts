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
    
    // Load alerts if showAlerts is true
    if (this.showAlerts) {
      this.loadAlerts();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
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

    // Add click listener to select location (only if not in alert display mode)
    if (!this.showAlerts) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.placeMarker(e.latlng.lat, e.latlng.lng);
      });
    }
  }

  /**
   * Load and display alerts on the map
   */
  private loadAlerts(): void {
    this.alertService.getAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts;
        this.displayAlertsOnMap();
      },
      error: (error) => {
        console.error('Error loading alerts for map:', error);
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

    // Add markers for each alert
    this.alerts.forEach(alert => {
      const alertIcon = this.createAlertIcon(alert);
      
      const marker = L.marker([alert.latitude, alert.longitude], { 
        icon: alertIcon,
        title: alert.title
      }).addTo(this.map!);

      // Bind popup with alert information
      marker.bindPopup(`
        <div class="p-2 min-w-[200px]">
          <h3 class="font-bold text-sm mb-1">${alert.title}</h3>
          <p class="text-xs text-gray-600 mb-2">${alert.description}</p>
          <div class="flex justify-between items-center text-xs">
            <span class="px-2 py-1 rounded-full ${this.getStatusBadgeClass(alert.status)}">
              ${alert.status || 'active'}
            </span>
            <button onclick="this.dispatchEvent(new CustomEvent('viewAlert', { detail: ${alert.id} }))" 
                    class="px-2 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90">
              Ver detalles
            </button>
          </div>
        </div>
      `);

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
        return 'bg-red-100 text-red-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          
          // Only center on user if not showing alerts
          if (!this.showAlerts) {
            currentMap.setView(userLocation, 16);
          }
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
            
            // Only place marker if not in alert display mode
            if (!this.showAlerts) {
              this.placeMarker(lat, lng);
            }
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
}