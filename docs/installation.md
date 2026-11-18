# Installation

## Entpackte Erweiterung laden

1. Lade oder kopiere den vollständigen Projektordner auf den Rechner.
2. Öffne in Chrome `chrome://extensions`.
3. Aktiviere oben rechts den **Entwicklermodus**.
4. Klicke **Entpackte Erweiterung laden** und wähle den Ordner mit `manifest.json`.
5. Fixiere „Pendler-Ampel“ optional über das Erweiterungsmenü an der Symbolleiste.
6. Öffne das Popup und anschließend **Einstellungen öffnen**.

Ohne API-Key, Start und Ziel führt die Erweiterung keinen Netzwerkaufruf aus. Nach jeder Änderung an Key, Adressen oder Routenoptionen ist ein erneuter Verbindungstest nötig.

## Service-Worker-Konsole

Öffne `chrome://extensions`, suche „Pendler-Ampel“ und klicke im Eintrag neben **Service Worker** auf **Untersuchen**. Die DevTools-Konsole dient zur Fehlersuche. Die Erweiterung protokolliert absichtlich weder API-Key noch Adressen.

Nach Quellcodeänderungen muss die Erweiterung auf dieser Seite über das Aktualisieren-Symbol neu geladen werden. Popup und Side Panel danach ebenfalls neu öffnen.
