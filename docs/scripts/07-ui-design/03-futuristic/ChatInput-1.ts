interface ChatInputProps {
  onSend: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onTyping,
  placeholder = '输入消息...',
}) => {
  const [value, setValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (value.trim()) {
      onSend(value);
      setValue('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTyping?.(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [value, isTyping, onTyping]);

  return (
    <div className="yyc3-chat-input">
      <input
        type="text"
        className="yyc3-chat-input__field"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button
        className="yyc3-chat-input__send"
        onClick={handleSend}
        disabled={!value.trim()}
      >
        <SendIcon />
      </button>
    </div>
  );
};
