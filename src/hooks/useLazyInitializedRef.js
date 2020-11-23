import { useRef } from 'react';

const uninitialisedToken = Symbol('uninitialisedToken');

// eslint-disable-next-line import/prefer-default-export
export const useLazyInitializedRef = initialiser => {
    const ref = useRef(uninitialisedToken);
    if (ref.current === uninitialisedToken) {
        ref.current = initialiser();
    }
    return ref;
};
