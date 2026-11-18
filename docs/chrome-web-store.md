# Vorbereitung für den Chrome Web Store

Vor einer Veröffentlichung:

1. `npm run verify` ausführen und die Erweiterung gemäß `manual-testing.md` prüfen.
2. Versionsnummer in `manifest.json` und `package.json` gemeinsam erhöhen.
3. Nur die Extension-Dateien paketieren; Tests, Skripte und Projektdokumentation können aus dem Upload-ZIP ausgeschlossen werden.
4. In der Store-Erklärung den Einzelzweck „Fahrzeit einer konfigurierten Pendelroute überwachen“ nennen.
5. Die Rechte `alarms`, `notifications`, `storage`, `sidePanel` und den Zugriff auf `routes.googleapis.com` jeweils funktional begründen.
6. Die Angaben aus `privacy.md` als verständliche Datenschutzerklärung veröffentlichen.
7. Offenlegen, dass Start, Ziel, Abfahrtszeit, Routenoptionen und Key an Google gesendet werden und keine Entwickler-Telemetrie existiert.

Die Erweiterung lädt keine externen Skripte, Bibliotheken, Schriftarten oder CDN-Ressourcen. Vor Einreichung sind die jeweils aktuellen Richtlinien des Chrome Web Store zu prüfen.
