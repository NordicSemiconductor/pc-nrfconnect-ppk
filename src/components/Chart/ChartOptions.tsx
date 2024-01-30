/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Dropdown,
    DropdownItem,
    NumberInlineInput,
    telemetry,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    getChartYAxisRange,
    setYMax as storeYMax,
    setYMin as storeYMin,
} from '../../slices/chartSlice';
import EventAction from '../../usageDataActions';

/** The power, p, to satisfy the mathematical expression:
 *  uA = x * 1000^p,
 *  where x is an arbitrary amount of ampere in one of the units.
 */
const UNIT_EXPONENT = {
    MICRO_AMPERE: 0,
    MILLI_AMPERE: 1,
    AMPERE: 2,
};
const UNIT_LABELS = ['nA', '\u00B5A', 'mA', 'A'];

const UNIT_ITEMS: DropdownItem[] = [
    { label: UNIT_LABELS[0], value: '0' },
    { label: UNIT_LABELS[1], value: '1' },
    { label: UNIT_LABELS[2], value: '2' },
    { label: UNIT_LABELS[3], value: '3' },
];

const ChartOptions = () => {
    const {
        yMin: storedYMin,
        yMax: storedYMax,
        yAxisLock,
    } = useSelector(getChartYAxisRange);
    const dispatch = useDispatch();

    const [yMin, setYMin] = useState(0);
    const [yMax, setYMax] = useState(1);

    /** Mapping to the {UNIT_POWER} to satisfy transformation to and from uA */
    const [yMinExponent, setYMinExponent] = useState(
        UNIT_EXPONENT.MICRO_AMPERE
    );
    const [yMaxExponent, setYMaxExponent] = useState(
        UNIT_EXPONENT.MICRO_AMPERE
    );

    /** Get the appropriate exponent to decide what unit to use given the number of nanoAmpere, nA
     * @param {number} nA number av nanoAmpere
     * @returns {UNIT_EXPONENT} exponent to use for transforming to and from nanoAmpere
     */
    const getUnitPower = (nA: number) => {
        const absoluteValue = Math.abs(nA);
        if (absoluteValue >= 1e9) {
            return 3;
        }
        if (absoluteValue > 1e6) {
            return 2;
        }
        if (absoluteValue > 1e3) {
            return 1;
        }
        return 0;
    };

    /**
     * Transform and store the input yMin to uA
     * @param {UNIT_EXPONENT} exponent to use in transformation
     * @returns {void} dispatches new yMin to storage
     */
    const dispatchYMin = (exponent: number) => {
        if (!yAxisLock) return;
        dispatch(storeYMin({ yMin: yMin * 1000 ** exponent }));
        setYMinExponent(exponent);
        telemetry.sendEvent(EventAction.Y_MIN_SET_EXPLICITLY);
    };

    /**
     * Transform and store the input yMax to uA
     * @param {UNIT_EXPONENT} exponent to use in transformation
     * @returns {void} dispatches new yMax to storage
     */
    const dispatchYMax = (exponent: number) => {
        if (!yAxisLock) return;
        dispatch(storeYMax({ yMax: yMax * 1000 ** exponent }));
        setYMaxExponent(exponent);
        telemetry.sendEvent(EventAction.Y_MAX_SET_EXPLICITLY);
    };

    /** Get calculated value depending on unit
     * @param {number} initialNumber from storage in uA
     * @param {UNIT_EXPONENT} power, p, to satisfy: x = uA / 1000^p
     * @param {number} precision maximal number of decimals to display
     * @returns {number} initialNumber/1000**power with precision number of decimals
     */
    const getPrettyValue = (
        initialNumber: number,
        power: number,
        precision = 4
    ) => {
        const rawResult = Number(initialNumber / 1000 ** power);
        const precisionResult = rawResult.toPrecision(precision);

        if (precisionResult.toString().length < rawResult.toString().length) {
            return precisionResult;
        }
        return rawResult;
    };

    useEffect(() => {
        if (storedYMin == null) return;
        const unitPower = getUnitPower(storedYMin);
        setYMinExponent(unitPower);
        const newYMin = Number(getPrettyValue(storedYMin, unitPower));
        if (Number.isNaN(newYMin) || newYMin < 0) return;

        setYMin(newYMin);
    }, [storedYMin]);

    useEffect(() => {
        if (storedYMax == null) return;
        const unitPower = getUnitPower(storedYMax);
        setYMaxExponent(unitPower);

        const newYMax = Number(getPrettyValue(storedYMax, unitPower));
        if (Number.isNaN(newYMax) || newYMax < 0) return;

        setYMax(newYMax);
    }, [storedYMax]);

    return (
        <>
            <div
                className="tw-flex tw-w-1/2 tw-flex-row tw-items-center tw-justify-between tw-py-2"
                style={{
                    // Added in order to make consistent with the font from Toggle,
                    // should be removed and replaced by either 14px or 16px (base).
                    fontSize: '12.8px',
                }}
            >
                From:
                <NumberInlineInput
                    value={yMin}
                    range={{
                        min: -Infinity,
                        max:
                            (storedYMax ?? Number.MAX_VALUE) /
                            1000 ** yMinExponent,
                        decimals: 15,
                    }}
                    onChange={setYMin}
                    onChangeComplete={() => dispatchYMin(yMinExponent)}
                    disabled={!yAxisLock}
                />
                <Dropdown
                    className="tw-max-h-6 tw-w-14 tw-max-w-[56px]"
                    items={UNIT_ITEMS}
                    onSelect={(item: DropdownItem) => {
                        const newExponent = Number(item.value);
                        dispatchYMin(newExponent);
                        setYMinExponent(newExponent);
                    }}
                    selectedItem={
                        UNIT_ITEMS.find(
                            item => item.value === `${yMinExponent}`
                        ) ?? UNIT_ITEMS[0]
                    }
                />
            </div>
            <div
                className="tw-flex tw-w-1/2 tw-flex-row tw-justify-between tw-py-2"
                style={{
                    // Added in order to make consistent with the font from Toggle,
                    // should be removed and replaced by either 14px or 16px (base).
                    fontSize: '12.8px',
                }}
            >
                To:
                <NumberInlineInput
                    value={yMax}
                    range={{
                        min:
                            (storedYMin ?? Number.MIN_VALUE) /
                            1000 ** yMaxExponent,
                        max: Infinity,
                        decimals: 15,
                    }}
                    onChange={setYMax}
                    onChangeComplete={() => dispatchYMax(yMaxExponent)}
                    disabled={!yAxisLock}
                />
                <Dropdown
                    className="tw-w-14 tw-max-w-[56px]"
                    items={UNIT_ITEMS}
                    onSelect={(item: DropdownItem) => {
                        const newExponent = Number(item.value);
                        dispatchYMax(newExponent);
                        setYMaxExponent(newExponent);
                    }}
                    selectedItem={
                        UNIT_ITEMS.find(
                            item => item.value === `${yMaxExponent}`
                        ) ?? UNIT_ITEMS[0]
                    }
                />
            </div>
        </>
    );
};

export default ChartOptions;
