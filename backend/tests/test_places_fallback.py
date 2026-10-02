"""Hospital lookup provider-fallback tests. No network calls are made."""

from types import SimpleNamespace

import pytest
import requests

import services.places_service as places_service


def test_overpass_falls_back_after_primary_gateway_timeout(monkeypatch):
    urls = ("https://primary.example/interpreter", "https://secondary.example/interpreter")
    calls = []

    def fake_post(url, **kwargs):
        calls.append(url)
        if url == urls[0]:
            raise requests.HTTPError("504 Gateway Timeout")
        return SimpleNamespace(
            raise_for_status=lambda: None,
            json=lambda: {
                "elements": [
                    {
                        "type": "node",
                        "id": 123,
                        "lat": 18.5204,
                        "lon": 73.8567,
                        "tags": {
                            "name": "Fallback Hospital",
                            "amenity": "hospital",
                            "phone": "+91-20-0000-0000",
                        },
                    }
                ]
            },
        )

    monkeypatch.setattr(places_service, "OVERPASS_API_URLS", urls)
    monkeypatch.setattr(places_service.requests, "post", fake_post)

    hospitals = places_service.get_nearby_hospitals(18.52, 73.85)

    assert calls == list(urls)
    assert len(hospitals) == 1
    assert hospitals[0].name == "Fallback Hospital"
    assert hospitals[0].phone == "+91-20-0000-0000"


def test_overpass_raises_generic_error_when_all_providers_fail(monkeypatch):
    urls = ("https://primary.example/interpreter", "https://secondary.example/interpreter")
    calls = []

    def fake_post(url, **kwargs):
        calls.append(url)
        raise requests.Timeout("provider details must not escape")

    monkeypatch.setattr(places_service, "OVERPASS_API_URLS", urls)
    monkeypatch.setattr(places_service.requests, "post", fake_post)

    with pytest.raises(
        RuntimeError,
        match="All configured hospital-search providers are unavailable",
    ):
        places_service.get_nearby_hospitals(18.52, 73.85)

    assert calls == list(urls)
