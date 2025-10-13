# 🗺️🔍 WeyAlert: Comunidad Unida, Rutas Seguras

## Descripción del Proyecto
WeyAlert es una aplicación de mapas social que permite a los usuarios reportar y visualizar alertas en tiempo real sobre las condiciones de la carretera y del entorno en general. A diferencia de las aplicaciones de navegación tradicionales, WeyAlert se centra en la contribución de la comunidad para identificar peligros como baches, inundaciones, accidentes, problemas de alumbrado, etc. Los usuarios pueden crear alertas en su ubicación actual, adjuntar una imagen para contextualizar el reporte y ver las alertas de otros en el mapa.

Este proyecto fue desarrollado como un Producto Mínimo Viable (MVP) para una entrega académica, demostrando la integración de geolocalización, comunicación en tiempo real y persistencia de datos geoespaciales.

## Características del MVP
- **Mapa Interactivo**: Muestra la ubicación actual del usuario en un mapa interactivo.
- **Creación de Alertas**: Permite a los usuarios crear alertas geolocalizadas con un solo toque.
- **Subida de Imágenes**: Posibilidad de adjuntar una imagen a cada alerta para un reporte visual.
- **Visualización de Alertas**: Los iconos de las alertas de otros usuarios aparecen en el mapa en tiempo real.
- **Sistema de Autenticación**: Módulo básico de registro e inicio de sesión de usuarios.

## Tecnologías Utilizadas

### Frontend
- **Angular**: Framework para la construcción de la interfaz de usuario.
- **Leaflet/OpenStreetMap**: Integración para la visualización del mapa.
- **Tailwind CSS**: Framework de CSS para el diseño de la interfaz.

### Backend
- **Django**: Framework de Python para el desarrollo del backend.
- **Django REST Framework (DRF)**: Creación de la API para la comunicación con el frontend.
- **SQLite**: Base de datos relacional para almacenamiento de datos.

## Estructura del Repositorio

```
WeyAlert/
├── backend/              # Código fuente del servidor Django
│   ├── alerts/          # App principal de alertas
│   ├── manage.py
│   └── ...
├── frontend/            # Código fuente de la aplicación Angular
│   ├── src/
│   ├── angular.json
│   └── ...
├── venv/               # Entorno virtual Python (ignorado en git)
├── node_modules/       # Dependencias Node (ignorado en git)
├── requirements.txt    # Dependencias Python
├── .gitignore
└── README.md
```

## 🚀 Configuración e Instalación

### Requisitos Previos

- **Python 3.10+**
- **Node.js 18+** y npm
- **Git**

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd WeyAlert
```

### 2. Configurar Backend (Django)

#### Crear y Activar Entorno Virtual

**En Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**En Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### Instalar Dependencias

```bash
pip install -r requirements.txt
```

#### Ejecutar Migraciones y Crear Superusuario

```bash
cd backend

# Aplicar migraciones
python manage.py migrate

# Crear superusuario (opcional, para acceder al admin)
python manage.py createsuperuser

# Iniciar servidor de desarrollo
python manage.py runserver
```

El backend estará corriendo en **http://localhost:8000**

### 3. Configurar Frontend (Angular)

**Abrir una nueva terminal** y desde la raíz del proyecto:

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
ng serve
```

El frontend estará corriendo en **http://localhost:4200**

## 📝 Scripts Útiles

### Backend (Django)

```bash
# Crear nuevas migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Acceder al shell de Django
python manage.py shell

# Colectar archivos estáticos (para producción)
python manage.py collectstatic
```

### Frontend (Angular)

```bash
# Compilar para producción
ng build --configuration production

# Ejecutar tests
ng test

# Ejecutar linter
ng lint

# Limpiar caché
ng cache clean
```

## ⚙️ Variables de Entorno

Copia `.env.example` a `backend/.env` y configura las siguientes variables:

```env
SECRET_KEY=tu-clave-secreta-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
```

**Importante**: Nunca compartas tu archivo `.env` ni lo subas a Git. Ya está incluido en `.gitignore`.

## 🔧 Solución de Problemas

### El backend no inicia

- Verifica que el entorno virtual esté activado (deberías ver `(venv)` en tu terminal)
- Verifica que todas las dependencias estén instaladas: `pip install -r requirements.txt`
- Revisa que el archivo `.env` exista en la carpeta `backend/`
- Verifica que las migraciones estén aplicadas: `python manage.py migrate`

### El frontend no inicia

- Elimina `node_modules/` y ejecuta `npm install` nuevamente
- Verifica tu versión de Node.js: `node --version` (debe ser 18+)
- Limpia la caché de Angular: `ng cache clean`
- Verifica que Angular CLI esté instalado: `npm install -g @angular/cli`

### Error de CORS

- Verifica que `CORS_ALLOWED_ORIGINS` en `backend/.env` incluya `http://localhost:4200`
- Verifica que `django-cors-headers` esté instalado y configurado correctamente
- Reinicia el servidor Django después de cambiar variables de entorno

### Errores de base de datos

- Elimina `db.sqlite3` y ejecuta `python manage.py migrate` nuevamente
- Verifica que el directorio tenga permisos de escritura

## 📱 Uso de la Aplicación

1. **Registro/Login**: Crea una cuenta o inicia sesión
2. **Ver Mapa**: Explora las alertas existentes en el mapa interactivo
3. **Crear Alerta**: 
   - Haz clic en el mapa para seleccionar una ubicación
   - Completa el formulario con título, descripción y categoría
   - Opcionalmente adjunta una imagen
   - Envía el reporte
4. **Ver Alertas**: Las alertas aparecen como marcadores en el mapa

## 🤝 Contribuir

1. Crea una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
2. Haz commit de tus cambios: `git commit -m 'Añadir nueva funcionalidad'`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Crea un Pull Request

## 👥 Desarrolladores

- **Mendoza Bernal Jesús Jean Carlo**
- **Samano Zavala Oscar Ricardo**

**Grupo**: 4-01 ISV  
**Institución**: Universidad Autónoma de Sinaloa  
**Programa**: Licenciatura en Ingeniería de Software

## 📄 Licencia

Este proyecto fue desarrollado con fines académicos.
