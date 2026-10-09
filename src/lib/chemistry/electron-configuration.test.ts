import { describe, expect, test } from 'bun:test';
import { elements, getElement } from '#lib/data/elements.js';
import {
	configurationText,
	expandElectronConfiguration,
	getElectronConfiguration,
	normalizeConfigurationView
} from './electron-configuration';

describe('full electron configurations', () => {
	test('expands and validates every recorded element without changing the data', () => {
		const mismatches: string[] = [];
		for (const element of elements) {
			const result = getElectronConfiguration(element);
			expect(result.status).toBe('available');
			if (result.status !== 'available') throw new Error(`${element.symbol}: ${result.reason}`);
			expect(result.totalElectrons).toBe(element.number);
			expect(result.short).toBe(element.electronConfiguration);
			expect(result.full).not.toContain('[');
			if (!result.shellsMatch) mismatches.push(element.symbol);
		}
		expect(mismatches).toEqual(['Ds', 'Rg']);
	});

	test('keeps simple configurations and recorded transition-metal occupancies', () => {
		for (const [symbol, full] of [
			['H', '1s1'],
			['He', '1s2'],
			['Fe', '1s2 2s2 2p6 3s2 3p6 3d6 4s2'],
			['Cr', '1s2 2s2 2p6 3s2 3p6 3d5 4s1'],
			['Cu', '1s2 2s2 2p6 3s2 3p6 3d10 4s1']
		]) {
			expect(getElectronConfiguration(getElement(symbol)!)).toMatchObject({
				status: 'available',
				full
			});
		}
	});

	test('expands nested cores and groups shells from the same occupancy records', () => {
		const iron = getElectronConfiguration(getElement('Fe')!);
		if (iron.status !== 'available') throw new Error(iron.reason);
		expect(iron.coreSymbol).toBe('Ar');
		expect(iron.coreElectrons).toBe(18);
		expect(iron.shells.map((shell) => shell.electrons)).toEqual([2, 8, 14, 2]);
		expect(iron.orbitals.filter((orbital) => !orbital.core)).toEqual([
			{ n: 3, subshell: 'd', electrons: 6, core: false },
			{ n: 4, subshell: 's', electrons: 2, core: false }
		]);
		const oganesson = getElectronConfiguration(getElement('Og')!);
		if (oganesson.status !== 'available') throw new Error(oganesson.reason);
		expect(oganesson.orbitals).toHaveLength(19);
		expect(oganesson.coreElectrons).toBe(86);
		expect(oganesson.shells.map((shell) => shell.electrons)).toEqual([2, 8, 18, 32, 32, 18, 8]);
	});

	test('rejects unsupported and invalid notation instead of parsing only valid fragments', () => {
		for (const configuration of [
			'',
			'[Xx] 2s2',
			'1s2 junk',
			'1s3',
			'2p7',
			'1s0',
			'1s2 1s1',
			'1p1',
			'2d1',
			'8s1',
			'1s02',
			'[He] 1s1'
		]) {
			expect(() => expandElectronConfiguration(configuration)).toThrow();
		}
		expect(() => expandElectronConfiguration('[He] 2s2', () => undefined)).toThrow();
		expect(() => expandElectronConfiguration('[He] 2s2', () => '[He]')).toThrow();
		expect(() => expandElectronConfiguration('[He] 2s2', () => '1s1')).toThrow();
	});

	test('retains shorthand when full expansion is unavailable', () => {
		const invalid = getElectronConfiguration({
			number: 2,
			electronConfiguration: '1s1',
			shells: [2]
		});
		expect(invalid).toMatchObject({ status: 'unavailable', short: '1s1' });
		expect(configurationText(invalid, 'full')).toBe('1s1');
	});

	test('copies plain notation for each view and accepts only supported URL views', () => {
		const result = getElectronConfiguration(getElement('Fe')!);
		expect(configurationText(result, 'short')).toBe('[Ar] 3d6 4s2');
		expect(configurationText(result, 'full')).toBe('1s2 2s2 2p6 3s2 3p6 3d6 4s2');
		expect(configurationText(result, 'shell')).toBe(
			'n=1: 1s2 (2 electrons)\nn=2: 2s2 2p6 (8 electrons)\nn=3: 3s2 3p6 3d6 (14 electrons)\nn=4: 4s2 (2 electrons)'
		);
		for (const view of ['short', 'shell', 'full'] as const)
			expect(normalizeConfigurationView(view)).toBe(view);
		expect(normalizeConfigurationView(null)).toBe('full');
		expect(normalizeConfigurationView('invalid')).toBe('full');
	});
});
