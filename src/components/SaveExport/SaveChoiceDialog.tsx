/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import { useDispatch, useSelector } from 'react-redux';

import { save } from '../../actions/fileActions';
import {
    appState,
    showExportDialog,
    toggleSaveChoiceDialog,
} from '../../slices/appSlice';

import './saveexport.scss';

export default () => {
    const dispatch = useDispatch();
    const { isSaveChoiceDialogVisible } = useSelector(appState);

    const close = () => dispatch(toggleSaveChoiceDialog());

    return (
        <Modal
            show={isSaveChoiceDialogVisible}
            className="choice-dialog"
            onHide={close}
        >
            <Modal.Header closeButton>
                <Modal.Title>What would you like to save?</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Row>
                    <Col>
                        <Card className="h-100">
                            <Card.Body className="pb-0">
                                <h2>Save session data</h2>
                                <p>
                                    Great if you want to view the data again in
                                    this application. Not usable by other
                                    software.
                                </p>
                                <p>.PPK</p>
                            </Card.Body>
                            <Card.Footer className="p-0">
                                <Button
                                    variant="plain"
                                    className="w-100"
                                    onClick={() => {
                                        close();
                                        dispatch(save());
                                    }}
                                >
                                    SAVE
                                </Button>
                            </Card.Footer>
                        </Card>
                    </Col>
                    <Col>
                        <Card className="h-100">
                            <Card.Body className="pb-0">
                                <h2>Export selected range</h2>
                                <p>
                                    Great if you want to manipulate your data in
                                    other software. Can not be opened by this
                                    application.
                                </p>
                                <p>.CSV</p>
                            </Card.Body>
                            <Card.Footer className="p-0">
                                <Button
                                    variant="plain"
                                    className="w-100"
                                    onClick={() => {
                                        close();
                                        dispatch(showExportDialog());
                                    }}
                                >
                                    EXPORT
                                </Button>
                            </Card.Footer>
                        </Card>
                    </Col>
                </Row>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={close}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};
