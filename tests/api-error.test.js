import test from "node:test";
import assert from "node:assert/strict";

import { ApiError, publicError } from "../api/api-error.js";
import { ConfigurationValidationError } from "../shared/validation.js";

test("publicError preserves safe configuration validation details", () => {
  assert.deepEqual(publicError(new ConfigurationValidationError(["Startadresse fehlt."])), {
    code: "VALIDATION_ERROR",
    message: "Startadresse fehlt.",
  });
});

test("publicError replaces unrecognized API error codes with UNKNOWN", () => {
  assert.deepEqual(publicError(new ApiError("TEST_API_KEY")), {
    code: "UNKNOWN",
    message: "Ein unerwarteter Fehler ist aufgetreten.",
  });
});
