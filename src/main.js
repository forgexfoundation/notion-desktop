import { app, BrowserWindow, shell, screen } from 'electron';
import path from 'path';
import { config } from './config/index.js';
import { fileURLToPath } from 'url';
import electronContextMenu from 'electron-context-menu';
import fs from 'fs';

// Set up the context menu
electronContextMenu({
    showSaveImageAs: true,
});

const appUrl = 'https://www.notion.so/login';
const stateFile = path.join(app.getPath('userData'), 'window-state.json');

let window = null;

// Function to get the last saved window state
function getWindowState() {
    try {
        const data = fs.readFileSync(stateFile, 'utf8');
        const state = JSON.parse(data);
        const displays = screen.getAllDisplays();

        // Ensure the window is within a valid screen
        const isOnValidScreen = displays.some(display => {
            const { x, y, width, height } = display.bounds;
            return (
                state.x >= x &&
                state.y >= y &&
                state.x + state.width <= x + width &&
                state.y + state.height <= y + height
            );
        });

        return isOnValidScreen ? state : { width: 1280, height: 800 };
    } catch (error) {
        return { width: 1280, height: 800 }; // Default size if no state found
    }
}

// Calculate __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to create the main application window
const createWindow = () => {
    const state = getWindowState();
    window = new BrowserWindow({
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height,
        icon: path.join(__dirname, 'assets/icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            nativeWindowOpen: true, // Enables proper popup handling
            webSecurity: true,
        },
    });

    // Load Notion login page
    window.loadURL(appUrl, {
        userAgent: config.userAgent,
    });

    window.webContents.setWindowOpenHandler((details) => {
        return details.url.includes('accounts.google.com')
            ? (shell.openExternal(details.url), { action: 'deny' }) // Open Google sign-in popups in system browser
            : { action: 'allow' }; // Allow other popups
    });

    window.once('ready-to-show', () => {
        window.show();
    });

    // Save window state before closing
    window.on('close', () => {
            const bounds = window.getBounds();
        fs.writeFileSync(stateFile, JSON.stringify(bounds, null, 2));
    });
};

// Single instance lock
const appLock = app.requestSingleInstanceLock();

if (!appLock) {
    app.quit();
} else {
    app.on('second-instance', (event, args) => {
        if (window) {
            const url = processArgs(args);
            if (url) {
                window.loadURL(url, { userAgent: config.userAgent });
            }
            window.focus();
        }
    });

    app.whenReady().then(createWindow);

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}

// Process arguments for the second instance
function processArgs(args) {
    const regHttps = /^https:\/\/www\.notion\.so\/.*/g;
    const regNotion = /^notion:\/\//g;
    for (const arg of args) {
        if (regHttps.test(arg)) {
            return arg;
        }
        if (regNotion.test(arg)) {
            return appUrl + arg.substring(11);
        }
    }
    return null;
}
