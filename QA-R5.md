# StudyForge 2.0 — R5 kwaliteitscontrole

**Datum:** 22 november 2026  
**Scope:** de bestaande StudyForge-site voor Nikki en Dean, met GitHub Pages en lokale browseropslag.  
**Doel:** mobiel gemakkelijker te bedienen, robuust tegen dubbel tikken, geen onbedoeld verlies van lopende sessies, veilige leerlingback-ups.

## Automatisch/programmatisch gecontroleerd (geslaagd)

Bij deze release zijn de echte gepubliceerde JSON-lespakketten in een gesimuleerde browseromgeving geladen. Er stonden tijdens de controle **33 collecties** in de bibliotheek. De scenario's hieronder zijn technisch doorgelopen; dit is **geen claim dat een echte iPhone of Android-telefoon visueel is getest**.

| Onderdeel | Uitkomst |
| --- | --- |
| Starten zonder database, lesbibliotheek laden | Geslaagd |
| Nieuwste lespakket bovenaan, afzonderlijk bij Nikki en Dean | Geslaagd |
| Navigatie met tekstlabels voor schermlezers; actieve navigatie herkenbaar | Geslaagd |
| Snel tweemaal 'Volgende vraag' geeft geen overslaan van een onbeantwoorde vraag | Geslaagd |
| Afbreken van een onafgemaakte toets: bevestiging weigeren bewaart huidige antwoorden | Geslaagd |
| Profiel wisselen vanuit onafgemaakte toets vraagt bevestiging | Geslaagd |
| Navigeren tijdens het opslaan van een toetsresultaat wordt geblokkeerd | Geslaagd |
| Twee snelle voltooiingsacties veroorzaken slechts één opgeslagen cijfer | Geslaagd |
| Dubbel tikken bij flashcardbeoordeling verwerkt de kaart slechts eenmaal | Geslaagd |
| Bevestiging voor verlaten van Leer in stappen / Leg het uit | Geslaagd |
| Bevestiging voor verlaten van Slim herhalen | Geslaagd |
| Back-up bevat nu ook de vraagrotatie van leermethoden | Geslaagd |
| Herstel van leermethoden en vraagrotatie zonder verkeerde leerling te mengen | Geslaagd |
| Oude toetsresultaten, R3-leercoach en R4-planning blijven in de code aanwezig | Gecontroleerd |
| Geen extra externe API- of databaseverzoeken in de gesimuleerde flows | Geslaagd |

## Visuele en apparaattests die nog handmatig moeten gebeuren

De broncode is responsief verbeterd. Zonder fysieke browser op de telefoons is **nog niet visueel bevestigd** dat alles perfect past bij verschillende schermbreedtes, zoominstellingen of iOS/Android-toetsenborden.

1. Open StudyForge op de iPhone van Nikki en het apparaat van Dean. Controleer bij smalle schermen de vijf menuknoppen onderaan, inclusief **Meer**, en de leesbaarheid van de toetsen.
2. Start een toets, vul een antwoord in en probeer via de onderste navigatie weg te gaan. Kies **Annuleren** en controleer dat het antwoord blijft staan.
3. Voer een oefentoets af tot het eind en controleer dat in **Mijn progressie** slechts één nieuw cijfer verschijnt.
4. Test een flashcardronde, **Leer in stappen**, **Leg het uit** en **Slim herhalen** in staande én liggende schermstand.
5. Voeg onder **Mijn toetsen** een toekomstige toets toe en controleer **Toetsklaar** en het **Ouderoverzicht**.
6. Download een back-up voor Nikki en voor Dean. Herstel beide op een ander apparaat of een schoon browserprofiel en controleer de oude cijfers, planning, leerstatistieken en persoonlijke leerroute.
7. Test de compacte zijbalk rond tabletformaat (breedte 620–900 px), toetsenbordnavigatie en grote tekstinstellingen.

## Gegevensbehoud en terugval

- De bestaande JSON-lespakketten zijn niet herschreven.
- De lokale opslagkeys, toetsresultaten en Supabase-noodarchief zijn niet verwijderd.
- Nieuwe R5-code is **alleen** gericht op weergave, sessiebeveiliging en aanvullende back-upmetadata.
- De ontwikkelbranch `studyforge-r5-mobile-quality` houdt de releasewijzigingen apart van eerdere versies.
- Terugzetten van GitHub-code herstelt niet automatisch lokale browsergegevens; voor die gegevens blijft een actuele JSON-back-up noodzakelijk.

**Beperking:** bovenstaande controles zijn code- en regressietests. De echte inhoud van Nikki's en Deans privébrowser is niet toegankelijk vanuit deze test en is niet verwijderd of gewijzigd.
