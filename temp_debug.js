// Check what's actually being rendered
console.log('Participant join container:', cd /Users/carlosmonteagudo/generative-dialogue-dev && grep -n participant-join client/src/App.jsdocument.querySelector('.participant-join'));
console.log('All participant elements:', Array.from(document.querySelectorAll('[class*="participant"]')).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent?.substring(0, 50) })));
