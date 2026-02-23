
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';

type BackHandler = () => boolean; // return true if handled, false to propagate

interface BackHandlerContextType {
    registerHandler: (handler: BackHandler) => void;
    unregisterHandler: (handler: BackHandler) => void;
}

const BackHandlerContext = createContext<BackHandlerContextType | null>(null);

export const useBackHandler = (handler: BackHandler, active: boolean) => {
    const context = useContext(BackHandlerContext);
    useEffect(() => {
        if (active && context) {
            context.registerHandler(handler);
            return () => context.unregisterHandler(handler);
        }
    }, [active, handler, context]);
};

export const BackHandlerProvider: React.FC<{ children: React.ReactNode, onDefaultBack: () => void }> = ({ children, onDefaultBack }) => {
    const handlers = useRef<BackHandler[]>([]);

    const registerHandler = (handler: BackHandler) => {
        handlers.current.push(handler);
    };

    const unregisterHandler = (handler: BackHandler) => {
        handlers.current = handlers.current.filter(h => h !== handler);
    };

    useEffect(() => {
        const listener = CapApp.addListener('backButton', () => {
            const currentHandlers = handlers.current;
            if (currentHandlers.length > 0) {
                // Execute last registered handler (top of stack)
                const handled = currentHandlers[currentHandlers.length - 1]();
                if (handled) return;
            }
            onDefaultBack();
        });

        return () => {
            listener.then(l => l.remove());
        };
    }, [onDefaultBack]);

    return (
        <BackHandlerContext.Provider value={{ registerHandler, unregisterHandler }}>
            {children}
        </BackHandlerContext.Provider>
    );
};
