import { error } from '@sveltejs/kit';
import { elements, getElement } from '#lib/data/elements.js';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
	elements.map((element) => ({ id: String(element.number) }));

export const load: PageLoad = ({ params }) => {
	if (!/^[1-9]\d{0,2}$/.test(params.id)) error(404, 'Element not found');
	const element = getElement(Number(params.id));
	if (!element) error(404, 'Element not found');
	return { element };
};
