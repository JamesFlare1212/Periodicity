import { restoreTheme } from './theme.js';
import { needsInitialView } from './view-state.js';
import { beginInitialView } from './initial-view.js';

restoreTheme();
if (needsInitialView(new URL(location.href))) {
	beginInitialView();
}
