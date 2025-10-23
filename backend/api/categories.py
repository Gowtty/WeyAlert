ALERT_CATEGORIES = {
    'traffic_accident': {
        'name': 'Accidente de tráfico',
        'description': 'Colisiones vehiculares, choques, volcamientos',
        'icon': 'car_crash',
        'color': '#DC2626'
    },
    'road_closure': {
        'name': 'Cierre de vía',
        'description': 'Vías cerradas temporalmente por construcción o eventos',
        'icon': 'remove_road',
        'color': '#EA580C'
    },
    'traffic_jam': {
        'name': 'Congestión vehicular',
        'description': 'Tráfico lento o detenido',
        'icon': 'traffic_jam',
        'color': '#F59E0B'
    },
    'road_hazard': {
        'name': 'Peligro en la vía',
        'description': 'Obstáculos, baches, derrumbes, objetos en la vía',
        'icon': 'warning',
        'color': '#EAB308'
    },
    'flooding': {
        'name': 'Inundación',
        'description': 'Vías inundadas o con acumulación de agua',
        'icon': 'flood',
        'color': '#06B6D4'
    },
    'construction': {
        'name': 'Obra en construcción',
        'description': 'Trabajos de construcción o mantenimiento vial',
        'icon': 'construction',
        'color': '#6B7280'
    },
    'police': {
        'name': 'Presencia policial',
        'description': 'Controles policiales, retenes',
        'icon': 'local_police',
        'color': '#3B82F6'
    },
    'emergency': {
        'name': 'Emergencia',
        'description': 'Ambulancias, bomberos, situaciones de emergencia',
        'icon': 'e911_emergency',
        'color': '#EF4444'
    },
    'public_event': {
        'name': 'Evento público',
        'description': 'Manifestaciones, eventos deportivos, conciertos',
        'icon': 'event',
        'color': '#8B5CF6'
    },
    'other': {
        'name': 'Otro',
        'description': 'Otras situaciones no categorizadas',
        'icon': 'other_admissions',
        'color': '#64748B'
    }
}

def get_category(key):
    """
    Get a category by its key.
    Returns None if the category doesn't exist.
    """
    return ALERT_CATEGORIES.get(key)

def get_all_categories():
    """
    Get all categories as a list with their keys included.
    """
    return [{'key': key, **data} for key, data in ALERT_CATEGORIES.items()]

def get_category_choices():
    """
    Get category choices for Django model field.
    Returns a list of tuples (key, name) suitable for choices parameter.
    """
    return [(key, data['name']) for key, data in ALERT_CATEGORIES.items()]

def validate_category(key):
    """
    Check if a category key exists.
    """
    return key in ALERT_CATEGORIES