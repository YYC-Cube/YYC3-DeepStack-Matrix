// ✅ 通过 Props 控制组件行为
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,  // 默认值
  closeOnOverlayClick = true,  // 默认值
  closeOnEscape = true  // 默认值
}) => {
  // 根据 Props 控制组件行为
  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };

  const handleEscape = (e) => {
    if (closeOnEscape && e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className={`modal ${isOpen ? 'open' : 'closed'}`}>
      {showCloseButton && <button onClick={onClose}>✕</button>}
      <h2>{title}</h2>
      {children}
    </div>
  );
};
