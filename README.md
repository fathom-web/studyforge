## StudyForge 2: mijn toetsen, leerdoelen, Toetsklaar, ouderoverzicht

Dit werkt ook zonder Supabase, volledig in de browser:
- **Mijn toetsen**: geef naam, vak en toetsdatum op en eventueel het gewenste cijfer.
- **Leerdoelen**: streefcijfer en gewenste oefensessies per week, inclusief telling van gemaakte oefentoetsen.
- **Toetsklaar**: een indicatieve status gebaseerd op gemaakte toetsen, fouten en gekende flashcards. Dit is geen voorspelling van het echte toetscijfer.
- **Oefenschema**: automatisch de komende maximaal 14 oefendagen; je kunt sessies afvinken en direct een gekoppelde oefenset starten.
- **Ouderoverzicht**: voortgang en aankomende toetsen van Nikki én Dean, zonder afzonderlijke ouderpincode.
- **Mobiel**: menu **Meer** opent aanvullende functies.

### Supabase-v2 migratie en synchronisatie

**De nieuwe v2-tabellen worden niet automatisch aangemaakt in Supabase.**
1. Open je StudyForge-project in Supabase → SQL Editor.
2. Voer **`supabase/planning-v2.sql`** eenmalig uit, boven op het eerdere `supabase/schema.sql`.
3. Maak later een Supabase Authentication-gebruikersaccount aan voor het gezin.
4. Vul de project-URL en de publieke `publishableKey` in `config.js` in; voer nooit een databasewachtwoord of secret key in deze publieke repository in.
5. Publiceer `config.js` opnieuw via GitHub Pages. Bij het inloggen worden oefenresultaten, leerplanning en gepubliceerde oefensets dan tussen apparaten gesynchroniseerd.

**Totdat de accountkoppeling geregeld is blijft alle persoonlijke voortgang lokaal op ieder apparaat.** Beveiligde accounts worden niet automatisch aangemaakt, en lokale voortgang wordt niet vanzelf overgezet naar Supabase. De app geeft bij problemen met de aanvullende Supabase-tabel een waarschuwing, terwijl lokaal opslaan beschikbaar blijft.

> Zonder gebruikersaccount is er geen veilige manier om privéresultaten vanuit een openbare GitHub Pages-site in één gedeelde Supabase-database te synchroniseren. Er is bewust geen publiek beschrijfbare database aangemaakt.

# StudyForge — GitHub Pages + optionele Supabase

Een zelfstandige, responsive webapp voor Nikki en Dean met profielkeuze, dashboards, oefenexamens, flashcards, cijfers, progressie en fouten oefenen. Geen AI-koppeling en geen schoolboek-foto's/PDF/Word upload op de website.

## In 2 minuten online op GitHub Pages

1. Maak in GitHub een repository aan, bijvoorbeeld `studyforge`.
2. Upload **alle bestanden uit deze map** naar de root van de repository. Het bestand `index.html` moet direct in de root staan.
3. Open **Settings → Pages → Build and deployment → Deploy from a branch**. Kies `main` en `/(root)` en sla op.
4. De app verschijnt doorgaans onder `https://<gebruikersnaam>.github.io/studyforge/`.
5. Open de pagina, kies Nikki of Dean. De bibliotheek begint leeg totdat je lesmateriaal laat publiceren.

Zonder Supabase gebruikt StudyForge automatisch browseropslag (`localStorage`). Toetsen, cijfers en flashcardbeoordelingen worden dan bewaard op **dat apparaat in die browser**. Wisselen van browser/apparaat synchroniseert niet. De lokale startversie is **geen beveiligde privéomgeving**: het ouderbeheer staat open.

## Supabase verbinden (optioneel, voor synchronisatie)

