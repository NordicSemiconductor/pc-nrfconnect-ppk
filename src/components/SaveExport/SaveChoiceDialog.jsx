/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
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

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';

import { appState, toggleSaveChoiceDialog, showExportDialog } from '../../reducers/appReducer';
import { save } from '../../actions/fileActions';

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
                                <h2>SAVE SESSION DATA</h2>
                                <p>
                                    Great if you want to view the data again in this application.
                                    Not usable by other software.
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
                                <h2>EXPORT SELECTED RANGE</h2>
                                <p>
                                    Great if you want to manipulate your data in other software.
                                    Can not be opened by this application.
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
                <Button variant="secondary" onClick={close}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
};
