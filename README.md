# StudyForge — leren via het Huiswerk-project

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
- Zonder account: `localStorage` op hetzelfde apparaat en in dezelfde browser.
- De Supabase-tabellen zijn beschreven in `supabase/schema.sql` en `supabase/planning-v2.sql`. De huidige app gebruikt standaard lokale opslag totdat een gezinsaccount en `config.js` met uitsluitend de **publieke** Supabase-projectsleutel zijn ingesteld.
- Een account is nodig voor veilige synchronisatie. Er worden **geen anonieme schrijfrechten** gegeven. Geen databasewachtwoorden of `service_role`-sleutels publiceren.
- Lokale voortgang wordt niet automatisch naar Supabase gemigreerd.

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