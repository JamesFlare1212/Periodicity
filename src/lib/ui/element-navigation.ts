import type { Element } from '#lib/data/elements.js';

export function getElementNeighbor(
	items: readonly Element[],
	current: Element,
	key: string,
	{
		layout,
		columns = 1,
		horizontal = 'spatial',
		wholeTable = false
	}: {
		layout: 'grid' | 'table';
		columns?: number;
		horizontal?: 'atomic' | 'spatial';
		wholeTable?: boolean;
	}
): Element | undefined {
	const index = items.findIndex((element) => element.number === current.number);
	if (
		index < 0 ||
		!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)
	)
		return undefined;
	if (key === 'Home' && wholeTable) return items[0];
	if (key === 'End' && wholeTable) return items.at(-1);
	if (layout === 'grid') {
		const size = Math.max(1, Math.floor(columns));
		const rowStart = Math.floor(index / size) * size;
		const rowEnd = Math.min(rowStart + size - 1, items.length - 1);
		if (key === 'Home') return items[rowStart];
		if (key === 'End') return items[rowEnd];
		if (key === 'ArrowLeft') return items[Math.max(rowStart, index - 1)];
		if (key === 'ArrowRight') return items[Math.min(rowEnd, index + 1)];
		if (key === 'ArrowUp') return items[index >= size ? index - size : index];
		return items[index + size < items.length ? index + size : index];
	}
	if (horizontal === 'atomic' && (key === 'ArrowLeft' || key === 'ArrowRight'))
		return items[Math.max(0, Math.min(items.length - 1, index + (key === 'ArrowRight' ? 1 : -1)))];
	if (key === 'Home') return items.find((element) => element.ypos === current.ypos);
	if (key === 'End') return items.findLast((element) => element.ypos === current.ypos);
	const vertical = key === 'ArrowUp' || key === 'ArrowDown';
	const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
	const coordinate = vertical ? 'ypos' : 'xpos';
	const sameAxis = vertical ? 'xpos' : 'ypos';
	return (
		items
			.filter(
				(element) =>
					element[sameAxis] === current[sameAxis] &&
					(element[coordinate] - current[coordinate]) * direction > 0
			)
			.sort((a, b) => (a[coordinate] - b[coordinate]) * direction)[0] ?? current
	);
}
