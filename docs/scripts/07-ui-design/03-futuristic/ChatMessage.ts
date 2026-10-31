interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    attachments?: Attachment[];
  };
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  return (
    <div className={`yyc3-chat-message yyc3-chat-message--${message.role}`}>
      <div className="yyc3-chat-message__avatar">
        {message.role === 'user' ? <UserIcon /> : <BotIcon />}
      </div>
      <div className="yyc3-chat-message__content">
        <div className="yyc3-chat-message__text">{message.content}</div>
        {message.attachments && (
          <div className="yyc3-chat-message__attachments">
            {message.attachments.map((attachment) => (
              <Attachment key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
        <div className="yyc3-chat-message__timestamp">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};
