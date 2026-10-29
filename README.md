# StudyForge — leren via het Huiswerk-project

## Centrale voortgang zonder persoonlijke gebruikersaccounts

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

## Gegevens en Supabase
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