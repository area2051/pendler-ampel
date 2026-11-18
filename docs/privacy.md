# Datenschutz und Sicherheit

Pendler-Ampel enthält keine Telemetrie, Analyse oder Verbindung zu einem Entwickler-Backend. Daten werden nicht an den Entwickler übertragen.

## Übertragene Daten

Nur bei einem Verbindungstest oder zulässigen manuellen beziehungsweise automatischen Abruf sendet die Erweiterung Startadresse, Zieladresse, Abfahrtszeit, Routenoptionen und den nutzereigenen API-Key direkt an die Google Routes API. Es gelten die Datenschutzbedingungen von Google.

## Lokal gespeicherte Daten

`chrome.storage.local` enthält API-Key, Adressen, Einstellungen, Verifizierungsstatus, letzte Messung, Messverlauf, Benachrichtigungszustand und ein lokales API-Nutzungsprotokoll. `chrome.storage.sync` wird nicht verwendet. Der Messverlauf wird nach 24 Stunden beziehungsweise ab 300 Einträgen gekürzt.

Das API-Nutzungsprotokoll speichert einen dauerhaften Gesamtzähler sowie höchstens 100 Einträge mit Zeitpunkt, Auslöser und Ergebniscode. Es enthält keine API-Keys, Adressen oder Request-Inhalte und wird zusammen mit allen lokalen Daten gelöscht.

Ein API-Key kann in einer clientseitigen Chrome-Erweiterung nicht kryptografisch sicher vor Personen mit Zugriff auf Browserprofil oder Entwicklerwerkzeuge verborgen werden. Der Key steht niemals im Quellcode, Manifest, in ausgelieferten Konfigurationsdateien, URLs, Logs oder Fehlermeldungen. Beschränke ihn auf die Routes API und verwende Quoten sowie Budgetwarnungen.

Über „Alle lokalen Daten löschen“ können sämtliche gespeicherten Angaben entfernt werden. Eine Deinstallation entfernt die Extension-Daten ebenfalls über Chrome.
