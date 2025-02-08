/*
Notion-desktop-client

A simple Notion desktop client built with Electron.
=============================================
This project is licensed under the MIT License.
=============================================
This project is created by Tanmoy Ganguly.
=============================================
This project is created for educational purposes only.

copyright @ Tanmoy Ganguly
*/

import fs from 'fs';
import { app, BrowserWindow, shell, screen } from 'electron';
import path from 'path';
import { config } from './config/index.js';
import { fileURLToPath } from 'url';  // <-- Import `fileURLToPath` from 'url'

// Define path for storing window state
const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');


/**
 * Loads saved window state and ensures it is within available screen bounds.
 */
function loadWindowState() {
    try {
        // Check if the state file exists before reading
        if (!fs.existsSync(stateFilePath)) {
            console.log("Window state file not found, using default settings.");
            return getCenteredWindowState(800, 600);
        }

        const rawData = fs.readFileSync(stateFilePath, 'utf-8');
        const state = JSON.parse(rawData);

        // Validate the parsed state
        if (!state.width || !state.height || isNaN(state.x) || isNaN(state.y)) {
            throw new Error("Invalid window state data");
        }

        // Get all available displays
        const displays = screen.getAllDisplays();
        const display = displays.find(d => d.id === state.displayId);

        if (!display) {
            console.log("Previous display not found, using primary display.");
            return getCenteredWindowState(state.width, state.height);
        }

        // Ensure the window is within the display bounds
        if (
            state.x < display.bounds.x || state.y < display.bounds.y ||
            state.x + state.width > display.bounds.x + display.bounds.width ||
            state.y + state.height > display.bounds.y + display.bounds.height
        ) {
            console.log("Window was out of bounds, repositioning...");
            return getCenteredWindowState(state.width, state.height, display.bounds);
        }

        return state;
    } catch (error) {
        console.error("Error loading window state:", error);
        return getCenteredWindowState(800, 600); // Fallback to default state
    }
}


/**
 * Saves window state including display information before closing.
 */
function saveWindowState(win) {
    // Check if the window is minimized or fullscreen
    if (!win.isMinimized() && !win.isFullScreen()) {
        console.log("Saving window state...");

        try {
            const bounds = win.getBounds();
            const display = screen.getDisplayMatching(bounds); // Get the display where the window is currently located

            // Save the state with window bounds and displayId
            fs.writeFileSync(stateFilePath, JSON.stringify({
                ...bounds,
                displayId: display.id  // Store the display ID instead of bounds
            }));

            console.log(`Window state saved: ${JSON.stringify(bounds)}`);
        } catch (error) {
            console.error("Error saving window state:", error);
        }
    }
}


/**
 * Calculates a centered window state based on the given screen bounds.
 */
function getCenteredWindowState(width, height, bounds = screen.getPrimaryDisplay().bounds) {
    return {
        width,
        height,
        x: Math.max(bounds.x, Math.floor(bounds.x + (bounds.width - width) / 2)),
        y: Math.max(bounds.y, Math.floor(bounds.y + (bounds.height - height) / 2)),
        displayId: screen.getPrimaryDisplay().id // Save the primary display ID by default
    };
}


// Dynamically import the context menu module
import('electron-context-menu').then((contextMenu) => {
    contextMenu.default({
        showSaveImageAs: true
    });
});

const appUrl = 'https://www.notion.so/login';

/**
 * @type {BrowserWindow}
 */
let window = null;

/**
 * @param {Electron.HandlerDetails} details 
 * @returns {action: 'deny'}
 */
function onNewWindow(details) {
    shell.openExternal(details.url);
    return { action: 'deny' };
}

// Calculate __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));  // <-- Updated: Calculate `__dirname` directly

const createWindow = () => {
    const windowState = loadWindowState();

    window = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        icon: path.join(__dirname, 'assets/icon.png'),
        autoHideMenuBar: true
    });

    window.loadURL(appUrl, { userAgent: config.userAgent });

    window.webContents.setWindowOpenHandler(onNewWindow);

    window.on('close', () => saveWindowState(window)); // Save state on close
};

const appLock = app.requestSingleInstanceLock();

const protocolClient = 'Notion';
if (!app.isDefaultProtocolClient(protocolClient, process.execPath)) {
    app.setAsDefaultProtocolClient(protocolClient, process.execPath);
}

if (!appLock) {
    app.quit();
} else {
    app.on('second-instance', onAppSecondInstance);
    app.on('ready', onAppReady);
}

async function onAppReady() {
    createWindow();
}

function processArgs(args) {
    const regHttps = /^https:\/\/www\.notion\.so\/.*/g;
    const regNotion = /^notion:\/\//g;
    for (const arg of args) {
        if (regHttps.test(arg)) {
            return arg;
        }
        if (regWapp.test(arg)) {
            return appUrl + arg.substring(10);  // Corrected substring usage
        }
    }
}

function onAppSecondInstance(event, args) {
    console.debug('second-instance started');
    if (window) {
        event.preventDefault();
        const url = processArgs(args);
        if (url) {
            window.loadURL(url, { userAgent: config.chromeUserAgent });
        }

        window.focus();
    }
}