1. Maak een project op [supabase.com](https://supabase.com).
2. Open **SQL Editor** en voer `supabase/schema.sql` helemaal uit.
3. Maak in **Authentication → Users** een eigen e-mail/wachtwoord-account voor het gezin aan. Bevestig het e-mailadres indien nodig. Dit is bewust één gedeeld gezinsaccount in v1.
4. Open **Project Settings / Connect → API** en kopieer de **Project URL** en de **publishable key** (of oude `anon`-sleutel). Neem **nooit** een secret of `service_role` key over.
5. Vul in `config.js` `url` en `publishableKey` in. Publiceer de gewijzigde `config.js` op GitHub Pages.
6. Open de website, log in met het Supabase-account. Kies daarna Nikki of Dean. Alle importsets en resultaten uit Supabase worden vervolgens tussen apparaten gedeeld onder hetzelfde account.

> Let op: De gedeelde gezinslogin betekent dat wie het gezinswachtwoord kent ook de importomgeving kan openen. Het opnieuw invoeren van een wachtwoord is géén aparte, sterke ouderrol. Een echte ouder/leerling-rolverdeling met losse accounts kan in versie 2 worden toegevoegd. Gebruik unieke, sterke wachtwoorden. Supabase-RLS zorgt ervoor dat een ander account niet bij de familiedata kan.

> Lokale demoresultaten worden **niet** automatisch overgezet naar Supabase. Zodra je de cloudverbinding invult, werk je met de online database. Import van lesstof opnieuw via JSON is mogelijk.

> GitHub Pages maakt de websitebestanden **publiek**. Zet geen schooldocumenten, persoonlijke resultaten, wachtwoorden of geheime API-sleutels in de GitHub-repository. Alleen de publishable key is bedoeld voor een browserapp, mits RLS aan staat. Controleer dit voordat je privégegevens importeert.

## Vragen en flashcards importeren vanuit ChatGPT

1. Vraag in ChatGPT: **“Maak een StudyForge-importbestand voor Dean of Nikki, inclusief oefentoets en flashcards. Gebruik uitsluitend mijn meegegeven lesmateriaal. Formaat studyforge/v1.”**
2. Download de gegenereerde `.json`.
3. Open in StudyForge het persoonlijke dashboard → **Ouderbeheer** → kies het `.json`-bestand → **Importeren**.
4. De oefentoets en flashcards verschijnen direct bij het juiste profiel. Er zijn geen kosten voor AI-aanroepen vanuit de website.

### JSON-formaat (minimum)

```json
{
  "schema": "studyforge/v1",
  "profile": "Dean",
  "collections": [
    {
      "type": "quiz",
      "subject": "Engels",
      "title": "Oefentoets hoofdstuk 1",
      "description": "Mijn oefentoets",
      "questions": [
        {
          "type": "mc",
          "question": "What is the plural of child?",
          "options": ["Childs", "Children", "Childes", "Childrens"],
          "correct": 1,
          "hint": "Denk aan een onregelmatig meervoud.",
          "explanation": "Child heeft als meervoud children."
        },
        {
          "type": "open",
          "question": "Translate: Ik ben aan het lezen.",
          "answer": "I am reading.",
          "hint": "Gebruik am + -ing.",
          "explanation": "De present continuous beschrijft wat nu gebeurt."
        }
      ]
    },
    {
      "type": "flashcards",
      "subject": "Engels",
      "title": "Woorden hoofdstuk 1",
      "cards": [
        {"front": "Child", "back": "Kind"},
        {"front": "Children", "back": "Kinderen"}
      ]
    }
  ]
}
```

Het vorige `learning-hub/v1` importformaat is ook geldig, zodat de eerder gemaakte voorbeeldbestanden blijven werken. Maximale importgrootte: 1,8 MB; maximaal 50 sets per bestand, 250 vragen/kaarten per set. Dubbelen met dezelfde naam, vak en soort worden overgeslagen.

## Belangrijk over cijfers

Multiplechoice wordt automatisch nagekeken. Bij open vragen ziet de leerling het modelantwoord en geeft zelf aan of het antwoord goed was. Dat is geen AI-beoordeling. De app telt goed en fout en berekent een indicatief cijfer van 1 tot 10. Foute vragen komen terug bij *Fouten oefenen*.

## Bestanden

- `index.html`: website startpunt.
- `style.css`: complete responsive interface.
- `app.js`: dashboard, oefenlogica, interactie.
- `data.js`: browseropslag en Supabase-adapter.
- `config.js`: Supabase-verbindingsinstellingen (leeg = lokaal).
- `content/library.json`: gepubliceerde toetsen/flashcards die in het Huiswerk-project worden gemaakt. Deze gegevens zijn openbaar op GitHub Pages.
- `supabase/schema.sql`: tabellen + RLS.

## Kosten

GitHub Pages is voor deze statische website gratis via een openbare repository. Supabase heeft een gratis gebruiksniveau met beperkingen, waaronder projectpauze bij langdurige inactiviteit. AI-API-kosten zijn nul: ChatGPT wordt buiten de app gebruikt om inhoud te genereren.

## Vormgeving — StudyForge NEXT
Tienervriendelijke dark-academia-stijl: donker petrol, warme oranje accenten en een vrolijke uil met een koptelefoon. Het bestand `owl-study.webp` hoort bij deze editie en moet ook naar GitHub Pages worden geüpload. Geen extra AI-koppeling.

## Lesmateriaal rechtstreeks vanuit ChatGPT publiceren

De `content/library.json`-lijst begint leeg. Voeg in dit Huiswerk-project lesmateriaal toe en vraag om een StudyForge-toets of flashcards. ChatGPT kan met toestemming de repository bijwerken en een nieuw pakket toevoegen. StudieForge laadt bij het openen nieuwe sets uit `content/library.json`. Een unieke pakket-ID is verplicht. Bewerk bestaande pakket-ID's niet om voortgang en beoordelingen consistent te houden; publiceer een nieuwe revisie als nieuw pakket.

**Privacy:** GitHub-repository `fathom-web/studyforge` is openbaar. Zet hier alleen nieuw geformuleerde oefenvragen en flashcards in die geschikt zijn voor openbare publicatie. Plaats geen ruwe schooldocumenten, leerlinggegevens, cijfers of privéscans in deze map. Antwoorden en resultaten blijven voorlopig lokaal op het apparaat. Zodra Supabase met beveiligde accounts wordt gebruikt, is ook een privésynchronisatie voor de gepubliceerde sets nodig.

De vier oude voorbeeldsets worden bij het openen van de app automatisch verwijderd uit bestaande browsergegevens. Andere geïmporteerde sets en resultaten blijven intact. Verwijderde gepubliceerde sets blijven op dit apparaat verborgen.
