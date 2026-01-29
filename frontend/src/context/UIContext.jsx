import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};

export const UIProvider = ({ children }) => {
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);

    const toggleAssistant = () => setIsAssistantOpen(prev => !prev);
    const setAssistantOpen = (value) => setIsAssistantOpen(value);

    return (
        <UIContext.Provider value={{ isAssistantOpen, toggleAssistant, setAssistantOpen }}>
            {children}
        </UIContext.Provider>
    );
};
