import { useSelector } from 'react-redux';
import { currentPane as currentPaneSelector } from '../reducers/appReducer';

const SCOPE = 0;
const DATA_LOGGER = 1;

export const isScopePane = (currentPane = null) =>
    getCurrentPane(SCOPE, currentPane);

export const isDataLoggerPane = (currentPane = null) =>
    getCurrentPane(DATA_LOGGER, currentPane);

const getCurrentPane = (pane, currentPane = null) => {
    if (currentPane !== null) {
        return currentPane === pane;
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSelector(currentPaneSelector) === pane;
};
