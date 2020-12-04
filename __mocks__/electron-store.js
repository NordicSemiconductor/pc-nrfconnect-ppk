export default jest.fn(() => ({
    get: (_, defaultValue) => defaultValue,
    // set: () => undefined,
    getAppDataDir: () => {
        '/test';
    },
}));
