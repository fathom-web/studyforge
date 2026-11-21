# StudyForge — leren via het Huiswerk-project

## Huidige versie — R1: lokaal zonder database (21 november 2026)

**Standaard gebruikt StudyForge geen Supabase meer.** GitHub Pages levert de website en de JSON-lespakketten; cijfers, flashcards, plannen, leerresultaten en Slim herhalen worden per leerling in de opslag van de browser bewaard. Er zijn geen leerlingaccounts, betaalde API-calls of databaseverbindingen nodig om te oefenen.

**Eenmalige migratie van bestaande cloudcijfers:** eerdere Supabase-gegevens zijn niet verwijderd. Als een profiel op het huidige apparaat nog geen cloudmigratie heeft bevestigd, geeft het dashboard een waarschuwing. Ga naar **Meer → Back-up en herstel → Haal oude cloudresultaten op**. Dit opent tijdelijk de speciale herstelmodus (`?legacy-cloud=1`). Kies de juiste leerling, voer code `2007` in en controleer de cijfers. De bestaande migratielogica neemt beschikbare cloudresultaten lokaal over. Download dan een JSON-back-up en kies **Terug naar lokale versie**. Doe dit afzonderlijk voor Nikki en Dean. Ook gearchiveerde cloudcijfers zonder herkenbaar lespakket blijven in de lokale resultaatweergave beschikbaar.

**Belangrijk:** nieuwe cijfers op één apparaat komen niet automatisch op een ander apparaat. Exporteer op het bronapparaat en herstel op het tweede apparaat via het back-upscherm. Wis geen browseropslag voordat beide back-ups veilig zijn gedownload én gecontroleerd. De back-upbestanden bevatten persoonlijke leerresultaten; bewaar ze privé. De viercijferige profielcode is een gemakscode, geen sterke beveiliging.

De oude Supabase-installatie, tabellen en bestaande clouddata blijven intact als noodherstel. De optionele herstelmodus gebruikt alleen de bestaande openbare publishable key, geen geheime databasegegevens. R1 vergt nog een handmatige controle met de echte leerlinggegevens op de apparaten van Nikki en Dean.

---


## Historische inrichting (R0): centrale voortgang via Supabase

De cloudadapter staat in `sharedsync.js`; SQL in `supabase/shared-progress.sql`. Het profielscherm vraagt om 2007. De publieke Supabase publishable key en project-URL zijn sinds 29 oktober 2026 in `config.js` ingesteld; de SQL werd door de beheerder uitgevoerd. De code 2007 wordt via de databasefunctie gecontroleerd zodra de verbinding lukt. Daarna synchroniseren toetsresultaten, foute vragen, flashcards, leerdoelen en toetsplanning voor Nikki en Dean tussen apparaten. De eerste keer worden bestaande lokale resultaten zoveel mogelijk meegenomen.

**Installatie bijgewerkt (29 oktober 2026):**
- SQL uitgevoerd volgens screenshot van de beheerder.
- Project-URL en publieke publishable key in de GitHub-configuratie geplaatst.
- De site laadt een cache-gebuste config en gebruikt `sharedMode: true`.
- De clientflow is getest met twee gesimuleerde browsers. De live Supabase-verbinding kan pas door de gebruiker in de browser daadwerkelijk worden bevestigd.
- Gebruik het profielscherm en code 2007; na succesvolle verbinding staat bovenin **Cloudopslag**.

De tabellen kunnen niet rechtstreeks vanuit een anonieme client worden gelezen of gewijzigd. Alle toegang loopt via een beperkte databasefunctie met profielcode. De code 2007 is openbaar in de GitHub-code en is geen sterke beveiliging. Publiceer geen privédocumenten of gevoelige persoonsgegevens.


## Profielcode (StudyForge)

