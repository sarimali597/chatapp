import { useCallback, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { TYPING_IDLE_MS } from '../utils/constants';

export function useTyping(scope) {
  const { emitTyping } = useChat();
  const isTypingRef = useRef(false);
  const idleTimer = useRef(null);

  const notifyTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(scope, true);
    }

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTyping(scope, false);
    }, TYPING_IDLE_MS);
  }, [emitTyping, scope]);

  const stopTyping = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitTyping(scope, false);
    }
  }, [emitTyping, scope]);

  return { notifyTyping, stopTyping };
}
