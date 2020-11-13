import React, { useState, useEffect } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import SelectableContext from 'react-bootstrap/SelectableContext';
import { NumberInlineInput } from 'pc-nrfconnect-shared';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { updateTriggerLevel } from '../../../actions/deviceActions';

const TriggerLevel = ({ triggerLevel, externalTrigger }) => {
    const dispatch = useDispatch();
    const [level, setLevel] = useState(triggerLevel);
    // use true for mA, false for uA
    const [levelUnit, setLevelUnit] = useState(false);

    useEffect(() => {
        setLevelUnit(triggerLevel > 1000);
        setLevel(
            triggerLevel > 1000
                ? Number((triggerLevel / 1000).toFixed(3))
                : triggerLevel
        );
    }, [triggerLevel]);

    const sendTriggerLevel = unit => {
        dispatch(updateTriggerLevel(level * 1000 ** unit));
        setLevelUnit(unit);
    };

    return (
        <div
            title="Rising edge level to run trigger"
            className={externalTrigger ? 'disabled' : ''}
        >
            <Form.Label
                htmlFor="slider-trigger-level"
                className="d-flex flex-row align-items-baseline"
            >
                <span className="flex-fill">Level</span>
                <NumberInlineInput
                    value={level}
                    range={{
                        min: 0,
                        max: levelUnit ? 1000 : 1000000,
                        decimals: levelUnit ? 3 : 0,
                    }}
                    onChange={value => setLevel(value)}
                    onChangeComplete={() => sendTriggerLevel(levelUnit)}
                    chars={8}
                />
                {/* The context in the next line is a hack to work around
                        a bug in react-bootstrap described in
                        https://github.com/react-bootstrap/react-bootstrap/issues/4176#issuecomment-549999503
                        When we are certain that this app is only run with by
                        a launcher that provides a version of
                        react-bootstrap >= 1.4 this hack can be removed.
                        The bug that this hack fixes is that selecting a value in the
                        dropdown also closes the collapsible trigger group around it.
                        */}
                <SelectableContext.Provider value={false}>
                    <Dropdown className="inline-dropdown">
                        <Dropdown.Toggle
                            id="dropdown-current-unit"
                            variant="plain"
                        >
                            {levelUnit ? 'mA' : '\u00B5A'}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item
                                eventKey="1"
                                onSelect={() => sendTriggerLevel(false)}
                            >
                                {'\u00B5A'}
                            </Dropdown.Item>
                            <Dropdown.Item
                                eventKey="2"
                                onSelect={() => sendTriggerLevel(true)}
                            >
                                mA
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </SelectableContext.Provider>
            </Form.Label>
        </div>
    );
};

export default TriggerLevel;

TriggerLevel.propTypes = {
    triggerLevel: PropTypes.number.isRequired,
    externalTrigger: PropTypes.bool.isRequired,
};
