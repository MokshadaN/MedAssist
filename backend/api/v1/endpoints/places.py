"""Places endpoints for OpenStreetMap Overpass API."""

from fastapi import APIRouter, Depends, HTTPException
from typing import List

from core.dependencies import get_current_user
from schemas.places import Hospital, HospitalDetails
from services.places_service import get_nearby_hospitals, get_hospital_details

router = APIRouter(tags=["places"])


@router.get("/nearby-hospitals", response_model=List[Hospital])
def get_nearby_hospitals_endpoint(
    latitude: float,
    longitude: float,
    radius: int = 5000,
    current_user=Depends(get_current_user),
):
    """
    Get nearby hospitals using OpenStreetMap Overpass API.

    Args:
        latitude: Latitude of the location
        longitude: Longitude of the location
        radius: Search radius in meters (default 5000)
    """
    try:
        return get_nearby_hospitals(latitude, longitude, radius)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hospital-details", response_model=HospitalDetails)
def get_hospital_details_endpoint(
    osm_id: str,
    current_user=Depends(get_current_user),
):
    """
    Get detailed information about a hospital.

    Args:
        osm_id: OpenStreetMap identifier in format "type/id" (e.g., "node/12345")
    """
    try:
        return get_hospital_details(osm_id)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))