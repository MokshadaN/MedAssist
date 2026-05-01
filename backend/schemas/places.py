"""Places schemas."""

from typing import List, Optional
from pydantic import BaseModel, Field


class Hospital(BaseModel):
    name: str = Field(description="Name of the hospital")
    vicinity: str = Field(description="Address vicinity")
    osm_id: str = Field(description="OpenStreetMap unique identifier")
    latitude: float = Field(description="Latitude coordinate")
    longitude: float = Field(description="Longitude coordinate")
    amenity: str = Field(description="Type of healthcare facility")
    phone: Optional[str] = Field(default=None, description="Phone number")
    website: Optional[str] = Field(default=None, description="Website URL")
    opening_hours: Optional[str] = Field(default=None, description="OpenStreetMap opening hours")
    is_open: Optional[bool] = Field(default=None, description="Whether the facility is known to be open now")
    distance_meters: Optional[float] = Field(default=None, description="Approximate distance from search point")


class HospitalDetails(BaseModel):
    name: str = Field(description="Name of the hospital")
    phone: Optional[str] = Field(default=None, description="Phone number")
    website: Optional[str] = Field(default=None, description="Website URL")
    address: Optional[str] = Field(default=None, description="Full address")


class NearbyHospitalsResponse(BaseModel):
    results: List[Hospital] = Field(default_factory=list, description="List of nearby hospitals")
