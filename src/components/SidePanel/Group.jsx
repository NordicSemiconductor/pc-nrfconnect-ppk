/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import React, { useContext, useRef } from 'react';
import { bool, func, node, shape, string } from 'prop-types';

import Accordion from 'react-bootstrap/Accordion';
import AccordionContext from 'react-bootstrap/AccordionContext';
import { useAccordionToggle } from 'react-bootstrap/AccordionToggle';

// Hack: PseudoButton is not part of the official API but we use it here until we move the Group component to pc-nrfconnect-shared
import PseudoButton from 'pc-nrfconnect-shared/src/PseudoButton/PseudoButton';

import './group.scss';

const Heading = ({ label, title }) =>
    label == null ? null : (
        <h2 className="heading" title={title}>
            {label}
        </h2>
    );
Heading.propTypes = {
    label: string,
    title: string,
};

const ContextAwareToggle = ({
    heading,
    title,
    eventKey,
    onToggled = () => {},
}) => {
    const currentEventKey = useContext(AccordionContext);
    const decoratedOnClick = useAccordionToggle(eventKey);
    const isCurrentEventKey = currentEventKey === eventKey;

    return (
        <PseudoButton
            onClick={() => {
                decoratedOnClick();
                const isNowExpanded = !isCurrentEventKey;
                onToggled(isNowExpanded);
            }}
            className={`group-toggle ${isCurrentEventKey ? 'show' : ''}`}
        >
            <Heading label={heading} title={title} />
        </PseudoButton>
    );
};
ContextAwareToggle.propTypes = {
    heading: string.isRequired,
    title: string,
    eventKey: string.isRequired,
    onToggled: func,
};

const CollapsibleGroup = ({
    heading,
    title,
    children = null,
    defaultCollapsed = true,
    onToggled,
}) => {
    const eventKey = useRef(Math.random().toString());

    return (
        <Accordion defaultActiveKey={defaultCollapsed ? '' : eventKey.current}>
            <div className="collapse-container">
                <ContextAwareToggle
                    heading={heading}
                    title={title}
                    eventKey={eventKey.current}
                    onToggled={onToggled}
                />
                <Accordion.Collapse eventKey={eventKey.current}>
                    <>{children}</>
                </Accordion.Collapse>
            </div>
        </Accordion>
    );
};

CollapsibleGroup.propTypes = {
    heading: string.isRequired,
    title: string,
    children: node,
    defaultCollapsed: bool,
    onToggled: func,
};

const Group = ({
    className = '',
    heading,
    title,
    collapse = { collapsible: false },
    children,
}) =>
    collapse.collapsible ? (
        <div className={`sidepanel-group ${className}`}>
            <CollapsibleGroup
                heading={heading}
                title={title}
                defaultCollapsed={collapse.defaultCollapsed}
                onToggled={collapse.onToggled}
            >
                <div className="body">{children}</div>
            </CollapsibleGroup>
        </div>
    ) : (
        <div className={`sidepanel-group ${className}`}>
            <Heading label={heading} title={title} />
            <div className="body">{children}</div>
        </div>
    );
Group.propTypes = {
    className: string,
    heading: string,
    title: string,
    children: node,
    collapse: shape({
        collapsible: bool,
        defaultCollapsed: bool,
        onToggled: func,
    }),
};

export default Group;
