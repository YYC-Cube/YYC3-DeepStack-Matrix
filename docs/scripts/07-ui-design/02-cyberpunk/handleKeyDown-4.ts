const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Tab':
      e.preventDefault();
      focusNextElement();
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      activateElement();
      break;
    case 'Escape':
      closeDropdown();
      break;
  }
};
