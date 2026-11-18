# Google-Cloud-Einrichtung

Jeder Nutzer benötigt ein eigenes Google-Cloud-Projekt und trägt seinen eigenen Key lokal ein.

1. Öffne die [Google Cloud Console](https://console.cloud.google.com/) und erstelle ein Projekt.
2. Verknüpfe ein Rechnungskonto. Google verlangt dies grundsätzlich auch dann, wenn Nutzung innerhalb eines Freikontingents bleibt.
3. Öffne „APIs und Dienste“ und aktiviere **Routes API**.
4. Erzeuge unter „Anmeldedaten“ einen API-Key.
5. Bearbeite den Key und beschränke seine **API-Einschränkungen ausschließlich auf Routes API**.
6. Lege in der Routes API niedrige Tagesquoten fest, die zu deinem Aktualisierungsintervall passen.
7. Richte unter „Abrechnung“ Budgetwarnungen ein.
8. Trage den Key nur in der Optionsseite der Erweiterung ein und teste die Route.

Der Key selbst kostet nichts; API-Aufrufe können kostenpflichtig sein. Preise, Freikontingente und Bedingungen können sich ändern. Prüfe deshalb die aktuelle [Routes-API-Preisübersicht](https://developers.google.com/maps/billing-and-pricing/pricing) und die Cloud-Abrechnung. Jeder Nutzer ist selbst für sein Konto, seine Quoten und Kosten verantwortlich. Die Erweiterung garantiert keine dauerhaft kostenlose Nutzung.
