interface ChatInterfaceProps {
  mode: 'standalone' | 'widget';
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  mode,
  messages,
  onSendMessage,
  onTyping,
}) => {
  return (
    <div className={`yyc3-chat-interface yyc3-chat-interface--${mode}`}>
      <div className="yyc3-chat-interface__messages">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>
      <div className="yyc3-chat-interface__input">
        <ChatInput onSend={onSendMessage} onTyping={onTyping} />
      </div>
    </div>
  );
};
