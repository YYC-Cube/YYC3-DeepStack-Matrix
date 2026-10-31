const handleKeyDown = (e: KeyboardEvent, items: NavigationUnit[], currentIndex: number) => {
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      focusItem(items[nextIndex].id);
      break;
      
    case 'ArrowLeft':
    case 'ArrowUp':
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      focusItem(items[prevIndex].id);
      break;
      
    case 'Enter':
    case ' ':
      e.preventDefault();
      activateItem(items[currentIndex].id);
      break;
      
    case 'Escape':
      closeDropdown();
      break;
  }
};
