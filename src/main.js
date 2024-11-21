import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { config } from './config/index.js';
import { fileURLToPath } from 'url';
import electronContextMenu from 'electron-context-menu';

// Set up the context menu
electronContextMenu({
    showSaveImageAs: true,
});

const appUrl = 'https://www.notion.so/login';

let window = null;

function onNewWindow(details) {
    // Open URL directly in the default system browser for Google Sign-In popups
    if (details.url.includes('accounts.google.com')) {
        shell.openExternal(details.url); // Open Google Sign-In popup in the system browser
        return { action: 'deny' };
    }

    return { action: 'allow' }; // Allow other popups
}

// Calculate __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to create the main application window
const createWindow = () => {
    window = new BrowserWindow({
        icon: path.join(__dirname, 'assets/icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            nativeWindowOpen: true, // Enables proper popup handling
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
        },
    });

    // Load Notion login page
    window.loadURL(appUrl, {
        userAgent: config.userAgent,
    });

    window.webContents.setWindowOpenHandler((details) => {
        return {
            action: 'allow', // Allow popups by default
        };
    });

    window.once('ready-to-show', () => {
        window.maximize();
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

    app.on('ready', createWindow);

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
