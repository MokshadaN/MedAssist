"""Places service for OpenStreetMap Nominatim and Overpass API integration."""

import math

import requests
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv

from schemas.places import Hospital, HospitalDetails


# =====================================================
# CONFIG
# =====================================================

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_API_URL = "https://nominatim.openstreetmap.org/search"
REQUEST_HEADERS = {
    "User-Agent": "MedAssist/0.1 emergency-hospital-lookup"
}


# =====================================================
# FUNCTIONS
# =====================================================

def _distance_meters(origin_lat: float, origin_lon: float, lat: float, lon: float) -> float:
    """Return the haversine distance between two coordinates."""
    radius_meters = 6371000
    phi1 = math.radians(origin_lat)
    phi2 = math.radians(lat)
    delta_phi = math.radians(lat - origin_lat)
    delta_lambda = math.radians(lon - origin_lon)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * radius_meters * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _is_known_open(opening_hours: Optional[str]) -> Optional[bool]:
    """
    Interpret the subset of OSM opening_hours that is safe to infer.

    Full opening_hours parsing is complex. We only mark 24/7 as definitely open;
    unknown or complex schedules are returned as None instead of pretending.
    """
    if not opening_hours:
        return None

    normalized = opening_hours.strip().lower()
    if normalized in {"24/7", "24 hours", "always open"}:
        return True

    if normalized == "off":
        return False

    return None


def geocode_address(address: str) -> Optional[tuple[float, float]]:
    """Geocode a patient address using OpenStreetMap Nominatim."""
    if not address.strip():
        return None

    response = requests.get(
        NOMINATIM_API_URL,
        params={"q": address, "format": "json", "limit": 1},
        headers=REQUEST_HEADERS,
        timeout=15,
    )
    response.raise_for_status()
    results = response.json()
    if not results:
        return None

    return float(results[0]["lat"]), float(results[0]["lon"])

def get_nearby_hospitals(latitude: float, longitude: float, radius: int = 5000) -> List[Hospital]:
    """
    Get nearby hospitals using OpenStreetMap Overpass API.

    Args:
        latitude: Latitude of the location
        longitude: Longitude of the location
        radius: Search radius in meters (default 5000)

    Returns:
        List of Hospital objects
    """
    # Overpass QL query to find hospitals within radius
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"~"hospital|clinic|doctors|ambulance_station"](around:{radius},{latitude},{longitude});
      way["amenity"~"hospital|clinic|doctors|ambulance_station"](around:{radius},{latitude},{longitude});
      relation["amenity"~"hospital|clinic|doctors|ambulance_station"](around:{radius},{latitude},{longitude});
      node["healthcare"~"hospital|clinic|doctor|ambulance"](around:{radius},{latitude},{longitude});
      way["healthcare"~"hospital|clinic|doctor|ambulance"](around:{radius},{latitude},{longitude});
      relation["healthcare"~"hospital|clinic|doctor|ambulance"](around:{radius},{latitude},{longitude});
    );
    out center;
    """

    response = requests.post(
        OVERPASS_API_URL,
        data={"data": query},
        headers=REQUEST_HEADERS,
        timeout=30,
    )
    response.raise_for_status()

    data = response.json()
    if "elements" not in data:
        return []

    hospitals = []
    for element in data["elements"]:
        # Extract coordinates
        if element["type"] == "node":
            lat, lon = element["lat"], element["lon"]
        elif "center" in element:
            lat, lon = element["center"]["lat"], element["center"]["lon"]
        else:
            continue

        # Extract tags
        tags = element.get("tags", {})
        name = tags.get("name", "Unknown Hospital")
        amenity = tags.get("amenity") or tags.get("healthcare", "hospital")
        opening_hours = tags.get("opening_hours")

        # Build address
        address_parts = []
        if "addr:housenumber" in tags:
            address_parts.append(tags["addr:housenumber"])
        if "addr:street" in tags:
            address_parts.append(tags["addr:street"])
        if "addr:city" in tags:
            address_parts.append(tags["addr:city"])
        if "addr:state" in tags:
            address_parts.append(tags["addr:state"])
        if "addr:postcode" in tags:
            address_parts.append(tags["addr:postcode"])
        if "addr:country" in tags:
            address_parts.append(tags["addr:country"])

        vicinity = ", ".join(address_parts) if address_parts else f"{lat:.4f}, {lon:.4f}"

        hospital = Hospital(
            name=name,
            vicinity=vicinity,
            osm_id=f"{element['type']}/{element['id']}",
            latitude=lat,
            longitude=lon,
            amenity=amenity,
            phone=tags.get("phone") or tags.get("contact:phone"),
            website=tags.get("website") or tags.get("contact:website"),
            opening_hours=opening_hours,
            is_open=_is_known_open(opening_hours),
            distance_meters=round(_distance_meters(latitude, longitude, lat, lon), 1),
        )
        hospitals.append(hospital)

    return sorted(
        hospitals,
        key=lambda hospital: (
            hospital.is_open is not True,
            hospital.phone is None,
            hospital.distance_meters or float("inf"),
        ),
    )


def get_nearby_hospitals_for_address(address: str, radius: int = 10000) -> List[Hospital]:
    """Geocode an address and return nearby hospitals sorted by emergency usefulness."""
    coordinates = geocode_address(address)
    if not coordinates:
        return []

    latitude, longitude = coordinates
    return get_nearby_hospitals(latitude, longitude, radius)


def get_hospital_details(osm_id: str) -> HospitalDetails:
    """
    Get detailed information about a hospital using OSM ID.

    Args:
        osm_id: OpenStreetMap identifier in format "type/id" (e.g., "node/12345")

    Returns:
        HospitalDetails object
    """
    try:
        element_type, element_id = osm_id.split("/")
        element_id = int(element_id)
    except (ValueError, IndexError):
        raise RuntimeError("Invalid OSM ID format")

    # Query for specific element
    query = f"""
    [out:json][timeout:25];
    {element_type}({element_id});
    out;
    """

    response = requests.post(
        OVERPASS_API_URL,
        data={"data": query},
        headers=REQUEST_HEADERS,
        timeout=30,
    )
    response.raise_for_status()

    data = response.json()
    if "elements" not in data or not data["elements"]:
        raise RuntimeError("Hospital not found")

    element = data["elements"][0]
    tags = element.get("tags", {})

    # Build full address
    address_parts = []
    for key in ["addr:housenumber", "addr:street", "addr:city", "addr:state", "addr:postcode", "addr:country"]:
        if key in tags:
            address_parts.append(tags[key])

    address = ", ".join(address_parts) if address_parts else None

    details = HospitalDetails(
        name=tags.get("name", "Unknown Hospital"),
        phone=tags.get("phone") or tags.get("contact:phone"),
        website=tags.get("website") or tags.get("contact:website"),
        address=address
    )

    return details
