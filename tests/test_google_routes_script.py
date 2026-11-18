import importlib.util
import contextlib
import io
import json
import pathlib
import unittest
from datetime import datetime, timezone
from unittest import mock


SCRIPT_PATH = pathlib.Path(__file__).parents[1] / "scripts" / "test-google-routes.py"
SPEC = importlib.util.spec_from_file_location("test_google_routes_script", SCRIPT_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class RouteAddressInputTests(unittest.TestCase):
    def test_empty_answers_use_public_nrw_station_defaults(self):
        answers = iter(["", ""])

        origin, destination = MODULE.read_route_addresses(lambda _prompt: next(answers))

        self.assertEqual(origin, "Konrad-Adenauer-Platz 14, 40210 Düsseldorf")
        self.assertEqual(destination, "Trankgasse 11, 50667 Köln")

    def test_entered_addresses_override_defaults(self):
        answers = iter(["Eigener Start", "Eigenes Ziel"])

        origin, destination = MODULE.read_route_addresses(lambda _prompt: next(answers))

        self.assertEqual((origin, destination), ("Eigener Start", "Eigenes Ziel"))


class DepartureTimeTests(unittest.TestCase):
    def test_main_sends_a_departure_time_60_seconds_in_the_future(self):
        captured = {}

        class FixedDatetime:
            @classmethod
            def now(cls, tz):
                return datetime(2026, 11, 18, 9, 0, 0, tzinfo=timezone.utc)

        class FakeResponse(io.BytesIO):
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                self.close()

        def fake_urlopen(request, timeout):
            captured["payload"] = json.loads(request.data)
            captured["timeout"] = timeout
            return FakeResponse(b"{}")

        with (
            mock.patch.object(MODULE, "datetime", FixedDatetime),
            mock.patch.object(MODULE.getpass, "getpass", return_value="TEST_API_KEY"),
            mock.patch.object(MODULE, "read_route_addresses", return_value=("START_ADDRESS", "DESTINATION_ADDRESS")),
            mock.patch.object(MODULE.urllib.request, "urlopen", side_effect=fake_urlopen),
        ):
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(MODULE.main(), 0)

        self.assertEqual(captured["payload"]["departureTime"], "2026-11-18T09:01:00Z")
        self.assertEqual(captured["timeout"], 15)


if __name__ == "__main__":
    unittest.main()