- Na het kiezen van **Nikki** of **Dean** verschijnt een apart codescherm.
- De viercijferige code is **2007**; foutieve codes geven geen toegang tot het dashboard.
- Bij het wisselen van profiel wordt de code opnieuw gevraagd.
- **Dit is uitsluitend een schermdrempel, geen sterke beveiliging.** De websitecode is via de openbare GitHub-repository te lezen. De code staat niet gelijk aan een Supabase-login, databasewachtwoord of echte toegangsrechten.
- Centrale synchronisatie is in de code ingeschakeld. Gebruik de site om de daadwerkelijke verbinding te verifiëren. Met de korte publiek bekende code 2007 blijft dit een eenvoudige gedeelde toegang en geen sterke bescherming tegen misbruik.


Webapp: https://fathom-web.github.io/studyforge/

## Zo werkt het
1. Upload lesmateriaal **in het ChatGPT-project Huiswerk**, met vermelding van Nikki of Dean.
2. Vraag: "Maak hiervan oefentoetsen en flashcards en voeg ze toe aan StudyForge."
3. ChatGPT verwerkt de stof tot vragen, antwoorden, hints en flashcards en publiceert deze in `content/library.json` van de GitHub-repository.
4. StudyForge leest de gepubliceerde inhoud bij het openen automatisch in. De kinderen **kunnen in de app geen toetsen maken, toevoegen, importeren of verwijderen**.
5. In dezelfde openbare bibliotheek kunnen toetsdata worden toegevoegd via de optionele `exams`-lijst. In StudyForge zelf is de toetsplanning alleen-lezen.

Er is dus geen JSON-upload, beheerders-importscherm, invoerformulier voor toetsdata of AI-API-koppeling in de website.

## Extra leermethoden (20 november 2026)

De StudyForge Scholte-concepten zijn geschikt gemaakt voor het bestaande donkere StudyForge-design. De originele lessen, profielcodes, toetsen en cijfers blijven ongewijzigd.

- **Leer in stappen**: een uitleg op basis van uitsluitend bestaande velden uit het lespakket (`lessonTitle`, `learn`, `example` of `hint`), daarna een oefenvraag en feedback. Bij ontbrekende uitleg wordt geen nieuwe feitelijke lesstof verzonnen.
- **Leg het uit**: zonder meerkeuzeopties in eigen woorden antwoorden, vergelijken met het modelantwoord en zelf beoordelen. Lastige vragen keren aan het eind van de sessie terug.
- **Slim herhalen**: registreert resultaten van oefentoetsen, flashcards en beide nieuwe leermethoden. Fout → 20 minuten, bijna → 1 dag, goed → 3/7/14/30/60 dagen. Per sessie maximaal twaalf open herhaalvragen.
- **Afwisselende vragen**: beide nieuwe leermethoden kiezen maximaal twaalf vragen en houden per leerling, leermethode en pakket een eigen rotatie bij; de bestaande toetsvragenrotatie blijft ongewijzigd.
- **Profielscheiding**: alle nieuwe browserdata heeft aparte sleutels voor Nikki (1) en Dean (2). De huidige toetsgeschiedenis wordt bij een eerste profielbezoek als uitgangspunt ingelezen waar beschikbaar.

**Opslagbeperking:** nieuwe leer- en herhaalresultaten staan voorlopig uitsluitend in `localStorage` op het gebruikte apparaat. Zij synchroniseren **nog niet via Supabase**. Browsergegevens wissen kan deze aanvullende resultaten verwijderen. Bestaande cijfers, flashcards en planning blijven hun oorspronkelijke Supabase-koppeling gebruiken. De originele StudyForge Scholte-repository is niet aangepast.

## Wat Nikki en Dean kunnen doen
- Profiel kiezen
- Oefenexamens maken (meerkeuze en open vragen met zelfbeoordeling)
- Flashcards herhalen
- Fouten oefenen
- Cijfers en voortgang volgen
- Mijn toetsen en toetsdata bekijken
- Toetsklaar-status en een leerplanning bekijken; oefensessies afvinken
- Eigen oefendoelen en streefcijfer instellen
- Ouderoverzicht voor beide profielen raadplegen

