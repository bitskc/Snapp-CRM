import { useEffect, useRef } from 'react';

/**
 * Hook to detect clicks outside a ref element
 * @param ref - React ref to the element
 * @param handler - Function to call when click outside is detected
 */
export function useClickOutside<T extends HTMLElement>(
    ref: React.RefObject<T>,
    handler: () => void
) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            // Do nothing if clicking ref's element or descendent elements
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler();
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}
