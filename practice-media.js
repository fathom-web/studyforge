/* StudyForge: hulpmiddelen voor luister- en leestekstvragen. */
(() => {
  'use strict';
  const app = document.getElementById('app');
  if (!app) return;
  const questions = new Map();
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; enhanceQuestion(); });
  };
  function enhanceQuestion() {
    const card = app.querySelector('.question-card');
    const heading = card?.querySelector('h2');
    if (!heading) return;
    const item = questions.get(heading.textContent.trim());
    if (!item) return;

    if (item.audioText && !card.querySelector('.sf-audio-panel')) {
      const panel = document.createElement('div');
      panel.className = 'sf-audio-panel';
      const note = document.createElement('p');
      note.textContent = 'Luister naar de Franse computerstem. Dit is oefenaudio, niet het originele fragment van school.';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-secondary';
      button.textContent = '▶ Beluister / herhaal';
      button.addEventListener('click', () => {
        if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
          button.textContent = 'Audio niet beschikbaar in deze browser';
          return;
        }
        const synth = window.speechSynthesis;
        synth.cancel();
        const speech = new SpeechSynthesisUtterance(item.audioText);
        speech.lang = 'fr-FR';
        speech.rate = 0.85;
        const voice = synth.getVoices().find(v => String(v.lang).toLowerCase().startsWith('fr'));
        if (voice) speech.voice = voice;
        synth.speak(speech);
      });
      panel.append(note,button);
      heading.insertAdjacentElement('afterend',panel);
    }

    if (item.passage && !card.querySelector('.sf-reading-passage')) {
      const panel = document.createElement('div');
      panel.className = 'sf-reading-passage';
      const label = document.createElement('strong');
      label.textContent = 'LEESTEKST';
      const paragraph = document.createElement('p');
      paragraph.textContent = item.passage;
      panel.append(label,paragraph);
      heading.insertAdjacentElement('afterend',panel);
    }
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-action="quiz-next"],[data-action="quiz-prev"],[data-action="quit-quiz"]')) {
      window.speechSynthesis?.cancel();
    }
  }, true);
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  fetch('./content/library.json',{cache:'no-store'})
    .then(r => {if(!r.ok) throw new Error('Frans pakket niet bereikbaar');return r.json();})
    .then(library => {
      for (const pack of library.packs || []) {
        if (pack.profile !== 'Nikki') continue;
        for (const col of pack.collections || []) {
          for (const item of col.questions || []) {
            if (item.audioText || item.passage) questions.set(item.question,item);
          }
        }
      }
      schedule();
    })
    .catch(error => console.warn('StudyForge luisterhulp:',error));
})();