## Historische technische details van Supabase
- De huidige configuratie gebruikt de gedeelde cloudmodus met Supabase RPC `sf_shared_sync`; er is geen persoonlijk e-mailaccount nodig.
- De tabellen staan beschreven in `supabase/schema.sql`, `supabase/planning-v2.sql` en `supabase/shared-progress.sql`.
- Lokaal bewaarde resultaten worden bij het eerste geldige profielbezoek per apparaat waar mogelijk naar de cloud overgezet. De publieke GitHub-bibliotheek bevat alleen lesmateriaal, niet de cijfers.
- De profielcode is geen sterke authenticatie. De RPC heeft beperkte permissies; plaats geen gevoelige persoonsgegevens of vertrouwelijke bestanden. Geen databasewachtwoorden of `service_role`-sleutels publiceren.

## Gepubliceerde bibliotheek
`content/library.json`:

```json
{
  "schema": "studyforge-library/v1",
  "packs": [
    {
      "id": "unikke-publicatie-id",
      "profile": "Dean",
      "collections": [
        {
          "type": "quiz",
          "subject": "Engels",
          "title": "Hoofdstuk 1",
          "questions": [
            {
              "type": "mc",
              "question": "What is the plural of child?",
              "options": ["Childs", "Children", "Childes"],
              "correct": 1,
              "hint": "Onregelmatig meervoud",
              "explanation": "Children is het meervoud."
            }
          ]
        }
      ]
    }
  ],
  "exams": [
    {
      "id": "toets-engels-2026-11-02",
      "profile": "Dean",
      "title": "Engels hoofdstuk 1",
      "subject": "Engels",
      "date": "2026-11-02",
      "targetGrade": 7
    }
  ]
}
```

`packs` bevat oefenvragen/flashcards; `exams` bevat toetsdata. De JSON-velden voor oefenvragen volgen het `studyforge/v1`-importformaat intern, maar er is **geen importknop meer**. Wijzig gepubliceerde IDs niet zomaar: resultaten worden per collectie bijgehouden.

## Privacy
De GitHub-repository en gepubliceerde bibliotheek zijn openbaar. Plaats daar geen originele schooldocumenten, privédocumenten, wachtwoorden, persoonlijke cijfers of vertrouwelijke leerlinggegevens. Publiceer alleen geschikt oefenmateriaal en niet-gevoelige gegevens. Gesynchroniseerde leerlingresultaten horen uitsluitend in een afgeschermde database.

## Techniek
Statische website op GitHub Pages (HTML, CSS, JavaScript); `app.js` bevat de leerinterface, `data.js` laadt de gepubliceerde bibliotheek en slaat resultaten op, `studytools.js` regelt leerplanning en doelen. Er is geen betaalde AI-integratie nodig.
## StudyForge 2.0 — R0: veilige overstap naar lokaal

Deze eerste release is **niet** de definitieve uitschakeling van Supabase. Zodra een profiel met een werkende cloudverbinding wordt geopend, neemt `backup.js` de historische cloudresultaten zoveel mogelijk lokaal over. De oorspronkelijke externe client-ID blijft behouden, zodat opnieuw synchroniseren geen dubbele toetsresultaten veroorzaakt. Nog niet aan lesmateriaal te koppelen cloudregels worden lokaal afzonderlijk bewaard. De database wordt **niet** gewist of veranderd.

Ga per leerling naar **Meer → Back-up en herstel** en download een privé JSON-bestand. Herhaal dit voor Nikki én Dean, want de back-ups zijn gescheiden. Het bestand bevat toetsresultaten, flashcards, leer- en herhaalvoortgang, toetsplanning, lesmateriaal en eventueel de recente cloudgegevens. In dezelfde sectie kan de juiste leerling een back-up terugzetten, zonder bestaande resultaten eerst te wissen.

**Veiligheidsvoorwaarde voor R1 (database uitschakelen):** controleer op beide leerlingprofielen de historische cijfers, download beide back-ups en test het herstel op een ander apparaat of in een schoon browserprofiel. R0 wordt eerst op een eigen ontwikkelbranch getest. Browsergegevens wissen zonder werkende back-up kan lokale voortgang doen verdwijnen. De zichtbare viercijferige toegangscode is geen bescherming voor een geëxporteerd JSON-bestand.
