import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { defineConfig } from 'vite';
import { appTemplatePlugin, generateAppTemplate } from './scripts/app-template.js';

const appTemplate = await generateAppTemplate();

export default defineConfig({
	plugins: [
		appTemplatePlugin(),
		sveltekit({ adapter: adapter({ fallback: '404.html' }), files: { appTemplate } })
	],
	server: { host: '0.0.0.0', allowedHosts: true }
});
