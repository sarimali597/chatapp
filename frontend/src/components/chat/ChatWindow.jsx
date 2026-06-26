import { useMemo } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import MessageInput from './MessageInput';
import { useChat } from '../../context/ChatContext';
import { GLOBAL_ROOM } from '../../utils/constants';

export default function ChatWindow() {
  const {
    activeView,
    globalMessages,
    rooms,
    username,
    typingByScope,
    sendGlobalMessage,
    sendGlobalImage,
    sendRoomMessage,
    restriction,
  } = useChat();

  const isGlobal = activeView === GLOBAL_ROOM;
  const room = isGlobal ? null : rooms[activeView];
  const messages = isGlobal ? globalMessages : room?.messages || [];

  const typingUsers = useMemo(
    () => (typingByScope[activeView] || []).filter((u) => u !== username),
    [typingByScope, activeView, username]
  );

  const disabledReason = restriction.restricted
    ? 'You are restricted from chatting right now.'
    : restriction.muted
    ? 'You are muted right now.'
    : null;

  function handleSendText(text) {
    if (isGlobal) sendGlobalMessage(text);
    else sendRoomMessage(activeView, 'text', text);
  }

  function handleSendImage(url) {
    if (isGlobal) sendGlobalImage(url);
    else sendRoomMessage(activeView, 'image', url);
  }

  // The room this user was viewing may have just been closed by the partner.
  if (!isGlobal && !room) {
    return (
      <div className="main-panel">
        <ChatHeader room={null} />
        <div className="chat-empty">
          <h3>This conversation has ended</h3>
          <p>Pick another conversation from the sidebar, or start a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-panel">
      <ChatHeader room={room} />
      <MessageList
        messages={messages}
        currentUsername={username}
        showReceipt={!isGlobal}
        emptyHint={isGlobal ? 'Say hello to everyone online.' : `Start the conversation with ${room.partner}.`}
      />
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput
        scope={activeView}
        onSendText={handleSendText}
        onSendImage={handleSendImage}
        disabled={!!disabledReason}
        disabledReason={disabledReason}
      />
    </div>
  );
}
