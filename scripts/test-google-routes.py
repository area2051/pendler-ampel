#!/usr/bin/env python3

import getpass
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone


ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes"
FIELD_MASK = "routes.duration,routes.staticDuration,routes.distanceMeters"
DEFAULT_ORIGIN = "Konrad-Adenauer-Platz 14, 40210 Düsseldorf"
DEFAULT_DESTINATION = "Trankgasse 11, 50667 Köln"


def read_route_addresses(input_fn=input) -> tuple[str, str]:
    origin = input_fn(f"Startadresse [{DEFAULT_ORIGIN}]: ").strip() or DEFAULT_ORIGIN
    destination = input_fn(f"Zieladresse [{DEFAULT_DESTINATION}]: ").strip() or DEFAULT_DESTINATION
    return origin, destination


def main() -> int:
    api_key = getpass.getpass("Google-Routes-API-Key: ").strip()
    origin, destination = read_route_addresses()

    if not api_key or not origin or not destination:
        print("API-Key, Startadresse und Zieladresse sind erforderlich.", file=sys.stderr)
        return 2

    payload = {
        "origin": {"address": origin},
        "destination": {"address": destination},
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE_OPTIMAL",
        "trafficModel": "BEST_GUESS",
        "computeAlternativeRoutes": False,
        "languageCode": "de-DE",
        "units": "METRIC",
        "departureTime": (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat().replace("+00:00", "Z"),
        "routeModifiers": {
            "avoidTolls": False,
            "avoidHighways": False,
            "avoidFerries": False,
        },
    }
    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": FIELD_MASK,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            print(f"HTTP {response.status}")
            print(json.dumps(json.load(response), indent=2, ensure_ascii=False))
        return 0
    except urllib.error.HTTPError as error:
        print(f"HTTP {error.code}", file=sys.stderr)
        body = error.read().decode("utf-8", errors="replace")
        try:
            print(json.dumps(json.loads(body), indent=2, ensure_ascii=False), file=sys.stderr)
        except json.JSONDecodeError:
            print(body, file=sys.stderr)
        return 1
    except urllib.error.URLError as error:
        print(f"Netzwerkfehler: {error.reason}", file=sys.stderr)
        return 1
    finally:
        api_key = ""


if __name__ == "__main__":
    raise SystemExit(main())
