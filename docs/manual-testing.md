# Manuelle Testanleitung

Verwende ausschließlich eigene Testadressen und einen eigenen, eingeschränkten API-Key.

1. Lade die Erweiterung frisch. Prüfe Popup `Einrichtung erforderlich`, violettes `--`-Badge und keine Anfrage im Service-Worker-Netzwerkprotokoll.
2. Speichere Key, Start und Ziel. Prüfe, dass weiterhin kein automatischer Abruf erfolgt.
3. Starte „Verbindung und Route testen“. Prüfe genau einen POST an `directions/v2:computeRoutes` und die angezeigten Fahrzeiten, Verzögerung und Entfernung.
4. Öffne Popup und Side Panel. Vergleiche Werte, Badgefarbe, Trend, Maps-Link und SVG-Verlauf. Der Maps-Link darf keinen Key enthalten.
5. Setze ein aktuives Zeitfenster und löse „Jetzt aktualisieren“ aus. Prüfe Messverlauf und Badge. Teste anschließend einen manuellen Abruf außerhalb des Fensters.
6. Teste einen ungültigen Key, unvollständige Adressen und deaktiviertes Netzwerk. Prüfe die deutschen Meldungen und den Erhalt des letzten erfolgreichen Werts.
7. Warte länger als 15 Minuten ohne Erfolg und prüfe grauen Status. Technische Fehler dürfen keine rote Verkehrslage erzeugen.
8. Teste Warnungen mit passenden Schwellen: erster Rotwechsel, unverändertes Rot, weitere fünf Minuten, Abklingzeit und optionale Entwarnung.
9. Starte Chrome neu. Prüfe wiederhergestellte Werte, Alarme und einen Startabruf nur bei fehlenden/veralteten Daten im Zeitfenster.
10. Lösche erst den Key, dann alle lokalen Daten. Prüfe jeweils den Einrichtungszustand und ausbleibende API-Aufrufe.
11. Wiederhole Popup, Side Panel und Optionen im hellen/dunklen Schema sowie ausschließlich per Tastatur.
12. Prüfe unter „API-Nutzung“, dass erfolgreiche und fehlgeschlagene echte Abrufe genau einmal gezählt werden, abgelehnte lokale Aktionen nicht zählen und „Alle lokalen Daten löschen“ den Zähler zurücksetzt.
