import { restoreTheme } from './theme.js';
import { needsInitialView } from './view-state.js';

restoreTheme();
if (needsInitialView(new URL(location.href))) {
	document.documentElement.dataset.initialView = 'pending';
}
