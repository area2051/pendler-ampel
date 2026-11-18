# Pendler-Ampel

Pendler-Ampel ist eine deutsche Chrome-Erweiterung nach Manifest V3. Sie fragt mit deinem eigenen Google-Routes-API-Key die aktuelle und normale Fahrzeit einer Route ab, berechnet Verzögerung und Trend und zeigt das Ergebnis in Badge, Popup und Side Panel. Es gibt kein Backend, keine Telemetrie und keinen Demo-Modus.

## Schnellstart

1. Folge [Google-Cloud-Einrichtung](docs/google-cloud-setup.md) und erstelle einen eigenen, auf die Routes API beschränkten Key.
2. Öffne `chrome://extensions`, aktiviere den Entwicklermodus und wähle „Entpackte Erweiterung laden“.
3. Wähle diesen Projektordner, öffne die Einstellungen und trage Key, Start und Ziel ein.
4. Klicke „Verbindung und Route testen“. Erst ein erfolgreicher Test erlaubt automatische Aktualisierungen.

Ausführlich: [Installation](docs/installation.md) · [Manuelle Tests](docs/manual-testing.md) · [Datenschutz](docs/privacy.md)

## Entwicklung

Voraussetzung ist Node.js 22 oder neuer. Es gibt keine npm-Abhängigkeiten und keinen Build-Schritt.

```bash
npm test
npm run check
npm run verify
```

Die Erweiterung verwendet ausschließlich lokale ES-Module. Technische Zeiten werden in Sekunden gespeichert; die Oberfläche formatiert sie lokal auf Deutsch.

## Bekannte Einschränkungen

- Ein clientseitig gespeicherter API-Key ist für Nutzer mit Zugriff auf das Chrome-Profil auslesbar; echte Verschlüsselung ist nicht möglich.
- Chrome muss laufen. Alarme können vom Browser verzögert werden und sind keine Echtzeitgarantie.
- Windows- oder Unternehmensrichtlinien können Benachrichtigungen unterdrücken.
- Verkehrsdaten, Routenqualität, Preise und Kontingente werden von Google bestimmt.
- Version 1 unterstützt genau eine konfigurierte Route und Chrome ab Version 116.
