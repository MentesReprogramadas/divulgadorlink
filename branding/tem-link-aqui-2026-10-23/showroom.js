(() => {
  const choices = window.BRAND_DIRECTIONS;
  const buttons = Array.from(document.querySelectorAll('[data-direction]'));
  function selectDirection(id) {
    const choice = choices.find(item => item.id === id);
    if (!choice) return;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.direction === id));
    document.getElementById('selected-name').textContent = choice.name;
    document.getElementById('selected-idea').textContent = choice.idea;
    document.getElementById('selected-tone').textContent = choice.tone;
    for (const image of document.querySelectorAll('[data-brand-src]')) {
      image.src = `${id}/${image.dataset.brandSrc}`;
      if (!image.closest('.tiny')) image.alt = `${choice.name} — ${image.dataset.brandSrc.startsWith('mockup') ? 'aplicações físicas da marca' : image.dataset.brandSrc.startsWith('social') ? 'peça social' : image.dataset.brandSrc.startsWith('logo') ? 'assinatura vetorial exata' : 'aplicação da identidade'}`;
    }
    for (const link of document.querySelectorAll('[data-brand-href]')) link.href = `${id}/${link.dataset.brandHref}`;
    const download = document.getElementById('direction-download');
    download.href = `${id}/${id}-kit.zip`;
    download.textContent = `Baixar kit ${choice.name}`;
    document.getElementById('selection-status').textContent = `Direção ${choice.name} selecionada. Aplicações e arquivos atualizados.`;
  }
  for (const button of buttons) button.addEventListener('click', () => selectDirection(button.dataset.direction));
  selectDirection(buttons.find(button => button.getAttribute('aria-pressed') === 'true').dataset.direction);
  for (const link of document.querySelectorAll('[data-pick]')) link.addEventListener('click', () => {
    selectDirection(link.dataset.pick);
    buttons.find(button => button.dataset.direction === link.dataset.pick)?.focus({preventScroll:true});
  });
  const dialog = document.getElementById('concept-dialog');
  for (const button of document.querySelectorAll('[data-concept]')) button.addEventListener('click', () => {
    const title = button.dataset.concept;
    document.getElementById('concept-dialog-title').textContent = title;
    const artwork = dialog.querySelector('.concept-art');
    artwork.dataset.quadrant = button.dataset.quadrant;
    artwork.dataset.vector = String(Boolean(button.dataset.vector));
    const image = artwork.querySelector('img');
    image.src = button.dataset.vector || button.dataset.sheet;
    image.alt = `Logo ${title} ampliado`;
    const download = document.getElementById('concept-download');
    download.href = button.dataset.vectorDownload || button.dataset.sheet;
    download.textContent = button.dataset.vector ? 'Baixar logo em SVG' : `Baixar prancha ${button.dataset.range}`;
    dialog.querySelector('.caption').textContent = button.dataset.vector ? 'Vetor com contornos editáveis, fundo transparente e cores planas da marca.' : 'Conceito em imagem. Ainda sem vetorização final.';
    dialog.showModal();
    document.documentElement.classList.add('concept-open');
  });
  document.getElementById('close-concept').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => document.documentElement.classList.remove('concept-open'));
})();
