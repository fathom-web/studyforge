# StudyForge 2.0 — R1 (GitHub Pages, zonder database)

Website: https://fathom-web.github.io/studyforge/

## Hoe R1 werkt

StudyForge draait als statische HTML/CSS/JavaScript-website op GitHub Pages. Lesmateriaal komt uit `content/library.json` en de aanvullende JSON-lespakketten in `content/`. Cijfers, gemaakte toetsen, flashcardbeoordelingen, leerplanning, leerdoelen, *Leer in stappen*, *Leg het uit* en *Slim herhalen* staan in de **localStorage van de gebruikte browser**. Er zijn **geen Supabase-scripts, accounts, API-sleutels, databasecalls of AI-API-calls** nodig.

De oorspronkelijke opslagkeys blijven bestaan, zodat bestaande lokale voortgang bij een update van R0 naar R1 niet wordt gewist. Ook de nieuwste-eerst-sortering, profielscheiding, toetsvragenrotatie en gearchiveerde oude lespakketten blijven intact.

**Belangrijk:** de voortgang synchroniseert niet tussen verschillende telefoons, computers, browsers of privévensters. Browsergegevens wissen, van apparaat wisselen of een andere browser gebruiken kan lokale resultaten onbereikbaar maken. Maak daarom geregeld een back-up.

## Gebruik

1. Kies **Nikki** of **Dean** en vul de bestaande viercijferige profielcode in.
2. Open oefentoetsen, flashcards of een van de nieuwe leermethoden.
3. Onder **Meer → Back-up en herstel** download je een JSON-back-up van het gekozen profiel.
4. Doe dat **apart voor Nikki en Dean**. Op een ander apparaat kun je de bestanden via hetzelfde scherm terugzetten. Bestaande resultaten worden zoveel mogelijk samengevoegd, niet eerst verwijderd.
5. Voeg nieuwe lesstof toe via ChatGPT in het StudyForge/Huiswerk-project. ChatGPT publiceert nieuwe JSON-lespakketten naar GitHub. De leerlingen kunnen zelf geen lesmateriaal in de website uploaden.

## Overstap vanaf R0 en eerdere cloudresultaten

R0 probeerde bestaande Supabase-resultaten per profiel lokaal over te nemen en bood een back-up aan. R1 doet **geen enkele nieuwe databaseaanvraag**. Heb je een back-up uit R0, herstel die in R1 via **Meer → Back-up en herstel**. R1 toont een waarschuwing als het gebruikte apparaat geen bevestigde cloudmigratie of herstelde back-up heeft. De waarschuwing betekent niet automatisch dat er cijfers ontbreken; het betekent dat we dat niet kunnen verifiëren.

De oude Supabase-database en de daarin bewaarde records zijn **niet gewist**. De laatste R0-code staat als rollback op GitHub-branch `studyforge-2-safe-local-backup`. De hoofdwebsite is volledig lokaal. Een eventuele latere migratie uit het oude cloudarchief moet apart en bewust worden uitgevoerd.

## Leermethoden

- **Oefentoetsen:** meerkeuze en open vragen, cijfers en foutenanalyse. Gepubliceerde lespakketten met een vraagpool kunnen wisselende vragen per ronde aanbieden.
- **Flashcards:** antwoorden omdraaien, beoordelen en de voortgang lokaal bewaren.
- **Leer in stappen:** bestaande lesuitleg/hints uit de gepubliceerde leerstof, daarna oefenen en feedback. Geen automatisch verzonnen schoolinhoud.
- **Leg het uit:** zelf een antwoord formuleren, vergelijken met het modelantwoord en moeilijke vragen herhalen.
- **Slim herhalen:** herhaling op basis van eerdere resultaten (fout: 20 minuten; bijna: 1 dag; goed: 3/7/14/30/60 dagen).
- **Planning en toetsklaar:** toetsdata, streefcijfers en een ouderoverzicht per profiel.

## Profielcode en privacy

De profielcode is alleen een gebruiksvriendelijke schermdrempel en **geen beveiliging**. De website en lesbibliotheek zijn openbaar, en gegevens in de lokale browser zijn toegankelijk voor iemand die het apparaat/browserprofiel kan gebruiken. Bewaar back-upbestanden privé. Plaats nooit privéleerlingresultaten, wachtwoorden of schooldocumenten in de openbare GitHub-repository.

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

## Techniek en beheer

- `data.js`: lokale adapter, validatie en inlezen van de gepubliceerde JSON-lesstof.
- `app.js`: profielen, dashboard, toetsen, flashcards en navigatie.
- `studytools.js`: lokaal opgeslagen planning, doelen en ouderoverzicht.
- `learning.js` en `review.js`: aanvullende leermethoden en herhaalplanning.
- `backup.js`: per-profiel JSON-back-up en herstel, ook van oude R0-exporten.
- `index.html`: laadt uitsluitend de statische, lokale modules. `config.js` en `sharedsync.js` zijn in R1 verwijderd; ze staan nog in de historische R0-branch.

Nieuwe vragen worden alleen uit aangeleverd lesmateriaal samengesteld. De app heeft geen ingebouwde AI- of databasekosten.
