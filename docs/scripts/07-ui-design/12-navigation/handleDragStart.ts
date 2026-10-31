const handleDragStart = (e: DragEvent, tabId: string) => {
  e.dataTransfer.setData('tabId', tabId);
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const handleDrop = (e: DragEvent, targetTabId: string) => {
  e.preventDefault();
  const draggedTabId = e.dataTransfer.getData('tabId');
  const newTabs = [...tabs];
  const draggedIndex = newTabs.findIndex(t => t.id === draggedTabId);
  const targetIndex = newTabs.findIndex(t => t.id === targetTabId);
  
  newTabs.splice(draggedIndex, 1);
  newTabs.splice(targetIndex, 0, newTabs[draggedIndex]);
  
  setTabs(newTabs);
};
