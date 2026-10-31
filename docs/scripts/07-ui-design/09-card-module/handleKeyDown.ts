const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      focusNextCard(index);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      focusPreviousCard(index);
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      activateCard(index);
      break;
  }
};
